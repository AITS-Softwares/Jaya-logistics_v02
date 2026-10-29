import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planCancelledVnnReplacement } from '../src/lib/cancelledVnnReplacement.mjs';

const panel = (key, status = 'Open') => ({ _id: key, orderPanelNo: `OP-${key}`, panelStatus: 'Approved', branch: 'branch', subCompanyId: 'op', reapprovalState: 'none', customerName: 'Customer', plantRows: [{ _id: `${key}-row`, plantName: 'Plant', toName: 'Destination', status, weight: 15 }] });
const cancelled = panel('old', 'Cancelled');
const active = panel('active');
const fresh = panel('new');
const row = source => ({ _id: `${source._id}-saved`, orderPanelId: source._id, orderRowId: `${source._id}-row`, orderNo: source.orderPanelNo, weight: 20, locationRemark: 'Preserve my approved note', status: 'Open' });
const record = () => ({ _id: 'vnn', vnnNo: 'VNN-1', branch: 'branch', subCompanyId: 'op', subCompanyName: 'Company', subCompanyCode: 'JGL', companyId: 'tenant',
  approval: { part1Status: 'Approved', part3Status: 'Approved', finalPerMT: 1200, vendorName: 'Approved vendor', vehicleNo: 'MH01TEST1234' },
  workflow: { part1Locked: true, audit: [] }, reapprovalState: 'none', panelStatus: 'Approved', orders: [row(cancelled), row(active)], selectedOrderPanels: [], reapprovalHistory: [] });
const requests = [{ orderPanelId: 'new', orderRowId: 'new-row' }];
const plan = planCancelledVnnReplacement(record(), [cancelled, active, fresh], requests);
assert.equal(plan.removed.length, 1);
assert.equal(plan.removed[0].orderNo, 'OP-old');
assert.deepEqual(plan.orders[0], row(active), 'Every unaffected row is retained unchanged');
assert.equal(plan.added[0].weight, 15, 'Replacement weight comes from the source order');
assert.equal(plan.added[0].orderRowId, 'new-row');
assert.deepEqual(plan.selectedOrderPanels.map(item => item.orderPanelNo), ['OP-active', 'OP-new']);
assert.equal(record().approval.part3Status, 'Approved');
for (const [current, panels, replacements] of [
  [record(), [panel('old'), active, fresh], requests], // no actual cancellation
  [record(), [panel('old', 'Hold'), active, fresh], requests],
  [record(), [cancelled, active, panel('new', 'Hold')], requests],
  [record(), [cancelled, active, { ...fresh, branch: 'another' }], requests],
  [record(), [cancelled, active, { ...fresh, subCompanyId: 'another' }], requests],
  [record(), [cancelled, active, { ...fresh, reapprovalState: 'unlocked' }], requests],
  [record(), [cancelled, active, { ...fresh, isDraft: true }], requests],
  [record(), [cancelled, active, { ...fresh, plantRows: [{ ...fresh.plantRows[0], statusRequest: { action: 'Cancel' } }] }], requests],
  [record(), [cancelled, active, fresh], [...requests, ...requests]],
  [record(), [cancelled, active, fresh], [{ orderPanelId: 'active', orderRowId: 'active-row' }]],
  [record(), [cancelled, active, fresh], [{ ...requests[0], finalPerMT: 1 }]],
  [record(), [cancelled, active], requests],
  [{ ...record(), reapprovalState: 'pendingApproval' }, [cancelled, active, fresh], requests],
  [{ ...record(), upstreamPending: [{ panel: 'order' }] }, [cancelled, active, fresh], requests],
  [{ ...record(), panelStatus: 'Cancelled' }, [cancelled, active, fresh], requests],
  [record(), [cancelled, active, fresh], []],
]) assert.throws(() => planCancelledVnnReplacement(current, panels, replacements), error => error.status === 409);
const legacy = record(); legacy.orders[0].orderRowId = ''; legacy.orders[0].plantName = 'Plant'; legacy.orders[0].toName = 'Destination';
assert.equal(planCancelledVnnReplacement(legacy, [cancelled, active, fresh], requests).removed.length, 1);
assert.throws(() => planCancelledVnnReplacement(legacy, [{ ...cancelled, plantRows: [...cancelled.plantRows, { ...cancelled.plantRows[0], _id: 'ambiguous' }] }, active, fresh], requests));

// Route authorization is still mandatory for the special action.
let identity = { id: 'user', companyId: 'tenant', type: 'user', modules: { 'Vehicle Negotiation': { selected: true, permissions: { edit: true } } } };
let replacementCalled = false;
let routeRecord;
const source = fs.readFileSync('src/app/api/vehicle-negotiation/[id]/workflow/route.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
const deps = {
  withBranchAccess: handler => handler,
  NextResponse: { json: (data, init = {}) => ({ data, status: init.status || 200 }) },
  mongoose: { Types: { ObjectId: { isValid: () => true } } },
  dbConnect: async () => {}, getTokenFromHeader: () => 'token', verifyJWT: () => identity,
  activeOperatingCompanyId: () => 'op', companyScopeFilter: (_user, filter) => filter,
  replaceCancelledVnnOrders: async () => { replacementCalled = true; return {}; },
  VehicleNegotiation: { findOne: async () => routeRecord },
};
const patch = new Function(...Object.keys(deps), `${source}\nreturn PATCH;`)(...Object.values(deps));
const req = { json: async () => ({ action: 'replace-cancelled-orders', replacementRows: requests }) };
assert.equal((await patch(req, { params: Promise.resolve({ id: 'vnn' }) })).status, 200);
assert(replacementCalled);
identity = { ...identity, modules: {} }; replacementCalled = false;
assert.equal((await patch(req, { params: Promise.resolve({ id: 'vnn' }) })).status, 403);
assert.equal(replacementCalled, false);
identity = null;
assert.equal((await patch(req, { params: Promise.resolve({ id: 'vnn' }) })).status, 401);
identity = { id: 'user', type: 'user', companyId: 'tenant', modules: { 'Vehicle Negotiation': { selected: true, permissions: { edit: true } } } };
routeRecord = { workflow: { cancelledOrderReplacementOnly: true } };
assert.equal((await patch({ json: async () => ({ action: 'amend-part1', reason: 'Try to broaden edit access' }) }, { params: Promise.resolve({ id: 'vnn' }) })).status, 409);

// Exercise the transaction service: only rows/status change; dependents get blocked.
let current = record();
current.toObject = () => JSON.parse(JSON.stringify(current));
let saves = 0; current.save = async () => { saves++; };
let approvalNotices = 0;
let blockers = [];
let inUse = false;
const dependentUpdates = [];
const history = [];
const graph = [{ type: 'vnn', id: 'vnn', depth: 0, record: current }, { type: 'pricing', id: 'pricing', depth: 1, record: { reapprovalState: 'none' } }];
const query = rows => ({ session: () => ({ lean: async () => rows, setOptions: () => ({ lean: async () => rows }) }) });
const serviceDeps = {
  mongoose: { isValidObjectId: () => true, Types: { ObjectId: class { toString() { return 'replacement-batch'; } } }, startSession: async () => ({ withTransaction: async fn => fn(), endSession: async () => {} }) },
  VehicleNegotiation: { findOne: () => ({ session: async () => current }), exists: () => ({ session: async () => inUse }) },
  OrderPanel: { find: () => query([cancelled, active, fresh]) },
  companyScopeFilter: (_user, filter) => filter,
  TYPES: { lr: { Model: { find: () => query([]) } }, pricing: { Model: { updateOne: async (...args) => dependentUpdates.push(args) } } },
  resolveDeleteGraph: async () => graph, deletionBlockers: async () => blockers,
  ReapprovalAudit: { create: async rows => history.push(...rows) },
  notifyModuleApprovers: async () => { approvalNotices++; }, planCancelledVnnReplacement,
};
const serviceSource = fs.readFileSync('src/lib/replaceCancelledVnnOrders.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
const replace = new Function(...Object.keys(serviceDeps), `${serviceSource}\nreturn replaceCancelledVnnOrders;`)(...Object.values(serviceDeps));
const editor = { id: 'user', companyId: 'tenant', name: 'Editor' };
const beforeApproval = { ...current.approval };
const result = await replace(editor, 'vnn', { action: 'replace-cancelled-orders', replacementRows: requests });
assert.equal(result.removed, 1);
assert.equal(saves, 1);
assert.equal(current.reapprovalState, 'pendingApproval', 'Replacement never grants a general unlocked state');
assert.equal(current.workflow.part1Locked, true);
assert.equal(current.approval.part1Status, 'Pending');
assert.equal(current.approval.part3Status, 'Pending');
assert.equal(current.approval.finalPerMT, beforeApproval.finalPerMT);
assert.equal(current.approval.vendorName, beforeApproval.vendorName);
assert.equal(current.approval.vehicleNo, beforeApproval.vehicleNo);
assert.deepEqual(current.orders[0], row(active));
assert.equal(current.approvedSnapshot.orders[0].orderNo, 'OP-old');
assert.equal(dependentUpdates[0][1].$set.reapprovalState, 'blockedByUpstream');
assert.equal(history[0].action, 'cancelledOrdersReplaced');
assert.equal(approvalNotices, 1);
assert.equal(current.workflow.cancelledOrderReplacementOnly, true);
// Rejected replacements can be resubmitted without opening general edits or
// creating a new blocking batch which would strand downstream records.
current.approval.part3Status = 'Reject'; current.approval.part1Status = 'Reject';
current.panelStatus = 'Rejected'; current.reapprovalState = 'unlocked';
await replace(editor, 'vnn', { action: 'replace-cancelled-orders', replacementRows: requests });
assert.equal(current.reapprovalState, 'pendingApproval');
assert.equal(current.orders.length, 2);
assert.equal(current.approval.finalPerMT, beforeApproval.finalPerMT);
assert.equal(dependentUpdates[0][1].$addToSet.upstreamPending.batchId, dependentUpdates[1][1].$addToSet.upstreamPending.batchId);
await assert.rejects(replace(editor, 'vnn', { action: 'replace-cancelled-orders', replacementRows: requests, approval: { finalPerMT: 1 } }), error => error.status === 422);
// Financial/finalized downstream blockers abort before saving or notifying.
current = record(); current.toObject = () => JSON.parse(JSON.stringify(current)); current.save = async () => { saves++; };
inUse = true;
await assert.rejects(replace(editor, 'vnn', { action: 'replace-cancelled-orders', replacementRows: requests }), error => error.status === 409);
inUse = false;
blockers = ['LR is already in a saved bill'];
await assert.rejects(replace(editor, 'vnn', { action: 'replace-cancelled-orders', replacementRows: requests }), error => error.status === 409);
assert.equal(saves, 2); assert.equal(approvalNotices, 2);
console.log('PASS: cancelled-only replacement, canonical source data, unchanged active rows, branch/company scope, invalid/held/duplicate rows, legacy ambiguity, and edit authorization.');
