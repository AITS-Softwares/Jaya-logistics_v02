'use client';

import OrderPanelDetailsView from '@/components/OrderPanelDetailsView';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function OrderPanelViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/order-panel?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Unable to load order details.');
        }

        setOrder(data.data);
      } catch (loadError) {
        setError(loadError.message);
      }
    };

    if (id) load();
  }, [id]);

  if (!order && !error) {
    return <div className="p-8 text-sm text-slate-500">Loading order details…</div>;
  }

  if(order)return <OrderPanelDetailsView order={order} onBack={()=>router.back()} />;
  return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-7xl"><button type="button" onClick={()=>router.back()} className="mb-4 text-sm font-semibold text-indigo-600">← Back to list</button><div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div></div></div>;
}
