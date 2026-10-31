import { unwrapBranchHandlers } from './route-business-source.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canUnlockForCorrection } from '../src/lib/reapprovalPermissions.mjs';

const panels = { order: 'Order Panel', vnn: 'Vehicle Negotiation', pricing: 'Pricing Panel - Part 2 Approval', loading: 'Loading Info', lr: 'Consignment Note' };
for (const [type, module] of Object.entries(panels)) {
  const user = (permissions, selected = true) => ({ modules: { [module]: { selected, permissions } } });
  assert.equal(canUnlockForCorrection(user({ approve: true }), type), true);
  assert.equal(canUnlockForCorrection(user({ edit: true, view: true }), type), false);
  assert.equal(canUnlockForCorrection(user({ approve: true }, false), type), false);
  assert.equal(canUnlockForCorrection(user({ approve: 'true' }), type), false);
  assert.equal(canUnlockForCorrection({ roles: ['Admin'] }, type), true);
  assert.equal(canUnlockForCorrection({ type: 'company' }, type), true);
  for (const other of Object.keys(panels).filter(key => key !== type)) {
    assert.equal(canUnlockForCorrection(user({ approve: true }), other), false);
  }
}
assert.equal(canUnlockForCorrection({ modules: { 'Pricing Panel': { selected: true, permissions: { approve: true } } } }, 'pricing'), false);
assert.equal(canUnlockForCorrection(null, 'order'), false);
assert.equal(canUnlockForCorrection({ type: 'company' }, 'unknown'), false);
const route = fs.readFileSync(new URL('../src/app/api/reapproval/[type]/[id]/route.js', import.meta.url), 'utf8');
assert(route.includes('if (!canUnlockForCorrection(user, type)) return NextResponse.json'));
assert(route.includes('canUnlockForCorrection: canUnlockForCorrection(user, type)'));
assert(route.includes("Only an admin can retry a failed downstream sync."));
console.log('PASS: panel-scoped correction unlock permissions, Admin access, dedicated Pricing approval, and denied edit-only/cross-panel access.');

// Exercise the real POST authorization boundary before any transaction starts.
let actingUser;
const dependencies = {
  canUnlockForCorrection,
  connectDb: async () => {},
  verifyToken: () => actingUser,
  NextResponse: { json: (body, options = {}) => ({ ...body, status: options.status || 200 }) },
  mongoose: { isValidObjectId: () => true },
  TYPES: Object.fromEntries(Object.keys(panels).map(type => [type, {}])),
};
const source = unwrapBranchHandlers(route).replace(/^import .*;\r?\n/gm, '').replace(/export async function /g, 'async function ');
const post = new Function(...Object.keys(dependencies), source + '\nreturn POST;')(...Object.values(dependencies));
for (const [type, module] of Object.entries(panels)) {
  const request = action => ({ json: async () => ({ action }) });
  const params = { params: Promise.resolve({ type, id: 'record' }) };
  actingUser = { modules: { [module]: { selected: true, permissions: { approve: true } } } };
  assert.equal((await post(request('unlock'), params)).status, 400, 'Panel approver reaches required-reason validation');
  assert.equal((await post(request('retrySync'), params)).status, 403, 'Sync recovery remains Admin-only');
  for (const permissions of [{ view: true }, { edit: true }]) {
    actingUser.modules[module].permissions = permissions;
    for (const action of ['unlock', 'cancel']) assert.equal((await post(request(action), params)).status, 403);
  }
  actingUser = { modules: { [module]: { selected: false, permissions: { approve: true } } } };
  assert.equal((await post(request('unlock'), params)).status, 403);
}
console.log('PASS: real POST handler enforces unlock/cancel permissions and required unlock reasons.');
