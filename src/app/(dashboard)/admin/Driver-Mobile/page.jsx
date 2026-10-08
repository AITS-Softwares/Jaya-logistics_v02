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

export default function DriverMobileAdminPage() {
  const { canView, canEdit, loading: permissionLoading } = usePermission();
  const [drivers, setDrivers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [trips, setTrips] = useState([]);
  const [cancelledTrips, setCancelledTrips] = useState([]);
  const [loadings, setLoadings] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [driverForm, setDriverForm] = useState({ displayName: "", mobile: "", pin: "" });
  const [assignment, setAssignment] = useState({ loadingId: "", driverId: "" });
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const refresh = async () => {
    setLoading(true); setError("");
    try {
      const [driverData, deviceData, tripData, cancelledTripData, loadingData, readinessData, alertData] = await Promise.all([
        request("/api/mobile/v1/admin/drivers"), request("/api/mobile/v1/admin/devices"),
        request("/api/mobile/v1/admin/trips?state=active"), request("/api/mobile/v1/admin/trips?state=cancelled"),
        request("/api/loading-panel?format=table"), request("/api/mobile/v1/admin/readiness"), request("/api/mobile/v1/admin/alerts/scan", { method: "POST", body: "{}" }),
      ]);
      setDrivers(driverData || []); setDevices(deviceData || []); setTrips(tripData || []); setCancelledTrips(cancelledTripData || []); setLoadings(loadingData || []); setReadiness(readinessData || null); setAlerts(alertData || []);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (!permissionLoading && canView(MODULE_NAME)) refresh(); }, [permissionLoading, canView]);

  const submitDriver = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      await request("/api/mobile/v1/admin/drivers", { method: "POST", body: JSON.stringify(driverForm) });
      setDriverForm({ displayName: "", mobile: "", pin: "" }); setMessage("Driver created. Assign a Loading Info below, then have the driver sign in to register their device."); await refresh();
    } catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  };
  const submitAssignment = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      await request("/api/mobile/v1/admin/trips", { method: "POST", body: JSON.stringify(assignment) });
      setAssignment({ loadingId: "", driverId: "" }); setMessage("Trip assigned. The driver will see it after their device is approved."); await refresh();
    } catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  };
  const changeDevice = async (deviceId, action) => {
    const reason = action === "revoke" ? window.prompt("Reason for revoking this device (optional):", "") || "revoked_by_staff" : "";
    setBusy(true); setError(""); setMessage("");
    try { await request(`/api/mobile/v1/admin/devices/${deviceId}`, { method: "PATCH", body: JSON.stringify({ action, reason }) }); setMessage(`Device ${action}d successfully.`); await refresh(); }
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
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-6"><div className="mx-auto max-w-7xl space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">Transport operations</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">Driver mobile setup</h1><p className="mt-1 max-w-2xl text-sm text-slate-600">Set up a driver, assign one existing Loading Info, then approve the driver’s phone. This page does not change Loading Info or the normal ERP workflow.</p></div><div className="flex gap-2"><Link href="/admin/Tracking-Plan" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700">Open tracking plan</Link><button onClick={refresh} disabled={loading || busy} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">{loading ? "Loading…" : "Refresh"}</button></div></header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
    {readiness && <div className={`rounded-xl border px-4 py-3 text-sm ${readiness.mobileEnabled && readiness.databaseConnected && readiness.dedicatedMobileSecretConfigured ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-yellow-300 bg-yellow-50 text-yellow-800"}`}><b>Mobile deployment status:</b> {readiness.mobileEnabled && readiness.databaseConnected && readiness.dedicatedMobileSecretConfigured ? "Ready for staging setup." : "Configuration needs attention."} <span className="ml-2">Rollout: {readiness.rolloutMode}{readiness.rolloutMode === "pilot" ? ` (${readiness.pilotDriversConfigured} approved pilot driver${readiness.pilotDriversConfigured === 1 ? "" : "s"})` : ""} · Active drivers: {readiness.drivers} · Pending phones: {readiness.pendingDevices} · Active trips: {readiness.activeTrips}</span></div>}
    <OperationalAlerts alerts={alerts} busy={busy} editable={editable} onAction={updateAlert} />
    {!editable && <div className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">You have view access only. Ask an administrator with Tracking Plan edit permission to create drivers, assignments, or device approvals.</div>}
    <section className="grid gap-5 lg:grid-cols-2">
      <Panel title="1. Create driver"><form onSubmit={submitDriver} className="grid gap-3 sm:grid-cols-2"><Input label="Driver name" value={driverForm.displayName} onChange={(displayName) => setDriverForm((value) => ({ ...value, displayName }))} placeholder="Driver full name" /><Input label="Mobile number" value={driverForm.mobile} onChange={(mobile) => setDriverForm((value) => ({ ...value, mobile }))} placeholder="9876543210" type="tel" /><Input label="First PIN" value={driverForm.pin} onChange={(pin) => setDriverForm((value) => ({ ...value, pin }))} placeholder="Minimum 4 characters" type="password" /><div className="flex items-end"><button disabled={!editable || busy} className="w-full rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 disabled:opacity-60">Create driver</button></div></form><p className="mt-3 text-xs text-slate-500">Use the same mobile number that is saved in the Loading Info driver field.</p></Panel>
      <Panel title="2. Assign loading to driver"><form onSubmit={submitAssignment} className="grid gap-3"><Select label="Loading Info / vehicle" value={assignment.loadingId} onChange={(loadingId) => setAssignment((value) => ({ ...value, loadingId }))} options={loadings.map((item) => ({ value: item._id, label: `${item.vehicleArrivalNo || "Loading"} — ${item.vehicleNo || item.vehicleInfo?.vehicleNo || "vehicle pending"}` }))} placeholder="Select existing Loading Info" /><Select label="Driver" value={assignment.driverId} onChange={(driverId) => setAssignment((value) => ({ ...value, driverId }))} options={drivers.filter((driver) => driver.status === "active").map((driver) => ({ value: driver.id, label: `${driver.displayName} (${driver.mobileE164})` }))} placeholder="Select driver" /><button disabled={!editable || busy || !assignment.loadingId || !assignment.driverId} className="rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 disabled:opacity-60">Assign trip</button></form></Panel>
    </section>
    <Panel title={`3. Approve driver phone (${devices.filter((device) => device.status === "pending").length} waiting)`}><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-2 pr-4">Driver</th><th className="pb-2 pr-4">Phone</th><th className="pb-2 pr-4">Device</th><th className="pb-2 pr-4">Status</th><th className="pb-2">Action</th></tr></thead><tbody>{devices.length === 0 ? <tr><td colSpan="5" className="py-6 text-slate-500">No phone has registered yet. Ask the driver to sign in to the mobile app first.</td></tr> : devices.map((device) => <tr key={device.id} className="border-b border-slate-100"><td className="py-3 pr-4 font-bold text-slate-900">{device.driver?.displayName || "Unknown driver"}</td><td className="py-3 pr-4 text-slate-600">{device.driver?.mobileE164 || "—"}</td><td className="py-3 pr-4 text-slate-600">{[device.manufacturer, device.model].filter(Boolean).join(" ") || "Android"}</td><td className="py-3 pr-4"><Status value={device.status} /></td><td className="py-3">{device.status === "pending" && <button disabled={!editable || busy} onClick={() => changeDevice(device.id, "approve")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">Approve</button>}{device.status === "approved" && <button disabled={!editable || busy} onClick={() => changeDevice(device.id, "revoke")} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-60">Revoke</button>}</td></tr>)}</tbody></table></div></Panel>
    <Panel title="Active assigned trips"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-2 pr-4">Loading</th><th className="pb-2 pr-4">Vehicle</th><th className="pb-2 pr-4">State</th><th className="pb-2 pr-4">Next step</th><th className="pb-2">Control</th></tr></thead><tbody>{trips.length === 0 ? <tr><td colSpan="5" className="py-6 text-slate-500">No active mobile trip has been assigned.</td></tr> : trips.map((trip) => <tr key={trip.id} className="border-b border-slate-100"><td className="py-3 pr-4 font-bold text-slate-900">{trip.loadingReference}</td><td className="py-3 pr-4 text-slate-600">{trip.vehicle?.vehicleNo || "—"}</td><td className="py-3 pr-4"><Status value={trip.state} /></td><td className="py-3 pr-4 text-slate-600">{trip.state === "assigned" ? "Driver starts trip in mobile app" : "Monitor in Tracking Plan"}</td><td className="flex gap-2 py-3">{<button type="button" disabled={historyLoading} onClick={() => viewHistory(trip)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">History</button>}<button type="button" disabled={!editable || busy} onClick={() => cancelTrip(trip)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60">Cancel trip</button></td></tr>)}</tbody></table></div><p className="mt-3 text-xs text-slate-500">Cancelling stops driver mobile access and active tracking for that mobile trip only. It never cancels or edits the original Loading Info.</p></Panel>
    {cancelledTrips.length > 0 && <Panel title="Recent cancelled mobile trips"><div className="flex flex-wrap gap-2">{cancelledTrips.map((trip) => <button key={trip.id} type="button" disabled={historyLoading} onClick={() => viewHistory(trip)} className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-left text-sm hover:bg-white"><b>{trip.loadingReference}</b><span className="ml-2 text-slate-500">{trip.vehicle?.vehicleNo || "Vehicle"}</span></button>)}</div></Panel>}
    {history && <TripHistory data={history} loading={historyLoading} onClose={() => setHistory(null)} />}
  </div></main>;
}

function OperationalAlerts({ alerts, busy, editable, onAction }) { return <section className={`rounded-xl border p-4 shadow-sm ${alerts.length ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-extrabold text-slate-900">Operational exceptions</h2><p className="mt-1 text-sm text-slate-600">Checked whenever this page refreshes. Tracking alerts close automatically when GPS recovers; driver issues need dispatcher resolution.</p></div><span className={`rounded-full px-3 py-1 text-sm font-bold ${alerts.length ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>{alerts.length ? `${alerts.length} needs attention` : "No open exceptions"}</span></div>{alerts.length > 0 && <div className="mt-4 space-y-2">{alerts.map((alert) => <div key={alert.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-white p-3 text-sm"><div><div className="font-bold capitalize text-slate-900">{alert.kind.replaceAll("_", " ")} · {alert.trip?.loadingReference || "Trip"}</div><div className="text-slate-600">{alert.message} {alert.trip?.vehicleNo ? `Vehicle: ${alert.trip.vehicleNo}.` : ""}</div><div className="mt-1 text-xs text-slate-500">Last detected: {new Date(alert.lastDetectedAt).toLocaleString()} · {alert.state}</div></div><div className="flex gap-2">{alert.state === "open" && <button type="button" disabled={!editable || busy} onClick={() => onAction(alert, "acknowledge")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-60">Acknowledge</button>}<button type="button" disabled={!editable || busy} onClick={() => onAction(alert, "resolve")} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">Resolve</button></div></div>)}</div>}</section>; }
function Panel({ title, children }) { return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-base font-extrabold text-slate-900">{title}</h2>{children}</section>; }
function Input({ label, value, onChange, ...props }) { return <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200" {...props} /></label>; }
function Select({ label, value, onChange, options, placeholder }) { return <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"><option value="">{placeholder}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function Status({ value }) { const tone = value === "approved" || value === "started" || value === "in_transit" ? "bg-emerald-100 text-emerald-800" : value === "pending" || value === "assigned" ? "bg-yellow-100 text-yellow-800" : "bg-slate-100 text-slate-700"; return <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${tone}`}>{String(value || "unknown").replaceAll("_", " ")}</span>; }
function TripHistory({ data, loading, onClose }) { return <Panel title={`Trip history — ${data.trip.loadingReference}`}><div className="mb-4 flex items-center justify-between text-sm text-slate-600"><span>{data.trip.vehicleNo || "Vehicle"} · current state: <b>{data.trip.state}</b></span><button type="button" onClick={onClose} className="font-bold text-slate-700 underline">Close</button></div>{loading ? <p className="text-sm text-slate-500">Loading history…</p> : <ol className="space-y-3 border-l-2 border-yellow-300 pl-4">{data.events.length === 0 ? <li className="text-sm text-slate-500">No mobile events recorded yet.</li> : data.events.map((event) => <li key={event.id} className="relative text-sm"><span className="absolute -left-[1.43rem] top-1 h-3 w-3 rounded-full bg-yellow-500 ring-4 ring-yellow-50" /><div className="font-bold capitalize text-slate-900">{event.type.replaceAll("_", " ")} <span className="font-normal text-slate-500">by {event.source}</span></div><div className="text-xs text-slate-500">{new Date(event.occurredAt).toLocaleString()}</div>{Object.keys(event.payload || {}).length > 0 && <div className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">{Object.entries(event.payload).map(([key, value]) => <span key={key} className="mr-3"><b>{key}:</b> {String(value)}</span>)}</div>}</li>)}</ol>}</Panel>; }
