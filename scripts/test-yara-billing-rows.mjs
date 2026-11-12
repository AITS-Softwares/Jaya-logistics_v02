import assert from 'node:assert/strict';
import { groupYaraBillingRows } from '../src/lib/yaraBillingRows.mjs';

const base = { invoiceNo: 'INV-1', lrNo: 'LR-1', to: 'Ambdas', locationRemark: 'Pune', rate: 100, unit: 'MT', district: 'Ratnagiri', state: 'Maharashtra' };
const rows = [
  { ...base, quantity: 2, billQuantity: 3, amount: 300 },
  { ...base, quantity: 4, billQuantity: 5, amount: 500 },
];
const before = structuredClone(rows);
assert.deepEqual(groupYaraBillingRows(rows), [{ ...base, quantity: 6, billQuantity: 8, amount: 800 }]);
assert.deepEqual(rows, before, 'Saved/source rows must not change');
for (const change of [
  { invoiceNo: 'INV-2' }, { lrNo: 'LR-2' }, { locationRemark: 'Mumbai' },
  { rate: 200 }, { unit: 'KG' }, { district: 'Pune' }, { state: 'Goa' },
]) {
  assert.equal(groupYaraBillingRows([rows[0], { ...rows[1], ...change }]).length, 2);
}
assert.equal(groupYaraBillingRows([rows[0], { ...rows[1], locationRemark: ' pune ', rate: '100', unit: 'mt' }]).length, 1);
assert.equal(groupYaraBillingRows([{ ...rows[0], invoiceNo: 'N/A' }, { ...rows[1], invoiceNo: 'N/A' }]).length, 2);
assert.equal(groupYaraBillingRows([{ ...base, weight: 2, amount: 200 }, { ...base, weight: 3, amount: 300 }])[0].billQuantity, 5);
assert.deepEqual(groupYaraBillingRows(), []);
console.log('PASS: Yara grouping, totals, differing references/rates/destinations/units, missing references, and source preservation.');
