import assert from 'node:assert/strict';
import { customerNameQuery } from '../src/lib/customerNameUniqueness.mjs';
import { masterNameQuery, duplicateMasterName } from '../src/lib/masterNameUniqueness.mjs';

const query = customerNameQuery('company-1', ' Yara Fertilizer India Pvt Ltd ', 'customer-15');
const regex = new RegExp(query.customerName.$regex, query.customerName.$options);
assert.ok(regex.test('Yara Fertilizer India Pvt Ltd'));
assert.ok(regex.test('  YARA FERTILIZER INDIA PVT LTD  '));
assert.ok(!regex.test('Yara Fertilizer India Pvt Ltd Extra'));
assert.equal(query.companyId, 'company-1');
assert.deepEqual(query._id, { $ne: 'customer-15' });
const punctuation = customerNameQuery('company-1', 'A+B (India).');
const literal = new RegExp(punctuation.customerName.$regex, 'i');
assert.ok(literal.test('A+B (India).'));
assert.ok(!literal.test('AAAB IndiaX'));
for (const field of ['itemName', 'supplierName', 'customerName']) {
  const built = masterNameQuery('company-1', field, 'Example', 'self');
  assert.equal(built.$or[0][field].$options, 'i');
  assert.ok(built.$or[1][`pendingChange.data.${field}`]);
}
let seen;
const Model = { findOne(query) { seen = query; return {
  setOptions(options) { assert.equal(options.includeUnapprovedMasters, true); return this; },
  select() { return this; }, lean: async () => ({ _id: 'match' }),
}; } };
assert.equal(await duplicateMasterName(Model, 'company-1', 'supplierName', 'Example', 'self'), true);
assert.equal(seen.companyId, 'company-1');
assert.deepEqual(seen._id, { $ne: 'self' });
console.log('PASS: exact duplicate names, case/space handling, literal punctuation, edit exclusion, tenant scope, and pending supplier checks.');
