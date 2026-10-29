import { withBranchAccess } from '@/lib/branchAccess';
import { NextResponse } from 'next/server';
import connectDb from '@/lib/db';
import OrderPanel from '@/app/api/order-panel/OrderPanel';
import { withAuth } from '@/lib/auth';
import { companyScopeFilter } from '@/lib/companyScope';
import { buildAging } from '@/lib/order-aging.mjs';
import { agingScope } from '@/lib/order-aging-scope.mjs';

const branchHandlerGET = withAuth(async (req, context, user) => {
  try {
    const {filter,scope} = agingScope(user,companyScopeFilter);
    await connectDb();
    const orders = await OrderPanel.find(filter).select('orderPanelNo date branchName subCompanyName subCompanyCode partyName customerName delivery panelStatus updatedAt plantRows packData').lean();
    const asOf = new Date().toISOString();
    return NextResponse.json({success:true,asOf,scope,data:buildAging(orders,asOf)}, {headers:{'Cache-Control':'no-store'}});
  } catch (error) {
    console.error('Order aging report failed:', error);
    return NextResponse.json({success:false,message:error.status===400 ? error.message : 'Unable to load order aging report. Please retry or check the server logs.'},{status:error.status || 500});
  }
}, {module:'Order Panel',action:'view'});

export const GET = withBranchAccess(branchHandlerGET);
