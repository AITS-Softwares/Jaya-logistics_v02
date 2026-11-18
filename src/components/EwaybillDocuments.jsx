"use client";
import { useEffect, useState } from "react";
import { SummaryBar, RowCard } from "@/components/LoadingInfoLRViewer";
import EwaybillRequestPreview from "@/components/EwaybillRequestPreview";
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
const button = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none";
const primaryButton = `${button} border border-transparent bg-purple-600 text-white enabled:hover:bg-purple-700 focus-visible:ring-purple-500`;
const pdfButton = `${button} border border-indigo-200 bg-white text-indigo-700 enabled:hover:bg-indigo-50 focus-visible:ring-indigo-500`;
function ActionIcon({kind}) {
 return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">{kind==='generate'?<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>:kind==='fetch'?<><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 17.9 17"/></>:<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>}</svg>;
}
export default function EwaybillDocuments({ noteId, readOnly = false, onUpdated, formStatus, formNumber, children }) {
  const [data, setData] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const url = `/api/consignment-note/${noteId}/ewaybill`;
  useEffect(() => { if (noteId) request(url).then(r => r.json()).then(r => setData(r.data || {})).catch(e => setMessage(e.message)); }, [url, noteId]);
  async function run(action, confirmed = false) {
    setBusy(true); setMessage("");
    let attemptedUrl;
    try {
      const savedId = confirmed ? preview?.noteId : noteId;
      if (!savedId) throw new Error("Open a saved LR before managing its e-way bill.");
      const actionUrl = `/api/consignment-note/${savedId}/ewaybill`;
      attemptedUrl = actionUrl;
      const isPreview = !confirmed && (action === "generate" || action === "preview");
      const body = JSON.stringify({ action: isPreview ? "preview" : action, ...(confirmed && { previewToken: preview.previewToken }) });
      const headers = { "Content-Type": "application/json" };
      const result = await (await request(actionUrl, { method: "POST", body, headers })).json();
      if (isPreview) { setPreview({ ...result.data, noteId: savedId }); return; }
      setPreview(null);
      setData(result.data || {}); onUpdated?.(result.data || {}); setMessage(result.message || "PDF saved on this LR.");
    } catch (e) {
      setMessage(e.message);
      if (confirmed) setPreview(null);
      if (attemptedUrl) {
        try { const latest = await (await request(attemptedUrl)).json(); setData(latest.data || {}); onUpdated?.(latest.data || {}); }
        catch { /* Keep the original failure visible if refreshing also fails. */ }
      }
    } finally { setBusy(false); }
  }
  return <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-sm font-extrabold text-slate-900">ERPNext Request</p>
    {!noteId ? <p className="mt-2 text-xs text-slate-500">Save the LR to manage its e-way bill.</p> : <>
      <p className="my-2 text-xs text-slate-600">{data.ewaybillNo ? `${data.ewaybillNo} · ${data.source || "Manually recorded"}` : "No e-way bill recorded"}{data.file?.fileName ? ` · ${data.file.fileName}` : " · PDF pending"}</p>
      {children}
      <div className="flex flex-wrap gap-2">
        {!readOnly && <>
          <button type="button" disabled={busy} className={pdfButton} onClick={() => run("preview")}><ActionIcon kind="pdf"/>Preview ERPNext request</button>
          {["uncertain","processing"].includes(data.apiState) && <button type="button" disabled={busy} className={pdfButton} onClick={() => run("status")}><ActionIcon kind="fetch"/>Check ERPNext status</button>}
          {(formStatus ?? data.status) === "To Be Generated" && <button type="button" disabled={busy || Boolean(formNumber ?? data.ewaybillNo) || data.apiState === "uncertain"} className={primaryButton} onClick={() => run("generate")}><ActionIcon kind="generate"/>Generate E-way Bill</button>}
          {((formStatus ?? data.status) === "Provided by Customer" || Boolean(formNumber ?? data.ewaybillNo) || ["uncertain", "processing"].includes(data.apiState)) && <button type="button" disabled={busy || !(formNumber ?? data.ewaybillNo)} className={primaryButton} onClick={() => run("fetch")}><ActionIcon kind="fetch"/>Fetch & Verify</button>}
        </>}
        <button type="button" disabled={!data.file?.storageName || busy} className={pdfButton} onClick={() => openPdf(`${url}?file=1`).catch(e => setMessage(e.message))}><ActionIcon kind="pdf"/>View PDF</button>
      </div>
      {!readOnly && <p className="mt-2 text-xs text-slate-500">Save LR changes before Preview, Generate or Fetch. These actions use this saved LR and its operating company.</p>}
      {data.distance > 0 && <p className="mt-2 text-xs text-slate-600">E-way bill distance: {data.distance} km</p>}
      {["uncertain", "processing"].includes(data.apiState) && <p className="mt-2 text-xs text-amber-800">Check the generation outcome in ERPNext. After any running request finishes, enter the actual bill number and use Fetch &amp; Verify to reconcile; do not generate again. Interrupted requests can be reconciled after two minutes.</p>}
    </>}
    {message && <p role="status" className="mt-2 text-xs text-amber-800">{message}</p>}
    <EwaybillRequestPreview preview={preview} busy={busy} message={message} onClose={() => setPreview(null)} onConfirm={() => run("generate", true)} />
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
