// Account preferences affect device pushes only, never the inbox or permissions.
export const adminPushDefaults = { creation: false, approvals: false, billing: false, exceptions: true };
export const adminPushCategories = [
  ['creation', 'Creation updates'], ['approvals', 'Approval updates'],
  ['billing', 'Billing reminders'], ['exceptions', 'Cancellation, hold and correction alerts'],
];

export function isNotificationAdmin(user) {
  return user?.type === 'company' || (user?.roles || []).some(role =>
    ['admin', 'company admin', 'company administrator'].includes(String(role).trim().toLowerCase()));
}

export function adminPushCategory(type = '') {
  if (/cancel|hold|reject|correction|replacement|sync-failed/i.test(type)) return 'exceptions';
  if (type === 'billing-reminder') return 'billing';
  if (type.startsWith('pending-create:')) return 'creation';
  if (/^(approval-request:|workflow-decision:|pending-reapproval|order-status-approval)/.test(type)) return 'approvals';
  return null;
}

export function allowAdminPush(item, preferences = {}) {
  if (item.type === 'push-test') return true;
  const category = adminPushCategory(item.type);
  return category ? (preferences[category] ?? adminPushDefaults[category]) === true : false;
}

export function validAdminPushChanges(body) {
  return body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length > 0 &&
    Object.entries(body).every(([key, value]) => Object.hasOwn(adminPushDefaults, key) && typeof value === 'boolean');
}
