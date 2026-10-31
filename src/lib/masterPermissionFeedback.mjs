import {MASTER_PERMISSION_REGISTRY} from './masterPermissionRegistry.js';

export function masterPermissionFeedback({url,method='GET',status,data,origin}) {
  if(status!==403 || !url || !origin)return null;
  let target;
  try {target=new URL(url,origin);}catch{return null;}
  if(target.origin!==origin)return null;
  const resource=MASTER_PERMISSION_REGISTRY.find(item=>item.apiPrefixes?.some(prefix=>target.pathname===prefix || target.pathname.startsWith(prefix+'/')));
  if(!resource)return null;
  const verb=method.toUpperCase();
  const action=/\/approve(?:-existing)?(?:\/|$)/.test(target.pathname)?'approve':/\/reject(?:\/|$)/.test(target.pathname)?'reject':verb==='GET'?'view':verb==='DELETE'?'delete':verb==='POST' && !/\/(cleanup|sync)(?:\/|$)/.test(target.pathname)?'create':'edit';
  const serverMessage=[data?.message,data?.error,data?.msg].find(value=>typeof value==='string' && value.trim());
  const selfReview=serverMessage && /own submission|own change|own record/i.test(serverMessage);
  return {title:selfReview?'Another approver is required':'Access denied',message:serverMessage || `You are not authorized to ${action} ${resource.label}.`,help:selfReview?'Ask another authorized approver to review this submission.':`If you need access, ask your administrator to check your ${resource.label} permissions.`,resource:resource.key,action};
}
