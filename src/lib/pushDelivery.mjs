import { randomUUID } from 'node:crypto';
import webpush from 'web-push';
import { validSubscription, canReceiveWorkflowPush } from './pushPolicy.mjs';
import { loadBillingReminderGroups } from './billingReminders.mjs';
import { billingGroupsForUser } from './billingReminderPolicy.mjs';
import { isNotificationAdmin, allowAdminPush } from './adminNotificationPolicy.mjs';

export function configureWebPush(env = process.env) {
  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    throw new Error('Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT before starting the push worker.');
  }
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
}

// Inbox rows form a durable outbox; per-device receipts avoid resending successes.
// Delivery is at least once. Stable tags coalesce rare crash retries.
export async function deliverNextNotification(db, { send = (...args) => webpush.sendNotification(...args), now = new Date() } = {}) {
  const notifications = db.collection('notifications');
  const subscriptions = db.collection('pushsubscriptions');
  const receipts = db.collection('pushdeliveries');
  const lease = randomUUID();
  const item = await notifications.findOneAndUpdate({ $or: [
    { pushState: 'pending', pushNextAttemptAt: { $lte: now } },
    { pushState: 'sending', pushLeaseUntil: { $lte: now } },
  ] }, { $set: { pushState: 'sending', pushLeaseUntil: new Date(now.getTime() + 120000), pushLease: lease }, $inc: { pushAttempts: 1 } },
  { sort: { pushNextAttemptAt: 1 }, returnDocument: 'after', includeResultMetadata: false });
  if (!item) return false;
  const claim = { _id: item._id, pushLease: lease };
  const finish = (state, extra = {}) => notifications.updateOne(claim, { $set: { pushState: state, ...extra }, $unset: { pushLease: '', pushLeaseUntil: '' } });
  try {
    if (item.pushAttempts > 5) { await finish('failed'); return true; }
    if (item.read || !item.assignedTo || !item.createdAt || now - item.createdAt > 86400000) {
      await finish('skipped'); return true;
    }
    const user = await db.collection('companyusers').findOne({ _id: item.assignedTo, companyId: item.company });
    const companyAccount = !user && String(item.assignedTo) === String(item.company) && await db.collection('companies').findOne({ _id: item.company });
    if (!companyAccount && !canReceiveWorkflowPush(user, item)) { await finish('skipped'); return true; }
    if (companyAccount || isNotificationAdmin(user)) {
      const preferences = await db.collection('notificationpreferences').findOne({ company: item.company, account: item.assignedTo });
      if (!allowAdminPush(item, preferences || {})) { await finish('skipped'); return true; }
    }
    if (item.type === 'billing-reminder') {
      const groups = billingGroupsForUser(companyAccount ? { type: 'company', companyId: item.company } : user, await loadBillingReminderGroups(db, item.company));
      if (!groups.some(group => group.groupKey === item.billingGroupKey)) { await finish('skipped'); return true; }
    }
    const devices = await subscriptions.find({ userId: item.assignedTo, companyId: item.company, accountType: companyAccount ? 'company' : 'user' }).toArray();
    if (!devices.length) { await finish('skipped'); return true; }
    let transientFailure = false;
    let delivered = false;
    for (let i = 0; i < devices.length; i += 4) {
      const renewed = await notifications.updateOne(claim, { $set: { pushLeaseUntil: new Date(Date.now() + 120000) } });
      if (!renewed.matchedCount) return true;
      await Promise.all(devices.slice(i, i + 4).map(async device => {
        const receipt = { notificationId: item._id, endpointHash: device.endpointHash };
        if (await receipts.findOne(receipt)) { delivered = true; return; }
        const current = await subscriptions.findOne({ _id: device._id, userId: item.assignedTo, companyId: item.company, updatedAt: device.updatedAt });
        if (!current) return;
        if (!validSubscription(current)) { await subscriptions.deleteOne({ _id: current._id, updatedAt: current.updatedAt }); return; }
        try {
          await send({ endpoint: current.endpoint, keys: current.keys }, JSON.stringify({
            title: 'Jaya ERP',
            body: item.type === 'push-test' ? 'Push notifications are working on this device.' : 'You have a new ERP notification. Open Jaya ERP to view it.',
            tag: `erp-${item._id}`,
            url: `/admin?notification=${item._id}`,
          }), { TTL: 3600, timeout: 8000, urgency: 'normal' });
          await receipts.updateOne(receipt, { $setOnInsert: { ...receipt, sentAt: new Date(), expiresAt: new Date(Date.now() + 7 * 86400000) } }, { upsert: true });
          delivered = true;
        } catch (error) {
          if ([404, 410].includes(error.statusCode)) await subscriptions.deleteOne({ _id: current._id, updatedAt: current.updatedAt });
          else {
            transientFailure = true;
            console.error('Web Push delivery failed', { notificationId: String(item._id), status: error.statusCode || 'network' });
          }
        }
      }));
    }
    if (transientFailure) {
      await finish(item.pushAttempts >= 5 ? 'failed' : 'pending', { pushNextAttemptAt: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** item.pushAttempts)) });
    } else await finish(delivered ? 'sent' : 'skipped');
  } catch {
    await finish(item.pushAttempts >= 5 ? 'failed' : 'pending', { pushNextAttemptAt: new Date(Date.now() + 60000) });
    console.error('Push worker deferred notification', String(item._id));
  }
  return true;
}
