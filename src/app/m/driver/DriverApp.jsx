"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, CircleDot,
  ClipboardCheck, LoaderCircle, LockKeyhole, LogOut, MapPin, PackageCheck,
  Radio, RefreshCw, ShieldCheck, Truck,
} from "lucide-react";
import { clearNativeDriverSession, loadNativeDriverSession, loadPendingTripActions, nativeDriverDeviceInfo, nativeTrackingHealth, requestNativeTrackingPermissions, resumeSavedTracking, saveNativeDriverSession, savePendingTripActions, startNativeTracking, stopNativeTracking, supportsNativeTracking } from "@/lib/driverNativeTracking";

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
  started: "Trip started",
  at_pickup: "Ready to depart",
  in_transit: "On the road",
  at_stop: "At stop",
  delivered: "Delivered",
};

const actionCopy = {
  ACKNOWLEDGE: "Acknowledge trip",
  START_DELIVERY: "Start delivery",
  AT_PICKUP: "Confirm arrival at pickup",
  DEPART: "Depart for next stop",
  ARRIVE_STOP: "Confirm arrival at stop",
  DELIVER: "Confirm delivery",
  COMPLETE: "Confirm trip complete",
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
  const [restoringSession, setRestoringSession] = useState(true);
  const [sessionNotice, setSessionNotice] = useState("");
  const [trackingHealth, setTrackingHealth] = useState(null);
  const [history, setHistory] = useState(null);
  const [pendingActions, setPendingActions] = useState([]);
  const pendingBusy = useRef(false);
  const refreshInFlight = useRef(null);
  const restoreInFlight = useRef(null);

  const signedIn = Boolean(token && driver);
  const approved = device?.status === "approved";


  const refreshTrips = async (activeToken = token) => {
    try {
      const data = await driverRequest("/trips?state=active", { token: activeToken });
      setTrips(data);
      setSelectedTrip((current) => data.find((trip) => trip.id === current?.id) || data[0] || null);
    } catch (requestError) {
      if (requestError.code === "DEVICE_NOT_APPROVED" || requestError.code === "DEVICE_REQUIRED") {
        const me = await api("/me", { token: activeToken }).catch(() => null);
        if (me?.device) { setDriver(me.driver); setDevice(me.device); }
      }
      throw requestError;
    }
  };

  // The access token stays in memory. On Android only, the refresh token is
  // encrypted natively so closing the app does not force a new approval.
  const registerInstallation = async (accessToken) => {
    const deviceInfo = await nativeDriverDeviceInfo();
    const data = await api("/devices/register", {
      method: "POST",
      token: accessToken,
      body: {
        installationId: installationId(),
        manufacturer: deviceInfo.manufacturer,
        model: [deviceInfo.model, deviceInfo.androidVersion ? `Android ${deviceInfo.androidVersion}` : ""].filter(Boolean).join(" • "),
        appVersion: deviceInfo.appVersion,
      },
    });
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setDevice({ id: data.deviceId, status: data.deviceStatus });
    await saveNativeDriverSession(data.refreshToken);
    return data;
  };

  const finishSignIn = async (accessToken) => {
    const registration = await registerInstallation(accessToken);
    if (registration.deviceStatus === "approved") {
      await refreshTrips(registration.accessToken);
      setMessage("Signed in. Your assigned trips are ready.");
    } else {
      setMessage(registration.registrationState === "reassigned"
        ? "This phone was assigned to your account and is waiting for dispatcher approval."
        : "Your phone is waiting for dispatcher approval. Keep this screen open, then tap Refresh after approval.");
    }
  };

  const signIn = async ({ mobile, pin }) => {
    setLoading(true); setError(""); setMessage("");
    try {
      const data = await api("/auth/login", { method: "POST", body: { mobile, pin } });
      setDriver(data.driver);
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      await finishSignIn(data.accessToken);
    } catch (requestError) {
      setError(requestError.message);
      setToken(""); setRefreshToken(""); setDriver(null); setDevice(null);
    } finally { setLoading(false); }
  };

  const refreshAccess = async () => {
    if (!refreshToken) return false;
    if (refreshInFlight.current) return refreshInFlight.current;
    refreshInFlight.current = api("/auth/refresh", { method: "POST", body: { refreshToken } }).then(async (data) => {
      setToken(data.accessToken); setRefreshToken(data.refreshToken);
      await saveNativeDriverSession(data.refreshToken);
      return data;
    }).catch(() => false).finally(() => { refreshInFlight.current = null; });
    return refreshInFlight.current;
  };

  const driverRequest = async (path, options = {}) => {
    try {
      return await api(path, { token, ...options });
    } catch (error) {
      if (error.status !== 401) throw error;
      const renewed = await refreshAccess();
      if (!renewed) throw error;
      return api(path, { ...options, token: renewed.accessToken });
    }
  };

  const startTracking = async (tripId) => {
    const tracking = await driverRequest("/tracking/start", { method: "POST", body: { tripId } });
    await startNativeTracking({ tripId, sessionId: tracking.sessionId, apiBaseUrl: window.location.origin, trackingToken: tracking.trackingToken, policy: tracking.policy });
  };

  useEffect(() => {
    if (!approved || !supportsNativeTracking()) return;
    let active = true;
    const refresh = () => nativeTrackingHealth().then((health) => { if (active) setTrackingHealth(health); }).catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [approved]);

  useEffect(() => {
    if (!approved || !driver?.id || !supportsNativeTracking()) return;
    let active = true;
    loadPendingTripActions(driver.id).then((items) => { if (active) setPendingActions(items); }).catch(() => {});
    return () => { active = false; };
  }, [approved, driver?.id]);

  const persistPending = async (items) => {
    await savePendingTripActions(driver.id, items);
    setPendingActions(items);
  };

  useEffect(() => {
    if (!approved) return;
    let active = true;
    let refreshing = false;
    const timer = window.setInterval(async () => {
      if (refreshing || pendingBusy.current || !navigator.onLine) return;
      refreshing = true;
      try {
        const currentTrips = await driverRequest("/trips?state=active");
        if (!active || pendingBusy.current) return;
        setTrips(currentTrips);
        setSelectedTrip((trip) => currentTrips.find((item) => item.id === trip?.id) || currentTrips[0] || null);
      } catch { /* Manual refresh can surface the error. */ }
      finally { refreshing = false; }
    }, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [approved, token]);

  useEffect(() => {
    if (!approved || !pendingActions.some((item) => !item.conflict)) return;
    let active = true;
    const sync = async () => {
      if (pendingBusy.current || !navigator.onLine) return;
      const item = pendingActions.find((entry) => !entry.conflict);
      pendingBusy.current = true;
      try {
        await driverRequest(`/trips/${item.tripId}/actions`, { method: "POST", body: item.body });
        if (!active) return;
        await persistPending(pendingActions.filter((entry) => entry !== item));
        await refreshTrips().catch(() => {});
      } catch (error) {
        if (active && [400, 404, 409].includes(error.status)) {
          await persistPending(pendingActions.map((entry) => entry === item ? { ...entry, conflict: error.message } : entry)).catch(() => {});
        }
      } finally {
        pendingBusy.current = false;
      }
    };
    window.addEventListener("online", sync);
    const timer = window.setInterval(sync, 15000);
    return () => { active = false; window.removeEventListener("online", sync); window.clearInterval(timer); };
  }, [approved, pendingActions, token]);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        restoreInFlight.current ||= (async () => {
          await resumeSavedTracking().catch(() => {});
          const saved = await loadNativeDriverSession();
          if (!saved?.refreshToken) return null;
          const renewed = await api("/auth/refresh", { method: "POST", body: { refreshToken: saved.refreshToken } });
          await saveNativeDriverSession(renewed.refreshToken);
          const me = await api("/me", { token: renewed.accessToken });
          return { renewed, me };
        })();
        const restored = await restoreInFlight.current;
        if (!restored) return;
        if (!active) return;
        const { renewed, me } = restored;
        setToken(renewed.accessToken); setRefreshToken(renewed.refreshToken);
        setDriver(me.driver); setDevice(me.device);
        const deviceInfo = await nativeDriverDeviceInfo();
        await api("/devices/metadata", { method: "POST", token: renewed.accessToken, body: {
          manufacturer: deviceInfo.manufacturer,
          model: [deviceInfo.model, deviceInfo.androidVersion ? `Android ${deviceInfo.androidVersion}` : ""].filter(Boolean).join(" • "),
          appVersion: deviceInfo.appVersion,
        } }).catch(() => {});
        if (me.device?.status === "approved") await refreshTrips(renewed.accessToken);
      } catch (requestError) {
        if (!active) return;
        if (requestError.status === 401 || requestError.status === 403) await clearNativeDriverSession().catch(() => {});
        if (["DEVICE_MOVED", "DEVICE_RELEASED", "DEVICE_REASSIGNED"].includes(requestError.code)) setSessionNotice(requestError.message);
      } finally { if (active) setRestoringSession(false); }
    };
    restoreSession();
    return () => { active = false; };
  }, []);

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

  const requestReapproval = async () => {
    setLoading(true); setError(""); setMessage("");
    try {
      const result = await api("/devices/reapproval", { method: "POST", token, body: { installationId: installationId() } });
      setDevice({ id: result.deviceId, status: result.deviceStatus });
      setMessage(result.deviceStatus === "pending" ? "Approval request sent. Ask your dispatcher to approve this phone." : "This phone is already awaiting dispatcher approval.");
    } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  };

  const act = async (action, issueType = "") => {
    if (!selectedTrip) return;
    if (pendingBusy.current || pendingActions.some((item) => item.tripId === selectedTrip.id)) {
      setError("Sync or clear the pending action for this trip before taking another action.");
      return;
    }
    const actionBody = { action, issueType, stopSequence: selectedTrip.stops?.[selectedTrip.nextStopIndex]?.sequence, stopEpisodeId: selectedTrip.stopPrompt?.id, idempotencyKey: createKey(), expectedVersion: selectedTrip.version, recordedAt: new Date().toISOString() };
    let submittingAction = false;
    pendingBusy.current = true;
    setLoading(true); setError(""); setMessage("");
    try {
      let permission = null;
      if (action === "START_DELIVERY" || action === "RESTORE_TRACKING") {
        permission = await requestNativeTrackingPermissions();
        if (permission.browserPreview && process.env.NEXT_PUBLIC_DRIVER_BROWSER_PREVIEW !== "true") {
          setError("Open the Android driver app to start a tracked trip.");
          return;
        }
        if (!permission.ready && !permission.browserPreview) {
          setError("Allow precise location before starting this trip.");
          return;
        }
        if (permission.backgroundLocationRequired && !permission.browserPreview) {
          setError("Allow location ‘all the time’ in Android settings before starting this tracked trip.");
          return;
        }
        if (permission.locationEnabled === false) {
          setError("Turn on Location in Android settings, then try again.");
          return;
        }
        if (!permission.browserPreview && permission.locationEnabled !== true) {
          setError("Update the Android driver app before starting a tracked trip.");
          return;
        }
        if (action === "RESTORE_TRACKING") {
          await startTracking(selectedTrip.id);
          setMessage("Tracking requested. Waiting for GPS.");
          return;
        }
      }
      submittingAction = true;
      const data = await driverRequest(`/trips/${selectedTrip.id}/actions`, {
        method: "POST",
        body: actionBody,
      });
      submittingAction = false;
      setSelectedTrip(data);
      setTrips((items) => items.map((trip) => trip.id === data.id ? data : trip));
      if (action === "START_DELIVERY") {
        if (permission.ready) {
          await startTracking(data.id);
          setMessage("Delivery started. Waiting for GPS to record the pickup location.");
        } else if (permission.browserPreview) {
          setMessage("Trip started. Background tracking begins when this flow runs inside the Android driver app.");
        } else {
          setMessage("Trip started, but precise location permission is still required before tracking can begin.");
        }
      }
      if (data.state === "completed") {
        setTrips((items) => items.filter((trip) => trip.id !== data.id));
        setSelectedTrip(null);
        setMessage("Trip completed.");
        if (supportsNativeTracking()) await stopNativeTracking({ reason: "trip_completed" });
      } else if (action !== "START_DELIVERY") {
        setMessage(action === "REPORT_ISSUE" ? "Issue shared with operations." : "Trip status updated.");
      }
    } catch (requestError) {
      if (submittingAction && action !== "START_DELIVERY" && supportsNativeTracking() && (!requestError.status || requestError.status >= 500)) {
        try {
          await persistPending([...pendingActions, { tripId: selectedTrip.id, reference: selectedTrip.loadingReference, body: actionBody }]);
          setMessage("Action saved on this phone. It will sync when the server is reachable.");
        } catch (queueError) {
          setError(queueError.message || requestError.message);
        }
      } else setError(requestError.message);
    } finally { pendingBusy.current = false; setLoading(false); }
  };

  const signOut = async () => {
    try { if (token) await api("/auth/logout", { method: "POST", token }); } catch { /* local reset is still safe */ }
    await clearNativeDriverSession().catch(() => {});
    setToken(""); setRefreshToken(""); setDriver(null); setDevice(null); setTrips([]); setSelectedTrip(null); setMessage(""); setError(""); setHistory(null); setTrackingHealth(null); setPendingActions([]);
  };

  if (restoringSession) return <SessionRestoreScreen />;
  if (!signedIn) return <LoginScreen onSubmit={signIn} loading={loading} error={error} notice={sessionNotice} />;
  if (!approved) return <AwaitingApproval driver={driver} device={device} onRefresh={refreshDevice} onRequestReapproval={requestReapproval} onLogout={signOut} loading={loading} error={error} message={message} />;
  return (
    <TripHome driver={driver} trips={trips} selectedTrip={selectedTrip} onSelect={setSelectedTrip} onAction={act} onRefresh={() => refreshTrips().catch((requestError) => setError(requestError.message))} onLogout={signOut} loading={loading} error={error} message={message} trackingHealth={trackingHealth}>
      {trackingHealth?.tripId && (trips.some((trip) => trip.id === trackingHealth.tripId) || trackingHealth.state === "ending") && <TrackingHealth health={trackingHealth} />}
      {pendingActions.length > 0 && <section className="mt-6 space-y-2 rounded-2xl bg-white p-4 text-sm" aria-live="polite">
        <h2 className="font-bold">Pending trip actions</h2>
        {pendingActions.map((item) => <div key={item.body.idempotencyKey}>
          {item.reference} · {actionCopy[item.body.action] || "Report issue"} · {item.conflict || "Waiting to sync"}
          {item.conflict && <button type="button" className="ml-2 underline" onClick={() => {
            if (!pendingBusy.current) persistPending(pendingActions.filter((entry) => entry !== item)).catch((error) => setError(error.message));
          }}>Clear and retry from the trip</button>}
        </div>)}
      </section>}
      <section className="mt-6 rounded-2xl bg-white p-4">
        <button type="button" className="font-bold underline" onClick={async () => {
          if (history) { setHistory(null); return; }
          try { setHistory(await driverRequest("/trips?state=history")); }
          catch (requestError) { setError(requestError.message); }
        }}>{history ? "Hide trip history" : "Show trip history"}</button>
        {history?.length === 0 && <p className="mt-2 text-sm">No completed or cancelled trips.</p>}
        {history?.map((trip) => <div key={trip.id} className="mt-2 flex justify-between border-t pt-2 text-sm"><span>{trip.loadingReference} · {trip.vehicle?.vehicleNo}</span><StatePill state={trip.state} /></div>)}
      </section>
    </TripHome>
  );
}

function TrackingHealth({ health }) {
  const status = !health.locationEnabled ? "Location is switched off"
    : !health.preciseLocationGranted ? "Precise location permission required"
    : { active: "Tracking active", waiting: "Waiting for GPS", gps_unavailable: "GPS unavailable", ending: "Finishing GPS sync", ended: "Trip tracking ended" }[health.state] || "Checking tracking";
  return <section className="mt-6 rounded-2xl bg-white p-4 text-sm" aria-live="polite">
    <h2 className="font-bold">{status}</h2>
    <p>{health.queuedPoints} GPS points waiting to sync</p>
    <p>Last upload {health.lastUploadAt ? new Date(Number(health.lastUploadAt)).toLocaleString() : "pending"}</p>
    <p>{health.connected ? "Network connected" : "No network connection"}{health.batteryPct != null ? ` · ${health.batteryPct}% battery${health.charging ? " · charging" : ""}` : ""}</p>
  </section>;
}

function SessionRestoreScreen() { return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white"><div className="text-center"><LoaderCircle className="mx-auto animate-spin text-amber-300" size={30} /><p className="mt-4 text-sm font-bold text-slate-300">Restoring secure sign-in…</p></div></main>; }

function Brand({ compact = false }) {
  return <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/20"><Truck size={compact ? 21 : 24} strokeWidth={2.6} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Jaya Logistics</p><p className="text-base font-extrabold tracking-tight text-white">Driver Connect</p></div></div>;
}

function LoginScreen({ onSubmit, loading, error, notice }) {
  const [mobile, setMobile] = useState(""); const [pin, setPin] = useState("");
  return <main className="min-h-screen bg-slate-950 text-white"><div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8"><Brand /><div className="my-auto"><p className="mt-12 text-sm font-bold uppercase tracking-[0.16em] text-amber-300">Your work, in one place</p><h1 className="mt-3 text-4xl font-black leading-tight tracking-tight">Every trip, clear and under control.</h1><p className="mt-4 text-base leading-7 text-slate-300">Sign in to see only the trips assigned to you. Your office ERP screens stay private.</p><form className="mt-10 space-y-4 rounded-3xl bg-white p-5 text-slate-900 shadow-2xl shadow-black/30" onSubmit={(event) => { event.preventDefault(); onSubmit({ mobile, pin }); }}><Field label="Mobile number" type="tel" value={mobile} onChange={setMobile} placeholder="98765 43210" autoComplete="tel" /><Field label="Driver PIN" type="password" value={pin} onChange={setPin} placeholder="Your 4-digit or company PIN" autoComplete="current-password" /><p className="text-xs leading-5 text-slate-500"><LockKeyhole size={13} className="mr-1 inline" />Use the PIN given by your dispatcher. Do not share it.</p>{notice && <Notice>{notice}</Notice>}{error && <Notice tone="error">{error}</Notice>}<button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-4 font-bold text-white transition hover:bg-slate-800 disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" size={19} /> : "Sign in securely"}<ArrowRight size={18} /></button></form></div><p className="text-center text-xs leading-5 text-slate-500">Tracking will be enabled only during an active trip after you approve location permissions.</p></div></main>;
}

function AwaitingApproval({ driver, device, onRefresh, onRequestReapproval, onLogout, loading, error, message }) {
  const revoked = device?.status === "revoked";
  const moved = revoked && device?.revokeReason === "another_device_approved";
  return <main className="min-h-screen bg-slate-950 px-5 py-8 text-white"><div className="mx-auto max-w-md"><Brand /><section className="mt-16 rounded-3xl bg-slate-900 p-7 ring-1 ring-white/10"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/15 text-amber-300"><ShieldCheck size={29} /></div><h1 className="mt-6 text-2xl font-black">Hi, {driver?.displayName}</h1><p className="mt-2 leading-7 text-slate-300">{moved ? "This account is now active on another phone." : revoked ? "This phone is no longer approved. Request approval from your dispatcher to use it again." : "Your device has been registered. It needs a one-time approval from your dispatcher before it can show trip information."}</p><div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4"><p className="text-sm font-bold text-amber-200">Device status: {device?.status || "not registered"}</p><p className="mt-1 text-xs leading-5 text-amber-100/75">{moved ? "Use the assigned phone. If this is the replacement phone, request dispatcher approval." : revoked ? "Request approval, then ask operations to approve this phone." : "Ask operations to approve this device, then tap refresh."}</p></div>{message && <Notice>{message}</Notice>}{error && <Notice tone="error">{error}</Notice>}{revoked && <button onClick={onRequestReapproval} disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-4 font-bold text-slate-950 disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" size={19} /> : <ShieldCheck size={18} />} Request approval again</button>}<button onClick={onRefresh} disabled={loading} className={`${revoked ? "mt-3" : "mt-6"} flex w-full items-center justify-center gap-2 rounded-2xl ${revoked ? "border border-white/20 text-white" : "bg-amber-400 text-slate-950"} px-4 py-4 font-bold disabled:opacity-60`}>{loading ? <LoaderCircle className="animate-spin" size={19} /> : <RefreshCw size={18} />} Refresh approval</button><button onClick={onLogout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/5"><LogOut size={16} /> Sign out</button></section></div></main>;
}

function TripHome({ driver, trips, selectedTrip, onSelect, onAction, onRefresh, onLogout, loading, error, message, trackingHealth, children }) {
  return <main className="min-h-screen bg-slate-100 text-slate-950"><header className="bg-slate-950 px-5 pb-8 pt-7 text-white"><div className="mx-auto max-w-3xl"><div className="flex items-center justify-between gap-3"><Brand compact /><button onClick={onLogout} aria-label="Sign out" className="rounded-xl p-2 text-slate-300 hover:bg-white/10"><LogOut size={19} /></button></div><div className="mt-8 flex items-end justify-between gap-3"><div><p className="text-sm text-slate-300">Welcome back</p><h1 className="text-2xl font-black">{driver.displayName}</h1></div><button onClick={onRefresh} disabled={loading} className="rounded-xl bg-white/10 p-3 text-white hover:bg-white/15"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button></div></div></header><div className="mx-auto max-w-3xl px-5 pb-10"><div className="-mt-4 rounded-2xl bg-white p-3 shadow-lg shadow-slate-900/10"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Radio size={19} /></span><div><p className="text-sm font-extrabold">Trip access active</p><p className="text-xs text-slate-500">Location tracking runs only during an active trip.</p></div></div></div>{message && <Notice>{message}</Notice>}{error && <Notice tone="error">{error}</Notice>}<section className="mt-7"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black">My active trips</h2><span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">{trips.length}</span></div>{trips.length === 0 ? <EmptyTrips /> : <div className="space-y-3">{trips.map((trip) => <button key={trip.id} onClick={() => onSelect(trip)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedTrip?.id === trip.id ? "border-amber-400 bg-amber-50 shadow-sm" : "border-slate-200 bg-white"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{trip.loadingReference}</p><p className="mt-1 font-extrabold">{trip.vehicle?.vehicleNo || "Vehicle pending"}</p></div><StatePill state={trip.state} /></div><p className="mt-3 line-clamp-1 text-sm text-slate-600">{trip.stops?.[0]?.city || trip.stops?.[0]?.address || "Route awaiting address"} <ArrowRight className="mx-1 inline" size={14} /> {trip.stops?.at(-1)?.city || trip.stops?.at(-1)?.address || "Destination"}</p></button>)}</div>}</section>{selectedTrip && <TripDetail trip={selectedTrip} onAction={onAction} loading={loading} trackingHealth={trackingHealth} />}{children}</div></main>;
}

function TripDetail({ trip, onAction, loading, trackingHealth }) {
  const actions = trip.allowedActions || [];
  const nextDrop = trip.stops?.[trip.nextStopIndex];
  const primary = actions.includes("START_DELIVERY") ? "START_DELIVERY"
    : actions.includes("DELIVER") && nextDrop?.status === "arrived" ? "DELIVER"
    : actions.includes("COMPLETE") ? "COMPLETE"
    : trip.state === "at_stop" && !trip.deliveryStartedAt && nextDrop?.status === "pending" ? "DEPART"
    : null;
  const trackingNeedsAttention = trackingHealth?.tripId !== trip.id || ["gps_unavailable", "ended"].includes(trackingHealth.state)
    || trackingHealth.locationEnabled === false || trackingHealth.preciseLocationGranted === false;
  const [issuesOpen, setIssuesOpen] = useState(false);
  return <section className="mt-7 overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/10"><div className="bg-slate-950 p-5 text-white"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-amber-300">Current trip</p><h2 className="mt-1 text-xl font-black">{trip.loadingReference}</h2></div><StatePill state={trip.state} dark /></div><div className="mt-4 flex items-center gap-2 text-sm text-slate-300"><Truck size={16} className="text-amber-300" />{trip.vehicle?.vehicleNo}</div></div><div className="p-5"><div className="space-y-0">{trip.stops?.map((stop, index) => <div key={`${stop.sequence}-${stop.type}`} className="flex gap-3"><div className="flex flex-col items-center"><span className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${stop.type === "pickup" ? "bg-amber-400 text-slate-950" : "bg-slate-900 text-white"}`}>{stop.type === "pickup" ? <PackageCheck size={15} /> : <MapPin size={15} />}</span>{index < trip.stops.length - 1 && <span className="my-1 h-10 w-px bg-slate-200" />}</div><div className="pb-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{stop.type === "pickup" ? "Planned pickup" : `Drop ${stop.sequence - 1}`}</p><p className="mt-0.5 font-bold">{stop.label || stop.city || "Stop"}</p><p className="mt-0.5 text-sm leading-5 text-slate-600">{stop.address || "Address will be confirmed by operations"}</p>{stop.type === "drop" && <p className="mt-1 text-xs font-bold capitalize">{stop.status === "completed" ? "Delivered" : index === trip.nextStopIndex ? "Next drop" : stop.status}</p>}{stop.contactPhone && <a className="text-sm font-semibold underline" href={`tel:${stop.contactPhone}`}>Call stop contact</a>}</div></div>)}</div>{primary && <button disabled={loading} onClick={() => onAction(primary)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-4 font-extrabold text-slate-950 transition hover:bg-amber-300 disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" size={19} /> : <ClipboardCheck size={19} />}{actionCopy[primary]}</button>}
    {trip.state === "in_transit" && nextDrop && <p className="mt-3 text-sm text-slate-600">{trip.nextDropHasArrivalArea ? "Confirm delivery will appear after GPS detects arrival at the next drop." : "Ask dispatch to set the arrival area or record arrival for this drop."}</p>}
    {supportsNativeTracking() && trackingNeedsAttention && ["started", "at_pickup", "in_transit", "at_stop"].includes(trip.state) && (
      <button type="button" disabled={loading} onClick={() => onAction("RESTORE_TRACKING")} className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-700 disabled:opacity-60">
        Restore tracking
      </button>
    )}
    <button onClick={() => setIssuesOpen((open) => !open)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-700"><AlertTriangle size={17} className="text-amber-600" /> Report an issue</button>{trip.stopPrompt && <p role="status" className="mt-3 rounded bg-amber-50 p-2 text-sm">Stopped for {Math.floor(trip.stopPrompt.durationSec / 60)} minutes. Please tell dispatch the reason.</p>}{(issuesOpen || trip.stopPrompt) && <div className="mt-3 grid grid-cols-2 gap-2">{["breakdown", "traffic", "fuel", "waiting", "break", "accident", "other"].map((issue) => <button key={issue} disabled={loading} onClick={() => { onAction("REPORT_ISSUE", issue); setIssuesOpen(false); }} className="rounded-xl bg-slate-100 px-3 py-3 text-sm font-bold capitalize text-slate-700 hover:bg-slate-200">{issue}</button>)}</div>}</div></section>;
}

function Field({ label, value, onChange, ...props }) { return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100" required {...props} /></label>; }
function StatePill({ state, dark }) { return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${dark ? "bg-white/10 text-amber-200" : "bg-slate-100 text-slate-700"}`}>{stateCopy[state] || state}</span>; }
function Notice({ children, tone }) { return <div className={`mt-4 rounded-xl px-3 py-3 text-sm leading-5 ${tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{children}</div>; }
function EmptyTrips() { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center"><CircleDot className="mx-auto text-slate-400" size={28} /><p className="mt-3 font-extrabold">No active trip right now</p><p className="mt-1 text-sm leading-6 text-slate-500">When dispatch assigns a trip to you, it will appear here.</p></div>; }
