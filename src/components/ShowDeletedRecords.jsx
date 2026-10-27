"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const ADMIN_LIST_TYPES = {
  '/admin/order-panel': 'order',
  '/admin/purchase-panel': 'purchase',
  '/admin/advance-payment': 'advance',
  '/admin/vehicle-negotiation': 'vnn',
  '/admin/pricing-panel': 'pricing',
  '/admin/loading-info': 'loading',
  '/admin/consignment-note': 'lr',
  '/admin/proofofdelivery': 'pod',
  '/admin/balance-payment': 'balance',
};

export function AdminShowDeletedRecords() {
  const pathname = usePathname()?.replace(/\/$/, '').toLowerCase();
  const type = ADMIN_LIST_TYPES[pathname];
  return type ? <ShowDeletedRecords type={type} /> : null;
}

export default function ShowDeletedRecords({ type, onRestored }) {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    async function load() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/deletion?type=${type}&includeDeleted=true`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not load deleted records.');
      if (active) { setRecords(data.data || []); setError(''); }
    } catch (e) { if (active && e.message !== 'Admin access required') setError(e.message); }
    finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [type]);
  async function restore(record) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/deletion', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id: record._id }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not restore record.');
      setRecords((old) => old.filter((item) => item._id !== record._id));
      if (onRestored) onRestored();
    } catch (e) { setError(e.message); }
  }
  if (loading || (!records.length && !error)) return null;
  return <section className="border-b border-red-200 bg-red-50/70 px-6 py-3">
    <h2 className="mb-2 text-sm font-bold text-red-900">Deleted records</h2>
    {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    <div className="overflow-x-auto rounded-lg border border-red-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-red-100 text-xs uppercase text-slate-700"><tr><th className="px-3 py-2">Record</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Action</th></tr></thead><tbody>{records.map((record) => {
      const number = record.orderPanelNo || record.purchaseNo || record.paymentNo || record.vnnNo || record.pricingSerialNo || record.vehicleArrivalNo || record.lrNo || record.podNo || record.balancePaymentNo || record._id;
      const isRoot = record.deleteRootType === type && String(record.deleteRootNo) === String(number);
      return <tr key={record._id} className="border-t border-red-100"><td className="px-3 py-2 font-medium">{number}</td><td className="px-3 py-2"><span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">Deleted</span></td><td className="px-3 py-2"><button disabled={!isRoot} title={!isRoot ? `Restore ${record.deleteRootNo || 'parent'} first` : 'Restore record'} onClick={() => restore(record)} className="rounded border px-3 py-1 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">{isRoot ? 'Restore' : `Restore ${record.deleteRootNo || 'parent'} first`}</button></td></tr>;
    })}</tbody></table></div>
  </section>;
}
