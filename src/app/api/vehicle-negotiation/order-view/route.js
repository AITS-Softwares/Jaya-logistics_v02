import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { withBranchAccess } from '@/lib/branchAccess';
import connectDb from '@/lib/db';
import { companyScopeFilter } from '@/lib/companyScope';
import OrderPanel from '@/app/api/order-panel/OrderPanel';
import VehicleNegotiation from '@/app/api/vehicle-negotiation/VehicleNegotiation';
import { ORDER_VIEW_SELECT, orderReadView } from '@/lib/orderReadView.mjs';

const fail = (message, status) => NextResponse.json({ success: false, message }, { status });
const objectId = value => /^[a-f\d]{24}$/i.test(value || '');

const handler = withAuth(async (req, context, user) => {
  try {
    const params = new URL(req.url).searchParams;
    const id = params.get('orderId'), number = params.get('orderNo'), vnnId = params.get('vnnId');
    if ((!id && !number) || (id && !objectId(id)) || (vnnId && !objectId(vnnId))) return fail('Invalid order reference.', 400);
    await connectDb();
    const normalize = value => String(value || '').trim().toLowerCase();
    let vnn;
    let links = [];
    if (vnnId) {
      vnn = await VehicleNegotiation.findOne(companyScopeFilter(user, { _id: vnnId })).select('vnnNo orders.orderPanelId orders.orderNo orders.orderRowId selectedOrderPanels').lean();
      if (!vnn) return fail('Vehicle Negotiation not found.', 404);
      links = [...(vnn.orders || []), ...(vnn.selectedOrderPanels || []).map(panel => ({ orderPanelId: panel._id, orderNo: panel.orderPanelNo }))];
    }
    const loadOrder = filter => OrderPanel.findOne(companyScopeFilter(user, vnnId ? filter : { ...filter, panelStatus: 'Submitted', isDraft: { $ne: true } })).select(ORDER_VIEW_SELECT).lean();
    // Resolve the real scoped source first. The list can enrich legacy links
    // with a current ID even though the stored VNN contains only an order number.
    let order = id ? await loadOrder({ _id: id }) : null;
    if (!order && number) {
      if (vnnId && !links.some(link => normalize(link.orderNo) === normalize(number))) return fail('This order is not linked to the selected Vehicle Negotiation.', 404);
      const escaped = String(number).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      order = await loadOrder({ orderPanelNo: { $regex: `^${escaped}$`, $options: 'i' } });
    }
    if (!order) return fail(vnnId ? 'Linked source order not found.' : 'This order is no longer awaiting approval. Refresh the list.', 404);
    const linkedToOrder = link => String(link.orderPanelId || '') === String(order._id) || (normalize(link.orderNo) && normalize(link.orderNo) === normalize(order.orderPanelNo));
    if (vnnId && !links.some(linkedToOrder)) return fail('This order is not linked to the selected Vehicle Negotiation.', 404);
    return NextResponse.json({ success: true, data: orderReadView(order), context: {
      vnnNo: vnn?.vnnNo || '',
      linkedRowIds: (vnn?.orders || []).filter(linkedToOrder).map(row => String(row.orderRowId || '')).filter(Boolean),
    } });
  } catch (error) {
    console.error('Order preview failed:', error);
    return fail('Unable to load full order details.', 500);
  }
}, { module: 'Vehicle Negotiation', action: 'view' });

export const GET = withBranchAccess(handler);
