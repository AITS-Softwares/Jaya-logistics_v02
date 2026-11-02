import mongoose from 'mongoose';
import { hasPermission } from '@/lib/auth';
import { companyScopeFilter } from '@/lib/companyScope';
import { TYPES, resolveDeleteGraph } from '@/lib/deletion/linkGraph';
import { planOrderCancellation } from '@/lib/orderCancellationPolicy.mjs';
import { notifyModulePermissionUsers } from '@/lib/workflowNotifications';
import { getBilledLrNumbers } from '@/lib/billedLrs';

export async function cancelOrder(user, orderId, { reason, dryRun, approvingStatusRequest, reconcile = false }) {
  const session = await mongoose.startSession();
  let result;
  let notices = [];
  try {
    await session.withTransaction(async () => {
      notices = [];
      const order = await TYPES.order.Model.findOne(companyScopeFilter(user, { _id: orderId })).session(session);
      if (!order) throw Object.assign(new Error('Order not found.'), { status: 404 });
      if (['pendingApproval', 'pendingReapproval', 'blockedByUpstream', 'syncFailed'].includes(order.reapprovalState)) throw Object.assign(new Error('Finish the current order review before cancelling.'), { status: 409 });
      if (reconcile && !hasPermission(user, 'Order Panel', 'approve')) throw Object.assign(new Error('Order approval permission is required to reconcile an existing cancellation.'), { status: 403 });
      if (reconcile && order.cancellationRepair?.state === 'applied') { result = { success: true, message: 'Cancellation links are already reconciled.' }; return; }
      const targets = (order.plantRows || []).filter(row => reconcile ? row.status === 'Cancelled' : approvingStatusRequest ? row.statusRequest?.action === 'Cancel' : ['Open', 'Hold'].includes(row.status || 'Open'));
      if (!targets.length || !reconcile && targets.some(row => !['Open', 'Hold'].includes(row.status || 'Open'))) throw Object.assign(new Error('No eligible open or held rows remain.'), { status: 409 });
      if (!approvingStatusRequest && targets.some(row => row.statusRequest?.action)) throw Object.assign(new Error('A status request is already pending. Review it first.'), { status: 409 });
      const graph = await resolveDeleteGraph('order', order.toObject(), user.companyId, session);
      // Pricing can exist without a VNN reference in legacy data.
      const pricing = await TYPES.pricing.Model.find(companyScopeFilter(user, { 'orders.orderNo': order.orderPanelNo })).session(session).lean();
      for (const doc of pricing) if (!graph.some(item => item.type === 'pricing' && item.id === String(doc._id))) graph.push({ type: 'pricing', id: String(doc._id), no: doc.pricingSerialNo, label: 'Pricing', depth: 1, record: doc });
      const { plans, blockers } = planOrderCancellation(order.toObject(), targets, graph);
      const requiresApproval = !hasPermission(user, 'Order Panel', 'approve');
      const impact = { orderNo: order.orderPanelNo, rows: targets.map(row => ({ id: String(row._id), plant: row.plantName, from: row.status, to: 'Cancelled' })), blockers,
        vehicleNegotiations: plans.filter(item => item.type === 'vnn').map(item => ({ vnnNo: item.no, effect: item.full ? 'will cancel and release vehicle' : 'shared record; will block for cancellation review' })),
        purchases: plans.filter(item => item.type === 'purchase').map(item => ({ purchaseNo: item.no })),
        lrs: plans.filter(item => item.type === 'lr').map(item => ({ lrNo: item.no, status: item.record.header?.status })),
        loadingPanels: plans.filter(item => item.type === 'loading').map(item => ({ vehicleArrivalNo: item.no, status: item.record.panelStatus })),
        linkedRecords: plans.map(({ type, no, full }) => ({ type, no, effect: full ? 'cancel' : 'block for review' })),
        willCancelNegotiations: plans.filter(item => item.type === 'vnn' && item.full).map(item => item.no), willNeedReplacement: [], willCloseLrs: plans.filter(item => item.type === 'lr').map(item => item.no) };
      if (dryRun) { result = { success: true, impact, canConfirm: blockers.length === 0, requiresApproval }; return; }
      if (blockers.length) throw Object.assign(new Error(blockers.map(item => item.reason).join(' ')), { status: 409, blockers });
      const at = new Date();
      for (const row of targets) {
        row.statusHistory ||= [];
        row.statusHistory.push({ action: requiresApproval ? 'Cancel Requested' : 'Cancel', from: row.status || 'Open', to: requiresApproval ? row.status || 'Open' : 'Cancelled', reason, by: user.id, at });
        if (requiresApproval) row.statusRequest = { action: 'Cancel', reason, by: user.id, at };
        else { row.status = 'Cancelled'; row.statusReason = reason; row.statusChangedBy = user.id; row.statusChangedAt = at; row.statusRequest = undefined; }
      }
      if (!requiresApproval) {
        order.cancellationRepair = { state: 'applied', version: 1, at };
        const billed = new Set([...(await getBilledLrNumbers(user.companyId, 'product-wise')), ...(await getBilledLrNumbers(user.companyId, 'general'))]);
        for (const item of plans) {
          const doc = await TYPES[item.type].Model.findOne({ _id: item.id, companyId: user.companyId }).session(session);
          if (!doc) throw new Error(`Linked ${item.label} disappeared; retry cancellation.`);
          if (reconcile && (doc.cancellation?.orders || []).some(value => value.orderId === String(order._id) && targets.every(row => value.rowIds?.includes(String(row._id))))) continue;
          const previous = doc.cancellation?.orders || [];
          const entry = { orderId: String(order._id), orderNo: order.orderPanelNo, rowIds: targets.map(row => String(row._id)), reason, by: user.id, at };
          const adjustmentRequired = item.type === 'lr' && billed.has(item.no);
          doc.set('cancellation', { state: item.full ? 'cancelled' : 'review', orders: [...previous.filter(value => value.orderId !== entry.orderId), entry], affectedRowIds: item.affected.map(index => String((doc.orders || doc.orderRows || [])[index]?._id || index)), adjustmentRequired });
          for (const index of item.affected) (doc.orders || doc.orderRows)[index].cancellationStatus = 'Cancelled';
          if (item.type === 'pricing') {
            for (const index of item.affected) { doc.orders[index].cancellationChargeRequired = true; }
            notices.push({ module: 'Pricing Panel', action: 'edit', type: 'pricing-cancellation-charge-required', reference: item.no, url: `/admin/pricing-panel/${item.id}`, message: `Cancellation charges required in ${item.no} for order ${order.orderPanelNo}. Enter an explicit amount, including zero when applicable, and submit for approval.` });
          }
          if (item.full) {
            if (item.type === 'lr') doc.header.status = 'Cancelled';
            else if (['advance', 'balance'].includes(item.type)) { /* preserve financial lifecycle; cancellation guard blocks progression */ }
            else doc.panelStatus = 'Cancelled';
            if (item.type === 'vnn' && doc.approval) { doc.approval.vehicleId = ''; doc.approval.vehicleNo = ''; doc.approval.vehicleData = null; }
          }
          doc.$locals.allowCancellationWrite = true;
          await doc.save({ session, validateBeforeSave: false });
          const panel = { vnn: ['Vehicle Negotiation', 'vehicle-negotiation'], loading: ['Loading Info', 'Loading-Info'], purchase: ['Purchase Panel', 'Purchase-Panel'], lr: ['Consignment Note', 'Consignment-Note'], advance: ['Advance Payment', 'Advance-Payment'], balance: ['Balance-Payment', 'Balance-Payment'] }[item.type];
          if (panel) notices.push({ module: panel[0], action: 'edit', type: 'linked-order-cancelled', reference: item.no, url: `/admin/${panel[1]}/${item.id}`, message: `${item.label} ${item.no}: ${item.full ? 'cancelled' : 'blocked for cancellation review'} because order ${order.orderPanelNo} was cancelled. Reason: ${reason}` });
          if (adjustmentRequired) notices.push({ module: 'Billing', action: 'view', type: 'cancelled-invoice-adjustment-required', reference: item.no, url: '/admin/Billing/reports', message: `Order ${order.orderPanelNo} was cancelled. Preserve the issued bill for LR ${item.no} and review its adjustment.` });
        }
        if (order.plantRows.every(row => row.status === 'Cancelled')) {
          order.panelStatus = 'Cancelled';
          order.cancellation = { state: 'cancelled', orders: [{ orderId: String(order._id), orderNo: order.orderPanelNo, rowIds: targets.map(row => String(row._id)), reason, by: user.id, at }] };
          order.$locals.allowCancellationWrite = true;
        }
      }
      await order.save({ session });
      notices.push({ module: 'Order Panel', action: requiresApproval ? 'approve' : 'view', type: requiresApproval ? 'order-status-approval' : 'order-cancel', reference: order.orderPanelNo, url: `/admin/order-panel/${order._id}/view`, message: `${requiresApproval ? 'Cancellation approval requested for' : 'Cancelled'} order ${order.orderPanelNo}. Reason: ${reason}` });
      result = { success: true, requiresApproval, message: requiresApproval ? 'Cancel request sent for approval.' : 'Order and linked workflow cancelled; shared records require review.', data: order, impact };
    });
  } finally { await session.endSession(); }
  for (const notice of notices) await notifyModulePermissionUsers({ user, ...notice });
  return result;
}
