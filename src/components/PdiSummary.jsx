'use client';
import { useEffect, useState } from 'react';
export default function PdiSummary({ orderId }) {
  const [data, setData] = useState(null), [error, setError] = useState('');
  useEffect(() => { if (!orderId) return; const controller = new AbortController(); setData(null); setError('');
    fetch(`/api/pdi-panel?orderIds=${encodeURIComponent(orderId)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, signal: controller.signal }).then(r => r.json()).then(body => { if (!body.success) throw new Error(body.message); setData(body.data[0] || null); }).catch(e => { if (e.name !== 'AbortError') setError('PDI unavailable'); }); return () => controller.abort();
  }, [orderId]);
  if (!orderId) return null;
  return <div className="my-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"><strong>PDI: {error || data?.status || 'Loading…'}</strong>{data && <><span className="ml-2">{['Fully Packed', 'Partially Packed', 'Not Packed'].map(s => `${data.items.filter(i => i.packedStatus === s).length} ${s}`).join(' · ')}</span><details className="mt-1"><summary className="cursor-pointer">Inspection details</summary><p className="my-1">{data.inspectedBy || 'Not inspected'} {data.inspectedAt ? new Date(data.inspectedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''}</p>{data.items.map(i => <p key={i.materialId} className="py-1">{i.packType} · {i.productName}: {i.packedStatus || 'Pending'} · Available {i.availableQty === '' ? '—' : i.availableQty}/{i.orderedQty} {i.unit}{i.needsReview ? ' · Reinspection required' : ''}</p>)}</details></>}</div>;
}
