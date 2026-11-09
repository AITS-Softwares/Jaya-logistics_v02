import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { withAuth } from '@/lib/auth';
import { withBranchAccess } from '@/lib/branchAccess';
import connectDb from '@/lib/db';
import { companyScopeFilter } from '@/lib/companyScope';
import OrderPanel from '@/app/api/order-panel/OrderPanel';
import { ORDER_VIEW_SELECT, orderReadView } from '@/lib/orderReadView.mjs';

export const GET = withBranchAccess(withAuth(async (req, context, user) => {
  try {
    const id = new URL(req.url).searchParams.get('orderId');
    if (!id || !mongoose.isValidObjectId(id)) return NextResponse.json({ success: false, message: 'Invalid order reference.' }, { status: 400 });
    await connectDb();
    const order = await OrderPanel.findOne(companyScopeFilter(user, { _id: id, panelStatus: 'Submitted', isDraft: { $ne: true } })).select(ORDER_VIEW_SELECT).lean();
    if (!order) return NextResponse.json({ success: false, message: 'This order is no longer awaiting approval. Refresh the list.' }, { status: 404 });
    return NextResponse.json({ success: true, data: orderReadView(order) });
  } catch (error) {
    console.error('PDI order preview failed', error);
    return NextResponse.json({ success: false, message: 'Unable to load order details.' }, { status: 500 });
  }
}, { module: 'PDI Panel', action: 'view' }));
