'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TransactionReadOnlyDetails from '@/components/TransactionReadOnlyDetails';

export default function PricingPanelViewPage() {
  const { id } = useParams(); const router = useRouter(); const [record, setRecord] = useState(null); const [error, setError] = useState('');
  useEffect(() => { (async () => { try { const token = localStorage.getItem('token'); const res = await fetch(`/api/pricing-panel?id=${id}`, { headers: { Authorization: `Bearer ${token}` } }); const data = await res.json(); if (!res.ok) throw new Error(data.message || 'Unable to load Pricing Panel.'); setRecord(data.data); } catch (err) { setError(err.message); } })(); }, [id]);
  if (error) return <div className="p-8 text-sm text-red-700">{error}</div>;
  if (!record) return <div className="p-8 text-sm text-slate-500">Loading Pricing Panel…</div>;
  return <TransactionReadOnlyDetails title={`Pricing Panel: ${record.pricingSerialNo || ''}`} subtitle="Read-only transaction details" data={record} onBack={() => router.back()}/>;
}
