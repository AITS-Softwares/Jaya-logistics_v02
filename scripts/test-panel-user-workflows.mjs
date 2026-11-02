import assert from 'node:assert/strict';
import { makeHarness, panels, plain } from './workflow-role-harness.mjs';
const h = makeHarness(), { env, users, admin, request, fixtures } = h;
Object.assign(env, h.compile('src/lib/vehicleNegotiationWorkflow.js', ['isVnnReadyForDownstream', 'getFinalVnnStatus', 'getVnnListStatus', 'withVnnDisplayData']));
Object.assign(env, h.compile('src/lib/reapprovalService.js', ['withApprovedVnnLocationRemarks']));
Object.assign(env, h.compile('src/lib/deletion/linkGraph.js', ['TYPES', 'resolveDeleteGraph', 'deletionBlockers']));
Object.assign(env, h.compile('src/lib/cancelOrder.js', ['cancelOrder']));
const correction = h.compile('src/app/api/reapproval/[type]/[id]/route.js', ['POST']);
const routes = Object.fromEntries(panels.map(([type, , , path]) => [type, h.compile(`src/app/api/${path}/route.js`, ['PUT', 'PATCH'])]));
const callUnlock = (type, actor, action, reason = 'Correct customer instruction') => correction.POST(request(actor, { action, reason }), { params: Promise.resolve({ type, id: fixtures[type]._id }) });
const expectStatus = (response, expected, label) => assert.equal(response.status, expected, `${label}: ${JSON.stringify(response)}`);
let decisions = 0;
for (const [type, module] of panels) {
  h.reset();
  const roles = users[type];
  // Each account has exactly one action plus view; no shared edit/approve grant.
  assert.notEqual(roles.creator.id, roles.editor.id); assert.notEqual(roles.editor.id, roles.approver.id);
  const input = { id: fixtures[type]._id, action: 'approve', header: { date: '2026-11-02' } };
  for (const [otherType] of panels) {
    for (const role of ['creator', 'editor', 'approver', 'viewer']) {
      const actor = users[otherType][role];
      if (otherType !== type || role !== 'editor') {
        const response = await routes[type].PUT(request(actor, input));
        expectStatus(response, 403, `${type} edit denied to ${otherType}/${role}`); decisions++;
      }
      if (otherType !== type || role !== 'approver') {
        const response = await routes[type].PATCH(request(actor, { id: fixtures[type]._id, action: 'approve' }));
        expectStatus(response, 403, `${type} approval denied to ${otherType}/${role}`); decisions++;
      }
    }
  }
  expectStatus(await callUnlock(type, roles.creator, 'requestUnlock'), 403, `${type} creator cannot request edit unlock`);
  expectStatus(await callUnlock(type, roles.editor, 'unlock'), 403, `${type} editor cannot unlock directly`);
  for (const [otherType] of panels.filter(panel => panel[0] !== type)) expectStatus(await callUnlock(type, users[otherType].approver, 'unlock'), 403, `${otherType} approver cannot unlock ${type}`);
  expectStatus(await callUnlock(type, roles.editor, 'requestUnlock'), 200, `${type} editor requests unlock`);
  assert.equal(fixtures[type].panelStatus, 'Approved', 'Request alone preserves approval');
  const requestNotices = h.notifications.filter(notice => notice.type === 'correction-unlock-request');
  assert(requestNotices.some(notice => notice.assignedTo === roles.approver.id), `${type} request reaches its dedicated approver`);
  assert(requestNotices.some(notice => notice.assignedTo === admin.id), `${type} request reaches admin`);
  assert(!requestNotices.some(notice => notice.assignedTo === roles.creator.id || notice.assignedTo === roles.editor.id), 'Editor/creator are not approval recipients');
  expectStatus(await callUnlock(type, roles.approver, 'rejectUnlock', 'Return with a clearer reason'), 200, `${type} own approver rejects unlock`);
  assert(h.notifications.some(notice => notice.type === 'correction-unlock-rejected' && notice.assignedTo === roles.editor.id), `${type} rejected unlock returns to the requesting editor's team`);
  expectStatus(await callUnlock(type, roles.editor, 'requestUnlock'), 200, `${type} editor requests again`);
  expectStatus(await callUnlock(type, roles.approver, 'unlock'), 200, `${type} own approver unlocks`);
  assert.equal(fixtures[type].reapprovalState, 'unlocked'); assert(fixtures[type].approvedSnapshot);
  expectStatus(await routes[type].PATCH(request(roles.approver, { id: fixtures[type]._id, action: 'approve' })), 409, `${type} approver cannot approve unsubmitted correction`);
  if (type === 'pricing') expectStatus(await routes[type].PATCH(request(roles.approver, { id: fixtures[type]._id, action: 'amend-part2' })), 409, 'Pricing approver cannot bypass editor submission by reopening Part 2');
  expectStatus(await callUnlock(type, roles.editor, 'cancel'), 403, `${type} editor cannot restore approved version`);
  expectStatus(await callUnlock(type, roles.approver, 'cancel'), 200, `${type} own approver restores unlock`);
  assert.equal(fixtures[type].reapprovalState, 'none');
  assert.notEqual(fixtures[type].unlockRequest?.status, 'pending', 'Restoring a correction must not revive an already-decided unlock request');
  h.reset();
  expectStatus(await callUnlock(type, admin, 'unlock'), 200, `${type} admin can unlock directly without an editor request`);
  expectStatus(await callUnlock(type, admin, 'cancel'), 200, `${type} admin can restore the approved version`);
}
console.log(`PASS: ${decisions} edit/approve isolation checks across five panels; distinct creator/editor/approver accounts, cross-panel denials, dedicated Pricing approval, unlock request recipients, rejection, unlock and restore.`);

// Exercise correction draft-save → resubmit with edit-only accounts, never create/approve rights.
for (const [type] of panels) {
  h.reset(); const roles = users[type], doc = fixtures[type];
  expectStatus(await callUnlock(type, roles.editor, 'requestUnlock'), 200, `${type} correction requested`);
  expectStatus(await callUnlock(type, roles.approver, 'unlock'), 200, `${type} correction unlocked`);
  const draft = type === 'vnn' ? { id: doc._id, negotiation: { remarks1: 'Editor correction' } } : { id: doc._id, saveMode: 'draft' };
  expectStatus(await routes[type].PUT(request(roles.editor, draft)), 200, `${type} edit-only saves correction draft`);
  const submit = type === 'vnn' ? { id: doc._id, negotiation: { remarks1: 'Editor correction' }, submitVnn: true } : { id: doc._id, saveMode: 'submit' };
  // The optional-photo source exception removes unrelated upload prerequisites here.
  h.tables.OrderPanel[0].loadingInfoPhotosOptional = true;
  expectStatus(await routes[type].PUT(request(roles.editor, submit)), 200, `${type} edit-only resubmits correction`);
  assert.equal(doc.reapprovalState, 'pendingApproval', `${type} submitted correction hands off to approver`);
  const notices = h.notifications.filter(notice => notice.type.startsWith('approval-request:'));
  assert(notices.some(notice => notice.assignedTo === roles.approver.id), `${type} resubmission reaches its approver`);
  assert(!notices.some(notice => notice.assignedTo === roles.editor.id), `${type} edit-only does not receive approval work`);
  expectStatus(await routes[type].PATCH(request(roles.approver, { id: doc._id, action: 'reject', remarks: 'Please correct the details', approvalData: { remarks: 'Please correct the details' } })), 200, `${type} approver returns correction`);
  assert.equal(doc.reapprovalState, 'unlocked', `${type} rejection returns work to editor`);
  assert(h.notifications.some(notice => notice.type === `workflow-decision:reject:${(type === 'pricing' ? 'Pricing Panel' : panels.find(panel => panel[0] === type)[1]).toLowerCase().replace(/[^a-z0-9]+/g, '-')}` && notice.assignedTo === roles.editor.id), `${type} rejection notifies its editor, distinct from creator`);
  if (type === 'vnn') {
    const workflow = h.compile('src/app/api/vehicle-negotiation/[id]/workflow/route.js', ['PATCH']);
    expectStatus(await workflow.PATCH(request(roles.editor, { action: 'amend-part1', reason: 'Fix rejected correction' }), { params: Promise.resolve({ id: doc._id }) }), 200, 'VNN editor opens returned amendment without another unlock');
  }
  expectStatus(await routes[type].PUT(request(roles.editor, draft)), 200, `${type} editor saves returned correction`);
  expectStatus(await routes[type].PUT(request(roles.editor, submit)), 200, `${type} editor resubmits returned correction`);
  expectStatus(await routes[type].PATCH(request(roles.approver, { id: doc._id, action: 'approve' })), 200, `${type} matching approver approves correction`);
  if (type === 'loading') {
    assert.equal(doc.loadingWorkflow.currentPart, 2); assert.equal(doc.loadingWorkflow.part2Status, 'Draft');
    assert(h.notifications.some(notice => notice.type === 'loading-part2-edit-required' && notice.assignedTo === roles.editor.id), 'Part 1 approver hands Part 2 to a different editor');
    expectStatus(await routes[type].PUT(request(roles.editor, { id: doc._id, saveMode: 'draft' })), 200, 'Loading editor saves Part 2');
    expectStatus(await routes[type].PUT(request(roles.editor, { id: doc._id, saveMode: 'submit' })), 200, 'Loading editor submits Part 2');
    expectStatus(await routes[type].PATCH(request(roles.approver, { id: doc._id, action: 'approve' })), 200, 'Loading approver approves Part 2');
  }
  assert.equal(doc.reapprovalState, 'none', `${type} successful reapproval clears correction state`);
}
console.log('PASS: separate edit-only users save and resubmit correction drafts across all panels; approval notifications reach the matching approver.');

for (const [type] of panels) {
  h.reset(); const doc = fixtures[type];
  doc.reapprovalState = 'none'; doc.approvedSnapshot = null; doc.approvedRevision = 0; doc.panelStatus = 'Draft'; doc.isDraft = true;
  doc.header.status = 'Draft'; doc.workflow.part1Locked = false; doc.approval.part3Status = 'Pending';
  doc.rateApproval.approvedRevision = 0; doc.rateApproval.approvalStatus = 'Pending'; doc.rateApproval.workflowPhase = 'part1';
  doc.loadingWorkflow = env.newLoadingWorkflow();
  const body = type === 'vnn' ? { id: doc._id, negotiation: { remarks1: 'Editor completes creator draft' }, submitVnn: true } : { id: doc._id, saveMode: 'submit' };
  expectStatus(await routes[type].PUT(request(users[type].editor, body)), 200, `${type} edit-only user submits a draft created by a different creator`);
}
console.log('PASS: edit-only users can submit existing first-approval drafts without create permission; create-only users remain unable to edit existing documents.');

h.reset(); h.tables.ConsignmentNote = [];
const lrCreate = h.compile('src/app/api/consignment-note/route.js', ['POST'], { getNextLRNumber: async () => 'LR-NEW', ...h.compile('src/lib/orderRowStatus.js', ['validateOpenOrderRows']), ...h.compile('src/lib/saveNumberedDocument.js', ['saveNumberedDocument']) });
expectStatus(await lrCreate.POST(request(users.lr.creator, { loadingInfoNo: fixtures.loading.vehicleArrivalNo, header: { orderNo: fixtures.order.orderPanelNo, status: 'Approved' } })), 201, 'LR creator submits a new LR');
assert.equal(h.tables.ConsignmentNote[0].header.status, 'Pending', 'Create-only user cannot inject Approved status into a new LR');
console.log('PASS: LR creator cannot bypass the separate approver with a forged creation status.');
