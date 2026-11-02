import assert from 'node:assert/strict';
import { makeHarness, plain } from './workflow-role-harness.mjs';
const h = makeHarness(), { env, fixtures, users, request } = h;
Object.assign(env, h.compile('src/lib/deletion/linkGraph.js', ['TYPES', 'resolveDeleteGraph', 'deletionBlockers']));
Object.assign(env, h.compile('src/lib/reapprovalService.js', ['findLatestApprovedVnnForLoading', 'reconcileDetachedLoadingOrderMarkers', 'assertSourcesCurrent', 'mirroredProjection', 'applyMirroredFields', 'summarizeApprovedChanges', 'findDetachedLoadingOrderMarkers']));
Object.assign(env, h.compile('src/lib/reapprovalReviewVisibility.mjs', ['hasReapprovalReview']));
const api = h.compile('src/app/api/reapproval/[type]/[id]/route.js', ['POST', 'GET']);
const loading = h.compile('src/app/api/loading-panel/route.js', ['PUT', 'PATCH']);
function stale() {
  h.reset();
  fixtures.vnn.approvedRevision = 5;
  fixtures.vnn.approval.vehicleNo = fixtures.loading.vehicleInfo.vehicleNo;
  fixtures.vnn.approval.vendorName = 'Sri Murugan Roadways-GDM';
  fixtures.vnn.approval.mobile = '5978648845';
  fixtures.loading.vehicleInfo.vehicleOwnerName = fixtures.vnn.approval.vendorName;
  fixtures.loading.vehicleInfo.driverMobileNo = fixtures.vnn.approval.mobile;
  fixtures.loading.sourceDependencies = [{ panel: 'vnn', recordId: fixtures.vnn._id, recordNo: fixtures.vnn.vnnNo, revision: 4 }];
  fixtures.loading.reapprovalState = 'pendingApproval';
  fixtures.loading.loadingWorkflow = env.newLoadingWorkflow(true);
  fixtures.loading.panelStatus = 'Submitted';
}
stale();
const preview = plain(fixtures.loading);
env.applyMirroredFields('vnn', fixtures.vnn, preview);
assert.deepEqual(env.mirroredProjection('loading', preview), env.mirroredProjection('loading', fixtures.loading), 'Reproduce identical displayed data with only a stale source revision');
await assert.rejects(env.assertSourcesCurrent(fixtures.loading, h.tenant), /linked vnn data changed/);
const resolution = await env.findLatestApprovedVnnForLoading(fixtures.loading, h.tenant);
assert.equal(resolution.required, true, 'Sync action must appear even when displayed fields already match');
assert.equal(resolution.savedVnnRevision, 4); assert.equal(resolution.candidate.approvedRevision, 5);
const banner = await api.GET(request(users.loading.approver), { params: Promise.resolve({ type: 'loading', id: fixtures.loading._id }) });
assert.equal(banner.status, 200, JSON.stringify(banner));
assert.equal(banner.record.latestVnnSync.required, true); assert.equal(banner.record.canReconcileDetachedOrders, true, 'Approval banner exposes its existing Sync action');
const sync = actor => api.POST(request(actor, { action: 'reconcileDetachedOrders' }), { params: Promise.resolve({ type: 'loading', id: fixtures.loading._id }) });
for (const actor of [users.loading.creator, users.loading.viewer, users.order.approver, users.vnn.approver]) assert.equal((await sync(actor)).status, 403);
for (const actor of [users.loading.editor, users.loading.approver, h.admin]) {
  stale();
  // Stale upstream data invalidates Part 1 even if Part 2 had already been submitted.
  fixtures.loading.loadingWorkflow = { version: 2, currentPart: 2, part1Status: 'Approved', part2Status: 'Submitted' };
  const response = await sync(actor);
  assert.equal(response.status, 200, JSON.stringify(response));
  assert.equal(fixtures.loading.sourceDependencies.find(source => source.panel === 'vnn').revision, 5);
  assert.equal(fixtures.loading.loadingWorkflow.currentPart, 1);
  assert.equal(fixtures.loading.loadingWorkflow.part1Status, 'Submitted');
  assert.equal(fixtures.loading.loadingWorkflow.part2Status, 'Locked');
  assert.equal(fixtures.loading.vehicleInfo.vehicleOwnerName, 'Sri Murugan Roadways-GDM');
  assert.equal(fixtures.loading.vlUploads.vl1, '/saved-vl-1.jpg', 'Existing loading photos remain intact');
  assert.equal(await env.assertSourcesCurrent(fixtures.loading, h.tenant), true, 'Approval no longer hits the stale VNN guard after sync');
  assert.equal((await env.findLatestApprovedVnnForLoading(fixtures.loading, h.tenant)).required, false);
  const part1 = await loading.PATCH(request(users.loading.approver, { id: fixtures.loading._id, action: 'approve' }));
  assert.equal(part1.status, 200, JSON.stringify(part1));
  const part2 = await loading.PUT(request(users.loading.editor, { id: fixtures.loading._id, saveMode: 'submit' }));
  assert.equal(part2.status, 200, JSON.stringify(part2));
  const approved = await loading.PATCH(request(users.loading.approver, { id: fixtures.loading._id, action: 'approve' }));
  assert.equal(approved.status, 200, JSON.stringify(approved));
  assert.equal(fixtures.loading.loadingWorkflow.part2Status, 'Approved');
}
console.log('PASS: identical-field stale VNN revision exposes in-app recovery; Loading editor/approver/admin can sync, unrelated users cannot; revision refreshed, Part 1 review restarted and photos preserved.');
