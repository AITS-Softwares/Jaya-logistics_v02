import { unwrapBranchHandlers } from './route-business-source.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const panels = [
  ['order', 'Order Panel', 'OrderPanel', 'orderPanelNo'],
  ['vnn', 'Vehicle Negotiation', 'VehicleNegotiation', 'vnnNo'],
  ['pricing', 'Pricing Panel', 'PricingPanel', 'pricingSerialNo'],
  ['loading', 'Loading Info', 'LoadingPanel', 'vehicleArrivalNo'],
  ['lr', 'Consignment Note', 'ConsignmentNote', 'lrNo'],
];
const states = ['unlocked', 'pendingApproval', 'pendingReapproval', 'blockedByUpstream', 'syncFailed'];
let user;
let syncPlan = { required: false, ambiguous: false };
const docs = Object.fromEntries(panels.map(([type, , , number]) => [type, states.map((state) => ({
  _id: `${type}-${state}`, [number]: `${type}-${state}`, reapprovalState: state,
  upstreamPending: state === 'blockedByUpstream' ? [{ panel: 'vnn', recordId: 'vnn-pendingApproval' }] : [],
}))]));
const deps = {
  NextResponse: { json: (body) => body }, connectDb: async () => {}, verifyToken: () => user,
  findLatestApprovedVnnForLoading: async () => syncPlan,
};
for (const [type, , model] of panels) {
  deps[model] = { find: (filter) => {
    let rows = docs[type];
    if (filter._id?.$in) rows = rows.filter((doc) => filter._id.$in.includes(doc._id));
    const query = { select: () => query, sort: () => query, limit: () => query, lean: async () => rows };
    return query;
  } };
}
const source = unwrapBranchHandlers(fs.readFileSync(new URL('../src/app/api/reapproval/queue/route.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '').replace('export async function GET', 'async function GET');
const getQueue = new Function(...Object.keys(deps), `${source}\nreturn GET;`)(...Object.values(deps));
const modulePermission = (permissions) => ({ selected: true, permissions });
const asUser = (modules) => { user = { companyId: 'company', modules }; };

const activeTasks = (records) => records.filter((record) => !['blockedByUpstream', 'syncFailed'].includes(record.reapprovalState));
// Submitted work moves to the approver, while downstream status stays visible.
asUser({ 'Order Panel': modulePermission({ view: true, edit: true }) });
let result = await getQueue({});
assert.deepEqual(activeTasks(result.records).map((record) => record.id), ['order-unlocked']);
assert(result.records.some((record) => record.id === 'order-blockedByUpstream'));
assert.equal(result.records.find(record => record.id === 'order-blockedByUpstream').actionable, false);
assert.equal(result.records.find(record => record.id === 'order-unlocked').actionable, true);
assert(!result.records.some((record) => record.id === 'order-pendingApproval'));
asUser({ 'Order Panel': modulePermission({ approve: true }) });
result = await getQueue({});
assert.deepEqual(new Set(activeTasks(result.records).map((record) => record.id)), new Set(['order-pendingApproval', 'order-pendingReapproval']));
assert(activeTasks(result.records).every((record) => record.path.includes('/approve/')));
asUser({ 'Order Panel': modulePermission({ view: true }) });
assert.deepEqual(activeTasks((await getQueue({})).records), []);
assert((await getQueue({})).records.some((record) => record.id === 'order-blockedByUpstream'));

// Apply the same handoff to each workflow stage, including the dedicated Pricing permission.
for (const [type, module] of panels) {
  asUser({ [module]: modulePermission({ edit: true }) });
  assert.deepEqual(activeTasks((await getQueue({})).records).map((record) => record.id), [`${type}-unlocked`]);
  const approvalModule = type === 'pricing' ? 'Pricing Panel - Part 2 Approval' : module;
  asUser({ [approvalModule]: modulePermission({ approve: true }) });
  const tasks = activeTasks((await getQueue({})).records);
  assert.deepEqual(new Set(tasks.map((record) => record.id)), new Set([`${type}-pendingApproval`, `${type}-pendingReapproval`]));
}
asUser({ 'Pricing Panel': modulePermission({ approve: true }) });
assert.deepEqual((await getQueue({})).records, [], 'Pricing approval uses its dedicated module');
asUser({ 'Order Panel': { selected: false, permissions: { edit: true, approve: true } } });
assert.deepEqual((await getQueue({})).records, []);
user = { type: 'company', companyId: 'company' };
result = await getQueue({});
assert.equal(result.records.length, 25);
assert.equal(result.records.filter((record) => record.reapprovalState === 'blockedByUpstream').length, 5);
assert.equal(result.records.filter((record) => record.reapprovalState === 'syncFailed').length, 5);
assert(result.records.filter(record => record.reapprovalState === 'syncFailed').every(record => record.actionable));
assert(result.records.filter(record => record.reapprovalState === 'blockedByUpstream').every(record => !record.actionable));

// Loading sync is a real task for edit/approve users, while ambiguous links need an admin.
docs.loading[0].reapprovalHistory = [{ action: 'detachedOrderBlockCleared' }];
syncPlan = { required: true, ambiguous: false, candidate: { vnnNo: 'VNN-1' } };
asUser({ 'Loading Info': modulePermission({ edit: true }) });
assert((await getQueue({})).records.some((record) => record.latestVnnSyncRequired));
syncPlan = { required: false, ambiguous: true };
assert((await getQueue({})).records.some((record) => record.latestVnnSyncAmbiguous));
console.log('PASS: active task ownership, downstream status visibility, all workflow stages, dedicated Pricing approval, admin sync recovery, and Loading sync tasks.');
