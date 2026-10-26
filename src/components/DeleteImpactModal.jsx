"use client";

import { useEffect, useState } from 'react';

export function AdminDeleteImpactHost() {
  const [target, setTarget] = useState(null);
  useEffect(() => {
    const open = (event) => setTarget(event.detail || null);
    window.addEventListener('logistics:delete-impact', open);
    return () => window.removeEventListener('logistics:delete-impact', open);
  }, []);
  if (!target) return null;
  return <DeleteImpactModal {...target} onClose={() => setTarget(null)} onDeleted={() => { setTarget(null); target.onDeleted?.(); }} />;
}

export default function DeleteImpactModal({ type, apiPath, recordId, recordNo, onClose, onDeleted }) {
  const [impact, setImpact] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let live = true;
    const token = localStorage.getItem('token');
    fetch(`/api/deletion?type=${encodeURIComponent(type)}&id=${encodeURIComponent(recordId)}&dryRun=true`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((data) => { if (live) { if (data.success) setImpact(data); else setError(data.message || 'Could not load deletion impact.'); } })
      .catch(() => { if (live) setError('Could not load deletion impact.'); });
    return () => { live = false; };
  }, [type, recordId]);

  async function confirmDelete() {
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiPath}?id=${encodeURIComponent(recordId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Delete failed.');
      onDeleted?.(); onClose();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-impact-title">
    <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl p-6 space-y-4">
      <h2 id="delete-impact-title" className="text-lg font-bold text-slate-900">Delete {recordNo}?</h2>
      {!impact && !error && <p className="text-sm text-slate-600">Checking linked records…</p>}
      {impact && <>
        {impact.blockers?.length > 0 && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900" role="alert">
          <p className="font-bold">Deletion blocked — nothing will be deleted.</p>
          <p className="mt-1">Resolve the following blockers before deleting this record and its linked records:</p>
          <ul className="mt-1 list-disc pl-5">{impact.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>}
        <div className="max-h-52 overflow-auto rounded-lg border p-3 text-sm">
          <p className="font-semibold mb-2">Records affected</p>
          {impact.impact?.length ? impact.impact.map((item) => <div key={`${item.type}-${item.id}`} className="py-1">{'　'.repeat(item.depth)}{item.label}: {item.no}{item.depth === 0 ? ' (selected)' : impact.canConfirm ? ' (will be deleted)' : ' (not deleted while blocked)'}</div>) : <p className="text-amber-800">No linked records were resolved. Refresh the page and try again.</p>}
        </div>
        <label className="block text-sm font-medium">Reason <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded border p-2" rows={3} maxLength={500} /></label>
      </>}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2"><button className="rounded border px-4 py-2" onClick={onClose}>Close</button><button className="rounded bg-red-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={!impact?.canConfirm || !reason.trim() || saving} onClick={confirmDelete}>{saving ? 'Deleting…' : impact && !impact.canConfirm ? 'Delete blocked' : 'Delete'}</button></div>
    </div>
  </div>;
}
