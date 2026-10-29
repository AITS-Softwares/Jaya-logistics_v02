import { withBranchAccess } from '@/lib/branchAccess';
import { NextResponse } from 'next/server';
import connectDb from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import OrderPanel from '@/app/api/order-panel/OrderPanel';
import VehicleNegotiation from '@/app/api/vehicle-negotiation/VehicleNegotiation';
import PricingPanel from '@/app/api/pricing-panel/PricingPanel';
import LoadingPanel from '@/app/api/loading-panel/LoadingPanel';
import ConsignmentNote from '@/app/api/consignment-note/ConsignmentNote';
import { findLatestApprovedVnnForLoading } from '@/lib/reapprovalService';

const entries = [
  { type: 'order', module: 'Order Panel', Model: OrderPanel, no: 'orderPanelNo', path: 'order-panel', viewPath: (id) => `/admin/order-panel/${id}/view` },
  { type: 'vnn', module: 'Vehicle Negotiation', Model: VehicleNegotiation, no: 'vnnNo', path: 'vehicle-negotiation', viewPath: (id) => `/admin/vehicle-negotiation/${id}/view` },
  { type: 'pricing', module: 'Pricing Panel', Model: PricingPanel, no: 'pricingSerialNo', path: 'pricing-panel', viewPath: (id) => `/admin/pricing-panel/${id}/view` },
  { type: 'loading', module: 'Loading Info', Model: LoadingPanel, no: 'vehicleArrivalNo', path: 'Loading-Info', viewPath: (id) => `/admin/Loading-Info/${id}/view` },
  { type: 'lr', module: 'Consignment Note', Model: ConsignmentNote, no: 'lrNo', path: 'Consignment-Note', viewPath: () => '/admin/Consignment-Note' },
];

async function branchHandlerGET(req) {
  await connectDb();
  let user;
  try { user = verifyToken(req); }
  catch (error) { return NextResponse.json({ success: false, message: error.message || 'Authentication required' }, { status: 401 }); }
  const admin = user.type === 'company' || user.roles?.includes('Admin');
  const records = [];
  const pendingDocs = [];
  for (const entry of entries) {
    const moduleData = user.modules?.[entry.module];
    const permission = moduleData?.selected ? (moduleData.permissions || {}) : {};
    const approvalModule = entry.type === 'pricing' ? user.modules?.['Pricing Panel - Part 2 Approval'] : moduleData;
    const approvalPermission = approvalModule?.selected ? (approvalModule.permissions || {}) : {};
    const canView = admin || permission.view === true;
    const canEdit = admin || permission.edit === true;
    const canApprove = admin || approvalPermission.approve === true;
    if (!canView && !canEdit && !canApprove) continue;
    const filter = entry.type === 'loading'
      ? { companyId: user.companyId, $or: [
        { reapprovalState: { $in: ['unlocked', 'pendingApproval', 'pendingReapproval', 'blockedByUpstream', 'syncFailed'] } },
        { reapprovalState: 'none', 'reapprovalHistory.action': 'detachedOrderBlockCleared' },
      ] }
      : { companyId: user.companyId, reapprovalState: { $in: ['unlocked', 'pendingApproval', 'pendingReapproval', 'blockedByUpstream', 'syncFailed'] } };
    const docs = await entry.Model.find(filter)
      .select(`${entry.no} vnnNo vehicleNegotiationNo vehicleNegotiationRef orders orderRows pendingStateBeforeBlock panelStatus header.status rateApproval.approvalStatus reapprovalState approvedRevision reapprovalSyncError upstreamPending reapprovalHistory.action updatedAt`)
      .sort({ updatedAt: -1 }).limit(50).lean();
    for (const doc of docs) pendingDocs.push({ entry, doc, canView, canEdit, canApprove, admin });
  }

  const sourceStates = new Map();
  for (const entry of entries) {
    const ids = [...new Set(pendingDocs.flatMap(({ doc }) => (doc.upstreamPending || [])
      .filter((marker) => marker.panel === entry.type && marker.recordId)
      .map((marker) => String(marker.recordId))))];
    if (!ids.length) continue;
    const sources = await entry.Model.find({ _id: { $in: ids }, companyId: user.companyId })
      .select(`${entry.no} reapprovalState panelStatus header.status rateApproval.approvalStatus`)
      .lean();
    for (const source of sources) sourceStates.set(`${entry.type}:${String(source._id)}`, source.reapprovalState || 'none');
  }

  const panelLabels = Object.fromEntries(entries.map((entry) => [entry.type, entry.module]));
  const downstreamVnnLinks = new Map();
  const downstreamRecords = pendingDocs.filter(({ entry }) => ['lr', 'loading'].includes(entry.type));
  const linkedVnnFilters = downstreamRecords.flatMap(({ entry, doc }) => [
    doc.vehicleNegotiationRef ? { _id: doc.vehicleNegotiationRef } : null,
    doc.vnnNo ? { vnnNo: doc.vnnNo } : null,
    entry.type === 'loading' && doc.vehicleNegotiationNo ? { vnnNo: doc.vehicleNegotiationNo } : null,
  ].filter(Boolean));
  if (linkedVnnFilters.length) {
    const linkedVnns = await VehicleNegotiation.find({ companyId: user.companyId, $or: linkedVnnFilters })
      .select('_id vnnNo orders reapprovalState').lean();
    for (const vnn of linkedVnns) {
      downstreamVnnLinks.set(`id:${String(vnn._id)}`, vnn);
      if (vnn.vnnNo) downstreamVnnLinks.set(`no:${vnn.vnnNo}`, vnn);
    }
  }
  const nextStage = {
    order: { vnn: 'vnn', pricing: 'vnn', loading: 'vnn', lr: 'vnn' },
    vnn: { pricing: 'pricing', loading: 'loading', lr: 'lr' },
  };
  const loadingSyncPlans = new Map();
  for (const { entry, doc } of pendingDocs) {
    if (entry.type !== 'loading') continue;
    const hasDetachedRepairHistory = (doc.reapprovalHistory || []).some((item) => item.action === 'detachedOrderBlockCleared');
    const hasOrderMarkers = (doc.upstreamPending || []).some((marker) => marker.panel === 'order');
    if (!hasDetachedRepairHistory && !hasOrderMarkers) continue;
    const plan = await findLatestApprovedVnnForLoading(doc, user.companyId);
    if (plan.required || plan.ambiguous) loadingSyncPlans.set(String(doc._id), plan);
  }
  for (const { entry, doc, canView, canEdit, canApprove, admin: isAdmin } of pendingDocs) {
    const upstreamDetails = (doc.upstreamPending || []).map((marker) => {
      const sourceType = marker.panel;
      let panelLabel = panelLabels[sourceType] || marker.panel || 'Upstream panel';
      const stageType = sourceType;
      let nextPanelType = nextStage[stageType]?.[entry.type] || entry.type;
      let sourceState = sourceStates.get(`${sourceType}:${String(marker.recordId)}`);
      let recordNo = marker.recordNo || '';
      let detachedFromLinkedVnn = false;
      if (['lr', 'loading'].includes(entry.type) && sourceType === 'order') {
        const linkedVnn = (doc.vehicleNegotiationRef && downstreamVnnLinks.get(`id:${String(doc.vehicleNegotiationRef)}`))
          || (doc.vnnNo && downstreamVnnLinks.get(`no:${doc.vnnNo}`))
          || (entry.type === 'loading' && doc.vehicleNegotiationNo && downstreamVnnLinks.get(`no:${doc.vehicleNegotiationNo}`));
        if (linkedVnn) {
          panelLabel = panelLabels.vnn;
          nextPanelType = entry.type;
          sourceState = linkedVnn.reapprovalState || 'none';
          recordNo = linkedVnn.vnnNo || recordNo;
          if (entry.type === 'loading') {
            const stillLinked = (linkedVnn.orders || []).some((row) =>
              (marker.recordNo && String(row.orderNo || '').trim().toLowerCase() === String(marker.recordNo).trim().toLowerCase())
              || (marker.recordId && String(row.orderPanelId || '') === String(marker.recordId))
            );
            detachedFromLinkedVnn = !stillLinked;
          }
        }
      }
      const nextPanelLabel = panelLabels[nextPanelType] || entry.module;
      const sourceName = `${panelLabel}${recordNo ? ` ${recordNo}` : ''}`;
      let badge = `Reapproval at ${nextPanelLabel}`;
      let message = `${sourceName} has been approved. Reapproval is now pending at ${nextPanelLabel}. Please contact that panel's approver.`;
      if (entry.type === 'lr' && sourceType === 'loading') {
        badge = 'Old Loading Info marker';
        message = `Loading Info is not an LR reapproval source. Contact the Consignment Note approver; this old marker will not block LR approval.`;
      } else if (marker.reason === 'Dependency link needs review') {
        badge = `Link review at ${nextPanelLabel}`;
        message = `The linked order could not be matched safely. Reapproval is pending at ${nextPanelLabel}; please contact that panel's approver to review the link.`;
      } else if (sourceState === 'unlocked') {
        badge = `Edit pending at ${panelLabel}`;
        message = `${sourceName} is open for correction. Its edits must be submitted and approved before reapproval can continue at ${nextPanelLabel}.`;
      } else if (sourceState === 'pendingApproval') {
        badge = `Approval pending at ${panelLabel}`;
        message = `${sourceName} has been resubmitted and is waiting for approval. Reapproval at ${nextPanelLabel} can continue after it is approved.`;
      } else if (sourceState === 'pendingReapproval') {
        badge = `Reapproval pending at ${panelLabel}`;
        message = `Reapproval is pending at ${panelLabel}. Please contact that panel's approver before continuing to ${nextPanelLabel}.`;
      } else if (sourceState === 'blockedByUpstream') {
        badge = `Waiting on ${panelLabel}`;
        message = `${sourceName} is waiting on an earlier correction. Reapproval at ${nextPanelLabel} can continue after it is resolved.`;
      } else if (sourceState === 'syncFailed') {
        badge = `Sync issue at ${panelLabel}`;
        message = `${sourceName} was approved, but its update did not reach the next stage. Please contact the ${panelLabel} approver to resolve the sync before ${nextPanelLabel} can continue.`;
      } else if (sourceState === 'none') {
        badge = `Reapproval at ${nextPanelLabel}`;
      } else {
        badge = `Check ${panelLabel} status`;
        message = `We could not confirm the status of ${sourceName}. Please contact that panel's approver before continuing to ${nextPanelLabel}.`;
      }
      if (detachedFromLinkedVnn) {
        badge = 'Outdated order link';
        message = `${marker.recordNo || 'This Order Panel'} is no longer linked to Vehicle Negotiation ${recordNo}. This old blocker does not require another Vehicle Negotiation approval.`;
      }
      return { badge, message, panel: panelLabel, recordNo, state: sourceState || 'unknown' };
    });
    const linkedVnn = ['lr', 'loading'].includes(entry.type) && doc.vehicleNegotiationRef && downstreamVnnLinks.get(`id:${String(doc.vehicleNegotiationRef)}`)
      || (['lr', 'loading'].includes(entry.type) && doc.vnnNo && downstreamVnnLinks.get(`no:${doc.vnnNo}`))
      || (entry.type === 'loading' && doc.vehicleNegotiationNo && downstreamVnnLinks.get(`no:${doc.vehicleNegotiationNo}`));
    const resolvedOrderBlock = ['lr', 'loading'].includes(entry.type)
      && doc.reapprovalState === 'blockedByUpstream'
      && (doc.upstreamPending || []).some((marker) => marker.panel === 'order')
      && (!linkedVnn?.reapprovalState || linkedVnn.reapprovalState === 'none')
      && (entry.type !== 'loading' || (doc.upstreamPending || []).filter((marker) => marker.panel === 'order').every((marker) =>
        (linkedVnn?.orders || []).some((row) =>
          (marker.recordNo && String(row.orderNo || '').trim().toLowerCase() === String(marker.recordNo).trim().toLowerCase())
          || (marker.recordId && String(row.orderPanelId || '') === String(marker.recordId))
        )
      ))
      && (doc.upstreamPending || []).filter((marker) => marker.panel === 'order')
        .every((marker) => sourceStates.get(`order:${String(marker.recordId)}`) === 'none');
    const loadingSyncPlan = entry.type === 'loading' ? loadingSyncPlans.get(String(doc._id)) : null;
    const isLatestVnnSyncRequired = !!loadingSyncPlan?.required;
    const isLatestVnnSyncAmbiguous = !!loadingSyncPlan?.ambiguous;
    const isApprovalPending = ['pendingApproval', 'pendingReapproval'].includes(doc.reapprovalState) || resolvedOrderBlock;
    const displayReapprovalState = isLatestVnnSyncAmbiguous
      ? 'blockedByUpstream'
      : isLatestVnnSyncRequired
      ? 'pendingReapproval'
      : resolvedOrderBlock ? 'pendingReapproval' : doc.reapprovalState;
    // Active tasks belong to their edit/approval users. Keep downstream waiting
    // and sync-status entries visible so the rest of the workflow stays in view.
    let path = null;
    if (isLatestVnnSyncRequired && canApprove) path = `/admin/${entry.path}/approve/${doc._id}`;
    else if (isLatestVnnSyncRequired && canEdit) path = `/admin/${entry.path}/${doc._id}/view`;
    else if (isLatestVnnSyncAmbiguous && isAdmin) path = `/admin/${entry.path}/${doc._id}/view`;
    else if (!isLatestVnnSyncAmbiguous && isApprovalPending && canApprove) path = `/admin/${entry.path}/approve/${doc._id}`;
    else if (displayReapprovalState === 'unlocked' && canEdit) path = `/admin/${entry.path}/${doc._id}`;
    else if (doc.reapprovalState === 'syncFailed' && isAdmin) path = `/admin/${entry.path}/${doc._id}`;
    // Capture ownership of a real task before adding read-only status links.
    const actionable = Boolean(path);
    if (!path) {
      const isStatusEntry = ['blockedByUpstream', 'syncFailed'].includes(displayReapprovalState);
      if (!isStatusEntry) continue;
      if (canView) path = entry.viewPath(String(doc._id));
    }

    records.push({
      type: entry.type, module: entry.module, id: String(doc._id), no: doc[entry.no] || '',
      path,
      actionable,
      status: doc.rateApproval?.approvalStatus || doc.panelStatus || doc.header?.status || '', reapprovalState: displayReapprovalState, updatedAt: doc.updatedAt,
      revision: doc.approvedRevision || 0, syncError: doc.reapprovalSyncError || '', upstreamPending: doc.upstreamPending || [], upstreamDetails,
      latestVnnSyncRequired: isLatestVnnSyncRequired,
      latestVnnNo: loadingSyncPlan?.candidate?.vnnNo || '',
      latestVnnSyncAmbiguous: isLatestVnnSyncAmbiguous,
    });
  }
  // Follow the correction workflow so upstream work appears before dependent panels.
  const stageOrder = new Map(entries.map((entry, index) => [entry.type, index]));
  records.sort((a, b) => {
    const stageDifference = (stageOrder.get(a.type) ?? entries.length) - (stageOrder.get(b.type) ?? entries.length);
    if (stageDifference) return stageDifference;
    const blockedDifference = Number(a.reapprovalState === 'blockedByUpstream') - Number(b.reapprovalState === 'blockedByUpstream');
    if (blockedDifference) return blockedDifference;
    return String(a.no || '').localeCompare(String(b.no || ''), 'en', { numeric: true })
      || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      || String(a.id).localeCompare(String(b.id));
  });
  return NextResponse.json({ success: true, records });
}

export const GET = withBranchAccess(branchHandlerGET);
