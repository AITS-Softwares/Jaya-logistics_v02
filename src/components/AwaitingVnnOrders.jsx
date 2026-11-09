'use client';
import { useCallback, useEffect, useState } from 'react';
import AwaitingOrderView, { orderDate, orderWeight } from '@/components/AwaitingOrderView';
import { FiArrowRight, FiCheckCircle, FiClock, FiEye, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi';
import { destinationLabel } from '@/lib/destination.mjs';

export default function AwaitingVnnOrders({ endpoint = '/api/vehicle-negotiation/awaiting-orders', previewEndpoint, description = 'Review upcoming orders before approval. Negotiation creation becomes available once approved.' }) {
  const [selectedId, setSelectedId] = useState(null);
  const closeView = useCallback(() => setSelectedId(null), []);
  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const load = async () => {
      if (pending || document.hidden) return;
      pending = true; setBusy(true);
      try {
        const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, cache: 'no-store', signal: controller.signal });
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.message || 'Unable to load submitted orders.');
        if (!controller.signal.aborted) { setOrders(body.data || []); setError(''); }
      } catch (err) { if (!controller.signal.aborted) { setError(err.message); setOrders([]); } }
      finally { pending = false; if (!controller.signal.aborted) setBusy(false); }
    };
    load(); const timer = setInterval(load, 30000);
    document.addEventListener('visibilitychange', load);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', load); };
  }, [refresh, endpoint]);
  const term = search.trim().toLowerCase();
  const filtered = orders.filter(order => [order.orderNo, order.customer, order.branch, ...(order.rows || []).flatMap(row => [row.fromName, destinationLabel(row), row.plantName])].join(' ').toLowerCase().includes(term));
  const selected = orders.find(order => order.id === selectedId);
  const control = 'inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none';
  return <section id="awaiting-orders-panel" role="tabpanel" aria-labelledby="awaiting-orders-tab" className="mx-4 my-5 space-y-4 sm:mx-6">
    {selected && <AwaitingOrderView previewEndpoint={previewEndpoint} order={selected} onClose={closeView} />}
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100"><FiClock size={19} /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-bold tracking-tight text-slate-900">Awaiting Order Approval</h2><span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">{orders.length}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div></div>
        <button type="button" disabled={busy} onClick={() => setRefresh(value => value + 1)} className={`${control} border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm`}><FiRefreshCw size={14} className={busy ? 'animate-spin motion-reduce:animate-none' : ''} />{busy ? 'Refreshing' : 'Refresh'}</button>
      </div>
      <div className="relative mt-5 max-w-xl"><FiSearch size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label="Search awaiting orders" placeholder="Search by order, customer, branch or location…" value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-100" />{search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"><FiX size={14} /></button>}</div>
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-busy={busy}>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-yellow-400 text-slate-900"><tr>{['S.No', 'Date', 'Order No', 'Customer / Party', 'Branch', 'Destination', 'Weight', 'Status', 'Actions'].map(label => <th scope="col" key={label} className={`whitespace-nowrap px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wide ${label === 'Actions' ? 'text-right' : ''}`}>{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {busy && !orders.length ? Array.from({ length: 3 }, (_, index) => <tr key={index} aria-hidden="true">{Array.from({ length: 9 }, (_, cell) => <td key={cell} className="px-4 py-5"><div className="h-3 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" /></td>)}</tr>) : filtered.map((order, index) => {
            const destinations = [...new Set(order.rows.map(row => destinationLabel(row)).filter(value => value !== '—'))];
            return <tr key={order.id} className="group transition-colors hover:bg-yellow-50/50">
              <td className="px-4 py-4 text-xs text-slate-400">{String(index + 1).padStart(2, '0')}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{orderDate(order.date)}</td>
              <td className="px-4 py-4"><button type="button" onClick={() => setSelectedId(order.id)} title="View order details" className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900 ring-1 ring-inset ring-blue-100 transition hover:bg-blue-100 hover:ring-blue-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><FiEye size={13} />{order.orderNo}</button></td>
              <td className="min-w-[180px] px-4 py-4"><p className="font-semibold text-slate-800">{order.customer || '—'}</p><p className="mt-1 text-[11px] text-slate-400">{order.rows.length} route{order.rows.length === 1 ? '' : 's'}</p></td><td className="px-4 py-4 text-xs text-slate-600">{order.branch || '—'}</td>
              <td className="max-w-[240px] px-4 py-4 text-xs leading-5 text-slate-600"><span className="line-clamp-2" title={destinations.join(', ')}>{destinations.join(', ') || '—'}</span></td><td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums text-slate-800">{orderWeight(order.rows)} <span className="text-[10px] font-medium text-slate-400">MT</span></td>
              <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200/70"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Awaiting approval</span></td>
              <td className="px-4 py-4 text-right"><button type="button" aria-label={`View order ${order.orderNo}`} onClick={() => setSelectedId(order.id)} className={`${control} whitespace-nowrap border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-yellow-50 hover:text-amber-900 hover:shadow-sm`}><FiEye size={14} />View<FiArrowRight size={13} className="text-slate-400" /></button></td>
            </tr>;
          })}
          {!busy && !error && !filtered.length && <tr><td colSpan={9} className="px-6 py-14 text-center"><FiCheckCircle size={28} className="mx-auto mb-3 text-slate-300" /><p className="text-sm font-semibold text-slate-700">{term ? 'No matching orders' : 'No orders awaiting approval'}</p><p className="mt-1 text-xs text-slate-400">{term ? 'Try another order number, customer or location.' : 'Submitted orders will appear here for early review.'}</p>{term && <button type="button" onClick={() => setSearch('')} className="mt-4 text-xs font-semibold text-amber-700 hover:underline">Clear search</button>}</td></tr>}
        </tbody>
      </table></div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-[11px] text-slate-500"><span role="status">{busy && !orders.length ? 'Loading orders…' : `${filtered.length} of ${orders.length} order${orders.length === 1 ? '' : 's'}`}</span><span className="inline-flex items-center gap-1.5"><FiEye size={12} />Read-only preview</span></div>
    </div>
  </section>;
}
