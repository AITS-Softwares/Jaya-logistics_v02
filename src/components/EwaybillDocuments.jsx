"use client";
import { useEffect, useState } from "react";
import { SummaryBar, RowCard } from "@/components/LoadingInfoLRViewer";
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, ...options.headers }, cache: "no-store" });
  if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.message || "Request failed."); }
  return response;
}
async function openPdf(url, print = false) {
  const win = window.open("", "_blank");
  try {
    const response = await request(url);
    const objectUrl = URL.createObjectURL(await response.blob());
    if (win) { win.location.replace(objectUrl); if (print) { win.onload = () => { try { win.print(); } catch {} }; } }
    else throw new Error("Allow popups to open the PDF.");
    setTimeout(() => URL.revokeObjectURL(objectUrl), 300000);
  } catch (error) { win?.close(); throw error; }
}
const button = "rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40";
export default function EwaybillDocuments({ noteId, readOnly = false, onUpdated, ensureSaved, formStatus, formNumber }) {
  const [data, setData] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const url = `/api/consignment-note/${noteId}/ewaybill`;
  useEffect(() => { if (noteId) request(url).then(r => r.json()).then(r => setData(r.data || {})).catch(e => setMessage(e.message)); }, [url, noteId]);
  async function run(action) {
    setBusy(true); setMessage("");
    try {
      const savedId = ensureSaved ? await ensureSaved() : noteId;
      if (!savedId) throw new Error("Unable to save LR before the e-way bill action.");
      const actionUrl = `/api/consignment-note/${savedId}/ewaybill`;
      const body = JSON.stringify({ action });
      const headers = { "Content-Type": "application/json" };
      const result = await (await request(actionUrl, { method: "POST", body, headers })).json();
      setData(result.data || {}); onUpdated?.(result.data || {}); setMessage(result.message || "PDF saved on this LR.");
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }
  return <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-sm font-bold">E-way bill document</p>
    {!noteId && !ensureSaved ? <p className="mt-2 text-xs text-slate-500">Save the LR to manage its e-way bill.</p> : <>
      <p className="my-2 text-xs text-slate-600">{data.ewaybillNo ? `${data.ewaybillNo} · ${data.source || "Manually recorded"}` : "No e-way bill recorded"}{data.file?.fileName ? ` · ${data.file.fileName}` : " · PDF pending"}</p>
      <div className="flex flex-wrap gap-2">
        {!readOnly && <>
          {(formStatus ?? data.status) === "To Be Generated" && <button type="button" disabled={busy || Boolean(formNumber ?? data.ewaybillNo) || data.apiState === "uncertain"} className={button} onClick={() => run("generate")}>Generate E-way Bill</button>}
          {(formStatus ?? data.status) === "Provided by Customer" && <button type="button" disabled={busy || !(formNumber ?? data.ewaybillNo)} className={button} onClick={() => run("fetch")}>Fetch & Verify</button>}
        </>}
        <button type="button" disabled={!data.file?.storageName || busy} className={button} onClick={() => openPdf(`${url}?file=1`).catch(e => setMessage(e.message))}>View PDF</button>
      </div>
      {!readOnly && <p className="mt-2 text-xs text-slate-500">{ensureSaved ? "Generate or Fetch saves this LR as a draft here first. You can continue editing and submit it when ready." : "Save LR changes before Generate or Fetch. These actions use the saved LR and its operating company."}</p>}
    </>}
    {message && <p role="status" className="mt-2 text-xs text-amber-800">{message}</p>}
  </div>;
}
export function LoadingEwaybillDocuments({ panelId, printDisabled = false }) {
  const [data, setData] = useState(null), [message, setMessage] = useState("");
  const url = `/api/loading-panel/${panelId}/ewaybill`;
  const load = () => { if (panelId) request(url).then(r => r.json()).then(r => { setData(r.data); setMessage(""); }).catch(e => setMessage(e.message)); };
  useEffect(load, [url, panelId]);
  return <div className="space-y-2 text-xs">
    {!panelId ? <p>Save Loading Info first. E-way bills are managed on each LR.</p> : <>
      {data && <SummaryBar data={data} onRefresh={load} printDisabled={printDisabled} />}
      {data?.rows?.map((row, i) => <div key={row.rowId || row.id || i}>
        <RowCard row={row} index={i} mode="ewaybill" locked={!data.allowed} approvalsBlocked={!data.approvals?.allApproved}>
          {[false, true].map(print => <button key={String(print)} type="button"
            className={!data.allowed || !row.hasFile || (print && printDisabled)
              ? "cursor-not-allowed rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500"
              : "rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"}
            disabled={!data.allowed || !row.hasFile || (print && printDisabled)}
            onClick={() => openPdf(`${url}?lrId=${row.id}${print ? "&print=1" : ""}`, print).catch(e => setMessage(e.message))}>{print ? "Print" : "View"}</button>)}
        </RowCard>
        {data.allowed && <p className="mt-1 text-[11px] text-slate-500">{row.number ? `E-way bill ${row.number}` : "E-way bill pending"}{row.expiry ? ` · Valid until ${row.expiry}` : ""}{row.container ? ` · ${row.container}` : ""}{!row.hasFile && " · PDF pending"}</p>}
      </div>)}
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">View-only. E-way bills are managed on each LR. Documents open once every LR is created, approved and has its invoice, and linked Pricing, VBP, VFT, VOT and VL approvals are complete.</p>
      {!data && !message && <p>Checking e-way bills…</p>}
    </>}
    {message && <p role="status" className="text-red-700">{message}</p>}
  </div>;
}
