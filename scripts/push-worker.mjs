import nextEnv from '@next/env';
import { MongoClient } from 'mongodb';
import { configureWebPush, deliverNextNotification } from '../src/lib/pushDelivery.mjs';
import { queueBillingReminders } from '../src/lib/billingReminders.mjs';
import { scanTripOperationalAlerts } from '../src/lib/driverOperationalAlerts.mjs';

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
  let nextTrackingScan = 0;
  do {
    if (Date.now() >= nextTrackingScan) {
      try {
        const configs = await db.collection('drivermobileconfigs').find({}, { projection: { companyId: 1, enabled: 1 } }).toArray();
        const globalEnabled = process.env.DRIVER_MOBILE_ENABLED === 'true';
        const companies = globalEnabled
          ? { $nin: configs.filter(config => !config.enabled).map(config => config.companyId) }
          : { $in: configs.filter(config => config.enabled).map(config => config.companyId) };
        const cursor = db.collection('drivertrips').find({ companyId: companies, state: { $in: ['assigned', 'started', 'at_pickup', 'in_transit', 'at_stop', 'delivered'] } });
        let trips = [];
        for await (const trip of cursor) {
          trips.push(trip);
          if (trips.length >= 100) { await scanTripOperationalAlerts(db, trips); trips = []; }
        }
        await scanTripOperationalAlerts(db, trips);
      } catch { console.error('Driver tracking alert scan failed; will retry.'); }
      nextTrackingScan = Date.now() + 60000;
    }
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
