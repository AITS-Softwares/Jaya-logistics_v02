"use client";

const currency = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
  ? 'Not identified' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value));
const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.split('-').reverse().join('/') : value || 'Not identified';

export default function InvoiceExtractionDetails({ extraction, title = 'Extracted invoice details' }) {
  if (extraction?.status !== 'ok') return null;
  const { invoice = {}, details = {} } = extraction;
  const fields = [
    ['Invoice number', invoice.boeInvoiceNo || 'Not identified'],
    ['Invoice date', date(invoice.boeInvoiceDate)],
    ['Invoice total', currency(invoice.invoiceValue)],
    ['Taxable value', currency(details.taxableValue)],
    ...Object.entries(details.taxes || {}).map(([name, value]) => [name.toUpperCase(), currency(value)]),
    ...(extraction.ewaybillNo ? [['E-way bill number', extraction.ewaybillNo]] : []),
  ];
  return <details open className="mb-3 overflow-hidden rounded-xl border border-emerald-200 bg-white text-sm">
    <summary className="cursor-pointer border-b border-emerald-100 px-4 py-3 font-semibold text-slate-800">{title}</summary>
    <div className="space-y-4 p-4">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {fields.map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-500">{label}</dt>
          <dd className="mt-1 break-words font-semibold tabular-nums text-slate-900">{value}</dd>
        </div>)}
      </dl>
      <div>
        <p className="mb-2 text-xs font-semibold text-slate-500">GSTINs found on the invoice</p>
        <div className="flex flex-wrap gap-2">{details.gstins?.length ? details.gstins.map(gstin => <span key={gstin} className="rounded-md border border-slate-200 px-2 py-1 font-mono text-xs text-slate-800">{gstin}</span>) : <span className="text-xs text-slate-500">Not identified</span>}</div>
      </div>
      {details.items?.length ? <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[480px] text-left text-xs">
          <caption className="sr-only">Goods read from the uploaded invoice</caption>
          <thead className="bg-slate-50 text-slate-600"><tr>
            {['Goods / description', 'HSN', 'Quantity', 'Taxable value'].map(label => <th key={label} scope="col" className="px-3 py-2 font-semibold">{label}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">{details.items.map((item, index) => <tr key={index}>
            <td className="min-w-[160px] max-w-xs whitespace-normal px-3 py-3 leading-relaxed text-slate-800">{item.description || 'Not identified'}</td>
            <td className="px-3 py-3 font-mono text-slate-700">{item.hsn}</td>
            <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-700">{item.quantity === null ? 'Not identified' : `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(item.quantity)} ${item.unit}`}</td>
            <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-800">{currency(item.taxableValue)}</td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="text-xs text-slate-500">Click Read details to refresh goods extraction. If this layout is unsupported, check the source text below.</p>}
      <p className="text-xs leading-relaxed text-amber-800">Please compare these values with your invoice. Supplier, billing, shipping and dispatch details still need verification.</p>
      <details className="border-t border-slate-100 pt-3 text-xs text-slate-500">
        <summary className="cursor-pointer">Show source text</summary>
        <div className="mt-2 space-y-2 break-words rounded-lg bg-slate-50 p-3 font-mono leading-relaxed">{(details.goodsLines || []).map((line, i) => <p key={i}>{line}</p>)}</div>
      </details>
    </div>
  </details>;
}
