'use client';
import PdiSummary from '@/components/PdiSummary';

import { FiArrowRight, FiBox, FiClock, FiMapPin, FiPackage } from 'react-icons/fi';
import { destinationLabel } from '@/lib/destination.mjs';

const number = value => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });

const date = (value, time = false) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return time ? `${parsed.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST` : parsed.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
};
const text = value => value === undefined || value === null || value === '' ? '—' : String(value);
export function OrderStatus({ status }) {
  const tone = ['Cancelled', 'Rejected'].includes(status) ? 'bg-rose-50 text-rose-700 ring-rose-200' : ['Submitted', 'Hold', 'Partially on hold'].includes(status) ? 'bg-amber-50 text-amber-700 ring-amber-200' : ['Approved', 'Completed', 'Open'].includes(status) ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${tone}`}>{text(status)}</span>;
}
function Value({ label, value }) {
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1.5 whitespace-pre-wrap break-words text-sm font-medium leading-5 text-slate-800">{text(value)}</dd></div>;
}
function Section({ title, subtitle, Icon, children }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Icon size={17} /></span><div><h3 className="text-sm font-bold text-slate-900">{title}</h3>{subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}</div></div>{children}</section>;
}
const cells = {
  productName: 'Product / Material', plantRowId: 'Drop / Route', noOfPallets: 'Pallets', unitPerPallets: 'Units / Pallet', totalPkgs: 'Total Packages', pkgsType: 'Package Type', uom: 'UOM', skuSize: 'SKU Size', packWeight: 'Pack Weight', wtLtr: 'Weight / Litre', actualWt: 'Actual Weight', wtUom: 'Weight UOM', nos: 'Nos.', length: 'Length', width: 'Width', height: 'Height',
};
const columns = {
  PALLETIZATION: ['productName', 'plantRowId', 'noOfPallets', 'unitPerPallets', 'totalPkgs', 'pkgsType', 'uom', 'skuSize', 'packWeight', 'wtLtr', 'actualWt', 'wtUom'],
  'UNIFORM - BAGS/BOXES': ['productName', 'plantRowId', 'totalPkgs', 'pkgsType', 'uom', 'skuSize', 'packWeight', 'wtLtr', 'actualWt', 'wtUom'],
  'LOOSE - CARGO': ['productName', 'plantRowId', 'uom', 'actualWt'],
  'NON-UNIFORM - GENERAL CARGO': ['productName', 'plantRowId', 'nos', 'uom', 'length', 'width', 'height', 'actualWt'],
};

export default function VnnOrderDetailsContent({ order, linkedRowIds = [] }) {
  const routes = order.plantRows || [];
  const routeById = new Map(routes.map((row, index) => [String(row._id), { row, index }]));
  const packs = Object.entries(order.packData || {}).filter(([, rows]) => Array.isArray(rows)).map(([type, rows]) => [type, rows.filter(row => row.productName?.trim() || row.skuSize?.trim() || ['totalPkgs', 'nos', 'noOfPallets', 'actualWt', 'packWeight'].some(key => Number(row[key]) > 0))]).filter(([, rows]) => rows.length);
  const linked = new Set(linkedRowIds);
  return <div className="space-y-5"><PdiSummary orderId={order._id} />
    <Section title="Order overview" subtitle="Customer and shipment requirements" Icon={FiPackage}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 p-5 md:grid-cols-4"><Value label="Order number" value={order.orderPanelNo} /><Value label="Order date" value={date(order.date)} /><Value label="Branch" value={[order.branchName, order.branchCode].filter(Boolean).join(' · ')} /><Value label="Company" value={order.subCompanyName || order.subCompanyCode} /><Value label="Customer" value={order.customerName || order.partyName} /><Value label="Customer code" value={order.customerCode} /><Value label="Party" value={order.partyName || order.customerName} /><Value label="Delivery" value={order.delivery} /><Value label="Total route weight" value={`${number(order.totalWeight ?? routes.reduce((sum, row) => sum + Number(row.weight || 0), 0))} MT`} /><Value label="Route count" value={routes.length} /><Value label="Drop allocation" value={order.allocationEnabled ? 'Enabled — per cargo row' : 'Not enabled'} /><Value label="Loading photos" value={order.loadingInfoPhotosOptional ? 'Optional' : 'Required'} /></dl>
    </Section>
    <Section title={`Plant & route details (${routes.length})`} subtitle="All routes on the original order" Icon={FiMapPin}>
      <div className="divide-y divide-slate-100">{routes.map((row, index) => <article key={String(row._id || index)} className="p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">{String(index + 1).padStart(2, '0')}</span><h4 className="flex flex-wrap items-center gap-2 pt-1 text-sm font-bold text-slate-900">{row.fromName || 'Origin'}<FiArrowRight className="text-slate-400" /><span>{destinationLabel(row)}</span></h4></div><div className="flex flex-wrap items-center gap-2">{linked.has(String(row._id)) && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">Linked to this VNN</span>}<OrderStatus status={row.status || 'Open'} /></div></div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4"><Value label="Plant" value={row.plantName} /><Value label="Plant code" value={row.plantCodeValue} /><Value label="Order type" value={row.orderType} /><Value label="Weight" value={`${number(row.weight)} MT`} /><Value label="Original To location" value={row.toName} /><Value label="PIN code" value={row.pinCode} /><Value label="Origin state" value={row.fromState} /><Value label="Local status" value={row.localStatusLabel} /><Value label="City" value={row.cityName} /><Value label="Taluka" value={row.talukaName || row.taluka} /><Value label="District" value={row.districtName || row.district} /><Value label="State" value={row.stateName || row.state} /><Value label="Country" value={row.countryName || row.country} /></dl>
        {row.locationRemark && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600"><strong>Location remark: </strong>{row.locationRemark}</p>}
        {(row.statusReason || row.statusRequest?.action || row.statusHistory?.length > 0 || row.holdUntil) && <div className="mt-4 rounded-xl border border-slate-100 p-4"><h5 className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-700"><FiClock size={14} />Route status & history</h5>{row.statusReason && <p className="whitespace-pre-wrap text-xs leading-5 text-slate-600">{row.statusReason}</p>}{row.holdUntil && <p className="mt-2 text-xs text-slate-500">Hold until: {date(row.holdUntil, true)}</p>}{row.statusRequest?.action && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-amber-50 p-3 text-xs text-amber-800"><strong>{row.statusRequest.action} approval pending: </strong>{row.statusRequest.reason || 'No reason recorded'}</p>}{row.statusHistory?.length > 0 && <ol className="mt-3 space-y-3 border-l border-slate-200 pl-4">{row.statusHistory.map((entry, entryIndex) => <li key={entryIndex}><p className="text-xs font-semibold text-slate-700">{entry.action} {entry.from && entry.to ? `· ${entry.from} → ${entry.to}` : ''}</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-500">{entry.reason}</p><p className="mt-1 text-[10px] text-slate-400">{date(entry.at, true)}</p></li>)}</ol>}</div>}
      </article>)}{!routes.length && <p className="p-8 text-center text-sm text-slate-400">No routes recorded.</p>}</div>
    </Section>
    <Section title="Products & packing details" subtitle="Saved cargo quantities, dimensions, weights and drop allocations" Icon={FiBox}>
      <div className="space-y-5 p-5">{packs.map(([type, rows]) => {
        const fields = columns[type] || Object.keys(cells);
        return <div key={type} className="overflow-hidden rounded-xl border border-slate-200"><div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3"><h4 className="text-xs font-bold text-slate-800">{type}</h4><span className="text-[10px] text-slate-400">{rows.length} cargo row{rows.length === 1 ? '' : 's'}</span></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-y border-slate-200 bg-yellow-50"><tr>{fields.map(key => <th scope="col" key={key} className="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-600">{cells[key]}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={String(row._id || index)}>{fields.map(key => {
          const route = routeById.get(String(row.plantRowId));
          const value = key === 'plantRowId' ? route ? `${route.index + 1}. ${destinationLabel(route.row)}` : row.plantRowId ? 'Route unavailable' : 'Not allocated' : row[key];
          return <td key={key} className={`px-3 py-3 ${key === 'productName' || key === 'plantRowId' ? 'min-w-[150px] font-medium text-slate-800' : 'whitespace-nowrap text-slate-600'}`}>{text(value)}</td>;
        })}</tr>)}</tbody></table></div></div>;
      })}{!packs.length && <p className="py-4 text-center text-sm text-slate-400">No product or packing details recorded.</p>}<p className="text-[10px] leading-5 text-slate-400">Cargo values and units are shown as saved. Route weights are in MT.</p></div>
    </Section>
    <Section title="Approval & record history" Icon={FiClock}><div className="p-5"><div className="mb-5"><OrderStatus status={order.panelStatus || 'Draft'} /></div><dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4"><Value label="Created" value={date(order.createdAt, true)} /><Value label="Last updated" value={date(order.updatedAt, true)} /><Value label="Approved" value={date(order.approvedAt, true)} /><Value label="Correction status" value={order.reapprovalState && order.reapprovalState !== 'none' ? order.reapprovalState : 'No pending correction'} /></dl>{order.approvalRemarks && <div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-semibold uppercase text-slate-400">Approval remarks</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{order.approvalRemarks}</p></div>}</div></Section>
  </div>;
}
