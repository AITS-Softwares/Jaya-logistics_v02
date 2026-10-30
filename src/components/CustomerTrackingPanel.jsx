"use client";
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
const TrackingMap = dynamic(() => import('@/app/api/tracking/TrackingMap'), { ssr: false });

export default function CustomerTrackingPanel({ orderId, dispatchId }) {
  const [tracking, setTracking] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    async function update() {
      if (document.hidden) return;
      try {
        const response = await fetch(`/api/portal/orders/${orderId}/tracking?dispatchId=${encodeURIComponent(dispatchId)}`, {
          cache: 'no-store', signal: controller.signal, headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Tracking unavailable.');
        if (live) { setTracking(data.tracking); setError(''); }
      } catch (err) { if (live && err.name !== 'AbortError') { setError(err.message); setTracking(null); } }
    }
    setTracking(null); setError(''); update();
    const timer = setInterval(update, 30000);
    return () => { live = false; controller.abort(); clearInterval(timer); };
  }, [orderId, dispatchId]);
  return <section className="mt-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4" aria-label="Vehicle tracking">
    <h3 className="font-semibold text-slate-900">Vehicle tracking {tracking?.vehicleNo && `· ${tracking.vehicleNo}`}</h3>
    <p role="status" className="mt-2 text-sm text-slate-600">{error || tracking?.message || 'Checking vehicle location…'}</p>
    {tracking?.updatedAt && <p className="mt-1 text-xs text-slate-500">Last update: {new Date(tracking.updatedAt).toLocaleString('en-IN')}</p>}
    {tracking?.location && <div className="mt-3"><TrackingMap vehicle={{ lat: tracking.location.latitude, lng: tracking.location.longitude, label: tracking.vehicleNo }} /><p className="mt-2 text-xs text-slate-500">{tracking.location.latitude.toFixed(5)}, {tracking.location.longitude.toFixed(5)} · Accuracy ±{Math.round(tracking.location.accuracyM || 0)} m</p></div>}
    <p className="mt-2 text-xs text-slate-400">Updates every 30 seconds while this view is open. Location is shown only during an active, eligible trip.</p>
  </section>;
}
