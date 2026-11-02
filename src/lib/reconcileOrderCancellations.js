import mongoose from 'mongoose';
import { TYPES, resolveDeleteGraph } from '@/lib/deletion/linkGraph';
import { companyScopeFilter } from '@/lib/companyScope';
import { branchContext } from '@/lib/branchContext';
import { cancelOrder } from '@/lib/cancelOrder';
import { planOrderCancellation } from '@/lib/orderCancellationPolicy.mjs';
import { notifyModulePermissionUsers } from '@/lib/workflowNotifications';

// Reconcile the persisted cancellation, never a new user cancellation request.
// Original request branch/operating-company scope remains active for every query.
const runs = new Map();
export async function reconcileOrderCancellations(user) {
  const access = branchContext.getStore()?.access;
  const key = JSON.stringify([String(user.companyId), String(user.activeOperatingCompanyId || ''), access?.accessAllBranches, [...(access?.branchIds || [])].map(String).sort()]);
  const previous = runs.get(key);
  if (previous?.promise) return previous.promise;
  if (previous && Date.now() - previous.at < 5000) return;
  if (runs.size > 1000) for (const [name, run] of runs) if (!run.promise && Date.now() - run.at > 60000) runs.delete(name);
  const promise = repair(user);
  runs.set(key, { promise, at: Date.now() });
  try { await promise; runs.set(key, { at: Date.now() }); }
  catch (error) { runs.delete(key); throw error; }
}

async function repair(user) {
  const orders = await TYPES.order.Model.find(companyScopeFilter(user, {
    'plantRows.status': 'Cancelled', reapprovalState: { $in: [null, 'none'] },
    $or: [{ 'cancellationRepair.state': { $nin: ['applied', 'blocked'] } }, { 'cancellationRepair.state': 'blocked', 'cancellationRepair.retryAt': { $lte: new Date() } }],
  })).sort({ updatedAt: 1 }).limit(25).lean();
  for (const order of orders) {
    const targets = (order.plantRows || []).filter(row => row.status === 'Cancelled');
    // Permission elevation is restricted to replaying an already persisted cancellation.
    // The user cannot supply an order id, action, changed values or new target rows here.
    const system = { ...user, type: 'company', roles: [...(user.roles || []), 'Admin'] };
    const reason = targets.find(row => row.statusReason)?.statusReason || 'Automatically reconcile previously cancelled order links';
    try { await cancelOrder(system, String(order._id), { reason, reconcile: true }); }
    catch (error) {
      if (!error.blockers?.length) throw error;
      const signature = JSON.stringify(error.blockers);
      if (order.cancellationRepair?.signature === signature) {
        await TYPES.order.Model.updateOne(companyScopeFilter(user, { _id: order._id }), { $set: { 'cancellationRepair.retryAt': new Date(Date.now() + 600000) } }, { allowCancellationWrite: true });
        continue;
      }
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const graph = await resolveDeleteGraph('order', order, user.companyId, session);
          const plan = planOrderCancellation(order, targets, graph);
          const at = new Date();
          for (const item of plan.plans.filter(item => ['vnn', 'pricing', 'loading', 'purchase', 'lr'].includes(item.type))) {
            if (item.record.cancellation?.state === 'cancelled') continue;
            const oldOrders = item.record.cancellation?.orders || [];
            const marker = { orderId: String(order._id), orderNo: order.orderPanelNo, rowIds: targets.map(row => String(row._id)), reason, at };
            await TYPES[item.type].Model.updateOne(companyScopeFilter(user, { _id: item.id }), { $set: { cancellation: { ...(item.record.cancellation || {}), state: 'review', orders: [...oldOrders.filter(source => source.orderId !== marker.orderId), marker], legacyBlockers: error.blockers } } }, { session, allowCancellationWrite: true });
          }
          await TYPES.order.Model.updateOne(companyScopeFilter(user, { _id: order._id }), { $set: { cancellationRepair: { state: 'blocked', version: 1, at, retryAt: new Date(Date.now() + 600000), signature, blockers: error.blockers } } }, { session, allowCancellationWrite: true });
        });
      } finally { await session.endSession(); }
      await notifyModulePermissionUsers({ user: system, module: 'Order Panel', action: 'approve', type: 'cancellation-reconciliation-blocked', reference: order.orderPanelNo, url: `/admin/order-panel/${order._id}/view`, message: `Order ${order.orderPanelNo} was previously cancelled, but linked records require review: ${error.blockers.map(item => item.reason).join(' ')} Operational linked records are blocked; paid transactions and POD are preserved.` });
    }
  }
}
