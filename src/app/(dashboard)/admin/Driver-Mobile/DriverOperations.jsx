"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePermission } from "../hooks/usePermission";

const MODULE_NAME = "Tracking Plan";


function authHeaders(json = false) {
  const token = typeof window === "undefined" ? "" : localStorage.getItem("token") || "";
  return { Authorization: `Bearer ${token}`, ...(json ? { "Content-Type": "application/json" } : {}) };
}

async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { ...authHeaders(Boolean(options.body)), ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to complete this request.");
  return payload.data;
}

export default function DriverOperations() {
  const { canView, canEdit, loading: permissionLoading } = usePermission();
  const [devices, setDevices] = useState([]);
  const [trips, setTrips] = useState([]);
  const [cancelledTrips, setCancelledTrips] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const refresh = async () => {
    setLoading(true); setError("");
    try {
      const [deviceData, tripData, cancelledTripData, alertData] = await Promise.all([
        request("/api/mobile/v1/admin/devices"),
        request("/api/mobile/v1/admin/trips?state=active"), request("/api/mobile/v1/admin/trips?state=cancelled"),
        request("/api/mobile/v1/admin/alerts/scan", { method: "POST", body: "{}" }),
      ]);
      setDevices(deviceData || []); setTrips(tripData || []); setCancelledTrips(cancelledTripData || []); setAlerts(alertData || []);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (!permissionLoading && canView(MODULE_NAME)) refresh(); }, [permissionLoading, canView]);


  useEffect(() => {
    if (permissionLoading || !canView(MODULE_NAME) || busy) return;
    let active = true;
    const timer = window.setInterval(() => {
      request("/api/mobile/v1/admin/alerts/scan").then((items) => { if (active) setAlerts(items || []); }).catch(() => {});
    }, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [permissionLoading, canView, busy]);

  const changeDevice = async (deviceId, action) => {
    if (action === "approve" && !window.confirm("Approve this phone? Any other approved phone for this driver will lose access. Phone transfer is blocked while the other phone is actively tracking a trip.")) return;
    if (action === "unlink" && !window.confirm("Release this phone from its current driver? It can then be registered by another driver, but it cannot be unlinked during an active or in-progress trip.")) return;
    const reason = action === "revoke"
      ? window.prompt("Reason for revoking this device (optional):", "") || "revoked_by_staff"
      : action === "unlink"
        ? window.prompt("Reason for releasing this phone (optional):", "") || "released_for_reassignment"
        : "";
    setBusy(true); setError(""); setMessage("");
    try { await request(`/api/mobile/v1/admin/devices/${deviceId}`, { method: "PATCH", body: JSON.stringify({ action, reason }) }); setMessage(action === "unlink" ? "Phone released. Another driver can now sign in on this phone and request approval." : `Device ${action}d successfully.`); await refresh(); }
    catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  };
  const cancelTrip = async (trip) => {
    const reason = window.prompt(`Cancel mobile trip ${trip.loadingReference}? Enter the reason:`, "");
    if (!reason?.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await request(`/api/mobile/v1/admin/trips/${trip.id}`, { method: "PATCH", body: JSON.stringify({ action: "cancel", reason }) });
      setMessage("Mobile trip cancelled. Driver access and any active tracking session were stopped; the original Loading Info was not changed."); await refresh();
    } catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  };
  const viewHistory = async (trip) => {
    setHistoryLoading(true); setError("");
    try { setHistory(await request(`/api/mobile/v1/admin/trips/${trip.id}/events`)); }
    catch (requestError) { setError(requestError.message); } finally { setHistoryLoading(false); }
  };
  const updateAlert = async (alert, action) => {
    const note = action === "resolve" ? window.prompt("How was this exception resolved?", "") : "";
    if (action === "resolve" && !note?.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try { await request(`/api/mobile/v1/admin/alerts/${alert.id}`, { method: "PATCH", body: JSON.stringify({ action, note }) }); setMessage(action === "resolve" ? "Exception resolved and recorded." : "Exception acknowledged."); await refresh(); }
    catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  };
  if (permissionLoading) return <div className="p-6 text-sm text-slate-600">Checking permissions…</div>;
  if (!canView(MODULE_NAME)) return <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">You need Tracking Plan permission to manage the driver mobile workflow.</div>;
  const editable = canEdit(MODULE_NAME);
  const pendingPhones = devices.filter((device) => device.status === "pending");
  const otherPhones = devices.filter((device) => device.status !== "pending");
  return <section aria-label="Operations" className="space-y-4">
    <div className="flex justify-end"><button type="button" onClick={refresh} disabled={loading || busy} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold disabled:opacity-60">{loading ? "Refreshing…" : "Refresh operations"}</button></div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
    {alerts.length > 0 && <OperationalAlerts alerts={alerts} busy={busy} editable={editable} onAction={updateAlert} />}
    {!editable && <div className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">You have view access only. Ask an administrator with Tracking Plan edit permission to manage trips or phone approvals.</div>}
    {pendingPhones.length > 0 && <Panel title="Pending phone approvals"><PhoneTable phones={pendingPhones} editable={editable} busy={busy} changeDevice={changeDevice} /></Panel>}
    <Panel title="Active assigned trips"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-2 pr-4">Loading</th><th className="pb-2 pr-4">Vehicle</th><th className="pb-2 pr-4">State</th><th className="pb-2 pr-4">Next step</th><th className="pb-2">Control</th></tr></thead><tbody>{trips.length === 0 ? <tr><td colSpan="5" className="py-6 text-slate-500">No active mobile trip has been assigned.</td></tr> : trips.map((trip) => <tr key={trip.id} className="border-b border-slate-100"><td className="py-3 pr-4 font-bold text-slate-900">{trip.loadingReference}</td><td className="py-3 pr-4 text-slate-600">{trip.vehicle?.vehicleNo || "—"}</td><td className="py-3 pr-4"><Status value={trip.state} /></td><td className="py-3 pr-4 text-slate-600">{trip.state === "assigned" ? "Driver starts trip in mobile app" : "Monitor in Tracking Plan"}</td><td className="flex flex-wrap gap-2 py-3">{trip.loadingId && <Link href={{ pathname: "/admin/Tracking-Plan", query: { loadingId: trip.loadingId } }} className="rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-1.5 text-xs font-bold text-yellow-950">View tracking</Link>}{<button type="button" disabled={historyLoading} onClick={() => viewHistory(trip)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">History</button>}<button type="button" disabled={!editable || busy} onClick={() => cancelTrip(trip)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60">Cancel trip</button></td></tr>)}</tbody></table></div><p className="mt-3 text-xs text-slate-500">Cancelling stops driver mobile access and active tracking for that mobile trip only. It never cancels or edits the original Loading Info.</p></Panel>
    {cancelledTrips.length > 0 && <Panel title="Recent cancelled mobile trips"><div className="flex flex-wrap gap-2">{cancelledTrips.map((trip) => <button key={trip.id} type="button" disabled={historyLoading} onClick={() => viewHistory(trip)} className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-left text-sm hover:bg-white"><b>{trip.loadingReference}</b><span className="ml-2 text-slate-500">{trip.vehicle?.vehicleNo || "Vehicle"}</span></button>)}</div></Panel>}
    {otherPhones.length > 0 && <Panel title="Manage registered phones">
      <PhoneTable phones={otherPhones} editable={editable} busy={busy} changeDevice={changeDevice} />
    </Panel>}
    {history && <TripHistory data={history} loading={historyLoading} onClose={() => setHistory(null)} />}
  </section>;
}

function OperationalAlerts({ alerts, busy, editable, onAction }) { return <section className={`rounded-xl border p-4 shadow-sm ${alerts.length ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-extrabold text-slate-900">Needs attention</h2><p className="mt-1 text-sm text-slate-600">Checked whenever this page refreshes. Tracking alerts close automatically when GPS recovers; driver issues need dispatcher resolution.</p></div><span className={`rounded-full px-3 py-1 text-sm font-bold ${alerts.length ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>{alerts.length ? `${alerts.length} needs attention` : "No open exceptions"}</span></div>{alerts.length > 0 && <div className="mt-4 space-y-2">{alerts.map((alert) => <div key={alert.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-white p-3 text-sm"><div><div className="font-bold capitalize text-slate-900">{alert.kind.replaceAll("_", " ")} · {alert.trip?.loadingReference || "Trip"}</div><div className="text-slate-600">{alert.message} {alert.trip?.vehicleNo ? `Vehicle: ${alert.trip.vehicleNo}.` : ""}</div><div className="mt-1 text-xs text-slate-500">Last detected: {new Date(alert.lastDetectedAt).toLocaleString()} · {alert.state}</div></div><div className="flex gap-2">{alert.state === "open" && <button type="button" disabled={!editable || busy} onClick={() => onAction(alert, "acknowledge")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-60">Acknowledge</button>}<button type="button" disabled={!editable || busy} onClick={() => onAction(alert, "resolve")} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">Resolve</button></div></div>)}</div>}</section>; }
function Panel({ id, title, children }) { return <section id={id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-base font-extrabold text-slate-900">{title}</h2>{children}</section>; }
function PhoneTable({ phones, editable, busy, changeDevice }) { return <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-2 pr-4">Driver</th><th className="pb-2 pr-4">Phone</th><th className="pb-2 pr-4">Device</th><th className="pb-2 pr-4">Status</th><th className="pb-2">Action</th></tr></thead><tbody>{phones.map((device) => <tr key={device.id} className="border-b border-slate-100"><td className="py-3 pr-4 font-bold text-slate-900">{device.driver?.displayName || "Released phone"}</td><td className="py-3 pr-4 text-slate-600">{device.driver?.mobileE164 || "—"}</td><td className="py-3 pr-4 text-slate-600"><p>{[device.manufacturer, device.model].filter(Boolean).join(" ") || "Android"}</p><p className="mt-1 text-xs text-slate-400">{device.installationLabel || "Existing installation"}{device.appVersion ? ` · App ${device.appVersion}` : ""}</p></td><td className="py-3 pr-4"><Status value={device.status} /></td><td className="py-3"><div className="flex flex-wrap gap-2">{device.status === "pending" && <button disabled={!editable || busy} onClick={() => changeDevice(device.id, "approve")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">Approve</button>}{device.status === "approved" && <button disabled={!editable || busy} onClick={() => changeDevice(device.id, "revoke")} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-60">Revoke</button>}{device.status !== "unlinked" && <button disabled={!editable || busy} onClick={() => changeDevice(device.id, "unlink")} className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-800 disabled:opacity-60">Release phone</button>}</div></td></tr>)}</tbody></table></div>; }
function Status({ value }) { const tone = value === "approved" || value === "started" || value === "in_transit" ? "bg-emerald-100 text-emerald-800" : value === "pending" || value === "assigned" ? "bg-yellow-100 text-yellow-800" : "bg-slate-100 text-slate-700"; return <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${tone}`}>{String(value || "unknown").replaceAll("_", " ")}</span>; }
function TripHistory({ data, loading, onClose }) { return <Panel title={`Trip history — ${data.trip.loadingReference}`}><div className="mb-4 flex items-center justify-between text-sm text-slate-600"><span>{data.trip.vehicleNo || "Vehicle"} · current state: <b>{data.trip.state}</b></span><button type="button" onClick={onClose} className="font-bold text-slate-700 underline">Close</button></div>{loading ? <p className="text-sm text-slate-500">Loading history…</p> : <ol className="space-y-3 border-l-2 border-yellow-300 pl-4">{data.events.length === 0 ? <li className="text-sm text-slate-500">No mobile events recorded yet.</li> : data.events.map((event) => <li key={event.id} className="relative text-sm"><span className="absolute -left-[1.43rem] top-1 h-3 w-3 rounded-full bg-yellow-500 ring-4 ring-yellow-50" /><div className="font-bold capitalize text-slate-900">{event.type.replaceAll("_", " ")} <span className="font-normal text-slate-500">by {event.source}</span></div><div className="text-xs text-slate-500">{new Date(event.occurredAt).toLocaleString()}</div>{Object.keys(event.payload || {}).length > 0 && <div className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">{Object.entries(event.payload).map(([key, value]) => <span key={key} className="mr-3"><b>{key}:</b> {String(value)}</span>)}</div>}</li>)}</ol>}</Panel>; }
