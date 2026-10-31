"use client";
import {useLayoutEffect,useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import axios from 'axios';
import {FiLock,FiX} from 'react-icons/fi';
import {masterPermissionFeedback} from '@/lib/masterPermissionFeedback.mjs';

// Report denied master requests centrally, including legacy pages that only
// log failed requests. Keep response bodies and promise rejection intact.
export default function MasterPermissionNotice() {
  const [notice,setNotice]=useState(null);
  const pathname=usePathname();
  useEffect(()=>{setNotice(null);},[pathname]);
  useLayoutEffect(()=>{
    let active=true;
    const report=(url,method,status,data)=>{
      if(!active)return;
      const result=masterPermissionFeedback({url,method,status,data,origin:window.location.origin});
      if(result)setNotice(result);
    };
    const originalFetch=window.fetch;
    const wrappedFetch=async function(input,options) {
      const response=await originalFetch.call(window,input,options);
      if(response.status===403) {
        const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
        const method=options?.method || input?.method || 'GET';
        response.clone().json().catch(()=>null).then(data=>report(url,method,response.status,data));
      }
      return response;
    };
    window.fetch=wrappedFetch;
    const interceptor=axios.interceptors.response.use(response=>response,error=>{
      report(error.config?.url,error.config?.method,error.response?.status,error.response?.data);
      return Promise.reject(error);
    });
    return ()=>{active=false;if(window.fetch===wrappedFetch)window.fetch=originalFetch;axios.interceptors.response.eject(interceptor);};
  },[]);
  if(!notice)return null;
  return <div role="alert" aria-live="assertive" className="fixed right-4 top-20 z-[200] w-[calc(100%-2rem)] max-w-md rounded-xl border border-red-200 bg-white p-4 shadow-xl sm:right-6"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600"><FiLock size={18}/></span><div className="min-w-0 flex-1"><p className="text-sm font-bold text-red-800">{notice.title}</p><p className="mt-1 text-sm leading-5 text-slate-700">{notice.message}</p><p className="mt-2 text-xs leading-5 text-slate-500">{notice.help}</p></div><button type="button" aria-label="Dismiss permission message" onClick={()=>setNotice(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><FiX size={16}/></button></div></div>;
}
