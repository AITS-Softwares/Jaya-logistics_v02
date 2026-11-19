"use client";
import { useId, useState } from 'react';
import { ewaybillData } from '@/lib/ewaybill-data.mjs';
import { gstStateLabel } from '@/lib/gst-states.mjs';
import { NIC_UNITS } from '@/lib/ewaybill-validation.mjs';

const totals = {totalValue:'Taxable total',cgstValue:'CGST amount',sgstValue:'SGST amount',igstValue:'IGST amount',cessValue:'Cess amount',cessNonAdvolValue:'Cess per-unit total',otherValue:'Other charges / rounding'};
export default function EwaybillMissingFields({invoice,onChange,consignor,consignee,header,status,readOnly}) {
  if (!status) return null;
  const data = ewaybillData(invoice,consignor,consignee,header);
  const source = ewaybillData({...invoice,ewaybillData:{transactionType:data.transactionType}},consignor,consignee,header);
  const set = (key,value) => onChange({...invoice,ewaybillData:{...invoice.ewaybillData,[key]:value}});
  const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 disabled:bg-slate-50 disabled:text-slate-500';
  const input = (key,label,type='text') => <label key={key} className="block text-xs font-bold text-slate-600">{label}<input disabled={readOnly} className={inputClass} value={data[key] ?? ''} type={type} step={type === 'number' ? 'any' : undefined} onChange={e => set(key,e.target.value)}/></label>;
  const select = (key,label,choices) => <label className="block text-xs font-bold text-slate-600">{label}<select disabled={readOnly} className={inputClass} value={data[key] ?? ''} onChange={e => set(key,e.target.value)}><option value="">Select</option>{choices.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>;
  return <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
    <p className="text-xs text-slate-600">Customer details come from Customer Master; goods and taxes come from the invoice. Review the transport details before generation.</p>
    {status === 'To Be Generated' && <>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><h4 className="border-b border-slate-100 px-4 py-2.5 text-sm font-extrabold text-slate-900">Transport Details</h4><div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5">
        {select('supplyType','Supply direction',[['O','Outward'],['I','Inward']])}
        {select('subSupplyType','Movement reason',[['1','Supply']])}
        {select('transactionType','Address arrangement',[['1','Same as consignor / consignee'],['2','Different ship-to address'],['3','Different dispatch-from address'],['4','Both physical addresses differ']])}
        {select('vehicleType','Vehicle type',[['R','Regular'],['O','Over-dimensional cargo']])}
        <div>{input('transDistance','Distance (km)','number')}<p className="mt-1 text-xs text-slate-500">Leave as 0 to calculate distance automatically from the dispatch and shipping PIN codes.</p></div>
      </div></section>
      {data.transactionType && <Collapsible key={data.transactionType} defaultOpen title="Dispatch & Shipping Addresses"><div className="grid gap-4 md:grid-cols-2">{[['from','Dispatch','actFromStateCode'],['to','Shipping','actToStateCode']].map(([prefix,label,actual]) => <div key={prefix} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3"><p className="mb-2 text-xs font-bold text-slate-800">{label === 'Dispatch' ? 'Dispatch From' : 'Ship To'}</p><p className="mb-3 whitespace-pre-line text-xs leading-relaxed text-slate-600">{[source[`${prefix}Addr1`],source[`${prefix}Place`],source[`${prefix}Pincode`]].filter(Boolean).join(', ') || 'Complete the physical address below.'}</p><div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">{source[`${prefix}StateCode`] && <span>Billing: {gstStateLabel(source[`${prefix}StateCode`])}</span>}{source[actual] && <span>Physical: {gstStateLabel(source[actual])}</span>}</div><div className="grid gap-3 sm:grid-cols-2">{[[`${prefix}Addr1`,'Address'],[`${prefix}Place`,'City / place'],[`${prefix}Pincode`,'PIN'],[`${prefix}StateCode`,'Billing GST state code'],[actual,'Physical GST state code']].filter(([key]) => source[key] === '' || source[key] == null).map(([key,label]) => input(key,label))}</div></div>)}</div></Collapsible>}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><h4 className="border-b border-slate-100 px-4 py-2.5 text-sm font-extrabold text-slate-900">Invoice Tax Details</h4><div className="grid items-start gap-4 p-4 sm:grid-cols-3">{select('taxTreatment','GST treatment',[['igst','IGST'],['cgst_sgst','CGST + SGST'],['none','No GST on these goods']])}<label className="flex min-h-16 items-center gap-2 text-xs font-bold text-slate-600"><input disabled={readOnly} type="checkbox" checked={data.noCess === true} onChange={e => set('noCess',e.target.checked)}/>Invoice has no cess</label>{input('otherValue','Other charges / rounding (enter 0 if none)','number')}</div></section>
    </>}

  </div>;
}

export function InvoiceProductsAndTotals({invoice,onChange,consignor,consignee,header,status,readOnly}) {
  const data = ewaybillData(invoice,consignor,consignee,header);
  const set = (key,value) => onChange({...invoice,ewaybillData:{...invoice.ewaybillData,[key]:value}});
  const updateRow = (i,key,value) => set('itemList',data.itemList.map((r,n) => i === n ? {...r,[key]:value} : r));
  const input = (key,label,type='text') => <label key={key} className="block text-xs font-bold text-slate-600">{label}<input disabled={readOnly} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200" value={data[key] ?? ''} type={type} step={type === 'number' ? 'any' : undefined} onChange={e => set(key,e.target.value)}/></label>;
  return <div className="my-4 space-y-3">
    <section className="overflow-hidden rounded-xl border border-slate-200">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <h4 className="text-sm font-extrabold text-slate-900">Invoice Products <span className="font-normal text-slate-500">({data.itemList.length})</span></h4>
        {status === 'To Be Generated' && <button disabled={readOnly} type="button" className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-100" onClick={() => set('itemList',[...data.itemList,{}])}>+ Add product</button>}
      </div>
      {!data.itemList.length ? <p className="px-3 py-3 text-xs text-amber-800">No products were identified. Use Read details on the uploaded invoice to refresh extraction, or add the goods manually.</p> :
        <InvoiceProductsTable data={data} editable={status === 'To Be Generated' && !readOnly} updateRow={updateRow} removeRow={i => set('itemList',data.itemList.filter((_,n) => n !== i))} />}
    </section>
    {status === 'To Be Generated' && <Collapsible title="Invoice Totals"><div className="mt-3 grid gap-3 sm:grid-cols-3">{Object.entries(totals).map(([key,label]) => input(key,label,'number'))}</div></Collapsible>}
  </div>;
}

function Collapsible({title, children, defaultOpen = false}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)} className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left text-sm font-extrabold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-400">
      <span>{title}</span><span className="flex shrink-0 items-center gap-2 rounded-lg bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700">{open ? 'Hide' : 'Show'}<svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}><path d="m5 7 5 5 5-5"/></svg></span>
    </button>
    <div id={id} hidden={!open} className="border-t border-slate-100 p-4">{children}</div>
  </section>;
}

function InvoiceProductsTable({data,editable,updateRow,removeRow}) {
  const rates = data.taxTreatment === 'igst' ? [['igstRate','IGST (%)']] : data.taxTreatment === 'cgst_sgst' ? [['cgstRate','CGST (%)'],['sgstRate','SGST (%)']] : [];
  const columns = [
    {key:'productDesc',label:'Product / Description'},
    {key:'hsnCode',label:'HSN Code',width:100},
    {key:'quantity',label:'Qty',width:76,numeric:true},
    {key:'qtyUnit',label:'Unit',width:76},
    {key:'taxableAmount',label:'Taxable Value (₹)',width:126,numeric:true},
    ...(editable ? [...rates,...(!data.noCess ? [['cessRate','Cess (%)'],['cessNonAdvol','Cess / Unit (₹)']] : [])].map(([key,label]) => ({key,label,width:key === 'cessNonAdvol' ? 106 : 84,numeric:true})) : []),
  ];
  const cellInput = 'h-8 w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 py-1 text-xs text-slate-900 outline-none hover:border-slate-200 hover:bg-white focus:border-purple-400 focus:bg-white focus:ring-1 focus:ring-purple-200 disabled:bg-transparent';
  const minimumWidth = 260 + columns.reduce((sum,col) => sum + (col.width || 0),0) + (editable ? 38 : 0);
  return <div className="overflow-x-auto"><table className="w-full table-fixed border-collapse text-left text-xs" style={{minWidth:minimumWidth}}>
    <caption className="sr-only">Invoice products, quantities, taxable values and applicable tax rates</caption>
    <colgroup><col style={{width:34}}/>{columns.map(col => <col key={col.key} style={col.width ? {width:col.width} : undefined}/>)}{editable && <col style={{width:38}}/>}</colgroup>
    <thead className="border-b border-slate-200 bg-slate-50/60 text-slate-600"><tr>
      <th scope="col" className="px-2 py-2 text-center font-semibold">#</th>
      {columns.map(col => <th key={col.key} scope="col" className={`whitespace-nowrap px-2 py-2 font-semibold ${col.numeric ? 'text-right' : ''}`}>{col.label}</th>)}
      {editable && <th scope="col" className="px-1 py-2"><span className="sr-only">Actions</span></th>}
    </tr></thead>
    <tbody>{data.itemList.map((row,i) => <tr key={i} className="border-b border-slate-100 last:border-b-0 even:bg-slate-50/50 hover:bg-purple-50/30">
      <td className="px-2 py-1 text-center tabular-nums text-slate-400">{i+1}</td>
      {columns.map(col => <td key={col.key} className="px-1 py-0.5">
        {!editable ? <span title={String(row[col.key] ?? '')} className={`block truncate px-2 py-1 ${col.numeric ? 'text-right tabular-nums' : ''}`}>{row[col.key] ?? '—'}</span> : col.key === 'qtyUnit' ?
          <select aria-label={`Product ${i+1} unit`} className={cellInput} value={row[col.key] || ''} onChange={e => updateRow(i,col.key,e.target.value)}><option value="">Select</option>{NIC_UNITS.map(u => <option key={u}>{u}</option>)}</select> :
          <input aria-label={`Product ${i+1} ${col.label}`} title={String(row[col.key] ?? '')} className={`${cellInput} ${col.numeric ? 'text-right tabular-nums' : ''}`} inputMode={col.numeric ? 'decimal' : undefined} value={row[col.key] ?? ''} onChange={e => updateRow(i,col.key,e.target.value)}/>}
      </td>)}
      {editable && <td className="px-1 py-0.5 text-center"><button type="button" aria-label={`Remove product ${i+1}`} title="Remove product" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300" onClick={() => removeRow(i)}><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5"><path d="m6 6 8 8M14 6l-8 8"/></svg></button></td>}
    </tr>)}</tbody>
  </table></div>;
}
