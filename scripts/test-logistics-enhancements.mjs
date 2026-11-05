import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { destinationLabel } from '../src/lib/destination.mjs';
import { loadingSubmissionError } from '../src/lib/loadingPhotoPolicy.mjs';

const original = { to: 'location-id', toName: 'Chennai', locationRemark: '  Warehouse 4, Ambattur  ' };
assert.equal(destinationLabel(original), 'Warehouse 4, Ambattur');
assert.equal(destinationLabel({ ...original, locationRemark: '  ' }), 'Chennai');
assert.equal(destinationLabel({ to: 'Chennai' }), 'Chennai');
assert.equal(original.to, 'location-id');
assert.equal(original.toName, 'Chennai');
assert.equal(loadingSubmissionError({}, 2, true), null, 'Part 2 no longer needs a loaded slip');
assert.match(loadingSubmissionError({}, 1, true), /Empty Vehicle Slip/, 'Part 1 empty slip stays mandatory');
assert.match(loadingSubmissionError({}, 2, false), /photos/, 'Photo requirements are unchanged');

function compileRoute(filename, dependencies) {
  const source = fs.readFileSync(filename, 'utf8').replace(/^import .*?;\r?\n/gm, '').replace(/^export const runtime.*?;\r?\n/gm, '').replace('export const POST =', 'const POST =').replace('export const GET =', 'const GET =');
  return new Function(...Object.keys(dependencies), source + '\nreturn typeof POST === "undefined" ? GET : POST;')(...Object.values(dependencies));
}
const json = (data, options) => ({ status: options?.status || 200, ...data });
const id = '123456789012345678901234';
const user = { companyId: 'company', _id: 'staff', name: 'Editor' };
let record = { _id: id, panelStatus: 'Approved', loadingWorkflow: { version: 2, part2Status: 'Approved' } };
let saved, stored = [], removed = [], permission;
const handler = compileRoute('src/app/api/loading-panel/[id]/loaded-slip/route.js', {
  NextResponse: { json }, path, randomUUID: () => 'unique',
  mkdir: async () => {}, writeFile: async (name, buffer) => stored.push({ name, buffer }), unlink: async name => removed.push(name),
  withAuth: (fn, rules) => { permission = rules; return fn; }, withBranchAccess: fn => fn,
  connectDb: async () => {}, companyScopeFilter: (actor, filter) => ({ ...filter, companyId: actor.companyId }),
  LoadingPanel: { findOne: scope => { assert.equal(scope.companyId, 'company'); return { select: () => ({ lean: async () => record }) }; }, updateOne: async (filter, update) => { saved = { filter, update }; return { matchedCount: 1 }; } },
});
assert.deepEqual(permission, { module: 'Loading Info', action: 'edit' });
const validFile = { type: 'application/pdf', name: 'weighment.pdf', size: 5, arrayBuffer: async () => new Uint8Array([37,80,68,70,45]).buffer };
const request = file => ({ formData: async () => ({ get: () => file }) });
let response = await handler(request(validFile), { params: Promise.resolve({ id }) }, user);
assert.equal(response.status, 200);
assert.deepEqual(Object.keys(saved.update), ['$push'], 'Late upload only appends files and audit');
assert.equal(saved.update.$push.loadedSlipUploads.uploadedBy, 'staff');
assert.equal(saved.update.$push.loadedSlipUploads.uploadedByName, 'Editor');
assert.ok(saved.update.$push.loadedSlipUploads.uploadedAt instanceof Date);
assert.equal(saved.filter['loadingWorkflow.part2Status'], 'Approved', 'Concurrent stage changes reject the upload');
assert.equal(stored.length, 1);
record = { ...record, panelStatus: 'Submitted' };
assert.equal((await handler(request(validFile), { params: { id } }, user)).status, 409);
record = { ...record, panelStatus: 'Approved', loadingWorkflow: { version: 2, part2Status: 'Submitted' } };
assert.equal((await handler(request(validFile), { params: { id } }, user)).status, 409);
record = { ...record, loadingWorkflow: { version: 2, part2Status: 'Approved' } };
assert.equal((await handler(request({ ...validFile, size: 11 * 1024 * 1024 }), { params: { id } }, user)).status, 400);
assert.equal((await handler(request({ ...validFile, type: 'text/html' }), { params: { id } }, user)).status, 400);
record = null;
assert.equal((await handler(request(validFile), { params: { id } }, user)).status, 404);
assert.equal(stored.length, 1, 'Rejected uploads write no files');

const vnnSource = fs.readFileSync('src/app/api/vehicle-negotiation/route.js', 'utf8');
const helper = vnnSource.slice(vnnSource.indexOf('\nasync function unapprovedVnnOrder('), vnnSource.indexOf('\nasync function branchHandlerPOST(', vnnSource.indexOf('\nasync function unapprovedVnnOrder(')));
let status = 'Submitted';
const guard = new Function('OrderPanel', 'companyScopeFilter', 'mongoose', helper + '\nreturn unapprovedVnnOrder;')({ find: () => ({ select: () => ({ lean: async () => [{ orderPanelNo: 'ORD-1', panelStatus: status }] }) }) }, (_, query) => query, { isValidObjectId: value => /^[a-f\d]{24}$/i.test(value || '') });
assert.match(await guard(user, [{ orderNo: 'ORD-1' }]), /must be approved/);
status = 'Approved'; assert.equal(await guard(user, [{ orderNo: 'ORD-1' }]), null);
status = 'Rejected'; assert.match(await guard(user, [], [{ _id: id }]), /must be approved/);
assert.ok(vnnSource.includes('await unapprovedVnnOrder(user, body.orders'), 'VNN creation enforces approval');
assert.ok(vnnSource.includes('await unapprovedVnnOrder(user, added'), 'VNN additions enforce approval');

let awaitingRules, query;
const awaiting = compileRoute('src/app/api/vehicle-negotiation/awaiting-orders/route.js', {
  NextResponse: { json }, withAuth: (fn, rules) => { awaitingRules = rules; return fn; }, withBranchAccess: fn => fn, connectDb: async () => {}, companyScopeFilter: (actor, filter) => ({ ...filter, companyId: actor.companyId }),
  OrderPanel: { find: filter => { query = filter; return { select: () => ({ sort: () => ({ lean: async () => [{ _id: id, orderPanelNo: 'ORD-1', createdBy: 'staff', plantRows: [original] }] }) }) }; } },
  CompanyUser: { find: () => ({ select: () => ({ lean: async () => [{ _id: 'staff', name: 'Creator', employeeId: 'employee' }] }) }) },
  Employee: { find: () => ({ select: () => ({ lean: async () => [{ _id: 'employee', phone: '9999999999' }] }) }) },
});
response = await awaiting({}, {}, user);
assert.equal(query.panelStatus, 'Submitted'); assert.equal(query.isDraft.$ne, true); assert.equal(query.companyId, 'company');
assert.deepEqual(awaitingRules, { module: 'Vehicle Negotiation', action: 'view' });
assert.equal('creator' in response.data[0], false, 'Early review does not expose creator/contact details');
assert.equal(response.data[0].rows[0].locationRemark, original.locationRemark);
console.log('PASS: destination fallback and preserved source; optional loaded slip; approved append-only upload, audit, stage guards and file limits; read-only scoped awaiting orders; VNN approval guards. No database/filesystem mutations.');
