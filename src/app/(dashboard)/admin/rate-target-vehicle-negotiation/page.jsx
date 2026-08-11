'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUS = ['All', 'Pending', 'Approved', 'Reject'];

export default function RateTargetVehicleNegotiationPage() {
  const router = useRouter();
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const query = status === 'All' ? '' : `?status=${encodeURIComponent(status)}`;
        const res = await fetch(`/api/rate-target-vehicle-negotiation${query}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Unable to load Rate Target records.');
        setRecords(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [status]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Rate Target (Vehicle Negotiation)</h1>
            <p className="mt-1 text-sm text-slate-500">Part 1 must be locked before a Rate Target can be entered or approved.</p>
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {STATUS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr><th className="px-4 py-3">VNN</th><th className="px-4 py-3">Party</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Weight</th><th className="px-4 py-3">Rate Target</th><th className="px-4 py-3">Approval</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500">Loading Rate Target queue…</td></tr> : records.length === 0 ? <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500">No locked Vehicle Negotiations match this filter.</td></tr> : records.map((record) => (
                <tr key={record._id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{record.vnnNo}</td>
                  <td className="px-4 py-3">{record.partyName || '—'}</td>
                  <td className="px-4 py-3">{record.branchName || '—'}</td>
                  <td className="px-4 py-3">{record.totalWeight || 0}</td>
                  <td className="px-4 py-3">{record.negotiation?.targetRate || 0}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{record.approval?.part2Status || 'Pending'}</span></td>
                  <td className="px-4 py-3 text-right"><button onClick={() => router.push(`/admin/rate-target-vehicle-negotiation/${record._id}`)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
