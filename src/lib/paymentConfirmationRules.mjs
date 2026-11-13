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
    fail('Manual payment confirmation is disabled. A successful ICICI bank confirmation is required.');
  }
  if (kind === 'advance') { payment.paymentDetails.paymentDate = now; payment.status = payment.paymentDetails.paymentStatus; }
  else payment.paymentDate = now;
}

export function paymentConfirmationIssue(kind, payment, env = process.env) {
  if (payment.isDraft || !isPaymentSettled(kind, payment)) return 'Payment must be confirmed Paid/Completed before a confirmation email can be sent.';
  const settlement = payment.paymentSettlement;
  if (!settlement?.confirmedAt || settlement.source !== 'ICICI') return 'A verified ICICI bank settlement is required before sending payment confirmation.';
  if (!(paymentAmount(kind, payment) > 0) || settlement.amount !== paymentAmount(kind, payment)) return 'The confirmed payment amount does not match this record.';
  if (payment.bankIntegration?.provider === 'ICICI_CIB') {
    if (settlement.source !== 'ICICI' || payment.bankIntegration.bankStatus !== 'SUCCESS') return 'ICICI has not confirmed successful payment, or the payment was reversed.';
    if (payment.bankIntegration.transactionType === 'RGS' && !payment.bankIntegration.utrNumber) return 'RGS payment is awaiting its UTR and final bank confirmation.';
    const reference = payment.bankIntegration.utrNumber || paymentReference(kind, payment) || payment.bankIntegration.uniqueId;
    if (settlement.reference !== reference) return 'The bank reference changed. Refresh bank status before sending.';
  } else {
    return 'Manual payment confirmation is disabled; a bank-confirmed payment is required.';
  }
  return '';
}
