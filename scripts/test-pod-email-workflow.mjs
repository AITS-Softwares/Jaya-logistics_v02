import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buildPodAcknowledgementEmail, ACK_ALLOWED_STATUSES } from '../src/lib/podAcknowledgementEmail.js';
const require = createRequire(import.meta.url), parser = require('@babel/parser');
const main = fs.readFileSync('src/app/api/pod-panel/route.js', 'utf8');
const mainAst = parser.parse(main, { sourceType: 'module' });
const sectionFn = mainAst.program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'buildStatusSection');
const buildSection = new Function('str', 'SECTION_STATUSES', main.slice(sectionFn.start, sectionFn.end) + '\nreturn buildStatusSection;')(value => String(value ?? ''), ['Pending', ...ACK_ALLOWED_STATUSES]);
let section = buildSection({ ackMailRequested: true, acknowledgementMail: true, ackMailSentAt: 'forged' }, {}, { canApprove: false, canSetEmailRequest: true });
assert.equal(section.ackMailRequested, true); assert.equal(section.acknowledgementMail, false); assert.equal(section.ackMailSentAt, null);
assert.equal(buildSection({ ackMailRequested: false }, section, { canApprove: true }).ackMailRequested, true, 'Approval cannot overwrite creator/editor choice');
assert.equal(buildSection({ ackMailRequested: false }, section, { canApprove: false, canSetEmailRequest: true }).ackMailRequested, false);
assert.equal(buildSection({ ackMailRequested: 'true' }, {}, { canApprove: true, canSetEmailRequest: true }).ackMailRequested, false);
assert.equal(buildSection({}, {}, { canApprove: true }).ackMailRequested, false, 'Legacy and new records default to no email');
const id = '123456789012345678901234', user = { companyId: 'company', id: 'staff', name: 'Approver' };
const fresh = () => ({ _id: id, companyId: 'company', approvalStatus: 'Approved', podStatus: 'Received', isDraft: false, podNo: 'POD-1', purchaseNo: 'PUR-1', vendorFinancial: { vendorCode: 'SUP-1', total: 100 }, podStatusSection: { ackMailRequested: true, acknowledgementMail: false, ackMailSentAt: null, podStatus: 'Clear & Ok' } });
let pod = fresh(), sendCount = 0, writes = 0, mailFails = false, emailIssue = '', recipient = 'supplier@example.com', waitMail = null;
const get = (value, key) => key.split('.').reduce((result, part) => result?.[part], value);
const matches = (doc, query) => Object.entries(query).every(([key, expected]) => {
  if (key === '$or') return expected.some(item => matches(doc, item));
  const value = get(doc, key);
  if (expected === null) return value == null;
  if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
    if ('$ne' in expected) return value !== expected.$ne;
    if ('$nin' in expected) return !expected.$nin.includes(value);
    if ('$lte' in expected) return value != null && new Date(value) <= expected.$lte;
  }
  return expected instanceof Date ? +new Date(value) === +expected : value === expected;
});
const set = (key, value) => { const parts = key.split('.'); let current = pod; for (const part of parts.slice(0, -1)) current = current[part] ||= {}; current[parts.at(-1)] = value; };
const update = async (query, changes) => {
  if (!matches(pod, query)) return { matchedCount: 0 };
  writes++;
  for (const [key, value] of Object.entries(changes.$set || {})) set(key, value);
  for (const [key, value] of Object.entries(changes.$inc || {})) set(key, (get(pod, key) || 0) + value);
  for (const key of Object.keys(changes.$unset || {})) { const parts = key.split('.'); delete pod[parts[0]][parts[1]]; }
  return { matchedCount: 1 };
};
const rules = [];
const deps = {
  NextResponse: { json: (body, options) => ({ ...body, status: options?.status || 200 }) }, randomUUID: () => 'attempt-'+Math.random(), connectDb: async () => {},
  withAuth: (fn, options) => { rules.push(options); return fn; }, withBranchAccess: fn => fn, companyScopeFilter: (actor, query) => ({ ...query, companyId: actor.companyId }),
  POD: { findOne: query => ({ lean: async () => matches(pod, query) ? structuredClone(pod) : null }), updateOne: update },
  Supplier: { findOne: () => ({ select: () => ({ lean: async () => ({ supplierName: 'Supplier', emailId: recipient }) }) }) },
  EmailMaster: { findOne: () => ({ sort: () => ({ lean: async () => ({ email: 'accounts@example.com' }) }) }) },
  getEmailMasterIssue: () => emailIssue,
  sendMailFromEmailMaster: async () => { sendCount++; if (waitMail) await waitMail; if (mailFails) throw new Error('SMTP unavailable'); },
  buildPodAcknowledgementEmail, ACK_ALLOWED_STATUSES, console: { error() {} },
};
const apiSource = fs.readFileSync('src/app/api/pod-panel/[id]/acknowledgement/route.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/^export const runtime.*;\r?\n/gm, '').replace(/^export const /gm, 'const ');
const api = new Function(...Object.keys(deps), apiSource + '\nreturn { GET, POST };')(...Object.values(deps));
assert.ok(rules.every(rule => rule.module === 'Proof Of Delivery' && rule.action === 'approve'));
const req = body => ({ text: async () => body === undefined ? '' : JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id }) };
pod.podStatusSection.ackMailRequested = false;
assert.equal((await api.GET({}, ctx, user)).data.canSend, false);
assert.equal((await api.POST(req(), ctx, user)).status, 400); assert.equal(sendCount, 0);
pod = fresh(); pod.approvalStatus = 'Pending'; pod.podStatusSection.podStatus = 'Pending';
let result = await api.POST(req({ action: 'preview', podStatusSection: { podStatus: 'Deductions', dueDate: '2026-12-01', ackMailRequested: false } }), ctx, user);
assert.equal(result.status, 200); assert.equal(result.data.requested, true); assert.equal(result.data.canSend, false); assert.equal(result.data.canApproveAndSend, true);
assert.ok(result.data.html.includes('01 Dec 2026')); assert.equal(pod.podStatusSection.podStatus, 'Pending'); assert.equal(writes, 0); assert.equal(sendCount, 0);
assert.equal((await api.POST(req({ action: 'send' }), ctx, user)).status, 400);
pod = fresh();
result = await api.POST(req({ action: 'send' }), ctx, user);
assert.equal(result.status, 200); assert.equal(sendCount, 1); assert.equal(pod.podStatusSection.acknowledgementMail, true); assert.equal(pod.podStatusSection.ackMailCount, 1); assert.equal(pod.podStatusSection.ackMailSentBy, 'Approver'); assert.equal(pod.podStatusSection.ackMailAttemptId, undefined);
assert.equal((await api.POST(req({ action: 'send' }), ctx, user)).status, 200); assert.equal(sendCount, 1, 'Approval retry cannot duplicate email');
assert.equal((await api.POST(req({ action: 'send', resend: true }), ctx, user)).status, 200); assert.equal(sendCount, 2); assert.equal(pod.podStatusSection.ackMailCount, 2);
pod.podStatusSection.ackMailRequested = false;
assert.equal((await api.POST(req({ resend: true }), ctx, user)).status, 400); assert.equal(sendCount, 2);
pod = fresh(); pod.isDraft = true; assert.equal((await api.POST(req(), ctx, user)).status, 400);
pod = fresh(); pod.podStatus = 'Pending'; assert.equal((await api.POST(req(), ctx, user)).status, 400);
pod = fresh(); recipient = ''; assert.equal((await api.POST(req(), ctx, user)).status, 400); recipient = 'supplier@example.com';
emailIssue = 'No active Email Master'; assert.equal((await api.POST(req(), ctx, user)).status, 400); emailIssue = '';
pod.podStatusSection.podStatus = 'Pending'; assert.equal((await api.POST(req(), ctx, user)).status, 400);
pod = fresh(); mailFails = true;
assert.equal((await api.POST(req(), ctx, user)).status, 500); assert.equal(pod.approvalStatus, 'Approved'); assert.equal(pod.podStatusSection.acknowledgementMail, false); assert.equal(pod.podStatusSection.ackMailAttemptId, undefined);
mailFails = false; assert.equal((await api.POST(req(), ctx, user)).status, 200);
// Concurrent requests cannot both claim a send.
pod = fresh(); let release; waitMail = new Promise(resolve => release = resolve);
const first = api.POST(req(), ctx, user);
while (!pod.podStatusSection.ackMailAttemptId) await new Promise(resolve => setTimeout(resolve, 0));
const second = await api.POST(req(), ctx, user); assert.equal(second.status, 409);
release(); assert.equal((await first).status, 200); waitMail = null;
assert.equal((await api.POST({ text: async () => '{bad json' }, ctx, user)).status, 400);
assert.equal((await api.GET({}, ctx, { ...user, companyId: 'another-company' })).status, 404);

// Execute the actual approval-page handler with offline request doubles.
const page = fs.readFileSync('src/app/(dashboard)/admin/ProofofDelivery/approve/[id]/page.jsx', 'utf8');
const ast = parser.parse(page, { sourceType: 'module', plugins: ['jsx'] });
const component = ast.program.body.find(node => node.type === 'ExportDefaultDeclaration').declaration;
const init = name => component.body.body.flatMap(node => node.declarations || []).find(node => node.id.name === name).init;
async function approve({ requested = true, sent = false, confirmed = false, approvalOk = true, emailOk = true, status = 'Clear & Ok' } = {}) {
  const actions = [], alerts = [];
  const args = { saving: false, sendingEmail: false, canApprove: true, podStatusSection: { ackMailRequested: requested, acknowledgementMail: sent, podStatus: status }, lrEntries: [{ _id: 'lr1', podReceived: 'Received' }], podId: id, remarks: '',
    setSaving() {}, localStorage: { getItem: () => 'token' }, alert: message => alerts.push(message), console: { error() {} },
    openAckPreview: async mode => actions.push(mode ? 'approval-preview' : 'saved-preview'), fetchPODData: async () => actions.push('refresh'), ackHeaders: () => ({}), router: { push: () => actions.push('navigate') },
    fetch: async (url, options) => { const isApproval = url === '/api/pod-panel'; actions.push(isApproval ? 'approve' : 'send'); return { ok: isApproval ? approvalOk : emailOk, json: async () => ({ success: isApproval ? approvalOk : emailOk, message: 'test' }) }; },
  };
  const handler = new Function(...Object.keys(args), 'return '+page.slice(init('handleApprove').start, init('handleApprove').end))(...Object.values(args));
  await handler(confirmed); return { actions, alerts };
}
assert.deepEqual((await approve({ requested: false })).actions, ['approve', 'navigate']);
assert.deepEqual((await approve()).actions, ['approval-preview'], 'Preview cannot approve or send');
assert.deepEqual((await approve({ confirmed: true })).actions, ['approve', 'send', 'refresh', 'saved-preview']);
assert.deepEqual((await approve({ confirmed: true, approvalOk: false })).actions, ['approve'], 'Failed approval never emails');
result = await approve({ confirmed: true, emailOk: false }); assert.deepEqual(result.actions, ['approve', 'send', 'refresh', 'saved-preview']); assert.ok(result.alerts.some(value => value.includes('approval was saved')));
assert.deepEqual((await approve({ sent: true })).actions, ['approve', 'refresh', 'saved-preview'], 'Reapproval never resends implicitly');
assert.deepEqual((await approve({ status: 'Pending' })).actions, ['approve', 'navigate']);
for (const filename of ['create/page.jsx', '[id]/page.jsx']) {
  const text = fs.readFileSync('src/app/(dashboard)/admin/ProofofDelivery/'+filename, 'utf8');
  const active = text.slice(text.indexOf('\nimport '));
  assert.ok(active.includes('checked={podStatusSection.ackMailRequested}'));
  assert.ok(active.includes('Send acknowledgement email after approval'));
}
console.log('PASS: POD email opt-in, protected sent status, approval-preview-send order, no unchecked/preapproval emails, saved preview, resend, concurrent-send lock, failure/retry and company/approve permissions. No emails sent or database writes.');
