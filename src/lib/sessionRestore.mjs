export const invalidSessionStatus = status => [401, 403, 404].includes(status);
export const sessionOwner = user => [user?.type, user?._id || user?.id, user?.activeOperatingCompanyId || 'group'].map(String).join(':');
export function sessionDestination(user, storage) {
  if (user?.type === 'customer') return '/customer-dashboard';
  if (user?.isGroupAdmin) return '/admin/group-overview';
  const saved = storage.getItem('lastPath');
  const valid = typeof saved === 'string' && (saved === '/admin' || saved.startsWith('/admin/')) && !/[\\?#\u0000-\u0020]/.test(saved);
  return valid && storage.getItem('lastPathOwner') === sessionOwner(user) ? saved : '/admin';
}
