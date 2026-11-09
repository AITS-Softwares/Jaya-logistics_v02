import { isIciciQueueApiSkipped } from './paymentQueueConfig.mjs';

export const isPaymentSettled = (kind, payment) => ['Paid', 'Completed'].includes(kind === 'advance' ? payment.paymentDetails?.paymentStatus : payment.paymentStatus);
export const paymentAmount = (kind, payment) => Number(kind === 'advance' ? payment.paymentDetails?.finalAmount : payment.finalAmount);
export const paymentReference = (kind, payment) => String(kind === 'advance' ? payment.paymentDetails?.transactionId || payment.vendorDetails?.transactionId || '' : payment.transactionId || '').trim();
const fail = message => { throw Object.assign(new Error(message), { status: 409 }); };

// Called only after the route's authorization checks and before persistence.
export function recordPaymentSettlement(kind, payment, user, canConfirm, env = process.env, now = new Date()) {
  if (!isPaymentSettled(kind, payment)) return;
  if (payment.isDraft) fail('A draft cannot be marked paid.');
  const amount = paymentAmount(kind, payment);
  if (!Number.isFinite(amount) || amount <= 0) fail('A positive payment amount is required to confirm payment.');
  const bank = payment.bankIntegration || {};
  const reference = paymentReference(kind, payment);
  const existing = payment.paymentSettlement;
  const bankReference = bank.utrNumber || reference || bank.uniqueId || '';
  if (bank.provider === 'ICICI_CIB') {
    if (bank.bankStatus !== 'SUCCESS') fail('Payment cannot be marked paid until ICICI confirms success.');
    if (bank.transactionType === 'RGS' && !bank.utrNumber) fail('RGS payment needs its UTR and final bank confirmation.');
    if (!bankReference) fail('Bank-confirmed payment is missing its reference.');
    if (existing?.source === 'ICICI' && existing.reference === bankReference && existing.amount === amount) return;
    payment.paymentSettlement = { source: 'ICICI', reference: bankReference, amount, confirmedAt: now, confirmedBy: user.id || user._id, confirmedByName: user.name || '' };
  } else {
    if (existing?.source === 'manual' && existing.reference === reference && existing.amount === amount) return;
    if (!isIciciQueueApiSkipped(env)) fail('ICICI API mode is enabled. Confirm payment through bank success, not a manual status change.');
    if (!canConfirm) fail('Approve permission is required to confirm a manual payment.');
    if (!reference) fail('Enter the actual paid transaction / UTR reference in Payment Confirmation before marking this payment paid.');
    payment.paymentSettlement = { source: 'manual', reference, amount, confirmedAt: now, confirmedBy: user.id || user._id, confirmedByName: user.name || '' };
  }
  if (kind === 'advance') { payment.paymentDetails.paymentDate = now; payment.status = payment.paymentDetails.paymentStatus; }
  else payment.paymentDate = now;
}

export function paymentConfirmationIssue(kind, payment, env = process.env) {
  if (payment.isDraft || !isPaymentSettled(kind, payment)) return 'Payment must be confirmed Paid/Completed before a confirmation email can be sent.';
  const settlement = payment.paymentSettlement;
  if (!settlement?.confirmedAt || !['manual', 'ICICI'].includes(settlement.source)) return 'This payment has no verified settlement record. An approver must confirm the actual payment first.';
  if (!(paymentAmount(kind, payment) > 0) || settlement.amount !== paymentAmount(kind, payment)) return 'The confirmed payment amount does not match this record.';
  if (payment.bankIntegration?.provider === 'ICICI_CIB') {
    if (settlement.source !== 'ICICI' || payment.bankIntegration.bankStatus !== 'SUCCESS') return 'ICICI has not confirmed successful payment, or the payment was reversed.';
    if (payment.bankIntegration.transactionType === 'RGS' && !payment.bankIntegration.utrNumber) return 'RGS payment is awaiting its UTR and final bank confirmation.';
    const reference = payment.bankIntegration.utrNumber || paymentReference(kind, payment) || payment.bankIntegration.uniqueId;
    if (settlement.reference !== reference) return 'The bank reference changed. Refresh bank status before sending.';
  } else {
    if (!isIciciQueueApiSkipped(env)) return 'ICICI API mode is enabled; a bank-confirmed payment is required.';
    if (settlement.source !== 'manual' || !paymentReference(kind, payment) || settlement.reference !== paymentReference(kind, payment)) return 'The actual paid transaction / UTR reference has not been confirmed.';
  }
  return '';
}
