import {validateMasterDataRequest} from '@/lib/masterDataPermission';
import CompanyUser from '@/models/CompanyUser';
import Company from '@/models/Company';
export async function masterApprovalAccess(req,action,module) {
  const management=new URL(req.url).searchParams.get('management')==='true';
  const result=await validateMasterDataRequest(req,action,module,{allowLookup:action==='view' && !management});
  if(!result.error || action!=='view' || !management || result.status!==403) return result;
  for(const reviewAction of ['approve','reject']) {
    const review=await validateMasterDataRequest(req,reviewAction,module);
    if(!review.error)return review;
  }
  return result;
}
export async function withMasterSubmitterNames(records) {
  const accountId=actor=>actor?.accountId?._id || actor?.accountId;
  const actorType=actor=>actor?.accountType==='user'?'companyUser':actor?.accountType;
  const actors=records.flatMap(record=>[record.submittedBy,record.pendingChange?.requestedBy]).filter(actor=>accountId(actor));
  const staffIds=[...new Set(actors.filter(actor=>actorType(actor)==='companyUser').map(actor=>String(accountId(actor))))];
  const companyIds=[...new Set(actors.filter(actor=>actorType(actor)==='company').map(actor=>String(accountId(actor))))];
  const [staff,companies]=await Promise.all([
    staffIds.length?CompanyUser.find({_id:{$in:staffIds}}).select('name email').lean():[],
    companyIds.length?Company.find({_id:{$in:companyIds}}).select('companyName contactName name email').lean():[],
  ]);
  const names=new Map([
    ...staff.map(account=>[`companyUser:${account._id}`,account.name || account.email || 'User unavailable']),
    ...companies.map(account=>[`company:${account._id}`,account.companyName || account.contactName || account.name || account.email || 'Company account']),
  ]);
  const nameFor=actor=>actor?names.get(`${actorType(actor)}:${accountId(actor)}`):undefined;
  return records.map(record=>({...record,submitterName:nameFor(record.submittedBy),pendingSubmitterName:nameFor(record.pendingChange?.requestedBy)}));
}
