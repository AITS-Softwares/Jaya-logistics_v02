import {NextResponse} from 'next/server';
import dbConnect from '@/lib/db';
import Supplier from '@/models/SupplierModels';
import RateMaster from '@/app/api/rate-master/schema';
import RateHistory from '@/app/api/rate-master/history-schema';
import Location from '@/app/api/locations/schema';
import {validateMasterDataRequest} from '@/lib/masterDataPermission';
import {reviewMaster,approveLegacyMaster} from './masterApprovalService';
import {syncSupplier} from './frappe-supplier.mjs';
import {notifyModuleApprovers,notifyModuleDecision} from './workflowNotifications';

export async function notifyMasterSubmission(user,record,kind) {
  if(record.approvalStatus==='Approved' && !record.pendingChange) {
    if(kind==='supplier') {
      const result=await syncSupplier(record);
      record.frappeSync={...result,attemptedAt:new Date()};
      await Supplier.updateOne({_id:record._id,companyId:record.companyId},{$set:{frappeSync:record.frappeSync}}).catch(error=>console.error('Supplier sync status:',error));
    }
    return {recipients:0};
  }
  return notifyModuleApprovers({user,module:kind === 'supplier'?'Suppliers':'Rate Master',panelLabel:kind === 'supplier'?'Supplier':'Rate Master',reference:record.supplierCode || record.title,url:kind === 'supplier'?'/admin/supplier':'/admin/rate-master/list'});
}
export async function rateApprovalHistory({record,candidate,update,session}) {
  if (!update.$set.locationRates && !record.pendingChange?.data?.locationRates) return;
  const next=candidate.locationRates;
  for (const previous of record.locationRates) {
    const current=next.find(row=>String(row._id)===String(previous._id));
    const changed=!current || current.rate!==previous.rate || current.fromQty!==previous.fromQty || current.toQty!==previous.toQty || current.isActive!==previous.isActive;
    if (!changed) continue;
    const replacement=next.find(row=>String(row.locationId)===String(previous.locationId) && row.isActive!==false && !record.locationRates.some(old=>String(old._id)===String(row._id)));
    const revised=current && current.isActive!==false?current:replacement;
    const location=await Location.findById(previous.locationId).session(session).lean();
    await RateHistory.create([{rateMasterId:record._id,rateMasterTitle:record.title,locationId:previous.locationId,locationName:location?.name || 'Unknown',fromQty:previous.fromQty,toQty:previous.toQty,rate:previous.rate,version:previous.version || 1,revisedBy:update.$set.approvedBy.accountId,action:!revised?'DELETED':'REVISED',changes:{newRate:revised?.rate,newFromQty:revised?.fromQty,newToQty:revised?.toQty}}],{session});
    if(current && current.isActive!==false) current.version=(previous.version || 1)+1;
  }
  update.$set.locationRates=next.map(row=>row.toObject());
}
export function masterReviewRoute(kind,action) {
  return async function POST(req,{params}) {
    try {
      await dbConnect();
      const module=kind==='supplier'?'Suppliers':'Rate Master';
      const access=await validateMasterDataRequest(req,action,module);
      if(access.error) return NextResponse.json({success:false,message:access.error},{status:access.status});
      const {id}=await params;
      const {revisionId,reason}=await req.json();
      const record=await reviewMaster({Model:kind==='supplier'?Supplier:RateMaster,id,companyId:access.user.companyId,user:access.user,kind,action,revisionId,reason,onApprove:kind==='rate'?rateApprovalHistory:null});
      // All side effects occur after the transaction commits.
      if(kind==='supplier' && action==='approve') {
        const result=await syncSupplier(record);
        await Supplier.updateOne({_id:record._id,companyId:record.companyId},{$set:{frappeSync:{...result,attemptedAt:new Date()}}}).catch(error=>console.error('Approved supplier sync status:',error));
      }
      const maker=record.$locals.reviewMaker || record.submittedBy;
      await notifyModuleDecision({user:access.user,record:{createdBy:maker?.accountId},module,reference:record.supplierCode || record.title,action,url:kind==='supplier'?'/admin/supplier':'/admin/rate-master/list'});
      return NextResponse.json({success:true,data:record,message:action==='approve'?'Approved successfully.':'Rejected with reason.'});
    } catch(error) {
      console.error('Master review:',error);
      return NextResponse.json({success:false,message:error.status?error.message:'Unable to review this master. Please refresh and try again.'},{status:error.status || (error.code===11000?409:500)});
    }
  };
}

export function legacyMasterApprovalRoute(kind) {
  return async function POST(req,{params}) {
    try {
      await dbConnect();
      const module=kind==='supplier'?'Suppliers':'Rate Master';
      const access=await validateMasterDataRequest(req,'approve',module);
      if(access.error)return NextResponse.json({success:false,message:access.error},{status:access.status});
      const {id}=await params;
      const {expectedUpdatedAt}=await req.json();
      const record=await approveLegacyMaster({Model:kind==='supplier'?Supplier:RateMaster,id,companyId:access.user.companyId,user:access.user,kind,expectedUpdatedAt});
      return NextResponse.json({success:true,data:record,message:'Existing record approved. It is now available for selection.'});
    }catch(error){
      console.error('Existing master approval:',error);
      return NextResponse.json({success:false,message:error.status?error.message:'Unable to approve this existing record. Please refresh and try again.'},{status:error.status || (error.code===11000?409:500)});
    }
  };
}
