"use client";
import Link from "next/link";
import { FiPlus, FiRefreshCw, FiArrowRight } from "react-icons/fi";
import { useEffect, useState } from "react";
import { usePermission } from "../hooks/usePermission";

const button = "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
const primaryButton = `${button} border-yellow-600 bg-yellow-600 text-white shadow-sm hover:border-yellow-700 hover:bg-yellow-700`;
const neutralButton = `${button} border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50`;
const MODULE = "Tracking Plan";
const TRACKING_MODULE = "Tracking Plan";
const emptyDriver = { displayName: "", mobile: "", licenseNumber: "", pin: "" };
const headers = (json = false) => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}`, ...(json ? { "Content-Type": "application/json" } : {}) });

export default function DriverAccess({ openCreate, loadingId }) {
  const { canView, canEdit, loading: permissionLoading } = usePermission();
  const [drivers, setDrivers] = useState([]); const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ displayName: "", mobile: "", licenseNumber: "", registrationStatus: "draft" });
  const [newDriver, setNewDriver] = useState(null);

  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const editable = canEdit(MODULE);
  const canCreate = canEdit(TRACKING_MODULE);
  const canOpen = canView(MODULE);
  const load = async () => { setError(""); try { const r = await fetch("/api/mobile/v1/admin/drivers", { headers: headers() }); const p = await r.json(); if (!r.ok) throw new Error(p.message); setDrivers(p.data || []); } catch (e) { setError(e.message || "Unable to load drivers."); } };
  useEffect(() => { if (!permissionLoading && canOpen) load(); }, [permissionLoading, canOpen]);
  useEffect(() => {
    if (selected) document.getElementById("driver-profile-editor")?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  useEffect(() => {
    if (permissionLoading || !canCreate) return;
    if (openCreate) setNewDriver(emptyDriver);
  }, [permissionLoading, canCreate, openCreate]);
  const createDriver = async (event) => {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/mobile/v1/admin/drivers", { method: "POST", headers: headers(true), body: JSON.stringify(newDriver) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to create driver.");
      setNewDriver(null);
      setNotice("Driver profile created.");
      await load();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const updateAccess = async (driver, action) => {
    const pin = action === "reset_pin" ? window.prompt(`Set a new driver PIN for ${driver.displayName} (4–32 characters)`) : "";
    if (action === "reset_pin" && !pin) return;
    if (action === "disable_mobile_access" && !window.confirm(`Disable mobile access for ${driver.displayName}? Their sessions will end.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/mobile/v1/admin/drivers/${driver.id}`, { method: "PATCH", headers: headers(true), body: JSON.stringify({ action, pin }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to update driver access.");
      setNotice({ enable_mobile_access: "Driver mobile access enabled.", disable_mobile_access: "Driver mobile access disabled.", reset_pin: "Driver PIN reset.", add_to_pilot: "Driver added to the pilot. They can now try signing in." }[action]);
      await load();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const open = (driver) => { setNewDriver(null); setSelected(driver); setForm({ displayName: driver.displayName || "", mobile: driver.status === "archived" ? "" : driver.mobileE164 || "", licenseNumber: driver.licenseNumber || "", registrationStatus: driver.registrationStatus || "draft" }); setError(""); setNotice(""); };
  const call = async (action, profile = {}) => { const r = await fetch(`/api/mobile/v1/admin/drivers/${selected.id}`, { method: "PATCH", headers: headers(true), body: JSON.stringify({ action, profile }) }); const p = await r.json(); if (!r.ok) throw new Error(p.message || "Unable to update driver."); return p.data; };
  const save = async (event) => { event.preventDefault(); setBusy(true); setError(""); setNotice(""); try { await call("update_profile", form); setNotice("Driver profile saved. A changed mobile number requires PIN reset and access enablement."); await load(); } catch (e) { setError(e.message || "Unable to save driver."); } finally { setBusy(false); } };
  const archiveOrReactivate = async () => {
    const archived = selected.status === "archived";
    const prompt = archived ? `Reactivate ${selected.displayName}? Set a valid mobile number, reset PIN, and enable access before login.` : `Archive ${selected.displayName}, release their mobile number and all linked phones? This is blocked while any trip is assigned or in progress.`;
    if (!window.confirm(prompt)) return;
    const reason = archived ? "" : window.prompt("Archive reason (optional):", "") || "driver_archived";
    setBusy(true); setError(""); setNotice("");
    try { await call(archived ? "reactivate_driver" : "archive_release_mobile", { reason }); setNotice(archived ? "Driver reactivated. Configure a valid mobile number, PIN, then enable access." : "Driver archived. Mobile number and linked phones are released for reassignment."); setSelected(null); await load(); } catch (e) { setError(e.message || "Unable to update driver."); } finally { setBusy(false); }
  };
  if (permissionLoading) return <main className="p-6">Checking permissions…</main>;
  if (!canOpen) return <main className="m-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">Tracking Plan view permission is required.</main>;
  const field = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200";
  const search = query.trim().toLowerCase();
  const filteredDrivers = drivers.filter((driver) => !search || [driver.displayName, driver.mobileE164, driver.lastReleasedMobile, driver.licenseNumber].some((value) => value?.toLowerCase().includes(search)));
  const currentDriver = selected && (drivers.find((driver) => driver.id === selected.id) || selected);
  return <section aria-label="Driver Access" className="space-y-3">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {loadingId && <Link href={{ pathname: "/admin/Tracking-Plan", query: { loadingId } }} className="text-xs font-bold text-slate-600 underline">← Back to this loading</Link>}
        <h2 className="mt-1 text-lg font-extrabold text-slate-900">Driver Access Master</h2>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={load} disabled={busy} className={neutralButton}><FiRefreshCw size={14} />Refresh</button>
        {canCreate && !newDriver && <button type="button" onClick={() => { setSelected(null); setNewDriver(emptyDriver); }} disabled={busy} className={primaryButton}><FiPlus size={14} />Create driver</button>}
      </div>
    </header>
    {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
    {newDriver && <form onSubmit={createDriver} autoComplete="off" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
      <h2 className="font-bold sm:col-span-2">Create driver</h2>
      <label className="text-sm font-bold">Driver name<input className={field} required value={newDriver.displayName} onChange={(event) => setNewDriver({ ...newDriver, displayName: event.target.value })} /></label>
      <label className="text-sm font-bold">Mobile number<input className={field} type="tel" required value={newDriver.mobile} onChange={(event) => setNewDriver({ ...newDriver, mobile: event.target.value })} /></label>
      <label className="text-sm font-bold">Licence number<input className={field} autoComplete="off" value={newDriver.licenseNumber} onChange={(event) => setNewDriver({ ...newDriver, licenseNumber: event.target.value })} /></label>
      <label className="text-sm font-bold">Driver PIN<input className={field} type="password" autoComplete="new-password" minLength={4} maxLength={32} required value={newDriver.pin} onChange={(event) => setNewDriver({ ...newDriver, pin: event.target.value })} /></label>
      <div className="flex gap-2 sm:col-span-2"><button disabled={busy} className={primaryButton}>Save driver</button><button type="button" disabled={busy} onClick={() => setNewDriver(null)} className={neutralButton}>Cancel</button></div>
    </form>}
    {selected && <section id="driver-profile-editor" className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div><p className="text-xs font-semibold text-slate-500">Driver profile</p><h2 className="font-bold text-slate-900">{currentDriver.displayName}</h2></div>
        <button type="button" disabled={busy} onClick={() => setSelected(null)} className="text-sm font-bold text-slate-600 underline">Close</button>
      </header>
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-bold">Driver name<input className={field} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} disabled={!editable || busy} required /></label>
        <label className="text-xs font-bold">Mobile number<input className={field} type="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} disabled={!editable || busy} required /></label>
        <label className="text-xs font-bold">Licence number<input className={field} autoComplete="off" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} disabled={!editable || busy} /></label>
        <label className="text-xs font-bold">Registration status<select className={`${field} cursor-pointer bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500`} value={form.registrationStatus} onChange={(e) => setForm({ ...form, registrationStatus: e.target.value })} disabled={!editable || busy}><option value="draft">Draft</option><option value="registered">Registered</option></select></label>
        <div className="sm:col-span-2 lg:col-span-4"><button disabled={!editable || busy} className={primaryButton}>Save profile</button></div>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <span className="mr-1 text-xs font-bold text-slate-700">Mobile access</span><Badge value={currentDriver.mobileAccessStatus} />
        {editable && <button type="button" disabled={busy} onClick={archiveOrReactivate} className={`${button} ml-auto ${currentDriver.status === "archived" ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"}`}>{currentDriver.status === "archived" ? "Reactivate driver" : "Archive & release mobile"}</button>}
      </div>
    </section>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">Drivers <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{filteredDrivers.length}</span></h2>
        <input type="search" aria-label="Search drivers" placeholder="Search name, mobile or licence" value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-yellow-500 focus:bg-white focus:ring-2 focus:ring-yellow-100 sm:w-72" />
      </header>
      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="border-b border-yellow-500 bg-yellow-400 text-xs font-extrabold uppercase tracking-wide text-slate-900"><tr>
            {["Driver", "Mobile", "Licence", "Record", "Mobile access", "Actions"].map((label) => <th key={label} scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wider last:text-right">{label}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDrivers.map((driver) => <tr key={driver.id} className={selected?.id === driver.id ? "bg-yellow-50" : "hover:bg-yellow-50/60"}>
              <th scope="row" className="px-4 py-3 font-semibold text-slate-900">{driver.displayName}{driver.status === "archived" && <span className="ml-2 text-xs font-normal text-slate-500">Archived</span>}</th>
              <td className="px-4 py-3 tabular-nums text-slate-600">{driver.status === "archived" ? driver.lastReleasedMobile || "Released" : driver.mobileE164}</td>
              <td className="px-4 py-3 text-slate-600">{driver.licenseNumber || "—"}</td>
              <td className="px-4 py-3"><Badge value={driver.registrationStatus} /></td>
              <td className="px-4 py-3">
                <div className="flex min-h-[48px] flex-col items-start justify-center gap-1.5"><Badge value={driver.mobileAccessStatus} />
                {driver.mobileAccessEnabled && typeof driver.pilotEnrolled === "boolean" && <div className="flex items-center gap-2"><span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${driver.pilotEnrolled ? 'text-slate-500' : 'text-amber-700'}`}><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${driver.pilotEnrolled ? 'bg-emerald-400' : 'bg-amber-400'}`} />{driver.pilotEnrolled ? "In pilot" : "Pilot required"}</span>{editable && driver.status === "active" && !driver.pilotEnrolled && <button type="button" disabled={busy} onClick={() => updateAccess(driver, "add_to_pilot")} className="inline-flex items-center gap-1 rounded text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 disabled:pointer-events-none disabled:opacity-50">Add to pilot<FiArrowRight size={11} /></button>}</div>}
                </div>
              </td>
              <td className="px-4 py-3">
                {editable && <div className="flex items-center justify-end gap-2">
                  {driver.status === "active" && <>
                    <button type="button" disabled={busy} onClick={() => updateAccess(driver, driver.mobileAccessEnabled ? "disable_mobile_access" : "enable_mobile_access")}
                      className={`${button} w-28 ${driver.mobileAccessEnabled ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
                      {driver.mobileAccessEnabled ? "Disable access" : "Enable access"}
                    </button>
                    <button type="button" disabled={busy} onClick={() => updateAccess(driver, "reset_pin")} className={`${neutralButton} w-24`}>Reset PIN</button>
                  </>}
                  <button type="button" onClick={() => open(driver)} disabled={busy} className={`${button} w-20 border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100`}>Manage</button>
                </div>}
              </td>
            </tr>)}
            {!filteredDrivers.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-600">{search ? "No matching drivers." : "No drivers found."}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </section>;
}
function Badge({ value }) {
  const label = String(value || "unknown").replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
  const tone = value === "registered" || value === "enabled" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : value === "draft" || value === "not_registered" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-slate-100 text-slate-600 ring-slate-200";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-4 ring-1 ring-inset ${tone}`}>{label}</span>;
}
