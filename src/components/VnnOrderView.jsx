"use client";
import {useEffect,useRef,useState} from 'react';
import {FiX,FiPackage,FiMapPin} from 'react-icons/fi';
const text=value=>value===undefined || value===null || value===''?'—':String(value);
function Detail({label,value}){return <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800">{text(value)}</dd></div>;}
export default function VnnOrderView({selection,onClose}) {
  const [record,setRecord]=useState(null),[error,setError]=useState('');
  const closeRef=useRef(null);
  useEffect(()=>{
    if(!selection)return;
    const controller=new AbortController();setRecord(null);setError('');
    const oldOverflow=document.body.style.overflow,previousFocus=document.activeElement;
    document.body.style.overflow='hidden';closeRef.current?.focus();
    const keydown=event=>{
      if(event.key==='Escape')onClose();
      if(event.key==='Tab'){event.preventDefault();closeRef.current?.focus();}
    };
    document.addEventListener('keydown',keydown);
    (async()=>{try{
      const response=await fetch(`/api/vehicle-negotiation?id=${encodeURIComponent(selection.vnId)}`,{headers:{Authorization:`Bearer ${localStorage.getItem('token')}`},cache:'no-store',signal:controller.signal});
      const data=await response.json();if(!response.ok || !data.success)throw new Error(data.message || 'Unable to load VNN order details.');
      if(!controller.signal.aborted)setRecord(data.data);
    }catch(e){if(e.name!=='AbortError' && !controller.signal.aborted)setError(e.message);}})();
    return ()=>{controller.abort();document.body.style.overflow=oldOverflow;document.removeEventListener('keydown',keydown);previousFocus?.focus?.();};
  },[selection,onClose]);
  if(!selection)return null;
  const rows=(record?.orders || []).filter(row=>selection.orderPanelId?String(row.orderPanelId)===String(selection.orderPanelId):row.orderNo===selection.orderNo);
  const weight=rows.reduce((sum,row)=>sum+(Number(row.weight)||0),0);
  return <div role="dialog" aria-modal="true" aria-labelledby="vnn-order-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6"><div className="flex max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl">
    <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Order details · Vehicle Negotiation</p><h2 id="vnn-order-title" className="mt-1 text-xl font-bold text-slate-900">{selection.orderNo || 'Linked order'}</h2><p className="mt-1 text-xs text-slate-500">{record?.vnnNo || selection.vnn} · Read-only</p></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Close order details" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"><FiX size={20}/></button></header>
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{error?<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>:!record?<p role="status" className="p-6 text-sm text-slate-500">Loading order details…</p>:!rows.length?<p className="p-6 text-sm text-slate-500">This order is no longer linked to this VNN. Refresh the list.</p>:<>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center gap-2 font-semibold text-slate-800"><FiPackage className="text-indigo-500"/>Order overview</div><dl className="grid grid-cols-2 gap-5 md:grid-cols-3"><Detail label="Customer / Party" value={rows[0].partyName || record.customerName}/><Detail label="Branch" value={record.branchName}/><Detail label="Company" value={rows[0].subCompanyName || record.subCompanyName}/><Detail label="VNN date" value={record.date?new Date(record.date).toLocaleDateString('en-IN'):null}/><Detail label="Weight in this VNN" value={`${weight.toLocaleString('en-IN',{maximumFractionDigits:3})} MT`}/><Detail label="Linked routes" value={rows.length}/></dl></section>
      <p className="my-4 text-xs text-slate-500">These are the order rows included in this VNN. Other rows from the original order are not shown.</p>
      <div className="space-y-4">{rows.map((row,index)=><section key={row._id || index} className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FiMapPin className="text-indigo-500"/>{row.fromName || 'Origin'} → {row.toName || 'Destination'}</h3><span className={`rounded-full px-2 py-1 text-xs font-medium ${row.sourceOrderStatus==='Cancelled'?'bg-red-50 text-red-700':row.sourceOrderStatus==='Hold'?'bg-amber-50 text-amber-700':'bg-slate-100 text-slate-600'}`}>{row.sourceOrderStatus || row.status || 'Unknown'}</span></div><dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3"><Detail label="Plant" value={row.plantName}/><Detail label="Plant code" value={row.plantCodeValue}/><Detail label="Order type" value={row.orderType}/><Detail label="Weight" value={`${Number(row.weight || 0).toLocaleString('en-IN')} MT`}/><Detail label="PIN code" value={row.pinCode}/><Detail label="Taluka" value={row.talukaName || row.taluka}/><Detail label="District" value={row.districtName}/><Detail label="State" value={row.stateName}/><Detail label="Country" value={row.countryName}/></dl>{row.locationRemark && <p className="mt-4 whitespace-pre-wrap border-t border-slate-100 pt-3 text-sm text-slate-600"><strong>Location remark: </strong>{row.locationRemark}</p>}{row.sourceStatusReason && <p className="mt-3 text-sm text-slate-600"><strong>Status reason: </strong>{row.sourceStatusReason}</p>}</section>)}</div>
    </>}</div>
  </div></div>;
}
