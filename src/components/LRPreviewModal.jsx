"use client";
import { useEffect, useMemo, useState } from "react";
import { buildLRHtml, getBusinessInfo } from "@/lib/lrPrintTemplate";

// Same shape the pages send when saving, so the preview matches the saved LR.
export function makePreviewNote({
    header, consignor, consignee, invoice, ewaybill,
    palletizationRows, uniformRows, looseCargoRows, nonUniformRows, loadingInfoNo = "",
}) {
    return {
        lrNo: header.lrNo,
        loadingInfoNo,
        header, consignor, consignee, invoice, ewaybill,
        lcStatus: header.lcStatus,
        lrType: header.lrType,
        vehicleReach: header.vehicleReach,
        verification: header.verification,
        subCompanyName: header.subCompanyName || "",
        subCompanyCode: header.subCompanyCode || "",
        packData: {
            PALLETIZATION: palletizationRows,
            "UNIFORM - BAGS/BOXES": uniformRows,
            "LOOSE - CARGO": looseCargoRows,
            "NON-UNIFORM - GENERAL CARGO": nonUniformRows,
        },
    };
}

// Runs inside the preview only: watermark, no text selection, blank if someone prints it.
const PREVIEW_CSS = `<style>
  html, body { user-select: none; -webkit-user-select: none; }
  body::before { content: "PREVIEW ONLY"; position: fixed; top: 45%; left: 12%;
    font-size: 90px; font-weight: 800; color: rgba(220,38,38,.12);
    transform: rotate(-25deg); pointer-events: none; z-index: 9999; }
  @media print { body { display: none !important; } }
</style>`;

export default function LRPreviewModal({ open, note, onClose }) {
    const [biz, setBiz] = useState(null);

    useEffect(() => { if (open && !biz) getBusinessInfo().then(setBiz); }, [open, biz]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const html = useMemo(() => {
        if (!open || !biz || !note) return "";
        const raw = buildLRHtml(note, biz, note.loadingInfoNo || "");
        return raw.includes("</head>") ? raw.replace("</head>", PREVIEW_CSS + "</head>") : PREVIEW_CSS + raw;
    }, [open, biz, note]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
            onContextMenu={(e) => e.preventDefault()}>
            {/* Ctrl+P while the preview is open prints a blank page */}
            <style>{`@media print { body { display: none !important; } }`}</style>

            <div className="flex h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div>
                        <div className="text-sm font-extrabold text-slate-900">LR Preview</div>
                        <div className="text-xs text-slate-500">View only. Printing is done from the Loading Info page.</div>
                    </div>
                    <button onClick={onClose}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-200">
                        ✕ Close
                    </button>
                </div>

                <div className="flex-1 overflow-hidden bg-slate-100 p-2">
                    {html ? (
                        // empty sandbox = no scripts, so the LR's own print() call can't run
                        <iframe title="LR preview" srcDoc={html} sandbox=""
                            className="h-full w-full rounded-lg border bg-white" />
                    ) : (
                        <div className="grid h-full place-items-center text-sm text-slate-500">Loading preview…</div>
                    )}
                </div>
            </div>
        </div>
    );
}