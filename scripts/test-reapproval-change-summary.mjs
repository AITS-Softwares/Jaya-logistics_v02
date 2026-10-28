import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const source = fs.readFileSync(new URL('../src/lib/reapprovalService.js', import.meta.url), 'utf8');
const code = source.slice(source.indexOf('const changeFieldLabels'), source.indexOf('/** Read the approved Order-owned remarks')).replace(/^export /gm, '');
const summarize = new Function('normalizedObject', `${code}\nreturn summarizeApprovedChanges;`)(JSON.stringify);
const item = (id, name, weight, count = '10') => ({ _id: id, productName: name, actualWt: weight, totalPkgs: count, wtUom: 'MT' });
const before = {
  packData: {
    PALLETIZATION: [{ _id: 'blank-1', productName: '', actualWt: '0', uom: 'MT' }],
    'UNIFORM - BAGS/BOXES': [item('old-a', 'Poly 25 KG', '10'), item('old-b', 'Poly 25 KG', '15')],
    'LOOSE - CARGO': [{ _id: 'blank-2', productName: '', actualWt: '', uom: 'MT' }],
  },
  consignmentBreakdown: [{ _id: 'old-consignment', orderNo: 'OP-1', from: 'A', to: 'B', weight: 25, unit: 'MT' }],
  totalWeight: 25,
};
const after = {
  packData: { 'UNIFORM - BAGS/BOXES': [item('new-b', 'Poly 25 KG', '15'), item('new-a', 'Poly 25 KG', '8.75'), item('new-c', 'Poly 50 KG', '5')] },
  consignmentBreakdown: [{ _id: 'new-consignment', orderNo: 'OP-1', from: 'A', to: 'B', weight: 25, unit: 'MT' }],
  totalWeight: 28.75,
};
const changes = summarize('lr', before, after);
assert.equal(changes.length, 3, 'Show the edited weight, added product, and total only');
const weight = changes.find((change) => change.field.endsWith('Actual weight'));
assert.equal(weight.oldValue, '10');
assert.equal(weight.newValue, '8.75');
assert(weight.field.includes('Bags / boxes · Poly 25 KG'));
const added = changes.find((change) => change.action === 'added');
assert(added.newValue.includes('Poly 50 KG'));
assert(added.newValue.includes('10 packages'));
assert(added.newValue.includes('5 MT'));
assert(!changes.some((change) => /Consignment|Row 1|_id/.test(change.field)));
assert(!changes.some((change) => change.oldValue === 'Present' || change.newValue === 'Present'));
const removed = summarize('lr', { packData: { 'UNIFORM - BAGS/BOXES': [item('a', 'Removed product', '5')] } }, { packData: { 'UNIFORM - BAGS/BOXES': [] } });
assert.equal(removed.length, 1);
assert.equal(removed[0].action, 'removed');
assert(removed[0].oldValue.includes('Removed product'));
assert(removed[0].oldValue.includes('5 MT'));
assert.deepEqual(summarize('lr', { totalWeight: '25' }, { totalWeight: 25 }), []);
// Stable drop IDs retain a meaningful per-field comparison.
const dropChanges = summarize('vnn', { orders: [{ _id: 'drop', toName: 'A', weight: 25 }] }, { orders: [{ _id: 'drop', toName: 'B', weight: 30 }] });
assert.equal(dropChanges.length, 2);

// Verify the actual review component renders explicit old/new headings and actions.
const component = fs.readFileSync(new URL('../src/components/ReapprovalWorkspace.jsx', import.meta.url), 'utf8');
const fragment = component.slice(component.indexOf('function displayChangeValue'), component.indexOf('function decodeToken'));
const swc = await require('next/dist/build/swc').loadBindings();
const compiled = await swc.transform(fragment, { filename: 'review.jsx', jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'classic' } }, target: 'es2022' }, module: { type: 'commonjs' } });
const React = require('react');
const View = new Function('React', `${compiled.code}\nreturn ChangesToReview;`)(React);
const html = require('react-dom/server').renderToStaticMarkup(React.createElement(View, { changes: [...changes, ...removed] }));
for (const label of ['What changed', 'Previously approved', 'Updated', 'Added', 'Removed', '10 packages']) assert(html.includes(label));
assert(!html.includes('Present'));
assert.equal(require('react-dom/server').renderToStaticMarkup(React.createElement(View, { changes: [] })), '');
console.log('PASS: regenerated IDs, duplicate products, empty placeholders, actual field changes, added/removed product details, numeric normalization, and rendered comparison table.');
