import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { recordPaymentSettlement, paymentConfirmationIssue, isPaymentSettled, paymentAmount, paymentReference } from '../src/lib/paymentConfirmationRules.mjs';
import { buildPaymentConfirmationEmail } from '../src/lib/paymentConfirmationEmail.mjs';
import { isIciciQueueApiSkipped, generateLocalPaymentQueue } from '../src/lib/paymentQueueConfig.mjs';
const require = createRequire(import.meta.url);
const previousSkip = process.env.ICICI_CIB_SKIP_QUEUE_API;
const user = { id: '123456789012345678901234', name: 'Accounts Approver', companyId: 'company' };
const ids = { advance: '111111111111111111111111', balance: '222222222222222222222222' };
function seed(kind, status = 'Approved') {
  return { _id: ids[kind], companyId: 'company', paymentNo: 'ADV-1', balancePaymentNo: 'BAL-1', purchaseNo: 'PUR-1', podNo: 'POD-1', companyName: 'Jaya', vendorCode: 'SUP-1',
    vendorDetails: { vendorCode: 'SUP-1', advance: 1000, accountNo: '123456789012' }, paymentDetails: { paymentStatus: status, finalAmount: 950, accountNoCredit: '123456789012', transactionId: '' },
    paymentStatus: status, status, isDraft: false, finalAmount: 950, amount: 2000, advance: 1000, additions: { totalAddition: 0 }, deductions: { totalDeduction: 50 },
    accountNoCredit: '123456789012', transactionId: '', paymentEmail: { requested: true, sentAt: null, count: 0, history: [], lastError: '' }, orderRows: [{ orderNo: 'ORDER-1' }],
  };
}
const paid = (kind, record) => { if (kind === 'advance') record.paymentDetails.paymentStatus = 'Paid'; else record.paymentStatus = 'Paid'; };
const setReference = (kind, record, reference = 'UTR-PAID-1') => { if (kind === 'advance') record.paymentDetails.transactionId = reference; else record.transactionId = reference; };
try {
process.env.ICICI_CIB_SKIP_QUEUE_API = 'true';
for (const kind of ['advance', 'balance']) {
  const record = seed(kind); assert.equal(isPaymentSettled(kind, record), false);
  generateLocalPaymentQueue(kind, record, user);
  assert.equal(record.bankIntegration.provider, 'ERP_QUEUE'); assert.equal(isPaymentSettled(kind, record), false); assert.match(paymentConfirmationIssue(kind, record), /must be confirmed/);
  paid(kind, record);
  for (const skip of ['true', 'false']) {
    process.env.ICICI_CIB_SKIP_QUEUE_API = skip;
    assert.throws(() => recordPaymentSettlement(kind, record, user, true), /Manual payment confirmation is disabled/);
    setReference(kind, record);
    assert.throws(() => recordPaymentSettlement(kind, record, user, true), /Manual payment confirmation is disabled/);
    record.paymentSettlement = { source: 'manual', reference: 'UTR-PAID-1', amount: 950, confirmedAt: new Date() };
    assert.match(paymentConfirmationIssue(kind, record), /verified ICICI bank settlement/);
  }
  record.bankIntegration = { provider: 'ICICI_CIB', bankStatus: 'SUCCESS', utrNumber: 'UTR-PAID-1' };
  recordPaymentSettlement(kind, record, user, true);
  const bank = seed(kind, 'Completed'); bank.bankIntegration = { provider: 'ICICI_CIB', bankStatus: 'PENDING', uniqueId: 'BANK-1' };
  assert.throws(() => recordPaymentSettlement(kind, bank, user, true), /confirms success/);
  bank.bankIntegration.bankStatus = 'SUCCESS'; bank.bankIntegration.transactionType = 'RGS';
  assert.throws(() => recordPaymentSettlement(kind, bank, user, true), /UTR/);
  bank.bankIntegration.utrNumber = 'BANK-UTR'; recordPaymentSettlement(kind, bank, user, true); assert.equal(paymentConfirmationIssue(kind, bank), '');
  bank.bankIntegration.bankStatus = 'REVERSED'; assert.match(paymentConfirmationIssue(kind, bank), /reversed/);
  process.env.ICICI_CIB_SKIP_QUEUE_API = 'true';
  const html = buildPaymentConfirmationEmail(kind, record, { supplierName: '<Supplier>', confirmed: true });
  assert.ok(html.subject.includes(kind === 'advance' ? 'Advance Payment Confirmation' : 'Balance Payment Confirmation'));
  assert.ok(html.html.includes('&lt;Supplier&gt;')); assert.ok(html.html.includes('Ending 9012')); assert.ok(!html.html.includes('123456789012'));
  assert.ok(html.html.includes('UTR-PAID-1')); assert.ok(html.html.includes('₹950.00'));
}

const records = new Map();
let sends = [], failSmtp = false, emailIssue = '', holdSmtp = null;
const get = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);
const matches = (object, query) => Object.entries(query).every(([key, expected]) => {
  if (key === '$or') return expected.some(part => matches(object, part));
  const value = get(object, key);
  if (expected === null) return value == null;
  if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
    if ('$ne' in expected) return value !== expected.$ne;
    if ('$in' in expected) return expected.$in.includes(value);
    if ('$lte' in expected) return value != null && +new Date(value) <= +expected.$lte;
  }
  return expected instanceof Date ? +new Date(value) === +expected : value === expected;
});
const set = (object, key, value) => { const parts = key.split('.'); let target = object; for (const part of parts.slice(0, -1)) target = target[part] ||= {}; target[parts.at(-1)] = value; };
function apply(record, update) {
  for (const [key, value] of Object.entries(update.$set || {})) set(record, key, value);
  for (const [key, value] of Object.entries(update.$inc || {})) set(record, key, (get(record, key) || 0) + value);
  for (const [key, value] of Object.entries(update.$push || {})) { const values = get(record, key) || []; values.push(value); set(record, key, values); }
  for (const key of Object.keys(update.$unset || {})) { const parts = key.split('.'); const target = parts.slice(0, -1).reduce((object, key) => object?.[key], record); if (target) delete target[parts.at(-1)]; }
}
function model(kind) {
  return {
    findOne: query => ({ lean: async () => { const record = records.get(kind); return record && matches(record, query) ? structuredClone(record) : null; } }),
    updateOne: async (query, update) => { const record = records.get(kind); if (!record || !matches(record, query)) return { matchedCount: 0 }; apply(record, update); return { matchedCount: 1 }; },
    findOneAndUpdate: async (query, update) => { const record = records.get(kind); if (!record || !matches(record, query)) return null; apply(record, update); return structuredClone(record); },
  };
}
const serviceDeps = {
  randomUUID: () => 'attempt-'+Math.random(), connectDb: async () => {}, companyScopeFilter: (actor, query) => ({ ...query, companyId: actor.companyId }),
  AdvancePayment: model('advance'), BalancePayment: model('balance'),
  Supplier: { findOne: () => ({ select: () => ({ lean: async () => ({ supplierName: 'Supplier', emailId: 'supplier@example.com' }) }) }) },
  EmailMaster: { findOne: () => ({ sort: () => ({ lean: async () => ({ email: 'accounts@example.com' }) }) }) },
  getEmailMasterIssue: () => emailIssue,
  sendMailFromEmailMaster: async args => { if (holdSmtp) await holdSmtp; if (failSmtp) throw new Error('SMTP unavailable'); sends.push(args); return { accepted: [args.to], rejected: [] }; },
  paymentConfirmationIssue, isPaymentSettled, paymentAmount, buildPaymentConfirmationEmail,
};
function loadModule(file, deps, names) {
  const source = fs.readFileSync(file, 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  return new Function(...Object.keys(deps), source + '\nreturn { '+names.join(',')+' };')(...Object.values(deps));
}
const service = loadModule('src/lib/paymentConfirmationService.js', serviceDeps, ['loadPaymentConfirmation', 'sendPaymentConfirmation', 'maybeSendPaymentConfirmation', 'paymentModel']);
for (const kind of ['advance', 'balance']) {
  let record = seed(kind); records.set(kind, record);
  const before = sends.length;
  assert.equal(await service.maybeSendPaymentConfirmation(kind, record, user), null); assert.equal(sends.length, before);
  paid(kind, record); setReference(kind, record); record.bankIntegration = { provider: 'ICICI_CIB', bankStatus: 'SUCCESS', utrNumber: 'UTR-PAID-1' }; recordPaymentSettlement(kind, record, user, true);
  record.paymentEmail.requested = false; assert.equal((await service.sendPaymentConfirmation(kind, record._id, user)).state, 'blocked'); assert.equal(sends.length, before);
  record.paymentEmail.requested = true;
  assert.equal((await service.maybeSendPaymentConfirmation(kind, record, user)).state, 'sent'); assert.equal(sends.length, before+1);
  assert.equal(record.paymentEmail.count, 1); assert.equal(record.paymentEmail.history.length, 1); assert.equal(record.paymentEmail.history[0].reference, 'UTR-PAID-1');
  assert.equal(await service.maybeSendPaymentConfirmation(kind, record, user), null);
  assert.equal((await service.sendPaymentConfirmation(kind, record._id, user)).state, 'alreadySent'); assert.equal(sends.length, before+1);
  assert.equal((await service.sendPaymentConfirmation(kind, record._id, user, { resend: true })).state, 'sent'); assert.equal(sends.length, before+2); assert.equal(record.paymentEmail.count, 2);
  record = seed(kind, 'Paid'); setReference(kind, record); record.bankIntegration = { provider: 'ICICI_CIB', bankStatus: 'SUCCESS', utrNumber: 'UTR-PAID-1' }; recordPaymentSettlement(kind, record, user, true); records.set(kind, record);
  failSmtp = true; assert.equal((await service.maybeSendPaymentConfirmation(kind, record, user)).state, 'failed'); assert.equal(isPaymentSettled(kind, record), true); assert.equal(record.paymentEmail.sentAt, null); assert.equal(record.paymentEmail.attemptId, undefined);
  failSmtp = false; assert.equal((await service.maybeSendPaymentConfirmation(kind, record, user)).state, 'failed', 'Automatic status polls do not repeatedly retry a failed email');
  assert.equal((await service.sendPaymentConfirmation(kind, record._id, user)).state, 'sent', 'Manual retry works after a mail error');
  record = seed(kind, 'Paid'); setReference(kind, record); record.bankIntegration = { provider: 'ICICI_CIB', bankStatus: 'SUCCESS', utrNumber: 'UTR-PAID-1' }; recordPaymentSettlement(kind, record, user, true); records.set(kind, record);
  emailIssue = 'No active Email Master'; assert.equal((await service.maybeSendPaymentConfirmation(kind, record, user)).state, 'blocked'); emailIssue = '';
  let release; holdSmtp = new Promise(resolve => release = resolve);
  const sending = service.sendPaymentConfirmation(kind, record._id, user);
  while (!record.paymentEmail.attemptId) await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal((await service.sendPaymentConfirmation(kind, record._id, user)).state, 'busy'); release(); await sending; holdSmtp = null;
  assert.equal(record.paymentEmail.count, 1, 'Concurrent sends claim only one email');
  process.env.ICICI_CIB_SKIP_QUEUE_API = 'false';
  record = seed(kind, 'Completed'); record.bankIntegration = { provider: 'ICICI_CIB', bankStatus: 'SUCCESS', uniqueId: 'BANK-1', utrNumber: 'BANK-UTR', transactionType: 'NEF' }; recordPaymentSettlement(kind, record, user, true); records.set(kind, record);
  assert.equal((await service.maybeSendPaymentConfirmation(kind, record, user)).state, 'sent'); record.bankIntegration.bankStatus = 'REVERSED';
  assert.equal((await service.sendPaymentConfirmation(kind, record._id, user, { resend: true })).state, 'blocked');
  process.env.ICICI_CIB_SKIP_QUEUE_API = 'true';
}

// Execute real endpoint handlers with the real settlement/email service and in-memory persistence.
let permissions = new Set(['view', 'edit', 'approve']);
const permission = (_user, _module, action) => permissions.has(action);
const json = (body, options) => ({ ...body, status: options?.status || 200 });
const routeDeps = { ...service, NextResponse: { json }, withAuth: (fn, options) => (req, ctx, actor) => {
  const allowed = options.actions ? options.actions.some(action => permission(actor, options.module, action)) : permission(actor, options.module, options.action);
  return allowed ? fn(req, ctx, actor) : json({ success: false }, { status: 403 });
}, hasPermission: permission, withBranchAccess: fn => fn, companyScopeFilter: serviceDeps.companyScopeFilter,
  isIciciQueueApiSkipped, paymentAmount, paymentReference, recordPaymentSettlement,
  syncPodAdvanceForPurchase: async () => {}, notifyModuleDecision: async () => {},
};
const { paymentConfirmationHandlers } = loadModule('src/lib/paymentConfirmationRoute.js', routeDeps, ['paymentConfirmationHandlers']);
for (const kind of ['advance', 'balance']) {
  let record = seed(kind); record.paymentEmail.requested = false; records.set(kind, record);
  const api = paymentConfirmationHandlers(kind), context = { params: { id: record._id } }, request = body => ({ json: async () => body });
  permissions = new Set(['view']); let response = await api.GET({}, context, user); assert.equal(response.status, 200); assert.equal(response.data.canApprove, false); assert.ok(!JSON.stringify(response.data).includes('123456789012'));
  assert.equal((await api.PATCH(request({ action: 'preference', requested: true }), context, user)).status, 403);
  assert.equal((await api.POST(request({}), context, user)).status, 403);
  permissions = new Set(['edit']); assert.equal((await api.PATCH(request({ action: 'preference', requested: true }), context, user)).status, 200); assert.equal(record.paymentEmail.requested, true);
  assert.equal((await api.PATCH(request({ action: 'confirm-paid', expectedAmount: 950, reference: 'UTR-9' }), context, user)).status, 409);
  permissions = new Set(['approve']);
  const before = sends.length;
  for (const skip of ['true', 'false']) {
    process.env.ICICI_CIB_SKIP_QUEUE_API = skip;
    response = await api.PATCH(request({ action: 'confirm-paid', expectedAmount: 950, reference: 'MANUAL-PAID-1' }), context, user);
    assert.equal(response.status, 409);
    assert.match(response.message, /Manual payment confirmation is disabled/);
    assert.equal(record.paymentSettlement, undefined);
    assert.equal(sends.length, before);
  }
  permissions = new Set(['view', 'approve']);
  response = await api.GET({}, context, user);
  assert.equal(response.data.manualAllowed, undefined);
  assert.equal(response.data.canConfirm, undefined);
  assert.equal((await api.GET({}, context, { ...user, companyId: 'another-company' })).status, 404);
  process.env.ICICI_CIB_SKIP_QUEUE_API = 'true';
}

// Exercise the actual payment PATCH handlers: no queue/status-check bank calls in skip mode,
// no premature RGS completion, and email hooks run only after a successful payment save.
const parser = require('@babel/parser');
for (const kind of ['advance', 'balance']) {
  const file = `src/app/api/${kind === 'advance' ? 'Advance-Payment' : 'balance-payment'}/route.js`;
  const source = fs.readFileSync(file, 'utf8'), ast = parser.parse(source, { sourceType: 'module' });
  const node = ast.program.body.find(item => item.type === 'FunctionDeclaration' && item.id.name === 'branchHandlerPATCH');
  let payment, saved = 0, bankCalls = 0, emitted = 0, outcome = { status: 'SUCCESS', utr: 'BANK-UTR', accepted: true, transactionType: 'NEF', message: 'Bank result' };
  const makePayment = status => { payment = seed(kind, status); payment.memoFile = { filePath: '/memo.pdf' }; payment.save = async () => { saved++; }; payment.toObject = () => JSON.parse(JSON.stringify(payment)); };
  const deps = {
    console: { error() {}, log() {} }, NextResponse: { json }, connectDb: async () => {}, validateUser: async () => ({ user }), companyScopeFilter: (_actor, query) => query, isValidObjectId: () => true, hasPermission: () => true,
    AdvancePayment: { findOne: async () => payment }, BalancePayment: { findOne: async () => payment },
    PurchasePanel: { findOne: () => ({ lean: async () => ({ memoFile: { filePath: '/memo.pdf' } }) }) },
    Supplier: { findOne: () => ({ select: () => ({ lean: async () => ({ bankAccountNumber: '123456789012', ifscCode: 'BANK0000001', supplierName: 'Supplier' }) }) }) },
    ADVANCE_STATUSES: ['Pending', 'Approved', 'Rejected', 'Paid', 'Completed'], BALANCE_STATUSES: ['Pending', 'Approved', 'Queued', 'Rejected', 'Paid', 'Completed'],
    isIciciQueueApiSkipped, generateLocalPaymentQueue, recordPaymentSettlement,
    maybeSendPaymentConfirmation: async (k, record) => { assert.ok(saved > 0, 'No email before persistence'); if (record.paymentEmail.requested && !record.paymentEmail.sentAt && !paymentConfirmationIssue(k, record)) { emitted++; record.paymentEmail.sentAt = new Date(); return { state: 'sent' }; } return null; },
    syncPodAdvanceForPurchase: async () => {}, notifyModuleDecision: async () => {}, stableIciciUniqueId: () => 'BANK-1', normalizeCibStatus: status => status,
    submitCibPayment: async () => { bankCalls++; return outcome; }, inquireCibPayment: async () => { bankCalls++; return outcome; }, inquireCibNeftPayment: async () => { bankCalls++; return { status: 'SUCCESS', utr: 'BANK-UTR', message: 'Amount credited' }; },
  };
  const patch = new Function(...Object.keys(deps), source.slice(node.start, node.end) + '\nreturn branchHandlerPATCH;')(...Object.values(deps));
  const req = (action, body = {}) => ({ url: `http://localhost/api/payment?id=${ids[kind]}&action=${action}`, json: async () => body });
  process.env.ICICI_CIB_SKIP_QUEUE_API = 'true';
  makePayment('Approved'); assert.equal((await patch(req('generate-queue'))).status, 200); assert.equal(bankCalls, 0); assert.equal(emitted, 0); assert.equal(payment.bankIntegration.provider, 'ERP_QUEUE');
  assert.equal((await patch(req('check-status'))).status, 409); assert.equal(bankCalls, 0);
  makePayment('Approved'); const before = saved;
  assert.equal((await patch(req(kind === 'advance' ? 'approve' : 'complete', { paymentStatus: 'Paid' }))).status, 409); assert.equal(saved, before, 'Paid without reference is rejected before save');
  makePayment('Approved'); setReference(kind, payment);
  assert.equal((await patch(req(kind === 'advance' ? 'approve' : 'complete', { paymentStatus: 'Paid' }))).status, 409); assert.equal(emitted, 0); assert.equal(bankCalls, 0);
  process.env.ICICI_CIB_SKIP_QUEUE_API = 'false';
  makePayment('Approved'); payment.bankIntegration = { provider: 'ICICI_CIB', uniqueId: 'BANK-1', transactionType: 'RGS' };
  outcome = { status: 'SUCCESS', utr: '', message: 'Submission accepted' };
  assert.equal((await patch(req('check-status'))).status, 200); assert.equal(payment.bankIntegration.bankStatus, 'PENDING FOR PROCESSING'); assert.equal(isPaymentSettled(kind, payment), false); assert.equal(emitted, 0);
  outcome = { status: 'SUCCESS', utr: 'BANK-UTR', message: 'Success' };
  assert.equal((await patch(req('check-status'))).status, 200); assert.equal(payment.paymentSettlement.source, 'ICICI'); assert.equal(emitted, 1);
  assert.equal((await patch(req('check-status'))).status, 200); assert.equal(emitted, 1, 'Repeated success checks never duplicate email');
  outcome = { status: 'REVERSED', message: 'Reversed', utr: 'BANK-UTR' };
  assert.equal((await patch(req('check-status'))).status, 200); assert.equal(isPaymentSettled(kind, payment), false); assert.equal(emitted, 1);
}
process.env.ICICI_CIB_SKIP_QUEUE_API = 'true';
// Render the real confirmation UI with offline hooks; no effects or requests are run.
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const swc = require('next/dist/build/swc'), icons = require('react-icons/fi');
const uiSource = fs.readFileSync('src/components/PaymentConfirmationPanel.jsx', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/^export default /gm, '').replace(/^export /gm, '');
const compiled = swc.transformSync(uiSource, { filename: 'payment-ui.jsx', jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'classic' } } }, module: { type: 'commonjs' } }).code;
function renderPanel(data, preview = false) {
  let hook = 0;
  const states = [data, '', '', false, preview, '', false];
  const deps = { React, useState: initial => [hook < states.length ? states[hook++] : initial, () => {}], useCallback: fn => fn, useEffect() {}, useRef: initial => ({ current: initial }), ...icons };
  const Panel = new Function(...Object.keys(deps), compiled + '\nreturn PaymentConfirmationPanel;')(...Object.values(deps));
  return renderToStaticMarkup(React.createElement(Panel, { kind: 'advance', paymentId: ids.advance, editable: true }));
}
const common = { requested: true, canEditPreference: true, canApprove: true, manualAllowed: true, canConfirm: true, settled: false, status: 'Approved', history: [], reference: '', amount: 950, canSend: false, blockedReason: 'Payment must be confirmed Paid/Completed.', html: '<p>Preview only</p>' };
let markup = renderPanel(common, true);
assert.ok(!markup.includes('Confirm manual payment')); assert.ok(markup.includes('Send payment confirmation email when paid')); assert.ok(/<button[^>]*disabled=""[^>]*>Send Email<\/button>/.test(markup));
markup = renderPanel({ ...common, canConfirm: false, settled: true, status: 'Paid', canSend: true, blockedReason: '', sentAt: new Date().toISOString(), sentTo: 'supplier@example.com', history: [{ sentAt: new Date().toISOString(), sentTo: 'supplier@example.com' }] }, true);
assert.ok(markup.includes('Resend Email')); assert.ok(markup.includes('Send history (1)')); assert.ok(!markup.includes('Confirm manual payment'));
console.log('PASS: both payment kinds; manual confirmation blocked in both API modes; bank-success/RGS guards; no queue emails; opt-in, single automatic send, explicit resend, history, masked account, SMTP failure/retry, concurrent-send lock and endpoint permissions/scope. No live bank, SMTP or database calls.');
} finally { if (previousSkip === undefined) delete process.env.ICICI_CIB_SKIP_QUEUE_API; else process.env.ICICI_CIB_SKIP_QUEUE_API = previousSkip; }
