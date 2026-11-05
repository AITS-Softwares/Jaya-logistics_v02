'use client';
import { FiArrowLeft, FiEye } from 'react-icons/fi';
import OrderPanelDetailsContent, { OrderStatus } from '@/components/OrderPanelDetailsContent';
export default function OrderPanelDetailsView({ order, onBack }) {
  return <div className="min-h-screen bg-slate-50">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-7xl px-4 py-5 sm:px-6"><button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"><FiArrowLeft size={14} />Back to list</button><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600"><FiEye size={13} />Order Panel · Complete read-only details</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{order.orderPanelNo}</h1><p className="mt-2 text-sm text-slate-500">{order.customerName || order.partyName || 'Order details'}</p></div><OrderStatus status={order.panelStatus || 'Draft'} /></div></div></header>
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><OrderPanelDetailsContent order={order} /></main>
  </div>;
}
