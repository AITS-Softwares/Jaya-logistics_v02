"use client";
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiEye, FiX } from 'react-icons/fi';
import { Badge, PackingSummary } from '@/components/PdiUi';

export default function PdiInspectionPreview({ order, onClose }) {
  const dialog = useRef(null);
  const [data, setData] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => { dialog.current?.close(); previous?.focus?.(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError('');
    (async () => {
      try {
        const response = await fetch(`/api/pdi-panel?orderIds=${encodeURIComponent(order.orderPanelId)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, cache: 'no-store', signal: controller.signal });
        const body = await response.json();
        if (!response.ok || !body.success || !body.data?.[0]) throw new Error(body.message || 'PDI inspection is unavailable.');
        setData(body.data[0]);
      } catch (error) { if (error.name !== 'AbortError') setError(error.message); }
    })();
    return () => controller.abort();
  }, [order.orderPanelId]);
  return createPortal(<dialog ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }} aria-labelledby="pdi-preview-title" className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm">
    <div className="flex max-h-[90dvh] flex-col"><header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-600"><FiEye size={13} />PDI inspection · Read only</p><h2 id="pdi-preview-title" className="mt-2 text-lg font-bold text-slate-900">{data?.orderNo || order.order || 'Order'}</h2>{data && <p className="mt-1 text-xs text-slate-500">{data.partyName} · {data.branchName}</p>}</div><div className="flex items-center gap-3">{data && <Badge tone={data.status === 'Completed' ? 'green' : data.status === 'In Progress' ? 'yellow' : 'slate'}>{data.status}</Badge>}<button type="button" onClick={onClose} aria-label="Close PDI preview" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"><FiX size={18} /></button></div></header>
      <div className="min-h-0 flex-1 overflow-auto p-5">{error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : !data ? <p role="status" className="py-8 text-center text-sm text-slate-500">Loading PDI inspection…</p> : <><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><PackingSummary order={data} badges /><p className="text-xs text-slate-500">{data.inspectedBy ? `Inspected by ${data.inspectedBy}` : 'Not yet inspected'}{data.inspectedAt ? ` · ${new Date(data.inspectedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}` : ''}</p></div><div className="overflow-auto rounded-xl border border-yellow-300 bg-white"><table className="w-full min-w-[780px] text-left text-xs"><thead className="bg-yellow-400"><tr>{['Pack Type', 'Product', 'Ordered Qty', 'Packing Status', 'Available Qty', 'Shortfall'].map(label => <th key={label} className="px-3 py-3 font-extrabold uppercase tracking-wide text-slate-900">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{data.items.map(item => <tr key={item.materialId} className="even:bg-slate-50"><td className="px-3 py-3 text-slate-500">{item.packType}</td><td className="px-3 py-3 font-semibold">{item.productName}{item.needsReview && <span className="mt-1 block font-normal text-amber-700">Reinspection required</span>}</td><td className="px-3 py-3">{item.orderedQty} {item.unit}</td><td className="px-3 py-3"><Badge tone={item.packedStatus === 'Fully Packed' ? 'green' : item.packedStatus === 'Partially Packed' ? 'yellow' : item.packedStatus === 'Not Packed' ? 'red' : 'slate'}>{item.packedStatus || 'Pending'}</Badge></td><td className="px-3 py-3">{item.availableQty === '' ? '—' : `${item.availableQty} ${item.unit}`}</td><td className="px-3 py-3">{item.availableQty === '' ? '—' : item.orderedQty - item.availableQty}</td></tr>)}</tbody></table>{!data.items.length && <p className="p-4 text-sm text-slate-500">No material rows available.</p>}</div></>}</div>
      <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-5 py-3"><span className="text-xs text-slate-400">Vehicle Negotiation · Inspection preview</span><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Close preview</button></footer></div>
  </dialog>, document.body);
}
