import assert from 'node:assert/strict';
import fs from 'node:fs';
let calls = [], writes = [], notices = [], blocked = false;
const order = { _id: 'order', orderPanelNo: 'OP-OLD', plantRows: [{ _id: 'row', status: 'Cancelled' }] };
const query = { sort() { return this; }, limit(value) { assert.equal(value, 25); return this; }, lean: async () => [order] };
const deps = {
  mongoose: { startSession: async () => ({ withTransaction: work => work(), endSession: async () => {} }) },
  TYPES: { order: { Model: { find: () => query, updateOne: async (...args) => writes.push(args) } }, vnn: { Model: { updateOne: async (...args) => writes.push(args) } } },
  companyScopeFilter: (user, filter) => { assert.equal(user.companyId, 'tenant'); assert.equal(user.activeOperatingCompanyId, 'op'); return filter; },
  branchContext: { getStore: () => ({ access: { accessAllBranches: false, branchIds: ['branch'] } }) },
  cancelOrder: async (user, id, body) => { calls.push({ user, id, body }); if (blocked) throw Object.assign(new Error('Paid advance'), { blockers: [{ reason: 'Advance AP-1 is paid.' }] }); },
  resolveDeleteGraph: async () => [], planOrderCancellation: () => ({ plans: [{ type: 'vnn', id: 'vnn', record: {} }] }),
  notifyModulePermissionUsers: async notice => notices.push(notice),
};
const source = fs.readFileSync('src/lib/reconcileOrderCancellations.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
const create = () => new Function(...Object.keys(deps), `${source}\nreturn reconcileOrderCancellations;`)(...Object.values(deps));
const user = { id: 'viewer', companyId: 'tenant', activeOperatingCompanyId: 'op', roles: [] };
let reconcile = create(); await Promise.all([reconcile(user), reconcile(user)]);
assert.equal(calls.length, 1, 'Concurrent list reads share the reconciliation');
assert.equal(calls[0].body.reconcile, true); assert.equal(calls[0].id, 'order'); assert.equal(user.type, undefined, 'Original user permissions are not mutated'); assert.equal(calls[0].user.activeOperatingCompanyId, 'op');
await reconcile(user); assert.equal(calls.length, 1, 'Completed batch is throttled');
blocked = true; reconcile = create(); await reconcile(user);
assert.equal(writes.length, 2); assert.equal(writes[0][1].$set.cancellation.state, 'review'); assert.equal(writes[1][1].$set.cancellationRepair.state, 'blocked'); assert.equal(notices.length, 1); assert.equal(notices[0].action, 'approve');
console.log('PASS: historical cancellation repairs automatically on scoped reads, coalesces concurrent batches, retains operating-company scope and protects payment/POD blockers with visible review state.');
