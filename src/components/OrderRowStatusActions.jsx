'use client';

import { useEffect, useRef, useState } from 'react';

export default function OrderRowStatusActions({ orderId, orderNo, status, onUpdated }) {
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [impact, setImpact] = useState(null);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [charge, setCharge] = useState('0');
  const [mode, setMode] = useState('flat');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const controlRef = useRef(null);

  useEffect(() => {
    if (!editing) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!controlRef.current?.contains(event.target)) setEditing(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setEditing(false);
    };
    const closeOnScroll = () => setEditing(false);
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [editing]);

  const open = async (nextAction) => {
    setAction(nextAction); setImpact(null); setRequiresApproval(false); setReason(''); setEditing(false);
    setBusy(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/order-panel/${orderId}/status`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: nextAction, reason: 'Preview', dryRun: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not load impact preview.');
      setImpact(data.impact); setRequiresApproval(!!data.requiresApproval);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const submit = async () => {
    if (!reason.trim() || !action || (action !== 'Resume' && impact?.blockers?.length)) return;
    setBusy(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/order-panel/${orderId}/status`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason,
          ...(action === 'Cancel' ? { cancellationCharge: { amount: charge, mode } } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not update order status.');
      setAction(''); setImpact(null); setEditing(false); onUpdated?.(data.data);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const choices = ['Hold', 'Resume', 'Cancel'].map((item) => ({ value: `order:${item}`, label: `${item} whole order` }));
  const pillClass = status === 'Hold' ? 'bg-amber-100 text-amber-800' : status === 'Cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800';
  return <>
    <span ref={controlRef} className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="relative inline-flex items-center">
        {editing ? <div className="relative z-30">
          <button type="button" aria-label={`Choose status for ${orderNo}`} onClick={() => setEditing(false)} className={`inline-flex min-w-24 items-center justify-between gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm ring-1 ring-black/5 ${pillClass}`}>
            {status || 'Open'}<svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></svg>
          </button>
          <div role="menu" style={{ position: 'fixed', left: menuPosition.left, top: menuPosition.top }} className="z-[60] min-w-36 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5">
            <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Whole order</p>{choices.map(({ value, label }) => <button key={value} type="button" role="menuitem" onClick={() => open(value.split(':')[1])} className="block w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700">{label}</button>)}
          </div>
        </div> : <span className={`rounded-full px-2 py-1 text-xs font-semibold ${pillClass}`}>{status || 'Open'}</span>}
        <button type="button" aria-label={`Edit status for ${orderNo}`} title="Change order status" disabled={busy}
          onClick={(event) => { if (!editing) { const rect = event.currentTarget.getBoundingClientRect(); setMenuPosition({ left: Math.min(rect.left, window.innerWidth - 190), top: Math.min(rect.bottom + 4, window.innerHeight - 220) }); } setEditing((value) => !value); }} className={`rounded-full border p-1 transition disabled:opacity-50 ${editing ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-100 hover:text-indigo-700'}`}>
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m16 4 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/></svg>
        </button>
      </span>
    </span>
    {action && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold">{action} whole order {orderNo}</h2>
        {requiresApproval && <p className="mt-1 text-sm font-medium text-amber-700">This request will take effect after an Order Panel approver approves it.</p>}
        <div className="mt-3 max-h-56 min-w-0 space-y-2 overflow-x-hidden overflow-y-auto rounded-lg bg-slate-50 p-3 text-sm whitespace-normal break-words [overflow-wrap:anywhere]">
          <p className="min-w-0 whitespace-normal break-words"><b>Rows:</b> {impact?.rows?.map((row) => `${row.plant || row.id}: ${row.from} → ${row.to}`).join('; ') || 'None'}</p>
          <p className="min-w-0 whitespace-normal break-words"><b>Purchases:</b> {impact?.purchases?.map((item) => `${item.purchaseNo}${item.advancePaid ? ' (advance paid)' : ''}`).join(', ') || 'None'}</p>
          <p className="min-w-0 whitespace-normal break-words"><b>Vehicle negotiations:</b> {impact?.vehicleNegotiations?.map((item) => `${item.vnnNo} (${item.effect})`).join(', ') || 'None'}</p>
          <p className="min-w-0 whitespace-normal break-words"><b>Loading info:</b> {impact?.loadingPanels?.map((item) => `${item.vehicleArrivalNo || item.loadingNo || item.loadingPanelNo || item._id} (${item.status || 'Linked'})`).join(', ') || 'None'}</p>
          <p className="min-w-0 whitespace-normal break-words"><b>Consignment notes:</b> {impact?.lrs?.map((lr) => `${lr.lrNo} (${lr.status}${lr.invoiceUploaded ? ', invoice uploaded; retained' : ''})`).join(', ') || 'None'}</p>
          {impact?.blockers?.length > 0 && <ul className="mt-2 list-disc pl-5 text-red-700">{impact.blockers.map((blocker, index) => <li className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]" key={index}>{blocker.reason}</li>)}</ul>}
        </div>
        <label className="mt-4 block text-sm font-semibold">Reason (required)</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" rows={3} />
        {action === 'Cancel' && <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="block min-w-0 text-sm font-semibold">Cancellation charge<input type="number" min="0" value={charge} onChange={(e) => setCharge(e.target.value)} className="mt-1 block w-full min-w-0 rounded border p-2" /></label><label className="block min-w-0 text-sm font-semibold">Charge mode<select value={mode} onChange={(e) => setMode(e.target.value)} className="mt-1 block w-full min-w-0 rounded border p-2"><option value="flat">Flat</option><option value="per MT">Per MT</option></select></label></div>}
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        <div className="mt-4 flex justify-end gap-2"><button onClick={() => { setAction(''); setError(''); }} className="rounded border px-3 py-2">Close</button><button disabled={busy || !impact || !reason.trim() || (action !== 'Resume' && (impact?.blockers?.length || 0) > 0)} onClick={submit} title={action !== 'Resume' && impact?.blockers?.length ? 'This order can no longer be held or cancelled.' : undefined} className="rounded bg-indigo-600 px-3 py-2 text-white disabled:opacity-40">{action !== 'Resume' && impact?.blockers?.length ? 'Unavailable' : requiresApproval ? 'Request approval' : 'Confirm'}</button></div>
      </div>
    </div>}
  </>;
}
