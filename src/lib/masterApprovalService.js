import mongoose from 'mongoose';
import { approvalError, initialApproval, submissionUpdate, reviewUpdate, legacyApprovalUpdate, STALE_PROPOSAL } from './masterApprovalPolicy.mjs';

// Match all state read by a writer. Immediate edits cannot race a review and
// accidentally erase changes; a conflict asks the caller to refresh.
export function approvalWriteFilter(record) {
  return {_id:record._id,companyId:record.companyId,updatedAt:record.updatedAt,
    approvalStatus:record.approvalStatus,
    'pendingChange.revisionId':record.pendingChange?.revisionId || {$exists:false},
    ...(record.revisionId ? {revisionId:record.revisionId}:{}),
    approvalVersion:record.approvalVersion || 0};
}
export function applyApprovalPatch(record, patch) {
  for (const [path,value] of Object.entries(patch)) record.set(path,value);
  return record;
}
export function approvalManagementRecord(record) {
  const data=record.toObject();
  if(record.$isDefault?.('approvalStatus')) data.approvalStatus='Migration required';
  return data;
}
export function requireApprovalMigration(record) {
  if(record.$isDefault?.('approvalStatus')) throw approvalError('This existing record must be approved in the app first. An administrator should open Existing records, select Review, then click Approve existing record. After approval, you can edit it normally.');
}
export async function submitMasterChange({Model,record,input,user,kind}) {
  requireApprovalMigration(record);
  if (!record.approvalStatus || !record.updatedAt) throw approvalError('This record is missing approval details. Ask an administrator to review it under Existing records before submitting changes.');
  const castCandidate=new Model(record.toObject());
  const allowedInput=submissionUpdate(record.toObject(),input,user,kind);
  applyApprovalPatch(castCandidate,allowedInput.$set);
  if(allowedInput.$set.pendingChange) applyApprovalPatch(castCandidate,allowedInput.$set.pendingChange.data);
  const update = submissionUpdate(record.toObject(),castCandidate.toObject(),user,kind);
  if(kind==='supplier') update.$set.reservedSupplierCode=update.$set.pendingChange?.data?.supplierCode || record.pendingChange?.data?.supplierCode || update.$set.supplierCode || record.supplierCode;
  // Validate a detached candidate, never mutate live state during submission.
  const candidate = new Model(record.toObject());
  applyApprovalPatch(candidate,update.$set);
  if (update.$set.pendingChange) applyApprovalPatch(candidate,update.$set.pendingChange.data);
  await candidate.validate();
  if(kind==='rate') validateRateCandidate(candidate);
  const saved = await Model.findOneAndUpdate(approvalWriteFilter(record),update,{new:true,runValidators:true});
  if (!saved) throw approvalError(STALE_PROPOSAL);
  return saved;
}
export async function createPendingMaster({Model,data,user}) {
  const record = new Model({...data,...initialApproval(user),...(Model.modelName==='Supplier'?{reservedSupplierCode:data.supplierCode}:{})});
  if(Model.modelName==='RateMaster') validateRateCandidate(record);
  await record.save();
  return record;
}
export async function reviewMaster({Model,id,companyId,user,kind,action,revisionId,reason,onApprove}) {
  if (!mongoose.isValidObjectId(id)) throw approvalError('Invalid master ID.',400);
  const session = await mongoose.startSession();
  let saved;
  try {
    await session.withTransaction(async () => {
      const record = await Model.findOne({_id:id,companyId}).setOptions({includeUnapprovedMasters:true}).session(session);
      if (!record) throw approvalError('Master record not found.',404);
      requireApprovalMigration(record);
      const update = reviewUpdate(record.toObject(),user,action,revisionId,reason);
      if(kind==='supplier') update.$set.reservedSupplierCode=update.$set.supplierCode || record.supplierCode;
      const candidate = new Model(record.toObject());
      applyApprovalPatch(candidate,update.$set);
      await candidate.validate();
      if(kind==='rate') validateRateCandidate(candidate);
      if (action === 'approve' && onApprove) await onApprove({record,candidate,update,session,kind});
      saved = await Model.findOneAndUpdate(approvalWriteFilter(record),update,{new:true,runValidators:true,session});
      if (!saved) throw approvalError(STALE_PROPOSAL);
      saved.$locals.reviewMaker=record.pendingChange?.requestedBy || record.submittedBy;
    });
    return saved;
  } finally { await session.endSession(); }
}

export function validateRateCandidate(record) {
  if(record.usageMode==='manual_rate_default' && record.locationRates.length) throw approvalError('Manual Rate Default cannot have rate slabs.',400);
  const groups=new Map();
  for(const row of record.locationRates || []) {
    if(![row.fromQty,row.toQty,row.rate].every(Number.isFinite) || row.fromQty<0 || row.rate<0 || row.fromQty>=row.toQty) throw approvalError('Each rate slab needs valid non-negative values and From quantity below To quantity.',400);
    if(row.isActive===false)continue;
    const key=String(row.locationId),rows=groups.get(key) || [];
    if(rows.some(other=>row.fromQty<other.toQty && row.toQty>other.fromQty)) throw approvalError('Active rate slabs overlap for the same location.',400);
    rows.push(row);groups.set(key,rows);
  }
  if(record.weightRule==='custom') {
    if(!['above','below','between'].includes(record.customRuleType) || !(record.customRuleLimit>0) || (record.customRuleType==='between' && !(record.customRuleToLimit>record.customRuleLimit))) throw approvalError('Enter valid custom weight limits.',400);
  }
}

export async function approveLegacyMaster({Model,id,companyId,user,kind,expectedUpdatedAt}) {
  const update=legacyApprovalUpdate(user);
  if(!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(companyId))throw approvalError('Invalid master record.',400);
  if(expectedUpdatedAt!==null && (typeof expectedUpdatedAt!=='string' || !Number.isFinite(Date.parse(expectedUpdatedAt))))throw approvalError('Refresh the list before reviewing this existing record.',400);
  const filter={_id:new mongoose.Types.ObjectId(String(id)),companyId:new mongoose.Types.ObjectId(String(companyId)),isDeleted:{$ne:true},approvalStatus:{$exists:false},revisionId:{$exists:false},submittedBy:null,submittedAt:null,pendingChange:null,'approvalLog.action':{$nin:['SUBMITTED','APPROVED','REJECTED','LEGACY_APPROVED']},updatedAt:expectedUpdatedAt===null?{$exists:false}:new Date(expectedUpdatedAt)};
  // Raw matching is intentional: hydrated schema defaults disguise missing
  // approvalStatus as Pending. No normal Pending/Rejected record can match.
  const existing=await Model.collection.findOne(filter);
  if(!existing)throw approvalError('This record is no longer eligible for existing-record approval. Refresh the list; new submissions must use normal approval.');
  update.$set.approvedBy.accountId=new mongoose.Types.ObjectId(update.$set.approvedBy.accountId);
  update.$push.approvalLog.by={...update.$set.approvedBy};
  update.$set.updatedAt=new Date();
  if(kind==='supplier')update.$set.reservedSupplierCode=existing.supplierCode;
  const result=await Model.collection.updateOne(filter,update);
  if(result.modifiedCount!==1)throw approvalError(STALE_PROPOSAL);
  return Model.findOne({_id:filter._id,companyId:filter.companyId}).setOptions({includeUnapprovedMasters:true});
}
