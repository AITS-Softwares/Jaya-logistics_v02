import assert from 'node:assert/strict';
import { makeHarness } from './workflow-role-harness.mjs';
const h = makeHarness();
Object.assign(h.env, h.compile('src/lib/vehicleNegotiationWorkflow.js', ['isVnnReadyForDownstream', 'getFinalVnnStatus', 'getVnnListStatus', 'withVnnDisplayData']));
Object.assign(h.env, h.compile('src/lib/reapprovalService.js', ['withApprovedVnnLocationRemarks']));
Object.assign(h.env, h.compile('src/lib/deletion/linkGraph.js', ['TYPES', 'resolveDeleteGraph', 'deletionBlockers']));
const route = h.compile('src/app/api/vehicle-negotiation/route.js', ['PUT', 'PATCH']);
const unlock = h.compile('src/app/api/reapproval/[type]/[id]/route.js', ['POST']);
const doc = h.fixtures.vnn, roles = h.users.vnn;
const check = (res, status) => assert.equal(res.status, status, JSON.stringify(res));
doc.approval.vehicleNo = 'MH01AB1234';
doc.approval.mobile = '9876543210';
check(await unlock.POST(h.request(h.admin, { action: 'unlock', reason: 'Correct negotiation terms' }), {params: Promise.resolve({type:'vnn', id:doc._id})}), 200);
// A correction must also recover a stale Part 1 lock without opening placement.
doc.workflow.part1Locked = true;
check(await route.PUT(h.request(roles.editor, {
  id:doc._id, negotiation:{remarks1:'Corrected negotiation'},
  approval:{commercialRemarks:'Corrected terms',vehicleNo:'FORGED',mobile:'1234567890'}
})), 200);
assert.equal(doc.negotiation.remarks1, 'Corrected negotiation');
assert.equal(doc.approval.commercialRemarks, 'Corrected terms');
assert.equal(doc.approval.vehicleNo, 'MH01AB1234');
assert.equal(doc.approval.mobile, '9876543210');
assert.equal(doc.workflow.part1Locked, false);
assert.equal(doc.approval.part1Status, 'Pending');
assert.equal(doc.approval.part3Status, 'Pending');
check(await route.PUT(h.request(roles.editor, {id:doc._id,negotiation:{remarks1:"Corrected negotiation"},submitVnn:true})), 200);
assert.equal(doc.reapprovalState,'pendingApproval');
assert.equal(doc.workflow.part1Locked,true);
check(await route.PATCH(h.request(roles.approver,{id:doc._id,action:'approve'})),200);
assert.equal(doc.approval.part1Status,'Approved');
assert.equal(doc.approval.part3Status,'Approved');
assert.equal(doc.approval.vehicleNo,'MH01AB1234');
assert.equal(doc.approval.mobile,'9876543210');
console.log('PASS: combined VNN correction, submission and approval preserve separate vehicle placement fields.');

