import assert from 'node:assert/strict';
import fs from 'node:fs';
import mongoose from 'mongoose';
import * as policy from '../src/lib/masterApprovalPolicy.mjs';
import * as slabs from '../src/lib/rateSlabValidation.mjs';
const business = file => fs.readFileSync(file, 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/^export (default )?/gm, '');
const { addMasterApprovalFields } = new Function('mongoose', business('src/lib/masterApprovalSchema.js') + '\nreturn { addMasterApprovalFields };')(mongoose);
const Model = new Function('mongoose', 'addMasterApprovalFields', business('src/app/api/rate-master/schema.js') + '\nreturn RateMaster;')(mongoose, addMasterApprovalFields);
let current;
Model.findOneAndUpdate = async (filter, update) => {
  assert.equal(String(filter._id), String(current._id));
  assert.equal(filter.approvalVersion, current.approvalVersion);
  const next = new Model(current.toObject());
  for (const [key, value] of Object.entries(update.$set || {})) next.set(key, value);
  for (const [key, value] of Object.entries(update.$inc || {})) next.set(key, (next.get(key) || 0) + value);
  const log = update.$push?.approvalLog;
  if (log) next.approvalLog.push(...(log.$each || [log]));
  await next.validate(); current = next; return current;
};
const deps = { ...policy, ...slabs, mongoose: { ...mongoose, startSession: async () => ({ withTransaction: work => work(), endSession: async () => {} }) } };
const { submitMasterChange } = new Function(...Object.keys(deps), business('src/lib/masterApprovalService.js') + '\nreturn { submitMasterChange };')(...Object.values(deps));
const editor = { type: 'user', id: String(new mongoose.Types.ObjectId()) };
const admin = { type: 'company', id: String(new mongoose.Types.ObjectId()) };
function reset() {
  current = new Model({ companyId: new mongoose.Types.ObjectId(), title: 'MUM SQM SALES', customerId: new mongoose.Types.ObjectId(), branchId: new mongoose.Types.ObjectId(), usageMode: 'standard', weightRule: 'all_weights', approvalOption: 'contract_rate', approvalStatus: 'Approved', approvalVersion: 1, createdAt: new Date(1), updatedAt: new Date(1),
    approvalFile: { fileName: 'contract.pdf', filePath: '/uploads/contract.pdf' },
    locationRates: [{ locationId: new mongoose.Types.ObjectId(), fromQty: 0, toQty: 5, rate: 100 }],
  });
}
try {
  for (const user of [editor, admin]) {
    reset();
    assert.equal(policy.equivalent(current.locationRates, current.toObject().locationRates), true, 'Hydrated slabs compare to plain slabs without following parent references');
    assert.equal(policy.equivalent(current.approvalFile, current.toObject().approvalFile), true);
    const oldSlabs = current.toObject().locationRates;
    const result = await submitMasterChange({ Model, record: current, user, kind: 'rate', onApprove: async () => {}, input: { title: 'Updated title', locationRates: current.locationRates, approvalFile: current.approvalFile } });
    assert.equal(result.title, 'Updated title'); assert.equal(result.pendingChange, null);
    assert.deepEqual(result.toObject().locationRates, oldSlabs, 'Basic edit retains every slab and its ID');
    assert.equal(result.approvalFile.filePath, '/uploads/contract.pdf');
  }
  reset();
  const proposed = new Model(current.toObject()); proposed.locationRates[0].rate = 125;
  assert.equal(policy.equivalent(proposed.locationRates, current.locationRates), false);
  const result = await submitMasterChange({ Model, record: current, user: editor, kind: 'rate', input: { locationRates: proposed.locationRates, approvalFile: current.approvalFile } });
  assert.equal(result.locationRates[0].rate, 100, 'Editor changes remain a proposal');
  assert.equal(result.pendingChange.data.locationRates[0].rate, 125);
  assert.doesNotThrow(() => JSON.stringify(result.toObject()), 'Proposal is serializable');
  assert.throws(() => policy.reviewUpdate(result.toObject(), editor, 'approve', result.pendingChange.revisionId), /own submission/);
  const accepted = policy.reviewUpdate(result.toObject(), admin, 'approve', result.pendingChange.revisionId);
  assert.equal(accepted.$set.locationRates[0].rate, 125);
  console.log('PASS: actual Rate Master schema reproducer; hydrated slab/contract comparison, editor/admin basic edits, preserved slab IDs, serializable proposals and separate approver review. No database connection made.');
} finally { mongoose.deleteModel(Model.modelName); }
