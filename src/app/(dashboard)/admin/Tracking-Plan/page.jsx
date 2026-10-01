"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePermission } from "../hooks/usePermission";

const MODULE_NAME = "Tracking Plan";
const dash = "—";
const valueOf = (value) => value === 0 ? "0" : value || dash;
const formatDate = (value) => {
  if (!value) return dash;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB").format(date);
};

export default function TrackingPlanPage() {
  const { canView, loading: permissionLoading } = usePermission();
  const [lrs, setLrs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (permissionLoading || !canView(MODULE_NAME)) return;
    let active = true;
    const loadLrs = async () => {
      setLoading(true); setError("");
      try {
        const response = await fetch("/api/consignment-note?format=table", { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.message || "Unable to load consignment notes.");
        if (active) setLrs(data.data || []);
      } catch (requestError) { if (active) setError(requestError.message || "Unable to load consignment notes."); }
      finally { if (active) setLoading(false); }
    };
    loadLrs();
    return () => { active = false; };
  }, [permissionLoading, canView]);

  const selectLR = async (id) => {
    setSelected(null); setError("");
    if (!id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/consignment-note?id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to load the selected LR.");
      setSelected(data.data);
    } catch (requestError) { setError(requestError.message || "Unable to load the selected LR."); }
    finally { setLoading(false); }
  };
  const tracking = useMemo(() => makeTrackingValues(selected), [selected]);

  if (permissionLoading) return <LoadingState text="Loading permissions…" />;
  if (!canView(MODULE_NAME)) return <AccessDenied />;

  return <div className="min-h-screen bg-slate-50 p-4 sm:p-6"><div className="mx-auto max-w-[1800px]">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Transport operations</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">Tracking Plan</h1><p className="mt-1 text-sm text-slate-600">Read-only delivery and live-location planning for consignment notes.</p></div><div className="w-full sm:w-96"><label htmlFor="lr" className="text-xs font-bold uppercase tracking-wide text-slate-600">Consignment Note (LR)</label><select id="lr" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" defaultValue="" onChange={(event) => selectLR(event.target.value)} disabled={loading}><option value="">Select LR to view tracking plan</option>{lrs.map((lr) => <option key={lr._id} value={lr._id}>{lr.lrNo} — {lr.orderNo || lr.partyName || "Consignment"}</option>)}</select></div></div>
    {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}{loading && <div className="mb-4 rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">Loading tracking data…</div>}
    {!selected && !loading && <EmptyState />}
    {selected && <><section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm"><div className="bg-yellow-300 px-4 py-3 text-center text-xl font-extrabold text-slate-950">Tracking Plan</div><div className="p-4 sm:p-5"><div className="grid gap-x-5 gap-y-3 md:grid-cols-3 xl:grid-cols-6"><ReadField label="Purchase No" value={tracking.purchaseNo} /><ReadField label="Pricing Serial No" value={tracking.pricingSerialNo} /><ReadField label="Auto Assign" value={tracking.autoAssign} /><ReadField label="Branch" value={tracking.branch} /><ReadField label="Delivery" value={tracking.delivery} /><ReadField label="Date" value={tracking.date} /></div><div className="mt-5 grid gap-4 lg:grid-cols-[0.75fr_1.25fr]"><ReadField label="Billing Type" value={tracking.billingType} accent="yellow" /><ReadField label="Multi - Order" value={tracking.multiOrder} accent="yellow" /></div><div className="mt-5 grid gap-4 md:grid-cols-2"><ReadField label="No. of Loading Points" value={tracking.loadingPoints} accent="green" /><ReadField label="No. of Dropping Point" value={tracking.droppingPoints} accent="green" /></div><OrderTable cells={tracking.orderCells} /></div></section>
    <section className="mt-4 rounded-xl border border-slate-300 bg-white p-4 shadow-sm sm:p-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"><ReadField label="Start Date" value={tracking.startDate} /><ReadField label="Delivery Days" value={tracking.deliveryDays} /><ReadField label="Total Days" value={tracking.totalDays} /><ReadField label="Expected Days for Delivery" value={tracking.expectedDays} /><ReadField label="Expected Date of Delivery" value={tracking.expectedDate} /><ReadField label="E-waybill - Extension" value={tracking.ewaybillExtension} /><ReadField label="E-wayBill Expiry - Date" value={tracking.ewaybillExpiry} /><ReadField label="Total Km - Pending" value={tracking.totalKmPending} /><ReadField label="Last - Location" value={tracking.lastLocation} /><ReadField label="Transit Status" value={tracking.transitStatus} accent="yellow" /></div><div className="mt-4"><ReadField label="Remark" value={tracking.remarks} accent="yellow" /></div></section>
    <MapPlaceholder />
    <TrackingTable tracking={tracking} /></>}</div></div>;
}

function makeTrackingValues(selected) {
  const header = selected?.header || {}, ewaybill = selected?.ewaybill || {};
  const startDate = header.lrDate || selected?.createdAt || "";
  const orderCells = [header.orderNo, header.partyName, header.plantCode || header.plantName, header.orderType, header.pinCode || selected?.consignee?.pinCode, header.state, header.district, header.from, header.to, `${selected?.totalWeight || 0} ${header.unit || "MT"}`, selected?.rate, selected?.totalAmount];
  const values = { purchaseNo: selected?.vnnNo || header.orderNo, pricingSerialNo: selected?.loadingInfoNo, autoAssign: header.vehicleNo ? "Assigned" : "Not Assigned", branch: selected?.subCompanyName || selected?.subCompanyCode, delivery: selected?.deliveryType || "Normal", date: formatDate(startDate), billingType: selected?.lcStatus || header.lcStatus || "Not LC", multiOrder: header.orderNo, loadingPoints: "1", droppingPoints: "1", orderCells, startDate: formatDate(startDate), deliveryDays: dash, totalDays: dash, expectedDays: dash, expectedDate: dash, ewaybillExtension: ewaybill.ewaybillNo ? "Required" : "Not Required", ewaybillExpiry: formatDate(ewaybill.expiryDate), totalKmPending: dash, lastLocation: dash, transitStatus: "Awaiting live location", remarks: selected?.remarks || header.remarks };
  return { ...values, panelHeaders: ["Date", "Order", "Party Name", "Plant Code", "Order Type", "Pin Code", "From", "To", "District", "State", "Weight", "Start Date", "Delivery Days", "Total Days", "E-wayBill Expiry - Date", "Total Km - Pending", "Last Location", "Expected Days for Delivery", "E-waybill - Extension", "Tracking Status"], panelValues: [values.date, header.orderNo, header.partyName, header.plantCode || header.plantName, header.orderType, header.pinCode || selected?.consignee?.pinCode, header.from, header.to, header.district, header.state, `${selected?.totalWeight || 0} ${header.unit || "MT"}`, values.startDate, values.deliveryDays, values.totalDays, values.ewaybillExpiry, values.totalKmPending, values.lastLocation, values.expectedDays, values.ewaybillExtension, values.transitStatus] };
}
function ReadField({ label, value, accent }) { return <div><div className={`border border-slate-300 px-2 py-1 text-center text-[11px] font-bold text-slate-900 ${accent === "yellow" ? "bg-yellow-300" : accent === "green" ? "bg-lime-400" : "bg-slate-200"}`}>{label}</div><div className="min-h-9 border-x border-b border-slate-300 bg-white px-2 py-2 text-center text-sm text-slate-700">{valueOf(value)}</div></div>; }
function OrderTable({ cells }) { const heads = ["Order", "Party Name", "Plant Code", "Order Type", "Pin Code", "State", "District", "From", "To", "Weight", "Rate", "Total Amount"]; return <div className="mt-4 overflow-x-auto rounded-lg border border-slate-300"><table className="min-w-[1050px] w-full text-left text-xs"><thead className="bg-slate-200 text-slate-900"><tr>{heads.map((head) => <th key={head} className="whitespace-nowrap border-b border-slate-300 px-3 py-2 font-bold">{head}</th>)}</tr></thead><tbody><tr className="text-slate-700">{cells.map((cell, index) => <td key={index} className="whitespace-nowrap border-b border-slate-200 px-3 py-2">{valueOf(cell)}</td>)}</tr></tbody></table></div>; }
function MapPlaceholder() { return <section className="mt-4 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm"><div className="border-b border-slate-200 bg-slate-50 px-5 py-3"><h2 className="font-bold text-slate-900">Live location tracking</h2><p className="mt-0.5 text-xs text-slate-600">Google Maps is ready for configuration. No Google request is made until location credentials and driver consent are enabled.</p></div><div className="flex min-h-72 flex-col items-center justify-center bg-[linear-gradient(135deg,#eff6ff_25%,#f8fafc_25%,#f8fafc_50%,#eff6ff_50%,#eff6ff_75%,#f8fafc_75%)] bg-[length:32px_32px] p-6 text-center"><div className="rounded-full bg-sky-100 p-4 text-3xl">⌖</div><h3 className="mt-3 text-lg font-bold text-slate-900">Google Maps tracking placeholder</h3><p className="mt-1 max-w-2xl text-sm text-slate-600">Location, remaining distance, route duration, ETA and actual-delivery values will populate here after the Google Maps and approved driver-location integration is configured.</p></div></section>; }
function TrackingTable({ tracking }) { return <section className="mt-4 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm"><div className="bg-sky-500 px-4 py-3 text-center text-xl font-extrabold text-slate-950">Tracking - Panel</div><div className="overflow-x-auto"><table className="min-w-[1900px] w-full text-left text-xs"><thead className="bg-slate-100 text-slate-900"><tr>{tracking.panelHeaders.map((head) => <th key={head} className="whitespace-nowrap border-b border-slate-300 px-3 py-2 font-bold">{head}</th>)}</tr></thead><tbody><tr className="text-slate-700">{tracking.panelValues.map((cell, index) => <td key={index} className="whitespace-nowrap border-b border-slate-200 px-3 py-2">{valueOf(cell)}</td>)}</tr></tbody></table></div></section>; }
function LoadingState({ text }) { return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">{text}</div>; }
function EmptyState() { return <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-500">Select a consignment note to load the read-only Tracking Plan.</div>; }
function AccessDenied() { return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-bold text-slate-900">Access denied</h1><p className="mt-2 text-sm text-slate-600">You do not have permission to access Tracking Plan.</p><Link href="/admin" className="mt-5 inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white">Return to dashboard</Link></div></div>; }
