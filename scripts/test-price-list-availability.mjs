import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { priceListEmptyMessage, eligiblePriceLists } from '../src/lib/priceListAvailability.mjs';
const parser = createRequire(import.meta.url)('@babel/parser');
const master = { _id: 'rate', title: 'Approved rates', branchId: 'b', customerId: 'c', usageMode: 'standard', locationRates: [{ locationName: 'Pune' }] };
assert.match(priceListEmptyMessage({ rateMasters: [] }), /approved active/);
assert.match(priceListEmptyMessage({ rateMasters: [master] }), /Select a branch/);
assert.match(priceListEmptyMessage({ rateMasters: [master], branchId: 'b' }), /customer ID/);
assert.match(priceListEmptyMessage({ rateMasters: [master], branchId: 'other', customerId: 'c' }), /matches this branch/);
assert.match(priceListEmptyMessage({ rateMasters: [master], branchId: 'b', customerId: 'other' }), /customer and branch/);
assert.match(priceListEmptyMessage({ rateMasters: [master], rateCalculationMode: 'manual_rate' }), /Manual Rate Default/);
for (const file of ['src/app/(dashboard)/admin/pricing-panel/create/page.jsx', 'src/app/(dashboard)/admin/pricing-panel/[id]/page.jsx']) {
  const source=fs.readFileSync(file,'utf8');
  const ast=parser.parse(source,{sourceType:'module',plugins:['jsx']});
  assert(ast.program.body.some(node=>node.type==='ImportDeclaration' && node.source.value==='@/components/PriceListDropdown'));
}
assert.equal(eligiblePriceLists({rateMasters:[master],branchId:{_id:'b'},customerId:{_id:'c'}}).length,1);
assert.equal(eligiblePriceLists({rateMasters:[master],branchId:'other',customerId:'c'}).length,0);
assert.equal(eligiblePriceLists({rateMasters:[master],branchId:'b',customerId:'other'}).length,0);
assert.equal(eligiblePriceLists({rateMasters:[master],branchId:'b',customerId:'c',rateCalculationMode:'manual_rate'}).length,0);
assert.equal(eligiblePriceLists({rateMasters:[master],branchId:'b',customerId:'c',filterByLocation:true,locationName:'missing'}).length,0);
console.log('PASS: shared Pricing create/edit dropdown, setup feedback and populated branch/customer/location/manual-mode eligibility.');
