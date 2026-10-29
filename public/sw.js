/* Push only: do not cache authenticated ERP pages or API responses. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

function safeUrl(value) {
  try {
    const url = new URL(value || '/admin', self.location.origin);
    return url.origin === self.location.origin && (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) ? url.href : new URL('/admin', self.location.origin).href;
  } catch { return new URL('/admin', self.location.origin).href; }
}

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { /* Safe fallback for malformed payloads. */ }
  event.waitUntil(self.registration.showNotification('Jaya ERP', {
    body: typeof data.body === 'string' ? data.body.slice(0, 180) : 'You have a new ERP notification.',
    tag: typeof data.tag === 'string' ? data.tag : 'jaya-erp',
    icon: '/favicon.ico',
    data: { url: safeUrl(data.url) },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = safeUrl(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin && new URL(client.url).pathname.startsWith('/admin'));
    if (existing) { await existing.navigate(url); await existing.focus(); }
    else await self.clients.openWindow(url);
  })());
});
