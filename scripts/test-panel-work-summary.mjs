import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PANEL_WORK, buildPanelWorkSummaries, panelApprovalFilter, mergePanelWork } from '../src/lib/panelWorkPolicy.mjs';
const grant = (...actions) => ({ selected: true, permissions: Object.fromEntries(actions.map(action => [action, true])) });
const calls = [];
const deps = { countCreation: async panel => { calls.push('create:' + panel.key); return panel.key === 'loading' ? 1 : 0; }, countApproval: async panel => { calls.push('approve:' + panel.key); return panel.key === 'loading' ? 3 : 0; } };
let result = await buildPanelWorkSummaries({ user: { modules: { 'Loading Info': grant('create', 'approve') } }, ...deps });
assert.equal(result.records.length, 1);
assert.equal(result.records[0].createCount, 1);
assert.equal(result.records[0].approvalCount, 3);
assert.equal(result.records[0].createPath, '/admin/Loading-Info');
assert.deepEqual(calls, ['create:loading', 'approve:loading']);
assert.equal(PANEL_WORK.find(panel => panel.key === 'loading').createEndpoint, '/api/loading-panel/reference-data?lookup=pendingCount');
assert.equal(PANEL_WORK.find(panel => panel.key === 'advance').createEndpoint, '/api/purchase-panel?for=advance-payment&format=table&count=1');
calls.length = 0;
await buildPanelWorkSummaries({ user: { modules: { 'Pricing Panel': grant('approve'), 'Pricing Panel - Part 2 Approval': grant('approve') } }, ...deps });
assert.deepEqual(calls, ['approve:pricing']);
calls.length = 0;
await buildPanelWorkSummaries({ user: { modules: {} }, ...deps });
assert.deepEqual(calls, []);
result = await buildPanelWorkSummaries({ user: { modules: { 'Loading Info': grant('create', 'approve') } }, ...deps, countCreation: async () => { throw new Error('unavailable'); } });
assert.equal(result.records[0].approvalCount, 3);
assert.equal(result.warnings.length, 1);
const summary = { type: 'panel-summary', module: 'Loading Info', approvalCount: 3 };
const reviews = [
 { id: 'approval', module: 'Loading Info', reapprovalState: 'pendingReapproval', actionable: true },
 { id: 'correction', module: 'Loading Info', reapprovalState: 'unlocked', actionable: true },
 { id: 'sync', module: 'Loading Info', reapprovalState: 'pendingReapproval', actionable: true, latestVnnSyncRequired: true },
 { id: 'waiting', module: 'Loading Info', reapprovalState: 'blockedByUpstream', actionable: false },
];
const merged = mergePanelWork(reviews, [summary], [{ id: 'billing', type: 'billing' }]);
assert.deepEqual(merged.filter(item => item.id).map(item => item.id), ['correction','sync','waiting','billing']);
assert.equal(mergePanelWork(reviews, [], []).length, 4, 'Approval details stay available if the panel count fails');
function matches(row, query) {
 return Object.entries(query).every(([key, value]) => {
  if (key === '$and') return value.every(item => matches(row, item));
  if (key === '$or') return value.some(item => matches(row, item));
  const actual = key.split('.').reduce((object, part) => object?.[part], row);
  if (value && typeof value === 'object') {
   if ('$ne' in value) return actual !== value.$ne;
   if ('$nin' in value) return !value.$nin.includes(actual);
   if ('$in' in value) return value.$in.some(expected => expected === actual || expected === null && actual === undefined);
   if ('$exists' in value) return (actual !== undefined) === value.$exists;
  }
  return actual === value;
 });
}
const pending = { isDraft: false, panelStatus: 'Submitted', reapprovalState: 'none' };
assert(matches(pending, panelApprovalFilter('order')));
for (const row of [{ ...pending, isDraft: true }, { ...pending, panelStatus: 'Cancelled' }, { ...pending, reapprovalState: 'unlocked' }, { ...pending, upstreamPending: [{ panel: 'order' }] }, { ...pending, isDeleted: true }]) assert(!matches(row, panelApprovalFilter('order')));
assert(matches({ ...pending, panelStatus: 'Draft' }, panelApprovalFilter('loading')), 'Submitted legacy Loading records use isDraft=false');
assert(matches({ ...pending, rateApproval: { workflowPhase: 'part2', approvalStatus: 'Pending' } }, panelApprovalFilter('pricing')));
assert(!matches({ ...pending, reapprovalState: 'pendingReapproval', rateApproval: { workflowPhase: 'part1', approvalStatus: 'Pending' } }, panelApprovalFilter('pricing')));
assert(matches({ ...pending, approval: { part3Status: 'Pending' }, workflow: { part1Locked: true } }, panelApprovalFilter('vnn')));
assert(!matches({ ...pending, reapprovalState: 'pendingReapproval', workflow: { part1Locked: false } }, panelApprovalFilter('vnn')));
assert(matches({ ...pending, header: { status: 'Pending' } }, panelApprovalFilter('lr')));
assert(!matches({ ...pending, header: { status: 'Cancelled' }, reapprovalState: 'pendingReapproval' }, panelApprovalFilter('lr')));
assert(matches({ ...pending, approval: { status: 'Pending' } }, panelApprovalFilter('purchase')));
assert(matches({ ...pending, approvalStatus: 'Pending' }, panelApprovalFilter('pod')));
assert(matches({ ...pending, paymentStatus: 'Pending' }, panelApprovalFilter('balance')));
assert(!matches({ ...pending, paymentStatus: 'Pending', bankIntegration: { provider: 'ICICI_CIB' } }, panelApprovalFilter('balance')));
// Exercise the aggregation route with fake handlers/models, never a real DB.
let queryUser;
let childRequest;
const user = { id: 'staff', companyId: 'company', activeOperatingCompanyId: 'operating', modules: { 'Loading Info': grant('create', 'approve') } };
const model = { countDocuments: async filter => { assert.equal(filter.companyId, 'company'); assert.equal(filter.subCompanyId, 'operating'); return 2; } };
const deps2 = {
  NextRequest: Request, NextResponse: { json: (body, options) => Response.json(body, options) },
  withBranchAccess: fn => fn, pushIdentity: async () => user,
  companyScopeFilter: (identity, filter) => { queryUser = identity; return { ...filter, companyId: identity.companyId, subCompanyId: identity.activeOperatingCompanyId }; },
  buildPanelWorkSummaries,
};
for (const name of ['OrderPanel','VehicleNegotiation','PricingPanel','LoadingPanel','ConsignmentNote','PurchasePanel','AdvancePayment','POD','BalancePayment']) deps2[name] = model;
for (const name of ['vnnCreation','pricingCreation','loadingCreation','lrCreation','purchaseCreation','paymentOrPodCreation','balanceCreation']) deps2[name] = async req => { childRequest = req; return Response.json({ success: true, data: { count: 1 } }); };
const code = fs.readFileSync('src/app/api/notifications/panel-work/route.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
const get = new Function(...Object.keys(deps2), `${code}\nreturn GET;`)(...Object.values(deps2));
const response = await get(new Request('https://erp.example/api/notifications/panel-work', { headers: { Authorization: 'Bearer mock-only' } }));
const body = await response.json();
assert.equal(body.records[0].createCount, 1);
assert.equal(body.records[0].approvalCount, 2);
assert.equal(queryUser.id, 'staff');
assert.equal(childRequest.url, 'https://erp.example/api/loading-panel/reference-data?lookup=pendingCount');
assert.equal(childRequest.headers.get('authorization'), 'Bearer mock-only');
console.log('PASS: panel creation/approval counts, dedicated Pricing permissions, matching chip sources, draft/blocked/cancelled exclusions, partial failures, and no duplicate reapproval cards.');
