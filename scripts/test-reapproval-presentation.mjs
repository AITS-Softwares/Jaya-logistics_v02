import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { hasPriorApproval, panelApprovalStatus, reviewDisplayState, upstreamDisplayState, approvalLabelForRecord } from '../src/lib/reapprovalPresentation.mjs';
import { loadingWorkflowForReview, newLoadingWorkflow } from '../src/lib/loadingApprovalWorkflow.mjs';
import { hasReapprovalReview } from '../src/lib/reapprovalReviewVisibility.mjs';
const cases = [
  ['order', { status: 'Submitted' }],
  ['vnn', { panelStatus: 'Submitted', approval: { part1Status: 'Approved', part3Status: 'Pending' } }],
  ['pricing', { panelStatus: 'Submitted', rateApproval: { workflowPhase: 'part1', approvalStatus: 'Approved' } }],
  ['loading', { panelStatus: 'Submitted', loadingWorkflow: newLoadingWorkflow(true) }],
  ['lr', { header: { status: 'Pending' } }],
];
for (const [type, record] of cases) {
  assert.equal(hasPriorApproval(record), false);
  const status = panelApprovalStatus(type, record);
  assert(!['Approved', 'Completed'].includes(status), type + ' initial review must not be approved');
  const initial = { ...record, status, reapprovalState: 'pendingReapproval', previouslyApproved: false };
  assert.equal(reviewDisplayState(initial), 'pendingApproval');
  assert(!/reapproval/i.test(approvalLabelForRecord(initial)), type + ' first review must not say reapproval');
  assert.equal(hasReapprovalReview(record, 'pendingReapproval'), false);
  assert.equal(reviewDisplayState({ ...initial, previouslyApproved: true }), 'pendingReapproval');
  assert.equal(upstreamDisplayState(type, { ...record, reapprovalState: 'none' }), 'pendingApproval');
}
assert.equal(upstreamDisplayState('order', { status: 'Draft', reapprovalState: 'none' }), 'draft');
assert.equal(upstreamDisplayState('order', null), 'unknown');
assert.equal(upstreamDisplayState('vnn', { panelStatus: 'Approved', approval: { part3Status: 'Pending' } }), 'pendingApproval');
assert.equal(panelApprovalStatus('vnn', { panelStatus: 'Draft', approval: { part3Status: 'Approved' } }), 'Draft');
assert.equal(panelApprovalStatus('pricing', { isDraft: true, rateApproval: { approvalStatus: 'Approved' } }), 'Draft');
assert.equal(approvalLabelForRecord({ status: 'Cancelled', reapprovalState: 'none' }), null);
assert.equal(approvalLabelForRecord({ status: 'Submitted', reapprovalState: 'blockedByUpstream', previouslyApproved: false }), 'Waiting for upstream review');
const parser = createRequire(import.meta.url)('next/dist/compiled/babel/parser');
const source = fs.readFileSync(new URL('../src/app/api/reapproval/[type]/[id]/route.js', import.meta.url), 'utf8');
const ast = parser.parse(source, { sourceType: 'module' });
const node = ast.program.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'branchHandlerGET');
let root;
const deps = {
  hasPriorApproval, panelApprovalStatus, reviewDisplayState, upstreamDisplayState,
  loadingWorkflowForReview, hasReapprovalReview,
  connectDb: async () => {}, authorized: () => ({ user: { companyId: 'company' } }),
  userIsAdmin: () => false, canUnlockForCorrection: () => true, mongoose: { isValidObjectId: () => true },
  MODULES: Object.fromEntries(cases.map(([type]) => [type, type])),
  TYPES: Object.fromEntries(cases.map(([type]) => [type, { Model: { findOne: () => ({ lean: async () => root }) } }])),
  NextResponse: { json: body => body },
  resolveReapprovalGraph: async () => [], reapprovalAffectedGraph: (type, graph) => graph,
  withApprovedVnnLocationRemarks: async record => record,
  summarizeApprovedChanges: () => [], findDetachedVnnOrderMarkers: () => [], findDetachedLoadingOrderMarkers: async () => [],
  findLatestApprovedVnnForLoading: async () => ({ required: false, ambiguous: false }),
  recordNumber: () => 'TEST', allBlockers: async () => [],
};
const get = new Function(...Object.keys(deps), source.slice(node.start, node.end) + '\nreturn branchHandlerGET;')(...Object.values(deps));
for (const [type, record] of cases) {
  root = { _id: 'record', ...record, reapprovalState: 'pendingReapproval', pendingChanges: [{ field: 'Stale item', oldValue: 'a', newValue: 'b' }] };
  const result = await get({}, { params: Promise.resolve({ type, id: 'record' }) });
  assert.equal(result.success, true);
  assert.equal(result.record.previouslyApproved, false);
  assert.equal(result.record.reapprovalState, 'pendingApproval');
  assert(!['Approved', 'Completed'].includes(result.record.status));
  assert.equal(result.record.hasReviewableChanges, false);
  assert.deepEqual(result.record.pendingChanges, []);
}
console.log('PASS: all five panels distinguish first approval, correction, drafts, upstream waiting, stale decisions, and actual prior approvals.');
