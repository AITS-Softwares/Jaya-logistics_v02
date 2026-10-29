import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { canAccessBranches } from '../src/lib/branchOwnership.mjs';
import { safeNotificationUrl } from '../src/lib/pushPolicy.mjs';
const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const permitted = action => ({ selected: true, permissions: { [action]: true } });
const candidates = [
  { _id: 'approver', modules: { 'Order Panel': permitted('approve') }, branchIds: ['b'], accessAllBranches: false, operatingCompanyIds: ['op'] },
  { _id: 'creator', modules: { 'Order Panel': permitted('view'), 'Vehicle Negotiation': permitted('create') }, branchIds: ['b'], accessAllBranches: false, operatingCompanyIds: ['op'] },
  { _id: 'pricing-approver', modules: { 'Pricing Panel - Part 2 Approval': permitted('approve') }, branchIds: ['b'], accessAllBranches: false, operatingCompanyIds: ['op'] },
  { _id: 'wrong-pricing-module', modules: { 'Pricing Panel': permitted('approve') }, branchIds: ['b'], accessAllBranches: false, operatingCompanyIds: ['op'] },
  { _id: 'other-branch', modules: { 'Order Panel': permitted('approve') }, branchIds: ['other'], accessAllBranches: false, operatingCompanyIds: ['op'] },
  { _id: 'other-company', modules: { 'Order Panel': permitted('approve') }, branchIds: ['b'], accessAllBranches: false, operatingCompanyIds: ['other'] },
];
let inserted = [];
let companyFilter;
const deps = {
  CompanyUser: { find: query => { companyFilter = query; return { select: () => ({ lean: async () => candidates }) }; } },
  Notification: { insertMany: async rows => { inserted = rows; } },
  branchContext: { getStore: () => ({ user: { activeOperatingCompanyId: 'op' } }) },
  notificationBranchSource: async () => ({ ownership: ['b'], sourceModel: 'OrderPanel', sourceRecordId: 'source' }),
  canAccessBranches, key: String, safeNotificationUrl,
};
const source = fs.readFileSync('src/lib/workflowNotifications.js','utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g,'');
const helpers = new Function(...Object.keys(deps), `${source}\nreturn {notifyModuleApprovers,notifyModuleCreateUsers,notifyModuleDecision};`)(...Object.values(deps));
const user = { id: 'actor', type: 'user', companyId: 'company', activeOperatingCompanyId: 'op' };
const id = '507f1f77bcf86cd799439011';
await helpers.notifyModuleApprovers({ user, module: 'Order Panel', panelLabel: 'Order Panel', reference: 'OP-1', url: `/admin/order-panel/${id}` });
assert.equal(companyFilter.companyId, 'company');
assert.deepEqual(inserted.map(row => row.assignedTo), ['approver']);
assert.equal(inserted[0].url, `/admin/order-panel/approve/${id}`);
assert.equal(inserted[0].requiredAction, 'approve');
await helpers.notifyModuleApprovers({ user, module: 'Pricing Panel - Part 2 Approval', panelLabel: 'Pricing Panel', reference: 'PR-1', url: `/admin/pricing-panel/${id}` });
assert.deepEqual(inserted.map(row => row.assignedTo), ['pricing-approver']);
assert.equal(inserted[0].url, `/admin/pricing-panel/approve/${id}`);
await helpers.notifyModuleCreateUsers({ user, module: 'Vehicle Negotiation', panelLabel: 'Order Panel', reference: 'OP-1', url: '/admin/vehicle-negotiation/create' });
assert.deepEqual(inserted.map(row => row.assignedTo), ['creator']);
assert.match(inserted[0].message, /Vehicle Negotiation is ready to create/);
await helpers.notifyModuleDecision({ user, record: { createdBy: 'creator' }, module: 'Order Panel', reference: 'OP-1', action: 'approve', url: `/admin/order-panel/${id}` });
assert.deepEqual(inserted.map(row => row.assignedTo), ['creator']);
assert.match(inserted[0].message, /was approved/);
inserted = [];
await helpers.notifyModuleDecision({ user, record: { createdBy: 'actor' }, module: 'Order Panel', reference: 'OP-1', action: 'approve' });
assert.equal(inserted.length, 1, 'Self-approval remains visible in the admin overview');
assert.equal(inserted[0].assignedTo, null, 'Self-approval does not generate a redundant personal alert');
assert.equal(inserted[0].pushState, 'skipped');
await helpers.notifyModuleDecision({ user, record: { createdBy: 'creator' }, module: 'Order Panel', reference: 'OP-1', action: 'reject', url: '/admin/order-panel' });
assert.match(inserted[0].message, /returned for correction/);

function calls(node, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (node.type === 'CallExpression' && node.callee?.type === 'Identifier') found.push(node.callee.name);
  for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(child => calls(child, found)); else if (value && typeof value === 'object') calls(value, found);
  return found;
}
for (const panel of ['order-panel','vehicle-negotiation','pricing-panel','loading-panel','consignment-note','purchase-panel','Advance-Payment','pod-panel','balance-payment']) {
  const code = fs.readFileSync(`src/app/api/${panel}/route.js`, 'utf8');
  const ast = parse(code, { sourceType: 'module', plugins: ['jsx'] });
  const handler = name => ast.program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === name || node.type === 'VariableDeclaration' && node.declarations.some(item => item.id.name === name));
  const post = handler('branchHandlerPOST');
  const patch = handler('branchHandlerPATCH');
  if (panel !== 'pricing-panel') assert(calls(post).includes('notifyModuleApprovers'), panel + ' initial submission needs an approval trigger');
  else assert(calls(patch).includes('notifyModuleApprovers'), 'Pricing notifies only when Part 1 explicitly submits to Part 2');
  assert(calls(patch).includes('notifyModuleDecision'), panel + ' approval outcome needs a creator notification');
}
console.log('PASS: all nine panel submit/decision triggers, dedicated Pricing approval targeting, review links, branch/company scope, next-create messages and creator outcomes.');
