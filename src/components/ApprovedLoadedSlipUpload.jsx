'use client';
import { useEffect, useRef, useState } from 'react';
import { FiUploadCloud } from 'react-icons/fi';
import { usePermission } from '@/app/(dashboard)/admin/hooks/usePermission';

export default function ApprovedLoadedSlipUpload({ loadingId, children = null }) {
  const { canEdit } = usePermission();
  const [record, setRecord] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const input = useRef(null);
  useEffect(() => {
    if (!loadingId) return;
    const controller = new AbortController();
    fetch(`/api/loading-panel?id=${encodeURIComponent(loadingId)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, signal: controller.signal, cache: 'no-store' })
      .then(response => response.json()).then(body => { if (body.success && !controller.signal.aborted) setRecord(body.data); }).catch(() => {});
    return () => controller.abort();
  }, [loadingId, revision]);
  const approved = ['Approved', 'Completed'].includes(record?.panelStatus) && (record?.loadingWorkflow?.version !== 2 || record.loadingWorkflow.part2Status === 'Approved');
  if (!approved) return children;
  const upload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setMessage('');
    try {
      const form = new FormData(); form.append('file', file);
      const response = await fetch(`/api/loading-panel/${loadingId}/loaded-slip`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, body: form });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.message || 'Upload failed.');
      setMessage(body.message); setRevision(value => value + 1);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  const openSlip = async file => {
    try {
      const response = await fetch(`/api/loading-panel/${loadingId}/attachment?path=${encodeURIComponent(file)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
      if (!response.ok) throw new Error('Unable to open slip.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) { setMessage(error.message); }
  };
  return <section className="mt-4 rounded-xl border-2 border-dashed border-slate-300 bg-white p-4">
    <h3 className="text-xs font-bold text-slate-600">Loaded Vehicle Slip (optional)</h3>
    <p className="mb-1 text-xs text-slate-400">Upload loaded vehicle slip (Image/PDF). Can also be added after approval.</p>
    {canEdit('Loading Info') && <div>
      <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" disabled={busy} onChange={upload} aria-label="Add loaded vehicle slip after approval" className="hidden" />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"><FiUploadCloud size={16} />{busy ? 'Uploading…' : '+ Upload Loaded Vehicle Slip'}</button>
      <p className="mt-1.5 text-xs text-slate-400">Image/PDF, up to 10 MB.</p>
    </div>}
    <ul className="mt-3 space-y-2 text-sm">{(record.loadedVehicleSlips || []).map((file, index) => {
      const audit = record.loadedSlipUploads?.find(item => item.filePath === file);
      return <li key={`${file}-${index}`}><button type="button" className="font-semibold text-blue-700 underline" onClick={() => openSlip(file)}>{audit?.originalName || `Loaded slip ${index + 1}`}</button>{audit && <span className="ml-2 text-xs text-slate-500">Added by {audit.uploadedByName || 'Staff'} · {new Date(audit.uploadedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>}</li>;
    })}</ul>
    <p role="status" className="mt-2 text-xs text-slate-600">{message}</p>
  </section>;
}
