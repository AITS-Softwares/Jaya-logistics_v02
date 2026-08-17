'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const Value = ({ label, value }) => <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-900">{value === null || value === undefined || value === '' ? '—' : String(value)}</dd></div>;

export default function OrderPanelViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/order-panel?id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load order details.');
        setOrder(data.data);
      } catch (loadError) { setError(loadError.message); }
    };
    if (id) load();
  }, [id]);

  if (!order && !error) return <div className="p-8 text-sm text-slate-500">Loading order details…</div>;
  return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-7xl">
    <button type="button" onClick={() => router.back()} className="mb-4 text-sm font-semibold text-indigo-600">← Back to list</button>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {order && <>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-xl font-extrabold text-slate-900">Order: {order.orderPanelNo}</h1><p className="mt-1 text-sm text-slate-500">Read-only order details</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{order.panelStatus}</span></div><dl className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4"><Value label="Date" value={order.date ? new Date(order.date).toLocaleDateString('en-GB') : ''}/><Value label="Branch" value={order.branchName}/><Value label="Sub-company" value={order.subCompanyName}/><Value label="Party" value={order.partyName}/><Value label="Customer code" value={order.customerCode}/><Value label="Contact person" value={order.contactPerson}/><Value label="Delivery" value={order.delivery}/><Value label="Total weight" value={`${order.totalWeight || 0} kg`}/></dl></section>
      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white"><h2 className="border-b border-slate-200 px-5 py-4 font-bold text-slate-900">Plant / Route rows</h2><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Plant</th><th className="px-4 py-3">Order type</th><th className="px-4 py-3">From</th><th className="px-4 py-3">To</th><th className="px-4 py-3">Weight</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{(order.plantRows || []).map((row) => <tr key={row._id} className="border-t border-slate-100"><td className="px-4 py-3 font-medium">{row.plantName || '—'}{row.plantCodeValue ? ` (${row.plantCodeValue})` : ''}</td><td className="px-4 py-3">{row.orderType || '—'}</td><td className="px-4 py-3">{row.fromName || row.from || '—'}</td><td className="px-4 py-3">{row.toName || row.to || '—'}</td><td className="px-4 py-3">{row.weight || 0} kg</td><td className="px-4 py-3">{row.status || '—'}</td></tr>)}{!(order.plantRows || []).length && <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">No plant / route rows found.</td></tr>}</tbody></table></div></section>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-900">Charges</h2><dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4"><Value label="Collection" value={order.collectionCharges}/><Value label="Cancellation" value={order.cancellationCharges}/><Value label="Loading" value={order.loadingCharges}/><Value label="Other" value={order.otherCharges}/></dl></section>
    </>}
  </div></div>;
}
