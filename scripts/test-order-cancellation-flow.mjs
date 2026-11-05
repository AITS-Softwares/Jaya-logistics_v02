import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planOrderCancellation } from '../src/lib/orderCancellationPolicy.mjs';
import { loadingPhotoError, loadingSubmissionError } from '../src/lib/loadingPhotoPolicy.mjs';
const sourceOrder = () => ({ _id: 'order', companyId: 'tenant', orderPanelNo: 'OP-1', panelStatus: 'Approved', reapprovalState: 'none', plantRows: [{ _id: 'row-1', status: 'Open', statusHistory: [] }] });
const row = { orderNo: 'OP-1', orderRowId: 'row-1' };
const other = { orderNo: 'OP-2', orderRowId: 'row-2' };
const entry = (type, no, record) => ({ type, id: no, no, label: type, record: { _id: no, ...record }, depth: 1 });
let graph = [entry('vnn', 'VNN-1', { orders: [row] }), entry('pricing', 'PR-1', { orders: [row] }), entry('loading', 'LI-1', { vehicleNegotiationNo: 'VNN-1', orderRows: [row], panelStatus: 'Approved' }), entry('purchase', 'PP-1', { orderRows: [row] }), entry('lr', 'LR-1', { orderRowId: 'row-1', header: { orderNo: 'OP-1', status: 'Approved' }, loadingInfoNo: 'LI-1', invoice: { file: { filePath: 'invoice.pdf' } } })];
let order = sourceOrder();
let result = planOrderCancellation(order, order.plantRows, graph);
assert.equal(result.blockers.length, 0, 'Approved Loading Info, LRs and invoices do not block cancellation');
assert(result.plans.every(plan => plan.full));
const shared = graph.map(item => ['vnn', 'pricing', 'loading', 'purchase'].includes(item.type) ? { ...item, record: { ...item.record, [item.record.orders ? 'orders' : 'orderRows']: [row, other] } } : item);
result = planOrderCancellation(order, order.plantRows, shared);
assert.equal(result.plans.filter(plan => !plan.full).length, 4, 'Shared records block without cancelling unrelated orders');
for (const [type, record] of [['advance', { purchaseNo: 'PP-1', status: 'Paid' }], ['balance', { lrNo: 'LR-1', paymentDetails: { paymentStatus: 'Completed' } }], ['pod', { lrEntries: [{ lrNo: 'LR-1' }] }], ['pod', { purchaseNo: 'PP-1' }]]) {
  const plan = planOrderCancellation(order, order.plantRows, [...graph, entry(type, 'BLOCKER', record)]);
  assert.equal(plan.blockers.length, 1, `${type} must block cancellation`);
}
assert.equal(planOrderCancellation(order, order.plantRows, [...graph, entry('advance', 'UNPAID', { purchaseNo: 'PP-1', status: 'Pending' })]).blockers.length, 0);
const photos = prefix => Object.fromEntries(Array.from({ length: prefix === 'vl' ? 5 : 3 }, (_, index) => [`${prefix}${index + 1}`, '/photo.jpg']));
const complete = Object.fromEntries(['vbp', 'vft', 'vot', 'vl'].map(prefix => [`${prefix}Uploads`, photos(prefix)]));
assert.equal(loadingPhotoError(complete, 1), null); assert.equal(loadingPhotoError(complete, 2), null);
assert.match(loadingPhotoError({ ...complete, vbpUploads: {} }, 1), /3 VBP/);
assert.match(loadingPhotoError({ ...complete, vftUploads: {} }, 1), /3 VFT/);
assert.match(loadingPhotoError({ ...complete, votUploads: {} }, 2), /3 VOT/);
assert.match(loadingPhotoError({ ...complete, vlUploads: {} }, 2), /5 VL/);
assert.equal(loadingPhotoError({}, 1, true), null);
assert.match(loadingSubmissionError({}, 1, true), /Empty Vehicle Slip/);
assert.equal(loadingSubmissionError({ loadedVehicleSlips: [' '] }, 2, true), null);
assert.equal(loadingSubmissionError({ ...complete, vehicleSlips: ['/empty.pdf'] }, 1), null);
assert.equal(loadingSubmissionError({ ...complete, loadedVehicleSlips: ['/loaded.pdf'] }, 2), null);

// Exercise the actual transactional service without touching a database.
let saved, notifications, paid, failSave, transactionRolledBack;
function doc(value) { return { ...structuredClone(value), $locals: {}, toObject() { const { save, set, toObject, $locals, ...data } = this; return structuredClone(data); }, set(key, value) { this[key] = value; }, async save() { if (failSave && this._id === 'PR-1') throw new Error('Injected save failure'); saved.push(this._id); } }; }
const query = value => ({ session() { return this; }, lean() { return Promise.resolve(value); }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
let table;
const TYPES = Object.fromEntries(['order', 'vnn', 'pricing', 'loading', 'purchase', 'lr', 'advance'].map(type => [type, { Model: { findOne: filter => query(table[type]?.find(item => item._id === filter._id)), find: () => query(table[type] || []) } }]));
const deps = { mongoose: { startSession: async () => ({ async withTransaction(work) { try { await work(); } catch (error) { transactionRolledBack = true; saved = []; throw error; } }, async endSession() {} }) }, hasPermission: user => user.approve, companyScopeFilter: (user, filter) => filter, TYPES, resolveDeleteGraph: async () => [...graph, ...(paid ? [entry('advance', 'AP-1', { purchaseNo: 'PP-1', status: 'Paid' })] : [])], planOrderCancellation, notifyModulePermissionUsers: async notice => notifications.push(notice), getBilledLrNumbers: async () => ['LR-1'] };
const service = fs.readFileSync('src/lib/cancelOrder.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export async function', 'async function');
const cancel = new Function(...Object.keys(deps), `${service}\nreturn cancelOrder;`)(...Object.values(deps));
function reset() { saved = []; notifications = []; paid = false; failSave = false; transactionRolledBack = false; table = { order: [doc(sourceOrder())] }; for (const item of graph) (table[item.type] ||= []).push(doc({ ...item.record, panelStatus: 'Approved', orders: item.type === 'pricing' ? [{ ...row, _id: 'pr-row' }] : item.record.orders, reapprovalHistory: [] })); }
reset(); result = await cancel({ approve: true }, 'order', { reason: 'Customer cancelled', dryRun: true }); assert(result.canConfirm); assert.equal(saved.length, 0);
reset(); result = await cancel({ approve: false }, 'order', { reason: 'Customer cancelled' }); assert(result.requiresApproval); assert.equal(table.order[0].plantRows[0].status, 'Open'); assert.equal(table.order[0].plantRows[0].statusRequest.action, 'Cancel'); assert.deepEqual(saved, ['order']);
reset(); table.order[0].plantRows[0].statusRequest = { action: 'Cancel' }; await cancel({ approve: true }, 'order', { reason: 'Approved request', approvingStatusRequest: true }); assert.equal(table.vnn[0].panelStatus, 'Cancelled'); assert.equal(table.loading[0].panelStatus, 'Cancelled'); assert.equal(table.lr[0].header.status, 'Cancelled'); assert.equal(table.lr[0].invoice.file.filePath, 'invoice.pdf'); assert.equal(table.pricing[0].orders[0].cancellationChargeRequired, true); assert(notifications.some(item => item.type === 'pricing-cancellation-charge-required')); assert(notifications.some(item => item.type === 'cancelled-invoice-adjustment-required'));
reset(); paid = true; await assert.rejects(cancel({ approve: true }, 'order', { reason: 'Blocked' }), /paid or completed/); assert.equal(saved.length, 0); assert.equal(notifications.length, 0);
reset(); failSave = true; await assert.rejects(cancel({ approve: true }, 'order', { reason: 'Rollback' }), /Injected/); assert(transactionRolledBack); assert.equal(saved.length, 0); assert.equal(notifications.length, 0);
console.log('PASS: full/shared cancellation, paid advance/POD/balance blockers, finalized LR/invoice cancellation, request/approval, charge and billing notifications, transaction failure handling, and 3/3/3/5 photo rules with optional exemption. No database records changed.');
