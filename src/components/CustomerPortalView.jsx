"use client";

import { useEffect, useRef, useState } from 'react';
import CustomerTrackingPanel from '@/components/CustomerTrackingPanel';
import { FiArrowRight, FiBox, FiCheckCircle, FiChevronLeft, FiChevronRight, FiClipboard, FiClock, FiLayers, FiLogOut, FiMapPin, FiMenu, FiRefreshCw, FiSearch, FiShield, FiTruck, FiX } from 'react-icons/fi';

const dateLabel = value => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const weightLabel = value => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const statusStyles = {
  Open: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Completed: 'bg-blue-50 text-blue-700 ring-blue-200',
  Cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
  Hold: 'bg-amber-50 text-amber-800 ring-amber-200',
};
function Status({ value }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[value] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{value}</span>;
}
function orderVehicleRow(order) {
  const vehicles = new Map();
  for (const row of order.rows) for (const vehicle of row.vehicles) {
    const key = String(vehicle.vehicleNo || '').replace(/\s/g, '').toUpperCase();
    const existing = vehicles.get(key);
    if (!existing || (!existing.dispatchId && vehicle.dispatchId)) vehicles.set(key, vehicle);
  }
  return { vehicles: [...vehicles.values()] };
}

function Vehicles({ row, onTrack }) {
  return row.vehicles.length ? <div className="space-y-2">{row.vehicles.map(vehicle => <div key={vehicle.dispatchId || vehicle.assignmentId} className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700"><FiTruck className="text-slate-400" />{vehicle.vehicleNo}</span><button type="button" disabled={!onTrack || !vehicle.dispatchId} onClick={() => onTrack?.(vehicle.dispatchId)} title={vehicle.dispatchId ? "Check vehicle tracking" : "Tracking starts after Loading Info and an active trip"} className="inline-flex disabled:cursor-not-allowed hover:bg-blue-50 hover:text-blue-700 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-400"><FiMapPin />Track</button></div>)}</div> : <span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><FiClock className="shrink-0" />Awaiting assignment</span>;
}

function OrderDetails({ order, onClose }) {
  const dialogRef = useRef(null);
  const [trackingDispatch, setTrackingDispatch] = useState(order.initialTrackingDispatch || null);
  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.focus();
    function keydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const items = [...dialogRef.current.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')];
        const first = items[0], last = items[items.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { event.preventDefault(); first.focus(); }
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [onClose]);
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="customer-order-title" className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl outline-none">
      <div className="flex items-start justify-between gap-4 border-b border-yellow-300 bg-yellow-400 px-6 py-5"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-yellow-900">Order details</p><h2 id="customer-order-title" className="mt-1 break-all text-xl font-extrabold text-slate-950">{order.orderNo}</h2><p className="mt-1 text-xs text-slate-700">{dateLabel(order.date)} · {order.operatingCompany}</p></div><button type="button" onClick={onClose} aria-label="Close order details" className="rounded-lg bg-white/50 p-2 text-slate-900 hover:bg-white"><FiX size={20} /></button></div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-4"><Status value={order.status} /><p className="text-sm text-slate-500">Total weight <strong className="ml-2 text-slate-900">{weightLabel(order.totalWeight)} MT</strong></p></div>
      <dl className="grid grid-cols-2 gap-4 border-b border-slate-100 bg-slate-50 px-6 py-5 sm:grid-cols-4">{[['Operating company', order.operatingCompany], ['Branch', order.branch], ['Delivery service', order.delivery], ['Approved on', order.approvedAt ? dateLabel(order.approvedAt) : 'Not recorded']].map(([label,value]) => <div key={label}><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{value || 'Not recorded'}</dd></div>)}</dl>
      <div className="space-y-4 p-6">{order.rows.map((row, index) => <article key={row.id} className="overflow-hidden rounded-xl border border-slate-200"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3"><div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Drop {String(index + 1).padStart(2, '0')}</span><p className="text-sm font-semibold text-slate-700">{row.plant || 'Delivery route'}</p></div><Status value={row.status} /></div><div className="p-4"><div className="flex items-center gap-3"><FiMapPin className="shrink-0 text-amber-500" /><p className="text-sm font-semibold text-slate-900">{row.from || '—'} <span className="mx-1 font-normal text-slate-400">→</span> {row.to || '—'}</p></div><div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-slate-200 pt-4"><Vehicles row={row} onTrack={setTrackingDispatch} /><span className="text-sm font-semibold text-slate-700">{weightLabel(row.weight)} MT</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">{[['Plant code', row.plantCode], ['Order type', row.orderType], ['Taluka', row.destination?.taluka], ['District', row.destination?.district], ['State', row.destination?.state], ['PIN code', row.destination?.pinCode]].map(([label,value]) => <div key={label}><dt className="text-slate-400">{label}</dt><dd className="mt-1 font-medium text-slate-700">{value || 'Not recorded'}</dd></div>)}</dl>{trackingDispatch && row.vehicles.some(vehicle => vehicle.dispatchId === trackingDispatch) && <CustomerTrackingPanel orderId={order.id} dispatchId={trackingDispatch} />}</div></article>)}</div>
    </section>
  </div>;
}

export default function CustomerPortalView({ session, orders, page, pages, total, search, loading, error, selected, detailLoading, onSearch, onRefresh, onPrevious, onNext, onViewOrder, onCloseDetails, onSignOut }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const weight = orders.reduce((sum, order) => sum + order.totalWeight, 0);
  const assigned = orders.filter(order => orderVehicleRow(order).vehicles.length > 0).length;
  const initials = (session?.customerName || 'Customer').split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = event => { if (event.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sidebarOpen]);

  return <div className="min-h-screen bg-[#f8fafc] text-slate-900">
    {sidebarOpen && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    <aside id="customer-navigation" className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-[#1e293b] text-white transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-24 shrink-0 items-center gap-3 border-b border-white/10 bg-[#0f172a] px-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400 text-lg font-black tracking-tight text-slate-950">JG</span><div><p className="text-base font-extrabold tracking-wider">JAYA GROUP</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Customer portal</p></div><button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" className="ml-auto p-1 text-slate-300 lg:hidden"><FiX /></button></div>
      <div className="px-4 py-7"><p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Your workspace</p><nav aria-label="Customer navigation"><a href="/customer-dashboard" aria-current="page" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm"><FiClipboard size={18} />My Orders<FiChevronRight className="ml-auto" /></a></nav></div>
      <div className="mx-4 rounded-xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-200"><FiShield className="text-yellow-400" />Your customer workspace</div><p className="mt-2 text-xs leading-relaxed text-slate-400">Your orders and vehicle assignments, together in one place.</p></div>
      <div className="mt-auto border-t border-white/10 p-4"><div className="mb-4 flex items-center gap-3 rounded-xl bg-white/5 p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-xs font-bold text-yellow-300">{initials}</span><div className="min-w-0"><p className="truncate text-xs font-semibold text-white" title={session?.customerName}>{session?.customerName || 'Customer account'}</p><p className="mt-1 truncate text-[11px] text-slate-400">{session?.name || 'Signed in securely'}</p></div></div><button type="button" onClick={onSignOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"><FiLogOut size={17} />Sign out</button></div>
    </aside>

    <div className="min-w-0 lg:pl-64">
      <header className="sticky top-0 z-30 flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-7"><div className="flex min-w-0 items-center gap-3"><button type="button" aria-label="Open navigation" aria-expanded={sidebarOpen} aria-controls="customer-navigation" onClick={() => setSidebarOpen(true)} className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden"><FiMenu size={20} /></button><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Customer portal <span className="mx-2 text-slate-300">/</span> Orders</p><p className="mt-1 text-sm font-semibold text-slate-700">{session?.customerName || 'Your customer workspace'}</p></div></div><div className="flex items-center gap-3"><span className="hidden items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 sm:inline-flex"><FiCheckCircle />Customer account</span><span className="flex h-9 w-9 items-center justify-center rounded-full border border-yellow-200 bg-yellow-50 text-xs font-bold text-yellow-800">{initials}</span></div></header>

      <main className="mx-auto max-w-[1600px] p-4 sm:p-7 xl:p-8">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700"><span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />Order management</div><h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">My Orders</h1><p className="mt-2 text-sm text-slate-500">View your routes, shipment weights and assigned vehicles.</p></div><button type="button" disabled={loading || !session} onClick={onRefresh} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-yellow-400 hover:bg-yellow-50 disabled:opacity-40"><FiRefreshCw className={loading ? 'animate-spin' : ''} />Refresh orders</button></div>
        {error && <p role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}

        <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">{[
          { label: search ? 'Matching orders' : 'Total orders', value: total, note: search ? 'For your search' : 'Across your assigned companies', icon: FiClipboard, color: 'bg-yellow-50 text-amber-600' },
          { label: 'Shipment weight', value: `${weightLabel(weight)} MT`, note: 'On this page', icon: FiLayers, color: 'bg-blue-50 text-blue-600' },
          { label: 'Orders with a vehicle', value: assigned, note: 'On this page', icon: FiTruck, color: 'bg-emerald-50 text-emerald-600' },
        ].map(item => <div key={item.label} className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${item.color}`}><item.icon size={22} /></span><div className="min-w-0"><p className="text-[11px] font-semibold text-slate-500">{item.label}</p><p className="mt-1 break-words text-xl font-extrabold tracking-tight text-slate-900">{loading ? '—' : item.value}</p><p className="mt-1 text-[10px] text-slate-400">{item.note}</p></div></div>)}</div>

        <section aria-label="Customer orders" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><FiBox size={18} /></span><div><h2 className="text-sm font-bold text-slate-900">Order register</h2><p className="mt-0.5 text-[11px] text-slate-400">Your shipment details at a glance</p></div></div><label className="relative block w-full sm:w-72"><span className="sr-only">Search order number</span><FiSearch aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => onSearch(event.target.value)} placeholder="Search order number…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-100" /></label></div>

          <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[920px] text-left text-xs"><thead className="bg-yellow-400 text-slate-950"><tr>{['Order / Date', 'Company', 'From → To', 'Weight', 'Vehicle', 'Status', 'Tracking', 'Details'].map((label, index) => <th key={index} className="whitespace-nowrap px-5 py-4 text-[10px] font-extrabold uppercase tracking-wider">{label}</th>)}</tr></thead><tbody>
            {loading ? Array.from({ length: 4 }, (_, index) => <tr key={index} aria-hidden="true" className="border-t border-slate-100">{Array.from({ length: 8 }, (_, cell) => <td key={cell} className="px-5 py-7"><div className="h-3 animate-pulse rounded bg-slate-100" /></td>)}</tr>) : orders.map(order => <tr key={order.id} className="border-b border-slate-100 align-top transition last:border-0 hover:bg-yellow-50/40"><td className="px-5 py-5"><span className="whitespace-nowrap font-bold text-slate-900">{order.orderNo}</span><p className="mt-2 text-[10px] text-slate-400">{dateLabel(order.date)}</p></td><td className="max-w-40 px-5 py-5 font-medium leading-relaxed text-slate-600">{order.operatingCompany}</td><td className="min-w-48 px-5 py-5"><div className="space-y-3">{order.rows.map(row => <div key={row.id} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" /><span className="leading-relaxed text-slate-600">{row.from || '—'} <span className="mx-1 text-slate-300">→</span> {row.to || '—'}</span></div>)}</div></td><td className="whitespace-nowrap px-5 py-5 font-semibold text-slate-700">{weightLabel(order.totalWeight)} <span className="text-[10px] font-normal text-slate-400">MT</span></td><td className="min-w-48 px-5 py-5"><Vehicles row={orderVehicleRow(order)} /></td><td className="px-5 py-5"><Status value={order.status} /></td><td className="px-5 py-5"><button type="button" disabled={detailLoading || !order.rows.some(row => row.vehicles.some(vehicle => vehicle.dispatchId))} onClick={() => onViewOrder(order.id, order.rows.flatMap(row => row.vehicles).find(vehicle => vehicle.dispatchId)?.dispatchId)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><FiMapPin />Track</button>{!order.rows.some(row => row.vehicles.some(vehicle => vehicle.dispatchId)) && <p className="mt-1 text-[10px] text-slate-400">No tracked dispatch yet</p>}</td><td className="px-5 py-5"><button type="button" onClick={() => onViewOrder(order.id)} disabled={detailLoading} aria-label={`View order ${order.orderNo}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-yellow-400 hover:bg-yellow-50 hover:text-slate-950 disabled:opacity-40">View<FiChevronRight /></button></td></tr>)}
          </tbody></table></div>

          <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-3 md:hidden">{loading ? <p role="status" className="p-6 text-center text-sm text-slate-500">Loading orders…</p> : orders.map(order => <article key={order.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="break-all text-xs font-bold text-slate-900">{order.orderNo}</h3><p className="mt-1 text-[10px] text-slate-400">{dateLabel(order.date)} · {order.operatingCompany}</p></div><Status value={order.status} /></div><div className="my-4 space-y-4">{order.rows.map(row => <div key={row.id}><p className="mb-2 flex items-start gap-2 text-xs font-medium text-slate-700"><FiMapPin className="mt-0.5 shrink-0 text-amber-500" />{row.from || '—'} → {row.to || '—'}</p></div>)}</div><div className="mb-4"><Vehicles row={orderVehicleRow(order)} onTrack={dispatchId => onViewOrder(order.id, dispatchId)} /></div><div className="flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-xs font-bold text-slate-700">{weightLabel(order.totalWeight)} MT</span><button disabled={detailLoading} onClick={() => onViewOrder(order.id)} className="inline-flex items-center gap-1 rounded-lg bg-yellow-400 px-3 py-2 text-[11px] font-bold text-slate-950 disabled:opacity-40">View details<FiArrowRight /></button></div></article>)}</div>

          {!loading && !orders.length && <div className="px-6 py-16 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-50 text-amber-500"><FiClipboard size={25} /></span><h3 className="mt-4 text-sm font-bold text-slate-800">{search ? 'No matching orders' : 'Your orders will appear here'}</h3><p className="mt-2 text-xs text-slate-400">{search ? 'Try another order number.' : 'Approved orders will be available in your customer workspace.'}</p></div>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4"><p role="status" className="text-[11px] text-slate-500">{loading ? 'Loading order register…' : total ? `Showing ${(page - 1) * 20 + 1}–${Math.min(page * 20, total)} of ${total} orders` : '0 orders'}</p><div className="flex items-center gap-3 text-[11px]"><button type="button" disabled={page <= 1 || loading} onClick={onPrevious} aria-label="Previous page" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-30"><FiChevronLeft /></button><span className="font-medium text-slate-600">{page} / {pages}</span><button type="button" disabled={page >= pages || loading} onClick={onNext} aria-label="Next page" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-30"><FiChevronRight /></button></div></div>
        </section>
        <div className="mt-5 flex items-start gap-2 px-1 text-[11px] leading-relaxed text-slate-400"><FiMapPin className="mt-0.5 shrink-0" /><p>Use Track to check an assigned vehicle?s latest eligible location. Orders under review may be temporarily unavailable.</p></div>
        <footer className="mt-9 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-5 text-[10px] text-slate-400"><span>JAYA GROUP · Customer Portal</span><span>Your logistics, connected.</span></footer>
      </main>
    </div>
    {detailLoading && <div role="status" className="fixed bottom-5 right-5 z-[90] flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-3 text-xs font-medium text-white shadow-lg"><FiRefreshCw className="animate-spin text-yellow-400" />Loading order details…</div>}
    {selected && <OrderDetails order={selected} onClose={onCloseDetails} />}
  </div>;
}
