'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TransactionReadOnlyDetails from '@/components/TransactionReadOnlyDetails';
import OrderRowStatusActions from '@/components/OrderRowStatusActions';
import { usePermission } from '../../../hooks/usePermission';

export default function LoadingInfoViewPage() {
  const { id } = useParams(); const router = useRouter(); const [record, setRecord] = useState(null); const [error, setError] = useState('');
  const { canCreate, canEdit, canApprove } = usePermission();
  const canManageOrderRows = canCreate('Order Panel') || canEdit('Order Panel') || canApprove('Order Panel');
  const [linkedOrders, setLinkedOrders] = useState({});
  useEffect(() => { (async () => { try { const token = localStorage.getItem('token'); const res = await fetch(`/api/loading-panel?id=${id}`, { headers: { Authorization: `Bearer ${token}` } }); const data = await res.json(); if (!res.ok) throw new Error(data.message || 'Unable to load Loading Info.'); setRecord(data.data); } catch (err) { setError(err.message); } })(); }, [id]);
  useEffect(() => {
    if (!record?.orderRows?.length) return;
    let active = true;
    (async () => {
      const token = localStorage.getItem('token');
      const uniqueOrderIds = [...new Set(record.orderRows.map((row) => row.orderPanelId).filter(Boolean))];
      const entries = await Promise.all(uniqueOrderIds.map(async (orderId) => {
        const response = await fetch(`/api/order-panel?id=${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        return [orderId, response.ok && data.success ? data.data : null];
      }));
      if (active) setLinkedOrders(Object.fromEntries(entries));
    })();
    return () => { active = false; };
  }, [record]);
  if (error) return <div className="p-8 text-sm text-red-700">{error}</div>;
  if (!record) return <div className="p-8 text-sm text-slate-500">Loading Loading Info…</div>;
  return <div className="space-y-4">
    <TransactionReadOnlyDetails title={`Loading Info: ${record.vehicleArrivalNo || ''}`} subtitle="Read-only transaction details" data={record} onBack={() => router.back()}/>
    {canManageOrderRows && record.orderRows?.some((row) => row.orderPanelId && row.orderRowId) && <section className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-bold text-slate-900">Order row status</h2>
      <div className="space-y-2">{record.orderRows.filter((row) => row.orderPanelId && row.orderRowId).map((row) => {
        const sourceOrder = linkedOrders[row.orderPanelId];
        const sourceRow = sourceOrder?.plantRows?.find((item) => String(item._id) === String(row.orderRowId));
        return <div key={`${row.orderPanelId}-${row.orderRowId}`} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3 text-sm">
          <span>{row.orderNo} · {row.plantName || row.plantCodeValue || 'Plant'}</span>
          {sourceRow && canManageOrderRows && !['Cancelled', 'Completed', 'Rejected'].includes(sourceOrder?.panelStatus) && sourceRow.status !== 'Cancelled' && !sourceRow.statusRequest?.action ? <OrderRowStatusActions orderId={row.orderPanelId} rowId={row.orderRowId} orderNo={row.orderNo} status={sourceRow.status || 'Open'} onUpdated={(updated) => setLinkedOrders((current) => ({ ...current, [row.orderPanelId]: updated }))} /> : <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{sourceRow?.status || 'Loading…'}</span>}
        </div>;
      })}</div>
    </section>}
  </div>;
}
