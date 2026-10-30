// Exercise real handlers/auth with an in-memory database. Never loads .env or connects to MongoDB.
// Run: node --experimental-vm-modules scripts/test-customer-portal.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { customerApiBlocked } from '../src/lib/customerApiBoundary.mjs';
import { customerOrderView, loadingMatchesDrop, validPortalPassword } from '../src/lib/customerPortalPolicy.mjs';

process.env.JWT_SECRET = 'customer-portal-tests-only-do-not-use-in-production';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const oid = () => new mongoose.Types.ObjectId();
const tenant = oid(), otherTenant = oid(), company = oid(), otherCompany = oid(), customer = oid(), otherCustomer = oid(), adminId = oid();
const same = (a, b) => String(a) === String(b);

function matches(doc, filter) {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === '$or') return condition.some(item => matches(doc, item));
    const value = key.split('.').reduce((current, part) => current?.[part], doc);
    if (condition && typeof condition === 'object' && !condition._bsontype && !(condition instanceof Date)) {
      return Object.entries(condition).every(([operator, expected]) => {
        if (operator === '$in') return expected.some(item => item === null ? value == null : same(value, item));
        if (operator === '$ne') return !same(value, expected);
        if (operator === '$lte') return value <= expected;
        if (operator === '$regex') return new RegExp(expected, condition.$options || '').test(String(value || ''));
        if (operator === '$options') return true;
        throw new Error('Unhandled test filter: ' + operator);
      });
    }
    return same(value, condition);
  });
}

function query(value) {
  return {
    select() { return this; }, populate() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; },
    lean() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  };
}
function model(rows = []) {
  return {
    rows,
    findOne(filter) { return query(rows.find(row => matches(row, filter)) || null); },
    findById(id) { return this.findOne({ _id: id }); },
    find(filter) { return query(rows.filter(row => matches(row, filter))); },
    exists(filter) { return query(rows.some(row => matches(row, filter)) ? { _id: oid() } : null); },
    countDocuments(filter) { return query(rows.filter(row => matches(row, filter)).length); },
    async create(values) {
      if (values.email && rows.some(row => row.email === values.email)) throw Object.assign(new Error('duplicate'), { code: 11000 });
      const row = { _id: oid(), sessionVersion: 0, isActive: true, ...values };
      for (const key of ['companyId', 'customerId']) if (row[key]) row[key] = new mongoose.Types.ObjectId(String(row[key]));
      if (row.allowedOperatingCompanyIds) row.allowedOperatingCompanyIds = row.allowedOperatingCompanyIds.map(id => new mongoose.Types.ObjectId(String(id)));
      rows.push(row); return row;
    },
    findOneAndUpdate(filter, update, options = {}) {
      let row = rows.find(item => matches(item, filter));
      if (!row && options.upsert) { row = { _id: filter._id, ...update.$setOnInsert }; rows.push(row); }
      if (row) {
        Object.assign(row, update.$set || {});
        for (const [key, value] of Object.entries(update.$inc || {})) row[key] = (row[key] || 0) + value;
      }
      return query(row || null);
    },
    updateOne(filter, update) { return this.findOneAndUpdate(filter, update); },
    async deleteOne(filter) { const index = rows.findIndex(row => matches(row, filter)); if (index >= 0) rows.splice(index, 1); },
  };
}

const users = model();
const customers = model([
  { _id: customer, companyId: tenant, customerName: 'Customer A', portalAccess: true },
  { _id: otherCustomer, companyId: otherTenant, customerName: 'Customer B', portalAccess: true },
]);
const companies = model([
  { _id: company, companyId: tenant, name: 'JGL', code: 'JGL', isActive: true, isOperatingCompany: true },
  { _id: otherCompany, companyId: otherTenant, name: 'Other', code: 'OTHER', isActive: true, isOperatingCompany: true },
]);
const staff = model([{ _id: adminId, companyId: tenant, isActive: true, roles: ['Admin'], operatingCompanyIds: [company] }]);
const attempts = model();
const overrides = new Map([
  ['@/lib/db', { default: async () => {} }],
  ['@/models/CustomerUser', { default: users }],
  ['@/models/CustomerModel', { default: customers }],
  ['@/models/SubCompany', { default: companies }],
  ['@/models/CompanyUser', { default: staff }],
  ['@/models/Company', { default: model([{ _id: tenant }]) }],
  ['@/models/PortalLoginAttempt', { default: attempts }],
  ['next/server', { NextResponse: { json: (...args) => Response.json(...args), next: () => new Response() } }],
]);
const context = vm.createContext({ console, process, Response, Request, URL, TextEncoder, Buffer, atob, structuredClone, setTimeout, clearTimeout });
const modules = new Map();
async function synthetic(key, values) {
  const result = new vm.SyntheticModule(Object.keys(values), function () {
    for (const [name, value] of Object.entries(values)) this.setExport(name, value);
  }, { context, identifier: key });
  await result.link(() => {}); await result.evaluate(); return result;
}
async function load(specifier, parent = path.join(root, 'index.js')) {
  if (overrides.has(specifier)) {
    if (!modules.has(specifier)) modules.set(specifier, synthetic(specifier, overrides.get(specifier)));
    return modules.get(specifier);
  }
  if (!specifier.startsWith('@/') && !specifier.startsWith('.') && !path.isAbsolute(specifier)) {
    if (!modules.has(specifier)) modules.set(specifier, import(specifier).then(exports => synthetic(specifier, exports)));
    return modules.get(specifier);
  }
  let filename = specifier.startsWith('@/') ? path.join(root, 'src', specifier.slice(2)) : path.resolve(path.dirname(parent), specifier);
  if (!path.extname(filename)) filename += '.js';
  if (!modules.has(filename)) {
    const result = new vm.SourceTextModule(fs.readFileSync(filename, 'utf8'), { context, identifier: filename });
    modules.set(filename, result);
    await result.link((name, referencing) => load(name, referencing.identifier));
    await result.evaluate();
  }
  return modules.get(filename);
}

const adminToken = jwt.sign({ id: String(adminId), type: 'user', companyId: String(tenant), roles: ['Admin'] }, process.env.JWT_SECRET);
const companyToken = jwt.sign({ id: String(tenant), type: 'company', companyId: String(tenant) }, process.env.JWT_SECRET);
const employeeToken = jwt.sign({ id: String(adminId), type: 'user', companyId: String(tenant), roles: ['Employee'] }, process.env.JWT_SECRET);
const request = (url, token, body, method = body ? 'POST' : 'GET') => new Request('https://test.local' + url, {
  method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const adminRoutes = (await load('@/app/api/customer-users/route')).namespace;
const auth = (await load('@/lib/customerPortalAuth')).namespace;
const login = (await load('@/app/api/portal/login/route')).namespace;
const me = (await load('@/app/api/portal/me/route')).namespace;
const sessionCheck = (await load('@/app/api/auth/me/route')).namespace;
const oldLogin = (await load('@/app/api/customers/login/route')).namespace;
const values = { name: 'Customer Dispatch', email: 'customer.login@example.test', customerId: String(customer), allowedOperatingCompanyIds: [String(company)], password: 'Client12', isActive: true };

assert.equal((await adminRoutes.POST(request('/api/customer-users', null, values))).status, 401);
staff.rows[0].roles = ['Employee'];
assert.equal((await adminRoutes.POST(request('/api/customer-users', employeeToken, values))).status, 403);
staff.rows[0].roles = ['Admin'];
assert.equal((await adminRoutes.POST(request('/api/customer-users', adminToken, { ...values, customerId: String(otherCustomer) }))).status, 400);
assert.equal((await adminRoutes.POST(request('/api/customer-users', adminToken, { ...values, allowedOperatingCompanyIds: [String(otherCompany)] }))).status, 400);
assert.equal((await adminRoutes.POST(request('/api/customer-users', adminToken, { ...values, password: 'short' }))).status, 400);
assert.equal((await adminRoutes.POST(request('/api/customer-users', adminToken, values))).status, 201);
assert.equal((await adminRoutes.POST(request('/api/customer-users', companyToken, values))).status, 409);
const account = users.rows[0];
assert.ok(same(account.companyId, tenant));
assert.notEqual(account.password, values.password);
assert.ok(await bcrypt.compare(values.password, account.password));
assert.equal(customers.rows[0].emailId, undefined, 'Creating a login must not change the Customer Master email.');

assert.equal((await login.POST(request('/api/portal/login', null, { email: values.email, password: 'incorrect' }))).status, 401);
let response = await login.POST(request('/api/portal/login', null, { email: ' CUSTOMER.LOGIN@EXAMPLE.TEST ', password: values.password }));
assert.equal(response.status, 200);
let data = await response.json();
let token = data.token;
assert.equal(data.customer.mustChangePassword, undefined);
assert.ok(!JSON.stringify(data.customer).includes('password'));
assert.throws(() => jwt.verify(token, process.env.JWT_SECRET), /signature/);
assert.ok(customerApiBlocked('/api/order-panel', 'Bearer ' + token));
assert.ok(customerApiBlocked('/api/company/users', 'Bearer ' + token));
assert.equal(customerApiBlocked('/api/portal/orders', 'Bearer ' + token), false);
const oldCustomerToken = jwt.sign({ id: String(customer), type: 'customer', companyId: String(tenant) }, process.env.JWT_SECRET);
assert.ok(customerApiBlocked('/api/customers', 'Bearer ' + oldCustomerToken));
assert.equal((await sessionCheck.GET(request('/api/auth/me', oldCustomerToken))).status, 401);
assert.equal((await sessionCheck.GET(request('/api/auth/me', token))).status, 200);
assert.equal((await me.GET(request('/api/portal/me', adminToken))).status, 401);
const access = await auth.requireCustomer(request('/api/portal/orders', token));
assert.equal(access.session.customerId, String(customer), 'Admin-set credentials grant immediate order access.');
assert.equal(access.session.mustChangePassword, undefined);

customers.rows[0].portalAccess = false;
await assert.rejects(auth.requireCustomer(request('/api/portal/orders', token)), /portal access is unavailable/);
customers.rows[0].portalAccess = true;
companies.rows[0].isActive = false;
await assert.rejects(auth.requireCustomer(request('/api/portal/orders', token)), /No operating companies/);
companies.rows[0].isActive = true;

const ownOrder = { _id: oid(), companyId: tenant, customerId: customer, subCompanyId: company, orderPanelNo: 'OP-0001', panelStatus: 'Approved', isDraft: false, reapprovalState: 'none', plantRows: [{ _id: oid(), fromName: 'A', toName: 'B', weight: 20.5, rate: 9000, statusReason: 'Internal', statusHistory: ['private'], status: 'Open' }] };
const loading = { _id: oid(), companyId: tenant, subCompanyId: company, panelStatus: 'Approved', vehicleInfo: { vehicleNo: 'MH01TEST', driverMobileNo: 'private' }, orderRows: [{ orderPanelId: String(ownOrder._id), orderRowId: String(ownOrder.plantRows[0]._id) }] };
const view = customerOrderView(ownOrder, [loading, { ...loading, _id: oid(), companyId: otherTenant }, { ...loading, _id: oid(), panelStatus: 'Cancelled' }, { ...loading, _id: oid(), orderRows: [{ orderNo: 'OP-0001' }] }]);
assert.equal(view.rows[0].vehicles.length, 1);
assert.equal(view.rows[0].vehicles[0].trackingAvailable, false);
assert.equal(loadingMatchesDrop({ ...loading, subCompanyId: otherCompany }, ownOrder, ownOrder.plantRows[0]), false);
for (const secret of ['rate', 'statusReason', 'statusHistory', 'driverMobileNo', '9000', 'Internal']) assert.ok(!JSON.stringify(view).includes(secret));
const splitView = customerOrderView(ownOrder, [loading, { ...loading, _id: oid(), vehicleInfo: { vehicleNo: 'MH02SPLIT' } }]);
assert.equal(splitView.rows[0].vehicles.length, 2, 'Split drops retain each assigned vehicle.');

const orderRows = [ownOrder, { ...ownOrder, _id: oid(), customerId: otherCustomer }, { ...ownOrder, _id: oid(), companyId: otherTenant }, { ...ownOrder, _id: oid(), subCompanyId: otherCompany }, { ...ownOrder, _id: oid(), isDraft: true }, { ...ownOrder, _id: oid(), isDeleted: true }, { ...ownOrder, _id: oid(), reapprovalState: 'unlocked' }];
const rawDb = {
  collection(name) {
    const rows = name === 'orderpanels' ? orderRows : [];
    return {
      async findOne(filter) { return rows.find(row => matches(row, filter)) || null; },
      async countDocuments(filter) { return rows.filter(row => matches(row, filter)).length; },
      find(filter) {
        const found = rows.filter(row => matches(row, filter));
        return { sort() { return this; }, skip() { return this; }, limit() { return this; }, async toArray() { return found; } };
      },
    };
  },
};
const previousDb = mongoose.connection.db;
mongoose.connection.db = rawDb;
try {
  const list = (await load('@/app/api/portal/orders/route')).namespace;
  const detail = (await load('@/app/api/portal/orders/[id]/route')).namespace;
  response = await list.GET(request('/api/portal/orders?customerId=' + otherCustomer + '&companyId=' + otherTenant, token));
  assert.equal(response.status, 200);
  data = await response.json();
  assert.equal(data.orders.length, 1);
  for (const foreign of orderRows.slice(1)) {
    assert.equal((await detail.GET(request('/api/portal/orders/' + foreign._id, token), { params: Promise.resolve({ id: String(foreign._id) }) })).status, 404);
  }
  assert.equal((await detail.GET(request('/api/portal/orders/bad', token), { params: Promise.resolve({ id: 'bad' }) })).status, 404);
  assert.equal((await detail.GET(request('/api/portal/orders/' + ownOrder._id, token), { params: Promise.resolve({ id: String(ownOrder._id) }) })).status, 200);
  const originalCollection = rawDb.collection.bind(rawDb);
  rawDb.collection = name => {
    if (name === 'loadingpanels') return { async findOne(filter) { return matches(loading, filter) ? loading : null; } };
    if (name === 'drivertrips') return { async findOne() { return null; } };
    return originalCollection(name);
  };
  const tracking = (await load('@/app/api/portal/orders/[id]/tracking/route')).namespace;
  const trackingUrl = '/api/portal/orders/' + ownOrder._id + '/tracking?dispatchId=' + loading._id;
  response = await tracking.GET(request(trackingUrl, token), { params: Promise.resolve({ id: String(ownOrder._id) }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).tracking.available, false, 'Never fabricate live location without an active trip.');
  loading.orderRows.push({ orderPanelId: String(orderRows[1]._id), orderRowId: String(oid()) });
  assert.equal((await tracking.GET(request(trackingUrl, token), { params: Promise.resolve({ id: String(ownOrder._id) }) })).status, 409, 'Block live location for mixed-customer dispatches.');
  loading.orderRows.pop();
  assert.equal((await tracking.GET(request(trackingUrl, token), { params: Promise.resolve({ id: String(orderRows[1]._id) }) })).status, 404);
} finally { mongoose.connection.db = previousDb; }

response = await adminRoutes.PUT(request('/api/customer-users', adminToken, { ...values, id: String(account._id), password: '', isActive: false }, 'PUT'));
assert.equal(response.status, 200);
await assert.rejects(auth.requireCustomer(request('/api/portal/orders', token)), /access has changed/);
assert.equal((await login.POST(request('/api/portal/login', null, { email: values.email, password: values.password }))).status, 401);
account.isActive = true;
response = await adminRoutes.PUT(request('/api/customer-users', adminToken, { ...values, id: String(account._id), password: 'Reset123' }, 'PUT'));
assert.equal(response.status, 200);
response = await oldLogin.POST(request('/api/customers/login', null, { email: values.email, password: 'Reset123' }));
assert.equal(response.status, 200);
assert.equal((await response.json()).customer.mustChangePassword, undefined);

for (let index = 0; index < 10; index++) assert.equal((await login.POST(request('/api/portal/login', null, { email: 'unknown@example.test', password: 'wrong' }))).status, 401);
assert.equal((await login.POST(request('/api/portal/login', null, { email: 'unknown@example.test', password: 'wrong' }))).status, 429);
assert.equal(validPortalPassword('😀'.repeat(20)), false, 'Reject bcrypt-truncated UTF-8 passwords.');

// Compile the real account schema as well, without any connection or model-query stubs.
const actualModel = (await load(path.join(root, 'src/models/CustomerUser.js'))).namespace.default;
const invalidModel = new actualModel({ name: 'No owner', email: 'test@example.test', password: 'hash' });
assert.ok(invalidModel.validateSync().errors.companyId);
assert.ok(invalidModel.validateSync().errors.customerId);

console.log('PASS: admin/customer isolation, assignment validation, admin password hashing/reset, session revocation, old-login retirement, login throttling, order ownership, safe fields and split vehicles. No database connection was made.');
