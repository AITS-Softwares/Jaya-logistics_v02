import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getLrCargoWeight, withLrCargoWeight } from '../src/lib/lrWeight.mjs';

const source = fs.readFileSync(new URL('../src/app/api/consignment-note/route.js', import.meta.url), 'utf8');
const start = source.indexOf('      // Fetch whole-order totals alongside the LR list');
const end = source.indexOf('      return NextResponse.json({', start);
const tableCode = source.slice(start, end);
const buildList = new Function('notes', 'OrderPanel', 'LoadingPanel', 'companyScopeFilter', 'user', 'getLrCargoWeight', 'withLrCargoWeight', `return (async () => { ${tableCode}\nreturn tableData; })();`);
const model = (rows) => ({ find: () => ({ select: () => ({ lean: async () => rows }) }) });
const orders = [{ orderPanelNo: 'OP-1', plantRows: [{ weight: 25 }, { weight: 10 }], reapprovalState: 'none' }];
const loading = [{ vehicleArrivalNo: 'LOAD-1', orderRows: [
  { orderRowId: 'drop-1', orderNo: 'OP-1', fromName: 'A', toName: 'B', weight: 25 },
  { orderRowId: 'drop-2', orderNo: 'OP-1', fromName: 'A', toName: 'C', weight: 10 },
] }];
const notes = [
  { _id: 'lr-1', orderRowId: 'drop-1', loadingInfoNo: 'LOAD-1', header: { orderNo: 'OP-1', from: 'A', to: 'B', status: 'Approved' }, totalWeight: 23.75, consignmentBreakdown: [{ orderNo: 'OP-1', from: 'A', to: 'B', weight: 25, unit: 'MT' }] },
  { _id: 'lr-2', orderRowId: 'drop-2', loadingInfoNo: 'LOAD-1', header: { orderNo: 'OP-1', from: 'A', to: 'C', status: 'Approved' }, totalWeight: 9.5 },
];
const run = () => buildList(notes, model(orders), model(loading), (_user, query) => query, {}, getLrCargoWeight, withLrCargoWeight);
let rows = await run();
assert.deepEqual(rows.map((row) => row.orderTotalWeight), [35, 35], 'Total Weight remains the entire Order total on both LRs');
assert.deepEqual(rows.map((row) => row.totalWeight), [23.75, 9.5], 'Keep each LR cargo weight separate in the API');
assert.deepEqual(rows.map((row) => row.consignmentBreakdown.map((line) => line.weight)), [[23.75], [9.5]], 'Breakdown must show each LR cargo weight, matching edit/details');
notes[0].packData = { 'UNIFORM - BAGS/BOXES': [{ actualWt: '20' }, { actualWt: '3.75' }] };
notes[0].totalWeight = 28;
rows = await run();
assert.equal(rows[0].consignmentBreakdown[0].weight, 23.75, 'Changed pack data must override an old saved breakdown');
assert.equal(rows[0].totalWeight, 23.75);
assert.equal(rows[0].orderTotalWeight, 35, 'Whole-order Total Weight must remain unchanged');
notes[0].packData['UNIFORM - BAGS/BOXES'] = [{ actualWt: '0' }];
assert.equal((await run())[0].consignmentBreakdown[0].weight, 0, 'Zero cargo weight must not fall back to old weight');
notes[0].packData['UNIFORM - BAGS/BOXES'] = [{ actualWt: '20' }, { actualWt: '3.75' }];
orders[0].plantRows[0].weight = 30;
rows = await run();
assert.deepEqual(rows.map((row) => row.orderTotalWeight), [40, 40], 'Refetching after reapproval must recompute totals');
orders[0].reapprovalState = 'pendingApproval';
orders[0].approvedSnapshot = { plantRows: [{ weight: 25 }, { weight: 10 }] };
assert.deepEqual((await run()).map((row) => row.orderTotalWeight), [35, 35], 'Unapproved Order edits must not change the approved total');
notes[1].orderRowId = 'unknown-drop';
const fallback = (await run())[1];
assert.equal(fallback.consignmentBreakdown.length, 1);
assert.equal(fallback.consignmentBreakdown[0].weight, 9.5, 'An unmatched legacy LR must not borrow another drop weight');
console.log('PASS: whole-order totals, separate LR-wise breakdowns, reapproval refetch, approved snapshot isolation, and safe legacy fallback.');
