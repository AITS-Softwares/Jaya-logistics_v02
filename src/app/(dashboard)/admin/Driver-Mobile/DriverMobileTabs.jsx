"use client";

import Link from "next/link";
import { usePermission } from "../hooks/usePermission";
import DriverOperations from "./DriverOperations";
import DriverAccess from "./DriverAccess";
import DriverMobileSettings from "./DriverMobileSettings";

export default function DriverMobileTabs({ requestedTab, openCreate, loadingId }) {
  const { canView, canEdit, loading } = usePermission();
  if (loading) return <div className="p-6 text-sm text-slate-600">Checking permissions…</div>;

  const canViewSettings = canView("Driver Mobile Settings");
  const tabs = [
    { id: "operations", label: "Operations", allowed: canView("Tracking Plan") },
    { id: "drivers", label: "Driver Access", allowed: canViewSettings || canEdit("Tracking Plan") },
    { id: "settings", label: "Mobile Settings", allowed: canViewSettings },
  ].filter((tab) => tab.allowed);

  if (!tabs.length) return <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">Driver operations access is required.</div>;
  const active = tabs.find((tab) => tab.id === requestedTab) || tabs[0];

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-slate-900">Driver Operations</h1>
        {canView("Tracking Plan") && <Link href="/admin/Tracking-Plan" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700">Open Tracking Plan</Link>}
      </header>
      <nav aria-label="Driver Operations sections" className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((tab) => <Link key={tab.id} href={{ pathname: "/admin/Driver-Mobile", query: { tab: tab.id } }}
          aria-current={tab.id === active.id ? "page" : undefined}
          className={`rounded-t-lg border-b-2 px-3 py-2 text-sm font-bold ${tab.id === active.id ? "border-yellow-500 bg-yellow-50 text-slate-950" : "border-transparent text-slate-600 hover:bg-white hover:text-slate-900"}`}>
          {tab.label}
        </Link>)}
      </nav>
      {active.id === "operations" && <DriverOperations />}
      {active.id === "drivers" && <DriverAccess key={`${openCreate}:${loadingId}`} openCreate={openCreate} loadingId={loadingId} />}
      {active.id === "settings" && <DriverMobileSettings />}
    </div>
  </main>;
}
