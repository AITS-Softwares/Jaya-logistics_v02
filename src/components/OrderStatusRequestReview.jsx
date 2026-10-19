'use client';

import { useState } from 'react';

export default function OrderStatusRequestReview({ orderId, orderNo, request, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const decide = async (statusDecision) => {
    const reason = statusDecision === 'reject' ? window.prompt('Reason for rejecting this request:') : '';
    if (statusDecision === 'reject' && !reason?.trim()) return;
    setBusy(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/order-panel/${orderId}/status`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusDecision, reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to review status request.');
      onUpdated?.(data.data);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  if (!request?.action) return null;
  return <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1">
    <span className="text-xs font-semibold text-amber-800" title={request.reason}>Approve {request.action.toLowerCase()} for the whole order</span>
    <button disabled={busy} onClick={() => decide('approve')} className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Approve</button>
    <button disabled={busy} onClick={() => decide('reject')} className="rounded-md border border-rose-300 bg-white px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Reject</button>
    {error && <span className="text-xs text-red-700">{error}</span>}
    <span className="sr-only">{orderNo}</span>
  </div>;
}
