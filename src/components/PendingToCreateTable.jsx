"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PendingToCreateTable({ enabled, canCreate = false, endpoint, createHref, createParam = "sourceId", createNoField, title = "Pending to Create", displayMode = "default" }) {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled || !canCreate) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
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
  }, [enabled, canCreate, endpoint]);

  if (!enabled || !canCreate) return null;
  const value = (row, ...keys) => keys.map((key) => key.split('.').reduce((current, part) => current?.[part], row)).find((item) => item !== undefined && item !== null && item !== "") || "—";
  const formatDate = (raw) => {
    if (!raw) return "—";
    const text = String(raw);
    const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    if (isoDate) return `${isoDate[3]}.${isoDate[2]}.${isoDate[1]}`;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? text : parsed.toLocaleDateString("en-GB").replace(/\//g, ".");
  };
  const modeHeaders = {
    "vehicle-negotiation": ["S.No", "Date", "Order No", "Party", "Branch", "Destination", "Weight", "Actions"],
    pricing: ["S.No", "Date", "VNN", "Party", "From → To", "Total Weight", "Orders", "Actions"],
    "loading-info": ["S.No", "Date", "Arrival No", "VNN", "Orders", "Branch", "Vehicle No", "Driver", "Weight", "VBP", "VFT", "VOT", "VL", "Actions"],
    purchase: ["S.No", "Date", "Loading Info", "VNN", "Orders", "Branch", "Vehicle No", "Driver", "Weight", "Actions"],
    "advance-payment": ["S.No", "Date", "Purchase No", "Order No", "Vendor", "Vehicle", "Amount", "Balance", "Actions"],
    lr: ["S.No", "Loading Info", "Order No", "Party", "Destination", "Weight", "Actions"],
    balance: ["S.No", "POD No", "Purchase No", "Order No", "Vendor", "Total", "Balance", "Status", "Actions"],
    pod: ["S.No", "Date", "Purchase No", "Order No", "Party", "Vendor", "Vehicle", "Amount", "Actions"],
  };
  const headers = modeHeaders[displayMode];
  const ordersFor = (row) => Array.isArray(row.orders) ? row.orders : Array.isArray(row.orderRows) ? row.orderRows : [];
  const orderNumbers = (row) => [...new Set(ordersFor(row).map((item) => item.orderNo || item.order).filter(Boolean))];
  const routeFor = (row) => {
    const first = ordersFor(row)[0] || row;
    const from = first.fromName || first.from || row.fromLocation || "";
    const to = first.toName || first.to || row.to || row.toLocation || "";
    return from && to ? `${from} → ${to}` : to || from || "—";
  };
  const orderChips = (row) => <div className="flex max-w-72 flex-wrap gap-1">{orderNumbers(row).map((orderNo, index) => <span key={`${orderNo}-${index}`} className="rounded-lg bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-800">{orderNo}</span>)}</div>;
  const createButton = (row) => {
    const ref = value(row, "vnnNo", "vehicleArrivalNo", "loadingInfoNo", "lrNo", "podNo", "purchaseNo", "paymentNo", "pricingSerialNo", "orderPanelNo", "orderNo");
    const sourceNo = createNoField ? row?.[createNoField] : ref;
    const params = new URLSearchParams({ [createParam]: String(row._id || ""), sourceNo: String(sourceNo || "") });
    return <button onClick={() => router.push(`${createHref}?${params.toString()}`)} className="rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-yellow-700">Create</button>;
  };
  const renderModeCells = (row, index) => {
    const sourceOrders = ordersFor(row);
    const weight = sourceOrders.length ? sourceOrders.reduce((sum, item) => sum + (Number(item.weight) || 0), 0) : Number(row.totalWeight || row.weight) || 0;
    const orders = orderNumbers(row);
    const chips = orderChips(row);
    const button = createButton(row);
    const orderText = orders.join(", ") || "—";
    const date = formatDate(value(row, "date", "createdAt"));
    switch (displayMode) {
      case "vehicle-negotiation": return [index + 1, date, value(row, "orderNo"), value(row, "partyName", "customerName"), value(row, "branchName", "branch"), value(row, "to"), weight ? `${weight} MT` : "—", button];
      case "pricing": return [index + 1, date, value(row, "vnnNo"), value(row, "customerName", "partyName"), routeFor(row), weight ? `${weight} MT` : "—", chips, button];
      case "loading-info": return [index + 1, date, "Pending", value(row, "vnnNo"), chips, value(row, "branchName", "branch"), value(row, "vehicleNo"), value(row, "driverMobileNo", "driverNo", "driverName"), weight ? `${weight} MT` : "—", "—", "—", "—", "—", button];
      case "purchase": return [index + 1, date, value(row, "vehicleArrivalNo"), value(row, "vehicleNegotiationNo", "vnnNo"), <div className="flex max-w-72 flex-wrap gap-1">{(row.orderRows || []).map((item, orderIndex) => <span key={`${item.orderNo}-${orderIndex}`} className="rounded-lg bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-800">{item.orderNo || "—"}</span>)}</div>, value(row, "branchName", "branch"), value(row, "vehicleNo", "vehicleInfo.vehicleNo"), value(row, "driverNo", "vehicleInfo.driverMobileNo"), weight ? `${weight} MT` : "—", button];
      case "advance-payment": return [index + 1, date, value(row, "purchaseNo"), (row.orderRows || []).map((item) => item.orderNo).filter(Boolean).join(", ") || value(row, "orderNo"), value(row, "vendorName"), value(row, "vehicleNo"), value(row, "amount"), value(row, "balance"), button];
      case "lr": return [index + 1, value(row, "loadingInfoNo"), value(row, "orderNo"), value(row, "partyName", "customerName"), value(row, "to"), value(row, "weight"), button];
      case "balance": return [index + 1, value(row, "podNo"), value(row, "purchaseNo"), value(row, "orderNo"), value(row, "vendorName"), value(row, "totalAmount"), value(row, "finalBalance"), value(row, "podStatus"), button];
      case "pod": return [index + 1, date, value(row, "purchaseNo"), (row.orderRows || []).map((item) => item.orderNo).filter(Boolean).join(", ") || orderText, value(row, "companyName", "customerName"), value(row, "vendorName"), value(row, "vehicleNo"), value(row, "amount"), button];
      default: return null;
    }
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
              {headers ? (
                <tr>{headers.map((header) => <th key={header} className={`px-4 py-3 ${header === "Actions" ? "text-right" : "text-left"}`}>{header}</th>)}</tr>
              ) : (
                <tr><th className="px-4 py-3">S.No</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Party</th><th className="px-4 py-3">Order / Route</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Weight / Amount</th><th className="px-4 py-3 text-right">Actions</th></tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={headers?.length || 9} className="px-4 py-10 text-center text-slate-500">Loading pending records…</td></tr>}
              {!loading && rows.map((row, index) => {
                if (headers) return <tr key={row._id || `${displayMode}-${index}`} className="hover:bg-yellow-50 transition">{renderModeCells(row, index).map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3">{cell}</td>)}</tr>;
                const ref = value(row, "vnnNo", "vehicleArrivalNo", "loadingInfoNo", "lrNo", "podNo", "purchaseNo", "paymentNo", "pricingSerialNo", "orderPanelNo", "orderNo");
                const order = Array.isArray(row.orders) ? row.orders.map((item) => item.orderNo || item.order).filter(Boolean).join(", ") : value(row, "orderNo", "orderNumbers", "toLocation", "to");
                const sourceNo = createNoField ? row?.[createNoField] : ref;
                const href = new URLSearchParams({ [createParam]: String(row._id || ""), sourceNo: String(sourceNo || "") });
                return <tr key={row._id || `${ref}-${index}`} className="hover:bg-yellow-50 transition">
                  <td className="px-4 py-3 text-slate-600">{index + 1}</td>
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
