"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PendingToCreateTable({ enabled, endpoint, createHref, createParam = "sourceId", title = "Pending to Create" }) {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Unable to load pending records");
        const data = result.data;
        const list = Array.isArray(data) ? data : (data?.rows || data?.negotiations || data?.loadingInfos || data?.availableLoadingInfos || []);
        if (active) setRows(list);
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to load pending records");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [enabled, endpoint]);

  if (!enabled) return null;
  const value = (row, ...keys) => keys.map((key) => row?.[key]).find((item) => item !== undefined && item !== null && item !== "") || "—";
  const formatDate = (raw) => {
    if (!raw) return "—";
    const text = String(raw);
    const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    if (isoDate) return `${isoDate[3]}.${isoDate[2]}.${isoDate[1]}`;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? text : parsed.toLocaleDateString("en-GB").replace(/\//g, ".");
  };

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label={title}>
      {error ? <p className="p-5 text-sm text-red-700">{error}</p> : !loading && rows.length === 0 ? (
        <div className="flex items-center gap-4 bg-slate-50/80 px-5 py-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" /></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">You’re all caught up</p>
            <p className="mt-0.5 text-xs text-slate-500">No records are waiting to be created. New items will appear here when they’re ready.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm compact-list-table">
            <caption className="sr-only">{title}</caption>
            <thead className="border-b border-yellow-500 bg-yellow-400">
              <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Party</th><th className="px-4 py-3">Order / Route</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Weight / Amount</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Loading pending records…</td></tr>}
              {!loading && rows.map((row, index) => {
                const ref = value(row, "vnnNo", "vehicleArrivalNo", "loadingInfoNo", "lrNo", "podNo", "purchaseNo", "paymentNo", "pricingSerialNo", "orderPanelNo", "orderNo");
                const order = Array.isArray(row.orders) ? row.orders.map((item) => item.orderNo || item.order).filter(Boolean).join(", ") : value(row, "orderNo", "orderNumbers", "toLocation", "to");
                const href = new URLSearchParams({ [createParam]: String(row._id || ""), sourceNo: String(ref === "—" ? "" : ref) });
                return <tr key={row._id || `${ref}-${index}`} className="hover:bg-yellow-50 transition">
                  <td className="px-4 py-3 text-slate-600">{formatDate(value(row, "date", "createdAt"))}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{ref}</td>
                  <td className="px-4 py-3">{value(row, "customerName", "partyName", "vendorName", "companyName", "subCompanyName")}</td>
                  <td className="px-4 py-3">{order}</td>
                  <td className="px-4 py-3">{value(row, "branchName", "branch", "fromLocation")}</td>
                  <td className="px-4 py-3">{value(row, "vehicleNo", "driverNo")}</td>
                  <td className="px-4 py-3">{value(row, "totalWeight", "weight", "amount", "totalAmount", "finalBalance")}</td>
                  <td className="px-4 py-3 text-center"><button onClick={() => router.push(`${createHref}?${href.toString()}`)} className="rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-yellow-700">Create</button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      )}
      {!error && !loading && rows.length > 0 && <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Total {rows.length} pending entr{rows.length === 1 ? 'y' : 'ies'} found</div>}
    </section>
  );
}
