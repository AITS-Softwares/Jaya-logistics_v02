import assert from 'node:assert/strict';
import fs from 'node:fs';
import { panelApprovalStatus } from '../src/lib/reapprovalPresentation.mjs';
let panels = [];
const deps = { PricingPanel: { find: () => ({ lean: async () => panels }) }, companyScopeFilter: (user, query) => query, panelApprovalStatus };
const source = fs.readFileSync('src/lib/lrPricingEligibility.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
const { approvedPricingForLr, filterLrEligibleLoading } = new Function(...Object.keys(deps), `${source}\nreturn { approvedPricingForLr, filterLrEligibleLoading };`)(...Object.values(deps));
const approved = { panelStatus: 'Approved', rateApproval: { approvalStatus: 'Approved', workflowPhase: 'complete' }, orders: [{ orderNo: 'OP-1', orderRowId: 'row' }] };
const loading = [{ panelStatus: 'Approved', loadingWorkflow: { version: 2, part2Status: 'Approved' }, orderRows: [{ orderNo: 'OP-1', orderRowId: 'row' }] }];
for (const change of [null, { rateApproval: { approvalStatus: 'Pending' } }, { reapprovalState: 'unlocked' }, { upstreamPending: [{}] }, { cancellation: { state: 'cancelled' } }, { isDraft: true }, { rateApproval: { approvalStatus: 'Approved', workflowPhase: 'part2' } }]) {
  panels = change === null ? [] : [{ ...approved, ...change }];
  assert.equal(await approvedPricingForLr({}, 'OP-1', 'row'), false);
  assert.equal((await filterLrEligibleLoading({}, loading)).length, 0);
}
panels = [approved]; assert.equal(await approvedPricingForLr({}, 'OP-1', 'row'), true); assert.equal((await filterLrEligibleLoading({}, loading)).length, 1);
assert.equal((await filterLrEligibleLoading({}, [{ ...loading[0], cancellation: { state: 'review' } }])).length, 0);
assert.equal((await filterLrEligibleLoading({}, [{ ...loading[0], loadingWorkflow: { version: 2, part2Status: 'Submitted' } }])).length, 0);
panels = [approved, { ...approved, reapprovalState: 'pendingApproval' }]; assert.equal(await approvedPricingForLr({}, 'OP-1', 'row'), false);
console.log('PASS: Pricing approval required for picker and server eligibility; missing, draft, cancelled, correction, upstream and unfinished approval cases excluded; Loading Part 2 preserved.');
