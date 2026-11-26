import OrderPanel from '@/app/api/order-panel/OrderPanel';
import VehicleNegotiation from '@/app/api/vehicle-negotiation/VehicleNegotiation';
import { companyScopeFilter } from '@/lib/companyScope';
import mongoose from 'mongoose';

// Run inside the saving transaction. Writing the source panels serializes
// competing creates/edits before checking existing links, including legacy links.
export async function assertVnnOrdersAvailable(user, record, session) {
  const rows = record.orders || [];
  const panels = record.selectedOrderPanels || [];
  const names = [...new Set([...rows.map(row => row.orderNo), ...panels.map(panel => panel.orderPanelNo)].map(value => String(value || '').trim()).filter(Boolean))];
  const ids = [...new Set([...rows.map(row => row.orderPanelId), ...panels.map(panel => panel._id)].map(value => String(value || '')).filter(value => mongoose.isValidObjectId(value)))];
  if (!names.length && !ids.length) return;
  const sources = await OrderPanel.find(companyScopeFilter(user, { $or: [
    { orderPanelNo: { $in: names } }, { _id: { $in: ids } },
  ] })).select('_id orderPanelNo').session(session).lean();
  await OrderPanel.updateMany(companyScopeFilter(user, { _id: { $in: sources.map(panel => panel._id) } }), { $inc: { __v: 1 } }, { session });
  const allNames = [...new Set([...names, ...sources.map(panel => panel.orderPanelNo)])];
  const allIds = [...new Set([...ids, ...sources.map(panel => String(panel._id))])];
  const conflict = await VehicleNegotiation.findOne(companyScopeFilter(user, {
    _id: { $ne: record._id }, panelStatus: { $ne: 'Cancelled' },
    'cancellation.state': { $ne: 'cancelled' },
    $or: [
      { 'orders.orderNo': { $in: allNames } },
      { 'selectedOrderPanels.orderPanelNo': { $in: allNames } },
      { 'orders.orderPanelId': { $in: allIds } },
      { 'selectedOrderPanels._id': { $in: allIds } },
    ],
  })).select('vnnNo').session(session).lean();
  if (conflict) {
    const error = new Error(`This order is already linked to Vehicle Negotiation ${conflict.vnnNo}. Open the existing VNN instead.`);
    error.status = 409;
    throw error;
  }
}
