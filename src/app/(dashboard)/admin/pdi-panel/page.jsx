'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PdiPlantCell } from '@/components/PdiRouteCells';
import AwaitingVnnOrders from '@/components/AwaitingVnnOrders';
import { FiClock, FiClipboard } from 'react-icons/fi';
import { Badge, PackingSummary, dateLabel } from '@/components/PdiUi';
import { usePermission } from '../hooks/usePermission';
export default function PdiList() {
  const { loading, canView } = usePermission(); const [orders, setOrders] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState(true);
  const [activeTab, setActiveTab] = useState('inspections');
  const allowed = canView('PDI Panel');
  useEffect(() => {
    if (loading || !allowed || activeTab !== 'inspections') return;
    const controller = new AbortController(); let pending = false;
    const load = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const response = await fetch('/api/pdi-panel', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, signal: controller.signal, cache: 'no-store' });
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.message || 'Unable to load inspections.');
        if (!controller.signal.aborted) { setOrders(body.data); setError(''); }
      } catch (error) { if (!controller.signal.aborted) setError(error.message); }
      finally { pending = false; if (!controller.signal.aborted) setBusy(false); }
    };
    load(); const timer = setInterval(load, 30000); document.addEventListener('visibilitychange', load);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', load); };
  }, [loading, allowed, activeTab]);
  if (loading) return <p className="p-6">Loading permissions…</p>;
  if (!allowed) return <p className="p-6">PDI view permission required.</p>;
  const headings = ['S.No', 'Order No', 'Date', 'Branch', 'Sub-Company', 'Party Name', 'Plant', 'From → To', 'Weight', 'Status', 'Approver Status', 'PDI Status', 'Products Inspected', 'Action'];
  return <div className="min-h-full min-w-0 bg-gradient-to-br from-slate-50 to-white text-slate-800">
    <div className="border-b bg-white/80 px-6 py-4 backdrop-blur"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-extrabold text-slate-900">PDI Panel</h2><p className="mt-1 text-sm text-slate-600">Pre-Dispatch Inspection: record product-wise packing status and available quantity before vehicle negotiation</p></div></div></div>
    <div className="mx-4 mt-5 sm:mx-6"><div role="tablist" aria-label="PDI lists" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1.5" onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 'inspections' : event.key === 'End' ? 'awaiting' : activeTab === 'inspections' ? 'awaiting' : 'inspections';
      setActiveTab(next); document.getElementById(next === 'awaiting' ? 'awaiting-orders-tab' : 'pdi-inspections-tab')?.focus();
    }}>{[{ key: 'inspections', id: 'pdi-inspections-tab', panel: 'pdi-inspections-panel', label: 'PDI Inspections', Icon: FiClipboard }, { key: 'awaiting', id: 'awaiting-orders-tab', panel: 'awaiting-orders-panel', label: 'Awaiting Order Approval', Icon: FiClock }].map(({ key, id, panel, label, Icon }) => <button key={key} id={id} type="button" role="tab" aria-selected={activeTab === key} aria-controls={panel} tabIndex={activeTab === key ? 0 : -1} onClick={() => setActiveTab(key)} className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 ${activeTab === key ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60' : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'}`}><Icon size={15} className={activeTab === key ? 'text-amber-600' : 'text-slate-400'} />{label}{activeTab === key && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber-500" />}</button>)}</div></div>
    {activeTab === 'awaiting' && <AwaitingVnnOrders endpoint="/api/pdi-panel/awaiting-orders" previewEndpoint="/api/pdi-panel/order-view" description="Review upcoming orders before approval. PDI inspection becomes available once the order is approved." />}

    <div id="pdi-inspections-panel" role="tabpanel" aria-labelledby="pdi-inspections-tab" hidden={activeTab !== 'inspections'} className="p-6"><div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">{[['Pending', 'Pending PDI', 'text-slate-900'], ['In Progress', 'In Progress', 'text-yellow-700'], ['Completed', 'Completed', 'text-green-700']].map(([status, label, color]) => <div key={status} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className={`mt-1 text-2xl font-extrabold ${color}`}>{orders.filter(order => order.status === status).length}</div></div>)}</div>
    {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-[1500px] w-full text-sm"><thead className="border-b border-yellow-500 bg-yellow-400"><tr>{headings.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-slate-900">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{orders.map((order, index) => {
      const routes = order.routes || [];
      const statuses = [...new Set(routes.map(route => route.status))];
      const status = statuses.length === 1 ? statuses[0] : statuses.length > 1 ? 'Mixed' : 'Open';
      return <tr key={order.orderId} className="hover:bg-yellow-50"><td className="px-4 py-3 text-slate-600">{index + 1}</td><td className="px-4 py-3"><Link href={`/admin/pdi-panel/${order.orderId}`} className="font-semibold text-slate-900 hover:text-indigo-700 hover:underline">{order.orderNo}</Link></td><td className="px-4 py-3 text-slate-600">{dateLabel(order.date)}</td>
      <td className="px-4 py-3"><div className="font-medium">{order.branchName || '—'}</div><div className="text-xs text-slate-500">{order.branchCode}</div></td><td className="px-4 py-3"><div className="font-medium">{order.subCompanyName || '—'}</div><div className="text-xs text-slate-500">{order.subCompanyCode}</div></td><td className="px-4 py-3 font-medium">{order.partyName}</td>
      <td className="px-4 py-3"><PdiPlantCell routes={routes} /></td><td className="px-4 py-3">{routes.map((route, i) => <div key={i}><span className="text-slate-400">{route.from || '—'}</span> <span className="mx-1 text-slate-400">→</span> <b>{route.to || '—'}</b><div className="text-xs text-slate-500">{[route.district, route.state].filter(Boolean).join(', ')}{route.pin ? ` (${route.pin})` : ''}</div></div>)}</td><td className="px-4 py-3 font-medium">{order.totalWeight ?? 0} MT</td>
      <td className="px-4 py-3"><Badge tone={status === 'Open' ? 'green' : status === 'Cancelled' ? 'red' : 'yellow'}>{status}</Badge></td><td className="px-4 py-3"><Badge tone="green">{order.panelStatus || '—'}</Badge></td><td className="px-4 py-3"><Badge tone={order.status === 'Completed' ? 'green' : order.status === 'In Progress' ? 'yellow' : 'slate'}>{order.status}</Badge></td><td className="px-4 py-3"><PackingSummary order={order} /></td>
      <td className="px-4 py-3"><Link href={`/admin/pdi-panel/${order.orderId}`} className="inline-block rounded-xl bg-yellow-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-yellow-700">{order.status === 'Pending' ? 'Start PDI' : 'Open PDI'}</Link></td></tr>;
    })}{busy && <tr><td colSpan={headings.length} className="px-4 py-6 text-center text-slate-500">Loading inspections…</td></tr>}{!busy && !orders.length && <tr><td colSpan={headings.length} className="px-4 py-6 text-center text-slate-500">No approved orders found.</td></tr>}</tbody></table></div><div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Showing {orders.length} of {orders.length} order(s)</div></div></div>
  </div>;
}
