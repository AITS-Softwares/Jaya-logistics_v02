import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDb from '@/lib/db';
import ConsignmentNote from '@/app/api/consignment-note/ConsignmentNote';
import { withAuth } from '@/lib/auth';
import { companyScopeFilter } from '@/lib/companyScope';
import { agingScope } from '@/lib/order-aging-scope.mjs';
import { billingRows } from '@/lib/billing-data.mjs';
export const GET=withAuth(async(req,context,user)=>{
  try {
    const {filter,scope}=agingScope(user,companyScopeFilter);
    await connectDb();
    const consolidated=user.type==='company' && user.isGroupAdmin===true && !user.activeOperatingCompanyId;
    const reports=await mongoose.connection.db.collection('savedreports').find({companyId:new mongoose.Types.ObjectId(user.companyId)}).sort({generatedAt:-1}).toArray();
    const allowedIds=consolidated ? null : new Set((await ConsignmentNote.find(filter).select('_id').lean()).map(row=>String(row._id)));
    return NextResponse.json({success:true,scope,asOf:new Date().toISOString(),...billingRows(reports,allowedIds)},{headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    console.error('Billing dashboard:',error);
    return NextResponse.json({success:false,message:error.status===400 ? error.message : 'Unable to load saved bills. Please retry.'},{status:error.status || 500});
  }
},{module:'Billing',action:'view'});
