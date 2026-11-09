import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDb from '@/lib/db';
import { withAuth, hasPermission } from '@/lib/auth';
import { withBranchAccess } from '@/lib/branchAccess';
import { companyScopeFilter } from '@/lib/companyScope';
import OrderPanel from '@/app/api/order-panel/OrderPanel';
import PdiPanel from './PdiPanel';
import { inspectionView, mergeInspection } from '@/lib/pdiRules.mjs';
const fail = (message, status) => NextResponse.json({ success: false, message }, { status });
const select = 'orderPanelNo partyName customerName branchName branchCode date subCompanyName subCompanyCode totalWeight packData plantRows panelStatus isDraft reapprovalState';
export const GET = withBranchAccess(withAuth(async (req, context, user) => {
  try {
    const params = new URL(req.url).searchParams, id = params.get('orderId');
    const ids = params.get('orderIds')?.split(',').filter(Boolean);
    const pdiAccess = hasPermission(user, 'PDI Panel', 'view');
    if (!pdiAccess && !(ids?.length && ['Vehicle Negotiation', 'Order Panel', 'Loading Info', 'Pricing Panel', 'Consignment Note'].some(module => hasPermission(user, module, 'view')))) return fail('PDI view permission required.', 403);
    if ([...(ids || []), ...(id ? [id] : [])].some(id => !mongoose.isValidObjectId(id)) || ids?.length > 200) return fail('Invalid order reference.', 400);
    await connectDb();
    const filter = id ? { _id: id } : ids ? { _id: { $in: ids } } : { panelStatus: { $in: ['Approved', 'Partially on hold'] }, isDraft: { $ne: true } };
    const orders = await OrderPanel.find(companyScopeFilter(user, filter)).select(select).sort({ createdAt: -1 }).lean();
    if (id && !orders.length) return fail('Order not found.', 404);
    const saved = await PdiPanel.find(companyScopeFilter(user, { orderId: { $in: orders.map(order => order._id) } })).lean();
    const data = orders.map(order => inspectionView(order, saved.find(doc => String(doc.orderId) === String(order._id))));
    return NextResponse.json({ success: true, data: id ? data[0] : data });
  } catch (error) { console.error('PDI read failed', error); return fail('Unable to load PDI.', 500); }
}));
export const PATCH = withBranchAccess(withAuth(async (req, context, user) => {
  try {
    const body = await req.json();
    if (!mongoose.isValidObjectId(body.orderId)) return fail('Invalid order reference.', 400);
    await connectDb();
    const order = await OrderPanel.findOne(companyScopeFilter(user, { _id: body.orderId })).select(select).lean();
    if (!order) return fail('Order not found.', 404);
    let doc = await PdiPanel.findOne(companyScopeFilter(user, { orderId: order._id }));
    if (body.revision !== (doc?.__v ?? -1)) return fail('Inspection changed. Reload before saving.', 409);
    let items;
    try { items = mergeInspection(order, doc?.toObject(), body.items); } catch (error) { return fail(error.message, 400); }
    const before = doc?.items || [];
    if (!doc) doc = new PdiPanel({ companyId: user.companyId, subCompanyId: user.activeOperatingCompanyId, orderId: order._id, orderNo: order.orderPanelNo });
    doc.items = items; doc.status = inspectionView(order, { items }).status;
    doc.inspectedBy = user.name || user.email || String(user.id); doc.inspectedAt = new Date();
    doc.history.push({ userId: user.id, who: doc.inspectedBy, when: doc.inspectedAt, before, after: items });
    await doc.save();
    return NextResponse.json({ success: true, message: 'PDI saved.', data: inspectionView(order, doc.toObject()) });
  } catch (error) {
    if (error.code === 11000 || error.name === 'VersionError') return fail('Inspection changed. Reload before saving.', 409);
    if (error instanceof SyntaxError) return fail('Invalid JSON.', 400);
    console.error('PDI save failed', error); return fail('Unable to save PDI.', 500);
  }
}, { module: 'PDI Panel', action: 'edit' }));
