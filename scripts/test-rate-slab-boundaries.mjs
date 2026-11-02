import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');

function findNode(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const value of Object.values(node)) {
    for (const child of Array.isArray(value) ? value : [value]) {
      const found = findNode(child, predicate);
      if (found) return found;
    }
  }
  return null;
}

const slabs = [
  { locationId: 'A', locationName: 'Pune', fromQty: 0, toQty: 5, rate: 100 },
  { locationId: 'A', locationName: 'Pune', fromQty: 5, toQty: 10, rate: 200 },
];
const cases = [[0, 100], [4.9, 100], [4.99, 100], [5, 200], [5.01, 200], [9.999, 200], [10, null], [-1, null]];

for (const file of [
  'src/app/(dashboard)/admin/pricing-panel/create/page.jsx',
  'src/app/(dashboard)/admin/pricing-panel/[id]/page.jsx',
]) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const node = findNode(ast, node => node.type === 'VariableDeclarator' && node.id.name === 'getMatchingSlab');
  assert(node, `Missing rate matcher in ${file}`);
  const match = new Function('rows', `return ${source.slice(node.init.start, node.init.end)}`)([{ weight: 2 }, { weight: 3 }]);
  for (const locationRates of [slabs, [...slabs].reverse()]) {
    const row = { selectedRateMaster: { locationRates }, locationRate: 'Pune' };
    for (const [weight, rate] of cases) {
      assert.equal(match({ ...row, weight })?.rate ?? null, rate, `${file}: weight ${weight}`);
      assert.equal(match({ ...row, rateCalculationMode: 'total_weight' }, weight)?.rate ?? null, rate);
    }
    assert.equal(match({ ...row, rateCalculationMode: 'total_weight' })?.rate, 200);
  }
}

const source = fs.readFileSync('src/app/api/pricing-panel/route.js', 'utf8');
const ast = parse(source, { sourceType: 'module' });
const node = findNode(ast, node => node.type === 'VariableDeclarator' && node.id.name === 'matchingSlab');
assert(node, 'Missing server rate matcher');
const match = new Function('rateMaster', 'locationRate', 'lookupWeight', `return ${source.slice(node.init.start, node.init.end)}`);
for (const locationRates of [slabs, [...slabs].reverse()]) {
  for (const [weight, rate] of cases) {
    assert.equal(match({ locationRates }, slabs[0], weight)?.rate ?? null, rate, `Server: weight ${weight}`);
  }
}
assert.equal(match({ locationRates: [{ ...slabs[1], isActive: false }] }, slabs[0], 5), undefined);
assert.equal(match({ locationRates: [{ ...slabs[1], locationId: 'B' }] }, slabs[0], 5), undefined);
console.log('PASS: create, edit and server use inclusive starts/exclusive ends; decimals, exact boundaries, slab order, total weight, inactive slabs and location scope checked.');
