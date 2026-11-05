'use client';

import { useEffect, useRef, useState } from 'react';
import { FiEye, FiRefreshCw, FiX } from 'react-icons/fi';
import VnnOrderDetailsContent, { OrderStatus } from '@/components/VnnOrderDetailsContent';

export default function VnnOrderDetailsView({ query, orderNo, subtitle, earlyReview = false, onClose }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const dialog = useRef(null), close = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; close.current?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const controls = [...(dialog.current?.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]') || [])];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus?.(); };
  }, [onClose]);
  useEffect(() => {
    const controller = new AbortController(); setResult(null); setError('');
    (async () => {
      try {
        const response = await fetch(`/api/vehicle-negotiation/order-view?${query}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, signal: controller.signal, cache: 'no-store' });
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.message || 'Unable to load order details.');
        if (!controller.signal.aborted) setResult(body);
      } catch (err) { if (!controller.signal.aborted) setError(err.message); }
    })();
    return () => controller.abort();
  }, [query, retry]);
  const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2';
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="full-order-title" className="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-6"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600"><FiEye size={13} />Complete order details</p><h2 id="full-order-title" className="mt-2 text-xl font-bold tracking-tight text-slate-900">{result?.data?.orderPanelNo || orderNo || 'Order'}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}{result?.context?.vnnNo ? ` · ${result.context.vnnNo}` : ''}</p></div><div className="flex items-center gap-3">{result && <span className="hidden sm:inline-flex"><OrderStatus status={result.data.panelStatus} /></span>}<button ref={close} type="button" onClick={onClose} aria-label="Close order details" className={`${button} !p-2`}><FiX size={20} /></button></div></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5"><p className="text-sm text-red-700">{error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className={`${button} mt-4`}><FiRefreshCw size={13} />Try again</button></div> : !result ? <div role="status" className="space-y-4 p-2"><p className="text-sm text-slate-500">Loading complete order details…</p>{[1, 2, 3].map(item => <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-200/60 motion-reduce:animate-none" />)}</div> : <>
          <p className={`mb-5 rounded-xl border px-4 py-3 text-xs leading-5 ${earlyReview ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-blue-100 bg-blue-50 text-blue-800'}`}>{earlyReview ? 'Awaiting approval. These are the full current order details and may change before approval.' : 'Showing the full original order with its current saved details. Routes included in this negotiation are marked.'}</p>
          <VnnOrderDetailsContent order={result.data} linkedRowIds={result.context?.linkedRowIds || []} />
        </>}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3 sm:px-6"><span className="text-xs text-slate-400">Read-only · Full order preview</span><button type="button" onClick={onClose} className={button}>Close preview</button></footer>
    </section>
  </div>;
}
