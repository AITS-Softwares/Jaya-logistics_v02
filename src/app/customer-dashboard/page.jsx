"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerPortalView from '@/components/CustomerPortalView';

async function portalRequest(path, options = {}) {
  const response = await fetch(path, { ...options, cache: 'no-store', headers: {
    'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
  } });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.message || 'Unable to load your orders.'), { status: response.status });
  return data;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const signOut = useCallback(() => {
    localStorage.removeItem('token'); localStorage.removeItem('user'); localStorage.removeItem('groupToken');
    setSession(null); setOrders([]); router.replace('/signin');
  }, [router]);

  useEffect(() => {
    let live = true;
    portalRequest('/api/portal/me').then(data => {
      if (live) { setSession(data.user); localStorage.setItem('user', JSON.stringify(data.user)); }
    }).catch(err => { if (live) { if (err.status === 401) signOut(); else setError(err.message); setLoading(false); } });
    return () => { live = false; };
  }, [signOut]);

  useEffect(() => {
    if (!session) return;
    let live = true;
    const timer = setTimeout(async () => {
      setLoading(true); setError(''); setSelected(null);
      try {
        const data = await portalRequest(`/api/portal/orders?page=${page}&q=${encodeURIComponent(search)}`);
        if (live) { setOrders(data.orders); setPages(data.pageCount); setTotal(data.total); }
      } catch (err) { if (live) { setOrders([]); setError(err.message); if (err.status === 401) signOut(); } }
      finally { if (live) setLoading(false); }
    }, 250);
    return () => { live = false; clearTimeout(timer); };
  }, [session, page, search, refresh, signOut]);

  async function viewOrder(id, dispatchId = null) {
    setDetailLoading(true); setError(''); setSelected(null);
    try { const data = await portalRequest(`/api/portal/orders/${id}`); setSelected({ ...data.order, initialTrackingDispatch: dispatchId }); }
    catch (err) { setError(err.message); if (err.status === 401) signOut(); }
    finally { setDetailLoading(false); }
  }

  const closeDetails = useCallback(() => setSelected(null), []);

  return <CustomerPortalView
    session={session}
    orders={orders}
    page={page}
    pages={pages}
    total={total}
    search={search}
    loading={loading}
    error={error}
    selected={selected}
    detailLoading={detailLoading}
    onSearch={value => { setSearch(value); setPage(1); }}
    onRefresh={() => setRefresh(value => value + 1)}
    onPrevious={() => setPage(value => value - 1)}
    onNext={() => setPage(value => value + 1)}
    onViewOrder={viewOrder}
    onCloseDetails={closeDetails}
    onSignOut={signOut}
  />;
}
