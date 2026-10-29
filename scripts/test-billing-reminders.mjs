import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { billingReminderDueAt, indiaDateKey, isYaraClient, remainingBillingQuantity, billingGroupsForUser } from '../src/lib/billingReminderPolicy.mjs';
import { loadBillingReminderGroups, queueBillingReminders } from '../src/lib/billingReminders.mjs';

assert(isYaraClient('Yara Fertilizer India Pvt Ltd'));
assert(!isYaraClient('Yaravision Industries'));
assert.equal(indiaDateKey('2026-10-24T18:29:59Z'), '2026-10-24');
assert.equal(indiaDateKey('2026-10-24T18:30:00Z'), '2026-10-25');
assert.equal(+billingReminderDueAt('2026-10-02T12:00:00Z', 'Yara'), +new Date('2026-10-25T00:00:00+05:30'));
assert.equal(+billingReminderDueAt('2026-10-29T12:00:00Z', 'Yara'), +new Date('2026-10-29T00:00:00+05:30'));
assert.equal(+billingReminderDueAt('2026-01-31T12:00:00Z', 'Other'), +new Date('2026-02-05T00:00:00+05:30'));
assert.equal(+billingReminderDueAt('2026-12-31T12:00:00Z', 'Other'), +new Date('2027-01-05T00:00:00+05:30'));
assert.equal(billingReminderDueAt('invalid', 'Other'), null);
const note = { lrNo: 'LR-1', totalWeight: 20 };
assert.equal(remainingBillingQuantity(note, [{ type: 'detention', data: [{ lrNo: 'LR-1', weight: 20 }] }]).fullyBilled, false);
assert.equal(remainingBillingQuantity(note, [{ type: 'general', data: [{ lrNo: 'LR-1', billQuantity: 10 }] }]).remaining, 10);
assert.equal(remainingBillingQuantity(note, [{ type: 'product-wise', data: [{ lrNo: 'LR-1', billQuantity: 12 }, { lrNo: 'LR-1', billQuantity: 8 }] }]).fullyBilled, true);

const companyId = new ObjectId(), opId = new ObjectId(), branchId = new ObjectId(), customerId = new ObjectId(), recipientId = new ObjectId(), lrId = new ObjectId();
const recipient = { _id: recipientId, companyId, isActive: true, modules: { Billing: { selected: true, permissions: { view: true, create: true } } }, operatingCompanyIds: [opId], accessAllBranches: false, branchIds: [branchId] };
const tables = {
  consignmentnotes: [{ _id: lrId, companyId, subCompanyId: opId, lrNo: 'LR-1', customerId: String(customerId), header: { orderNo: 'OP-1', partyName: 'Yara Fertilizer India Pvt Ltd', status: 'Approved' }, createdAt: new Date('2026-10-01T00:00:00+05:30'), totalWeight: 20 }],
  savedreports: [], customers: [{ _id: customerId, companyId, customerName: 'Yara Fertilizer India Pvt Ltd' }],
  subcompanies: [{ _id: opId, companyId, code: 'JGL', name: 'Company' }], branches: [{ _id: branchId, companyId, name: 'Branch', code: 'BR' }],
  orderpanels: [{ _id: new ObjectId(), companyId, subCompanyId: opId, orderPanelNo: 'OP-1', branch: branchId }], vehiclenegotiations: [], loadingpanels: [],
  companyusers: [recipient], notifications: [],
};
const equal = (a, b) => a instanceof ObjectId || b instanceof ObjectId ? String(a) === String(b) : a === b;
function matches(row, query) { return Object.entries(query).every(([field, expected]) => {
  if (expected && typeof expected === 'object' && !(expected instanceof ObjectId)) {
    if ('$ne' in expected) return !equal(row[field], expected.$ne);
    if ('$in' in expected) return expected.$in.some(value => equal(row[field], value));
  }
  return equal(row[field], expected);
}); }
const db = { collection(name) { const rows = tables[name] ||= []; return {
  find: query => { const cursor = { project: () => cursor, toArray: async () => rows.filter(row => matches(row, query)) }; return cursor; },
  distinct: async (field, query) => [...new Map(rows.filter(row => matches(row, query)).map(row => [String(row[field]), row[field]])).values()],
  updateOne: async (query, update, options) => { let row = rows.find(row => matches(row, query)); if (!row && options.upsert) { row = { _id: new ObjectId(), ...update.$setOnInsert }; rows.push(row); return { upsertedCount: 1 }; } return { upsertedCount: 0 }; },
  updateMany: async (query, update) => { for (const row of rows.filter(row => matches(row, query))) Object.assign(row, update.$set); },
}; } };
assert.equal((await loadBillingReminderGroups(db, companyId, new Date('2026-10-24T12:00:00+05:30'))).length, 0);
let groups = await loadBillingReminderGroups(db, companyId, new Date('2026-10-25T09:00:00+05:30'));
assert.equal(groups.length, 1);
assert.equal(groups[0].rows[0].branchIds[0], String(branchId));
assert.equal(billingGroupsForUser(recipient, groups).length, 1);
assert.equal(billingGroupsForUser({ ...recipient, branchIds: [] }, groups).length, 0);
assert.equal(billingGroupsForUser({ ...recipient, operatingCompanyIds: [] }, groups).length, 0);
assert.equal(billingGroupsForUser({ ...recipient, companyId: new ObjectId() }, groups).length, 0);
assert.equal(billingGroupsForUser({ ...recipient, modules: {} }, groups).length, 0);
assert.equal(billingGroupsForUser({ ...recipient, isActive: false }, groups).length, 0);
process.env.BILLING_REMINDER_HOUR_IST = '9';
assert.equal((await queueBillingReminders(db, new Date('2026-10-25T08:59:00+05:30'))).queued, 0);
assert.equal((await queueBillingReminders(db, new Date('2026-10-25T09:00:00+05:30'))).queued, 1);
assert.equal((await queueBillingReminders(db, new Date('2026-10-25T18:00:00+05:30'))).queued, 0);
assert.equal((await queueBillingReminders(db, new Date('2026-10-26T09:00:00+05:30'))).queued, 1);
assert.equal((await loadBillingReminderGroups(db, companyId, new Date('2026-11-02T09:00:00+05:30'))).length, 1, 'Yara reminders continue across month-end');
tables.savedreports.push({ companyId, subCompanyId: opId, type: 'product-wise', data: [{ lrNo: 'LR-1', billQuantity: 10 }] });
assert.equal((await loadBillingReminderGroups(db, companyId, new Date('2026-11-02T09:00:00+05:30')))[0].rows[0].remainingQty, 10);
tables.savedreports.push({ companyId, subCompanyId: opId, type: 'product-wise', data: [{ lrNo: 'LR-1', billQuantity: 10 }] });
assert.equal((await loadBillingReminderGroups(db, companyId, new Date('2026-11-02T09:00:00+05:30'))).length, 0);
await queueBillingReminders(db, new Date('2026-11-02T09:00:00+05:30'));
assert(tables.notifications.every(item => item.read && item.pushState === 'skipped'));
tables.savedreports.length = 0; tables.consignmentnotes[0].header.status = 'Cancelled';
assert.equal((await loadBillingReminderGroups(db, companyId, new Date('2026-11-02T09:00:00+05:30'))).length, 0);
tables.consignmentnotes[0].header.status = 'Approved'; tables.customers[0].customerName = 'Other Client'; tables.consignmentnotes[0].createdAt = new Date('2026-11-01T12:00:00+05:30');
assert.equal((await loadBillingReminderGroups(db, companyId, new Date('2026-11-05T12:00:00+05:30'))).length, 0);
assert.equal((await loadBillingReminderGroups(db, companyId, new Date('2026-11-06T09:00:00+05:30'))).length, 1);
console.log('PASS: Yara 25th, daily/month-end continuation, other-client 5 days, India dates, partial/full billing, deduplication, cancellation, and tenant/branch/permission scope.');
