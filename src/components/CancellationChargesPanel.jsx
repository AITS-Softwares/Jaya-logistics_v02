'use client';
import { destinationLabel } from '@/lib/destination.mjs';
import { useEffect, useState } from 'react';
export default function CancellationChargesPanel({ id }) {
  const [data, setData] = useState(null), [amounts, setAmounts] = useState({}), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const endpoint = `/api/pricing-panel/${id}/cancellation-charges`;
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });
  async function load() {
    const response = await fetch(endpoint, { headers: headers(), cache: 'no-store' });
    const value = await response.json();
    if (!response.ok) return;
    setData(value); setAmounts(Object.fromEntries(value.rows.map(row => [row._id, value.review?.rows?.find(input => input.id === row._id)?.amount ?? (row.cancellationCharges === 'Nil' ? '' : row.cancellationCharges || '')])));
  }
  useEffect(() => { load().catch(() => setError('Could not load cancellation charges.')); }, [id]);
  async function act(action) {
    const reason = action === 'reject' ? window.prompt('Reason for returning the charges:') : '';
    if (action === 'reject' && !reason?.trim()) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: headers(), body: JSON.stringify({ action, reason, rows: data.rows.map(row => ({ id: row._id, amount: amounts[row._id] })) }) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.message);
      await load(); window.dispatchEvent(new Event('reapproval:refresh'));
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  if (!data?.rows?.length) return null;
  const pending = data.review?.status === 'pending';
  return <section className="basis-full rounded-xl border border-amber-300 bg-amber-50 p-4"><h3 className="font-bold">Cancellation charges · {data.reference}</h3><p className="mt-1 text-sm">Enter an explicit amount for each cancelled order row, including zero when no charge applies. Normal freight fields remain protected.</p>{data.rows.map(row => <label key={row._id} className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm"><span>{row.orderNo} · {row.plantName} → {destinationLabel(row, row.toName)}</span><input aria-label={`Cancellation charge for ${row.orderNo} ${row.toName || ''}`} disabled={busy || pending} type="number" min="0" step="0.01" value={amounts[row._id] ?? ''} onChange={event => setAmounts({ ...amounts, [row._id]: event.target.value })} className="w-36 rounded-lg border p-2" /></label>)}{error && <p role="alert" className="mt-2 text-red-700">{error}</p>}<div className="mt-3 flex gap-2">{pending ? <><span className="text-sm">Charges awaiting approval</span>{data.canApprove && <><button disabled={busy} onClick={() => act('approve')} className="rounded bg-emerald-700 px-3 py-2 text-white">Approve charges</button><button disabled={busy} onClick={() => act('reject')} className="rounded border px-3 py-2">Return charges</button></>}</> : <button disabled={busy} onClick={() => act('submit')} className="rounded bg-amber-700 px-3 py-2 text-white">Submit charges for approval</button>}</div></section>;
}
