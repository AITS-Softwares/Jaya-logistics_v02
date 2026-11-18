"use client";
import { useEffect, useRef } from 'react';
import InvoiceExtractionDetails from '@/components/InvoiceExtractionDetails';

export default function EwaybillRequestPreview({ preview, busy, message, onClose, onConfirm }) {
  const dialog = useRef(null);
  useEffect(() => { if (preview && !dialog.current.open) dialog.current.showModal(); }, [preview]);
  if (!preview) return null;
  const { payload, warnings = [] } = preview;
  const lr = payload.lr || {}, invoice = lr.invoice || {};
  const close = () => { if (!busy) { dialog.current?.close(); onClose(); } };
  return <dialog ref={dialog} aria-labelledby="ewaybill-preview-title" onCancel={event => { event.preventDefault(); close(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50">
    <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
      <div><h2 id="ewaybill-preview-title" className="text-lg font-bold">Preview e-way bill request</h2><p className="mt-1 text-sm text-slate-500">Review the saved consignment note data that will be sent to ERPNext.</p></div>
      <button type="button" aria-label="Close preview" disabled={busy} onClick={close} className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50">×</button>
    </header>
    <div className="space-y-4 px-6 py-5">
      {warnings.length > 0 && <ul className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{warnings.map(w => <li key={w}>{w}</li>)}</ul>}
      <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
        {[['ERPNext company', payload.company], ['Transporter GSTIN', payload.gstin], ['Consignment note', lr.lrNo], ['Vehicle', lr.header?.vehicleNo], ['From', lr.header?.from], ['To', lr.header?.to]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold">{value || 'Not provided'}</dd></div>)}
      </dl>
      <div className="grid gap-3 sm:grid-cols-2">{[['Consignor', lr.consignor], ['Consignee', lr.consignee]].map(([label, party]) => <section key={label} className="rounded-xl border border-slate-200 p-4 text-sm"><h3 className="mb-2 font-semibold">{label}</h3><p>{party?.name || 'Not provided'}</p><p className="mt-1 whitespace-pre-line text-slate-600">{party?.address || 'Address not provided'}</p><p className="mt-2 font-mono text-xs">GSTIN: {party?.gstNumber || 'Not provided'}</p></section>)}</div>
      <InvoiceExtractionDetails title="Invoice & products" extraction={{ status: 'ok', invoice, details: {
        taxableValue: invoice.ewaybillData?.totalValue,
        taxes: Object.fromEntries([['CGST','cgstValue'],['SGST','sgstValue'],['IGST','igstValue']].filter(([,key]) => invoice.ewaybillData?.[key] !== '' && invoice.ewaybillData?.[key] != null).map(([label,key]) => [label,invoice.ewaybillData[key]])),
        gstins: [lr.consignor?.gstNumber,lr.consignee?.gstNumber].filter(Boolean),
        items: (invoice.ewaybillData?.itemList || []).map(row => ({description:row.productDesc,hsn:row.hsnCode,quantity:row.quantity === '' || row.quantity == null ? null : Number(row.quantity),unit:row.qtyUnit,taxableValue:row.taxableAmount}))
      } }} />
      {preview.requestName && <p className="text-xs text-slate-600">ERPNext request: {preview.requestName}</p>}
      {preview.providerPayload && <details className="rounded-xl border border-slate-200 p-4 text-sm" open><summary className="cursor-pointer font-semibold">Validated government submission</summary><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(preview.providerPayload, null, 2)}</pre></details>}
      <p className="text-xs leading-relaxed text-slate-500">This is the request sent to ERPNext, not a generated e-way bill. ERPNext performs the final statutory validation and prepares the government submission.</p>
      <details className="rounded-xl border border-slate-200 p-4 text-sm"><summary className="cursor-pointer font-semibold">Exact request data</summary><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(payload, null, 2)}</pre></details>
      {message && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
    </div>
    <footer className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
      <button type="button" disabled={busy} onClick={close} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Back to consignment note</button>
      <button type="button" disabled={busy || !preview.canGenerate} onClick={onConfirm} className="rounded-xl bg-yellow-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-yellow-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">{busy ? 'Generating…' : 'Confirm & Generate'}</button>
    </footer>
  </dialog>;
}
