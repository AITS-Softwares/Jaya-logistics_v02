"use client";

import Link from "next/link";
import { FiActivity, FiUsers, FiSettings, FiArrowUpRight } from "react-icons/fi";
import { usePermission } from "../hooks/usePermission";
import DriverOperations from "./DriverOperations";
import DriverTrackingGuide from "./DriverTrackingGuide";
import DriverAccess from "./DriverAccess";
import DriverMobileSettings from "./DriverMobileSettings";

export default function DriverMobileTabs({ requestedTab, openCreate, loadingId }) {
  const { canView, canEdit, loading } = usePermission();
  if (loading) return <div className="p-6 text-sm text-slate-600">Checking permissions…</div>;

  const canViewSettings = canView("Tracking Plan");
  const tabs = [
    { id: "settings", label: "Mobile Settings", Icon: FiSettings, allowed: canViewSettings },
    { id: "drivers", label: "Driver Access", Icon: FiUsers, allowed: canViewSettings },
    { id: "operations", label: "Operations", Icon: FiActivity, allowed: canView("Tracking Plan") },
  ].filter((tab) => tab.allowed);

  if (!tabs.length) return <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">Driver operations access is required.</div>;
  const active = tabs.find((tab) => tab.id === requestedTab) || tabs.find((tab) => tab.id === "operations") || tabs[0];

  return <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white text-slate-800">
    <header className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-extrabold text-slate-900">Driver Mobile</h1><p className="mt-1 text-sm text-slate-600">Manage driver access, assigned trips and mobile tracking.</p></div>{canView("Tracking Plan") && <Link href="/admin/Tracking-Plan" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-yellow-400 hover:bg-yellow-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500">Open Tracking Plan<FiArrowUpRight size={15} /></Link>}</div></header>
    <div className="px-4 pt-5 sm:px-6"><nav aria-label="Driver Operations sections" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1.5">{tabs.map(({ id, label, Icon }) => <Link key={id} href={{ pathname: "/admin/Driver-Mobile", query: { tab: id } }} aria-current={id === active.id ? "page" : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 ${id === active.id ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60" : "text-slate-500 hover:bg-white/60 hover:text-slate-800"}`}><Icon size={15} className={id === active.id ? "text-amber-600" : "text-slate-400"} />{label}{id === active.id && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber-500" />}</Link>)}</nav></div>
    <div className="space-y-5 p-4 sm:p-6">
      <DriverTrackingGuide canManage={canEdit("Tracking Plan")} />
      {active.id === "operations" && <DriverOperations />}
      {active.id === "drivers" && <DriverAccess key={`${openCreate}:${loadingId}`} openCreate={openCreate} loadingId={loadingId} />}
      {active.id === "settings" && <DriverMobileSettings />}
    </div>
  </main>;
}
