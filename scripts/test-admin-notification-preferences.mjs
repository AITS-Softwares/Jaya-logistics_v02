import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as policy from '../src/lib/adminNotificationPolicy.mjs';
import { describeWork, workListPath } from '../src/lib/notificationCenter.mjs';

const record = { module: 'Loading Info', reapprovalState: 'pendingApproval', path: '/admin/Loading-Info/approve/one' };
assert.equal(workListPath(record), '/admin/Loading-Info');
assert.equal(describeWork(record).action, 'Review approval');
assert.equal(describeWork(record, { overview: true }).action, 'View pending');
assert.equal(describeWork({ ...record, reapprovalState: 'unlocked' }, { overview: true }).title, 'Record under correction');
assert.equal(describeWork({ ...record, reapprovalState: 'unlocked' }).action, 'Continue editing');
assert.equal(workListPath({ type: 'billing', path: '/admin/Billing/reports?client=yara' }), '/admin/Billing/reports?client=yara');
assert.equal(policy.isNotificationAdmin({ roles: ['Admin'] }), true);
assert.equal(policy.isNotificationAdmin({ type: 'company' }), true);
assert.equal(policy.isNotificationAdmin({ roles: ['Operator'] }), false);
assert.equal(policy.allowAdminPush({ type: 'billing-reminder' }), false);
assert.equal(policy.allowAdminPush({ type: 'billing-reminder' }, { billing: true }), true);
assert.equal(policy.allowAdminPush({ type: 'workflow-decision:reject:loading' }), true);
assert.equal(policy.allowAdminPush({ type: 'unknown' }), false);

let user = { id: 'a', companyId: 'c', type: 'user', roles: ['Admin'] };
const records = [];
let writes = 0;
const source = fs.readFileSync('src/app/api/notifications/preferences/route.js', 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
const deps = { ...policy, NextResponse: { json: (data, init = {}) => ({ data, status: init.status || 200 }) },
  pushIdentity: async () => { if (!user) throw Object.assign(new Error('Sign in'), { status: 401 }); return user; },
  NotificationPreference: {
    findOne: filter => ({ lean: async () => records.find(row => row.company === filter.company && row.account === filter.account) }),
    findOneAndUpdate: (filter, update) => ({ lean: async () => {
      writes++;
      let row = records.find(row => row.company === filter.company && row.account === filter.account);
      if (!row) { row = { ...filter, ...policy.adminPushDefaults }; records.push(row); }
      Object.assign(row, update.$set);
      return row;
    } }),
  },
};
const api = new Function(...Object.keys(deps), `${source}\nreturn {GET,PATCH};`)(...Object.values(deps));
const request = (method, body) => ({ method, json: async () => body });
assert.deepEqual((await api.GET(request('GET'))).data.preferences, policy.adminPushDefaults);
let response = await api.PATCH(request('PATCH', { approvals: true }));
assert.equal(response.data.preferences.approvals, true);
assert.equal((await api.GET(request('GET'))).data.preferences.approvals, true, 'Preferences survive reload');
assert.deepEqual(Object.keys(records[0]).sort(), ['company', 'account', ...Object.keys(policy.adminPushDefaults)].sort());
for (const body of [{ company: 'forged', approvals: true }, { account: 'other' }, { approvals: 'true' }, [], {}, null]) {
  assert.equal((await api.PATCH(request('PATCH', body))).status, 400);
}
assert.equal(writes, 1, 'Invalid requests must never write');
user = { ...user, id: 'other-admin' };
assert.equal((await api.GET(request('GET'))).data.preferences.approvals, false);
user = { ...user, id: 'a', companyId: 'other-company' };
assert.equal((await api.GET(request('GET'))).data.preferences.approvals, false);
user = { ...user, roles: ['Operator'] };
assert.equal((await api.PATCH(request('PATCH', { approvals: true }))).status, 403);
user = null;
assert.equal((await api.GET(request('GET'))).status, 401);

const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
for (const path of ['src/components/NotificationBell.jsx', 'src/app/api/notifications/preferences/route.js',
  'src/models/project/NotificationPreference.js', 'src/lib/pushDelivery.mjs']) {
  parse(fs.readFileSync(path, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
}
console.log('PASS: admin oversight wording/list links, employee actions, persisted preference defaults, strict validation and account/company isolation.');
