'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCheckCircle, FiClock, FiMail, FiRefreshCw, FiX } from 'react-icons/fi';

export function PaymentEmailPreference({ checked, onChange, disabled = false }) {
  return <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm"><input type="checkbox" checked={!!checked} disabled={disabled} onChange={event => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-yellow-600" /><span><span className="font-semibold text-slate-800">Send payment confirmation email when paid</span><span className="mt-1 block text-xs leading-5 text-slate-500">Send once after actual payment is confirmed. Approval and queue generation do not send an email.</span></span></label>;
}

export default function PaymentConfirmationPanel({ kind, paymentId, editable = false }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), [preview, setPreview] = useState(false), [reference, setReference] = useState('');
  const [confirmManual, setConfirmManual] = useState(false);
  const previous = useRef(null), dialog = useRef(null), close = useRef(null), requestSequence = useRef(0), busyRef = useRef(false);
  busyRef.current = busy;
  const endpoint = `/api/${kind === 'advance' ? 'Advance-Payment' : 'balance-payment'}/${paymentId}/confirmation`;
  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' });
  const refresh = useCallback(async signal => {
    const sequence = ++requestSequence.current;
    const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, cache: 'no-store', signal });
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error(body.message || 'Unable to load payment confirmation.');
    if (sequence === requestSequence.current && !signal?.aborted) { setData(body.data); setError(''); }
    return body.data;
  }, [endpoint]);
  useEffect(() => {
    const controller = new AbortController();
    const load = () => { if (!document.hidden) refresh(controller.signal).catch(err => { if (!controller.signal.aborted) setError(err.message); }); };
    load(); const timer = setInterval(load, 30000);
    document.addEventListener('visibilitychange', load);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', load); };
  }, [refresh]);
  useEffect(() => {
    if (!preview) return;
    previous.current = document.activeElement; const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; close.current?.focus();
    const key = event => {
      if (event.key === 'Escape' && !busyRef.current) setPreview(false);
      if (event.key !== 'Tab') return;
      const buttons = [...(dialog.current?.querySelectorAll('button:not([disabled])') || [])];
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); if (previous.current?.isConnected) previous.current.focus?.(); };
  }, [preview]);
  const mutate = async (method, payload) => {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(endpoint, { method, headers: headers(), body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.message || 'Action failed.');
      setMessage([body.message, body.paymentEmail?.message].filter(Boolean).join(' '));
      await refresh();
      if (payload.action === 'confirm-paid') { setReference(''); setConfirmManual(false); }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-yellow-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 disabled:pointer-events-none disabled:opacity-50';
  return <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-amber-50 p-2.5 text-amber-600"><FiMail size={18} /></span><div><h2 className="text-sm font-bold text-slate-900">Payment Confirmation Email</h2><p className="mt-0.5 text-xs text-slate-500">{data?.sentAt ? 'Confirmation sent' : data?.settled ? 'Payment confirmed' : 'Awaiting actual payment'}</p></div></div><button type="button" disabled={busy} onClick={() => refresh().catch(err => setError(err.message))} className={button}><FiRefreshCw size={13} />Refresh</button></header>
    <div className="space-y-4 p-5">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">{message}</p>}
      {!data ? <p className="text-sm text-slate-500">Loading confirmation details…</p> : <>
        {editable && data.canEditPreference ? <PaymentEmailPreference checked={data.requested} disabled={busy} onChange={requested => mutate('PATCH', { action: 'preference', requested })} /> : <p className="text-xs text-slate-600">{data.requested ? 'Email requested on Create/Edit.' : 'Email not requested. Enable it on the Edit page.'}</p>}
        <div className="flex flex-wrap items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${data.settled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{data.status || 'Pending'}</span>{data.reference && <span className="text-xs text-slate-600">Reference: <strong>{data.reference}</strong></span>}<button type="button" disabled={busy} onClick={async () => { try { await refresh(); setPreview(true); } catch (err) { setError(err.message); } }} className={button}><FiMail size={13} />{data.sentAt ? 'Preview / Resend' : 'Preview & Send'}</button></div>
        {data.blockedReason && <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800"><FiClock size={14} className="mt-0.5 shrink-0" />{data.blockedReason}</p>}
        {data.lastError && <p className="text-xs text-red-700">{data.lastError}</p>}
        {data.manualAllowed && data.canApprove && data.canConfirm && <div className="rounded-xl border border-slate-200 p-4"><h3 className="text-xs font-bold text-slate-800">Confirm manual payment</h3><p className="mt-1 text-xs leading-5 text-slate-500">Only confirm after the payment has actually been made. Enter its transaction / UTR reference. This records payment; it does not initiate a bank transfer.</p><div className="mt-3 flex flex-wrap gap-2"><input aria-label="Actual paid transaction or UTR reference" value={reference} onChange={event => { setReference(event.target.value); setConfirmManual(false); }} maxLength={100} placeholder="Transaction / UTR reference" disabled={busy} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-yellow-500" /><button type="button" disabled={busy || !reference.trim()} onClick={() => setConfirmManual({ amount: data.amount, reference: reference.trim() })} className={button}>Confirm Paid</button></div>{confirmManual && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><p>Confirm that <strong>₹{Number(confirmManual.amount || 0).toLocaleString('en-IN')}</strong> has been paid with reference <strong>{confirmManual.reference}</strong>.</p><div className="mt-3 flex gap-2"><button type="button" disabled={busy} onClick={() => mutate('PATCH', { action: 'confirm-paid', reference: confirmManual.reference, expectedAmount: confirmManual.amount })} className={button}>{busy ? 'Confirming…' : 'Yes, payment has been made'}</button><button type="button" disabled={busy} onClick={() => setConfirmManual(false)} className={button}>Cancel</button></div></div>}</div>}
        {data.sentAt && <p className="flex items-center gap-2 text-xs text-emerald-700"><FiCheckCircle size={14} />Sent to {data.sentTo} · {new Date(data.sentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST{data.sentBy ? ` · ${data.sentBy}` : ''}</p>}
        {data.history.length > 0 && <details className="rounded-xl border border-slate-100 p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-600">Send history ({data.history.length})</summary><ul className="mt-3 space-y-2 text-xs text-slate-500">{data.history.map((item, index) => <li key={item._id || index}>{new Date(item.sentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST · {item.sentTo} · {item.sentBy || 'Accounts'}{item.resend ? ' · Resent' : ''}</li>)}</ul></details>}
      </>}
    </div>
    {preview && data && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4"><section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="payment-email-title" className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 p-5"><div><h3 id="payment-email-title" className="text-base font-bold text-slate-900">Payment confirmation preview</h3><p className="mt-1 text-xs text-slate-500">To: {data.to || 'Supplier email missing'}</p><p className="text-xs text-slate-500">From: {data.from || 'Email Master not configured'}</p><p className="text-xs text-slate-600">{data.subject}</p></div><button ref={close} type="button" aria-label="Close payment email preview" disabled={busy} onClick={() => setPreview(false)} className={button}><FiX size={17} /></button></header><div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3"><iframe title="Payment confirmation email" sandbox="" srcDoc={data.html} className="h-[55vh] w-full rounded-lg border border-slate-200 bg-white" /></div><footer className="shrink-0 border-t border-slate-200 p-5">{data.blockedReason && <p className="mb-3 text-xs text-amber-800">{data.blockedReason}</p>}{data.sentAt && <p className="mb-3 text-xs text-amber-800">This confirmation was already sent. Resending will email the supplier again.</p>}{error && <p role="alert" className="mb-3 text-xs text-red-700">{error}</p>}{message && <p role="status" className="mb-3 text-xs text-emerald-700">{message}</p>}<div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setPreview(false)} className={button}>Close</button><button type="button" disabled={busy || !data.canSend} onClick={() => mutate('POST', { resend: !!data.sentAt })} className={`${button} !border-yellow-600 !bg-yellow-600 !text-white hover:!bg-yellow-700`}>{busy ? 'Sending…' : data.sentAt ? 'Resend Email' : 'Send Email'}</button></div></footer></section></div>}
  </section>;
}
