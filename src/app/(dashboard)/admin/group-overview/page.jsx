"use client";

import { useEffect, useState } from "react";

export default function GroupOverviewPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/group/overview", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message);
        setData(body);
      }).catch((err) => setError(err.message));
  }, []);
  if (error) return <div className="p-8 text-red-700">{error}</div>;
  if (!data) return <div className="p-8 text-slate-500">Loading JAYA GROUP overview…</div>;
  return <div className="p-6 md:p-8"><h1 className="text-2xl font-bold text-slate-900">{data.groupName} — Consolidated Overview</h1><p className="mt-1 text-sm text-slate-500">Read-only combined operational record counts by legal company.</p><div className="mt-6 grid gap-4 md:grid-cols-3">{data.companies.map((company) => <section key={company.code} className="rounded-xl border bg-white p-5 shadow-sm"><p className="text-xs font-bold text-indigo-600">{company.code}</p><h2 className="mt-1 font-semibold text-slate-900">{company.name}</h2><p className="mt-3 text-3xl font-bold">{company.total}</p><p className="text-xs text-slate-500">transaction records</p></section>)}</div></div>;
}
