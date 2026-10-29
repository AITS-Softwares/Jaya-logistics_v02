// Browser-only helpers; subscription changes always use the current bearer token.
export async function notificationRequest(path, options = {}) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Sign in to manage notifications.');
  const response = await fetch(path, { ...options, cache: 'no-store', headers: {
    'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers,
  } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Notification request failed.');
  return data;
}

export function pushSupported() {
  return typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function applicationServerKey(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64 + '='.repeat((4 - base64.length % 4) % 4)), character => character.charCodeAt(0));
}

export async function syncPushSubscription(requestPermission = false) {
  if (!pushSupported()) throw new Error('Push notifications require a supported browser over HTTPS.');
  // Keep the permission request directly attached to the user's button gesture.
  if (requestPermission && await Notification.requestPermission() !== 'granted') throw new Error('Allow notifications for this website in Chrome settings.');
  const config = await notificationRequest('/api/push/subscribe');
  if (!config.configured) throw new Error('Notifications need server setup. Your ERP inbox is still available.');
  if (Notification.permission !== 'granted') return false;
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (requestPermission && subscription?.options.applicationServerKey &&
      String(new Uint8Array(subscription.options.applicationServerKey)) !== String(applicationServerKey(config.publicKey))) {
    await subscription.unsubscribe();
    subscription = null;
  }
  // Never silently re-enable a device where the user disabled ERP notifications.
  if (!subscription && !requestPermission) return false;
  subscription ||= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(config.publicKey) });
  await notificationRequest('/api/push/subscribe', { method: 'POST', body: JSON.stringify(subscription.toJSON()) });
  return true;
}

export async function disablePushSubscription() {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) {
    if (registration) await registration.getNotifications().then(items => items.forEach(item => item.close()));
    return;
  }
  let serverError;
  try { await notificationRequest('/api/push/subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint: subscription.endpoint }) }); }
  catch (error) { serverError = error; }
  // Invalidate the browser endpoint even if the network/server is unavailable.
  let removed = false;
  try { removed = await subscription.unsubscribe(); }
  catch (error) { if (serverError) throw error; }
  if (!removed && serverError) throw serverError;
  await registration?.getNotifications().then(items => items.forEach(item => item.close())).catch(() => {});
}
