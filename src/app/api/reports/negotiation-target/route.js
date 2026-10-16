import { NextResponse } from 'next/server';
import connectDb from '@/lib/db';
import VehicleNegotiation from '@/app/api/vehicle-negotiation/VehicleNegotiation';
import {withAuth,hasPermission} from '@/lib/auth';
import {companyScopeFilter} from '@/lib/companyScope';
import {agingScope} from '@/lib/order-aging-scope.mjs';
import {negotiationRows} from '@/lib/negotiation-report.mjs';
export const GET=withAuth(async(req,context,user)=>{
 if(!hasPermission(user,'Vehicle Negotiation','view') || !hasPermission(user,'Rate Target (Vehicle Negotiation)','view'))return NextResponse.json({success:false,message:'View permission for both Vehicle Negotiation and Rate Target is required.'},{status:403});
 try{const {filter,scope}=agingScope(user,companyScopeFilter);await connectDb();const records=await VehicleNegotiation.find(filter).select('vnnNo date branchName subCompanyName subCompanyCode partyName customerName totalWeight negotiation approval workflow orders.orderNo orders.partyName orders.fromName orders.toName vendors').sort({date:-1,_id:-1}).lean();return NextResponse.json({success:true,scope,asOf:new Date().toISOString(),rows:negotiationRows(records)},{headers:{'Cache-Control':'no-store'}});}catch(error){console.error('Combined negotiation report:',error);return NextResponse.json({success:false,message:error.status===400?error.message:'Unable to load negotiation report. Please retry.'},{status:error.status || 500});}
});
