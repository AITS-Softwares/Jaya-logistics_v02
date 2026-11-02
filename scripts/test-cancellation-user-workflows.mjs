import assert from 'node:assert/strict';
import { makeHarness, panels, oid, plain } from './workflow-role-harness.mjs';
const h = makeHarness(), { env, users, admin, request, fixtures } = h;
Object.assign(env, h.compile('src/lib/deletion/linkGraph.js', ['TYPES', 'resolveDeleteGraph', 'deletionBlockers']));
Object.assign(env, h.compile('src/lib/cancelOrder.js', ['cancelOrder']));
const route = h.compile('src/app/api/order-panel/[id]/status/route.js', ['POST']);
const charge = h.compile('src/app/api/pricing-panel/[id]/cancellation-charges/route.js', ['POST']);
const cancel = (actor, body = {}) => route.POST(request(actor, { action: 'Cancel', reason: 'Customer cancelled', ...body }), { params: Promise.resolve({ id: fixtures.order._id }) });
const charges = (actor, body) => charge.POST(request(actor, body), { params: Promise.resolve({ id: fixtures.pricing._id }) });
const expectStatus = (value, status, label) => assert.equal(value.status, status, `${label}: ${JSON.stringify(value)}`);
const clear = () => { h.reset(); for (const name of ['PurchasePanel', 'AdvancePayment', 'POD', 'BalancePayment']) h.tables[name] = []; };
let denied = 0;
for (const [type] of panels) for (const role of ['creator', 'editor', 'approver', 'viewer']) {
  clear(); const actor = users[type][role];
  const canRequest = type === 'order' && role !== 'viewer';
  const response = await cancel(actor);
  expectStatus(response, canRequest ? 200 : 403, `${type}/${role} cancellation access`);
  if (!canRequest) { assert.equal(fixtures.order.plantRows[0].status, 'Open'); denied++; }
  else if (role !== 'approver') {
    assert.equal(response.requiresApproval, true); assert.equal(fixtures.order.plantRows[0].status, 'Open');
    assert.equal(fixtures.vnn.panelStatus, 'Approved');
    expectStatus(await cancel(actor, { statusDecision: 'approve' }), 403, 'Requester cannot approve cancellation');
    const recipients = h.notifications.filter(notice => notice.type === 'order-status-approval').map(notice => notice.assignedTo);
    assert(recipients.includes(users.order.approver.id)); assert(recipients.includes(admin.id));
    assert(!recipients.includes(users.order.editor.id)); assert(!recipients.includes(users.order.creator.id));
    for (const [other] of panels.filter(panel => panel[0] !== 'order')) expectStatus(await cancel(users[other].approver, { statusDecision: 'approve' }), 403, `${other} approver cannot decide Order cancellation`);
    expectStatus(await cancel(users.order.approver, { statusDecision: 'reject', reason: 'Delivery must continue' }), 200, 'Order approver rejects request');
    assert.equal(fixtures.order.plantRows[0].status, 'Open'); assert.equal(fixtures.order.plantRows[0].statusRequest, undefined);
    assert(h.notifications.some(notice => notice.type === 'order-cancellation-rejected' && notice.assignedTo === actor.id), 'Cancellation rejection reaches the original requester');
    expectStatus(await cancel(actor), 200, 'Creator/editor can request again');
    expectStatus(await cancel(users.order.approver, { statusDecision: 'approve' }), 200, 'Different Order approver accepts request');
    assert.equal(fixtures.order.panelStatus, 'Cancelled'); assert.equal(fixtures.vnn.panelStatus, 'Cancelled');
  } else { assert.equal(response.requiresApproval, false); assert.equal(fixtures.vnn.panelStatus, 'Cancelled'); }
}
clear(); expectStatus(await cancel(admin), 200, 'Admin cancels directly'); assert.equal(fixtures.order.panelStatus, 'Cancelled');

function addBlocker(kind) {
  const row = plain(fixtures.vnn.orders[0]);
  const purchase = h.document({ purchaseNo: 'PP-1', orderRows: [row] }); h.tables.PurchasePanel = [purchase];
  if (kind === 'advance') h.tables.AdvancePayment = [h.document({ purchaseNo: 'PP-1', paymentNo: 'AP-1', paymentDetails: { paymentStatus: 'Paid' } })];
  if (kind === 'pod') h.tables.POD = [h.document({ podNo: 'POD-1', lrEntries: [{ lrNo: fixtures.lr.lrNo }] })];
  if (kind === 'balance') h.tables.BalancePayment = [h.document({ balancePaymentNo: 'BP-1', lrEntries: [{ lrNo: fixtures.lr.lrNo }], paymentStatus: 'Paid' })];
}
for (const kind of ['advance', 'pod', 'balance']) for (const actor of [users.order.creator, users.order.editor, users.order.approver, admin]) {
  clear(); addBlocker(kind); expectStatus(await cancel(actor), 409, `${kind} blocks ${actor.name}`);
  assert.equal(fixtures.order.plantRows[0].status, 'Open'); assert.equal(fixtures.vnn.panelStatus, 'Approved');
}
clear(); expectStatus(await cancel(users.order.creator), 200, 'Request submitted before payment'); addBlocker('advance');
expectStatus(await cancel(users.order.approver, { statusDecision: 'approve' }), 409, 'Approval rechecks payment that arrived after request');
assert.equal(fixtures.order.plantRows[0].statusRequest.action, 'Cancel'); assert.equal(fixtures.vnn.panelStatus, 'Approved');

clear(); fixtures.lr.invoice = { file: { filePath: 'preserved-invoice.pdf' } };
expectStatus(await cancel(users.order.approver), 200, 'Approved Loading/LR/invoice can cancel');
assert.equal(fixtures.loading.panelStatus, 'Cancelled'); assert.equal(fixtures.lr.header.status, 'Cancelled'); assert.equal(fixtures.lr.invoice.file.filePath, 'preserved-invoice.pdf');
assert(h.notifications.some(notice => notice.type === 'pricing-cancellation-charge-required' && notice.assignedTo === users.pricing.editor.id));
assert(!h.notifications.some(notice => notice.type === 'pricing-cancellation-charge-required' && notice.assignedTo === users.pricing.creator.id));
const amountRows = () => fixtures.pricing.orders.filter(row => row.cancellationChargeRequired).map(row => ({ id: row._id, amount: 0 }));
for (const [type] of panels) for (const role of ['creator', 'editor', 'approver', 'viewer']) {
  if (type === 'pricing' && role === 'editor') continue;
  expectStatus(await charges(users[type][role], { action: 'submit', rows: amountRows() }), 403, `${type}/${role} cannot enter Pricing cancellation charges`);
}
expectStatus(await charges(users.pricing.editor, { action: 'submit', rows: amountRows() }), 200, 'Different Pricing editor submits cancellation charges');
assert(fixtures.pricing.orders[0].cancellationChargeRequired, 'Submission alone keeps task outstanding');
assert(h.notifications.some(notice => notice.type === 'cancellation-charges:submit' && notice.assignedTo === users.pricing.approver.id));
for (const [type] of panels) for (const role of ['creator', 'editor', 'approver', 'viewer']) {
  if (type === 'pricing' && role === 'approver') continue;
  expectStatus(await charges(users[type][role], { action: 'approve' }), 403, `${type}/${role} cannot approve Pricing cancellation charges`);
}
expectStatus(await charges(users.pricing.approver, { action: 'reject', reason: 'Confirm charges' }), 200, 'Pricing approver returns charges');
assert(h.notifications.some(notice => notice.type === 'cancellation-charges:reject' && notice.assignedTo === users.pricing.editor.id));
expectStatus(await charges(users.pricing.editor, { action: 'submit', rows: amountRows() }), 200, 'Pricing editor resubmits charges');
expectStatus(await charges(users.pricing.approver, { action: 'approve' }), 200, 'Separate Pricing Part 2 approver approves charges');
assert.equal(fixtures.pricing.orders[0].cancellationChargeRequired, false);
console.log(`PASS: cancellation across distinct panel users (${denied} unauthorized request denials), creator/editor request → Order approver decisions, admin direct cancellation, all payment/POD blockers, invoice preservation and separate Pricing editor/approver charge handoffs.`);
