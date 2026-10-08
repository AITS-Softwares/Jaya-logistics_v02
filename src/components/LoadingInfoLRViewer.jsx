"use client";

import { useEffect, useState, useCallback } from "react";
import { buildLRHtml, getBusinessInfo, recordAndPrintLR } from "@/lib/lrPrintTemplate";

/**
 * View-only Consignment Note (LR) module for the Loading Info page.
 *
 * Loading Info users cannot create LRs, so this component never creates
 * anything. It shows which LR(s) have been created from this Loading Info and
 * lets the user view and print them.
 *   - No LR yet  -> one disabled "View LR" button
 *   - LR created -> a row per LR with View and Print buttons
 */

/* ------------------------------------------------------------------ */
/* Shared per-LR status (one row per order row of the Loading Info)    */
/* ------------------------------------------------------------------ */
function useLRStatus(panelId) {
    const [st, setSt] = useState({ status: panelId ? "loading" : "unsaved", data: null, error: "" });

    const load = useCallback(async () => {
        if (!panelId) { setSt({ status: "unsaved", data: null, error: "" }); return; }
        setSt((s) => ({ ...s, status: s.data ? s.status : "loading", error: "" })); // silent refresh keeps the open popup
        try {
            const res = await fetch(`/api/loading-panel/${encodeURIComponent(panelId)}/lr`,
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || "Unable to load LR");
            const d = json.data || {};
            setSt({ status: (d.rows || []).length ? "loaded" : "none", data: d, error: "" });
        } catch (err) {
            setSt({ status: "error", data: null, error: err.message });
        }
    }, [panelId]);

    useEffect(() => { load(); }, [load]);
    return { ...st, load };
}

/** LR / invoice can be opened only when every LR is ready AND VBP, VFT, VOT, VL are all Approved. */
const canOpen = (d) => Boolean(d?.complete && d?.approvals?.allApproved);

const GREEN = "bg-green-100 text-green-700";
const AMBER = "bg-amber-100 text-amber-700";
const GRAY = "bg-gray-100 text-gray-500";

function Badge({ tone, children }) {
    return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${tone}`}>{children}</span>;
}

/** "3 LRs expected · 2 created · 2 approved · 1 invoice uploaded" + progress bar. */
function SummaryBar({ data, onRefresh, showPrint }) {
    const c = data.counts || { expected: 0, created: 0, approved: 0, invoiceUploaded: 0 };
    const ready = data.ready || 0;
    const pct = c.expected ? Math.round((ready / c.expected) * 100) : 0;
    const Stat = ({ n, label }) => (
        <div className="rounded-md bg-white/70 px-2 py-1 text-center">
            <div className="text-sm font-extrabold text-slate-900">{n}<span className="text-slate-400">/{c.expected}</span></div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        </div>
    );
    return (
        <div className={`rounded-lg border p-2 ${data.complete ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-bold ${data.complete ? "text-green-800" : "text-amber-800"}`}>
                    {data.complete ? "All LRs are ready" : `${ready} of ${c.expected} LR ready`}
                </span>
                {onRefresh && <button type="button" onClick={onRefresh} className="text-xs font-semibold text-blue-600 underline">Refresh</button>}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
                <Stat n={c.created} label="Created" />
                <Stat n={c.approved} label="Approved" />
                <Stat n={c.invoiceUploaded} label="Invoice" />
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-white/70">
                <div className={`h-full ${data.complete ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
            </div>
            {showPrint && canOpen(data) && (
                <div className="mt-2 rounded-md bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-700">
                    🖨️ {c.printed || 0} of {c.expected} LR printed. Out Date and Out Time are recorded when the last LR is printed.
                </div>
            )}
            {data.approvals && !data.approvals.allApproved && (
                <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] font-semibold text-red-700">
                    ⛔ Not Approved — LR and Invoice cannot be viewed or printed until all 4 statuses are Approved.
                    <div className="mt-1 flex flex-wrap gap-1">
                        {data.approvals.items.map((i) => (
                            <span key={i.key} className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${i.approved ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {i.key}: {i.approved ? "Approved" : i.value}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            {!data.complete && (
                <div className="mt-2 rounded-md bg-white/70 px-2 py-1 text-[11px] font-semibold text-amber-800">
                    🔒 View and Print unlock only when all {c.expected} LRs are created, approved and have their invoice uploaded.
                </div>
            )}
        </div>
    );
}

/** One order row: what it is, its LR / invoice state, and its action buttons. */
function RowCard({ row, index, mode, locked, approvalsBlocked, children }) {
    const lr = row.lr;
    const ready = row.state === "ready";
    return (
        <div className={`rounded-lg border p-2 ${ready ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-amber-50/40"}`}>
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">#{index + 1}</span>
                        <span className={`truncate text-sm font-extrabold ${lr ? "text-slate-900" : "text-slate-400"}`}>
                            {lr ? lr.lrNo : "LR not created"}
                        </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-600">
                        {row.orderNo ? `Order ${row.orderNo}` : "Order"}
                        {row.to ? ` · To ${row.to}` : ""}
                        {row.weight ? ` · ${row.weight} MT` : ""}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                        {!lr ? <Badge tone={GRAY}>LR: not created</Badge> : (
                            <>
                                <Badge tone={GREEN}>LR: created</Badge>
                                <Badge tone={lr.approved ? GREEN : AMBER}>{lr.approved ? "Approved" : `Not approved${lr.status ? ` (${lr.status})` : ""}`}</Badge>
                                <Badge tone={lr.invoiceUploaded ? GREEN : AMBER}>{lr.invoiceUploaded ? "Invoice uploaded" : "Invoice not uploaded"}</Badge>
                                {mode === "lr" && <Badge tone={lr.printed ? GREEN : GRAY}>{lr.printed ? "Printed" : "Not printed"}</Badge>}
                            </>
                        )}
                    </div>
                    {mode === "invoice" && lr?.invoiceUploaded && (
                        <div className="mt-1 truncate text-[11px] text-slate-500">
                            Invoice {lr.invoiceNo || "(no. not entered)"}{lr.invoiceFileName ? ` · ${lr.invoiceFileName}` : ""}
                        </div>
                    )}
                </div>
                <div className="flex shrink-0 gap-1.5">{children}</div>
            </div>
            {!ready && (
                <div className="mt-1.5 text-[11px] font-semibold text-amber-700">Pending: {row.reason}</div>
            )}
            {ready && locked && (
                <div className="mt-1.5 text-[11px] font-semibold text-green-700">{approvalsBlocked ? "This LR is ready. Not Approved: VBP, VFT, VOT and VL must all be Approved." : "This LR is ready. Waiting for the other LRs."}</div>
            )}
        </div>
    );
}

function DisabledBtn({ children, reason }) {
    return (
        <button type="button" disabled title={reason}
            className="cursor-not-allowed rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500">
            {children}
        </button>
    );
}

const LOCK_REASON = "Not Approved: available once VBP, VFT, VOT and VL are Approved and all LRs are created, approved and have their invoice uploaded";

const STATUS_HINT = {
    unsaved: "Save this Loading Info first. The LR is created by the Consignment Note team and will appear here.",
    loading: "Checking LRs…",
    none: "No LR yet. Each order row of this Loading Info gets its own LR.",
};

export default function LoadingInfoLRViewer({ panelId }) {
    const { status, data, error, load } = useLRStatus(panelId);
    const [openId, setOpenId] = useState(null); // _id of the LR shown in the popup
    const [viewHtml, setViewHtml] = useState("");
    const [busyId, setBusyId] = useState(null);

    const rows = data?.rows || [];
    const notes = data?.notes || [];
    const loadingInfoNo = data?.loadingInfoNo || "";
    const noteOf = (row) => notes.find((n) => String(n._id) === String(row.lr?._id));
    const activeNote = openId ? notes.find((n) => String(n._id) === String(openId)) : null;
    const open = canOpen(data);

    useEffect(() => {
        if (openId === null) return;
        const onKey = (e) => e.key === "Escape" && setOpenId(null);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [openId]);

    // View shows the same layout the Consignment Note page prints.
    useEffect(() => {
        if (!activeNote) { setViewHtml(""); return; }
        let live = true;
        getBusinessInfo().then((b) => { if (live) setViewHtml(buildLRHtml(activeNote, b, loadingInfoNo)); });
        return () => { live = false; };
    }, [activeNote, loadingInfoNo]);

    const printOne = async (note) => {
        setBusyId(String(note._id));
        try {
            await recordAndPrintLR(panelId, note, loadingInfoNo);
            await load(); // refresh Printed badges / counter
        } catch (e) {
            alert(e.message || "Unable to print the LR.");
        } finally {
            setBusyId(null);
        }
    };

    if (status !== "loaded") {
        return (
            <>
                <button type="button" disabled
                    className="w-full cursor-not-allowed rounded-lg bg-gray-400 px-4 py-2 text-xs font-bold text-white">
                    {status === "loading" ? "Checking LR…" : "View LR"}
                </button>
                <p className={`mt-2 text-xs ${status === "error" ? "text-red-600" : "text-slate-500"}`}>
                    {status === "error" ? error : STATUS_HINT[status]}{" "}
                    {(status === "none" || status === "error") && panelId && (
                        <button type="button" onClick={load} className="font-semibold text-blue-600 underline">Refresh</button>
                    )}
                </p>
            </>
        );
    }

    return (
        <>
            <div className="space-y-2">
                <SummaryBar data={data} onRefresh={load} showPrint />
                {rows.map((row, i) => {
                    const note = noteOf(row);
                    const busy = note && busyId === String(note._id);
                    return (
                        <RowCard key={row.rowId} row={row} index={i} mode="lr" locked={!open} approvalsBlocked={!data.approvals?.allApproved}>
                            {note && open ? (
                                <>
                                    <button type="button" onClick={() => setOpenId(String(note._id))}
                                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">View</button>
                                    <button type="button" disabled={busyId !== null} onClick={() => printOne(note)}
                                        className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60">{busy ? "Printing…" : "Print"}</button>
                                </>
                            ) : (
                                <>
                                    <DisabledBtn reason={LOCK_REASON}>View</DisabledBtn>
                                    <DisabledBtn reason={LOCK_REASON}>Print</DisabledBtn>
                                </>
                            )}
                        </RowCard>
                    );
                })}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
                View-only. LRs open together once every LR is created, approved and has its invoice, and VBP, VFT, VOT and VL are Approved. Out Date and Out Time are recorded once, when the last LR is printed (any order).
            </p>

            {activeNote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpenId(null)}>
                    <div
                        role="dialog" aria-modal="true" aria-label="Consignment Note (view only)"
                        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900">Consignment Note (LR) — {activeNote.lrNo}</h3>
                                <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">View only</span>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" disabled={busyId !== null} onClick={() => printOne(activeNote)}
                                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">
                                    {busyId === String(activeNote._id) ? "Printing…" : "Print"}
                                </button>
                                <button type="button" onClick={() => setOpenId(null)}
                                    className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Close</button>
                            </div>
                        </div>

                        {notes.length > 1 && (
                            <div className="mb-4 flex flex-wrap gap-2">
                                {notes.map((n) => (
                                    <button key={n._id || n.lrNo} type="button" onClick={() => setOpenId(String(n._id))}
                                        className={`rounded-lg px-3 py-1 text-xs font-bold ${String(n._id) === String(openId) ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                                        {n.lrNo}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                            {viewHtml
                                ? <iframe title={`LR ${activeNote.lrNo}`} srcDoc={viewHtml} className="h-[70vh] w-full border-0" />
                                : <div className="p-6 text-sm text-slate-500">Loading LR…</div>}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

async function invoiceBlob(panelId, lrId) {
    const res = await fetch(`/api/loading-panel/${encodeURIComponent(panelId)}/lr-invoice?lrId=${lrId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    if (!res.ok) throw new Error();
    return URL.createObjectURL(await res.blob());
}

export function LoadingInfoInvoiceViewer({ panelId }) {
    const { status, data, error, load } = useLRStatus(panelId);

    const show = async (lrId) => {
        const w = window.open("", "_blank"); // open first so pop-up blockers allow it
        try {
            const u = await invoiceBlob(panelId, lrId);
            w ? w.location.replace(u) : window.open(u);
            setTimeout(() => URL.revokeObjectURL(u), 300000);
        } catch { w?.close(); alert("Invoice could not be opened."); }
    };

    const print = async (lrId) => {
        try {
            const u = await invoiceBlob(panelId, lrId);
            const f = document.createElement("iframe");
            f.style.cssText = "position:fixed;width:0;height:0;border:0";
            f.src = u;
            f.onload = () => { try { f.contentWindow.print(); } catch { window.open(u); } };
            document.body.appendChild(f);
            setTimeout(() => { f.remove(); URL.revokeObjectURL(u); }, 300000);
        } catch { alert("Invoice could not be printed."); }
    };

    if (status !== "loaded") {
        return (
            <>
                <button type="button" disabled
                    className="w-full cursor-not-allowed rounded-lg bg-gray-400 px-4 py-2 text-xs font-bold text-white">
                    {status === "loading" ? "Checking invoices…" : "View Invoice"}
                </button>
                <p className={`mt-2 text-xs ${status === "error" ? "text-red-600" : "text-slate-500"}`}>
                    {status === "error" ? error : (status === "unsaved" ? "Save this Loading Info first. Invoices are uploaded on the LR page." : STATUS_HINT[status])}{" "}
                    {(status === "none" || status === "error") && panelId && (
                        <button type="button" onClick={load} className="font-semibold text-blue-600 underline">Refresh</button>
                    )}
                </p>
            </>
        );
    }

    const rows = data?.rows || [];
    return (
        <>
            <div className="space-y-2">
                <SummaryBar data={data} onRefresh={load} />
                {rows.map((row, i) => (
                    <RowCard key={row.rowId} row={row} index={i} mode="invoice" locked={!canOpen(data)} approvalsBlocked={!data.approvals?.allApproved}>
                        {row.state === "ready" && canOpen(data) ? (
                            <>
                                <button type="button" onClick={() => show(row.lr._id)}
                                    className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700">View</button>
                                <button type="button" onClick={() => print(row.lr._id)}
                                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800">Print</button>
                            </>
                        ) : (
                            <>
                                <DisabledBtn reason={LOCK_REASON}>View</DisabledBtn>
                                <DisabledBtn reason={LOCK_REASON}>Print</DisabledBtn>
                            </>
                        )}
                    </RowCard>
                ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">View-only. Each invoice is uploaded on its LR page. Invoices open together once every LR is created and approved.</p>
        </>
    );
}


// "use client";

// import { useEffect, useState, useCallback } from "react";

// /**
//  * View-only Consignment Note (LR) module for the Loading Info page.
//  *
//  * Loading Info users cannot create LRs, so this component never creates
//  * anything. It shows which LR(s) have been created from this Loading Info and
//  * lets the user view and print them.
//  *   - No LR yet  -> one disabled "View LR" button
//  *   - LR created -> a row per LR with View and Print buttons
//  */

// const dash = (v) => (v === undefined || v === null || v === "" ? "—" : String(v));
// const esc = (v) =>
//     String(v === undefined || v === null || v === "" ? "—" : v)
//         .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
//         .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// const formatIST = (value) => {
//     if (!value) return "—";
//     try {
//         return new Date(value).toLocaleString("en-IN", {
//             timeZone: "Asia/Kolkata",
//             day: "2-digit", month: "short", year: "numeric",
//             hour: "2-digit", minute: "2-digit", hour12: false,
//         });
//     } catch {
//         return "—";
//     }
// };

// /** Build the on-screen field groups once, so the popup and the print sheet match. */
// function lrSections(note) {
//     const h = note.header || {};
//     return [
//         {
//             title: "LR Summary",
//             fields: [
//                 ["LR No", note.lrNo],
//                 ["LR Generated At (IST)", formatIST(note.createdAt)],
//                 ["LR Date", h.lrDate],
//                 ["Order No", h.orderNo],
//                 ["Party", h.partyName],
//                 ["Vehicle No", h.vehicleNo],
//                 ["From", h.from],
//                 ["To", h.to],
//                 ["Total Weight", note.totalWeight !== undefined && note.totalWeight !== null ? `${note.totalWeight} ${h.unit || ""}`.trim() : ""],
//                 ["LR Type", note.lrType || h.lrType],
//                 ["LC Status", note.lcStatus || h.lcStatus],
//                 ["Status", h.status],
//             ],
//         },
//         {
//             title: "Consignor / Consignee",
//             fields: [
//                 ["Consignor", note.consignor?.name],
//                 ["Consignor Address", note.consignor?.address],
//                 ["Consignee", note.consignee?.name],
//                 ["Consignee Address", note.consignee?.address],
//             ],
//         },
//         {
//             title: "Invoice & E-waybill",
//             fields: [
//                 ["Invoice Type", note.invoice?.boeInvoice],
//                 ["Invoice No", note.invoice?.boeInvoiceNo],
//                 ["Invoice Date", note.invoice?.boeInvoiceDate],
//                 ["Invoice Value", note.invoice?.invoiceValue],
//                 ["E-waybill No", note.ewaybill?.ewaybillNo],
//                 ["E-waybill Expiry", note.ewaybill?.expiryDate],
//                 ["Container No", note.ewaybill?.containerNo],
//             ],
//         },
//     ];
// }

// function printLR(note, loadingInfoNo) {
//     const sections = lrSections(note);
//     const breakdown = Array.isArray(note.consignmentBreakdown) ? note.consignmentBreakdown : [];
//     const remarks = note.remarks || note.header?.remarks;

//     const html = `<!doctype html><html><head><meta charset="utf-8"/>
// <title>LR ${esc(note.lrNo)}</title>
// <style>
//   *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:24px;font-size:12px}
//   h1{font-size:18px;margin:0} .sub{color:#64748b;margin:2px 0 14px}
//   .sec{border:1px solid #cbd5e1;border-radius:6px;padding:10px 12px;margin-bottom:10px;page-break-inside:avoid}
//   .sec h2{font-size:11px;letter-spacing:.06em;text-transform:uppercase;margin:0 0 8px;color:#334155}
//   .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 14px}
//   .l{font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b} .v{font-size:12px;word-break:break-word}
//   table{width:100%;border-collapse:collapse} th,td{border-top:1px solid #e2e8f0;padding:4px 6px;text-align:left;font-size:11px}
//   th{font-size:10px;color:#64748b;border-top:none}
//   .foot{margin-top:14px;color:#64748b;font-size:10px}
//   @media print{body{margin:10mm}}
// </style></head><body>
// <h1>Consignment Note (LR) — ${esc(note.lrNo)}</h1>
// <div class="sub">Loading Info: ${esc(loadingInfoNo)}</div>
// ${sections.map((s) => `<div class="sec"><h2>${esc(s.title)}</h2><div class="grid">${s.fields.map(([l, v]) => `<div><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div></div>`).join("")
//         }</div></div>`).join("")}
// ${breakdown.length ? `<div class="sec"><h2>Order Breakdown</h2><table><thead><tr><th>Order No</th><th>From</th><th>To</th><th>Weight</th></tr></thead><tbody>${breakdown.map((r) => `<tr><td>${esc(r.orderNo)}</td><td>${esc(r.from)}</td><td>${esc(r.to)}</td><td>${esc(r.weight)} ${esc(r.unit || "")}</td></tr>`).join("")
//             }</tbody></table></div>` : ""}
// ${remarks ? `<div class="sec"><h2>Remarks</h2><div class="v">${esc(remarks)}</div></div>` : ""}
// <div class="foot">Printed ${esc(formatIST(new Date()))} (IST)</div>
// </body></html>`;

//     const win = window.open("", "_blank", "width=900,height=700");
//     if (!win) {
//         alert("Please allow pop-ups to print the LR.");
//         return;
//     }
//     win.document.open();
//     win.document.write(html);
//     win.document.close();
//     win.focus();
//     // Let the new window lay out before opening the print dialog.
//     win.onload = () => win.print();
//     setTimeout(() => { try { win.print(); } catch { /* window already closed */ } }, 400);
// }

// function Field({ label, value }) {
//     return (
//         <div>
//             <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
//             <div className="mt-0.5 text-sm text-slate-900 break-words">{dash(value)}</div>
//         </div>
//     );
// }

// function LRDetails({ note }) {
//     const breakdown = Array.isArray(note.consignmentBreakdown) ? note.consignmentBreakdown : [];
//     const remarks = note.remarks || note.header?.remarks;
//     return (
//         <div className="space-y-4">
//             {lrSections(note).map((section) => (
//                 <div key={section.title} className="rounded-xl border border-slate-200 p-4">
//                     <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-700">{section.title}</h4>
//                     <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
//                         {section.fields.map(([label, value]) => <Field key={label} label={label} value={value} />)}
//                     </div>
//                 </div>
//             ))}

//             {breakdown.length > 0 && (
//                 <div className="rounded-xl border border-slate-200 p-4">
//                     <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-700">Order Breakdown</h4>
//                     <div className="overflow-x-auto">
//                         <table className="w-full text-sm">
//                             <thead>
//                                 <tr className="text-left text-xs text-slate-500">
//                                     <th className="py-1 pr-3">Order No</th><th className="py-1 pr-3">From</th>
//                                     <th className="py-1 pr-3">To</th><th className="py-1">Weight</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 {breakdown.map((row, i) => (
//                                     <tr key={row._id || i} className="border-t border-slate-100">
//                                         <td className="py-1 pr-3">{dash(row.orderNo)}</td>
//                                         <td className="py-1 pr-3">{dash(row.from)}</td>
//                                         <td className="py-1 pr-3">{dash(row.to)}</td>
//                                         <td className="py-1">{dash(row.weight)} {row.unit || ""}</td>
//                                     </tr>
//                                 ))}
//                             </tbody>
//                         </table>
//                     </div>
//                 </div>
//             )}

//             {remarks && (
//                 <div className="rounded-xl border border-slate-200 p-4">
//                     <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-700">Remarks</h4>
//                     <p className="text-sm text-slate-900 break-words">{remarks}</p>
//                 </div>
//             )}
//         </div>
//     );
// }

// /* ------------------------------------------------------------------ */
// /* Shared per-LR status (one row per order row of the Loading Info)    */
// /* ------------------------------------------------------------------ */
// function useLRStatus(panelId) {
//     const [st, setSt] = useState({ status: panelId ? "loading" : "unsaved", data: null, error: "" });

//     const load = useCallback(async () => {
//         if (!panelId) { setSt({ status: "unsaved", data: null, error: "" }); return; }
//         setSt((s) => ({ ...s, status: "loading", error: "" }));
//         try {
//             const res = await fetch(`/api/loading-panel/${encodeURIComponent(panelId)}/lr`,
//                 { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
//             const json = await res.json();
//             if (!res.ok || !json.success) throw new Error(json.message || "Unable to load LR");
//             const d = json.data || {};
//             setSt({ status: (d.rows || []).length ? "loaded" : "none", data: d, error: "" });
//         } catch (err) {
//             setSt({ status: "error", data: null, error: err.message });
//         }
//     }, [panelId]);

//     useEffect(() => { load(); }, [load]);
//     return { ...st, load };
// }

// /** LR / invoice can be opened only when every LR is ready AND VBP, VFT, VOT, VL are all Approved. */
// const canOpen = (d) => Boolean(d?.complete && d?.approvals?.allApproved);

// const GREEN = "bg-green-100 text-green-700";
// const AMBER = "bg-amber-100 text-amber-700";
// const GRAY = "bg-gray-100 text-gray-500";

// function Badge({ tone, children }) {
//     return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${tone}`}>{children}</span>;
// }

// /** "3 LRs expected · 2 created · 2 approved · 1 invoice uploaded" + progress bar. */
// function SummaryBar({ data, onRefresh }) {
//     const c = data.counts || { expected: 0, created: 0, approved: 0, invoiceUploaded: 0 };
//     const ready = data.ready || 0;
//     const pct = c.expected ? Math.round((ready / c.expected) * 100) : 0;
//     const Stat = ({ n, label }) => (
//         <div className="rounded-md bg-white/70 px-2 py-1 text-center">
//             <div className="text-sm font-extrabold text-slate-900">{n}<span className="text-slate-400">/{c.expected}</span></div>
//             <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
//         </div>
//     );
//     return (
//         <div className={`rounded-lg border p-2 ${data.complete ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
//             <div className="flex items-center justify-between gap-2">
//                 <span className={`text-xs font-bold ${data.complete ? "text-green-800" : "text-amber-800"}`}>
//                     {data.complete ? "All LRs are ready" : `${ready} of ${c.expected} LR ready`}
//                 </span>
//                 {onRefresh && <button type="button" onClick={onRefresh} className="text-xs font-semibold text-blue-600 underline">Refresh</button>}
//             </div>
//             <div className="mt-2 grid grid-cols-3 gap-2">
//                 <Stat n={c.created} label="Created" />
//                 <Stat n={c.approved} label="Approved" />
//                 <Stat n={c.invoiceUploaded} label="Invoice" />
//             </div>
//             <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-white/70">
//                 <div className={`h-full ${data.complete ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
//             </div>
//             {data.approvals && !data.approvals.allApproved && (
//                 <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] font-semibold text-red-700">
//                     ⛔ Not Approved — LR and Invoice cannot be viewed or printed until all 4 statuses are Approved.
//                     <div className="mt-1 flex flex-wrap gap-1">
//                         {data.approvals.items.map((i) => (
//                             <span key={i.key} className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${i.approved ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
//                                 {i.key}: {i.approved ? "Approved" : i.value}
//                             </span>
//                         ))}
//                     </div>
//                 </div>
//             )}
//             {!data.complete && (
//                 <div className="mt-2 rounded-md bg-white/70 px-2 py-1 text-[11px] font-semibold text-amber-800">
//                     🔒 View and Print unlock only when all {c.expected} LRs are created, approved and have their invoice uploaded.
//                 </div>
//             )}
//         </div>
//     );
// }

// /** One order row: what it is, its LR / invoice state, and its action buttons. */
// function RowCard({ row, index, mode, locked, approvalsBlocked, children }) {
//     const lr = row.lr;
//     const ready = row.state === "ready";
//     return (
//         <div className={`rounded-lg border p-2 ${ready ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-amber-50/40"}`}>
//             <div className="flex items-start justify-between gap-2">
//                 <div className="min-w-0">
//                     <div className="flex items-center gap-1.5">
//                         <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">#{index + 1}</span>
//                         <span className={`truncate text-sm font-extrabold ${lr ? "text-slate-900" : "text-slate-400"}`}>
//                             {lr ? lr.lrNo : "LR not created"}
//                         </span>
//                     </div>
//                     <div className="mt-0.5 text-[11px] text-slate-600">
//                         {row.orderNo ? `Order ${row.orderNo}` : "Order"}
//                         {row.to ? ` · To ${row.to}` : ""}
//                         {row.weight ? ` · ${row.weight} MT` : ""}
//                     </div>
//                     <div className="mt-1 flex flex-wrap items-center gap-1">
//                         {!lr ? <Badge tone={GRAY}>LR: not created</Badge> : (
//                             <>
//                                 <Badge tone={GREEN}>LR: created</Badge>
//                                 <Badge tone={lr.approved ? GREEN : AMBER}>{lr.approved ? "Approved" : `Not approved${lr.status ? ` (${lr.status})` : ""}`}</Badge>
//                                 <Badge tone={lr.invoiceUploaded ? GREEN : AMBER}>{lr.invoiceUploaded ? "Invoice uploaded" : "Invoice not uploaded"}</Badge>
//                             </>
//                         )}
//                     </div>
//                     {mode === "invoice" && lr?.invoiceUploaded && (
//                         <div className="mt-1 truncate text-[11px] text-slate-500">
//                             Invoice {lr.invoiceNo || "(no. not entered)"}{lr.invoiceFileName ? ` · ${lr.invoiceFileName}` : ""}
//                         </div>
//                     )}
//                 </div>
//                 <div className="flex shrink-0 gap-1.5">{children}</div>
//             </div>
//             {!ready && (
//                 <div className="mt-1.5 text-[11px] font-semibold text-amber-700">Pending: {row.reason}</div>
//             )}
//             {ready && locked && (
//                 <div className="mt-1.5 text-[11px] font-semibold text-green-700">{approvalsBlocked ? "This LR is ready. Not Approved: VBP, VFT, VOT and VL must all be Approved." : "This LR is ready. Waiting for the other LRs."}</div>
//             )}
//         </div>
//     );
// }

// function DisabledBtn({ children, reason }) {
//     return (
//         <button type="button" disabled title={reason}
//             className="cursor-not-allowed rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500">
//             {children}
//         </button>
//     );
// }

// const LOCK_REASON = "Not Approved: available once VBP, VFT, VOT and VL are Approved and all LRs are created, approved and have their invoice uploaded";

// const STATUS_HINT = {
//     unsaved: "Save this Loading Info first. The LR is created by the Consignment Note team and will appear here.",
//     loading: "Checking LRs…",
//     none: "No LR yet. Each order row of this Loading Info gets its own LR.",
// };

// export default function LoadingInfoLRViewer({ panelId }) {
//     const { status, data, error, load } = useLRStatus(panelId);
//     const [openId, setOpenId] = useState(null); // _id of the LR shown in the popup

//     useEffect(() => {
//         if (openId === null) return;
//         const onKey = (e) => e.key === "Escape" && setOpenId(null);
//         window.addEventListener("keydown", onKey);
//         return () => window.removeEventListener("keydown", onKey);
//     }, [openId]);

//     const rows = data?.rows || [];
//     const notes = data?.notes || [];
//     const loadingInfoNo = data?.loadingInfoNo || "";
//     const noteOf = (row) => notes.find((n) => String(n._id) === String(row.lr?._id));
//     const activeNote = openId ? notes.find((n) => String(n._id) === String(openId)) : null;

//     if (status !== "loaded") {
//         return (
//             <>
//                 <button type="button" disabled
//                     className="w-full cursor-not-allowed rounded-lg bg-gray-400 px-4 py-2 text-xs font-bold text-white">
//                     {status === "loading" ? "Checking LR…" : "View LR"}
//                 </button>
//                 <p className={`mt-2 text-xs ${status === "error" ? "text-red-600" : "text-slate-500"}`}>
//                     {status === "error" ? error : STATUS_HINT[status]}{" "}
//                     {(status === "none" || status === "error") && panelId && (
//                         <button type="button" onClick={load} className="font-semibold text-blue-600 underline">Refresh</button>
//                     )}
//                 </p>
//             </>
//         );
//     }

//     return (
//         <>
//             <div className="space-y-2">
//                 <SummaryBar data={data} onRefresh={load} />
//                 {rows.map((row, i) => {
//                     const note = noteOf(row);
//                     return (
//                         <RowCard key={row.rowId} row={row} index={i} mode="lr" locked={!canOpen(data)} approvalsBlocked={!data.approvals?.allApproved}>
//                             {note && canOpen(data) ? (
//                                 <>
//                                     <button type="button" onClick={() => setOpenId(String(note._id))}
//                                         className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">View</button>
//                                     <button type="button" onClick={() => printLR(note, loadingInfoNo)}
//                                         className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800">Print</button>
//                                 </>
//                             ) : (
//                                 <>
//                                     <DisabledBtn reason={LOCK_REASON}>View</DisabledBtn>
//                                     <DisabledBtn reason={LOCK_REASON}>Print</DisabledBtn>
//                                 </>
//                             )}
//                         </RowCard>
//                     );
//                 })}
//             </div>
//             <p className="mt-2 text-[11px] text-slate-500">
//                 View-only. LRs open together once every LR is created, approved and has its invoice. Out Date and Out Time are recorded once, when the last LR is approved with its invoice.
//             </p>

//             {activeNote && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpenId(null)}>
//                     <div
//                         role="dialog" aria-modal="true" aria-label="Consignment Note (view only)"
//                         className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <div className="mb-4 flex items-start justify-between gap-3">
//                             <div>
//                                 <h3 className="text-lg font-extrabold text-slate-900">Consignment Note (LR) — {activeNote.lrNo}</h3>
//                                 <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">View only</span>
//                             </div>
//                             <div className="flex gap-2">
//                                 <button type="button" onClick={() => printLR(activeNote, loadingInfoNo)}
//                                     className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-800">Print</button>
//                                 <button type="button" onClick={() => setOpenId(null)}
//                                     className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Close</button>
//                             </div>
//                         </div>

//                         {notes.length > 1 && (
//                             <div className="mb-4 flex flex-wrap gap-2">
//                                 {notes.map((n) => (
//                                     <button key={n._id || n.lrNo} type="button" onClick={() => setOpenId(String(n._id))}
//                                         className={`rounded-lg px-3 py-1 text-xs font-bold ${String(n._id) === String(openId) ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
//                                         {n.lrNo}
//                                     </button>
//                                 ))}
//                             </div>
//                         )}

//                         <LRDetails note={activeNote} />
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// }

// async function invoiceBlob(panelId, lrId) {
//     const res = await fetch(`/api/loading-panel/${encodeURIComponent(panelId)}/lr-invoice?lrId=${lrId}`,
//         { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
//     if (!res.ok) throw new Error();
//     return URL.createObjectURL(await res.blob());
// }

// export function LoadingInfoInvoiceViewer({ panelId }) {
//     const { status, data, error, load } = useLRStatus(panelId);

//     const show = async (lrId) => {
//         const w = window.open("", "_blank"); // open first so pop-up blockers allow it
//         try {
//             const u = await invoiceBlob(panelId, lrId);
//             w ? w.location.replace(u) : window.open(u);
//             setTimeout(() => URL.revokeObjectURL(u), 300000);
//         } catch { w?.close(); alert("Invoice could not be opened."); }
//     };

//     const print = async (lrId) => {
//         try {
//             const u = await invoiceBlob(panelId, lrId);
//             const f = document.createElement("iframe");
//             f.style.cssText = "position:fixed;width:0;height:0;border:0";
//             f.src = u;
//             f.onload = () => { try { f.contentWindow.print(); } catch { window.open(u); } };
//             document.body.appendChild(f);
//             setTimeout(() => { f.remove(); URL.revokeObjectURL(u); }, 300000);
//         } catch { alert("Invoice could not be printed."); }
//     };

//     if (status !== "loaded") {
//         return (
//             <>
//                 <button type="button" disabled
//                     className="w-full cursor-not-allowed rounded-lg bg-gray-400 px-4 py-2 text-xs font-bold text-white">
//                     {status === "loading" ? "Checking invoices…" : "View Invoice"}
//                 </button>
//                 <p className={`mt-2 text-xs ${status === "error" ? "text-red-600" : "text-slate-500"}`}>
//                     {status === "error" ? error : (status === "unsaved" ? "Save this Loading Info first. Invoices are uploaded on the LR page." : STATUS_HINT[status])}{" "}
//                     {(status === "none" || status === "error") && panelId && (
//                         <button type="button" onClick={load} className="font-semibold text-blue-600 underline">Refresh</button>
//                     )}
//                 </p>
//             </>
//         );
//     }

//     const rows = data?.rows || [];
//     return (
//         <>
//             <div className="space-y-2">
//                 <SummaryBar data={data} onRefresh={load} />
//                 {rows.map((row, i) => (
//                     <RowCard key={row.rowId} row={row} index={i} mode="invoice" locked={!canOpen(data)} approvalsBlocked={!data.approvals?.allApproved}>
//                         {row.state === "ready" && canOpen(data) ? (
//                             <>
//                                 <button type="button" onClick={() => show(row.lr._id)}
//                                     className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700">View</button>
//                                 <button type="button" onClick={() => print(row.lr._id)}
//                                     className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800">Print</button>
//                             </>
//                         ) : (
//                             <>
//                                 <DisabledBtn reason={LOCK_REASON}>View</DisabledBtn>
//                                 <DisabledBtn reason={LOCK_REASON}>Print</DisabledBtn>
//                             </>
//                         )}
//                     </RowCard>
//                 ))}
//             </div>
//             <p className="mt-2 text-[11px] text-slate-500">View-only. Each invoice is uploaded on its LR page. Invoices open together once every LR is created and approved.</p>
//         </>
//     );
// }