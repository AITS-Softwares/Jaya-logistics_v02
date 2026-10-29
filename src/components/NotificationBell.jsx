"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, X, Check, CheckCheck, RefreshCw, Settings2, ArrowLeft, ArrowUpRight, ChevronDown, ClipboardCheck, Clock3, AlertCircle, MessageSquare, CheckCircle2 } from 'lucide-react';
import { notificationRequest, pushSupported, syncPushSubscription, disablePushSubscription } from '@/lib/pushClient';
import { safeNotificationUrl } from '@/lib/pushPolicy.mjs';
import { describeActivity, describeWork, groupActivity, splitWork, workListPath } from '@/lib/notificationCenter.mjs';
import { adminPushDefaults, adminPushCategories } from '@/lib/adminNotificationPolicy.mjs';
import { mergePanelWork } from '@/lib/panelWorkPolicy.mjs';

const iconButton = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500';
const shortTime = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : '';

function EventIcon({ tone = 'info' }) {
  const Icon = tone === 'warning' ? AlertCircle : tone === 'waiting' ? Clock3 : tone === 'review' ? ClipboardCheck : MessageSquare;
  return <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone === 'warning' ? 'bg-rose-50 text-rose-600' : tone === 'review' ? 'bg-amber-50 text-amber-700' : tone === 'waiting' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}><Icon size={17} strokeWidth={1.8} /></span>;
}

export default function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const requestVersion = useRef(0);
  const tabRefs = useRef([]);
  const [notifications, setNotifications] = useState([]);
  const [activityView, setActivityView] = useState('overview');
  const [canChooseActivity, setCanChooseActivity] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pushPreferences, setPushPreferences] = useState(adminPushDefaults);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [records, setRecords] = useState([]);
  const [panelRecords, setPanelRecords] = useState([]);
  const [panelWarning, setPanelWarning] = useState('');
  const [billingRecords, setBillingRecords] = useState([]);
  const [billingError, setBillingError] = useState('');
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('actions');
  const [settings, setSettings] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [showWaiting, setShowWaiting] = useState(false);
  const [openedNotification, setOpenedNotification] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activityError, setActivityError] = useState('');
  const [workError, setWorkError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    const results = await Promise.allSettled([
      notificationRequest(`/api/project/notifications?meta=1&view=${activityView}`), notificationRequest('/api/reapproval/queue'), notificationRequest('/api/billing/reminders'), notificationRequest('/api/notifications/panel-work'),
    ]);
    if (version !== requestVersion.current) return;
    const [activity, work, billing, panels] = results;
    if (activity.status === 'fulfilled' && Array.isArray(activity.value.items)) {
      setNotifications(activity.value.items); setCanChooseActivity(activity.value.canOverview === true); setIsAdmin(activity.value.isAdmin === true); setActivityError('');
    } else { setNotifications([]); setActivityError(activity.reason?.message || 'Unable to load recent activity.'); }
    if (work.status === 'fulfilled' && work.value.success) {
      setRecords(work.value.records || []); setWorkError('');
    } else { setRecords([]); setWorkError(work.reason?.message || work.value?.message || 'Unable to load pending work.'); }
    if (billing.status === 'fulfilled' && billing.value.success) { setBillingRecords(billing.value.records || []); setBillingError(''); }
    else { setBillingRecords([]); setBillingError(billing.reason?.message || billing.value?.message || 'Unable to load billing work.'); }
    if (panels.status === 'fulfilled' && panels.value.success) { setPanelRecords(panels.value.records || []); setPanelWarning((panels.value.warnings || []).join(' ')); }
    else { setPanelRecords([]); setPanelWarning(panels.reason?.message || panels.value?.message || 'Unable to load panel counts.'); }
    setLoading(false);
  }, [activityView]);

  useEffect(() => { refresh(); }, [pathname, refresh]);
  useEffect(() => {
    if (!isAdmin || !settings) return;
    let active = true;
    setPreferencesReady(false);
    notificationRequest('/api/notifications/preferences').then(result => {
      if (active) { setPushPreferences(result.preferences); setPreferencesReady(true); }
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [isAdmin, settings]);

  async function changePushPreference(category, value) {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await notificationRequest('/api/notifications/preferences', { method: 'PATCH', body: JSON.stringify({ [category]: value }) });
      setPushPreferences(result.preferences);
      setNotice('Push preferences saved for your account.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    let active = true;
    setSupported(pushSupported());
    syncPushSubscription().then(value => { if (active) setEnabled(value); }).catch(() => {});
    const onFocus = () => { if (!document.hidden) refresh(); };
    const interval = setInterval(onFocus, 30000);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('reapproval:refresh', onFocus);
    window.addEventListener('pending-to-create-refresh', onFocus);
    const url = new URL(window.location.href);
    const id = url.searchParams.get('notification') || sessionStorage.getItem('erp:notification-id');
    if (id && /^[a-f0-9]{24}$/i.test(id)) {
      sessionStorage.removeItem('erp:notification-id');
      setOpen(true); setTab('activity');
      notificationRequest(`/api/project/notifications/${id}?view=${activityView}`).then(item => {
        if (active) {
          setOpenedNotification(item);
          setNotifications(items => items.some(row => row._id === item._id) ? items : [item, ...items]);
          setNotice('Opened from a device alert. Your update is in Activity.');
        }
      }).catch(err => { if (active) setError(err.message); });
      url.searchParams.delete('notification');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    return () => {
      active = false; requestVersion.current++;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('reapproval:refresh', onFocus);
      window.removeEventListener('pending-to-create-refresh', onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...(dialogRef.current?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]') || [])];
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  async function markRead(ids) {
    if (!ids.length) return;
    setBusy(true); setError('');
    try {
      for (let index = 0; index < ids.length; index += 200) {
        await notificationRequest(`/api/project/notifications?view=${activityView}`, { method: 'PATCH', body: JSON.stringify({ ids: ids.slice(index, index + 200) }) });
      }
      setNotifications(items => items.map(item => ids.includes(item._id) ? { ...item, read: true } : item));
      setOpenedNotification(item => item && ids.includes(item._id) ? { ...item, read: true } : item);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function openRecord(item) {
    setBusy(true); setError('');
    try {
      const current = await notificationRequest(`/api/project/notifications/${item._id}?view=${activityView}`, { method: 'PUT' });
      setNotifications(items => items.map(row => row._id === item._id ? { ...row, read: true } : row));
      setOpenedNotification(row => row?._id === item._id ? { ...row, read: true } : row);
      const display = describeActivity(current);
      if (display.url) { setOpen(false); router.push(safeNotificationUrl(display.url)); }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function togglePush() {
    setBusy(true); setError(''); setNotice('');
    try {
      if (enabled) { await disablePushSubscription(); setEnabled(false); setNotice('Device notifications turned off.'); }
      else { setEnabled(await syncPushSubscription(true)); setNotice('Device notifications turned on.'); }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function sendTest() {
    setBusy(true); setError('');
    try { const result = await notificationRequest('/api/push/test', { method: 'POST' }); setNotice(result.message); refresh(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const { actions, waiting } = splitWork(mergePanelWork(records, panelRecords, billingRecords));
  const activityItems = openedNotification && !notifications.some(item => item._id === openedNotification._id)
    ? [openedNotification, ...notifications] : notifications;
  const unread = activityItems.filter(item => !item.read);
  const groups = groupActivity(activityItems).filter(group => !unreadOnly || group.unread > 0);
  // A device alert may refer to an older update outside the latest inbox page.
  if (openedNotification) groups.sort((a, b) => Number(b.items.some(item => item._id === openedNotification._id)) - Number(a.items.some(item => item._id === openedNotification._id)));
  const badgeCount = actions.length || unread.length;
  const navigateWork = record => { const path = isAdmin ? workListPath(record) : record.path; if (path) { setOpen(false); router.push(safeNotificationUrl(path)); } };

  function workCard(record, isWaiting = false) {
    if (record.type === 'panel-summary') return <article key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100/50">
      <div className="flex items-center gap-3"><EventIcon tone="review" /><h3 className="text-sm font-semibold text-slate-900">{record.no}</h3></div>
      <div className="mt-3 divide-y divide-slate-100">
        {record.createCount > 0 && <div className="flex items-center justify-between gap-3 py-2"><p className="text-xs leading-5 text-slate-600"><strong className="font-bold text-amber-700">{record.createCount}</strong> {isAdmin ? 'pending creation' : 'yet to be created'}</p><button type="button" onClick={() => navigateWork(record)} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-200">{isAdmin ? 'View pending' : 'Create'}<ArrowUpRight size={13} /></button></div>}
        {record.approvalCount > 0 && <div className="flex items-center justify-between gap-3 py-2"><p className="text-xs leading-5 text-slate-600"><strong className="font-bold text-blue-700">{record.approvalCount}</strong> {record.approvalCount === 1 ? 'document needs' : 'documents need'} approval</p><button type="button" onClick={() => navigateWork(record)} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100">{isAdmin ? 'View pending' : 'Review'}<ArrowUpRight size={13} /></button></div>}
      </div>
    </article>;
    const display = describeWork(record, { overview: isAdmin });
    return <article key={`${record.type}:${record.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100/50">
      <div className="flex gap-3"><EventIcon tone={isWaiting ? 'waiting' : display.tone} /><div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-slate-900">{display.title}</p>
        <p className="mt-1 break-words font-mono text-xs leading-5 text-slate-600">{record.no || record.module}</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">{display.message}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] text-slate-400">{record.module}</span>{record.path && <button type="button" onClick={() => navigateWork(record)} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-amber-500 ${isWaiting ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-amber-100 text-amber-950 hover:bg-amber-200'}`}>{isWaiting ? 'View status' : display.action}<ArrowUpRight size={13} /></button>}</div>
      </div></div>
    </article>;
  }

  const drawer = open && typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[1000] bg-slate-950/30" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="notification-center-title" className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l border-slate-200 bg-white text-slate-900 shadow-2xl" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <header className="shrink-0 border-b border-slate-100 px-5 pb-0 pt-5">
          <div className="flex items-start justify-between gap-3 pb-5">
            <div className="flex min-w-0 gap-3">{settings && <button type="button" onClick={() => setSettings(false)} aria-label="Back to notifications" className={iconButton}><ArrowLeft size={18} /></button>}<div><h2 id="notification-center-title" className="text-lg font-bold tracking-tight">{settings ? 'Notification settings' : 'Notifications'}</h2><p className="mt-1 text-xs text-slate-500">{settings ? 'Manage your notification preferences' : isAdmin ? 'Team progress and company activity' : 'Your work and recent updates'}</p></div></div>
            <div className="flex gap-0.5">{!settings && <><button type="button" onClick={refresh} disabled={loading} aria-label="Refresh notifications" className={iconButton}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button><button type="button" onClick={() => { setSettings(true); setError(''); setNotice(''); }} aria-label="Notification settings" className={iconButton}><Settings2 size={17} /></button></>}<button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close notifications" className={iconButton}><X size={20} /></button></div>
          </div>
          {!settings && <div role="tablist" aria-label="Notification sections" className="flex gap-5">{[['actions', isAdmin ? 'Work overview' : 'Action required', actions.length], ['activity', 'Activity', unread.length]].map(([value, label, count], index) => <button key={value} ref={element => { tabRefs.current[index] = element; }} id={`notification-tab-${value}`} type="button" role="tab" aria-selected={tab === value} aria-controls={`notification-panel-${value}`} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={event => { if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index; setTab(next ? 'activity' : 'actions'); tabRefs.current[next]?.focus(); } }} className={`flex items-center gap-2 border-b-2 pb-3 text-[13px] font-semibold transition ${tab === value ? 'border-amber-500 text-slate-950' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}<span className={`rounded-md px-1.5 py-0.5 text-[10px] ${tab === value ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-500'}`}>{count}</span></button>)}</div>}
        </header>
        {(error || notice) && <div role={error ? 'alert' : 'status'} className={`shrink-0 border-b px-5 py-3 text-xs leading-5 ${error ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-blue-100 bg-blue-50 text-blue-700'}`}>{error || notice}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {settings ? <div className="space-y-5 p-5">
            {isAdmin && <div className="rounded-2xl border border-slate-200 p-4"><h3 className="text-sm font-semibold">Admin push alerts</h3><p className="mt-2 text-xs leading-5 text-slate-500">Choose which alerts addressed to your account reach your devices. Routine alerts start off. Work overview and Activity remain available for every category.</p><div className="mt-3 space-y-3">{adminPushCategories.map(([key, label]) => <label key={key} className="flex items-center justify-between gap-3 text-xs text-slate-700"><span>{label}</span><input type="checkbox" checked={pushPreferences[key] === true} disabled={busy || !preferencesReady} onChange={event => changePushPreference(key, event.target.checked)} className="h-4 w-4 rounded accent-amber-600 disabled:opacity-40" /></label>)}</div><p className="mt-3 text-xs leading-5 text-slate-500">Saved across your devices. Enable device notifications below to receive pushes. Changes apply to future alerts; skipped alerts are not replayed.</p></div>}
            {canChooseActivity && <div className="rounded-2xl border border-slate-200 p-4"><h3 className="text-sm font-semibold">Activity view</h3><p className="mt-2 text-xs leading-5 text-slate-500">Choose company activity within your current company and branch access, or only updates addressed to your account. Read status is always yours.</p><div className="mt-3 space-y-2">{[['overview', 'Company/branch activity'], ['personal', 'Addressed to me']].map(([value, label]) => <button key={value} type="button" aria-pressed={activityView === value} disabled={busy} onClick={() => { requestVersion.current++; setNotifications([]); setOpenedNotification(null); setExpanded({}); setActivityView(value); }} className={`block w-full rounded-xl border px-3 py-2.5 text-left text-xs font-semibold ${activityView === value ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-600'}`}>{label}</button>)}</div><p className="mt-3 text-xs text-slate-500">You can change this view anytime during this session.</p></div>}
            <div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center gap-3"><EventIcon /><div><h3 className="text-sm font-semibold">Device notifications</h3><p className="mt-1 text-xs text-slate-500">{enabled ? 'On for this browser' : 'Currently turned off'}</p></div></div><p className="mt-4 text-xs leading-5 text-slate-500">Get a brief alert when Jaya ERP is in the background. Your inbox stays available either way.</p><button type="button" disabled={!supported || busy} onClick={togglePush} className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40">{busy ? 'Please wait...' : enabled ? 'Turn off on this device' : 'Enable notifications'}</button>{enabled && <button type="button" disabled={busy} onClick={sendTest} className="ml-2 mt-3 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold disabled:opacity-40">Send test</button>}{!supported && <p className="mt-3 text-xs leading-5 text-slate-500">Device alerts need HTTPS and a supported browser such as Chrome. The inbox still works here.</p>}</div>
            <div className="flex gap-3 px-1"><CheckCheck size={17} className="mt-0.5 shrink-0 text-slate-400" /><p className="text-xs leading-5 text-slate-500">Marking activity as read only clears its unread indicator. Pending work clears when the task is completed.</p></div>
          </div> : tab === 'actions' ? <div id="notification-panel-actions" role="tabpanel" aria-labelledby="notification-tab-actions" className="space-y-3 p-5">
            {workError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-700">{workError}</p>}
            {billingError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-700">{billingError}</p>}
            {panelWarning && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">{panelWarning}</p>}
            {actions.length > 0 && <p className="pb-1 text-xs text-slate-500">{actions.length} {isAdmin ? 'work groups with pending team work' : actions.length === 1 ? 'work group needs your attention' : 'work groups need your attention'}</p>}
            {!actions.length && !workError && !billingError && !panelWarning && <div className="px-4 py-12 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={26} strokeWidth={1.5} /></span><h3 className="mt-4 text-sm font-semibold">{loading ? 'Checking pending work...' : isAdmin ? 'No pending team work' : 'You are all caught up'}</h3><p className="mx-auto mt-2 max-w-[260px] text-xs leading-5 text-slate-500">{loading ? 'Loading the latest pending tasks.' : isAdmin ? 'No pending work was found within your company and branch access.' : 'No creation, approval, correction or billing work is waiting on you.'}</p></div>}
            {actions.map(record => workCard(record))}
            {waiting.length > 0 && <div className="border-t border-slate-100 pt-4"><button type="button" aria-expanded={showWaiting} onClick={() => setShowWaiting(value => !value)} className="flex w-full items-center justify-between text-xs font-medium text-slate-500"><span className="flex items-center gap-2"><Clock3 size={14} />Following other stages <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px]">{waiting.length}</span></span><ChevronDown size={15} className={showWaiting ? 'rotate-180' : ''} /></button>{showWaiting && <div className="mt-3 space-y-3">{waiting.map(record => workCard(record, true))}</div>}</div>}
          </div> : <div id="notification-panel-activity" role="tabpanel" aria-labelledby="notification-tab-activity">
            <div className="flex items-center justify-between gap-2 px-5 py-4"><label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={unreadOnly} onChange={event => setUnreadOnly(event.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 accent-amber-600" />Unread only</label><button type="button" disabled={!unread.length || busy} onClick={() => markRead(unread.map(item => item._id))} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 disabled:opacity-40"><CheckCheck size={14} />Mark all read</button></div>
            {activityError && <p role="alert" className="mx-5 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{activityError}</p>}
            {!groups.length && !activityError && <div className="px-5 py-12 text-center"><MessageSquare size={25} strokeWidth={1.5} className="mx-auto text-slate-300" /><h3 className="mt-4 text-sm font-semibold">{loading ? 'Loading activity...' : unreadOnly ? 'No unread updates' : 'No updates yet'}</h3><p className="mt-2 text-xs text-slate-500">Updates and workflow history will appear here.</p></div>}
            {groups.map(group => <article key={group.key} className={`border-t border-slate-100 px-5 py-4 ${group.unread ? 'bg-amber-50/30' : ''}`}>
              <div className="flex gap-3"><EventIcon tone={group.display.tone} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="text-[13px] font-semibold leading-5 text-slate-900">{group.display.title}</h3>{group.unread > 0 && <span aria-label="Unread" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />}</div>
                {group.display.reference && <p className="mt-1 break-words font-mono text-[11px] leading-5 text-slate-500">{group.display.reference}</p>}
                <p className={`mt-1.5 text-xs leading-5 text-slate-500 ${expanded[group.key] ? '' : 'line-clamp-2'}`}>{group.latest.message}</p>
                <time dateTime={group.latest.createdAt} className="mt-2 block text-[10px] text-slate-400">{shortTime(group.latest.createdAt)}</time>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">{group.display.url && <button type="button" disabled={busy} onClick={() => openRecord(group.latest)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 hover:text-amber-700 disabled:opacity-40">{group.display.openLabel}<ArrowUpRight size={12} /></button>}<button type="button" aria-expanded={Boolean(expanded[group.key])} onClick={() => setExpanded(value => ({ ...value, [group.key]: !value[group.key] }))} className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800">{group.items.length > 1 ? `${group.items.length} updates` : expanded[group.key] ? 'Less' : 'Details'}<ChevronDown size={12} className={expanded[group.key] ? 'rotate-180' : ''} /></button>{group.unread > 0 && <button type="button" disabled={busy} onClick={() => markRead(group.items.filter(item => !item.read).map(item => item._id))} className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 disabled:opacity-40"><Check size={12} />Mark read</button>}</div>
                {expanded[group.key] && group.items.length > 1 && <ol className="mt-4 space-y-3 border-l border-slate-200 pl-3">{group.items.slice(1).map(item => <li key={item._id}><p className="text-xs leading-5 text-slate-500">{item.message}</p><time dateTime={item.createdAt} className="mt-1 block text-[10px] text-slate-400">{shortTime(item.createdAt)}</time></li>)}</ol>}
              </div></div>
            </article>)}
          </div>}
        </div>
        {!settings && <footer className="shrink-0 border-t border-slate-100 px-5 py-3"><p className="text-[11px] leading-4 text-slate-400">{tab === 'actions' ? 'Tasks clear automatically when the work is completed.' : 'Recent updates · Read status does not change pending work.'}</p></footer>}
      </section>
    </div>, document.body,
  ) : null;

  return <><button ref={triggerRef} type="button" onClick={() => { setOpen(value => !value); setSettings(false); if (!open) refresh(); }} aria-label={`Notifications, ${actions.length} ${isAdmin ? 'pending work groups' : 'actions required'}, ${unread.length} unread updates`} aria-haspopup="dialog" aria-expanded={open} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"><Bell size={21} strokeWidth={1.7} />{badgeCount > 0 && <span className={`absolute -right-0.5 -top-0.5 flex min-w-[17px] items-center justify-center rounded-full border-2 border-slate-950 px-1 text-[9px] font-bold leading-[15px] ${actions.length ? 'bg-amber-400 text-amber-950' : 'bg-red-500 text-white'}`}>{badgeCount > 99 ? '99+' : badgeCount}</span>}</button>{drawer}</>;
}
