import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PACK_TYPES, orderSourceRevisions, packProjection, syncPacksFromOrders } from '../src/lib/reapprovalPacks.mjs';
import { withLrCargoWeight } from '../src/lib/lrWeight.mjs';

const emptyPacks = () => Object.fromEntries(PACK_TYPES.map((type) => [type, []]));
const pack = (id, drop, weight) => ({ _id: id, plantRowId: drop, productName: id, actualWt: weight, totalPkgs: 10 });
const order = {
  _id: 'order-1', orderPanelNo: 'OP-1', plantRows: [{ _id: 'drop-1', toName: 'City A' }, { _id: 'drop-2', toName: 'City B' }],
  packData: { ...emptyPacks(), PALLETIZATION: [pack('pack-1', 'drop-1', 15), pack('pack-2', 'drop-2', 20)] },
};
const loading = { orderRows: [{ orderRowId: 'drop-1' }], packData: emptyPacks() };
const lr = { orderRowId: 'drop-2', header: { orderNo: 'OP-1' }, packData: emptyPacks() };
assert.equal(syncPacksFromOrders([order], loading).ambiguous, false);
assert.deepEqual(loading.packData.PALLETIZATION.map((row) => row.actualWt), [15]);
syncPacksFromOrders([order], lr);
assert.deepEqual(lr.packData.PALLETIZATION.map((row) => row.actualWt), [20]);
assert.equal(lr.packData.PALLETIZATION[0].packType, 'PALLETIZATION');
// Replace, add, and remove rows, including switching to another pack table.
const changed = structuredClone(order);
changed.packData.PALLETIZATION = [];
for (const type of PACK_TYPES.slice(1)) changed.packData[type] = [pack(`new-${type}`, 'drop-1', 30)];
syncPacksFromOrders([changed], loading);
assert.equal(loading.packData.PALLETIZATION.length, 0);
for (const type of PACK_TYPES.slice(1)) assert.equal(loading.packData[type][0].actualWt, 30);
// Unrelated orders/drops must not be copied; selected rows from multiple orders must merge.
const other = { _id: 'order-2', orderPanelNo: 'OP-2', plantRows: [{ _id: 'drop-3', toName: 'City C' }], packData: { ...emptyPacks(), PALLETIZATION: [pack('pack-3', 'drop-3', 40)] } };
const combined = { orderRows: [{ orderRowId: 'drop-1' }, { orderRowId: 'drop-3' }] };
syncPacksFromOrders([order, other], combined);
assert.deepEqual(combined.packData.PALLETIZATION.map((row) => row.actualWt), [15, 40]);
// Legacy single-drop packs are safe; ambiguous multi-drop packs leave the saved table intact.
const legacy = structuredClone(other);
delete legacy.packData.PALLETIZATION[0].plantRowId;
assert.equal(syncPacksFromOrders([legacy], { orderRowId: 'drop-3' }).ambiguous, false);
const ambiguous = structuredClone(order);
delete ambiguous.packData.PALLETIZATION[0].plantRowId;
const untouched = structuredClone(loading.packData);
assert.equal(syncPacksFromOrders([ambiguous], loading).ambiguous, true);
assert.deepEqual(loading.packData, untouched);
assert.notDeepEqual(packProjection(order), packProjection(changed));

// Exercise the actual revision service with in-memory persistence and transactions.
function document(fields) {
  return { reapprovalState: 'none', reapprovalHistory: [], upstreamPending: [], sourceDependencies: [], companyId: 'company', ...fields,
    toObject() { return structuredClone(Object.fromEntries(Object.entries(this).filter(([, value]) => typeof value !== 'function'))); },
    async save() {},
  };
}
const orderDoc = document({ ...structuredClone(order), approvedRevision: 1, reapprovalState: 'pendingApproval' });
orderDoc.approvedSnapshot = orderDoc.toObject();
orderDoc.packData.PALLETIZATION[0].actualWt = 99;
const vnn = document({ _id: 'vnn', vnnNo: 'VNN-1', approvedRevision: 1, orders: [{ orderPanelId: 'order-1', orderRowId: 'drop-1', orderNo: 'OP-1', toName: 'City A', weight: 10 }], sourceDependencies: [{ panel: 'order', recordId: 'order-1', rowId: 'drop-1', revision: 1 }] });
vnn.approvedSnapshot = vnn.toObject();
const loadingDoc = document({ _id: 'loading', orderRows: [{ orderRowId: 'drop-1', orderNo: 'OP-1' }], packData: emptyPacks() });
const lrDoc = document({ _id: 'lr', orderRowId: 'drop-1', header: { orderNo: 'OP-1' }, packData: emptyPacks() });
const model = (docs) => ({
  find: () => ({ session: async () => docs }),
  findOne: () => ({ session: async () => docs[0] }),
  updateOne: async () => {},
});
const deps = {
  mongoose: { isValidObjectId: () => true, startSession: async () => ({ withTransaction: async (fn) => fn(), endSession: async () => {} }) },
  OrderPanel: model([orderDoc]), VehicleNegotiation: model([vnn]), PricingPanel: model([]), LoadingPanel: model([loadingDoc]), ConsignmentNote: model([lrDoc]),
  ReapprovalAudit: { create: async () => {} }, notifyModulePermissionUsers: async () => {}, orderSourceRevisions, packProjection, syncPacksFromOrders, withLrCargoWeight,
};
const source = fs.readFileSync(new URL('../src/lib/reapprovalService.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
const service = new Function(...Object.keys(deps), `${source}\nreturn { recordApprovedRevision };`)(...Object.values(deps));
const user = { id: 'user', companyId: 'company' };
const orderResult = await service.recordApprovedRevision('order', orderDoc._id, user);
assert.equal(orderResult.changed, true, 'A pack-only change must count as an order revision');
assert.equal(vnn.sourceDependencies.find((entry) => entry.panel === 'order').revision, 2);
assert.equal(vnn.reapprovalState, 'pendingReapproval');
const vnnResult = await service.recordApprovedRevision('vnn', vnn._id, user);
assert.equal(vnnResult.changed, true, 'VNN must propagate revised packs even with identical plant rows');
assert.equal(loadingDoc.packData.PALLETIZATION[0].actualWt, 99);
assert.equal(lrDoc.packData.PALLETIZATION[0].actualWt, 99);
assert.equal(loadingDoc.orderRows[0].weight, 10, 'Plant-row sync must continue working');
assert.equal(lrDoc.header.to, 'City A');
assert.deepEqual(lrDoc.consignmentBreakdown, [{ orderNo: 'OP-1', from: '', to: 'City A', weight: 99, unit: 'MT' }], 'LR breakdown must use the reapproved LR cargo weight rather than planned drop weight');
assert.equal(loadingDoc.reapprovalState, 'pendingReapproval');
assert.equal(lrDoc.reapprovalState, 'pendingReapproval');
// A later commercial-only amendment must preserve downstream cargo edits.
loadingDoc.packData.PALLETIZATION[0].actualWt = 123;
vnn.approval = { vendorName: 'Changed supplier' };
vnn.reapprovalState = 'pendingReapproval';
await service.recordApprovedRevision('vnn', vnn._id, user);
assert.equal(loadingDoc.packData.PALLETIZATION[0].actualWt, 123);
console.log('PASS: pack-only Order → VNN → Loading/LR reapproval, all pack tables, deletions, drop isolation, multi-order merging, ambiguity guards, plant-row sync, and commercial-only cargo preservation.');
