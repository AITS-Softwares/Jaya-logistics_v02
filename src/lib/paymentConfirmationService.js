import { randomUUID } from 'crypto';
import connectDb from '@/lib/db';
import { companyScopeFilter } from '@/lib/companyScope';
import AdvancePayment from '@/app/api/Advance-Payment/AdvancePayment';
import BalancePayment from '@/app/api/balance-payment/BalancePayment';
import Supplier from '@/models/SupplierModels';
import EmailMaster from '@/models/emailMaster/emailMaster';
import { getEmailMasterIssue, sendMailFromEmailMaster } from '@/lib/emailMasterMailer';
import { paymentConfirmationIssue, isPaymentSettled, paymentAmount } from '@/lib/paymentConfirmationRules.mjs';
import { buildPaymentConfirmationEmail } from '@/lib/paymentConfirmationEmail.mjs';

export const paymentModel = kind => kind === 'advance' ? AdvancePayment : BalancePayment;
export async function loadPaymentConfirmation(kind, id, user) {
  await connectDb();
  const Model = paymentModel(kind);
  const payment = await Model.findOne(companyScopeFilter(user, { _id: id })).lean();
  if (!payment) throw Object.assign(new Error('Payment not found.'), { status: 404 });
  const vendorCode = kind === 'advance' ? payment.vendorDetails?.vendorCode : payment.vendorCode;
  const supplier = vendorCode ? await Supplier.findOne({ companyId: user.companyId, supplierCode: vendorCode }).select('supplierName emailId').lean() : null;
  const master = await EmailMaster.findOne({ companyId: user.companyId, status: 'Active' }).sort({ updatedAt: -1, _id: -1 }).lean();
  const recipient = String(supplier?.emailId || '').trim();
  const settlementIssue = paymentConfirmationIssue(kind, payment);
  const blockedReason = !payment.paymentEmail?.requested ? 'Enable payment confirmation email on Create/Edit first.' : settlementIssue || getEmailMasterIssue(master) || (!supplier ? 'Supplier not found for this payment.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) ? 'Add a valid supplier email in Supplier Management.' : '');
  const { subject, html } = buildPaymentConfirmationEmail(kind, payment, { supplierName: supplier?.supplierName, confirmed: !settlementIssue });
  return { Model, payment, master, recipient, blockedReason, settlementIssue, subject, html };
}

export async function sendPaymentConfirmation(kind, id, user, { resend = false } = {}) {
  let loaded, attemptId, accepted = false;
  try {
    loaded = await loadPaymentConfirmation(kind, id, user);
    const { Model, payment, master, recipient, blockedReason, subject, html } = loaded;
    if (blockedReason) return { state: 'blocked', message: blockedReason };
    if (payment.paymentEmail?.sentAt && !resend) return { state: 'alreadySent', message: 'Payment confirmation was already sent.' };
    attemptId = randomUUID();
    const scope = companyScopeFilter(user, { _id: id });
    const statusKey = kind === 'advance' ? 'paymentDetails.paymentStatus' : 'paymentStatus';
    const lock = await Model.updateOne({
      ...scope, isDraft: { $ne: true }, [statusKey]: { $in: ['Paid', 'Completed'] },
      'paymentEmail.requested': true, 'paymentSettlement.reference': payment.paymentSettlement.reference, 'paymentSettlement.amount': paymentAmount(kind, payment),
      ...(payment.bankIntegration?.provider === 'ICICI_CIB' ? { 'bankIntegration.bankStatus': 'SUCCESS' } : {}),
      ...(resend ? {} : { 'paymentEmail.sentAt': null }),
      $or: [{ 'paymentEmail.sendingUntil': null }, { 'paymentEmail.sendingUntil': { $lte: new Date() } }],
    }, { $set: { 'paymentEmail.attemptId': attemptId, 'paymentEmail.sendingUntil': new Date(Date.now() + 300000) } });
    if (!lock.matchedCount) return { state: 'busy', message: 'Email was already sent, is being sent, or the payment changed. Refresh before retrying.' };
    const result = await sendMailFromEmailMaster({ emailMaster: master, to: recipient, subject, html });
    if (result?.rejected?.length && !result?.accepted?.length) throw new Error('The mail server rejected the recipient.');
    accepted = true;
    const sentAt = new Date();
    const audit = await Model.updateOne({ ...scope, 'paymentEmail.attemptId': attemptId }, {
      $set: { 'paymentEmail.sentAt': sentAt, 'paymentEmail.sentTo': recipient, 'paymentEmail.sentBy': user.name || '', 'paymentEmail.lastError': '' },
      $inc: { 'paymentEmail.count': 1 },
      $push: { 'paymentEmail.history': { sentAt, sentTo: recipient, sentBy: user.name || '', reference: payment.paymentSettlement.reference, amount: paymentAmount(kind, payment), resend } },
      $unset: { 'paymentEmail.attemptId': '', 'paymentEmail.sendingUntil': '' },
    });
    if (!audit.matchedCount) throw new Error('Send audit changed.');
    return { state: 'sent', message: `Payment confirmation sent to ${recipient}.`, sentAt, sentTo: recipient };
  } catch (error) {
    const message = accepted ? 'Email was submitted, but send history could not be saved. Check delivery before resending.' : `Payment remains saved. Email was not sent: ${error.message || 'delivery failed'}`;
    if (loaded && attemptId) await loaded.Model.updateOne(companyScopeFilter(user, { _id: id, 'paymentEmail.attemptId': attemptId }), {
      $set: { 'paymentEmail.lastError': message }, ...(!accepted ? { $unset: { 'paymentEmail.attemptId': '', 'paymentEmail.sendingUntil': '' } } : {}),
    }).catch(() => {});
    return { state: 'failed', message };
  }
}

// Runs after successful persistence, never during queue-only events or a DB transaction.
export async function maybeSendPaymentConfirmation(kind, payment, user) {
  if (!isPaymentSettled(kind, payment) || !payment.paymentEmail?.requested || payment.paymentEmail.sentAt) return null;
  if (payment.paymentEmail.lastError) return { state: 'failed', message: payment.paymentEmail.lastError };
  return sendPaymentConfirmation(kind, String(payment._id), user);
}
