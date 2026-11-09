'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PackingSummary, dateLabel, inputClass } from '@/components/PdiUi';
import { usePermission } from '../../hooks/usePermission';
import { PACKED_STATUSES } from '@/lib/pdiRules.mjs';
export default function Inspection({ params }) {
  const { id } = use(params); const router = useRouter(); const { loading, canView, canEdit } = usePermission();
  const [data, setData] = useState(null), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const allowed = canView('PDI Panel');
  useEffect(() => { if (loading || !allowed) return; const controller = new AbortController(); setError('');
    fetch(`/api/pdi-panel?orderId=${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, signal: controller.signal }).then(r => r.json()).then(body => { if (!body.success) throw new Error(body.message); setData(body.data); }).catch(e => { if (e.name !== 'AbortError') setError(e.message); }); return () => controller.abort();
  }, [id, loading, allowed]);
  function change(index, values) { setData(old => ({ ...old, items: old.items.map((item, i) => i === index ? { ...item, ...values, dirty: true } : item) })); }
  async function save() {
    setBusy(true); setError(''); setMessage('');
    try {
      const items = data.items.filter(item => item.dirty);
      if (!items.length) throw new Error('Enter at least one inspection.');
      if (items.some(item => !item.packedStatus || String(item.availableQty).trim() === '' || !Number.isFinite(Number(item.availableQty)))) throw new Error('Each started row needs a status and numeric quantity.');
      const response = await fetch('/api/pdi-panel', { method: 'PATCH', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: id, revision: data.revision, items: items.map(item => ({ materialId: item.materialId, packedStatus: item.packedStatus, availableQty: Number(item.availableQty) })) }) });
      const body = await response.json(); if (!body.success) throw new Error(body.message); setData(body.data); setMessage(`${body.data.orderNo} PDI saved`); setTimeout(() => router.push('/admin/pdi-panel'), 900);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (loading) return <p className="p-6">Loading permissions…</p>;
  if (!allowed) return <p className="p-6">PDI view permission required.</p>;
  const editable = canEdit('PDI Panel') && data?.editable;
  const routes = data?.routes || [];
  const joined = key => [...new Set(routes.map(route => route[key]).filter(Boolean))].join(', ') || '—';
  const details = data ? [['Order No', data.orderNo], ['Date', dateLabel(data.date)], ['Branch', `${data.branchName || '—'}${data.branchCode ? ` (${data.branchCode})` : ''}`], ['Party', data.partyName], ['Plant', routes.map(route => `${route.plantName || '—'}${route.plantCode ? ` (${route.plantCode})` : ''}`).join(', ') || '—'], ['Delivery To', [joined('to'), joined('district')].filter(value => value !== '—').join(', ') || '—'], ['State / Pin', `${joined('state')} · ${joined('pin')}`], ['Total Weight', `${data.totalWeight ?? 0} MT`]] : [];
  const packageUnits = data?.items.every(item => item.unit === 'Pkgs');
  const headings = ['S.No', 'Pack Type', 'Product Name', packageUnits ? 'Ordered Qty (Pkgs)' : 'Ordered Qty', 'Weight (MT)', 'Material Packed Status', packageUnits ? 'Available Qty (Pkgs)' : 'Available Qty', 'Shortfall'];
  const td = 'border border-yellow-300 px-2 py-2';
  return <div className="min-h-full min-w-0 bg-gradient-to-br from-slate-50 to-white text-slate-800">
    <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur"><div className="flex items-center justify-between gap-3 px-4 py-3"><div className="flex items-center gap-3"><Link href="/admin/pdi-panel" className="text-sm font-medium text-sky-600 hover:text-sky-800">← Back to List</Link><div className="text-lg font-extrabold text-slate-900">PDI: {data?.orderNo || '…'}</div></div>{editable && <button onClick={save} disabled={busy} className="rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50">{busy ? 'Saving…' : 'Save PDI'}</button>}</div></div>
    <div className="space-y-4 p-4">{data ? <><div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-4 py-3 text-sm font-extrabold text-slate-900">Order Details</div><div className="grid grid-cols-2 gap-4 p-4 text-sm md:grid-cols-4">{details.map(([label, value]) => <div key={label}><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className="font-semibold text-slate-900">{value || '—'}</div></div>)}</div></div>
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3"><div className="text-sm font-extrabold text-slate-900">Product-wise Inspection</div><PackingSummary order={data} badges /></div>
    <div className="p-4"><div className="overflow-auto rounded-xl border border-yellow-300"><table className="min-w-max w-full text-sm"><thead className="bg-yellow-400"><tr>{headings.map((heading, index) => <th key={heading} className={`border border-yellow-500 px-3 py-3 text-center text-xs font-extrabold text-slate-900 ${index === 5 || index === 6 ? 'bg-yellow-300' : ''}`}>{heading}</th>)}</tr></thead><tbody>{data.items.map((item, index) => {
      const shortfall = item.orderedQty - Number(item.availableQty);
      return <tr key={item.materialId} className="even:bg-slate-50 hover:bg-yellow-50"><td className={`${td} text-center`}>{index + 1}</td><td className={`${td} bg-yellow-50 text-center font-semibold`}>{({ 'UNIFORM - BAGS/BOXES': 'Uniform - Bags/Boxes', PALLETIZATION: 'Palletization', 'LOOSE - CARGO': 'Loose - Cargo', 'NON-UNIFORM - GENERAL CARGO': 'Non-Uniform - General Cargo' })[item.packType] || item.packType}</td><td className={`${td} font-medium`}>{item.productName}{item.needsReview && <span className="block text-xs text-amber-700">Order changed — inspect again</span>}</td><td className={`${td} text-right font-semibold`}>{item.orderedQty}{item.unit !== 'Pkgs' ? ` ${item.unit}` : ''}</td><td className={`${td} text-right`}>{Number(item.chargedWt ?? item.actualWt ?? 0).toFixed(3)}</td>
      <td className={`${td} bg-yellow-50/60`}><select aria-label={`Packing status for ${item.productName}`} disabled={!editable || !item.editable || busy} value={item.packedStatus} onChange={e => change(index, { packedStatus: e.target.value, availableQty: e.target.value === 'Fully Packed' ? item.orderedQty : e.target.value === 'Not Packed' ? 0 : '' })} className={`${inputClass} w-44`}><option value="">Select status</option>{PACKED_STATUSES.map(status => <option key={status}>{status}</option>)}</select></td>
      <td className={`${td} bg-yellow-50/60`}><input aria-label={`Available quantity for ${item.productName}`} type="text" inputMode="decimal" placeholder="0" disabled={!editable || !item.editable || busy} value={item.availableQty} onChange={e => change(index, { availableQty: e.target.value })} className={`${inputClass} w-28 disabled:bg-slate-100`} /></td><td className={`${td} text-center`}>{String(item.availableQty).trim() === '' ? '—' : <b className={shortfall > 0 || !Number.isFinite(shortfall) || shortfall < 0 ? 'text-red-600' : 'text-green-700'}>{Number.isFinite(shortfall) ? shortfall : '—'}</b>}</td></tr>;
    })}</tbody></table></div></div></div>{!editable && <p className="text-sm text-slate-500">Read only. Editing requires PDI edit permission and an approved, open order.</p>}</> : !error && <p className="text-sm text-slate-500">Loading inspection…</p>}</div>
    {(error || message) && <div role={error ? 'alert' : 'status'} className="fixed bottom-6 right-6 z-[70] max-w-md rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">{error || message}</div>}
  </div>;
}
