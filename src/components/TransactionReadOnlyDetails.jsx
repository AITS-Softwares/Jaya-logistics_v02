'use client';

import { useMemo } from 'react';

const ignored = new Set(['_id', '__v', 'companyId', 'createdAt', 'updatedAt', 'fullPath', 'filePath']);
const label = (key) => key.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, (value) => value.toUpperCase());
const value = (input) => input instanceof Date ? input.toLocaleString() : String(input);

function Details({ data, depth = 0 }) {
  if (data === null || data === undefined || data === '') return <span className="text-slate-400">—</span>;
  if (typeof data !== 'object') return <span>{value(data)}</span>;
  if (Array.isArray(data)) return data.length ? <div className="space-y-3">{data.map((item, index) => <div key={item?._id || index} className="rounded-lg border border-slate-200 p-3"><Details data={item} depth={depth + 1}/></div>)}</div> : <span className="text-slate-400">—</span>;
  return <dl className={depth ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'}>{Object.entries(data).filter(([key]) => !ignored.has(key)).map(([key, item]) => <div key={key} className={typeof item === 'object' && item !== null ? 'sm:col-span-2 lg:col-span-3' : ''}><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label(key)}</dt><dd className="mt-1 text-sm text-slate-900"><Details data={item} depth={depth + 1}/></dd></div>)}</dl>;
}

export default function TransactionReadOnlyDetails({ title, subtitle, data, onBack }) {
  const safeData = useMemo(() => data || {}, [data]);
  return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-6xl"><button onClick={onBack} className="mb-4 text-sm font-semibold text-indigo-600">← Back to list</button><section className="rounded-xl border border-slate-200 bg-white p-5"><h1 className="text-xl font-extrabold text-slate-900">{title}</h1>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}<div className="mt-6"><Details data={safeData}/></div></section></div></div>;
}
