"use client";

import { useEffect, useRef, useState } from "react";


const API = "/api/consignment-note/upload-invoice";
const OK_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const DOC_ICON =
    "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z";

async function invoiceBlobUrl(file) {
    const name = file.filePath.split("/").pop();
    const res = await fetch(`${API}?name=${encodeURIComponent(name)}`, { headers: auth() });
    if (!res.ok) throw new Error("fetch failed");
    return URL.createObjectURL(await res.blob());
}

function DocIcon({ className }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={DOC_ICON} />
        </svg>
    );
}

/**
 * Invoice upload box for the LR (Consignment Note) pages.
 * props: file = invoice.file ({fileName,filePath,mimeType,fileSize} | null)
 *        onChange(fileObjectOrNull) -> store it in the page's invoice state
 */
export default function LRInvoiceUpload({ file, onChange, readOnly = false }) {
    const inputRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [drag, setDrag] = useState(false);
    const [preview, setPreview] = useState("");

    const hasFile = Boolean(file?.filePath);
    const isImage = Boolean(file?.mimeType?.startsWith("image/"));

    // Thumbnail for images (PDFs show an icon).
    useEffect(() => {
        let url = "";
        let stale = false;
        setPreview("");
        if (hasFile && isImage) {
            invoiceBlobUrl(file)
                .then((u) => { if (stale) URL.revokeObjectURL(u); else { url = u; setPreview(u); } })
                .catch(() => { });
        }
        return () => { stale = true; if (url) URL.revokeObjectURL(url); };
    }, [file?.filePath, hasFile, isImage]); // eslint-disable-line react-hooks/exhaustive-deps

    const upload = async (f) => {
        if (!f) return;
        if (!OK_TYPES.includes(f.type)) return alert("Only PDF, PNG or JPG files are allowed.");
        if (f.size > 5 * 1024 * 1024) return alert("File is larger than 5 MB.");
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append("file", f);
            const res = await fetch(API, { method: "POST", headers: auth(), body: fd });
            const d = await res.json().catch(() => null);
            if (!res.ok || !d?.success) return alert(d?.message || `Upload failed (HTTP ${res.status})`);
            onChange(d.data);
        } catch (err) {
            alert(`Upload failed: ${err.message}`);
        } finally {
            setBusy(false);
        }
    };

    const view = async () => {
        const w = window.open("", "_blank"); // open first so pop-up blockers allow it
        try {
            const u = await invoiceBlobUrl(file);
            w ? w.location.replace(u) : window.open(u);
            setTimeout(() => URL.revokeObjectURL(u), 300000);
        } catch {
            w?.close();
            alert("Invoice could not be opened.");
        }
    };

    const pick = () => !busy && inputRef.current?.click();
    const onInput = (e) => { const f = e.target.files?.[0]; e.target.value = ""; upload(f); };
    const onDrop = (e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files?.[0]); };

    return (
        <div className="h-full rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                <DocIcon className="h-5 w-5 text-green-600" />
                {readOnly ? "Invoice" : "Upload Invoice"}
            </h3>

            <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={onInput} className="hidden" />

            {hasFile ? (
                <div className="overflow-hidden rounded-xl border-2 border-green-300 bg-white shadow-sm">
                    <button type="button" onClick={view} className="block w-full" title="Click to view invoice">
                        {isImage && preview ? (
                            <img src={preview} alt={file.fileName} className="max-h-[220px] min-h-[140px] w-full bg-gray-100 object-contain" />
                        ) : (
                            <div className={`flex min-h-[140px] flex-col items-center justify-center ${isImage ? "bg-gray-100" : "bg-red-50"}`}>
                                <DocIcon className={`h-14 w-14 ${isImage ? "text-gray-400" : "text-red-500"}`} />
                                <span className="mt-1 text-xs text-gray-500">{isImage ? "Loading preview…" : "Click to view PDF"}</span>
                            </div>
                        )}
                    </button>
                    <div className="flex items-center justify-between gap-2 border-t border-green-100 p-2">
                        <p className="min-w-0 truncate text-xs font-medium text-slate-700">{file.fileName}</p>
                        <div className="flex shrink-0 gap-1.5">
                            <button type="button" onClick={view}
                                className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700">View</button>
                            {!readOnly && (
                                <>
                                    <button type="button" onClick={pick} disabled={busy}
                                        className="rounded-lg bg-slate-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50">
                                        {busy ? "Uploading…" : "Replace"}
                                    </button>
                                    <button type="button" onClick={() => onChange(null)}
                                        className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100">Remove</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ) : readOnly ? (
                <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-green-300 bg-white text-center">
                    <DocIcon className="mb-2 h-12 w-12 text-gray-400" />
                    <p className="text-sm text-slate-500">No invoice uploaded</p>
                </div>
            ) : (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={onDrop}
                    className={`flex min-h-[200px] flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors ${drag ? "border-emerald-500 bg-emerald-50" : "border-green-300 bg-white"}`}
                >
                    <DocIcon className="mb-2 h-12 w-12 text-gray-400" />
                    <p className="mb-3 text-sm text-slate-500">No file uploaded</p>
                    <button type="button" onClick={pick} disabled={busy}
                        className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                        {busy ? "Uploading…" : "Upload Invoice"}
                    </button>
                    <p className="mt-3 text-xs text-slate-400">PDF, JPG, PNG (Max 5MB)</p>
                </div>
            )}
        </div>
    );
}