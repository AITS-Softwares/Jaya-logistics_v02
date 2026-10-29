import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { branchModels, makeOwnershipResolver, canAccessBranches, hasInaccessibleDependent } from '../src/lib/branchOwnership.mjs';
import { branchContext, branchDenied } from '../src/lib/branchContext.js';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const swc = await require('next/dist/build/swc').loadBindings();
const ownershipModule = await import('../src/lib/branchOwnership.mjs');
const branches = [{ _id: 'a', name: 'Gandhidham', code: 'GDM' }, { _id: 'b', name: 'Chennai', code: 'CHE' }];
const records = {
  OrderPanel: [{ _id: 'order-a', orderPanelNo: 'OP-A', branchCode: 'GDM' }, { _id: 'order-b', orderPanelNo: 'OP-B', branch: 'b' }],
  VehicleNegotiation: [{ _id: 'vnn-a', vnnNo: 'VNN-A', branch: 'b', orders: [{ orderNo: 'OP-A' }] }, { _id: 'mixed', vnnNo: 'MIXED', orders: [{ orderNo: 'OP-A' }, { orderNo: 'OP-B' }] }],
  PricingPanel: [{ _id: 'pricing-a', orders: [{ vehicleNegotiationId: 'vnn-a' }] }],
  LoadingPanel: [{ _id: 'load-a', vehicleArrivalNo: 'LD-A', vehicleNegotiationNo: 'VNN-A' }],
  PurchasePanel: [{ _id: 'purchase-a', purchaseNo: 'PUR-A', loadingInfoNo: 'LD-A' }],
  AdvancePayment: [{ _id: 'advance-a', purchaseNo: 'PUR-A' }],
  ConsignmentNote: [{ _id: 'lr-a', lrNo: 'LR-A', loadingInfoNo: 'LD-A', header: { orderNo: 'OP-A' } }],
  POD: [{ _id: 'pod-a', podNo: 'POD-A', purchaseNo: 'PUR-A', lrEntries: [{ lrNo: 'LR-A' }] }],
  BalancePayment: [{ _id: 'balance-a', podNo: 'POD-A' }],
  SavedReport: [{ _id: 'bill-a', data: [{ lrNo: 'LR-A' }] }],
  DriverTrip: [{ _id: 'trip-a', loadingId: 'load-a' }],
  TrackingSession: [{ _id: 'session-a', tripId: 'trip-a' }],
  LocationPoint: [{ _id: 'point-a', tripId: 'trip-a' }],
  StopEpisode: [{ _id: 'stop-a', tripId: 'trip-a' }],
};
const lookup = (model, id) => id ? (records[model] || []).find(doc => doc._id === id || doc[branchModels[model]?.number] === id) : undefined;
const resolve = makeOwnershipResolver({ lookup, branches });
const access = { accessAllBranches: false, branchIds: ['a'] };
for (const [model, docs] of Object.entries(records)) {
  assert.deepEqual(resolve(model, docs[0]), ['a'], model);
  assert(canAccessBranches(access, resolve(model, docs[0])), model);
}
assert(!canAccessBranches(access, resolve('OrderPanel', records.OrderPanel[1])));
assert(!canAccessBranches(access, resolve('VehicleNegotiation', records.VehicleNegotiation[1])));
assert(canAccessBranches({ accessAllBranches: false, branchIds: ['a', 'b'] }, resolve('VehicleNegotiation', records.VehicleNegotiation[1])));
assert.equal(resolve('LoadingPanel', { _id: 'unknown', branch: 'a', vehicleNegotiationNo: 'NOT-FOUND' }), null);
assert.equal(resolve('ConsignmentNote', { _id: 'forged', loadingInfoNo: 'LD-A', header: { orderNo: 'OP-B' } })?.length, 2);
assert.equal(resolve('SavedReport', { _id: 'forged-bill', data: [{ lrNo: 'LR-A' }, { lrNo: 'FOREIGN-LR' }] }), null);
assert(canAccessBranches({}, null), 'Legacy all-branch access remains available');

async function compile(path, mocks) {
  const { code } = await swc.transform(fs.readFileSync(path, 'utf8'), { filename: path, jsc: { parser: { syntax: 'ecmascript' } }, module: { type: 'commonjs' } });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    throw Error(`Unexpected dependency ${name}`);
  }, module, module.exports);
  return module.exports;
}
const plugin = (await compile('src/lib/branchScopePlugin.js', {
  './branchContext': { branchContext, branchDenied }, './branchOwnership.mjs': ownershipModule,
})).default;
const schema = new mongoose.Schema({ companyId: String, subCompanyId: String, branch: String, branchName: String, branchCode: String });
schema.plugin(plugin, { model: 'OrderPanel' });
const branchHooks = schema.s.hooks.clone();
const Model = mongoose.model('BranchAccessTestOrder', schema);
const id = new mongoose.Types.ObjectId();
const companyId = 'company';
const graph = {
  branches, lookup, resolve, rows: new Map(Object.entries(records)),
  remember: () => {},
};
const scope = {
  user: { companyId, activeOperatingCompanyId: 'op' }, access,
  load: async () => graph, filter: async () => ({ _id: { $in: [id] } }),
};
function pre(name, target, args = []) {
  return new Promise((done, fail) => branchHooks.execPre(name, target, args, error => error ? fail(error) : done()));
}
const originalIdentityFind = Model.find;
Model.find = function (...args) { const query = originalIdentityFind.apply(this, args); query.lean = async () => []; return query; };
for (const op of ['find', 'findOne', 'countDocuments', 'distinct', 'updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete']) {
  const query = op === 'distinct' ? Model.distinct('branch') : Model[op]({ _id: new mongoose.Types.ObjectId() }, ...(/update/i.test(op) ? [{ $set: { status: 'Approved' } }] : []));
  await branchContext.run(scope, () => pre(op, query));
  assert.deepEqual(query.getFilter().$and[1], { _id: { $in: [id] } }, `${op} must scope direct and bulk operations`);
}
Model.find = originalIdentityFind;
const aggregate = Model.aggregate([{ $group: { _id: null, count: { $sum: 1 } } }]);
await branchContext.run(scope, () => pre('aggregate', aggregate));
assert.deepEqual(aggregate.pipeline()[0], { $match: { _id: { $in: [id] } } });
const Joined = mongoose.model('VehicleNegotiation', new mongoose.Schema({}));
const joinedAggregate = Model.aggregate([{ $lookup: { from: Joined.collection.name, localField: '_id', foreignField: '_id', as: 'joined' } }, { $unionWith: Joined.collection.name }]);
await branchContext.run(scope, () => pre('aggregate', joinedAggregate));
assert.deepEqual(joinedAggregate.pipeline()[1].$lookup.pipeline[0], { $match: { _id: { $in: [id] } } });
assert.deepEqual(joinedAggregate.pipeline()[2].$unionWith.pipeline[0], { $match: { _id: { $in: [id] } } });
const forged = new Model({ companyId, subCompanyId: 'op', branch: 'b' });
await assert.rejects(branchContext.run(scope, () => pre('save', forged)), /Branch access denied/);
const permitted = new Model({ companyId, subCompanyId: 'op', branchCode: 'GDM' });
await branchContext.run(scope, () => pre('save', permitted));
assert.equal(permitted.branch, 'a');
assert.equal(permitted.branchName, 'Gandhidham');
await assert.rejects(branchContext.run(scope, () => pre('save', new Model({ companyId: 'foreign', branch: 'a' }))), /Branch access denied/);

// A scoped WHERE clause must not allow moving an accessible row into a denied
// branch. Exercise the actual query middleware's merged-document validation.
const savedOrder = { _id: id, companyId, subCompanyId: 'op', branch: 'a', branchCode: 'GDM' };
const savedFind = Model.find;
Model.find = () => ({ lean: async () => [savedOrder] });
const updateGraph = { ...graph, lookup: (name, value) => name === 'OrderPanel' && String(value) === String(id) ? savedOrder : lookup(name, value) };
updateGraph.resolve = makeOwnershipResolver(updateGraph);
const updateScope = { ...scope, load: async () => updateGraph };
await assert.rejects(branchContext.run(updateScope, () => pre('updateOne', Model.updateOne({ _id: id }, { $set: { branch: 'b' } }))), /Branch access denied/);
const ownUpdate = Model.updateOne({ _id: id }, { $set: { branchCode: 'GDM' } });
await branchContext.run(updateScope, () => pre('updateOne', ownUpdate));
assert.equal(ownUpdate.getUpdate().$set.branchName, 'Gandhidham');
Model.find = savedFind;

const contexts = await Promise.all(['a', 'b'].map(branch => branchContext.run({ branch }, async () => {
  await new Promise(resolve => setTimeout(resolve, branch === 'a' ? 5 : 1));
  return branchContext.getStore().branch;
})));
assert.deepEqual(contexts, ['a', 'b'], 'Concurrent requests cannot exchange scopes');

let current = { isActive: true, accessAllOperatingCompanies: true, accessAllBranches: false, branchIds: ['a'] };
const decoded = { type: 'user', id: 'user', companyId, activeOperatingCompanyId: 'op', accessAllBranches: true };
const branchAccess = await compile('src/lib/branchAccess.js', {
  jsonwebtoken: { verify: () => decoded }, mongoose,
  '@/lib/db': async () => {},
  '@/models/CompanyUser': { findOne: () => ({ select: () => ({ lean: async () => current }) }) },
  '@/app/api/branches/schema': { countDocuments: async () => 1 },
  './branchContext': { branchContext, branchDenied }, './branchOwnership.mjs': ownershipModule,
});
const wrapped = branchAccess.withBranchAccess(async () => Response.json(branchContext.getStore().access));
const req = new Request('https://example.test/api/order-panel', { headers: { authorization: 'Bearer stale-token' } });
assert.deepEqual(await (await wrapped(req)).json(), { accessAllBranches: false, branchIds: ['a'] });
current = { ...current, branchIds: ['b'] };
assert.deepEqual(await (await wrapped(req)).json(), { accessAllBranches: false, branchIds: ['b'] });
current.isActive = false;
assert.equal((await wrapped(req)).status, 403);
assert.equal(branchContext.getStore(), undefined, 'Request context must not escape its request');
await assert.rejects(branchAccess.validateBranchAssignment(companyId, { accessAllBranches: false, branchIds: [] }), /at least one branch/);
await assert.rejects(branchAccess.validateBranchAssignment(companyId, { accessAllBranches: false, branchIds: ['invalid'] }), /Invalid branch/);
await assert.rejects(branchAccess.validateBranchAssignment(companyId, { branchIds: 'invalid' }), /must be a list/);
assert.deepEqual(await branchAccess.validateBranchAssignment(companyId, {}), { accessAllBranches: true, branchIds: [] });

const notificationModule = await compile('src/lib/branchNotifications.js', {
  './branchContext': { branchContext }, './branchOwnership.mjs': ownershipModule,
});
assert(hasInaccessibleDependent(graph, 'OrderPanel', records.OrderPanel[0], access));
assert(!hasInaccessibleDependent(graph, 'OrderPanel', records.OrderPanel[0], { accessAllBranches: false, branchIds: ['a', 'b'] }));
const notificationScope = { ...scope, user: { ...scope.user, activeOperatingCompanyId: 'op' } };
const visible = await branchContext.run(notificationScope, () => notificationModule.visibleBranchNotifications([
  { type: 'approval-request:vehicle-negotiation', message: 'VNN VNN-A was submitted for approval.', subCompanyId: 'op' },
  { type: 'approval-request:vehicle-negotiation', message: 'VNN MIXED was submitted for approval.', subCompanyId: 'op' },
  { type: 'approval-request:vehicle-negotiation', message: 'VNN VNN-A was submitted for approval.', subCompanyId: 'another-company' },
  { type: 'approval-request:vehicle-negotiation', message: 'Unknown legacy record' },
  { type: 'project-assigned', message: 'Project work remains shared under project permissions' },
]));
assert.equal(visible.length, 2, 'Hide other-branch/company workflow notifications, preserve project work');
console.log('Branch ownership chain, mixed branches, direct/bulk access, counts, aggregates, forged writes, fresh assignments and account revocation: passed.');
