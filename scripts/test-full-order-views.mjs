import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ORDER_VIEW_SELECT, orderReadView } from '../src/lib/orderReadView.mjs';
import * as destination from '../src/lib/destination.mjs';
const require = createRequire(import.meta.url);
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const swc = require('next/dist/build/swc');
const cache = new Map();
function component(file) {
  if (cache.has(file)) return cache.get(file);
  const code = swc.transformSync(fs.readFileSync(file, 'utf8'), { filename: file, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } }, target: 'es2022' }, module: { type: 'commonjs' } }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => name === '@/lib/destination.mjs' ? destination : name.startsWith('@/components/') ? component(`src/${name.slice(2)}.jsx`) : require(name), module, module.exports);
  cache.set(file, module.exports); return module.exports;
}
const orderId = '111111111111111111111111', vnnId = '222222222222222222222222';
const full = {
  _id: orderId, orderPanelNo: 'OP-FULL-1', customerName: 'Example Customer', customerCode: 'C-101', branchName: 'Gandhidham', panelStatus: 'Submitted', delivery: 'Urgent', totalWeight: 35,
  collectionCharges: 150, cancellationCharges: 30, cancellationChargeMode: 'per MT', loadingCharges: 'Paid by party', otherCharges: 50, totalAmount: 15000,
  createdBy: 'private-user-id', contactPerson: 'HIDDEN CONTACT', approvalRemarks: 'Check cargo <carefully>', approvedAt: '2026-11-01T10:00:00Z', loadingInfoPhotosOptional: true, allocationEnabled: true,
  plantRows: [{ _id: 'drop-1', fromName: 'Origin', toName: 'Original City', locationRemark: 'North Gate', plantName: 'Plant One', plantCodeValue: 'PL-1', countryName: 'India', rate: 100, weight: 10, status: 'Hold', statusReason: 'Waiting for dispatch', statusHistory: [{ action: 'Hold', from: 'Open', to: 'Hold', reason: 'Customer request', by: 'private-user-id', at: '2026-11-01T10:00:00Z' }] }, { _id: 'drop-2', toName: 'Second City', weight: 25 }],
  packData: {
    PALLETIZATION: [{ productName: 'Pallet Material', plantRowId: 'drop-1', noOfPallets: 4, unitPerPallets: 10, totalPkgs: 40, actualWt: 500, chargedWt: 510, wtUom: 'KG', skuSize: '20 L' }],
    'UNIFORM - BAGS/BOXES': [{ productName: 'Bag Material', totalPkgs: 20, pkgsType: 'Bags', packWeight: 25, wtUom: 'KG' }],
    'LOOSE - CARGO': [{ productName: 'Loose Material', plantRowId: 'drop-2', actualWt: 10, chargedWt: 11, uom: 'MT' }],
    'NON-UNIFORM - GENERAL CARGO': [{ productName: 'General Material', nos: 3, length: 2, width: 4, height: 5, actualWt: 2, chargedWt: 3, uom: 'MT' }],
  },
};
const projected = orderReadView(full);
assert.equal(projected.createdBy, undefined); assert.equal(projected.contactPerson, undefined);
assert.equal(projected.plantRows[0].statusHistory[0].by, undefined);
assert.equal(projected.packData.PALLETIZATION[0].plantRowId, 'drop-1');
for (const field of ['packData', 'approvedAt']) assert.ok(ORDER_VIEW_SELECT.includes(field));
const Content = component('src/components/VnnOrderDetailsContent.jsx').default;
const html = renderToStaticMarkup(React.createElement(Content, { order: projected, linkedRowIds: ['drop-1'] }));
for (const value of ['Order overview', 'Products &amp; packing details', 'Approval &amp; record history', 'Pallet Material', 'Bag Material', 'Loose Material', 'General Material', 'North Gate', 'Original City', 'Second City', 'Linked to this VNN', 'Customer request', 'KG', '1. North Gate']) assert.ok(html.includes(value), `Missing full-order detail: ${value}`);
assert.ok(!html.includes('HIDDEN CONTACT')); assert.ok(!html.includes('private-user-id')); assert.ok(html.includes('&lt;carefully&gt;'));
const Panel = component('src/components/OrderPanelDetailsView.jsx').default;
const panelHtml = renderToStaticMarkup(React.createElement(Panel, { order: projected, onBack() {} }));
assert.ok(panelHtml.includes('Pallet Material')); assert.ok(panelHtml.includes('Complete read-only details'));
for (const View of [Content, component('src/components/OrderPanelDetailsContent.jsx').default]) {
  const rendered = renderToStaticMarkup(React.createElement(View, { order: full }));
  assert.ok(!/\b(rate|rates|amount|amounts|charges|charged)\b|₹/i.test(rendered), 'No financial fields should appear, even if passed raw editor data');
  assert.ok(rendered.includes('Pallet Material'));
}
for (const field of ['rate', 'locationRate', 'totalAmount', 'collectionCharges', 'cancellationCharges', 'cancellationChargeMode', 'loadingCharges', 'otherCharges']) {
  assert.equal(field in projected, false);
  assert.equal(field in projected.plantRows[0], false);
}
assert.equal('chargedWt' in projected.packData.PALLETIZATION[0], false);
assert.ok(fs.readFileSync('src/components/OrderPanelDetailsView.jsx', 'utf8').includes("@/components/OrderPanelDetailsContent"));
assert.ok(fs.readFileSync('src/components/VnnOrderDetailsView.jsx', 'utf8').includes("@/components/VnnOrderDetailsContent"));
const Awaiting = component('src/components/AwaitingOrderView.jsx').default;
assert.equal(Awaiting({ order: { id: orderId }, onClose() {} }).props.query, `orderId=${orderId}`);
const Vnn = component('src/components/VnnOrderView.jsx').default;
assert.ok(Vnn({ selection: { vnId: vnnId, orderPanelId: orderId }, onClose() {} }).props.query.includes(`orderId=${orderId}`));
assert.ok(Vnn({ selection: { vnId: vnnId, orderNo: 'LEGACY-OP' }, onClose() {} }).props.query.includes('orderNo=LEGACY-OP'));

let sourceOrder = full, linkedVnn = { vnnNo: 'VNN-1', orders: [{ orderPanelId: orderId, orderNo: full.orderPanelNo, orderRowId: 'drop-1' }] }, query, rules;
const source = fs.readFileSync('src/app/api/vehicle-negotiation/order-view/route.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export const GET =', 'const GET =');
const deps = { NextResponse: { json: (body, options) => ({ ...body, status: options?.status || 200 }) }, withAuth: (fn, options) => { rules = options; return fn; }, withBranchAccess: fn => fn, connectDb: async () => {}, companyScopeFilter: (user, filter) => ({ ...filter, companyId: user.companyId }), ORDER_VIEW_SELECT, orderReadView,
  OrderPanel: { findOne: filter => { query = filter; return { select: () => ({ lean: async () => {
    if (!sourceOrder || filter.companyId !== 'company') return null;
    if (filter._id && filter._id !== sourceOrder._id) return null;
    if (filter.orderPanelNo?.$regex && !new RegExp(filter.orderPanelNo.$regex, filter.orderPanelNo.$options).test(sourceOrder.orderPanelNo)) return null;
    if (filter.panelStatus && filter.panelStatus !== sourceOrder.panelStatus) return null;
    return sourceOrder;
  } }) }; } },
  VehicleNegotiation: { findOne: filter => { assert.equal(filter.companyId, 'company'); return { select: () => ({ lean: async () => linkedVnn }) }; } },
};
const get = new Function(...Object.keys(deps), source + '\nreturn GET;')(...Object.values(deps));
const request = suffix => ({ url: `http://localhost/api/vehicle-negotiation/order-view?${suffix}` });
const user = { companyId: 'company' };
let response = await get(request(`orderId=${orderId}`), {}, user);
assert.equal(response.status, 200); assert.equal(query.panelStatus, 'Submitted'); assert.equal(query.companyId, 'company'); assert.equal(query.isDraft.$ne, true);
assert.equal(response.data.packData['LOOSE - CARGO'][0].productName, 'Loose Material');
assert.deepEqual(rules, { module: 'Vehicle Negotiation', action: 'view' });
response = await get(request(`orderId=${orderId}&vnnId=${vnnId}`), {}, user);
assert.equal(response.status, 200); assert.deepEqual(response.context.linkedRowIds, ['drop-1']); assert.equal(response.data.plantRows.length, 2, 'Show all source routes, not just linked routes');
// Regression: the list enriches raw number-only links with the current source ID.
linkedVnn = { orders: [{ orderNo: '  op-full-1  ', orderRowId: 'drop-1' }] };
response = await get(request(`orderId=${orderId}&vnnId=${vnnId}`), {}, user);
assert.equal(response.status, 200, 'Resolved ID must work with a number-only stored link');
assert.deepEqual(response.context.linkedRowIds, ['drop-1']);
linkedVnn = { orders: [{ orderPanelId: '333333333333333333333333', orderNo: full.orderPanelNo }] };
assert.equal((await get(request(`orderId=${orderId}&vnnId=${vnnId}`), {}, user)).status, 200, 'Stale stored ID must not hide a correctly numbered order');
assert.equal((await get(request(`orderId=333333333333333333333333&orderNo=OP-FULL-1&vnnId=${vnnId}`), {}, user)).status, 200, 'A missing stale source ID can resolve through the verified saved number');
linkedVnn = { selectedOrderPanels: [{ _id: '333333333333333333333333', orderPanelNo: 'OP-FULL-1' }] };
assert.equal((await get(request(`orderId=${orderId}&vnnId=${vnnId}`), {}, user)).status, 200);
assert.equal((await get(request(`orderNo=OP-FULL-1&vnnId=${vnnId}`), {}, user)).status, 200);
linkedVnn = { orders: [{ orderNo: 'OTHER-ORDER' }] };
assert.equal((await get(request(`orderId=${orderId}&orderNo=OTHER-ORDER&vnnId=${vnnId}`), {}, user)).status, 404, 'Caller number cannot authorize an unrelated resolved ID');
assert.equal((await get(request(`orderNo=OP-FULL-1&vnnId=${vnnId}`), {}, user)).status, 404);
const savedNumber = sourceOrder.orderPanelNo;
sourceOrder = { ...full, orderPanelNo: 'OP.[1]+' };
linkedVnn = { orders: [{ orderNo: 'OP.[1]+' }] };
assert.equal((await get(request(`orderNo=${encodeURIComponent('OP.[1]+')}&vnnId=${vnnId}`), {}, user)).status, 200, 'Number fallback escapes regex characters');
sourceOrder = { ...full, orderPanelNo: savedNumber };
linkedVnn = { orders: [] };
assert.equal((await get(request(`orderId=${orderId}&vnnId=${vnnId}`), {}, user)).status, 404);
linkedVnn = null;
assert.equal((await get(request(`orderId=${orderId}&vnnId=${vnnId}`), {}, user)).status, 404);
sourceOrder = null;
assert.equal((await get(request(`orderId=${orderId}`), {}, user)).status, 404);
assert.equal((await get(request('orderId=invalid'), {}, user)).status, 400);
// Exercise the actual Order Panel GET handler, not just its projection helper.
const orderApiSource = fs.readFileSync('src/app/api/order-panel/route.js', 'utf8');
const ast = require('@babel/parser').parse(orderApiSource, { sourceType: 'module' });
const declaration = ast.program.body.find(node => node.type === 'VariableDeclaration' && node.declarations.some(item => item.id.name === 'branchHandlerGET'));
const orderGet = new Function('withAuth', 'connectDb', 'reconcileOrderCancellations', 'mongoose', 'OrderPanel', 'companyScopeFilter', 'hasPermission', 'NextResponse', 'orderReadView', orderApiSource.slice(declaration.start, declaration.end) + '\nreturn branchHandlerGET;')(
  fn => fn, async () => {}, async () => {}, { Types: { ObjectId: { isValid: () => true } } },
  { findOne: () => ({ populate: () => ({ lean: async () => full }) }) }, (_, query) => query, () => false,
  { json: (body, options) => ({ ...body, status: options?.status || 200 }) }, orderReadView,
);
const readOnlyResponse = await orderGet({ url: `http://localhost/api/order-panel?id=${orderId}&view=readOnly` }, {}, user);
assert.equal(readOnlyResponse.status, 200);
assert.equal('collectionCharges' in readOnlyResponse.data, false);
assert.equal('rate' in readOnlyResponse.data.plantRows[0], false);
const editorResponse = await orderGet({ url: `http://localhost/api/order-panel?id=${orderId}` }, {}, user);
assert.equal(editorResponse.data.collectionCharges, 150, 'Editor data and calculations remain available');
console.log('PASS: full order rendering in all three views; independent non-financial view files, four packing types, allocations, history, financial/contact exclusion; number-only and stale VNN links; scoped read-only detail API, submitted-only preview and VNN link authorization. No database changes.');
