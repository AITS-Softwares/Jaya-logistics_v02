"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePermission } from "../../hooks/usePermission";

const BILLING_TYPES = [
  ["general", "General"],
  ["product-wise", "Product-wise"],
  ["mosaic", "Mosaic"],
  ["detention", "Detention"],
  ["cancellation", "Cancellation"],
  ["other", "Other"],
];

const STATUS_OPTIONS = [
  ["all", "All billing statuses"],
  ["outstanding", "Unbilled or partially billed"],
  ["unbilled", "Unbilled"],
  ["partially-billed", "Partially billed"],
  ["billed", "Billed"],
];

const statusStyles = {
  billed: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  "partially-billed": "bg-amber-50 text-amber-700 ring-amber-600/20",
  unbilled: "bg-slate-100 text-slate-600 ring-slate-500/10",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
}

function formatQty(value) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

function SummaryCard({ label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-white text-slate-900",
    emerald: "bg-emerald-50 text-emerald-800",
    amber: "bg-amber-50 text-amber-800",
    blue: "bg-blue-50 text-blue-800",
  };
  return (
    <div className={`rounded-xl border border-slate-200 p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{Number(value || 0).toLocaleString("en-IN")}</p>
    </div>
  );
}

export default function BillingReportsPage() {
  const { canView, loading: permissionLoading } = usePermission();
  const hasBillingView = canView("Billing");
  const [filters, setFilters] = useState({ billingType: "general", status: "all", search: "", fromDate: "", toDate: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, billed: 0, partiallyBilled: 0, unbilled: 0, tracksQuantity: true });
  const [pagination, setPagination] = useState({ page: 1, pageCount: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRows = useCallback(async () => {
    if (!hasBillingView) return;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ ...appliedFilters, page: String(page), pageSize: "25" });
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/billing/register?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to load billing records");
      setRows(result.data || []);
      setSummary(result.summary || { total: 0, billed: 0, partiallyBilled: 0, unbilled: 0, tracksQuantity: true });
      setPagination(result.pagination || { page: 1, pageCount: 1, total: 0 });
    } catch (loadError) {
      setError(loadError.message || "Unable to load billing records");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, hasBillingView, page]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (!query.has('billingType') && !query.has('search')) return;
    const next = { billingType: BILLING_TYPES.some(([type]) => type === query.get('billingType')) ? query.get('billingType') : 'general',
      status: STATUS_OPTIONS.some(([status]) => status === query.get('status')) ? query.get('status') : 'all', search: query.get('search') || '', clientId: query.get('clientId') || '', fromDate: '', toDate: '' };
    setFilters(next); setAppliedFilters(next); setPage(1);
  }, []);
  useEffect(() => { loadRows(); }, [loadRows]);

  const billingTypeLabel = useMemo(
    () => BILLING_TYPES.find(([value]) => value === appliedFilters.billingType)?.[1] || "General",
    [appliedFilters.billingType]
  );

  const applyFilters = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filters, search: filters.search.trim() });
  };

  if (permissionLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading billing register…</div>;
  }

  if (!hasBillingView) {
    return (
      <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Billing access required</h1>
        <p className="mt-2 text-sm text-slate-600">You need Billing view permission to open this register.</p>
        <Link href="/admin" className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Return to dashboard</Link>
      </div>
    );
  }

  if (loading && !rows.length && !error) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading billing register…</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Link href="/admin/Billing" aria-label="Back to Billing" className="mt-1 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6M9 12h12" /></svg>
            </Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Billing workspace</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Billing Register</h1>
              <p className="mt-1 text-sm text-slate-500">Track billed quantities and invoice status by consignment note.</p>
            </div>
          </div>
          <button type="button" onClick={loadRows} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2"/></svg>
            Refresh
          </button>
        </header>

        <form onSubmit={applyFilters} className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800">Filter billing records</h2>
            <span className="text-xs text-slate-500">Status is calculated for the selected billing type.</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <input aria-label="Search billing records" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value, clientId: '' })} placeholder="Search LR, party, order, vehicle…" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:col-span-2" />
            <select aria-label="Billing type" value={filters.billingType} onChange={(event) => setFilters({ ...filters, billingType: event.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500">
              {BILLING_TYPES.map(([value, label]) => <option key={value} value={value}>{label} billing</option>)}
            </select>
            <select aria-label="Billing status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500">
              {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input aria-label="From date" type="date" value={filters.fromDate} onChange={(event) => setFilters({ ...filters, fromDate: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500" />
            <input aria-label="To date" type="date" value={filters.toDate} onChange={(event) => setFilters({ ...filters, toDate: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500" />
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => { const cleared = { billingType: "general", status: "all", search: "", fromDate: "", toDate: "" }; setFilters(cleared); setAppliedFilters(cleared); setPage(1); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Clear</button>
            <button type="submit" className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800">Apply filters</button>
          </div>
        </form>

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard label="Matching LRs" value={summary.total} />
          <SummaryCard label="Billed" value={summary.billed} tone="emerald" />
          <SummaryCard label="Partially billed" value={summary.partiallyBilled} tone="amber" />
          <SummaryCard label="Unbilled" value={summary.unbilled} tone="blue" />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">{billingTypeLabel} billing status</h2>
              <p className="mt-1 text-xs text-slate-500">{summary.tracksQuantity ? "Billed quantity is accumulated from saved bills for this billing type." : "This charge type is amount-based; quantity tracking does not apply."}</p>
            </div>
            <span className="text-xs text-slate-500">{pagination.total.toLocaleString("en-IN")} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1150px] w-full border-collapse text-left text-sm">
              <thead className="bg-amber-400 text-xs font-bold uppercase tracking-wide text-slate-900">
                <tr>
                  <th className="px-4 py-3">Date</th><th className="px-4 py-3">LR No.</th><th className="px-4 py-3">Party</th><th className="px-4 py-3">Order / Route</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3 text-right">Total Qty</th><th className="px-4 py-3 text-right">Billed Qty</th><th className="px-4 py-3 text-right">Balance Qty</th><th className="px-4 py-3">Billing Status</th><th className="px-4 py-3">Bill No.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-500">Loading records…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-14 text-center"><p className="font-semibold text-slate-700">No billing records match these filters</p><p className="mt-1 text-sm text-slate-500">Try changing the billing type, date range, or search.</p></td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(row.date)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-emerald-800">{row.lrNo || "—"}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 font-medium text-slate-800" title={row.partyName}>{row.partyName || "—"}</td>
                    <td className="px-4 py-3 text-slate-600"><span className="block">{row.orderNo || "—"}</span><span className="text-xs text-slate-400">{row.from || "—"} → {row.to || "—"}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.vehicleNo || "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{summary.tracksQuantity ? `${formatQty(row.totalQty)} ${row.unit}` : "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{summary.tracksQuantity ? `${formatQty(row.billedQty)} ${row.unit}` : "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{summary.tracksQuantity ? `${formatQty(row.remainingQty)} ${row.unit}` : "—"}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusStyles[row.status] || statusStyles.unbilled}`}>{row.status === "partially-billed" ? "Partially billed" : row.status === "billed" ? "Billed" : "Unbilled"}</span></td>
                    <td className="max-w-[190px] truncate px-4 py-3 text-xs text-slate-600" title={row.billNumbers.join(", ")}>{row.billNumbers.length ? row.billNumbers.join(", ") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm text-slate-500">
            <span>Page {pagination.page} of {pagination.pageCount}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
              <button type="button" disabled={page >= pagination.pageCount || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
