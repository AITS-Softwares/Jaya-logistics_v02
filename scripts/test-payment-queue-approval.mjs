import { unwrapBranchHandlers } from './route-business-source.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isIciciQueueApiSkipped, generateLocalPaymentQueue } from '../src/lib/paymentQueueConfig.mjs';

const previousSkip = process.env.ICICI_CIB_SKIP_QUEUE_API;
process.env.ICICI_CIB_SKIP_QUEUE_API = 'false';
let payment;
let bankCalls = 0;
let authorized = true;
const deps = {
  NextResponse: { json: (body, options = {}) => ({ ...body, httpStatus: options.status || 200 }) },
  connectDb: async () => {}, validateUser: async (_req, action) => { assert.equal(action, 'approve'); return authorized ? { user: { companyId: 'company' } } : { error: 'Permission denied', status: 403 }; },
  isValidObjectId: () => true, companyScopeFilter: (_user, query) => query,
  AdvancePayment: { findOne: async () => payment }, BalancePayment: { findOne: async () => payment },
  PurchasePanel: { findOne: () => ({ lean: async () => ({ memoFile: { filePath: '/memo.pdf' } }) }) },
  ADVANCE_STATUSES: ['Pending', 'Approved', 'Rejected', 'Paid', 'Completed'],
  BALANCE_STATUSES: ['Pending', 'Approved', 'Queued', 'Rejected', 'Paid', 'Completed'],
  stableIciciUniqueId: () => 'REFERENCE',
  isIciciQueueApiSkipped, generateLocalPaymentQueue,
  submitCibPayment: async () => { bankCalls++; throw new Error('ICICI CIB sandbox configuration is incomplete'); },
};
function load(path) {
  const source = unwrapBranchHandlers(fs.readFileSync(path, 'utf8'));
  const patch = source.slice(source.indexOf('\nexport async function PATCH')).replace('export async function PATCH', 'async function PATCH');
  return new Function(...Object.keys(deps), `${patch}\nreturn PATCH;`)(...Object.values(deps));
}
const request = (action = 'generate-queue') => ({ url: `http://localhost/api/payment?id=payment&action=${action}`, json: async () => ({}) });
function seed(status) {
  payment = { _id: 'payment', status, paymentStatus: status, paymentDetails: { paymentStatus: status, finalAmount: 23850 }, vendorDetails: {}, finalAmount: 23850,
    queueGenerated: false, memoFile: { filePath: '/memo.pdf' },
    toObject() { return JSON.parse(JSON.stringify(this)); }, async save() {},
  };
}
for (const path of ['src/app/api/Advance-Payment/route.js', 'src/app/api/balance-payment/route.js']) {
  const patch = load(path);
  for (const status of ['Pending', 'Queued', 'Rejected', 'Paid', 'Completed']) {
    seed(status);
    const beforeCalls = bankCalls;
    const result = await patch(request());
    assert.equal(result.httpStatus, 409, `${path}: ${status} must not generate a queue`);
    assert.equal(bankCalls, beforeCalls);
    assert.equal(payment.queueGenerated, false);
  }
  seed('Approved');
  const callsBeforeApproval = bankCalls;
  assert.equal((await patch(request())).httpStatus, 503, 'Approved payments reach the real ICICI path and still require credentials');
  assert.equal(bankCalls, callsBeforeApproval + 1);
  seed('Approved'); payment.isDraft = true;
  assert.equal((await patch(request())).httpStatus, 400);
  seed('Approved'); payment.queueGenerated = true;
  assert.equal((await patch(request())).httpStatus, 409);
  seed('Approved'); authorized = false;
  assert.equal((await patch(request())).httpStatus, 403);
  authorized = true;
  if (path.includes('Advance-Payment')) {
    seed('Approved'); payment.paymentDetails.paymentStatus = 'Pending';
    const before = bankCalls;
    assert.equal((await patch(request())).httpStatus, 409, 'A stale root Approved status cannot override Pending payment details');
    assert.equal(bankCalls, before);
  } else {
    seed('Pending');
    assert.equal((await patch(request('queue'))).httpStatus, 409, 'The legacy queue action also requires prior approval');
    seed('Approved');
    assert.equal((await patch(request('queue'))).httpStatus, 200);
  }
}
console.log('PASS: both payment queues require saved Approved status, with draft, permission, duplicate and stale-status guards; bank integration remains required.');

try {
  process.env.ICICI_CIB_SKIP_QUEUE_API = 'true';
  for (const path of ['src/app/api/Advance-Payment/route.js', 'src/app/api/balance-payment/route.js']) {
    const patch = load(path);
    const callsBefore = bankCalls;
    for (const status of ['Pending', 'Queued', 'Rejected', 'Paid', 'Completed']) {
      seed(status);
      assert.equal((await patch(request())).httpStatus, 409);
    }
    seed('Approved');
    let result = await patch(request());
    assert.equal(result.httpStatus, 200);
    assert.equal(result.data.bankStatus, 'Generated');
    assert.equal(result.data.amount, 23850);
    assert.equal(result.data.provider, 'ERP_QUEUE');
    assert.equal(payment.queueGenerated, true);
    assert(!['Paid', 'Completed'].includes(result.data.paymentStatus));
    assert(!payment.bankIntegration.utrNumber && !payment.bankIntegration.submittedAt);
    assert.equal(payment.bankIntegration.events[0].event, 'QUEUE_GENERATED_API_SKIPPED');
    assert.equal((await patch(request())).httpStatus, 409);
    assert.equal((await patch(request('check-status'))).httpStatus, 409);
    assert.equal(bankCalls, callsBefore, 'Skipping the API must not make submission or inquiry requests');
    process.env.ICICI_CIB_SKIP_QUEUE_API = 'false';
    payment.queueGenerated = false;
    assert.equal((await patch(request())).httpStatus, 409, 'Previously generated local queues must not be submitted when API calling resumes');
    process.env.ICICI_CIB_SKIP_QUEUE_API = 'true';
    seed('Approved'); payment.bankIntegration = { provider: 'ICICI_CIB', bankStatus: 'UNCERTAIN' };
    assert.equal((await patch(request())).httpStatus, 409, 'Never bypass an existing bank submission');
    seed('Approved'); payment.paymentDetails.finalAmount = 0; payment.finalAmount = 0;
    assert.equal((await patch(request())).httpStatus, 409);
    assert.equal(payment.queueGenerated, false);
  }
  console.log('PASS: temporary skip creates Generated queues for both payments with zero bank calls, preserves amount/approval/duplicate checks, and protects existing queues when API calling resumes.');
} finally {
  if (previousSkip === undefined) delete process.env.ICICI_CIB_SKIP_QUEUE_API;
  else process.env.ICICI_CIB_SKIP_QUEUE_API = previousSkip;
}
