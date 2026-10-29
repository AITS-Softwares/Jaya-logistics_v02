import Notification from '@/models/project/NotificationModel';
import { visibleBranchNotifications } from '@/lib/branchNotifications';
import mongoose from 'mongoose';
import { loadBillingReminderGroups, billingGroupUrl } from '@/lib/billingReminders.mjs';
import { billingGroupsForUser } from '@/lib/billingReminderPolicy.mjs';
import NotificationRead from '@/models/project/NotificationRead';
import { activitySettings, activityEventKey, canOverview, uniqueActivity, usesOverview } from '@/lib/notificationActivityPolicy.mjs';

export async function visibleInbox(user, filter = {}, view) {
  const overview = usesOverview(user, view);
  const tenant = { ...filter, company: user.companyId };
  if (!overview) tenant.assignedTo = user.id;
  else delete tenant.assignedTo;
  let rows = [], cursor, scanned = 0, billingGroups;
  // Filter before applying the visible-history limit. Recipient copies and
  // inaccessible branches must not consume the first 200 visible events.
  while (scanned < activitySettings.scanLimit && rows.length < activitySettings.historyLimit) {
    const query = cursor ? { $and: [tenant, { _id: { $lt: cursor } }] } : tenant;
    const batch = await Notification.find(query).sort({ _id: -1 }).limit(activitySettings.scanBatch).lean();
    if (!batch.length) break;
    scanned += batch.length;
    cursor = batch.at(-1)._id;
    const visible = await visibleBranchNotifications(batch, { overview });
    if (billingGroups === undefined && visible.some(item => item.type === 'billing-reminder')) {
      billingGroups = new Map(billingGroupsForUser(user, await loadBillingReminderGroups(mongoose.connection.db, user.companyId), { operatingCompanyId: user.activeOperatingCompanyId }).map(group => [group.groupKey, group]));
    }
    rows.push(...visible.filter(item => {
      if (item.type === 'billing-reminder' && !billingGroups?.has(item.billingGroupKey)) return false;
      if (!item.moduleName || canOverview(user)) return true;
      const mod = user.modules instanceof Map ? user.modules.get(item.moduleName) : user.modules?.[item.moduleName];
      return mod?.selected && mod.permissions?.[item.requiredAction || 'view'];
    }).map(item => {
      const group = item.type === 'billing-reminder' && billingGroups?.get(item.billingGroupKey);
      return group ? { ...item, message: `${group.clientName}: ${group.rows.length} LR${group.rows.length === 1 ? '' : 's'} awaiting full billing.`, url: billingGroupUrl(group) } : item;
    }));
    rows = uniqueActivity(rows);
    if (batch.length < activitySettings.scanBatch) break;
  }
  rows = rows.slice(0, activitySettings.historyLimit);
  if (!rows.length) return [];
  const keys = rows.map(activityEventKey);
  const receipts = await NotificationRead.find({ company: user.companyId, account: user.id, eventKey: { $in: keys } }).lean();
  const read = new Set(receipts.map(item => item.eventKey));
  // Retain this account's existing read history, never another recipient's.
  const own = overview ? await ownCopies(user, rows) : rows;
  for (const item of own) if (item.read) read.add(activityEventKey(item));
  return rows.map(item => ({ ...item, read: read.has(activityEventKey(item)) }));
}

async function ownCopies(user, rows) {
  return Notification.find({ company: user.companyId, assignedTo: user.id, $or: [
    { eventId: { $in: rows.map(item => item.eventId).filter(Boolean) } },
    { createdAt: { $in: rows.filter(item => !item.eventId && item.createdAt).map(item => item.createdAt) } },
    { _id: { $in: rows.map(item => item._id) } },
  ] }).lean();
}

export async function markInboxRead(user, rows) {
  if (!rows.length) return;
  const keys = new Set(rows.map(activityEventKey));
  await NotificationRead.bulkWrite([...keys].map(eventKey => ({ updateOne: {
    filter: { company: user.companyId, account: user.id, eventKey },
    update: { $setOnInsert: { readAt: new Date() } }, upsert: true,
  } })));
  const own = (await ownCopies(user, rows)).filter(item => keys.has(activityEventKey(item)));
  if (own.length) await Notification.updateMany({ company: user.companyId, assignedTo: user.id, _id: { $in: own.map(item => item._id) } }, { $set: { read: true } });
}

export function inboxItem(item) {
  return {
    _id: item._id, message: item.message, type: item.type, read: item.read,
    createdAt: item.createdAt, url: item.url || '/admin', reference: item.reference || '',
    moduleName: item.moduleName || '', sourceModel: item.sourceModel || '', sourceRecordId: item.sourceRecordId || '',
  };
}
