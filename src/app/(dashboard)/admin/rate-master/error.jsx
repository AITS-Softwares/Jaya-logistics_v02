"use client";
import {useEffect} from 'react';
import Link from 'next/link';
export default function RateMasterError({error,reset}) {
  useEffect(()=>{console.error('Rate Master view error:',error);},[error]);
  return <div className="mx-auto my-8 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" role="alert"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Rate Master</p><h1 className="mt-2 text-xl font-bold text-slate-900">Unable to display this view</h1><p className="mt-2 text-sm leading-6 text-slate-600">Something went wrong while displaying the rate details. Try loading the view again. If the problem continues, share the action you were performing with your administrator.</p>{error?.digest && <p className="mt-3 text-xs text-slate-500">Error reference: {error.digest}</p>}<div className="mt-5 flex gap-3"><button type="button" onClick={reset} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Try again</button><Link href="/admin/rate-master/list" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Back to list</Link></div></div>;
}
