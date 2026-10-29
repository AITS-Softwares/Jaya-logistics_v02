const PUSH_HOSTS = ['fcm.googleapis.com', 'web.push.apple.com', 'updates.push.services.mozilla.com'];

export function safeNotificationUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('/admin') || /[\\\s\u0000-\u001f]/.test(value)) return '/admin';
  try {
    const url = new URL(value, 'https://erp.invalid');
    return url.origin === 'https://erp.invalid' && (url.pathname === '/admin' || url.pathname.startsWith('/admin/'))
      ? `${url.pathname}${url.search}${url.hash}` : '/admin';
  } catch { return '/admin'; }
}

export function validPushEndpoint(value) {
  try {
    const url = new URL(value);
    return value.length <= 2048 && url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash &&
      (PUSH_HOSTS.includes(url.hostname) || url.hostname.endsWith('.push.services.mozilla.com') || url.hostname.endsWith('.notify.windows.com')) && url.pathname.length > 1;
  } catch { return false; }
}

export function validSubscription(value) {
  if (!value || !validPushEndpoint(value.endpoint)) return false;
  const key = (v, bytes) => typeof v === 'string' && v.length <= 90 && /^[A-Za-z0-9_-]+={0,2}$/.test(v) && Buffer.from(v, 'base64url').length === bytes;
  return key(value.keys?.p256dh, 65) && key(value.keys?.auth, 16);
}

export function canReceiveWorkflowPush(user, notification) {
  if (!user || user.isActive === false) return false;
  if (notification.subCompanyId && user.accessAllOperatingCompanies !== true &&
      !(user.operatingCompanyIds || []).some(id => String(id) === String(notification.subCompanyId))) return false;
  if (notification.moduleName) {
    const mod = user.modules instanceof Map ? user.modules.get(notification.moduleName) : user.modules?.[notification.moduleName];
    const admin = (user.roles || []).some(role => ['admin', 'company admin', 'company administrator'].includes(String(role).toLowerCase()));
    if (!admin && !(mod?.selected && mod.permissions?.[notification.requiredAction || 'view'])) return false;
    if (user.accessAllBranches === false && (!notification.branchIds?.length ||
        !notification.branchIds.every(id => (user.branchIds || []).some(allowed => String(allowed) === String(id))))) return false;
  }
  return true;
}
