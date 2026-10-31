"use client";

import { reapprovalRecordForPath } from '@/lib/reapprovalRoute.mjs';
import { reviewDisplayState, approvalLabelForRecord } from '@/lib/reapprovalPresentation.mjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const labels = { unlocked: 'Under correction', pendingApproval: 'Pending approval', pendingReapproval: 'Pending reapproval', blockedByUpstream: 'Waiting for upstream review', syncFailed: 'Sync review needed', none: 'Approved' };
const badge = 'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold';

const approvalLabel = approvalLabelForRecord;

function ApprovalStatusBadges({ record }) {
  const label = approvalLabel(record);
  const approved = /^(approved|completed)$/i.test(label || '');
  const lifecycle = String(record.status || '').trim();
  const cancelled = /^(cancelled|canceled)$/i.test(lifecycle);
  const held = /^(hold|on hold)$/i.test(lifecycle);
  return <>
    {label && <span className={`${badge} ${approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{label}</span>}
    {(cancelled || held) && <span className={`${badge} ${cancelled ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'}`}>{cancelled ? 'Cancelled' : 'On hold'}</span>}
  </>;
}

function queueMessage(record) {
  record = { ...record, reapprovalState: reviewDisplayState(record) };
  if (record.latestVnnSyncAmbiguous) return 'More than one approved Vehicle Negotiation matches these order rows. Ask an admin to review the links before syncing.';
  if (record.latestVnnSyncRequired) return `Loading Info needs the latest approved data from Vehicle Negotiation ${record.latestVnnNo || ''} synced before reapproval.`;
  if (record.reapprovalState === 'blockedByUpstream') {
    return record.upstreamDetails?.length
      ? record.upstreamDetails.map((item) => item.message).join(' ')
      : labels.blockedByUpstream;
  }
  if (record.reapprovalState === 'unlocked') return `${record.module} is open for correction. Finish the edits and submit it for approval.`;
  if (record.reapprovalState === 'pendingApproval') return `${record.module} has been submitted and is waiting for approval.`;
  if (record.reapprovalState === 'pendingReapproval') return `Review the updated ${record.module} data and approve it to continue.`;
  if (record.reapprovalState === 'syncFailed') return `The ${record.module} approval was saved, but its downstream update failed. Contact that panel's approver to coordinate a retry.`;
  return labels[record.reapprovalState] || record.reapprovalState;
}

function queueBadge(record) {
  record = { ...record, reapprovalState: reviewDisplayState(record) };
  if (record.latestVnnSyncAmbiguous) return 'Link review needed';
  if (record.latestVnnSyncRequired) return 'Sync latest VNN data';
  if (record.reapprovalState === 'blockedByUpstream') {
    const details = record.upstreamDetails || [];
    const badges = [...new Set(details.map((item) => item.badge).filter(Boolean))];
    if (badges.length === 1) return badges[0];
    return badges.length > 1 ? 'Multiple reviews pending' : labels.blockedByUpstream;
  }
  return labels[record.reapprovalState] || record.reapprovalState;
}

const panelNames = { order: 'Order Panel', vnn: 'Vehicle Negotiation', pricing: 'Pricing Panel', loading: 'Loading Info', lr: 'Consignment Note' };

function upstreamBlockMessage(marker, recordType) {
  const sourcePanel = panelNames[marker.panel] || 'Upstream panel';
  const sourceNo = marker.recordNo ? ` ${marker.recordNo}` : '';
  const nextPanel = marker.panel === 'order'
    ? 'Vehicle Negotiation'
    : marker.panel === 'vnn'
      ? (recordType === 'lr' ? 'Consignment Note' : 'its downstream panel')
      : 'the next review stage';
  return `Waiting for ${sourcePanel}${sourceNo} to finish review. Reapproval continues at ${nextPanel}; contact that panel's approver.`;
}

function displayChangeValue(value) {
  if (value === null || value === undefined || value === '') return 'Not set';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'object') {
    if (value._bsontype === 'ObjectId' || value.constructor?.name === 'ObjectId') return String(value);
    if (Array.isArray(value)) return `${value.length} rows`;
    return value.name || value.label || value.code || '[updated]';
  }
  return String(value);
}

function ChangesToReview({ changes }) {
  if (!changes?.length) return null;
  return <div className="basis-full min-w-0 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-slate-700">
    <strong className="text-slate-900">Changes to review ({changes.length})</strong>
    <p className="mt-1 text-xs text-slate-600">Compare the last approved values with the updated values below before approving.</p>
    <div className="mt-3 overflow-x-auto rounded-lg border border-sky-100 bg-white">
      <table className="w-full min-w-[640px] table-fixed text-left text-xs">
        <thead className="bg-slate-100 text-slate-700"><tr>
          <th scope="col" className="w-2/5 px-3 py-2.5">What changed</th>
          <th scope="col" className="w-[30%] px-3 py-2.5">Previously approved</th>
          <th scope="col" className="w-[30%] px-3 py-2.5">Updated</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-100">{changes.map((change, index) => <tr key={`${change.field}:${index}`}>
          <th scope="row" className="break-words px-3 py-3 align-top font-medium text-slate-900">
            {change.field}
            {change.action && <span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${change.action === 'added' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{change.action === 'added' ? 'Added' : 'Removed'}</span>}
          </th>
          <td className="break-words px-3 py-3 align-top text-slate-500">{change.action === 'added' ? 'Not in previous approval' : displayChangeValue(change.oldValue)}</td>
          <td className="break-words bg-emerald-50/50 px-3 py-3 align-top font-medium text-slate-900">{change.action === 'removed' ? 'Removed' : displayChangeValue(change.newValue)}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}

function decodeToken(token) {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return null; }
}

export default function ReapprovalWorkspace({ placement = 'content' }) {
  const pathname=usePathname();
  // Content belongs to one record route. Remount on navigation so requests
  // from the previous page cannot populate the new page's approval banner.
  if(placement==='content' && !reapprovalRecordForPath(pathname))return null;
  return <ReapprovalWorkspaceForRoute key={placement==='content'?pathname:'header'} placement={placement} />;
}

function ReapprovalWorkspaceForRoute({ placement = 'content' }) {
  const pathname = usePathname();
  const router = useRouter();
  const [records, setRecords] = useState([]);
  const [current, setCurrent] = useState(null);
  const [token, setToken] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [queueOpen, setQueueOpen] = useState(false);
  const queueRef = useRef(null);

  const currentRequest=useRef(null);
  const currentRef=useMemo(()=>reapprovalRecordForPath(pathname),[pathname]);
  useEffect(()=>()=>currentRequest.current?.abort(),[]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/reapproval/queue', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.success) setRecords(data.records || []);
    } catch { /* Queue remains best effort; route guards still enforce state. */ }
  }, [token]);

  const fetchCurrent = useCallback(async () => {
    currentRequest.current?.abort();
    if (!token || !currentRef) { setCurrent(null); return; }
    const controller=new AbortController();
    currentRequest.current=controller;
    try {
      const response = await fetch(`/api/reapproval/${currentRef.type}/${currentRef.id}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',signal:controller.signal });
      const data = await response.json();
      if(controller.signal.aborted || currentRequest.current!==controller)return;
      if (response.ok && data.success) setCurrent(data);
      else setCurrent(null);
    } catch { if(!controller.signal.aborted && currentRequest.current===controller)setCurrent(null); }
  }, [token, currentRef]);

  useEffect(() => {
    const authToken = localStorage.getItem('token') || '';
    setToken(authToken);
    const user = decodeToken(authToken);
    setIsAdmin(user?.type === 'company' || user?.roles?.includes('Admin'));
  }, []);
  useEffect(() => { if (placement === 'header') refresh(); }, [refresh, pathname, placement]);
  useEffect(() => {
    if (placement !== 'header') return undefined;
    const handleRefresh = () => refresh();
    window.addEventListener('reapproval:refresh', handleRefresh);
    return () => window.removeEventListener('reapproval:refresh', handleRefresh);
  }, [refresh, placement]);
  useEffect(() => { if (placement === 'content') fetchCurrent(); }, [fetchCurrent, placement]);
  useEffect(() => {
    if (placement !== 'content') return undefined;
    const handleRefresh = () => fetchCurrent();
    window.addEventListener('reapproval:refresh', handleRefresh);
    return () => window.removeEventListener('reapproval:refresh', handleRefresh);
  }, [fetchCurrent, placement]);
  useEffect(() => { setQueueOpen(false); }, [pathname]);
  useEffect(() => {
    if (!queueOpen) return undefined;
    const closeOnOutsidePointer = (event) => {
      if (queueRef.current && !queueRef.current.contains(event.target)) setQueueOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setQueueOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [queueOpen]);

  const openUnlock = async () => {
    setError('');
    const response = await fetch(`/api/reapproval/${currentRef.type}/${currentRef.id}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) return setError(data.message || 'Could not load impact preview.');
    setCurrent(data);
    setReason('');
    setModal('unlock');
  };

  const submit = async (action) => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/reapproval/${currentRef.type}/${currentRef.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, reason }),
      });
      const data = await response.json();
      if (!response.ok) { setError([data.message, ...(data.blockers || [])].filter(Boolean).join(' ')); return; }
      setModal(null); await Promise.all([refresh(), fetchCurrent()]);
      if (currentRef.type === 'loading' && action === 'reconcileDetachedOrders') window.dispatchEvent(new Event('loading-panel:refresh'));
      window.dispatchEvent(new Event('reapproval:refresh'));
      router.refresh();
    } catch (exception) { setError(exception.message || 'Request failed.'); }
    finally { setBusy(false); }
  };

  const queue = records.filter((record) => record.reapprovalState !== 'none');
  const renderQueueRecord = (record) => {
    const content = <><span className="flex items-center justify-between gap-3"><b className="truncate">{record.no || record.module}</b><span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">{queueBadge(record)}</span></span><span className="mt-1 block text-xs leading-5 text-slate-600">{queueMessage(record)}</span>{!record.path && <span className="mt-1 block text-[11px] font-medium text-slate-500">You don’t have permission to open this item.</span>}</>;
    const className = 'block rounded-lg px-3 py-2.5 text-sm text-slate-800 transition hover:bg-amber-50 focus:bg-amber-50 focus:outline-none';
    return record.path
      ? <a key={`${record.type}:${record.id}`} href={record.path} className={className}>{content}</a>
      : <div key={`${record.type}:${record.id}`} aria-disabled="true" className="block cursor-not-allowed rounded-lg px-3 py-2.5 text-sm text-slate-800 opacity-75">{content}</div>;
  };
  return <>
    {placement === 'header' && queue.length > 0 && <div ref={queueRef} className="relative z-[70] flex items-center">
      <button type="button" aria-expanded={queueOpen} aria-label={`${queue.length} reapproval items`} onClick={() => setQueueOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-950 shadow-sm transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400">
        <svg className="h-4 w-4 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        <span className="hidden md:inline">Reapproval work</span><span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-600 px-1.5 py-0.5 text-[11px] leading-none text-white">{queue.length}</span>
        <svg className={`h-3.5 w-3.5 text-amber-700 transition-transform ${queueOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
      </button>
      {queueOpen && <>
        <button type="button" aria-label="Close reapproval work" onClick={() => setQueueOpen(false)} className="fixed inset-0 z-[60] bg-slate-950/25 transition-opacity md:bg-slate-950/15" />
        <section aria-label="Reapproval work" className="fixed inset-x-0 bottom-0 z-[80] flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl border border-amber-200 bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-2xl md:inset-y-0 md:bottom-0 md:left-auto md:top-[calc(env(safe-area-inset-top,0px)+3.5rem)] md:w-[min(28rem,calc(100vw-1.5rem))] md:max-h-none md:rounded-l-2xl md:rounded-tr-none md:pb-0">
          <div className="flex shrink-0 items-center justify-between border-b border-amber-100 bg-amber-50 px-4 py-3"><div><strong className="block text-sm text-amber-950">Reapproval work</strong><span className="text-xs text-amber-800">{queue.length} item{queue.length === 1 ? '' : 's'} need attention</span></div><button type="button" onClick={() => setQueueOpen(false)} className="rounded-md px-2 py-1 text-lg leading-none text-amber-800 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400" aria-label="Close reapproval work">×</button></div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">{queue.slice(0, 20).map(renderQueueRecord)}</div>
          {queue.length > 20 && <div className="shrink-0 border-t border-slate-100 px-4 py-2 text-xs text-slate-500">Showing 20 of {queue.length} items</div>}
        </section>
      </>}
    </div>}
    {placement === 'content' && current && <section className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-900">Approval status · {current.record.no}</strong><ApprovalStatusBadges record={current.record} />{current.record.approvedRevision > 0 && <span className="text-xs text-slate-500">Revision {current.record.approvedRevision}</span>}</div>
        {current.record.syncError && <p className="mt-1 text-xs text-red-700">{current.record.syncError}</p>}
        {current.record.upstreamPending?.length > 0 && <div className="mt-1 text-xs text-amber-800">{(current.record.upstreamDetails?.length ? current.record.upstreamDetails : current.record.upstreamPending).map((marker, index) => <p key={`${marker.panel}:${marker.recordId}:${index}`}>{marker.message || upstreamBlockMessage(marker, current.record.type)}</p>)}</div>}</div>
      {current.record.type === 'vnn' && current.record.detachedOrderMarkers?.length > 0 && <div className="basis-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"><p>These Order Panel blockers refer to orders no longer linked to this Vehicle Negotiation: {current.record.detachedOrderMarkers.map((marker) => marker.recordNo).filter(Boolean).join(', ')}.</p>{current.record.canReconcileDetachedOrders && <button type="button" disabled={busy} onClick={() => submit('reconcileDetachedOrders')} className="mt-2 rounded-md bg-amber-700 px-3 py-1.5 font-semibold text-white hover:bg-amber-800 disabled:opacity-50">{busy ? 'Clearing outdated link…' : 'Clear removed-order blocker'}</button>}</div>}
      {current.record.type === 'loading' && (current.record.latestVnnSync?.required || current.record.latestVnnSync?.ambiguous || current.record.detachedOrderMarkers?.length > 0) && <div className="basis-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"><p>{current.record.latestVnnSync?.ambiguous ? 'More than one approved Vehicle Negotiation matches these order rows. Ask an admin to review the links; the existing blockers have been kept.' : current.record.latestVnnSync?.required ? `This Loading Info is out of date. Sync the latest approved data from Vehicle Negotiation ${current.record.latestVnnSync.vnnNo} to resume reapproval.` : `The old Order Panel link ${current.record.detachedOrderMarkers.map((marker) => marker.recordNo).filter(Boolean).join(', ')} is no longer linked to this Loading Info’s Vehicle Negotiation.`}</p>{current.record.canReconcileDetachedOrders && current.record.latestVnnSync?.required && !current.record.latestVnnSync?.ambiguous && <button type="button" disabled={busy} onClick={() => submit('reconcileDetachedOrders')} className="mt-2 rounded-md bg-amber-700 px-3 py-1.5 font-semibold text-white hover:bg-amber-800 disabled:opacity-50">{busy ? 'Syncing latest VNN data…' : 'Sync latest VNN data and request reapproval'}</button>}</div>}
      {current.record.hasReviewableChanges === true && <ChangesToReview changes={current.record.pendingChanges?.length ? current.record.pendingChanges : current.record.changeSummary} />}
      {(current.record.canUnlockForCorrection || isAdmin) && <div className="flex gap-2">{current.record.canUnlockForCorrection && ['Approved', 'Completed'].includes(current.record.status) && current.record.reapprovalState === 'none' && <button onClick={openUnlock} className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white">Unlock for correction</button>}{current.record.canUnlockForCorrection && current.record.reapprovalState === 'unlocked' && <button onClick={() => { setModal('cancel'); setError(''); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Cancel unlock</button>}{isAdmin && current.record.reapprovalState === 'syncFailed' && <button disabled={busy} onClick={() => submit('retrySync')} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Retry downstream sync</button>}</div>}
    </section>}
    {placement === 'content' && currentRef && current && modal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
      <h2 className="text-lg font-bold text-slate-900">{modal === 'unlock' ? `Unlock ${current?.record.no} for correction?` : `Cancel unlock for ${current?.record.no}?`}</h2>
      {modal === 'unlock' && <><p className="mt-1 text-sm text-slate-600">Linked records will be blocked from approval while this record is being corrected.</p><div className="mt-4 max-h-48 overflow-auto rounded-lg border border-slate-200 p-3 text-sm">{current?.impact?.map((item) => <div key={`${item.type}:${item.id}`} className="py-1 pl-4" style={{ marginLeft: Math.min(item.depth, 4) * 12 }}>{item.label}: {item.no}</div>)}</div>{current?.blockers?.length > 0 && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><b>Cannot unlock</b><ul className="ml-5 list-disc">{current.blockers.map((item) => <li key={item}>{item}</li>)}</ul></div>}<label className="mt-4 block text-sm font-medium text-slate-700">Reason<input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" maxLength={1000} /></label></>}
      {modal === 'cancel' && <p className="mt-2 text-sm text-slate-600">This restores the last approved snapshot and clears the temporary downstream block.</p>}
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button disabled={busy} onClick={() => setModal(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Back</button>{modal === 'unlock' ? <button disabled={busy || !reason.trim() || !!current?.blockers?.length} onClick={() => submit('unlock')} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Unlocking…' : 'Unlock'}</button> : <button disabled={busy} onClick={() => submit('cancel')} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Restoring…' : 'Restore approved version'}</button>}</div>
    </div></div>}
  </>;
}
