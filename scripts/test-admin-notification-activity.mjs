import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as policy from '../src/lib/notificationActivityPolicy.mjs';
import { branchModels, canAccessBranches, key } from '../src/lib/branchOwnership.mjs';

function load(path, deps, names) {
  const source = fs.readFileSync(path, 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  return new Function(...Object.keys(deps), `${source}\nreturn {${names}};`)(...Object.values(deps));
}
const oid = n => n.toString(16).padStart(24, '0');
const date = new Date('2026-10-29T09:00:00Z');
const event = (n, extra = {}) => ({ _id: oid(n), company: 'c', assignedTo: 'worker', user: 'actor',
  type: 'order-cancel', message: 'Order OP-1 cancelled.', reference: 'OP-1', createdAt: date,
  subCompanyId: 'op', branchIds: ['b'], read: false, ...extra });
const user = { id: 'worker', companyId: 'c', type: 'user', roles: [], modules: {} };
const admin = { ...user, id: 'admin', roles: ['Admin'] };
let scope = { user: { activeOperatingCompanyId: 'op' }, access: { accessAllBranches: false, branchIds: ['b'] },
  load: async () => ({ lookup: (model, ref) => model === 'OrderPanel' && ref === 'OP-1' ? { _id: 'source', subCompanyId: 'op' } : null,
    rows: new Map([['OrderPanel', [{ _id: 'source', orderPanelNo: 'OP-1', subCompanyId: 'op' }]]]), resolve: () => ['b'] }) };
const branch = load('src/lib/branchNotifications.js', {
  branchContext: { getStore: () => scope }, branchModels, canAccessBranches, key,
}, 'visibleBranchNotifications,notificationBranchSource');

// Legacy cancellation/hold notices must obey current branch and company access.
let rows = await branch.visibleBranchNotifications([
  event(1), event(2, { branchIds: ['other'] }), event(3, { subCompanyId: 'other' }),
  event(4, { type: 'order-hold', subCompanyId: null, branchIds: [], reference: '', message: 'Order OP-1 placed on hold.' }),
  event(5, { subCompanyId: null, branchIds: [], reference: '', message: 'Unresolvable legacy alert' }),
], { overview: true });
assert.deepEqual(rows.map(row => row._id), [oid(1), oid(4)]);
scope.access.branchIds = ['other'];
assert.equal((await branch.visibleBranchNotifications([event(4, { subCompanyId: null, branchIds: [] })])).length, 0);
scope.access.branchIds = ['b'];

// Recipient copies share one event, while repeated actions remain separate.
const copies = [event(10), event(11, { assignedTo: 'someone' })];
policy.stampActivityEvents(copies);
assert.equal(policy.uniqueActivity(copies).length, 1);
const repeat = [event(12)];
policy.stampActivityEvents(repeat);
assert.equal(policy.uniqueActivity([...copies, ...repeat]).length, 2);
assert.equal(policy.uniqueActivity([event(1), event(2)]).length, 1, 'Historical batch copies collapse');
assert.equal(policy.uniqueActivity([event(1), event(2, { createdAt: new Date(+date + 1) })]).length, 2);
assert.equal(policy.uniqueActivity([event(1, { type: 'billing-reminder', billingGroupKey: 'client', message: '1 LR' }), event(2, { type: 'billing-reminder', billingGroupKey: 'client', message: '3 LRs' })]).length, 1, 'Branch-specific billing copies are one daily client event');
assert.equal(policy.usesOverview(user, 'overview'), false);
assert.equal(policy.usesOverview(admin), true);
assert.equal(policy.usesOverview(admin, 'personal'), false);

function matches(row, query) {
  return Object.entries(query).every(([field, value]) => {
    if (field === '$and') return value.every(q => matches(row, q));
    if (field === '$or') return value.some(q => matches(row, q));
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('$in' in value) return value.$in.some(v => String(v) === String(row[field]));
      if ('$lt' in value) return row[field] < value.$lt;
    }
    return String(row[field]) === String(value);
  });
}
let data = [...copies, ...repeat, event(13, { company: 'other-company', eventId: 'foreign' }),
  event(14, { eventId: 'other-branch', branchIds: ['other'] })];
const receipts = [];
let writes = [];
const Notification = {
  find(query) {
    let selected = data.filter(row => matches(row, query));
    const chain = { sort() { selected.sort((a, b) => b._id.localeCompare(a._id)); return chain; },
      limit(n) { selected = selected.slice(0, n); return chain; }, lean: async () => selected.map(row => ({ ...row })) };
    return chain;
  },
  async updateMany(query) {
    writes.push(query);
    for (const row of data.filter(row => matches(row, query))) row.read = true;
  },
};
const NotificationRead = {
  find: query => ({ lean: async () => receipts.filter(row => matches(row, query)) }),
  bulkWrite: async operations => { for (const { updateOne } of operations) {
    if (!receipts.some(row => matches(row, updateOne.filter))) receipts.push({ ...updateOne.filter, ...updateOne.update.$setOnInsert });
  } },
};
const inbox = load('src/lib/notificationInbox.js', {
  Notification, NotificationRead, visibleBranchNotifications: branch.visibleBranchNotifications,
  ...policy, mongoose: { connection: {} },
  loadBillingReminderGroups: async () => [], billingGroupsForUser: () => [],
}, 'visibleInbox,markInboxRead');

let companyActivity = await inbox.visibleInbox(admin);
assert.equal(companyActivity.length, 2, 'Admin sees unique permitted events sent to other users');
assert.equal((await inbox.visibleInbox(admin, {}, 'personal')).length, 0);
assert.equal((await inbox.visibleInbox(user, { company: 'forged', assignedTo: 'someone' })).length, 2);
await inbox.markInboxRead(admin, companyActivity);
assert.equal(writes.length, 0, 'Admin must not mutate employee notification copies');
assert((await inbox.visibleInbox(admin)).every(row => row.read));
assert((await inbox.visibleInbox(user)).every(row => !row.read));
assert((await inbox.visibleInbox({ ...admin, id: 'second-admin' })).every(row => !row.read));
assert.equal((await inbox.visibleInbox({ ...admin, companyId: 'other-company' })).length, 1);
await inbox.markInboxRead(user, await inbox.visibleInbox(user));
assert(writes.every(query => query.assignedTo === 'worker' && query.company === 'c'));
assert(data.filter(row => row.assignedTo === 'worker' && row.company === 'c' && row.branchIds.includes('b')).every(row => row.read));
assert.equal(data.find(row => row.assignedTo === 'someone').read, false);

// A representative recipient's read flag cannot clear an admin's badge.
receipts.length = 0;
assert((await inbox.visibleInbox(admin)).every(row => !row.read));
data.push({ ...copies[0], _id: oid(15), assignedTo: 'admin', read: true });
assert((await inbox.visibleInbox(admin)).find(row => row.eventId === copies[0].eventId).read,
  'Existing own read history survives a different representative copy');

// Large runs of hidden rows cannot consume the visible history limit.
data = [event(1, { eventId: 'visible' }), ...Array.from({ length: 600 }, (_, i) =>
  event(i + 2, { eventId: `hidden-${i}`, branchIds: ['other'] }))];
assert.equal((await inbox.visibleInbox(admin)).length, 1);

// Admin preference controls the overview; user-requested scope cannot elevate.
const original = policy.activitySettings.adminOverview;
policy.activitySettings.adminOverview = false;
assert.equal((await inbox.visibleInbox(admin)).length, 0);
policy.activitySettings.adminOverview = original;
assert.equal((await inbox.visibleInbox(user, {}, 'overview')).length, 1);

const require = createRequire(import.meta.url);
// Exercise the actual schema hooks without opening a database connection.
const mongoose = require('mongoose');
const modelSource = fs.readFileSync('src/models/project/NotificationModel.js', 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace('export default ', 'return ');
const Model = new Function('mongoose', 'stampActivityEvents', modelSource)(mongoose, policy.stampActivityEvents);
const batchCopies = [event(21), event(22, { assignedTo: 'another-recipient' })];
await new Promise((resolve, reject) => Model.schema.s.hooks.execPre('insertMany', Model, [batchCopies], error => error ? reject(error) : resolve()));
assert.equal(batchCopies[0].eventId, batchCopies[1].eventId, 'Actual insertMany hook stamps shared event identity');
const document = new Model({ ...batchCopies[0], _id: oid(21), company: oid(1), assignedTo: oid(2), user: oid(3), subCompanyId: oid(4), branchIds: [oid(5)] });
await document.validate();
assert.equal(document.eventId, batchCopies[0].eventId, 'Validation must preserve the batch identity');
const standalone = new Model({ company: oid(1), user: oid(3), type: 'test', message: 'test' });
await standalone.validate();
assert(standalone.eventId, 'Single-document creates also receive an event identity');
const { parse } = require('@babel/parser');
for (const path of ['src/components/NotificationBell.jsx', 'src/models/project/NotificationModel.js',
  'src/models/project/NotificationRead.js', 'src/lib/branchAccess.js', 'src/lib/workflowNotifications.js',
  'src/app/api/project/notifications/route.js', 'src/app/api/project/notifications/[id]/route.js']) {
  parse(fs.readFileSync(path, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
}
console.log('PASS: unique admin events, personal view, independent read receipts, tenant/branch isolation, legacy scope, history scanning and editable policy.');
