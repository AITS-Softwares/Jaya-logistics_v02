import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDb from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { TYPES, resolveDeleteGraph, deletionBlockers } from '@/lib/deletion/linkGraph';
import ReapprovalAudit from '@/models/ReapprovalAudit';
import { notifyModulePermissionUsers } from '@/lib/workflowNotifications';
import { findDetachedLoadingOrderMarkers, findDetachedVnnOrderMarkers, findLatestApprovedVnnForLoading, reconcileDetachedLoadingOrderMarkers, reconcileDetachedVnnOrderMarkers, recordApprovedRevision, summarizeApprovedChanges, withApprovedVnnLocationRemarks } from '@/lib/reapprovalService';

const MODULES = {
  order: 'Order Panel', vnn: 'Vehicle Negotiation', pricing: 'Pricing Panel', loading: 'Loading Info', lr: 'Consignment Note',
};
const userIsAdmin = (user) => user?.type === 'company' || user?.roles?.includes('Admin');
const plain = (doc) => doc?.toObject ? doc.toObject({ depopulate: true }) : doc;
const recordNumber = (type, doc) => doc?.[TYPES[type]?.no] || doc?.lrNo || String(doc?._id || '');
const normalized = (value) => String(value || '').trim().toLowerCase();

function rolloutBlockers(rootType, graph) {
  const supported = new Set(['order', 'vnn', 'pricing', 'loading', 'lr']);
  const blockers = graph.filter((item) => item.depth > 0 && !supported.has(item.type))
    .map((item) => `${item.label} ${item.no} depends on a panel that is not included in this reapproval rollout.`);
  const vnns = graph.filter((item) => item.type === 'vnn').map((item) => item.record);
  const loadings = graph.filter((item) => item.type === 'loading').map((item) => item.record);
  if (rootType === 'order') {
    for (const loading of loadings) if (!vnns.some((vnn) => normalized(vnn.vnnNo) === normalized(loading.vehicleNegotiationNo))) blockers.push(`Loading Info ${loading.vehicleArrivalNo} is not linked through Vehicle Negotiation, so this rollout cannot safely synchronize it.`);
  }
  return [...new Set(blockers)];
}

async function allBlockers(type, graph, companyId, session) {
  // Finalized Loading Info can be corrected; keep the shared deletion protection enabled elsewhere.
  return [...new Set([...(await deletionBlockers(graph, companyId, session, { blockFinalizedLoading: false })), ...rolloutBlockers(type, graph)])];
}

async function resolveReapprovalGraph(type, root, companyId, session) {
  const graph = await resolveDeleteGraph(type, root, companyId, session);
  if (type === 'vnn' && (root.vnnNo || root._id)) {
    const linkedLrs = await TYPES.lr.Model.find({ companyId, $or: [
      ...(root.vnnNo ? [{ vnnNo: root.vnnNo }] : []),
      ...(root._id ? [{ vehicleNegotiationRef: root._id }] : []),
    ] }).session(session).setOptions({ includeDeleted: false }).lean();
    const known = new Set(graph.map((item) => `${item.type}:${item.id}`));
    for (const lr of linkedLrs) {
      for (const item of await resolveDeleteGraph('lr', lr, companyId, session)) {
        const key = `${item.type}:${item.id}`;
        if (known.has(key)) continue;
        known.add(key);
        graph.push({ ...item, depth: item.depth + 1 });
      }
    }
  }
  if (type !== 'pricing') return graph;
  const rowIds = [...new Set((root.orders || []).map((row) => String(row.orderRowId || '')).filter(Boolean))];
  const orderNos = [...new Set((root.orders || []).map((row) => String(row.orderNo || '')).filter(Boolean))];
  if (!rowIds.length && !orderNos.length) return graph;
  const linkedLrs = await TYPES.lr.Model.find({ companyId, $or: [...(rowIds.length ? [{ orderRowId: { $in: rowIds } }] : []), ...(orderNos.length ? [{ 'header.orderNo': { $in: orderNos } }] : [])] })
    .session(session).setOptions({ includeDeleted: false }).lean();
  const known = new Set(graph.map((item) => `${item.type}:${item.id}`));
  for (const lr of linkedLrs) {
    const descendants = await resolveDeleteGraph('lr', lr, companyId, session);
    for (const item of descendants) {
      const key = `${item.type}:${item.id}`;
      if (known.has(key)) continue;
      known.add(key);
      graph.push({ ...item, depth: item.depth + 1 });
    }
  }
  return graph;
}

function reapprovalAffectedGraph(type, graph) {
  if (type === 'loading' || type === 'pricing') return graph.filter((item) => item.depth === 0 || item.type !== 'lr');
  return graph;
}

function authorized(req) {
  try { return { user: verifyToken(req) }; }
  catch (error) { return { error: error.message || 'Authentication required', status: 401 }; }
}

export async function GET(req, { params }) {
  await connectDb();
  const auth = authorized(req);
  if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  const user = auth.user;
  const { type, id } = await params;
  const entry = TYPES[type];
  if (!MODULES[type] || !entry || !mongoose.isValidObjectId(id)) return NextResponse.json({ success: false, message: 'Invalid panel or record ID' }, { status: 400 });
  const currentPermissions = user.modules?.[MODULES[type]]?.permissions || {};
  if (!userIsAdmin(user) && !currentPermissions.view && !(type === 'loading' && (currentPermissions.edit || currentPermissions.approve))) return NextResponse.json({ success: false, message: 'View permission required' }, { status: 403 });

  const root = await entry.Model.findOne({ _id: id, companyId: user.companyId }).lean();
  if (!root) return NextResponse.json({ success: false, message: `${entry.label} not found` }, { status: 404 });
  let effectiveReapprovalState = root.reapprovalState || 'none';
  if (type === 'lr' && effectiveReapprovalState === 'blockedByUpstream') {
    const orderMarkers = (root.upstreamPending || []).filter((marker) => marker.panel === 'order');
    const unresolvedMarkers = (root.upstreamPending || []).filter((marker) => !['order', 'loading', 'vnn'].includes(marker.panel));
    const orderIds = orderMarkers.map((marker) => String(marker.recordId || '')).filter((value) => mongoose.isValidObjectId(value));
    const orderNos = orderMarkers.map((marker) => String(marker.recordNo || '')).filter(Boolean);
    const orderFilters = [
      ...(orderIds.length ? [{ _id: { $in: orderIds } }] : []),
      ...(orderNos.length ? [{ orderPanelNo: { $in: orderNos } }] : []),
    ];
    const vnnFilters = [
      ...(root.vnnNo ? [{ vnnNo: root.vnnNo }] : []),
      ...(root.vehicleNegotiationRef ? [{ _id: root.vehicleNegotiationRef }] : []),
    ];
    if (orderMarkers.length && !unresolvedMarkers.length && orderFilters.length && vnnFilters.length) {
      const [orders, linkedVnn] = await Promise.all([
        TYPES.order.Model.find({ companyId: user.companyId, $or: orderFilters }).select('orderPanelNo reapprovalState panelStatus status').lean(),
        TYPES.vnn.Model.findOne({ companyId: user.companyId, $or: vnnFilters }).select('reapprovalState panelStatus status').lean(),
      ]);
      const approvedOrderKeys = new Set(orders.filter((order) =>
        (!order.reapprovalState || order.reapprovalState === 'none')
        && ['Approved', 'Completed'].includes(order.panelStatus || order.status)
      ).map((order) => String(order._id)));
      const allOrdersApproved = orderMarkers.every((marker) => approvedOrderKeys.has(String(marker.recordId || ''))
        || orders.some((order) => order.orderPanelNo === marker.recordNo && approvedOrderKeys.has(String(order._id))));
      if (allOrdersApproved && linkedVnn && (!linkedVnn.reapprovalState || linkedVnn.reapprovalState === 'none')
        && ['Approved', 'Completed'].includes(linkedVnn.panelStatus || linkedVnn.status)) {
        effectiveReapprovalState = 'pendingReapproval';
      }
    }
  }
  const graph = await resolveReapprovalGraph(type, root, user.companyId, null);
  const affectedGraph = reapprovalAffectedGraph(type, graph);
  const upstreamDetails = await Promise.all((root.upstreamPending || []).map(async (marker) => {
    const sourceEntry = TYPES[marker.panel];
    const source = sourceEntry && marker.recordId
      ? await sourceEntry.Model.findOne({ _id: marker.recordId, companyId: user.companyId }).select('reapprovalState').lean()
      : null;
    let sourceState = source?.reapprovalState || 'none';
    let sourceLabel = MODULES[marker.panel] || marker.panel || 'Upstream panel';
    let sourceNo = marker.recordNo ? ` ${marker.recordNo}` : '';
    let nextLabel = marker.panel === 'order'
      ? 'Vehicle Negotiation'
      : marker.panel === 'vnn'
        ? (type === 'pricing' ? 'Pricing Panel' : type === 'loading' ? 'Loading Info' : 'Consignment Note')
        : 'the next review stage';
    // Order unlocks mark the whole downstream chain. Once VNN has completed
    // its hop, an inherited Order marker on an LR must describe the LR review,
    // not incorrectly ask the user to contact the already-finished VNN approver.
    if (type === 'lr' && marker.panel === 'order') {
      const vnnFilter = [
        root.vehicleNegotiationRef && mongoose.isValidObjectId(String(root.vehicleNegotiationRef))
          ? { _id: root.vehicleNegotiationRef }
          : null,
        root.vnnNo ? { vnnNo: root.vnnNo } : null,
      ].filter(Boolean);
      const linkedVnn = vnnFilter.length
        ? await TYPES.vnn.Model.findOne({ companyId: user.companyId, $or: vnnFilter }).select('vnnNo reapprovalState').lean()
        : null;
      if (linkedVnn) {
        sourceLabel = MODULES.vnn;
        sourceNo = linkedVnn.vnnNo ? ` ${linkedVnn.vnnNo}` : '';
        sourceState = linkedVnn.reapprovalState || 'none';
        nextLabel = MODULES.lr;
      }
    }
    let message;
    if (type === 'lr' && marker.panel === 'loading') {
      message = `Loading Info is not an LR reapproval stage. This legacy block will be ignored on LR approval.`;
    } else if (sourceState === 'unlocked') {
      message = `${sourceLabel}${sourceNo} is open for correction. After it is submitted and approved, reapproval continues at ${nextLabel}.`;
    } else if (sourceState === 'pendingApproval') {
      message = `${sourceLabel}${sourceNo} is waiting for approval. Reapproval continues at ${nextLabel} after that approval.`;
    } else if (sourceState === 'pendingReapproval') {
      message = `Reapproval is pending at ${sourceLabel}${sourceNo}. Contact that panel's approver before continuing to ${nextLabel}.`;
    } else if (sourceState === 'syncFailed') {
      message = `The ${sourceLabel}${sourceNo} update failed to sync. Contact that panel's approver before continuing to ${nextLabel}.`;
    } else if (sourceState === 'blockedByUpstream') {
      message = `${sourceLabel}${sourceNo} is waiting on an earlier correction. Reapproval continues at ${nextLabel} after it is resolved.`;
    } else {
      message = `${sourceLabel}${sourceNo} is approved. Reapproval is pending at ${nextLabel}; contact that panel's approver.`;
    }
    return { ...marker, sourceState, message };
  }));
  const reviewRecord = type === 'vnn' && effectiveReapprovalState !== 'none'
    ? await withApprovedVnnLocationRemarks(root, user) : root;
  const computedChanges = root.approvedSnapshot ? summarizeApprovedChanges(type, root.approvedSnapshot, reviewRecord) : (root.pendingChanges || []);
  const computedFields = new Set(computedChanges.map((change) => change.field));
  const extraChanges = (root.pendingChanges || []).filter((change) =>
    change.field === 'Rate review required' || (!root.approvedSnapshot && !computedFields.has(change.field))
  );
  const changesToReview = [...computedChanges, ...extraChanges].filter((change) =>
    !/^Report Rows(?:\[| ·|$)/i.test(change.field)
    && !([null, undefined, ''].includes(change.oldValue) && [null, undefined, ''].includes(change.newValue))
  );
  const detachedOrderMarkers = type === 'vnn'
    ? findDetachedVnnOrderMarkers(root)
    : type === 'loading' ? await findDetachedLoadingOrderMarkers(root, user.companyId) : [];
  const latestVnnSync = type === 'loading' ? await findLatestApprovedVnnForLoading(root, user.companyId) : null;
  if (type === 'loading' && latestVnnSync?.required) effectiveReapprovalState = 'pendingReapproval';
  else if (type === 'loading' && latestVnnSync?.ambiguous) effectiveReapprovalState = 'blockedByUpstream';
  const vnnPermissions = user.modules?.[MODULES.vnn]?.permissions || {};
  const loadingPermissions = user.modules?.[MODULES.loading]?.permissions || {};
  const canReconcileDetachedOrders = type === 'vnn'
    ? userIsAdmin(user) || vnnPermissions.edit === true || vnnPermissions.approve === true
    : type === 'loading' && (userIsAdmin(user) || loadingPermissions.edit === true || loadingPermissions.approve === true);
  return NextResponse.json({ success: true, record: { id: String(root._id), type, no: recordNumber(type, root), status: root.rateApproval?.approvalStatus || root.panelStatus || root.header?.status || root.status || '', reapprovalState: effectiveReapprovalState, approvedRevision: root.approvedRevision || root.rateApproval?.approvedRevision || 0, upstreamPending: root.upstreamPending || [], upstreamDetails, detachedOrderMarkers, canReconcileDetachedOrders, latestVnnSync: latestVnnSync ? { required: latestVnnSync.required, ambiguous: latestVnnSync.ambiguous, vnnNo: latestVnnSync.candidate?.vnnNo || '' } : null, syncError: root.reapprovalSyncError || '', pendingChanges: changesToReview, changeSummary: changesToReview }, impact: affectedGraph.map((item) => ({ type: item.type, id: item.id, no: item.no, label: item.label, depth: item.depth })), blockers: await allBlockers(type, graph, user.companyId, null) });
}

export async function POST(req, { params }) {
  await connectDb();
  const auth = authorized(req);
  if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  const user = auth.user;
  const { type, id } = await params;
  const entry = TYPES[type];
  if (!MODULES[type] || !entry || !mongoose.isValidObjectId(id)) return NextResponse.json({ success: false, message: 'Invalid panel or record ID' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '');
  if (action === 'reconcileDetachedOrders') {
    const vnnPermission = user.modules?.[MODULES.vnn]?.permissions || {};
    const loadingPermission = user.modules?.[MODULES.loading]?.permissions || {};
    const canReconcile = type === 'vnn'
      ? userIsAdmin(user) || vnnPermission.edit === true || vnnPermission.approve === true
      : type === 'loading' && (userIsAdmin(user) || loadingPermission.edit === true || loadingPermission.approve === true);
    if (!canReconcile) {
      return NextResponse.json({ success: false, message: 'Edit or approve permission for this panel is required to clear detached order links.' }, { status: 403 });
    }
    const root = await entry.Model.findOne({ _id: id, companyId: user.companyId }).lean();
    if (!root) return NextResponse.json({ success: false, message: `${entry.label} not found` }, { status: 404 });
    try {
      const result = type === 'vnn'
        ? { changed: await reconcileDetachedVnnOrderMarkers(root, user.companyId) }
        : await reconcileDetachedLoadingOrderMarkers(root, user.companyId, user);
      return NextResponse.json({ success: true, action, ...result, message: result.changed ? (type === 'loading' ? `Loading Info synced from approved Vehicle Negotiation ${result.vnnNo} and is pending reapproval.` : 'Removed blockers for Order Panels that are no longer linked to this Vehicle Negotiation.') : 'No detached Order Panel blockers were found.' });
    } catch (error) {
      return NextResponse.json({ success: false, message: error.message || 'Could not sync Loading Info from the latest approved VNN.' }, { status: error.status || 500 });
    }
  }
  if (!userIsAdmin(user)) return NextResponse.json({ success: false, message: 'Only an admin can unlock or cancel an unlock.' }, { status: 403 });
  if (!['unlock', 'cancel', 'retrySync'].includes(action)) return NextResponse.json({ success: false, message: 'Action must be unlock, cancel, or retrySync' }, { status: 400 });
  if (action === 'retrySync') {
    if (!userIsAdmin(user)) return NextResponse.json({ success: false, message: 'Only an admin can retry a failed downstream sync.' }, { status: 403 });
    try {
      const result = await recordApprovedRevision(type, id, user);
      return NextResponse.json({ success: true, action, ...result });
    } catch (error) {
      return NextResponse.json({ success: false, message: `Sync retry failed: ${error.message}` }, { status: 503 });
    }
  }
  if (action === 'unlock' && !String(body.reason || '').trim()) return NextResponse.json({ success: false, message: 'Enter a reason before unlocking this approved record.' }, { status: 400 });

  const session = await mongoose.startSession();
  let result;
  const notifications = [];
  try {
    await session.withTransaction(async () => {
      const root = await entry.Model.findOne({ _id: id, companyId: user.companyId }).session(session);
      if (!root) throw Object.assign(new Error(`${entry.label} not found`), { status: 404 });
      const number = recordNumber(type, root);
      const status = root.panelStatus || root.header?.status || root.status;
      if (!['Approved', 'Completed'].includes(status)) throw Object.assign(new Error(`Only an approved or completed ${entry.label} can be unlocked.`), { status: 409 });

      if (action === 'unlock') {
        if (root.reapprovalState === 'unlocked' || root.reapprovalState === 'pendingApproval') throw Object.assign(new Error('This record is already open for correction.'), { status: 409 });
        const graph = await resolveReapprovalGraph(type, plain(root), user.companyId, session);
        const blockers = await allBlockers(type, graph, user.companyId, session);
        if (blockers.length) throw Object.assign(new Error('This correction is blocked by finalized downstream records.'), { status: 409, blockers });

        const batchId = new mongoose.Types.ObjectId().toString();
        const snapshot = plain(root);
        root.approvedSnapshot = snapshot;
        root.reapprovalState = 'unlocked';
      // if (type === 'vnn') {
      //   root.workflow = root.workflow || {};
      //   root.workflow.part1Locked = false;
      //   root.workflow.part1LockedAt = null;
      //   root.workflow.part1LockedBy = null;
      //   root.approval = root.approval || {};
      //   root.approval.part1Status = 'Pending';
      //   root.approval.part3Status = 'Pending';
      // }
        root.unlockedBy = mongoose.isValidObjectId(user.id) ? user.id : null;
        root.unlockedAt = new Date();
        root.unlockReason = String(body.reason).trim();
        root.reapprovalSyncError = '';
        root.reapprovalHistory.push({ action: 'unlocked', actorId: root.unlockedBy, actorName: user.name || '', reason: root.unlockReason, at: new Date(), batchId });
        await root.save({ session });

      for (const item of reapprovalAffectedGraph(type, graph).filter((candidate) => candidate.depth > 0 && ['vnn', 'pricing', 'loading', 'lr'].includes(candidate.type))) {
          const Model = TYPES[item.type].Model;
          const priorState = item.record.reapprovalState === 'blockedByUpstream' ? (item.record.pendingStateBeforeBlock || 'none') : (item.record.reapprovalState || 'none');
          const marker = { panel: type, recordId: String(root._id), recordNo: number, revision: root.approvedRevision || 0, batchId, previousState: priorState };
          await Model.updateOne({ _id: item.id, companyId: user.companyId, upstreamPending: { $not: { $elemMatch: { batchId } } } }, { $addToSet: { upstreamPending: marker }, $set: { reapprovalState: 'blockedByUpstream', pendingStateBeforeBlock: priorState } }, { session, runValidators: false });
          notifications.push({ type: item.type, no: item.no, id: item.id, panel: item.label });
        }
        await ReapprovalAudit.create([{
          companyId: user.companyId, panel: type, recordId: root._id, recordNo: number,
          action: 'unlocked', actorId: user.id, actorName: user.name || '', reason: root.unlockReason,
          revision: root.approvedRevision || 0, batchId, before: snapshot, after: { reapprovalState: 'unlocked' },
        }], { session });
        result = { success: true, action, batchId, recordNo: number, affected: notifications.length };
      } else {
        if (root.reapprovalState !== 'unlocked') throw Object.assign(new Error('This record has no active unlock to cancel.'), { status: 409 });
        const snapshot = root.approvedSnapshot;
        if (!snapshot) throw Object.assign(new Error('The approved snapshot is missing; cancellation needs administrator review.'), { status: 409 });
        const batch = [...(root.reapprovalHistory || [])].reverse().find((event) => event.action === 'unlocked');
        const batchId = batch?.batchId;
        const before = { reapprovalState: root.reapprovalState };
        const excluded = new Set(['_id', '__v', 'isDeleted', 'deletedAt', 'deletedBy', 'deleteReason', 'deleteBatchId', 'deleteRootType', 'deleteRootNo', 'statusBeforeDelete']);
        for (const [key, value] of Object.entries(snapshot)) if (!excluded.has(key)) root.set(key, value);
        root.reapprovalState = 'none';
        root.approvedSnapshot = null;
        root.unlockedBy = null;
        root.unlockedAt = null;
        root.unlockReason = '';
        root.reapprovalHistory.push({ action: 'unlockCancelled', actorId: user.id, actorName: user.name || '', at: new Date(), batchId });
        await root.save({ session });

        if (batchId) {
          for (const childType of ['vnn', 'pricing', 'loading', 'lr']) {
            const Model = TYPES[childType].Model;
            const children = await Model.find({ companyId: user.companyId, upstreamPending: { $elemMatch: { batchId } } }).setOptions({ includeDeleted: false }).session(session);
            for (const child of children) {
              const removed = (child.upstreamPending || []).find((marker) => marker.batchId === batchId);
              child.upstreamPending = (child.upstreamPending || []).filter((marker) => marker.batchId !== batchId);
              child.reapprovalState = child.upstreamPending.length ? 'blockedByUpstream' : (removed?.previousState || child.pendingStateBeforeBlock || 'none');
              child.pendingStateBeforeBlock = undefined;
              await child.save({ session });
            }
          }
        }
        await ReapprovalAudit.create([{
          companyId: user.companyId, panel: type, recordId: root._id, recordNo: number,
          action: 'unlockCancelled', actorId: user.id, actorName: user.name || '', batchId: batchId || '',
          revision: root.approvedRevision || 0, before, after: { reapprovalState: 'none', restoredSnapshot: true },
        }], { session });
        result = { success: true, action, recordNo: number, restoredSnapshot: true };
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message, ...(error.blockers ? { blockers: error.blockers } : {}) }, { status: error.status || 500 });
  } finally {
    await session.endSession();
  }

  if (action === 'unlock') {
    await notifyModulePermissionUsers({
      user, module: MODULES[type], action: 'edit', type: 'record-unlocked-for-correction',
      message: `${entry.label} ${result.recordNo} was unlocked for correction. Reason: ${String(body.reason).trim()}`,
      pushTitle: `${entry.label} unlocked for correction`, pushBody: `${result.recordNo} is ready for an authorized edit.`,
      url: `/admin/${type === 'vnn' ? 'vehicle-negotiation' : type === 'pricing' ? 'pricing-panel' : type === 'loading' ? 'Loading-Info' : type === 'lr' ? 'Consignment-Note' : 'order-panel'}/${id}`,
    });
    for (const item of notifications) {
      const module = MODULES[item.type];
      if (!module) continue;
      await notifyModulePermissionUsers({
        user, module, action: 'edit', type: 'upstream-correction-unlocked',
        message: `${item.panel} ${item.no} is blocked while ${entry.label} ${result.recordNo} is under correction.`,
        pushTitle: 'Upstream correction in progress', pushBody: `${entry.label} ${result.recordNo} was unlocked for correction.`,
        url: `/admin/${item.type === 'vnn' ? 'vehicle-negotiation' : item.type === 'pricing' ? 'pricing-panel' : item.type === 'loading' ? 'Loading-Info' : item.type === 'lr' ? 'Consignment-Note' : 'order-panel'}/${item.id}`,
      });
    }
  }
  return NextResponse.json(result);
}
