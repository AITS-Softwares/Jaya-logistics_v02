import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { safeNotificationUrl, validPushEndpoint, validSubscription, canReceiveWorkflowPush } from '../src/lib/pushPolicy.mjs';
import { deliverNextNotification, configureWebPush } from '../src/lib/pushDelivery.mjs';
import { activitySettings, activityEventKey, canOverview, uniqueActivity, usesOverview } from '../src/lib/notificationActivityPolicy.mjs';

const subscription = (suffix = 'a') => ({ _id: suffix, userId: 'u', companyId: 'c', accountType: 'user', endpointHash: suffix,
  endpoint: `https://fcm.googleapis.com/fcm/send/${suffix}`, keys: { p256dh: Buffer.alloc(65, 4).toString('base64url'), auth: Buffer.alloc(16, 2).toString('base64url') }, updatedAt: new Date() });
const user = () => ({ _id: 'u', companyId: 'c', isActive: true, modules: { 'Loading Info': { selected: true, permissions: { approve: true } } }, accessAllOperatingCompanies: true, accessAllBranches: true });
const notification = () => ({ _id: 'n', assignedTo: 'u', company: 'c', moduleName: 'Loading Info', requiredAction: 'approve', message: 'PRIVATE customer and rate', createdAt: new Date(), pushState: 'pending', pushAttempts: 0, pushNextAttemptAt: new Date(0) });

assert(validSubscription(subscription()));
for (const endpoint of ['http://fcm.googleapis.com/x', 'https://127.0.0.1/x', 'https://fcm.googleapis.com.evil.test/x', 'https://fcm.googleapis.com@evil.test/x', 'https://fcm.googleapis.com:8080/x', 'https://erp.jaya-groups.com/api/private']) assert(!validPushEndpoint(endpoint), endpoint);
assert(!validSubscription({ ...subscription(), keys: { auth: 'broken', p256dh: 'broken' } }));
for (const value of ['https://evil.test/admin', '//evil.test/admin', '/administrator', '/admin/../../private', '/admin\\evil', '/admin/%2e%2e/private']) assert.equal(safeNotificationUrl(value), '/admin');
assert.equal(safeNotificationUrl('/admin/Tracking-Plan?q=1'), '/admin/Tracking-Plan?q=1');
assert.equal(canReceiveWorkflowPush({ ...user(), isActive: false }, notification()), false);
assert.equal(canReceiveWorkflowPush({ ...user(), modules: {} }, notification()), false);
assert.equal(canReceiveWorkflowPush({ ...user(), accessAllOperatingCompanies: false, operatingCompanyIds: [] }, { ...notification(), subCompanyId: 'op' }), false);
assert.equal(canReceiveWorkflowPush({ ...user(), accessAllBranches: false, branchIds: ['b'] }, { ...notification(), branchIds: ['other'] }), false);
assert.equal(canReceiveWorkflowPush({ ...user(), accessAllBranches: false, branchIds: ['b'] }, { ...notification(), branchIds: ['b'] }), true);
assert.throws(() => configureWebPush({}), /VAPID/);

function matches(row, query) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '$or') return value.some(q => matches(row, q));
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('$lte' in value) return row[key] != null && row[key] <= value.$lte;
      if ('$in' in value) return value.$in.includes(row[key]);
    }
    return row[key] instanceof Date && value instanceof Date ? +row[key] === +value : row[key] === value;
  });
}
function update(row, change, inserted = false) {
  Object.assign(row, inserted ? change.$setOnInsert : {}, change.$set);
  for (const [key, value] of Object.entries(change.$inc || {})) row[key] = (row[key] || 0) + value;
  for (const key of Object.keys(change.$unset || {})) delete row[key];
}
function database(item = notification(), devices = [subscription()], recipient = user()) {
  const rows = { notifications: [item], pushsubscriptions: devices, pushdeliveries: [], companyusers: recipient ? [recipient] : [], companies: [], notificationpreferences: [] };
  return { rows, collection(name) {
    const list = rows[name];
    return {
      findOne: async query => list.find(row => matches(row, query)) || null,
      find: query => ({ toArray: async () => list.filter(row => matches(row, query)) }),
      findOneAndUpdate: async (query, change) => { const row = list.find(row => matches(row, query)); if (!row) return null; update(row, change); return { ...row }; },
      updateOne: async (query, change, options) => { let row = list.find(row => matches(row, query)); const exists = !!row; if (!row && options?.upsert) { row = { ...query }; list.push(row); } if (row) update(row, change, !exists); return { matchedCount: exists ? 1 : 0 }; },
      deleteOne: async query => { const i = list.findIndex(row => matches(row, query)); if (i >= 0) list.splice(i, 1); },
    };
  } };
}
let db = database();
let sends = [];
await deliverNextNotification(db, { send: async (sub, body) => sends.push({ sub, body: JSON.parse(body) }) });
assert.equal(db.rows.notifications[0].pushState, 'sent');
assert.equal(sends.length, 1);
assert(!JSON.stringify(sends[0].body).includes('PRIVATE'));
assert.equal(sends[0].body.url, '/admin?notification=n');
assert.equal(await deliverNextNotification(db), false);

// Admin routine pushes are opt-in; employee delivery keeps its existing rules.
for (const type of ['pending-create:loading-info', 'approval-request:loading-info', 'billing-reminder']) {
  db = database({ ...notification(), type }, [subscription()], { ...user(), roles: ['Admin'] });
  await deliverNextNotification(db, { send: async () => assert.fail('Routine admin push must default off') });
  assert.equal(db.rows.notifications[0].pushState, 'skipped');
}
db = database({ ...notification(), type: 'approval-request:loading-info' }, [subscription()], { ...user(), roles: ['Admin'] });
db.rows.notificationpreferences.push({ account: 'u', company: 'other', approvals: true });
await deliverNextNotification(db, { send: async () => assert.fail('Another company preference cannot enable this account') });
assert.equal(db.rows.notifications[0].pushState, 'skipped');
db = database({ ...notification(), type: 'approval-request:loading-info' }, [subscription()], { ...user(), roles: ['Admin'] });
db.rows.notificationpreferences.push({ account: 'u', company: 'c', approvals: true });
sends = [];
await deliverNextNotification(db, { send: async () => sends.push(true) });
assert.equal(sends.length, 1);
assert.equal(db.rows.notifications[0].pushState, 'sent');
for (const enabled of [undefined, false]) {
  db = database({ ...notification(), type: 'order-cancel' }, [subscription()], { ...user(), roles: ['Admin'] });
  if (enabled === false) db.rows.notificationpreferences.push({ account: 'u', company: 'c', exceptions: false });
  sends = [];
  await deliverNextNotification(db, { send: async () => sends.push(true) });
  assert.equal(sends.length, enabled === false ? 0 : 1);
}
db = database({ ...notification(), type: 'push-test' }, [subscription()], { ...user(), roles: ['Admin'] });
sends = [];
await deliverNextNotification(db, { send: async () => sends.push(true) });
assert.equal(sends.length, 1, 'An explicit device test bypasses routine-category defaults');

// A successful device must not receive duplicates when another device retries.
db = database(notification(), [subscription('a'), subscription('b')]);
sends = [];
const originalError = console.error;
console.error = () => {};
try {
  await deliverNextNotification(db, { send: async sub => { sends.push(sub.endpoint); if (sub.endpoint.endsWith('/b')) throw { statusCode: 503 }; } });
  assert.equal(db.rows.notifications[0].pushState, 'pending');
  db.rows.notifications[0].pushNextAttemptAt = new Date(0);
  await deliverNextNotification(db, { send: async sub => sends.push(sub.endpoint) });
  assert.equal(sends.filter(endpoint => endpoint.endsWith('/a')).length, 1);
  assert.equal(db.rows.notifications[0].pushState, 'sent');
  db = database({ ...notification(), pushAttempts: 4 });
  await deliverNextNotification(db, { send: async () => { throw { statusCode: 503 }; } });
  assert.equal(db.rows.notifications[0].pushState, 'failed');
} finally { console.error = originalError; }
for (const statusCode of [404, 410]) {
  db = database();
  await deliverNextNotification(db, { send: async () => { throw { statusCode }; } });
  assert.equal(db.rows.pushsubscriptions.length, 0);
  assert.equal(db.rows.notifications[0].pushState, 'skipped');
}
for (const [item, recipient] of [[{ ...notification(), read: true }, user()], [{ ...notification(), createdAt: new Date(0) }, user()], [notification(), { ...user(), modules: {} }], [notification(), null]]) {
  db = database(item, [subscription()], recipient);
  await deliverNextNotification(db, { send: async () => assert.fail('must not send') });
  assert.equal(db.rows.notifications[0].pushState, 'skipped');
}
// Crash recovery reclaims a stale lease; legacy history without pushState is untouched.
db = database({ ...notification(), pushState: 'sending', pushLeaseUntil: new Date(0) });
await deliverNextNotification(db, { send: async () => {} });
assert.equal(db.rows.notifications[0].pushState, 'sent');
db = database({ ...notification(), pushState: undefined });
assert.equal(await deliverNextNotification(db), false);

// Exercise subscription API identity binding without a real database or network.
function loadModule(path, deps, names) {
  const source = fs.readFileSync(path, 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  return new Function(...Object.keys(deps), `${source}\nreturn { ${names.join(', ')} };`)(...Object.values(deps));
}
let signedIn = { id: 'u', companyId: 'c', type: 'user' };
let saved;
let deleted;
const api = loadModule('src/app/api/push/subscribe/route.js', {
  createHash: (await import('node:crypto')).createHash,
  NextResponse: { json: (data, init = {}) => ({ data, status: init.status || 200 }) },
  PushSubscription: { findOneAndUpdate: async (query, changes) => { saved = { query, changes }; }, deleteOne: async query => { deleted = query; } },
  pushIdentity: async () => { if (!signedIn) throw Object.assign(new Error('Unauthorized'), { status: 401 }); return signedIn; },
  pushConfigured: () => true, validSubscription, validPushEndpoint,
}, ['POST', 'DELETE']);
const request = body => ({ url: 'https://erp.test/api/project/notifications', headers: new Headers(), json: async () => body });
assert.equal((await api.POST(request({ ...subscription(), userId: 'forged' }))).status, 200);
assert.equal(saved.changes.$set.userId, 'u');
assert.equal(saved.changes.$set.companyId, 'c');
await api.DELETE(request(subscription()));
assert.equal(deleted.userId, 'u');
assert.equal(deleted.companyId, 'c');
assert.equal((await api.POST(request({ endpoint: 'https://localhost/private' }))).status, 400);
signedIn = null;
assert.equal((await api.POST(request(subscription()))).status, 401);

// Inbox list and mark-read must retain both tenant and recipient scope.
let inboxFilter;
let readFilter;
const inboxApi = loadModule('src/app/api/project/notifications/route.js', {
  mongoose: { isValidObjectId: id => /^[a-f0-9]{24}$/i.test(id) },
  NextResponse: { json: (data, init = {}) => ({ data, status: init.status || 200 }) },
  withBranchAccess: handler => handler,
  pushIdentity: async () => ({ id: 'u', companyId: 'c' }),
  visibleInbox: async (identity, filter) => { inboxFilter = { identity, filter }; return [{ _id: '507f1f77bcf86cd799439011' }]; },
  inboxItem: item => item,
  markInboxRead: async (identity, rows) => { readFilter = { assignedTo: identity.id, company: identity.companyId, _id: { $in: rows.map(item => item._id) } }; },
}, ['GET', 'PATCH']);
assert.equal((await inboxApi.GET(request({}))).status, 200);
assert.equal(inboxFilter.identity.id, 'u');
await inboxApi.PATCH(request({ ids: ['507f1f77bcf86cd799439011'] }));
assert.equal(readFilter.assignedTo, 'u');
assert.equal(readFilter.company, 'c');
assert.deepEqual(readFilter._id.$in, ['507f1f77bcf86cd799439011']);
assert.equal((await inboxApi.PATCH(request({ ids: ['forged'] }))).status, 400);

let queried;
const inbox = loadModule('src/lib/notificationInbox.js', {
  Notification: { find: filter => { queried = filter; return { sort: () => ({ limit: () => ({ lean: async () => [notification()] }) }) }; } },
  visibleBranchNotifications: async rows => rows,
  NotificationRead: { find: () => ({ lean: async () => [] }) },
  activitySettings, activityEventKey, canOverview, uniqueActivity, usesOverview,
}, ['visibleInbox']);
assert.equal((await inbox.visibleInbox({ ...user(), id: 'u', companyId: 'c' }, { company: 'forged', assignedTo: 'other' })).length, 1);
assert.equal(queried.company, 'c');
assert.equal(queried.assignedTo, 'u');
assert.equal((await inbox.visibleInbox({ ...user(), id: 'u', modules: {} })).length, 0);

// Offline logout must invalidate the browser endpoint even if server removal fails.
let unsubscribed = false;
const client = loadModule('src/lib/pushClient.js', {
  window: { isSecureContext: true, PushManager: {}, Notification: {} },
  navigator: { serviceWorker: { getRegistration: async () => ({
    pushManager: { getSubscription: async () => ({ endpoint: subscription().endpoint, unsubscribe: async () => { unsubscribed = true; return true; } }) },
    getNotifications: async () => [],
  }) } },
  localStorage: { getItem: () => 'test-token' },
  fetch: async () => { throw new Error('offline'); },
}, ['disablePushSubscription']);
await client.disablePushSubscription();
assert(unsubscribed);

// Service worker handles invalid payloads and refuses external click URLs.
const handlers = {};
let shown;
let opened;
const context = { URL, self: { location: { origin: 'https://erp.jaya-groups.com' }, addEventListener: (name, fn) => { handlers[name] = fn; }, registration: { showNotification: async (title, options) => { shown = { title, options }; } }, clients: { matchAll: async () => [], openWindow: async url => { opened = url; } } } };
vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), context);
let work;
handlers.push({ data: { json: () => { throw new Error('bad JSON'); } }, waitUntil: promise => { work = promise; } });
await work;
assert.equal(shown.title, 'Jaya ERP');
handlers.notificationclick({ notification: { close() {}, data: { url: 'https://evil.test/phishing' } }, waitUntil: promise => { work = promise; } });
await work;
assert.equal(opened, 'https://erp.jaya-groups.com/admin');
console.log('Web Push tests passed: identity binding, safe URLs, recipient permissions, privacy, retries, expiry, receipts, lease recovery and service worker.');
