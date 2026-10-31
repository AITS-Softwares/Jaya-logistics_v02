import { randomUUID } from 'node:crypto';

export const STALE_PROPOSAL = 'This proposal changed or the record was updated. Refresh before reviewing.';
export const SUPPLIER_SENSITIVE = ['supplierName','supplierCode','pan','gstNumber','gstCategory','bankName','branch','bankAccountNumber','ifscCode','glAccount','dueDays','paymentTerms','documents.panCard','documents.cancelledCheque','documents.tdsDeclaration'];
export const SUPPLIER_IMMEDIATE = ['contactPersonName','mobileNumber','emailId','contactNumber','alternateContactNumber','billingAddresses','shippingAddresses','documents.visitingCard','documents.aadhaarCard','leadTime','qualityRating','supplierType','supplierGroup','supplierCategory','status','valid','incorporated','udyamNumber','commissionRate'];
export const RATE_SENSITIVE = ['locationRates','weightRule','customWeightRule','customRuleType','customRuleLimit','customRuleToLimit','customerId','branchId','usageMode','approvalOption','approvalFile','isActive'];
export const identity = user => ({ accountType: user.type === 'company' ? 'company' : 'companyUser', accountId: String(user.id || user._id || '') });
export const sameActor = (a,b) => Boolean(a && b && a.accountType === b.accountType && String(a.accountId) === String(b.accountId));
export function approvalError(message, status = 409) { return Object.assign(new Error(message), { status }); }
export function getPath(data, path) { return path.split('.').reduce((value,key) => value?.[key], data); }
function canonical(value) {
  if (value?.toHexString) return value.toHexString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => [k, canonical(value[k])]));
  return value;
}
export const equivalent = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
export function pickPaths(data, paths) {
  return Object.fromEntries(paths.filter(path => getPath(data,path) !== undefined).map(path => [path,getPath(data,path)]));
}
export function initialApproval(user, now = new Date(), revisionId = randomUUID()) {
  const by = identity(user);
  if (!by.accountId) throw approvalError('Authenticated maker is required.',401);
  return { approvalStatus:'Pending', approvalVersion:0, revisionId, submittedBy:by, submittedAt:now,
    approvalLog:[{ action:'SUBMITTED',revisionId,by,at:now,changedFields:[] }] };
}
export function submissionUpdate(record, input, user, kind, now = new Date(), revisionId = randomUUID()) {
  const by = identity(user);
  const sensitive = kind === 'supplier' ? [...SUPPLIER_SENSITIVE,...SUPPLIER_IMMEDIATE] : RATE_SENSITIVE;
  const immediate = kind === 'supplier' ? [] : ['title'];
  const proposed = pickPaths(input,sensitive);
  const changed = Object.fromEntries(Object.entries(proposed).filter(([path,value]) => !equivalent(value,getPath(record,path))));
  const set = pickPaths(input,immediate);
  const logs = [];
  if (record.approvalStatus !== 'Approved') {
    const maker = record.submittedBy;
    if (record.approvalStatus === 'Pending' && maker && !sameActor(maker,by)) throw approvalError('Another maker submitted this record. Review the current submission first.');
    Object.assign(set, proposed, {approvalStatus:'Pending', revisionId, submittedBy:by, submittedAt:now, rejectionReason:'',lastRejectedProposal:null});
    if (record.approvalStatus === 'Pending') logs.push({action:'SUPERSEDED',revisionId:record.revisionId,by,at:now});
    logs.push({action:'SUBMITTED',revisionId,by,at:now,changedFields:Object.keys(proposed)});
  } else if (Object.keys(changed).length) {
    if (record.pendingChange && !sameActor(record.pendingChange.requestedBy,by)) throw approvalError('Another maker has a pending proposal. Review it before submitting another change.');
    if (record.pendingChange) logs.push({action:'SUPERSEDED',revisionId:record.pendingChange.revisionId,by,at:now});
    set.pendingChange = {revisionId,baseVersion:record.approvalVersion || 0,data:changed,requestedBy:by,requestedAt:now};
    logs.push({action:'SUBMITTED',revisionId,by,at:now,changedFields:Object.keys(changed)});
  }
  return {$set:set,...(logs.length ? {$push:{approvalLog:{$each:logs}}} : {})};
}
export function reviewUpdate(record, user, action, revisionId, reason, now = new Date()) {
  if (!['approve','reject'].includes(action)) throw approvalError('Invalid review action.',400);
  if(record.approvalStatus==='Pending' && (!record.revisionId || !record.submittedBy?.accountId || !record.submittedAt)) throw approvalError('This record has no complete approval submission. For an older record, an administrator should use Existing records, then Review and Approve existing record. A new submission must be saved and resubmitted by its maker.');
  const change = record.approvalStatus === 'Approved' ? record.pendingChange : null;
  const current = change?.revisionId || (record.approvalStatus === 'Pending' ? record.revisionId : null);
  if (!revisionId || current !== revisionId || (change && change.baseVersion !== (record.approvalVersion || 0))) throw approvalError(STALE_PROPOSAL);
  const maker = change?.requestedBy || record.submittedBy;
  const by = identity(user);
  if (!maker) throw approvalError('This submission has no maker identity and requires administrator investigation.');
  if (sameActor(maker,by)) throw approvalError('You cannot approve or reject your own submission.',403);
  if (action === 'reject' && !String(reason || '').trim()) throw approvalError('A rejection reason is required.',400);
  const data = change?.data || {};
  const set = action === 'approve'
    ? {...data,approvalStatus:'Approved',approvedBy:by,approvedAt:now,rejectionReason:'',lastRejectedProposal:null,pendingChange:null}
    : {rejectedBy:by,rejectedAt:now,rejectionReason:String(reason).trim(),...(change ? {pendingChange:null,lastRejectedProposal:{data,reason:String(reason).trim(),rejectedBy:by,rejectedAt:now}} : {approvalStatus:'Rejected'})};
  return {$set:set,...(action === 'approve' ? {$inc:{approvalVersion:1}} : {}),$push:{approvalLog:{action:action === 'approve' ? 'APPROVED':'REJECTED',revisionId,by,at:now,remark:action === 'reject' ? String(reason).trim():'',changedFields:Object.keys(data)}}};
}

export function legacyApprovalUpdate(user,now=new Date()) {
  if(user.type!=='company' && !user.roles?.includes('Admin')) throw approvalError('Only an administrator can approve an existing master without a submission.',403);
  const by=identity(user);
  if(!by.accountId)throw approvalError('Authenticated administrator is required.',401);
  return {$set:{approvalStatus:'Approved',approvalVersion:0,approvedBy:by,approvedAt:now,pendingChange:null},$push:{approvalLog:{action:'LEGACY_APPROVED',by,at:now,remark:'Existing master reviewed and approved individually by an administrator.',changedFields:[]}}};
}
