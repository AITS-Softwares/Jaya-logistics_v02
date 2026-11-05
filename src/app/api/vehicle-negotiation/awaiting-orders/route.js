import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { withBranchAccess } from '@/lib/branchAccess';
import connectDb from '@/lib/db';
import { companyScopeFilter } from '@/lib/companyScope';
import OrderPanel from '@/app/api/order-panel/OrderPanel';

const handler = withAuth(async (req, context, user) => {
  await connectDb();
  // Submitted records are exposed only for early, read-only planning.
  const orders = await OrderPanel.find(companyScopeFilter(user, { panelStatus: 'Submitted', isDraft: { $ne: true } }))
    .select('orderPanelNo customerName partyName date updatedAt branchName subCompanyName plantRows').sort({ updatedAt: -1 }).lean();
  return NextResponse.json({ success: true, data: orders.map(order => ({
    id: String(order._id), orderNo: order.orderPanelNo, customer: order.customerName || order.partyName,
    date: order.date, updatedAt: order.updatedAt, branch: order.branchName || '', company: order.subCompanyName || '',
    rows: (order.plantRows || []).map(row => ({ id: String(row._id), fromName: row.fromName, toName: row.toName, locationRemark: row.locationRemark, plantName: row.plantName, plantCode: row.plantCodeValue || '', pinCode: row.pinCode || '', taluka: row.talukaName || row.taluka || '', district: row.districtName || '', state: row.stateName || '', orderType: row.orderType, weight: row.weight, status: row.status || 'Open' })),
  })) });
}, { module: 'Vehicle Negotiation', action: 'view' });

export const GET = withBranchAccess(handler);
