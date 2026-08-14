'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TransactionReadOnlyDetails from '@/components/TransactionReadOnlyDetails';

export default function LoadingInfoViewPage() {
  const { id } = useParams(); const router = useRouter(); const [record, setRecord] = useState(null); const [error, setError] = useState('');
  useEffect(() => { (async () => { try { const token = localStorage.getItem('token'); const res = await fetch(`/api/loading-panel?id=${id}`, { headers: { Authorization: `Bearer ${token}` } }); const data = await res.json(); if (!res.ok) throw new Error(data.message || 'Unable to load Loading Info.'); setRecord(data.data); } catch (err) { setError(err.message); } })(); }, [id]);
  if (error) return <div className="p-8 text-sm text-red-700">{error}</div>;
  if (!record) return <div className="p-8 text-sm text-slate-500">Loading Loading Info…</div>;
  return <TransactionReadOnlyDetails title={`Loading Info: ${record.vehicleArrivalNo || ''}`} subtitle="Read-only transaction details" data={record} onBack={() => router.back()}/>;
}
