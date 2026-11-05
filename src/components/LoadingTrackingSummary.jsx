"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePermission } from "@/app/(dashboard)/admin/hooks/usePermission";

export default function LoadingTrackingSummary({ loadingId }) {
  const { canView, canEdit, loading: permissionLoading } = usePermission();
  const allowed = canView("Tracking Plan");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!loadingId || permissionLoading || !allowed) return;
    const controller = new AbortController();
    let pending = false;
    const load = async () => {
      if (pending || document.hidden) return;
      pending = true;
      setBusy(true);
      try {
        const response = await fetch(`/api/mobile/v1/admin/live-tracking?loadingId=${encodeURIComponent(loadingId)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
          cache: "no-store", signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.message || "Tracking is unavailable.");
        if (!controller.signal.aborted) { setResult({ loadingId, data: body.data }); setError(""); }
      } catch (err) {
        if (!controller.signal.aborted) { setError(err.message || "Unable to load tracking."); setResult(null); }
      } finally {
        pending = false;
        if (!controller.signal.aborted) setBusy(false);
      }
    };
    load();
    const timer = setInterval(load, 30000);
    document.addEventListener("visibilitychange", load);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", load); };
  }, [loadingId, permissionLoading, allowed, refresh]);

  const data = result?.loadingId === loadingId ? result.data : null;
  const trips = data?.trips || [];
  const trip = trips.find((item) => !["completed", "cancelled"].includes(item.tripState)) || trips[0];
  const state = trip?.session?.status;
  const lastAt = trip?.latestLocation?.recordedAt || trip?.session?.lastRecordedAt;
  const status = !loadingId ? "Not linked" : permissionLoading ? "Checking access…" : !allowed ? "Restricted" : error ? "Unavailable" : !data ? "Loading…" : !trip ? "Driver not assigned" : state === "ended" ? "Trip ended" : state === "paused" ? "Paused" : state === "stale" ? "Location outdated" : state === "active" && lastAt ? "Live" : "Awaiting driver";

  return <section className="h-full rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4" aria-label="Live vehicle tracking">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-bold text-slate-800">Live Vehicle Tracking</h3>
      <span role="status" className={`rounded-full px-2 py-1 text-xs font-semibold ${status === "Live" ? "bg-green-100 text-green-800" : "bg-white text-slate-700"}`}>{status}</span>
    </div>
    {!loadingId ? <p className="mt-3 text-sm text-slate-600">Save Loading Info to link tracking.</p> : permissionLoading ? <p className="mt-3 text-sm text-slate-600">Checking Tracking Plan access…</p> : !allowed ? <p className="mt-3 text-sm text-slate-600">Tracking Plan access is required to view tracking.</p> : <>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : <dl className="mt-3 space-y-1 text-sm text-slate-700">
        <div><dt className="inline font-semibold">Vehicle: </dt><dd className="inline">{trip?.vehicleNo || "—"}</dd></div>
        <div><dt className="inline font-semibold">Assigned driver: </dt><dd className="inline">{trip?.driver ? [trip.driver.displayName, trip.driver.mobile].filter(Boolean).join(" · ") : data ? "Not assigned" : "Loading…"}</dd></div>
        <div><dt className="inline font-semibold">Last location update: </dt><dd className="inline">{lastAt ? new Date(lastAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "No location received"}</dd></div>
      </dl>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href={{ pathname: "/admin/Tracking-Plan", query: { loadingId } }} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">{data && !trip && canEdit("Tracking Plan") ? "Assign Driver in Tracking Panel ↗" : "Open Tracking Panel ↗"}</Link>
        <button type="button" disabled={busy} onClick={() => setRefresh((value) => value + 1)} className="text-xs font-semibold text-blue-800 disabled:opacity-50">{busy ? "Refreshing…" : "Refresh"}</button>
      </div>
    </>}
  </section>;
}
