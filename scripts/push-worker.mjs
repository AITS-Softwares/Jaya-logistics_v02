import nextEnv from '@next/env';
import { MongoClient } from 'mongodb';
import { configureWebPush, deliverNextNotification } from '../src/lib/pushDelivery.mjs';
import { queueBillingReminders } from '../src/lib/billingReminders.mjs';

nextEnv.loadEnvConfig(process.cwd(), false);
const pushEnabled = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
if (pushEnabled) configureWebPush();
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
const client = new MongoClient(process.env.MONGODB_URI);
let stopped = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { stopped = true; });
try {
  await client.connect();
  const db = client.db();
  await db.collection('notifications').createIndex({ pushState: 1, pushNextAttemptAt: 1 });
  await db.collection('notifications').createIndex({ reminderKey: 1 }, { unique: true, partialFilterExpression: { reminderKey: { $type: 'string' } } });
  await db.collection('pushsubscriptions').createIndex({ endpointHash: 1 }, { unique: true });
  await db.collection('pushdeliveries').createIndex({ notificationId: 1, endpointHash: 1 }, { unique: true });
  await db.collection('pushdeliveries').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  console.log('Jaya ERP push worker started.');
  if (!pushEnabled) console.log('Web Push is not configured; billing inbox reminders remain enabled.');
  let nextBillingScan = 0;
  do {
    if (Date.now() >= nextBillingScan) {
      try { const result = await queueBillingReminders(db); if (result.queued) console.log(`Queued ${result.queued} client billing reminders.`); }
      catch { console.error('Billing reminder scan failed; will retry.'); }
      nextBillingScan = Date.now() + 15 * 60000;
    }
    const worked = pushEnabled ? await deliverNextNotification(db) : false;
    if (process.argv.includes('--once')) break;
    if (!worked) await new Promise(resolve => setTimeout(resolve, 5000));
  } while (!stopped);
} finally { await client.close(); }
