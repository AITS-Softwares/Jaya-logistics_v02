"use client";
import {useEffect,useState} from 'react';
import {FiShield,FiRefreshCw,FiInbox,FiArrowUpRight} from 'react-icons/fi';
import {canUseMasterPermission} from '@/lib/masterPermissionRegistry';

const submitterLabel=record=>record?.pendingChange?(record.pendingSubmitterName || 'Submitter unavailable'):record?.submittedBy?(record.submitterName || 'Submitter unavailable'):'Existing record · No submission recorded';
const atPath=(record,path)=>path.split('.').reduce((value,key)=>value?.[key],record);
const labels={supplierName:'Supplier name',supplierCode:'Supplier code',supplierType:'Supplier type',supplierGroup:'Group',supplierCategory:'Category',emailId:'Email',mobileNumber:'Mobile number',contactPersonName:'Contact person',contactNumber:'Contact number',alternateContactNumber:'Alternate contact number',billingAddresses:'Billing address',shippingAddresses:'Shipping address',paymentTerms:'Payment terms',dueDays:'Payment due in days',gstNumber:'GST number',gstCategory:'GST category',pan:'PAN',bankName:'Bank name',branch:'Bank branch',bankAccountNumber:'Bank account number',ifscCode:'IFSC code',glAccount:'GL account',valid:'Udyam verified',udyamNumber:'Udyam number',incorporated:'Incorporation date',leadTime:'Lead time',qualityRating:'Quality rating',title:'Title',customerId:'Customer',branchId:'Branch',locationRates:'Location rates',usageMode:'Usage',weightRule:'Weight rule',customWeightRule:'Custom weight rule',customRuleType:'Custom rule type',customRuleLimit:'Weight limit',customRuleToLimit:'Upper weight limit',approvalOption:'Customer approval method',approvalFile:'Customer approval document','documents.panCard':'PAN card','documents.cancelledCheque':'Cancelled cheque','documents.tdsDeclaration':'TDS declaration','documents.aadhaarCard':'Aadhaar card','documents.visitingCard':'Visiting card'};
const supplierFields=['supplierName','supplierCode','status','supplierType','supplierGroup','supplierCategory','contactPersonName','emailId','mobileNumber','contactNumber','alternateContactNumber','billingAddresses','shippingAddresses','paymentTerms','dueDays','gstNumber','gstCategory','pan','bankName','branch','bankAccountNumber','ifscCode','glAccount','valid','udyamNumber','incorporated','leadTime','qualityRating','documents.panCard','documents.cancelledCheque','documents.tdsDeclaration','documents.aadhaarCard','documents.visitingCard'];
const rateFields=['title','customerId','branchId','usageMode','locationRates','weightRule','customWeightRule','customRuleType','customRuleLimit','customRuleToLimit','approvalOption','approvalFile'];
const fieldLabel=path=>labels[path] || path.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase());
const empty=value=>value===undefined || value===null || value==='' || (Array.isArray(value) && !value.length);
const options={contract_rate:'Contract rate',mail_approval:'Email approval',all_weights:'All weights',above_25:'Above 25 MT',below_25:'Below 25 MT',manual_rate_default:'Manual rate default',standard:'Standard',custom:'Custom',above:'Above',below:'Below',between:'Between'};
function ReviewValue({path,value,record}) {
  if(empty(value))return <span className="text-slate-400">Not provided</span>;
  if(path==='billingAddresses' || path==='shippingAddresses')return <div className="space-y-3">{value.map((address,index)=><address key={index} className="not-italic leading-6">{value.length>1 && <span className="block text-xs font-semibold text-slate-500">Address {index+1}</span>}{[address.address1,address.address2,[address.city,address.state].filter(Boolean).join(', '),[address.country,address.pin].filter(Boolean).join(' · ')].filter(Boolean).map((line,i)=><span key={i} className="block">{line}</span>)}</address>)}</div>;
  if(path==='glAccount' && typeof value==='object')return <div><span className="block font-medium">{value.accountName || 'Account'}</span><span className="text-xs text-slate-500">{value.accountCode}</span></div>;
  if(path==='customerId')return <span>{value.customerName || (String(value._id || value)===String(record.customerId?._id || record.customerId)?record.customerName:null) || 'Customer reference: '+String(value._id || value)}</span>;
  if(path==='branchId')return <span>{value.name || (String(value._id || value)===String(record.branchId?._id || record.branchId)?record.branchName:null) || 'Branch reference: '+String(value._id || value)}</span>;
  if(path==='locationRates' && Array.isArray(value))return <div className="space-y-2">{value.map((row,index)=><div key={row._id || index} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="font-medium">{row.locationName || record.locationRates?.find(loc=>String(loc.locationId)===String(row.locationId))?.locationName || `Location ${index+1}`}</div><div className="mt-1 text-xs text-slate-600">Quantity: {row.fromQty}–{row.toQty} · Rate: {row.rate}</div><div className={`mt-1 text-xs ${row.isActive===false?'text-slate-400':'text-green-700'}`}>{row.isActive===false?'Inactive':'Active'}</div></div>)}</div>;
  if(path.startsWith('documents.') || path==='approvalFile') {
    const file=typeof value==='object'?value.fileName || value.filePath:value;
    if(!file)return <span className="text-slate-400">Not provided</span>;
    let name=String(file).split(/[\\/]/).pop();try{name=decodeURIComponent(name);}catch{}
    const href=typeof value==='object'?value.filePath:value;
    return typeof href==='string' && href.startsWith('/uploads/')?<a className="font-medium text-indigo-700 underline underline-offset-2" href={href} target="_blank" rel="noopener noreferrer">{name}</a>:<span>{name}</span>;
  }
  if(typeof value==='boolean')return <span>{value?'Yes':'No'}</span>;
  if(typeof value==='object')return <span>{value.name || value.label || value.accountName || 'Provided'}</span>;
  return <span>{options[value] || String(value)}</span>;
}
export default function MasterApprovalReview({kind,onChanged}) {
  const [records,setRecords]=useState([]),[user,setUser]=useState(null),[filter,setFilter]=useState('Pending'),[selected,setSelected]=useState(null),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const root=kind==='supplier'?'/api/suppliers':'/api/rate-master';
  const module=kind==='supplier'?'Suppliers':'Rate Master';
  const load=async()=>{
    try {
      const headers={Authorization:`Bearer ${localStorage.getItem('token')}`};
      const [response,me]=await Promise.all([fetch(`${root}?management=true`,{headers,cache:'no-store'}),fetch('/api/auth/me',{headers,cache:'no-store'})]);
      const data=await response.json(),auth=await me.json();
      if(!response.ok) throw new Error(data.message || 'Unable to load approval records.');
      setUser(auth.user || null);setRecords(data.data || []);
    }catch(e){setError(e.message);}
  };
  useEffect(()=>{load();},[root]);
  const canApprove=canUseMasterPermission(user,module,'approve'),canReject=canUseMasterPermission(user,module,'reject');
  const review=async action=>{
    setBusy(true);setError('');
    try {
      const response=await fetch(`${root}/${selected._id}/${action}`,{method:'POST',headers:{Authorization:`Bearer ${localStorage.getItem('token')}`,'Content-Type':'application/json'},body:JSON.stringify({revisionId:selected.pendingChange?.revisionId || selected.revisionId,reason})});
      const data=await response.json();if(!response.ok)throw new Error(data.message || 'Review failed.');
      setSelected(null);setReason('');await load();onChanged?.();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  // A view of statuses is available to master users; review actions remain
  // individually authorized here and authoritatively in the server endpoint.
  if(!user)return error?<p className="p-3 text-red-700">{error}</p>:null;
  const rows=records.filter(record=>filter==='All' || (filter==='Pending'?record.approvalStatus==='Pending' || record.pendingChange:record.approvalStatus===filter));
  const maker=selected?.pendingChange?.requestedBy || selected?.submittedBy;
  const own=maker && String(maker.accountId)===String(user._id || user.id) && maker.accountType===(user.type==='company'?'company':'companyUser');
  const proposal=selected?.pendingChange?.data;
  const fields=kind==='supplier'?supplierFields:rateFields;
  const changes=proposal?Object.entries(proposal):fields.map(path=>[path,atPath(selected,path)]).filter(([,value])=>!empty(value));
  const migrationCount=records.filter(record=>record.approvalStatus==='Migration required').length;
  const pendingCount=records.filter(record=>record.approvalStatus==='Pending' || record.pendingChange).length;
  const statusCount=status=>status==='All'?records.length:status==='Pending'?pendingCount:records.filter(record=>record.approvalStatus===status).length;
  return <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><FiShield size={20}/></span><div><h2 className="text-sm font-bold text-slate-900">{kind==='supplier'?'Supplier':'Rate Master'} approvals</h2><p className="mt-0.5 text-xs text-slate-500">{pendingCount?`${pendingCount} submission${pendingCount===1?'':'s'} awaiting review`:migrationCount?'Existing masters require approval setup':'All caught up · No submissions awaiting review'}</p></div></div>
      <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"><FiRefreshCw size={13}/>Refresh</button>
    </div>
    <div className="flex gap-1 overflow-x-auto border-t border-slate-100 px-5 pt-2" role="group" aria-label="Approval status filter">{['Pending','Approved','Rejected','All'].map(status=><button key={status} type="button" aria-pressed={filter===status} onClick={()=>setFilter(status)} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors ${filter===status?'border-indigo-600 text-indigo-700':'border-transparent text-slate-500 hover:text-slate-800'}`}>{status}<span className={`rounded-md px-1.5 py-0.5 text-[10px] ${filter===status?'bg-indigo-50 text-indigo-700':'bg-slate-100 text-slate-500'}`}>{statusCount(status)}</span></button>)}</div>
    {migrationCount>0 && <p role="alert" className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-900">{migrationCount} existing master record{migrationCount===1?'':'s'} need approval setup. Ask an administrator to complete the master approval migration before using these records.</p>}
    {error && <p role="alert" className="px-5 py-3 text-sm text-red-700">{error}</p>}
    {rows.length>0?<div className="max-h-72 overflow-auto"><table className="w-full table-fixed text-left text-xs"><colgroup><col style={{width:'30%'}}/><col style={{width:'15%'}}/><col style={{width:'23%'}}/><col style={{width:'20%'}}/><col style={{width:'12%'}}/></colgroup><thead className="sticky top-0 bg-gray-50 text-gray-400"><tr>{['Record','Status','Submitted by','Submitted on','Review'].map(label=><th key={label} className="border-b border-gray-100 px-4 py-3 text-[10px] font-bold uppercase tracking-wide">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(record=><tr key={record._id} className="transition-colors hover:bg-slate-50"><td className="break-words px-4 py-3 font-semibold text-slate-800">{record.supplierName || record.title}<div className="mt-1 font-mono text-[10px] font-normal text-slate-400">{record.supplierCode}</div></td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${record.approvalStatus==='Approved'?'bg-emerald-50 text-emerald-700':record.approvalStatus==='Rejected'?'bg-red-50 text-red-700':'bg-amber-50 text-amber-700'}`}>{record.approvalStatus==='Migration required'?'Existing record':record.approvalStatus || 'Existing record'}</span>{record.pendingChange && <div className="mt-1 text-[10px] text-amber-700">Change pending</div>}</td><td className="break-words px-4 py-3 text-slate-600">{submitterLabel(record)}</td><td className="px-4 py-3 text-slate-500">{record.pendingChange?.requestedAt || record.submittedAt?new Date(record.pendingChange?.requestedAt || record.submittedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—'}</td><td className="px-4 py-3">{((record.approvalStatus==='Pending' || record.pendingChange) && (canApprove || canReject))?<button type="button" className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 font-semibold text-indigo-700 hover:bg-indigo-100" onClick={()=>{setSelected(record);setReason('');setError('');}}>Review<FiArrowUpRight size={12}/></button>:record.approvalStatus==='Rejected'?<span title={record.rejectionReason} className="text-red-700">{record.rejectionReason}</span>:<span className="text-slate-300">—</span>}</td></tr>)}</tbody></table></div>:<div className="flex items-center gap-3 px-6 py-6"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-400"><FiInbox size={18}/></span><div><p className="text-sm font-medium text-slate-600">{filter==='Pending'?'No pending approvals':`No ${filter==='All'?'':filter.toLowerCase()+' '}records`}</p><p className="mt-0.5 text-xs text-slate-400">{filter==='Pending'?'New submissions and proposed changes will appear here.':'Choose another status to view submissions.'}</p></div></div>}
    {selected && <div role="dialog" aria-modal="true" aria-labelledby="master-review-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6">
      <div className="flex max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="shrink-0 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{proposal?'Change approval':'New record approval'}</p><h3 id="master-review-title" className="mt-1 text-xl font-bold text-slate-900">{selected.supplierName || selected.title}</h3></div><button type="button" aria-label="Close review" disabled={busy} onClick={()=>setSelected(null)} className="rounded-lg border px-3 py-1 text-xl text-slate-500 hover:bg-slate-50">×</button></div>
          <p className="mt-2 text-sm text-slate-500">{<>Submitted by <span className="font-medium text-slate-700">{submitterLabel(selected)}</span></>}</p>
          {own && <p className="mt-2 text-sm text-amber-800">Another authorized user must review your submission.</p>}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <p className="border-b bg-indigo-50 px-5 py-3 text-sm text-indigo-900 sm:px-6">{proposal?'Compare the proposed changes below. Current approved values remain in use until approval.':'Review the submitted details below. This record becomes available for selection after approval.'}</p>
          <table className="w-full table-fixed text-left text-sm"><thead className="sticky top-0 z-10 bg-gray-50 text-gray-400"><tr><th className="w-[25%] px-5 py-3 font-semibold">Field</th>{proposal && <th className="px-5 py-3 font-semibold">Current approved value</th>}<th className="px-5 py-3 font-semibold">{proposal?'Proposed value':'Submitted details'}</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{changes.map(([path,value])=><tr key={path} className="align-top"><th scope="row" className="break-words px-5 py-3 font-medium text-slate-600">{fieldLabel(path)}</th>{proposal && <td className="break-words px-5 py-3 text-slate-600"><ReviewValue path={path} value={atPath(selected,path)} record={selected} /></td>}<td className={`break-words px-5 py-3 text-slate-900 ${proposal?'bg-indigo-50/40':''}`}><ReviewValue path={path} value={value} record={selected} /></td></tr>)}</tbody>
          </table>
        </div>
        <footer className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          {canReject && !own && <label className="block text-xs font-medium text-slate-600">Reason (required to reject)<textarea rows={2} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explain what needs to be corrected" className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>}
          {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
          <div className="mt-3 flex justify-end gap-2"><button type="button" disabled={busy} onClick={()=>setSelected(null)} className="rounded-lg border bg-white px-4 py-2 text-sm font-medium">Close</button>{canReject && <button type="button" disabled={busy || own || !reason.trim()} onClick={()=>review('reject')} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Reject</button>}{canApprove && <button type="button" disabled={busy || own} onClick={()=>review('approve')} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy?'Saving…':'Approve'}</button>}</div>
        </footer>
      </div>
    </div>}

  </section>;
}
