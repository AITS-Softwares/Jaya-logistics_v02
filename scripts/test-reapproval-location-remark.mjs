import assert from 'node:assert/strict';
import fs from 'node:fs';

const service = fs.readFileSync(new URL('../src/lib/reapprovalService.js', import.meta.url), 'utf8');
const projectionCode = service.slice(service.indexOf('function mirroredProjection'), service.indexOf('async function findDirectChildren'));
const { mirroredProjection, copyOrderRow } = new Function('packProjection', 'orderSourceRevisions', `${projectionCode}\nreturn { mirroredProjection, copyOrderRow };`)(() => ({}), () => []);
const before = { plantRows: [{ _id: 'drop-1', locationRemark: 'Old gate' }] };
const after = { plantRows: [{ _id: 'drop-1', locationRemark: 'Use north gate' }] };
assert.notDeepEqual(mirroredProjection('order', before), mirroredProjection('order', after), 'Remark-only edits must trigger sync');
const row = {};
copyOrderRow(after.plantRows[0], row);
assert.equal(row.locationRemark, 'Use north gate');
copyOrderRow({ locationRemark: '' }, row);
assert.equal(row.locationRemark, '', 'Removing a remark must clear the downstream value');

const api = fs.readFileSync(new URL('../src/app/api/vehicle-negotiation/route.js', import.meta.url), 'utf8');
const helperCode = api.slice(api.indexOf('async function withLinkedOrderStatuses'), api.indexOf('function uniqueVnnOrderPanels'));
let panels;
const reviewCode = service.slice(service.indexOf('const changeFieldLabels'), service.indexOf('/** Update one hop only')).replace(/^export /gm, '');
const review = new Function('normalizedObject', 'same', 'mongoose', 'OrderPanel', 'companyScopeFilter', `${reviewCode}\nreturn { summarizeApprovedChanges, applyApprovedVnnLocationRemarks, withApprovedVnnLocationRemarks };`)(
  JSON.stringify, (a, b) => String(a ?? '').trim() === String(b ?? '').trim(),
  { isValidObjectId: () => true }, { find: () => ({ select: () => ({ lean: async () => panels }) }) }, (_user, query) => query,
);
const enrich = new Function('OrderPanel', 'mongoose', 'companyScopeFilter', 'applyApprovedVnnLocationRemarks', `${helperCode}\nreturn withLinkedOrderStatuses;`)(
  { find: () => ({ lean: async () => panels }) },
  { Types: { ObjectId: { isValid: () => true } } },
  (_user, query) => query,
  review.applyApprovedVnnLocationRemarks,
);
const negotiation = { orders: [{ orderPanelId: 'order-1', orderRowId: 'drop-1', orderNo: 'OP-1', locationRemark: '' }] };
panels = [{ _id: 'order-1', orderPanelNo: 'OP-1', panelStatus: 'Approved', reapprovalState: 'none', plantRows: [{ _id: 'drop-1', locationRemark: 'Approved gate' }, { _id: 'drop-2', locationRemark: 'Wrong drop' }] }];
assert.equal((await enrich(negotiation, {})).orders[0].locationRemark, 'Approved gate', 'Legacy VNN should display its approved drop remark');
const snapshot = { orders: [{ _id: 'vnn-row-1', orderPanelId: 'order-1', orderRowId: 'drop-1', orderNo: 'OP-1' }], reportRows: [{ _id: 'old-report', weight: 10 }] };
const current = structuredClone(snapshot);
current.orders[0].locationRemark = '';
current.reportRows = [{ _id: 'new-report', weight: 10 }];
assert.deepEqual(review.summarizeApprovedChanges('vnn', snapshot, current), [], 'Empty defaults and regenerated report rows are not review changes');
const reviewed = await review.withApprovedVnnLocationRemarks(current, {});
const changes = review.summarizeApprovedChanges('vnn', snapshot, reviewed);
assert.equal(changes.length, 1);
assert(changes[0].field.includes('Location remark'));
assert.equal(changes[0].newValue, 'Approved gate', 'The review must show the actual approved remark, not a blank arrow');
current.orders[0].locationRemark = 'Stale VNN remark';
assert.equal((await enrich(current, {})).orders[0].locationRemark, 'Approved gate');
assert.equal((await review.withApprovedVnnLocationRemarks(current, {})).orders[0].locationRemark, 'Approved gate', 'Summary and table must use the same value');
panels[0].reapprovalState = 'pendingApproval';
panels[0].approvedSnapshot = { plantRows: [{ _id: 'drop-1', locationRemark: 'Previously approved gate' }] };
panels[0].plantRows[0].locationRemark = 'Unapproved change';
assert.equal((await enrich(negotiation, {})).orders[0].locationRemark, 'Previously approved gate');
delete panels[0].approvedSnapshot;
assert.equal((await enrich(negotiation, {})).orders[0].locationRemark, '', 'Never display a pending remark as approved');
panels[0].reapprovalState = 'none';
panels[0].panelStatus = 'Draft';
assert.equal((await enrich(negotiation, {})).orders[0].locationRemark, '');
const savedRemark = structuredClone(negotiation);
savedRemark.orders[0].locationRemark = 'Saved VNN remark';
assert.equal((await enrich(savedRemark, {})).orders[0].locationRemark, 'Saved VNN remark');
console.log('PASS: remark-only change detection, sync and clearing, approved legacy fallback, correct drop matching, and pending-data isolation.');
