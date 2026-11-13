import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { masterNameQuery } from '../src/lib/masterNameUniqueness.mjs';
const require = createRequire(import.meta.url);
const parser = require('@babel/parser');
const source = fs.readFileSync('src/app/api/plants/route.js', 'utf8');
const ast = parser.parse(source, { sourceType: 'module' });
const node = ast.program.body.find(n => n.type === 'ExportNamedDeclaration' && n.declaration?.id?.name === 'PUT').declaration;
let denied = false, calls = [], saves = 0, duplicate = false, duplicateName = false, found = true;
const plant = { name: 'Old', code: 'OLD', companyId: 'tenant-1', save: async () => { saves++; } };
let expectedAction = 'edit';
const deps = {
  masterNameQuery,
  connectDb: async () => {},
  validateUser: async (_req, action) => { assert.equal(action, expectedAction); return denied ? { error: 'No edit permission', status: 403 } : { user: { companyId: 'tenant-1' } }; },
  NextResponse: { json: (body, options) => ({ ...body, status: options?.status || 200 }) },
  mongoose: { isValidObjectId: id => /^[a-f\d]{24}$/i.test(id) },
  Plant: { findOne: async query => { calls.push(query); if (query.$or) return duplicateName ? { _id: 'duplicate-name' } : null; return query._id?.$ne ? duplicate ? { _id: 'duplicate' } : null : found ? plant : null; } },
  console,
};
const put = new Function(...Object.keys(deps), source.slice(node.start, node.end) + ';return PUT;')(...Object.values(deps));
const id = '111111111111111111111111';
const req = (body, plantId = id) => ({ url: `http://localhost/api/plants?id=${plantId}`, json: async () => body });
denied = true;
assert.equal((await put(req({ name: 'New', code: 'NEW' }))).status, 403);
assert.equal(calls.length, 0);
denied = false;
assert.equal((await put(req({ name: 'New', code: 'NEW' }, 'bad'))).status, 400);
assert.equal((await put(req({ name: ' ', code: 'NEW' }))).status, 400);
found = false;
assert.equal((await put(req({ name: 'New', code: 'NEW' }))).status, 404);
found = true; duplicate = true;
assert.equal((await put(req({ name: 'New', code: 'NEW' }))).status, 409);
assert.equal(saves, 0);
duplicate = false; duplicateName = true;
assert.equal((await put(req({ name: 'Chennai', code: '9003' }))).status, 409);
assert.equal(saves, 0);
duplicateName = false; calls = [];
assert.equal((await put(req({ name: ' New ', code: ' NEW ', companyId: 'tenant-2' }))).status, 200);
assert.equal(saves, 1);
assert.equal(plant.name, 'New'); assert.equal(plant.code, 'NEW'); assert.equal(plant.companyId, 'tenant-1');
assert.ok(calls.every(query => query.companyId === 'tenant-1'));
assert.deepEqual(calls[1]._id, { $ne: id });
const nameCheck = calls[1].$or[0].name;
const regex = new RegExp(nameCheck.$regex, nameCheck.$options);
assert.ok(regex.test(' New ')); assert.ok(regex.test('new')); assert.ok(!regex.test('New Extra'));
const postNode = ast.program.body.find(n => n.type === 'ExportNamedDeclaration' && n.declaration?.id?.name === 'POST').declaration;
const post = new Function(...Object.keys(deps), source.slice(postNode.start, postNode.end) + ';return POST;')(...Object.values(deps));
expectedAction = 'create';
duplicateName = true;
assert.equal((await post(req({ name: 'Chennai', code: '9006' }))).status, 409);
assert.equal((await post(req({ name: ' ', code: '9006' }))).status, 400);
console.log('PASS: plant create/edit duplicate names, case/space handling, permissions, tenant isolation, duplicate code, and scoped update.');
