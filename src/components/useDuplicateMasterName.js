'use client';
import { useEffect, useState } from 'react';

export default function useDuplicateMasterName(resource, name, excludeId) {
  const key = JSON.stringify([resource, String(name || '').trim(), excludeId || '']);
  const [result, setResult] = useState({ key: '', status: 'idle' });
  const hasName = Boolean(String(name || '').trim());
  useEffect(() => {
    if (!hasName) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/master-name-check', {
          method: 'POST', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          body: JSON.stringify({ resource, name, excludeId }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message);
        if (!controller.signal.aborted) setResult({ key, status: data.duplicate ? 'duplicate' : 'available' });
      } catch {
        if (!controller.signal.aborted) setResult({ key, status: 'error' });
      }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, hasName]);
  const status = !hasName ? 'idle' : result.key === key ? result.status : 'checking';
  const label = resource[0].toUpperCase() + resource.slice(1);
  return {
    blocked: status === 'duplicate' || status === 'checking',
    status,
    message: status === 'duplicate' ? `${label} name already exists. Please use a different name.`
      : status === 'checking' ? 'Checking name…'
      : status === 'error' ? 'Name check unavailable. The name will be checked when saving.' : '',
  };
}
