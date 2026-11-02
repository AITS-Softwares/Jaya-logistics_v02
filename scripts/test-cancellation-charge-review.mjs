import assert from 'node:assert/strict';
import fs from 'node:fs';
let user, panel, notices;
const deps = {
  NextResponse: { json: (value, options = {}) => ({ ...value, status: options.status || 200 }) },
  withAuth: handler => (req, context) => handler(req, context, user), withBranchAccess: handler => handler,
  hasPermission: user => user.edit, canUnlockForCorrection: user => user.approve,
  companyScopeFilter: (user, filter) => filter, connectDb: async () => {},
  PricingPanel: { findOne: async () => panel }, notifyModulePermissionUsers: async value => notices.push(value),
};
const source = fs.readFileSync('src/app/api/pricing-panel/[id]/cancellation-charges/route.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
const post = new Function(...Object.keys(deps), `${source}\nreturn POST;`)(...Object.values(deps));
const call = body => post({ json: async () => body }, { params: Promise.resolve({ id: 'pricing' }) });
notices = []; user = { edit: true, id: 'editor' }; panel = { pricingSerialNo: 'PR-1', orders: [{ _id: 'row', cancellationChargeRequired: true, cancellationCharges: 'Nil' }], cancellation: { state: 'cancelled' }, reapprovalHistory: [], $locals: {}, increment() {}, async save() {} };
assert.equal((await call({ action: 'approve' })).status, 403);
assert.equal((await call({ action: 'submit', rows: [{ id: 'row', amount: '' }] })).status, 400);
assert.equal((await call({ action: 'submit', rows: [{ id: 'row', amount: -1 }] })).status, 400);
assert.equal((await call({ action: 'submit', rows: [{ id: 'other', amount: 1 }] })).status, 400);
assert.equal((await call({ action: 'submit', rows: [{ id: 'row', amount: 0 }] })).status, 200);
assert.equal(panel.orders[0].cancellationChargeRequired, true, 'Task stays outstanding until approval');
assert.equal((await call({ action: 'submit', rows: [{ id: 'row', amount: 50 }] })).status, 409);
user = { approve: true, id: 'approver' };
assert.equal((await call({ action: 'reject' })).status, 400);
assert.equal((await call({ action: 'reject', reason: 'Review the charge' })).status, 200);
user = { edit: true, id: 'editor' }; assert.equal((await call({ action: 'submit', rows: [{ id: 'row', amount: 125 }] })).status, 200);
user = { approve: true, id: 'approver' }; assert.equal((await call({ action: 'approve' })).status, 200);
assert.equal(panel.orders[0].cancellationCharges, '125'); assert.equal(panel.orders[0].cancellationChargeRequired, false); assert.equal(panel.cancellation.state, 'cancelled'); assert.equal(panel.$locals.allowCancellationWrite, true); assert.equal(notices.length, 4);
console.log('PASS: charge-only submission, explicit zero, invalid/missing rows, pending task retention, editor/approver separation, rejection/resubmission and approval clearing.');
