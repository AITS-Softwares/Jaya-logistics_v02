import mongoose from 'mongoose';
import VehicleNegotiation from '@/app/api/vehicle-negotiation/VehicleNegotiation';
import OrderPanel from '@/app/api/order-panel/OrderPanel';
import { companyScopeFilter } from '@/lib/companyScope';
import { TYPES, resolveDeleteGraph, deletionBlockers } from '@/lib/deletion/linkGraph';
import ReapprovalAudit from '@/models/ReapprovalAudit';
import { notifyModuleApprovers } from '@/lib/workflowNotifications';
import { planCancelledVnnReplacement } from '@/lib/cancelledVnnReplacement.mjs';

export async function replaceCancelledVnnOrders(user, recordId, body) {
  if (Object.keys(body).some(key => !['action', 'replacementRows'].includes(key))) throw Object.assign(new Error('Only replacement order references can be submitted with this action.'), { status: 422 });
  if (!Array.isArray(body.replacementRows) || !body.replacementRows.length || body.replacementRows.length > 100 ||
      body.replacementRows.some(row => !mongoose.isValidObjectId(row?.orderPanelId) || !mongoose.isValidObjectId(row?.orderRowId))) {
    throw Object.assign(new Error('Select valid replacement order rows.'), { status: 422 });
  }
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const record = await VehicleNegotiation.findOne(companyScopeFilter(user, { _id: recordId })).session(session);
      if (!record) throw Object.assign(new Error('Vehicle Negotiation not found.'), { status: 404 });
      const original = record.toObject({ depopulate: true });
      const retryingRejectedReplacement = record.workflow?.cancelledOrderReplacementOnly && record.approval?.part3Status === 'Reject' && record.reapprovalState === 'unlocked';
      const baseline = retryingRejectedReplacement ? record.approvedSnapshot : original;
      if (!baseline || retryingRejectedReplacement && record.upstreamPending?.length) throw Object.assign(new Error('The original cancelled-order baseline is unavailable or blocked by another correction.'), { status: 409 });
      const panelIds = [...new Set([...baseline.orders.map(row => row.orderPanelId), ...body.replacementRows.map(row => row.orderPanelId)].filter(mongoose.isValidObjectId))];
      const orderNos = [...new Set(baseline.orders.map(row => row.orderNo).filter(Boolean))];
      const panels = await OrderPanel.find(companyScopeFilter(user, { $or: [{ _id: { $in: panelIds } }, { orderPanelNo: { $in: orderNos } }] })).session(session).lean();
      const plan = planCancelledVnnReplacement(baseline, panels, body.replacementRows);
      const inUse = await VehicleNegotiation.exists(companyScopeFilter(user, {
        _id: { $ne: record._id }, panelStatus: { $ne: 'Cancelled' },
        $or: [{ 'orders.orderNo': { $in: plan.added.map(row => row.orderNo) } },
          { 'selectedOrderPanels._id': { $in: plan.added.map(row => row.orderPanelId) } }],
      })).session(session);
      if (inUse) throw Object.assign(new Error('A replacement order is already included in another Vehicle Negotiation. Refresh and select another open order.'), { status: 409 });
      // Include LRs linked directly to the VNN, as the normal correction flow does.
      const graph = await resolveDeleteGraph('vnn', original, user.companyId, session);
      const directLrs = await TYPES.lr.Model.find({ companyId: user.companyId, $or: [{ vnnNo: record.vnnNo }, { vehicleNegotiationRef: record._id }] }).session(session).setOptions({ includeDeleted: false }).lean();
      const known = new Set(graph.map(item => `${item.type}:${item.id}`));
      for (const lr of directLrs) for (const item of await resolveDeleteGraph('lr', lr, user.companyId, session)) {
        const key = `${item.type}:${item.id}`;
        if (!known.has(key)) { known.add(key); graph.push({ ...item, depth: item.depth + 1 }); }
      }
      const supported = new Set(['vnn', 'pricing', 'loading', 'lr']);
      const blockers = [...await deletionBlockers(graph, user.companyId, session, { blockFinalizedLoading: false }),
        ...graph.filter(item => item.depth > 0 && !supported.has(item.type)).map(item => `${item.label} ${item.no} requires a separate downstream review.`)];
      if (blockers.length) throw Object.assign(new Error(`Replacement is blocked by finalized downstream records: ${[...new Set(blockers)].join(' ')}`), { status: 409 });
      const at = new Date();
      const batchId = retryingRejectedReplacement
        ? [...(record.reapprovalHistory || [])].reverse().find(item => item.action === 'unlocked' && item.mode === 'cancelled-orders-only')?.batchId
        : new mongoose.Types.ObjectId().toString();
      if (!batchId) throw Object.assign(new Error('The original replacement review batch is unavailable. Ask an administrator to review the record.'), { status: 409 });
      const reason = 'Replace cancelled order rows only';
      record.approvedSnapshot ||= original;
      record.orders = plan.orders;
      record.selectedOrderPanels = plan.selectedOrderPanels;
      record.approval.part1Status = 'Pending'; record.approval.part3Status = 'Pending';
      record.approval.part1Remarks = ''; record.approval.part3Remarks = '';
      record.panelStatus = 'Submitted'; record.reapprovalState = 'pendingApproval';
      record.workflow.part1Locked = true;
      record.workflow.part1LockedAt = at; record.workflow.part1LockedBy = user.id;
      record.workflow.amendmentCount = (record.workflow.amendmentCount || 0) + 1;
      record.workflow.cancelledOrderReplacementOnly = true;
      record.workflow.cancelledOrderReplacementRows = plan.removed.map(row => ({ orderNo: row.orderNo, orderRowId: row.orderRowId, plantName: row.plantName, toName: row.toName }));
      record.workflow.lastAmendmentReason = reason; record.workflow.lastAmendedAt = at; record.workflow.lastAmendedBy = user.id;
      record.workflow.audit ||= [];
      record.workflow.audit.push({ action: 'cancelled-orders-replaced', reason, by: user.id, at });
      // Reuse the existing batch resolution on approval without granting an unlock.
      record.reapprovalHistory ||= [];
      record.reapprovalHistory.push({ action: 'unlocked', mode: 'cancelled-orders-only', reason, actorId: user.id, actorName: user.name || '', at, batchId });
      record.reapprovalHistory.push({ action: 'submitted', mode: 'cancelled-orders-only', actorId: user.id, at, batchId });
      await record.save({ session });
      for (const item of graph.filter(item => item.depth > 0 && supported.has(item.type))) {
        const prior = item.record.reapprovalState === 'blockedByUpstream' ? item.record.pendingStateBeforeBlock || 'none' : item.record.reapprovalState || 'none';
        const marker = { panel: 'vnn', recordId: String(record._id), recordNo: record.vnnNo, revision: record.approvedRevision || 0, batchId, previousState: prior };
        await TYPES[item.type].Model.updateOne({ _id: item.id, companyId: user.companyId, upstreamPending: { $not: { $elemMatch: { batchId } } } },
          { $addToSet: { upstreamPending: marker }, $set: { reapprovalState: 'blockedByUpstream', pendingStateBeforeBlock: prior } }, { session, runValidators: false });
      }
      await ReapprovalAudit.create([{ companyId: user.companyId, panel: 'vnn', recordId: record._id, recordNo: record.vnnNo,
        action: 'cancelledOrdersReplaced', actorId: user.id, actorName: user.name || '', reason, batchId, revision: record.approvedRevision || 0,
        before: original, after: { orders: record.orders, reapprovalState: record.reapprovalState },
        details: { removed: plan.removed.map(row => ({ orderNo: row.orderNo, orderRowId: row.orderRowId })), added: plan.added.map(row => ({ orderNo: row.orderNo, orderRowId: row.orderRowId })) } }], { session });
      result = { id: recordId, vnnNo: record.vnnNo, removed: plan.removed.length, added: plan.added.length };
    });
  } finally { await session.endSession(); }
  await notifyModuleApprovers({ user, module: 'Vehicle Negotiation', panelLabel: 'Vehicle Negotiation', reference: result.vnnNo, url: `/admin/vehicle-negotiation/approve/${recordId}` });
  return result;
}
