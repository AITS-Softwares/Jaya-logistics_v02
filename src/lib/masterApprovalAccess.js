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
  const actors=records.flatMap(record=>[record.submittedBy,record.pendingChange?.requestedBy]).filter(Boolean);
  const staffIds=actors.filter(actor=>actor.accountType==='companyUser').map(actor=>actor.accountId);
  const companyIds=actors.filter(actor=>actor.accountType==='company').map(actor=>actor.accountId);
  const [staff,companies]=await Promise.all([CompanyUser.find({_id:{$in:staffIds}}).select('name email').lean(),Company.find({_id:{$in:companyIds}}).select('companyName name email').lean()]);
  const names=new Map([...staff,...companies].map(account=>[String(account._id),account.name || account.companyName || account.email || String(account._id)]));
  return records.map(record=>({...record,submitterName:names.get(String(record.submittedBy?.accountId)),pendingSubmitterName:names.get(String(record.pendingChange?.requestedBy?.accountId))}));
}
