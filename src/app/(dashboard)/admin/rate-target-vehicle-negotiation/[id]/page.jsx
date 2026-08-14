'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function RateTargetDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState({ maxRate: '', targetRate: '', oldRatePercent: '', remarks1: '', voiceNote: '', voiceNoteFile: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rate-target-vehicle-negotiation/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to load Rate Target.');
      setRecord(data.data);
      setForm({
        maxRate: data.data.negotiation?.maxRate ?? '', targetRate: data.data.negotiation?.targetRate ?? '',
        oldRatePercent: data.data.negotiation?.oldRatePercent ?? '', remarks1: data.data.negotiation?.remarks1 ?? '',
        voiceNote: data.data.voiceNote ?? '', voiceNoteFile: data.data.voiceNoteFile ?? null
      });
    } catch (err) { setError(err.message); }
  };
  useEffect(() => { load(); }, [id]);

  const save = async () => {
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rate-target-vehicle-negotiation/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ negotiation: form, voiceNote: form.voiceNote, voiceNoteFile: form.voiceNoteFile }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.message || 'Unable to save Rate Target.');
      await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const uploadVoice = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/') || file.size > 10 * 1024 * 1024) {
      setError('Upload an audio file no larger than 10 MB.');
      return;
    }
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const upload = new FormData(); upload.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: upload });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Voice note upload failed.');
      setForm((old) => ({ ...old, voiceNote: data.filePath || '', voiceNoteFile: { filePath: data.filePath, fullPath: data.fullPath, filename: data.filename, originalName: file.name, size: file.size, mimeType: file.type } }));
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const approved = record?.approval?.part2Status === 'Approved';
  const field = (key, label, type = 'text') => <label className="block"><span className="text-xs font-bold text-slate-600">{label}</span><input type={type} value={form[key]} disabled={approved || saving} onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100" /></label>;

  if (!record && !error) return <div className="p-8 text-sm text-slate-500">Loading Rate Target…</div>;
  return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-4xl">
    <button onClick={() => router.push('/admin/rate-target-vehicle-negotiation')} className="mb-4 text-sm font-semibold text-indigo-600">← Back to Rate Target queue</button>
    {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {record && <><div className="mb-5 rounded-xl border border-slate-200 bg-white p-5"><h1 className="text-xl font-extrabold text-slate-900">Rate Target: {record.vnnNo}</h1><p className="mt-1 text-sm text-slate-500">{record.partyName || 'No party'} · {record.branchName || 'No branch'} · Part 1 locked</p></div>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-slate-900">Rate Target Details</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{record.approval?.part2Status || 'Pending'}</span></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{field('maxRate', 'Max Rate', 'number')}{field('targetRate', 'Target Rate', 'number')}{field('oldRatePercent', 'Old Rate %', 'number')}</div>
        <label className="mt-4 block"><span className="text-xs font-bold text-slate-600">Remarks</span><textarea value={form.remarks1} disabled={approved || saving} onChange={(e) => setForm((old) => ({ ...old, remarks1: e.target.value }))} rows="3" className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm disabled:bg-slate-100" /></label>
        <label className="mt-4 block"><span className="text-xs font-bold text-slate-600">Voice Note</span><input type="file" accept="audio/*" disabled={approved || saving} onChange={uploadVoice} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />{form.voiceNoteFile?.originalName && <span className="mt-1 block text-xs text-slate-500">Uploaded: {form.voiceNoteFile.originalName}</span>}</label>
        {!approved && <button disabled={saving} onClick={save} className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-400">Save Rate Target</button>}
      </section>
    </>}
  </div></div>;
}
