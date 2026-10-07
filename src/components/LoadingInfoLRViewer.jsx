"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * View-only Consignment Note (LR) module for the Loading Info page.
 *
 * Loading Info users cannot create LRs, so this component never creates
 * anything. It shows which LR(s) have been created from this Loading Info and
 * lets the user view and print them.
 *   - No LR yet  -> one disabled "View LR" button
 *   - LR created -> a row per LR with View and Print buttons
 */

const dash = (v) => (v === undefined || v === null || v === "" ? "—" : String(v));
const esc = (v) =>
    String(v === undefined || v === null || v === "" ? "—" : v)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const formatIST = (value) => {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: false,
        });
    } catch {
        return "—";
    }
};

/** Build the on-screen field groups once, so the popup and the print sheet match. */
function lrSections(note) {
    const h = note.header || {};
    return [
        {
            title: "LR Summary",
            fields: [
                ["LR No", note.lrNo],
                ["LR Generated At (IST)", formatIST(note.createdAt)],
                ["LR Date", h.lrDate],
                ["Order No", h.orderNo],
                ["Party", h.partyName],
                ["Vehicle No", h.vehicleNo],
                ["From", h.from],
                ["To", h.to],
                ["Total Weight", note.totalWeight !== undefined && note.totalWeight !== null ? `${note.totalWeight} ${h.unit || ""}`.trim() : ""],
                ["LR Type", note.lrType || h.lrType],
                ["LC Status", note.lcStatus || h.lcStatus],
                ["Status", h.status],
            ],
        },
        {
            title: "Consignor / Consignee",
            fields: [
                ["Consignor", note.consignor?.name],
                ["Consignor Address", note.consignor?.address],
                ["Consignee", note.consignee?.name],
                ["Consignee Address", note.consignee?.address],
            ],
        },
        {
            title: "Invoice & E-waybill",
            fields: [
                ["Invoice Type", note.invoice?.boeInvoice],
                ["Invoice No", note.invoice?.boeInvoiceNo],
                ["Invoice Date", note.invoice?.boeInvoiceDate],
                ["Invoice Value", note.invoice?.invoiceValue],
                ["E-waybill No", note.ewaybill?.ewaybillNo],
                ["E-waybill Expiry", note.ewaybill?.expiryDate],
                ["Container No", note.ewaybill?.containerNo],
            ],
        },
    ];
}

function printLR(note, loadingInfoNo) {
    const sections = lrSections(note);
    const breakdown = Array.isArray(note.consignmentBreakdown) ? note.consignmentBreakdown : [];
    const remarks = note.remarks || note.header?.remarks;

    const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>LR ${esc(note.lrNo)}</title>
<style>
  *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:24px;font-size:12px}
  h1{font-size:18px;margin:0} .sub{color:#64748b;margin:2px 0 14px}
  .sec{border:1px solid #cbd5e1;border-radius:6px;padding:10px 12px;margin-bottom:10px;page-break-inside:avoid}
  .sec h2{font-size:11px;letter-spacing:.06em;text-transform:uppercase;margin:0 0 8px;color:#334155}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 14px}
  .l{font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b} .v{font-size:12px;word-break:break-word}
  table{width:100%;border-collapse:collapse} th,td{border-top:1px solid #e2e8f0;padding:4px 6px;text-align:left;font-size:11px}
  th{font-size:10px;color:#64748b;border-top:none}
  .foot{margin-top:14px;color:#64748b;font-size:10px}
  @media print{body{margin:10mm}}
</style></head><body>
<h1>Consignment Note (LR) — ${esc(note.lrNo)}</h1>
<div class="sub">Loading Info: ${esc(loadingInfoNo)}</div>
${sections.map((s) => `<div class="sec"><h2>${esc(s.title)}</h2><div class="grid">${s.fields.map(([l, v]) => `<div><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div></div>`).join("")
        }</div></div>`).join("")}
${breakdown.length ? `<div class="sec"><h2>Order Breakdown</h2><table><thead><tr><th>Order No</th><th>From</th><th>To</th><th>Weight</th></tr></thead><tbody>${breakdown.map((r) => `<tr><td>${esc(r.orderNo)}</td><td>${esc(r.from)}</td><td>${esc(r.to)}</td><td>${esc(r.weight)} ${esc(r.unit || "")}</td></tr>`).join("")
            }</tbody></table></div>` : ""}
${remarks ? `<div class="sec"><h2>Remarks</h2><div class="v">${esc(remarks)}</div></div>` : ""}
<div class="foot">Printed ${esc(formatIST(new Date()))} (IST)</div>
</body></html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
        alert("Please allow pop-ups to print the LR.");
        return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    // Let the new window lay out before opening the print dialog.
    win.onload = () => win.print();
    setTimeout(() => { try { win.print(); } catch { /* window already closed */ } }, 400);
}

function Field({ label, value }) {
    return (
        <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
            <div className="mt-0.5 text-sm text-slate-900 break-words">{dash(value)}</div>
        </div>
    );
}

function LRDetails({ note }) {
    const breakdown = Array.isArray(note.consignmentBreakdown) ? note.consignmentBreakdown : [];
    const remarks = note.remarks || note.header?.remarks;
    return (
        <div className="space-y-4">
            {lrSections(note).map((section) => (
                <div key={section.title} className="rounded-xl border border-slate-200 p-4">
                    <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-700">{section.title}</h4>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {section.fields.map(([label, value]) => <Field key={label} label={label} value={value} />)}
                    </div>
                </div>
            ))}

            {breakdown.length > 0 && (
                <div className="rounded-xl border border-slate-200 p-4">
                    <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-700">Order Breakdown</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-slate-500">
                                    <th className="py-1 pr-3">Order No</th><th className="py-1 pr-3">From</th>
                                    <th className="py-1 pr-3">To</th><th className="py-1">Weight</th>
                                </tr>
                            </thead>
                            <tbody>
                                {breakdown.map((row, i) => (
                                    <tr key={row._id || i} className="border-t border-slate-100">
                                        <td className="py-1 pr-3">{dash(row.orderNo)}</td>
                                        <td className="py-1 pr-3">{dash(row.from)}</td>
                                        <td className="py-1 pr-3">{dash(row.to)}</td>
                                        <td className="py-1">{dash(row.weight)} {row.unit || ""}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {remarks && (
                <div className="rounded-xl border border-slate-200 p-4">
                    <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-700">Remarks</h4>
                    <p className="text-sm text-slate-900 break-words">{remarks}</p>
                </div>
            )}
        </div>
    );
}

export default function LoadingInfoLRViewer({ panelId }) {
    const [state, setState] = useState({ status: panelId ? "loading" : "unsaved", notes: [], loadingInfoNo: "", error: "" });
    const [openIndex, setOpenIndex] = useState(null); // index of the LR shown in the popup

    const load = useCallback(async () => {
        if (!panelId) { setState({ status: "unsaved", notes: [], loadingInfoNo: "", error: "" }); return; }
        setState((s) => ({ ...s, status: "loading", error: "" }));
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/loading-panel/${encodeURIComponent(panelId)}/lr`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || "Unable to load LR");
            setState({
                status: data.data.generated ? "ready" : "none",
                notes: data.data.notes || [],
                loadingInfoNo: data.data.loadingInfoNo || "",
                error: "",
            });
        } catch (err) {
            setState({ status: "error", notes: [], loadingInfoNo: "", error: err.message });
        }
    }, [panelId]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (openIndex === null) return;
        const onKey = (e) => e.key === "Escape" && setOpenIndex(null);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [openIndex]);

    const { status, notes, loadingInfoNo, error } = state;
    const ready = status === "ready" && notes.length > 0;
    const activeNote = openIndex !== null ? notes[openIndex] : null;

    const hint = {
        unsaved: "Save this Loading Info first. The LR is created by the Consignment Note team and will appear here.",
        loading: "Checking whether an LR has been created…",
        none: "No approved LR yet. The LR and invoice appear here once the Consignment Note is approved.",
        error,
        ready: "View-only. Out Date and Out Time come from the LR generation time.",
    }[status];

    return (
        <>
            {ready ? (
                <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        LR created from this Loading Info ({notes.length})
                    </div>
                    {notes.map((note, i) => (
                        <div key={note._id || note.lrNo} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-extrabold text-slate-900">{note.lrNo}</div>
                                    <div className="truncate text-[11px] text-slate-500">
                                        {note.header?.orderNo ? `Order ${note.header.orderNo} · ` : ""}{formatIST(note.createdAt)}
                                    </div>
                                    {note.ewaybill?.status && (
                                        <div className="truncate text-[11px] text-slate-500">E-waybill: {note.ewaybill.status}{note.ewaybill.ewaybillNo ? ` · ${note.ewaybill.ewaybillNo}` : ""}</div>
                                    )}
                                    <div className="mt-0.5 flex items-center gap-1 text-[11px]">
                                        <span className="text-slate-400">↔</span>
                                        {note.invoice?.file?.filePath ? (
                                            <span className="rounded bg-purple-100 px-1.5 py-0.5 font-bold text-purple-700">
                                                Invoice {note.invoice.boeInvoiceNo || "uploaded"}
                                            </span>
                                        ) : (
                                            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-bold text-gray-500">No invoice</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex shrink-0 gap-1.5">
                                    <button
                                        type="button" onClick={() => setOpenIndex(i)}
                                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                                    >
                                        View
                                    </button>
                                    <button
                                        type="button" onClick={() => printLR(note, loadingInfoNo)}
                                        className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                                    >
                                        Print
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <button
                    type="button" disabled
                    title="Available once the LR is created"
                    className="w-full cursor-not-allowed rounded-lg bg-gray-400 px-4 py-2 text-xs font-bold text-white"
                >
                    {status === "loading" ? "Checking LR…" : "View LR"}
                </button>
            )}

            <p className={`mt-2 text-xs ${status === "error" ? "text-red-600" : "text-slate-500"}`}>
                {hint}{" "}
                {(status === "none" || status === "error") && panelId && (
                    <button type="button" onClick={load} className="font-semibold text-blue-600 underline">Refresh</button>
                )}
            </p>

            {activeNote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpenIndex(null)}>
                    <div
                        role="dialog" aria-modal="true" aria-label="Consignment Note (view only)"
                        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900">Consignment Note (LR) — {activeNote.lrNo}</h3>
                                <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">View only</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button" onClick={() => printLR(activeNote, loadingInfoNo)}
                                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-slate-800"
                                >
                                    Print
                                </button>
                                <button
                                    type="button" onClick={() => setOpenIndex(null)}
                                    className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        {notes.length > 1 && (
                            <div className="mb-4 flex flex-wrap gap-2">
                                {notes.map((n, i) => (
                                    <button
                                        key={n._id || n.lrNo} type="button" onClick={() => setOpenIndex(i)}
                                        className={`rounded-lg px-3 py-1 text-xs font-bold ${i === openIndex ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
                                    >
                                        {n.lrNo}
                                    </button>
                                ))}
                            </div>
                        )}

                        <LRDetails note={activeNote} />
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
    const [state, setState] = useState({ status: panelId ? "loading" : "unsaved", notes: [], error: "" });

    const load = useCallback(async () => {
        if (!panelId) { setState({ status: "unsaved", notes: [], error: "" }); return; }
        setState((s) => ({ ...s, status: "loading", error: "" }));
        try {
            const res = await fetch(`/api/loading-panel/${encodeURIComponent(panelId)}/lr`,
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            const d = await res.json();
            if (!res.ok || !d.success) throw new Error(d.message || "Unable to load invoices");
            const notes = d.data?.notes || [];
            setState({ status: notes.length ? "ready" : "none", notes, error: "" });
        } catch (err) {
            setState({ status: "error", notes: [], error: err.message });
        }
    }, [panelId]);

    useEffect(() => { load(); }, [load]);

    const show = async (n) => {
        const w = window.open("", "_blank"); // open first so pop-up blockers allow it
        try {
            const u = await invoiceBlob(panelId, n._id);
            w ? w.location.replace(u) : window.open(u);
            setTimeout(() => URL.revokeObjectURL(u), 300000);
        } catch { w?.close(); alert("Invoice could not be opened."); }
    };

    const print = async (n) => {
        try {
            const u = await invoiceBlob(panelId, n._id);
            const f = document.createElement("iframe");
            f.style.cssText = "position:fixed;width:0;height:0;border:0";
            f.src = u;
            f.onload = () => { try { f.contentWindow.print(); } catch { window.open(u); } };
            document.body.appendChild(f);
            setTimeout(() => { f.remove(); URL.revokeObjectURL(u); }, 300000);
        } catch { alert("Invoice could not be printed."); }
    };

    const { status, notes, error } = state;
    const uploaded = notes.filter((n) => n.invoice?.file?.filePath).length;

    const hint = {
        unsaved: "Save this Loading Info first. Invoices are uploaded on the LR page.",
        loading: "Checking invoices…",
        none: "No approved LR yet. The LR and invoice appear here once the Consignment Note is approved.",
        error,
        ready: uploaded
            ? "View-only. Each invoice is uploaded on its LR page."
            : "No invoice uploaded yet. It is uploaded on the LR page.",
    }[status];

    return (
        <>
            {status === "ready" ? (
                <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Invoices ({uploaded} of {notes.length} LR)
                    </div>
                    {notes.map((n) => {
                        const has = Boolean(n.invoice?.file?.filePath);
                        return (
                            <div key={n._id || n.lrNo} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">LR</span>
                                            <span className="truncate text-sm font-extrabold text-slate-900">{n.lrNo}</span>
                                        </div>
                                        <div className="truncate text-[11px] text-slate-500">
                                            {n.header?.orderNo ? `Order ${n.header.orderNo} · ` : ""}
                                            To {n.consignmentBreakdown?.[0]?.to || n.header?.to || "—"}
                                        </div>
                                        <div className="truncate text-[11px] text-slate-500">
                                            {has
                                                ? `Invoice ${n.invoice.boeInvoiceNo || "(no. not entered)"} · ${n.invoice.file.fileName}`
                                                : "No invoice uploaded"}
                                        </div>
                                    </div>
                                    {has ? (
                                        <div className="flex shrink-0 gap-1.5">
                                            <button type="button" onClick={() => show(n)}
                                                className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700">
                                                View
                                            </button>
                                            <button type="button" onClick={() => print(n)}
                                                className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800">
                                                Print
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="shrink-0 rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500">
                                            Pending
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <button type="button" disabled
                    title="Available once an invoice is uploaded on the LR page"
                    className="w-full cursor-not-allowed rounded-lg bg-gray-400 px-4 py-2 text-xs font-bold text-white">
                    {status === "loading" ? "Checking invoices…" : "View Invoice"}
                </button>
            )}

            <p className={`mt-2 text-xs ${status === "error" ? "text-red-600" : "text-slate-500"}`}>
                {hint}{" "}
                {(status === "none" || status === "error" || (status === "ready" && !uploaded)) && panelId && (
                    <button type="button" onClick={load} className="font-semibold text-blue-600 underline">Refresh</button>
                )}
            </p>
        </>
    );
}