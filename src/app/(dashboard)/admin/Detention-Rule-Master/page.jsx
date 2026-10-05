"use client";

import { useEffect, useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";

const emptyRule = {
  name: "", active: true, movementType: "LOCAL", ruleType: "LOCAL_CALENDAR",
  cutoffTime: "16:00", graceDays: "1", additionalDayMethod: "PARTIAL_24_HOURS", ratePerDay: "", priority: "100", effectiveFrom: new Date().toISOString().slice(0, 10)
};
const typeLabel = {
  LOCAL_CALENDAR: "Calendar date change",
  OUTSTATION_NEXT_DAY_CUTOFF: "Next-day cutoff",
  OUTSTATION_NEXT_CALENDAR_DAY: "Next calendar day"
};

export default function DetentionRuleMasterPage() {
  const [rules, setRules] = useState([]); const [form, setForm] = useState(emptyRule); const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false); const [deleting, setDeleting] = useState(null); const [isAdmin, setIsAdmin] = useState(false); const [message, setMessage] = useState("");
  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}`, "Content-Type": "application/json" });
  const load = async () => {
    const response = await fetch("/api/detention-rules", { headers: headers() }); const data = await response.json();
    if (response.ok && data.success) setRules(data.data || []); else setMessage(data.message || "Unable to load rules.");
  };
  useEffect(() => {
    load();
    try {
      const token = localStorage.getItem("token") || "";
      const payload = JSON.parse(atob(token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") || ""));
      setIsAdmin(payload.type === "company" || payload.roles?.includes("Admin"));
    } catch { setIsAdmin(false); }
  }, []);
  const change = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/detention-rules", { method: editing ? "PUT" : "POST", headers: headers(), body: JSON.stringify(editing ? { ...form, _id: editing } : form) });
      const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.message || "Unable to save rule.");
      setMessage("Rule saved successfully."); setForm(emptyRule); setEditing(null); await load();
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  const edit = (rule) => { setEditing(rule._id); setForm({ ...emptyRule, ...rule, effectiveFrom: rule.effectiveFrom ? new Date(rule.effectiveFrom).toISOString().slice(0, 10) : "" }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const remove = async (rule) => {
    if (!window.confirm(`Permanently delete the rule \"${rule.name}\"? This cannot be undone.`)) return;
    setDeleting(rule._id); setMessage("");
    try {
      const response = await fetch(`/api/detention-rules?id=${rule._id}`, { method: "DELETE", headers: headers() });
      const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.message || "Unable to delete rule.");
      setMessage("Rule deleted successfully."); await load();
    } catch (error) { setMessage(error.message); } finally { setDeleting(null); }
  };
  const kinds = form.movementType === "LOCAL" ? ["LOCAL_CALENDAR"] : ["OUTSTATION_NEXT_DAY_CUTOFF", "OUTSTATION_NEXT_CALENDAR_DAY"];
  return <div className="min-h-screen bg-slate-50 p-4 sm:p-6"><div className="mx-auto max-w-7xl">
    <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Transport configuration</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">Detention Rule Master</h1><p className="mt-1 text-sm text-slate-600">Rules are applied when an LR records the vehicle departure time. Existing calculated purchases keep their saved rule snapshot.</p></div>
    {message && <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${message.includes("success") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{message}</div>}
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-bold text-slate-900">{editing ? "Edit detention rule" : "Create detention rule"}</h2>{editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyRule); }} className="text-sm font-semibold text-sky-700">Cancel edit</button>}</div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Field label="Rule Name *"><input required value={form.name} onChange={(e) => change("name", e.target.value)} placeholder="e.g. Local - date change" className="control" /></Field><Field label="Movement Type *"><select value={form.movementType} onChange={(e) => { const movementType = e.target.value; setForm((previous) => ({ ...previous, movementType, ruleType: movementType === "LOCAL" ? "LOCAL_CALENDAR" : "OUTSTATION_NEXT_DAY_CUTOFF", graceDays: movementType === "LOCAL" ? "0" : "1" })); }} className="control"><option value="LOCAL">Local (same state)</option><option value="OUTSTATION">Outstation (different state)</option></select></Field><Field label="Calculation Rule *"><select value={kinds.includes(form.ruleType) ? form.ruleType : kinds[0]} onChange={(e) => { const ruleType = e.target.value; setForm((previous) => ({ ...previous, ruleType, graceDays: ruleType === "OUTSTATION_NEXT_CALENDAR_DAY" ? "2" : ruleType === "LOCAL_CALENDAR" ? "0" : "1" })); }} className="control">{kinds.map((kind) => <option key={kind} value={kind}>{typeLabel[kind]}</option>)}</select></Field><Field label="Effective From"><input type="date" value={form.effectiveFrom} onChange={(e) => change("effectiveFrom", e.target.value)} className="control" /></Field>
        <Field label="Cutoff Time"><input type="time" value={form.cutoffTime} onChange={(e) => change("cutoffTime", e.target.value)} className="control" /><p className="hint">At the cutoff counts as after it.</p></Field><Field label="Grace Days"><input min="0" type="number" value={form.graceDays} onChange={(e) => change("graceDays", e.target.value)} className="control" /><p className="hint">Days before detention starts.</p></Field><Field label="Additional Days"><select value={form.additionalDayMethod} onChange={(e) => change("additionalDayMethod", e.target.value)} className="control"><option value="PARTIAL_24_HOURS">Round partial 24 hours up</option><option value="CALENDAR_DAY">Calendar-date method</option></select></Field><Field label="Detention Rate / Day (₹)"><input min="0" step="0.01" type="number" value={form.ratePerDay} onChange={(e) => change("ratePerDay", e.target.value)} placeholder="0" className="control" /></Field><Field label="Priority (lower first)"><input min="1" type="number" value={form.priority} onChange={(e) => change("priority", e.target.value)} className="control" /></Field></div>
      <label className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.active} onChange={(e) => change("active", e.target.checked)} className="h-4 w-4 accent-emerald-600" /> Active rule</label><div className="mt-5"><button disabled={busy} className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy ? "Saving…" : editing ? "Update Rule" : "Save Rule"}</button></div>
    </form>
    <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-900">Configured Rules</h2></div><div className="overflow-x-auto"><table className="min-w-[1000px] w-full text-sm"><thead className="bg-yellow-300 text-slate-950"><tr>{["Rule", "Scope", "Logic", "Cutoff", "Grace", "Additional days", "Rate / Day", "Effective", "Status", "Actions"].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-extrabold uppercase">{heading}</th>)}</tr></thead><tbody>{rules.map((rule) => <tr key={rule._id} className="border-t border-slate-100 text-slate-700"><td className="px-4 py-3 font-semibold">{rule.name}</td><td className="px-4 py-3">{rule.movementType}</td><td className="px-4 py-3">{typeLabel[rule.ruleType]}</td><td className="px-4 py-3">{rule.cutoffTime}</td><td className="px-4 py-3">{rule.graceDays || 0} day(s)</td><td className="px-4 py-3">{rule.additionalDayMethod === "CALENDAR_DAY" ? "Calendar date" : "Partial 24h rounds up"}</td><td className="px-4 py-3">₹{Number(rule.ratePerDay || 0).toLocaleString()}</td><td className="px-4 py-3">{rule.effectiveFrom ? new Intl.DateTimeFormat("en-GB").format(new Date(rule.effectiveFrom)) : "—"}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${rule.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{rule.active ? "Active" : "Inactive"}</span></td><td className="px-4 py-3"><div className="flex gap-1.5"><button onClick={() => edit(rule)} title="Edit rule" aria-label="Edit rule" className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 transition-all hover:bg-indigo-500 hover:text-white"><FaEdit className="text-xs" /></button>{isAdmin && <button disabled={deleting === rule._id} onClick={() => remove(rule)} title="Delete rule" aria-label="Delete rule" className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-400 transition-all hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"><FaTrash className="text-xs" /></button>}</div></td></tr>)}{rules.length === 0 && <tr><td colSpan="10" className="px-4 py-10 text-center text-slate-500">No detention rules configured yet.</td></tr>}</tbody></table></div></section>
  </div><style jsx>{`.control{margin-top:.25rem;width:100%;border:1px solid #cbd5e1;border-radius:.5rem;background:#fff;padding:.6rem .75rem;font-size:.875rem;outline:none}.control:focus{border-color:#0ea5e9;box-shadow:0 0 0 2px #e0f2fe}.hint{margin-top:.25rem;font-size:.75rem;color:#64748b}`}</style></div>;
}
function Field({ label, children }) { return <label className="block text-xs font-bold text-slate-600">{label}{children}</label>; }
