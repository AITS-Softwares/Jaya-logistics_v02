import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { isStagedLoading, newLoadingWorkflow, editableLoadingPart, filterLoadingFields, prepareLoadingEdit, loadingApprovalDecision, loadingWorkflowForReview } from '../src/lib/loadingApprovalWorkflow.mjs';
const record = { loadingWorkflow: newLoadingWorkflow(), vbpUploads: { approval: '' }, vftUploads: { approval: '' } };
assert.equal(editableLoadingPart(record), 1);
let saved = prepareLoadingEdit(record, { vehicleInfo: { vehicleNo: 'TEST' }, vlUploads: { vl1: 'early' }, panelStatus: 'Approved', reapprovalState: 'none', loadingWorkflow: { currentPart: 2 }, vbpUploads: { approval: 'Approved', vbp1: 'photo' } }, 'submit');
assert.equal(saved.vlUploads, undefined);
assert.equal(saved.vbpUploads.approval, '');
assert.equal(saved.loadingWorkflow.currentPart, 1);
Object.assign(record, saved);
assert.equal(editableLoadingPart(record), null);
assert.throws(() => prepareLoadingEdit(record, {}, 'submit'), /locked/);
let result = loadingApprovalDecision(record, { vbpApproval: 'Approved', vftApproval: 'Pending' }, 'approve', { id: 'approver' });
assert.equal(result.status, 'Submitted');
assert.equal(result.workflow.part2Status, 'Locked');
result = loadingApprovalDecision(record, { vbpApproval: 'Approved', vftApproval: 'Rejected' }, 'approve', { id: 'approver' });
assert.equal(result.status, 'Rejected');
result = loadingApprovalDecision(record, { vbpApproval: 'Approved', vftApproval: 'Approved' }, 'approve', { id: 'approver' });
assert.equal(result.final, false);
assert.equal(result.workflow.currentPart, 2);
record.loadingWorkflow = result.workflow;
assert.equal(editableLoadingPart(record), 2);
assert.throws(() => loadingApprovalDecision(record, {}, 'approve', {}), /Submit/);
saved = prepareLoadingEdit(record, { vehicleInfo: { vehicleNo: 'tamper' }, vbpUploads: { vbp1: 'tamper' }, vlUploads: { vl1: 'photo' } }, 'submit');
assert.equal(saved.vehicleInfo, undefined);
assert.equal(saved.vbpUploads, undefined);
Object.assign(record, saved);
result = loadingApprovalDecision(record, { vlApproval: 'Approved', votApproval: 'Approved', weighmentApproval: 'Approved' }, 'approve', { id: 'approver' });
assert.equal(result.final, true);
record.loadingWorkflow = result.workflow;
assert.equal(editableLoadingPart(record), null);
record.reapprovalState = 'unlocked';
assert.equal(editableLoadingPart(record), 1);
assert.equal(prepareLoadingEdit(record, {}, 'submit').loadingWorkflow.part2Status, 'Locked');
assert.equal(isStagedLoading({ panelStatus: 'Approved' }), false);
assert(!('loadedWeighment' in filterLoadingFields({ loadedWeighment: {}, vbpUploads: {} }, 1)));
// Run the actual PATCH handler with isolated auth/database dependencies.
const require = createRequire(import.meta.url);
const parser = require('next/dist/compiled/babel/parser');
const source = fs.readFileSync(new URL('../src/app/api/loading-panel/route.js', import.meta.url), 'utf8');
const ast = parser.parse(source, { sourceType: 'module' });
const handlerNode = ast.program.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'branchHandlerPATCH');
let current, revisions = 0, ready = 0, purchase = 0;
const deps = {
  connectDb: async () => {}, validateUser: async () => ({ user: { id: 'approver', companyId: 'company' } }),
  identifierFormatError: () => null, isValidObjectId: () => true,
  LoadingPanel: { findOne: async () => current }, companyScopeFilter: (u, f) => f,
  NextResponse: { json: (body, options = {}) => ({ ...body, status: options.status || 200 }) },
  assertSourcesCurrent: async () => {}, isStagedLoading, loadingApprovalDecision, loadingWorkflowForReview,
  recordApprovedRevision: async () => { revisions++; }, notifyModuleDecision: async () => {},
  notifyConsignmentNoteTeamLoadingInfoReady: async () => { ready++; },
  notifyModuleCreateUsers: async () => { purchase++; }, num: value => Number(value) || 0,
};
const patch = new Function(...Object.keys(deps), source.slice(handlerNode.start, handlerNode.end) + '\nreturn branchHandlerPATCH;')(...Object.values(deps));
const req = fields => ({ json: async () => ({ id: 'record', action: 'approve', ...fields }) });
current = { _id: 'record', loadingWorkflow: newLoadingWorkflow(true), panelStatus: 'Submitted', isDraft: false, vbpUploads: {}, vftUploads: {}, save: async () => {} };
let response = await patch(req({ vbpApproval: 'Approved', vftApproval: 'Approved', vlApproval: 'Approved' }));
assert.equal(response.success, true);
assert.equal(current.panelStatus, 'Draft');
assert.equal(current.loadingWorkflow.currentPart, 2);
assert.equal(current.vlUploads, undefined);
assert.equal(revisions, 0); assert.equal(ready, 0); assert.equal(purchase, 0);
response = await patch(req({}));
assert.equal(response.status, 400);
Object.assign(current, prepareLoadingEdit(current, { vlUploads: {}, votUploads: {}, loadedWeighment: {} }, 'submit'));
response = await patch(req({ vlApproval: 'Rejected', votApproval: 'Approved', weighmentApproval: 'Approved', vbpApproval: 'Rejected' }));
assert.equal(response.success, true);
assert.equal(current.loadingWorkflow.part2Status, 'Rejected');
assert.equal(current.vbpUploads.approval, 'Approved');
assert.equal(revisions, 0);
Object.assign(current, prepareLoadingEdit(current, { vlUploads: {}, votUploads: {}, loadedWeighment: {} }, 'submit'));
response = await patch(req({ vlApproval: 'Approved', votApproval: 'Approved', weighmentApproval: 'Approved' }));
assert.equal(response.success, true);
assert.equal(current.panelStatus, 'Approved');
assert.equal(revisions, 1); assert.equal(ready, 1); assert.equal(purchase, 1);
console.log('PASS: staged edits, locked fields, approval handoffs, rejection, correction reopening, and final-only downstream processing.');

assert.equal(loadingWorkflowForReview({ panelStatus: 'Draft', isDraft: true }).part1Status, 'Draft');
assert.equal(loadingWorkflowForReview({ panelStatus: 'Submitted' }).part1Status, 'Submitted');
assert.equal(loadingWorkflowForReview({ panelStatus: 'Approved' }), undefined);
assert.equal(loadingWorkflowForReview({ panelStatus: 'Approved', reapprovalState: 'unlocked' }).part1Status, 'Draft');
assert.equal(loadingWorkflowForReview({ loadingWorkflow: result.workflow, reapprovalState: 'pendingReapproval' }).part1Status, 'Submitted');
console.log('PASS: unfinished legacy records and upstream reapproval use two stages; settled approvals are preserved.');
