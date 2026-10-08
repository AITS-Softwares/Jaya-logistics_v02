"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, CircleDot,
  ClipboardCheck, LoaderCircle, LockKeyhole, LogOut, MapPin, PackageCheck,
  Radio, RefreshCw, ShieldCheck, Truck,
} from "lucide-react";
import { requestNativeTrackingPermissions, startNativeTracking, stopNativeTracking, supportsNativeTracking } from "@/lib/driverNativeTracking";

const INSTALLATION_KEY = "jaya_driver_installation_id";

function installationId() {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(INSTALLATION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(INSTALLATION_KEY, id);
  }
  return id;
}

function createKey() {
  return crypto.randomUUID();
}

const api = async (path, { token, body, method = "GET" } = {}) => {
  const response = await fetch(`/api/mobile/v1${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    const error = new Error(data.message || "Unable to complete this request.");
    error.code = data.code;
    error.status = response.status;
    throw error;
  }
  return data.data;
};

const stateCopy = {
  assigned: "Ready to start",
  started: "At pickup",
  at_pickup: "Ready to depart",
  in_transit: "On the road",
  at_stop: "At stop",
  delivered: "Delivered",
};

const actionCopy = {
  ACKNOWLEDGE: "Acknowledge trip",
  START_TRIP: "Start trip",
  AT_PICKUP: "At pickup",
  DEPART: "Start delivery",
  ARRIVE_STOP: "Arrived at stop",
  DELIVER: "Confirm delivery",
  COMPLETE: "Complete trip",
};

export default function DriverApp() {
  const [token, setToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [driver, setDriver] = useState(null);
  const [device, setDevice] = useState(null);
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const signedIn = Boolean(token && driver);
  const approved = device?.status === "approved";

  const refreshTrips = async (activeToken = token) => {
    const data = await api("/trips?state=active", { token: activeToken });
    setTrips(data);
    setSelectedTrip((current) => data.find((trip) => trip.id === current?.id) || data[0] || null);
  };

  // Tokens deliberately remain in memory for this phase. Secure native token
  // storage is introduced with the Phase 4 Android bridge; never persist them
  // in localStorage or ship a Phase 3 screen as a tracking release.
  const registerInstallation = async (accessToken) => {
    const data = await api("/devices/register", {
      method: "POST",
      token: accessToken,
      body: {
        installationId: installationId(),
        manufacturer: navigator.userAgent.includes("Android") ? "Android" : "Browser preview",
        model: navigator.platform || "Unknown",
        appVersion: "phase-3-preview",
      },
    });
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setDevice({ id: data.deviceId, status: data.deviceStatus });
    return data;
  };

  const signIn = async ({ mobile, pin }) => {
    setLoading(true); setError(""); setMessage("");
    try {
      const data = await api("/auth/login", { method: "POST", body: { mobile, pin } });
      setDriver(data.driver);
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      const registration = await registerInstallation(data.accessToken);
      if (registration.deviceStatus === "approved") {
        await refreshTrips(registration.accessToken);
        setMessage("Signed in. Your assigned trips are ready.");
      } else {
        setMessage("Your device is waiting for dispatcher approval. Keep this screen open, then tap Refresh after approval.");
      }
    } catch (requestError) {
      setError(requestError.message);
      setToken(""); setRefreshToken(""); setDriver(null); setDevice(null);
    } finally { setLoading(false); }
  };

  const refreshAccess = async () => {
    if (!refreshToken) return false;
    try {
      const data = await api("/auth/refresh", { method: "POST", body: { refreshToken } });
      setToken(data.accessToken); setRefreshToken(data.refreshToken);
      return data.accessToken;
    } catch { return false; }
  };

  const refreshDevice = async () => {
    setLoading(true); setError("");
    try {
      const me = await api("/me", { token });
      setDriver(me.driver); setDevice(me.device);
      if (me.device.status === "approved") {
        await refreshTrips(token);
        setMessage("Device approved. Your current trips have been refreshed.");
      } else {
        setMessage("Device is still awaiting approval. Ask your dispatcher to approve it.");
      }
    } catch (requestError) {
      if (requestError.status === 401 && await refreshAccess()) {
        setMessage("Session refreshed. Tap Refresh approval once more.");
      } else setError(requestError.message);
    } finally { setLoading(false); }
  };

  const act = async (action, issueType = "") => {
    if (!selectedTrip) return;
    setLoading(true); setError(""); setMessage("");
    try {
      const data = await api(`/trips/${selectedTrip.id}/actions`, {
        method: "POST", token,
        body: { action, issueType, idempotencyKey: createKey(), expectedVersion: selectedTrip.version },
      });
      setSelectedTrip(data);
      setTrips((items) => items.map((trip) => trip.id === data.id ? data : trip));
      if (action === "START_TRIP") {
        const permission = await requestNativeTrackingPermissions();
        if (permission.ready) {
          const tracking = await api("/tracking/start", { method: "POST", token, body: { tripId: data.id } });
          await startNativeTracking({ tripId: data.id, sessionId: tracking.sessionId, apiBaseUrl: window.location.origin, accessToken: token, refreshToken, policy: tracking.policy });
          setMessage("Trip started. Location tracking is active in the notification bar.");
        } else if (permission.browserPreview) {
          setMessage("Trip started. Background tracking begins when this flow runs inside the Android driver app.");
        } else {
          setMessage("Trip started, but precise location permission is still required before tracking can begin.");
        }
      }
      if (action === "COMPLETE" && supportsNativeTracking()) await stopNativeTracking({ reason: "trip_completed" });
      if (!['START_TRIP', 'COMPLETE'].includes(action)) setMessage(action === "REPORT_ISSUE" ? "Issue shared with operations." : "Trip status updated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally { setLoading(false); }
  };

  const signOut = async () => {
    try { if (token) await api("/auth/logout", { method: "POST", token }); } catch { /* local reset is still safe */ }
    setToken(""); setRefreshToken(""); setDriver(null); setDevice(null); setTrips([]); setSelectedTrip(null); setMessage(""); setError("");
  };

  if (!signedIn) return <LoginScreen onSubmit={signIn} loading={loading} error={error} />;
  if (!approved) return <AwaitingApproval driver={driver} device={device} onRefresh={refreshDevice} onLogout={signOut} loading={loading} error={error} message={message} />;
  return <TripHome driver={driver} trips={trips} selectedTrip={selectedTrip} onSelect={setSelectedTrip} onAction={act} onRefresh={() => refreshTrips()} onLogout={signOut} loading={loading} error={error} message={message} />;
}

function Brand({ compact = false }) {
  return <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/20"><Truck size={compact ? 21 : 24} strokeWidth={2.6} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Jaya Logistics</p><p className="text-base font-extrabold tracking-tight text-white">Driver Connect</p></div></div>;
}

function LoginScreen({ onSubmit, loading, error }) {
  const [mobile, setMobile] = useState(""); const [pin, setPin] = useState("");
  return <main className="min-h-screen bg-slate-950 text-white"><div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8"><Brand /><div className="my-auto"><p className="mt-12 text-sm font-bold uppercase tracking-[0.16em] text-amber-300">Your work, in one place</p><h1 className="mt-3 text-4xl font-black leading-tight tracking-tight">Every trip, clear and under control.</h1><p className="mt-4 text-base leading-7 text-slate-300">Sign in to see only the trips assigned to you. Your office ERP screens stay private.</p><form className="mt-10 space-y-4 rounded-3xl bg-white p-5 text-slate-900 shadow-2xl shadow-black/30" onSubmit={(event) => { event.preventDefault(); onSubmit({ mobile, pin }); }}><Field label="Mobile number" type="tel" value={mobile} onChange={setMobile} placeholder="98765 43210" autoComplete="tel" /><Field label="Driver PIN" type="password" value={pin} onChange={setPin} placeholder="Your 4-digit or company PIN" autoComplete="current-password" /><p className="text-xs leading-5 text-slate-500"><LockKeyhole size={13} className="mr-1 inline" />Use the PIN given by your dispatcher. Do not share it.</p>{error && <Notice tone="error">{error}</Notice>}<button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-4 font-bold text-white transition hover:bg-slate-800 disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" size={19} /> : "Sign in securely"}<ArrowRight size={18} /></button></form></div><p className="text-center text-xs leading-5 text-slate-500">Tracking will be enabled only during an active trip after you approve location permissions.</p></div></main>;
}

function AwaitingApproval({ driver, device, onRefresh, onLogout, loading, error, message }) {
  return <main className="min-h-screen bg-slate-950 px-5 py-8 text-white"><div className="mx-auto max-w-md"><Brand /><section className="mt-16 rounded-3xl bg-slate-900 p-7 ring-1 ring-white/10"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/15 text-amber-300"><ShieldCheck size={29} /></div><h1 className="mt-6 text-2xl font-black">Hi, {driver?.displayName}</h1><p className="mt-2 leading-7 text-slate-300">Your device has been registered. It needs a one-time approval from your dispatcher before it can show trip information.</p><div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4"><p className="text-sm font-bold text-amber-200">Device status: {device?.status || "not registered"}</p><p className="mt-1 text-xs leading-5 text-amber-100/75">Ask operations to approve this device, then tap refresh.</p></div>{message && <Notice>{message}</Notice>}{error && <Notice tone="error">{error}</Notice>}<button onClick={onRefresh} disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-4 font-bold text-slate-950 disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" size={19} /> : <RefreshCw size={18} />} Refresh approval</button><button onClick={onLogout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/5"><LogOut size={16} /> Sign out</button></section></div></main>;
}

function TripHome({ driver, trips, selectedTrip, onSelect, onAction, onRefresh, onLogout, loading, error, message }) {
  return <main className="min-h-screen bg-slate-100 text-slate-950"><header className="bg-slate-950 px-5 pb-8 pt-7 text-white"><div className="mx-auto max-w-3xl"><div className="flex items-center justify-between gap-3"><Brand compact /><button onClick={onLogout} aria-label="Sign out" className="rounded-xl p-2 text-slate-300 hover:bg-white/10"><LogOut size={19} /></button></div><div className="mt-8 flex items-end justify-between gap-3"><div><p className="text-sm text-slate-300">Welcome back</p><h1 className="text-2xl font-black">{driver.displayName}</h1></div><button onClick={onRefresh} disabled={loading} className="rounded-xl bg-white/10 p-3 text-white hover:bg-white/15"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button></div></div></header><div className="mx-auto max-w-3xl px-5 pb-10"><div className="-mt-4 rounded-2xl bg-white p-3 shadow-lg shadow-slate-900/10"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Radio size={19} /></span><div><p className="text-sm font-extrabold">Trip access active</p><p className="text-xs text-slate-500">Location tracking runs only during an active trip.</p></div></div></div>{message && <Notice>{message}</Notice>}{error && <Notice tone="error">{error}</Notice>}<section className="mt-7"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black">My active trips</h2><span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">{trips.length}</span></div>{trips.length === 0 ? <EmptyTrips /> : <div className="space-y-3">{trips.map((trip) => <button key={trip.id} onClick={() => onSelect(trip)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedTrip?.id === trip.id ? "border-amber-400 bg-amber-50 shadow-sm" : "border-slate-200 bg-white"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{trip.loadingReference}</p><p className="mt-1 font-extrabold">{trip.vehicle?.vehicleNo || "Vehicle pending"}</p></div><StatePill state={trip.state} /></div><p className="mt-3 line-clamp-1 text-sm text-slate-600">{trip.stops?.[0]?.city || trip.stops?.[0]?.address || "Route awaiting address"} <ArrowRight className="mx-1 inline" size={14} /> {trip.stops?.at(-1)?.city || trip.stops?.at(-1)?.address || "Destination"}</p></button>)}</div>}</section>{selectedTrip && <TripDetail trip={selectedTrip} onAction={onAction} loading={loading} />}</div></main>;
}

function TripDetail({ trip, onAction, loading }) {
  const primary = trip.allowedActions?.find((action) => action !== "ACKNOWLEDGE" && action !== "REPORT_ISSUE");
  const [issuesOpen, setIssuesOpen] = useState(false);
  return <section className="mt-7 overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/10"><div className="bg-slate-950 p-5 text-white"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-amber-300">Current trip</p><h2 className="mt-1 text-xl font-black">{trip.loadingReference}</h2></div><StatePill state={trip.state} dark /></div><div className="mt-4 flex items-center gap-2 text-sm text-slate-300"><Truck size={16} className="text-amber-300" />{trip.vehicle?.vehicleNo}</div></div><div className="p-5"><div className="space-y-0">{trip.stops?.map((stop, index) => <div key={`${stop.sequence}-${stop.type}`} className="flex gap-3"><div className="flex flex-col items-center"><span className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${stop.type === "pickup" ? "bg-amber-400 text-slate-950" : "bg-slate-900 text-white"}`}>{stop.type === "pickup" ? <PackageCheck size={15} /> : <MapPin size={15} />}</span>{index < trip.stops.length - 1 && <span className="my-1 h-10 w-px bg-slate-200" />}</div><div className="pb-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{stop.type === "pickup" ? "Pickup" : `Drop ${stop.sequence - 1}`}</p><p className="mt-0.5 font-bold">{stop.label || stop.city || "Stop"}</p><p className="mt-0.5 text-sm leading-5 text-slate-600">{stop.address || "Address will be confirmed by operations"}</p></div></div>)}</div>{primary && <button disabled={loading} onClick={() => onAction(primary)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-4 font-extrabold text-slate-950 transition hover:bg-amber-300 disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" size={19} /> : <ClipboardCheck size={19} />}{actionCopy[primary]}</button>}<button onClick={() => setIssuesOpen((open) => !open)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-700"><AlertTriangle size={17} className="text-amber-600" /> Report an issue</button>{issuesOpen && <div className="mt-3 grid grid-cols-2 gap-2">{["breakdown", "traffic", "fuel", "waiting"].map((issue) => <button key={issue} disabled={loading} onClick={() => { onAction("REPORT_ISSUE", issue); setIssuesOpen(false); }} className="rounded-xl bg-slate-100 px-3 py-3 text-sm font-bold capitalize text-slate-700 hover:bg-slate-200">{issue}</button>)}</div>}</div></section>;
}

function Field({ label, value, onChange, ...props }) { return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100" required {...props} /></label>; }
function StatePill({ state, dark }) { return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${dark ? "bg-white/10 text-amber-200" : "bg-slate-100 text-slate-700"}`}>{stateCopy[state] || state}</span>; }
function Notice({ children, tone }) { return <div className={`mt-4 rounded-xl px-3 py-3 text-sm leading-5 ${tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{children}</div>; }
function EmptyTrips() { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center"><CircleDot className="mx-auto text-slate-400" size={28} /><p className="mt-3 font-extrabold">No active trip right now</p><p className="mt-1 text-sm leading-6 text-slate-500">When dispatch assigns a trip to you, it will appear here.</p></div>; }
