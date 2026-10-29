// Exercise built Next route handlers against real records without changing a
// user or transaction. Only the branch assignment returned by the identity read
// is overridden in memory; MongoDB queries are otherwise real and read-only.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { MongoClient } from 'mongodb';
const require = createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd());
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
let savedFind;
await client.connect();
try {
  const db = client.db();
  const op = await db.collection('subcompanies').findOne({ code: 'JGL', isOperatingCompany: true, isActive: true });
  assert(op, 'An active JGL company is needed for the smoke check');
  const identity = await db.collection('companyusers').findOne({ companyId: op.companyId, isActive: { $ne: false },
    $or: [{ accessAllOperatingCompanies: true }, { operatingCompanyIds: op._id }] }, { projection: { _id: 1 } });
  assert(identity, 'An assigned user is needed');
  const orders = await db.collection('orderpanels').find({ companyId: op.companyId, isDeleted: { $ne: true }, branch: { $ne: null },
    $or: [{ subCompanyId: op._id }, { subCompanyId: null }] }, { projection: { _id: 1, branch: 1, branchCode: 1 } }).toArray();
  const first = orders.find(order => order.branchCode === 'GDM') || orders[0];
  const foreign = orders.find(order => String(order.branch) !== String(first.branch));
  assert(foreign, 'At least two branches are needed');
  const getOrder = require('../.next/server/app/api/order-panel/route.js').routeModule.userland.GET;
  const getLr = require('../.next/server/app/api/consignment-note/route.js').routeModule.userland.GET;
  const User = mongoose.models.CompanyUser;
  savedFind = User.findOne;
  let assignment = [first.branch];
  User.findOne = function (...args) {
    const query = savedFind.apply(this, args);
    const originalLean = query.lean;
    query.lean = async function (...leanArgs) {
      const checksAssignment = this._fields?.branchIds === 1 && String(this.getFilter()._id) === String(identity._id);
      const record = await originalLean.apply(this, leanArgs);
      return checksAssignment && record ? { ...record, accessAllBranches: false, branchIds: assignment } : record;
    };
    return query;
  };
  const token = jwt.sign({ id: String(identity._id), type: 'user', roles: ['Admin'], companyId: String(op.companyId),
    activeOperatingCompanyId: String(op._id), activeOperatingCompanyCode: op.code, activeOperatingCompanyName: op.name,
  }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const request = path => new Request(`https://example.test${path}`, { headers: { authorization: `Bearer ${token}` } });
  const own = await getOrder(request(`/api/order-panel?id=${first._id}`), {});
  assert.equal(own.status, 200);
  const denied = await getOrder(request(`/api/order-panel?id=${foreign._id}`), {});
  assert.equal(denied.status, 404, 'Admin-role claims must not bypass selected branches');
  const table = await getOrder(request('/api/order-panel?format=table'), {});
  assert.equal(table.status, 200);
  const tableData = await table.json();
  assert(tableData.data.length > 0);
  assert(tableData.data.every(row => row.branchCode === first.branchCode));
  assert.match(table.headers.get('cache-control'), /no-store/);
  const lrs = await getLr(request('/api/consignment-note'), {});
  assert.equal(lrs.status, 200);
  const lrData = await lrs.json();
  const lrGraph = globalThis.__jayaBranchContext;
  assert(lrGraph);
  // The same token must observe a newly assigned branch on its next request.
  assignment = [foreign.branch];
  assert.equal((await getOrder(request(`/api/order-panel?id=${first._id}`), {})).status, 404);
  assert.equal((await getOrder(request(`/api/order-panel?id=${foreign._id}`), {})).status, 200);
  console.log(`Read-only live route checks passed: own/foreign Orders, ${tableData.data.length} scoped table rows, ${lrData.data.length} inherited LR rows, no-store caching and fresh assignments. No database writes.`);
} finally {
  if (savedFind && mongoose.models.CompanyUser) mongoose.models.CompanyUser.findOne = savedFind;
  await mongoose.disconnect();
  await client.close();
}
