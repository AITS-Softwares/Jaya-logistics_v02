"use client";

import { useEffect, useState } from 'react';
import PdiInspectionPreview from '@/components/PdiInspectionPreview';
import { FiEye, FiCheckCircle, FiClock } from 'react-icons/fi';

const tones = {
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'In Progress': 'bg-amber-50 text-amber-800 ring-amber-200',
  Pending: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export default function VnnPdiCell({ orders }) {
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState({ key: '', data: {}, error: false });
  const ids = [...new Set(orders.map(order => String(order.orderPanelId || '')).filter(id => /^[a-f\d]{24}$/i.test(id)))];
  const key = ids.join(',');
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    (async () => {
      try {
        const data = {};
        // Batch source orders rather than sending one request per order badge.
        for (let start = 0; start < ids.length; start += 200) {
          const response = await fetch(`/api/pdi-panel?orderIds=${ids.slice(start, start + 200).join(',')}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, signal: controller.signal, cache: 'no-store',
          });
          const body = await response.json();
          if (!response.ok || !body.success) throw new Error('PDI unavailable');
          for (const inspection of body.data) data[inspection.orderId] = inspection;
        }
        setResult({ key, data, error: false });
      } catch (error) {
        if (error.name !== 'AbortError') setResult({ key, data: {}, error: true });
      }
    })();
    return () => controller.abort();
  }, [key]);

  if (!orders.length) return <span className="text-slate-400">—</span>;
  return <div className="min-w-[230px] space-y-2.5">{selected && <PdiInspectionPreview order={selected} onClose={() => setSelected(null)} />}{orders.map((order, index) => {
    const id = String(order.orderPanelId || '');
    const valid = /^[a-f\d]{24}$/i.test(id);
    const current = result.key === key;
    const inspection = current ? result.data[id] : null;
    const status = !valid ? 'Unlinked' : !current ? 'Loading…' : result.error || !inspection ? 'Unavailable' : inspection.status;
    const titleClass = 'inline-flex min-w-0 items-center gap-1 text-[11px] font-semibold text-slate-700 transition hover:text-indigo-700 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400';
    const Icon = status === 'Completed' ? FiCheckCircle : FiClock;
    return <div key={id || order.order || index} className={`border-l-2 pl-2.5 ${status === 'Completed' ? 'border-emerald-400' : status === 'In Progress' ? 'border-amber-400' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between gap-3">
        <button type="button" disabled={!valid} onClick={() => setSelected(order)} title={`View PDI for ${order.order || 'order'}`} className={`${titleClass} disabled:cursor-default disabled:no-underline disabled:opacity-60`}>{order.order || 'Order'}{valid && <FiEye className="shrink-0 text-slate-400" size={12} />}</button>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${tones[status] || tones.Pending}`}><Icon size={11} aria-hidden="true" />{status}</span>
      </div>
      {inspection && <div className="mt-1 flex items-center gap-2 text-[10px] font-medium leading-4">
        <span className="text-emerald-700" title="Fully Packed">{inspection.items.filter(item => item.packedStatus === 'Fully Packed').length} Full</span>
        <span className="text-amber-700" title="Partially Packed">{inspection.items.filter(item => item.packedStatus === 'Partially Packed').length} Partial</span>
        <span className="text-rose-600" title="Not Packed">{inspection.items.filter(item => item.packedStatus === 'Not Packed').length} Not packed</span>
        <span className="text-slate-400">/ {inspection.items.length}</span>
      </div>}
    </div>;
  })}</div>;
}
