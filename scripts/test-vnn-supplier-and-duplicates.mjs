import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const parser = require('@babel/parser');
const route = fs.readFileSync('src/app/api/vehicle-negotiation/route.js', 'utf8');
const ast = parser.parse(route, { sourceType: 'module' });
const fn = ast.program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'withSavedSupplierNames');
let supplierFilter, supplierOptions;
const Supplier = { find(filter) {
  supplierFilter = filter;
  return { setOptions(options) { supplierOptions = options; return this; }, select() { return this; }, async lean() {
    return [{ _id: 'supplier-id', supplierCode: 'SUP-1', supplierName: 'Saved supplier' }];
  } };
} };
const mongoose = { Types: { ObjectId: { isValid: value => value === 'supplier-id' } }, isValidObjectId: value => value === 'panel-id' };
const hydrate = new Function('Supplier', 'mongoose', `${route.slice(fn.start, fn.end)}; return withSavedSupplierNames;`)(Supplier, mongoose);
const user = { companyId: 'tenant', activeOperatingCompanyId: 'operating-company' };
const hydrated = await hydrate({ vendors: [{ vendorCode: 'SUP-1' }, { vendorName: 'Historical name', vendorCode: 'SUP-1' }], approval: { vendorId: 'supplier-id' } }, user);
assert.equal(hydrated.approval.vendorName, 'Saved supplier');
assert.equal(hydrated.vendors[0].vendorName, 'Saved supplier');
assert.equal(hydrated.vendors[1].vendorName, 'Historical name');
assert.equal(supplierFilter.companyId, 'tenant');
assert.equal(supplierFilter.subCompanyId, undefined);
assert.equal(supplierOptions.includeUnapprovedMasters, true);

// Exercise the actual dropdown effect with options that omit a saved supplier.
const edit = fs.readFileSync('src/app/(dashboard)/admin/vehicle-negotiation/[id]/page.jsx', 'utf8');
const start = edit.lastIndexOf('  const isUpdatingRef = useRef(false);');
const effectStart = edit.indexOf('  useEffect(() => {', start);
const effectEnd = edit.indexOf('\n  useEffect(', effectStart + 1);
let display;
new Function('useEffect', 'isUpdatingRef', 'selectedId', 'items', 'displayField', 'codeField', 'setSelectedItem', 'setSearchQuery', edit.slice(effectStart, effectEnd))(
  callback => callback(), { current: false }, 'Historical name', [], 'supplierName', 'supplierCode', () => {}, value => { display = value; });
assert.equal(display, 'Historical name');

const guardSource = fs.readFileSync('src/lib/vnnOrderExclusivity.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export async function', 'async function');
let conflict = null, conflictFilter, locks = 0;
const session = {};
const query = rows => ({ select() { return this; }, session(actual) { assert.equal(actual, session); return this; }, async lean() { return rows; } });
const OrderPanel = {
  find: () => query([{ _id: 'panel-id', orderPanelNo: 'ORDER-1' }]),
  async updateMany(filter, update, options) { assert.equal(options.session, session); assert.equal(update.$inc.__v, 1); locks++; },
};
const VehicleNegotiation = { findOne(filter) { assert(locks > 0, 'Lock source before reading conflicts'); conflictFilter = filter; return query(conflict); } };
const guard = new Function('OrderPanel', 'VehicleNegotiation', 'companyScopeFilter', 'mongoose', `${guardSource}; return assertVnnOrdersAvailable;`)(OrderPanel, VehicleNegotiation, (identity, filter) => ({ ...filter, companyId: identity.companyId, subCompanyId: identity.activeOperatingCompanyId }), mongoose);
for (const links of [
  { orders: [{ orderNo: 'ORDER-1' }] },
  { orders: [{ orderPanelId: 'panel-id' }] },
  { selectedOrderPanels: [{ _id: 'panel-id', orderPanelNo: 'ORDER-1' }] },
]) {
  conflict = null;
  await guard(user, { _id: 'current', ...links }, session);
  assert.equal(conflictFilter._id.$ne, 'current');
  assert.equal(conflictFilter.panelStatus.$ne, 'Cancelled');
  assert.equal(conflictFilter['cancellation.state'].$ne, 'cancelled');
  assert.equal(conflictFilter.companyId, 'tenant');
  assert.equal(conflictFilter.subCompanyId, 'operating-company');
  assert(conflictFilter.$or.some(item => item['orders.orderNo']?.$in.includes('ORDER-1')));
  assert(conflictFilter.$or.some(item => item['orders.orderPanelId']?.$in.includes('panel-id')));
  conflict = { vnnNo: 'VNN-EXISTING' };
  await assert.rejects(guard(user, { _id: 'current', ...links }, session), error => error.status === 409 && error.message.includes('VNN-EXISTING'));
}
for (const path of ['src/app/api/vehicle-negotiation/route.js', 'src/lib/vnnOrderExclusivity.js', 'src/app/(dashboard)/admin/vehicle-negotiation/[id]/page.jsx']) {
  parser.parse(fs.readFileSync(path, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
}
console.log('PASS supplier recovery, historical dropdown display, transactional order guards by ID/number, conflict responses, and changed-file syntax.');
