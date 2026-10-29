import { createHash, randomUUID } from 'node:crypto';

// Editable defaults. These never override company, branch or permission checks.
export const activitySettings = {
  adminOverview: true,
  historyLimit: 200,
  scanBatch: 500,
  scanLimit: 10000,
};

export function canOverview(user) {
  return user.type === 'company' || (user.roles || []).some(role =>
    ['admin', 'company admin', 'company administrator'].includes(String(role).trim().toLowerCase()));
}

export function usesOverview(user, view) {
  return activitySettings.adminOverview && canOverview(user) && view !== 'personal';
}

function identity(item) {
  return [String(item.company || ''), String(item.subCompanyId || ''), item.type || '',
    item.message || '', item.reference || '', item.sourceModel || '', item.sourceRecordId || '', item.url || '/admin'];
}

export function activityEventKey(item) {
  if (item.eventId) return `event:${item.eventId}`;
  // Historical recipient copies inserted together have identical timestamps.
  // Keep separate occurrences separate; never merge only by document reference.
  const time = item.createdAt && new Date(item.createdAt).toISOString();
  // Branch-restricted recipients may receive different LR counts for the same
  // client/day; those are still copies of one reminder event.
  if (item.type === 'billing-reminder' && item.billingGroupKey && time) {
    return `billing:${String(item.company)}:${item.billingGroupKey}:${new Date(new Date(time).getTime() + 330 * 60000).toISOString().slice(0, 10)}`;
  }
  const occurrence = [String(item.user || ''), time || String(item._id)];
  return `legacy:${createHash('sha256').update(JSON.stringify([...identity(item), ...occurrence])).digest('hex')}`;
}

export function stampActivityEvents(items) {
  const events = new Map();
  for (const item of items) {
    if (item.eventId) continue;
    const key = JSON.stringify(identity(item));
    if (!events.has(key)) events.set(key, randomUUID());
    item.eventId = events.get(key);
  }
}

export function uniqueActivity(rows) {
  const seen = new Set();
  return rows.filter(item => {
    const key = activityEventKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
