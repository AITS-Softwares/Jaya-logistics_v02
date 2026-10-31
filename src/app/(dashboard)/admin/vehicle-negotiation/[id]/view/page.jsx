'use client';

import { hasPriorApproval, panelApprovalStatus, approvalLabelForRecord } from '@/lib/reapprovalPresentation.mjs';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import OrderRowStatusActions from '@/components/OrderRowStatusActions';
import { usePermission } from '../../../hooks/usePermission';

const Field = ({ label, value }) => <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-900">{value || '—'}</dd></div>;

function getVnnStatusBadge(record) {
  const status = panelApprovalStatus('vnn', record);
  const label = approvalLabelForRecord({ ...record, status, previouslyApproved: hasPriorApproval(record) }) || status;
  return { label, className: label === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800' };
}

export default function VehicleNegotiationViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const { canCreate, canEdit, canApprove } = usePermission();
  const canManageOrderRows = canCreate('Order Panel') || canEdit('Order Panel') || canApprove('Order Panel');
  const [linkedOrders, setLinkedOrders] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/vehicle-negotiation?id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Unable to load Vehicle Negotiation.');
        setRecord(data.data);
      } catch (err) { setError(err.message); }
    };
    load();
    window.addEventListener('reapproval:refresh', load);
    return () => window.removeEventListener('reapproval:refresh', load);
  }, [id]);

  useEffect(() => {
    if (!record?.orders?.length) return;
    let active = true;
    (async () => {
      const token = localStorage.getItem('token');
      const ids = [...new Set(record.orders.map((order) => order.orderPanelId).filter(Boolean))];
      const entries = await Promise.all(ids.map(async (orderId) => {
        const response = await fetch(`/api/order-panel?id=${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        return [orderId, response.ok && data.success ? data.data : null];
      }));
      if (active) setLinkedOrders(Object.fromEntries(entries));
    })();
    return () => { active = false; };
  }, [record]);

  if (!record && !error) return <div className="p-8 text-sm text-slate-500">Loading Vehicle Negotiation…</div>;
  const statusBadge = record ? getVnnStatusBadge(record) : null;
  return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-6xl">
    <button onClick={() => router.back()} className="mb-4 text-sm font-semibold text-indigo-600">← Back to list</button>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {record && <>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-extrabold text-slate-900">Vehicle Negotiation: {record.vnnNo}</h1><p className="mt-1 text-sm text-slate-500">Read-only transaction details</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadge.className}`}>{statusBadge.label}</span></div>
        <dl className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4"><Field label="Date" value={record.date ? new Date(record.date).toLocaleDateString('en-GB') : ''}/><Field label="Party" value={record.customerName || record.orders?.[0]?.partyName}/><Field label="Branch" value={record.branchName}/><Field label="Total weight" value={`${record.totalWeight || 0} kg`}/><Field label="Part 1" value={record.workflow?.part1LockedAt ? 'Locked' : 'Draft'}/><Field label="Rate Target" value={record.workflow?.rateTargetCompletedAt ? 'Completed' : 'Not completed'}/><Field label="Part 3" value={record.approval?.part3Status}/><Field label="Memo" value={record.approval?.memoStatus === 'Uploaded' ? 'Uploaded' : 'Not uploaded'}/></dl>
      </section>
      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white"><h2 className="border-b border-slate-200 px-5 py-4 font-bold text-slate-900">Orders</h2><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Party</th><th className="px-4 py-3">From</th><th className="px-4 py-3">To</th><th className="px-4 py-3">Weight</th><th className="px-4 py-3">Order row status</th></tr></thead><tbody>{(record.orders || []).map((order) => { const source = linkedOrders[order.orderPanelId]; const sourceRow = source?.plantRows?.find((item) => String(item._id) === String(order.orderRowId)); return <tr key={order._id || order.orderNo} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{order.orderNo || '—'}</td><td className="px-4 py-3">{order.partyName || '—'}</td><td className="px-4 py-3">{order.fromName || '—'}</td><td className="px-4 py-3">{order.toName || '—'}</td><td className="px-4 py-3">{order.weight || 0} kg</td><td className="px-4 py-3"><div className="flex flex-wrap items-center gap-2">{canManageOrderRows && sourceRow && !['Cancelled', 'Completed', 'Rejected'].includes(source?.panelStatus) && sourceRow.status !== 'Cancelled' && !sourceRow.statusRequest?.action ? <OrderRowStatusActions orderId={order.orderPanelId} rowId={order.orderRowId} orderNo={order.orderNo} status={sourceRow.status || 'Open'} onUpdated={(updated) => setLinkedOrders((current) => ({ ...current, [order.orderPanelId]: updated }))} /> : <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${sourceRow?.status === 'Cancelled' ? 'bg-rose-100 text-rose-800' : sourceRow?.status === 'Hold' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{sourceRow?.status || (order.orderPanelId ? 'Loading…' : 'Not linked')}</span>}</div></td></tr>; })}</tbody></table></div><p className="px-5 py-3 text-xs text-slate-500">Actions update the linked order row. The shared Vehicle Negotiation stays active for its other orders.</p></section>
      {(record.orders || []).some((order) => linkedOrders[order.orderPanelId]?.plantRows?.some((sourceRow) => String(sourceRow._id) === String(order.orderRowId) && ['Hold', 'Cancelled'].includes(sourceRow.status))) && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><div><p className="font-bold text-amber-900">Replacement order needed</p><p className="mt-1 text-sm text-amber-800">A linked order row is on hold or cancelled. This shared VNN remains active; add an open order in Part 1 and submit it for the usual rate and approval flow.</p></div><button onClick={() => router.push(`/admin/vehicle-negotiation/${record._id}`)} className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-bold text-white hover:bg-amber-800">Add replacement order</button></div>}
      <section className="mt-5 grid gap-5 md:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-900">Rate Target</h2><dl className="mt-4 grid grid-cols-2 gap-4"><Field label="Max rate" value={record.negotiation?.maxRate}/><Field label="Target rate" value={record.negotiation?.targetRate}/><Field label="Old rate %" value={record.negotiation?.oldRatePercent}/><Field label="Remarks" value={record.negotiation?.remarks1}/></dl></div><div className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-900">Vehicle Placement</h2><dl className="mt-4 grid grid-cols-2 gap-4"><Field label="Supplier" value={record.approval?.vendorName}/><Field label="Vehicle" value={record.approval?.vehicleNo}/><Field label="Mobile" value={record.approval?.mobile}/><Field label="Purchase type" value={record.approval?.purchaseType}/><Field label="Payment terms" value={record.approval?.paymentTerms}/><Field label="Memo" value={record.approval?.memoFile?.originalName}/></dl></div></section>
    </>}
  </div></div>;
}
