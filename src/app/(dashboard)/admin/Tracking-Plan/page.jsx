"use client";

import { useEffect, useState } from "react";

const input = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500";
const readonly = "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700";

export default function TrackingPlanPage() {
  const [lrs, setLrs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [manual, setManual] = useState({ startDate: "", deliveryDays: "", totalDays: "", expectedDays: "", expectedDate: "", ewaybillExtension: "Not Required", ewaybillExpiry: "", totalKmPending: "", lastLocation: "", trackingStatus: "In-Transit", remarks: "" });

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/consignment-note?format=table", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setLrs(data.data || []);
    };
    load();
  }, []);

  const selectLR = async (id) => {
    if (!id) return setSelected(null);
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/consignment-note?id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setSelected(data.data);
  };
  const header = selected?.header || {};
  const set = (key, value) => setManual(prev => ({ ...prev, [key]: value }));

  return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-6">
    <div className="mb-6"><h1 className="text-2xl font-extrabold text-slate-900">Tracking Plan</h1><p className="mt-1 text-sm text-slate-600">Create one tracking plan for each Consignment Note (LR).</p></div>
    <Card title="Select Consignment Note">
      <label className="text-xs font-bold text-slate-600">LR No *</label>
      <select className={input} defaultValue="" onChange={e => selectLR(e.target.value)}><option value="">Select LR</option>{lrs.map(lr => <option key={lr._id} value={lr._id}>{lr.lrNo} — {lr.orderNo}</option>)}</select>
    </Card>
    {selected && <>
      <Card title="LR & Purchase Information"><div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Read label="LR No" value={selected.lrNo} /><Read label="Order No" value={header.orderNo} /><Read label="Party Name" value={header.partyName} /><Read label="Vehicle No" value={header.vehicleNo} />
        <Read label="From" value={header.from} /><Read label="To" value={header.to} /><Read label="District / State" value={`${header.district || "-"} / ${header.state || "-"}`} /><Read label="Weight" value={`${selected.totalWeight || 0} ${header.unit || "MT"}`} />
      </div></Card>
      <Card title="Delivery Plan"><div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Field label="Start Date" type="date" value={manual.startDate} onChange={v => set("startDate", v)} /><Field label="Delivery Days" type="number" value={manual.deliveryDays} onChange={v => set("deliveryDays", v)} /><Field label="Total Days" type="number" value={manual.totalDays} onChange={v => set("totalDays", v)} /><Field label="Expected Days for Delivery" type="number" value={manual.expectedDays} onChange={v => set("expectedDays", v)} />
        <Field label="Expected Date of Delivery" type="date" value={manual.expectedDate} onChange={v => set("expectedDate", v)} /><Select label="E-waybill Extension" value={manual.ewaybillExtension} onChange={v => set("ewaybillExtension", v)} values={["Not Required", "Required"]} /><Field label="E-waybill Expiry Date" type="date" value={manual.ewaybillExpiry} onChange={v => set("ewaybillExpiry", v)} />
      </div></Card>
      <Card title="Live Tracking Update"><div className="grid grid-cols-1 gap-4 md:grid-cols-3"><Field label="Total KM Pending" type="number" value={manual.totalKmPending} onChange={v => set("totalKmPending", v)} /><Field label="Last Location" value={manual.lastLocation} onChange={v => set("lastLocation", v)} /><Select label="Transit Status" value={manual.trackingStatus} onChange={v => set("trackingStatus", v)} values={["In-Transit", "Breakdown", "Delivered"]} /></div><label className="mt-4 block text-xs font-bold text-slate-600">Remarks</label><textarea className={input} rows="3" value={manual.remarks} onChange={e => set("remarks", e.target.value)} placeholder="Enter tracking remarks" /><div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">Google Maps live tracking will connect here after Google Maps API credentials are configured.</div></Card>
    </>}
  </div>;
}
function Card({ title, children }) { return <section className="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm"><h2 className="border-b border-slate-100 px-5 py-3 text-sm font-extrabold text-slate-900">{title}</h2><div className="p-5">{children}</div></section>; }
function Read({ label, value }) { return <div><label className="text-xs font-bold text-slate-600">{label}</label><div className={readonly}>{value || "-"}</div></div>; }
function Field({ label, type = "text", value, onChange }) { return <div><label className="text-xs font-bold text-slate-600">{label}</label><input className={input} type={type} value={value} onChange={e => onChange(e.target.value)} /></div>; }
function Select({ label, value, onChange, values }) { return <div><label className="text-xs font-bold text-slate-600">{label}</label><select className={input} value={value} onChange={e => onChange(e.target.value)}>{values.map(item => <option key={item}>{item}</option>)}</select></div>; }
