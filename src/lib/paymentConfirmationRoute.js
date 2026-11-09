import { NextResponse } from 'next/server';
import { syncPodAdvanceForPurchase } from '@/lib/advanceSettlement';
import { notifyModuleDecision } from '@/lib/workflowNotifications';
import { withAuth, hasPermission } from '@/lib/auth';
import { withBranchAccess } from '@/lib/branchAccess';
import { companyScopeFilter } from '@/lib/companyScope';
import { isIciciQueueApiSkipped } from '@/lib/paymentQueueConfig.mjs';
import { paymentAmount, paymentReference, recordPaymentSettlement } from '@/lib/paymentConfirmationRules.mjs';
import { loadPaymentConfirmation, paymentModel, maybeSendPaymentConfirmation, sendPaymentConfirmation } from '@/lib/paymentConfirmationService';

const fail = (message, status = 400) => NextResponse.json({ success: false, message }, { status });
export function paymentConfirmationHandlers(kind) {
  const module = kind === 'advance' ? 'Advance Payment' : 'Balance-Payment';
  const valid = id => /^[a-f\d]{24}$/i.test(id || '');
  const GET = withAuth(async (req, context, user) => {
    try {
      const { id } = await context.params;
      if (!valid(id)) return fail('Invalid payment ID.');
      const loaded = await loadPaymentConfirmation(kind, id, user);
      const p = loaded.payment;
      const manualAllowed = isIciciQueueApiSkipped() && p.bankIntegration?.provider !== 'ICICI_CIB';
      return NextResponse.json({ success: true, data: {
        requested: !!p.paymentEmail?.requested, canEditPreference: hasPermission(user, module, 'edit'),
        canApprove: hasPermission(user, module, 'approve'), manualAllowed,
        canConfirm: manualAllowed && !p.isDraft && !p.paymentSettlement?.confirmedAt && ['Approved', 'Queued', 'Paid', 'Completed'].includes(kind === 'advance' ? p.paymentDetails?.paymentStatus : p.paymentStatus),
        settled: !loaded.settlementIssue, status: kind === 'advance' ? p.paymentDetails?.paymentStatus : p.paymentStatus,
        reference: p.paymentSettlement?.reference || paymentReference(kind, p), amount: paymentAmount(kind, p),
        paidAt: p.paymentSettlement?.confirmedAt || null,
        to: loaded.recipient, from: loaded.master?.email || '', subject: loaded.subject, html: loaded.html,
        canSend: !loaded.blockedReason && hasPermission(user, module, 'approve'), blockedReason: loaded.blockedReason,
        sentAt: p.paymentEmail?.sentAt || null, sentTo: p.paymentEmail?.sentTo || '', sentBy: p.paymentEmail?.sentBy || '',
        history: p.paymentEmail?.history || [], lastError: p.paymentEmail?.lastError || '',
      } });
    } catch (error) { return fail(error.message || 'Unable to load payment confirmation.', error.status || 500); }
  }, { module, actions: ['view', 'edit', 'approve'] });

  const PATCH = withAuth(async (req, context, user) => {
    try {
      const { id } = await context.params;
      if (!valid(id)) return fail('Invalid payment ID.');
      const body = await req.json();
      if (body.action !== 'preference' && body.action !== 'confirm-paid') return fail('Invalid payment action.');
      const permission = body.action === 'preference' ? 'edit' : 'approve';
      if (!hasPermission(user, module, permission)) return fail(`${permission} permission is required.`, 403);
      const { payment } = await loadPaymentConfirmation(kind, id, user);
      const Model = paymentModel(kind), scope = companyScopeFilter(user, { _id: id });
      if (body.action === 'preference') {
        if (typeof body.requested !== 'boolean') return fail('Choose whether to send payment confirmation emails.');
        await Model.updateOne(scope, { $set: { 'paymentEmail.requested': body.requested } });
        return NextResponse.json({ success: true, message: 'Email preference saved. It does not change payment status.' });
      }
      if (!isIciciQueueApiSkipped() || payment.bankIntegration?.provider === 'ICICI_CIB') return fail('Manual payment confirmation is available only while the ICICI queue API is skipped, for payments not submitted to ICICI.', 409);
      if (payment.isDraft) return fail('Submit and approve this payment first.', 409);
      const statusKey = kind === 'advance' ? 'paymentDetails.paymentStatus' : 'paymentStatus';
      const status = kind === 'advance' ? payment.paymentDetails?.paymentStatus : payment.paymentStatus;
      if (!['Approved', 'Queued', 'Paid', 'Completed'].includes(status)) return fail('Approve this payment before confirming that it is paid.', 409);
      if (payment.paymentSettlement?.confirmedAt) return fail('This payment has already been confirmed. Refresh to view its confirmation.', 409);
      if (!Number.isFinite(Number(body.expectedAmount)) || Math.abs(Number(body.expectedAmount) - paymentAmount(kind, payment)) > 0.005) return fail('The payment amount changed or was not reviewed. Refresh and confirm the current amount.', 409);
      const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
      if (!reference || reference.length > 100 || /[\r\n\x00-\x1f]/.test(reference)) return fail('Enter the actual paid transaction / UTR reference (up to 100 characters).');
      if (kind === 'advance') { payment.paymentDetails ||= {}; payment.paymentDetails.paymentStatus = 'Paid'; payment.paymentDetails.transactionId = reference; payment.status = 'Paid'; }
      else { payment.paymentStatus = 'Paid'; payment.transactionId = reference; }
      recordPaymentSettlement(kind, payment, user, true);
      const fields = kind === 'advance' ? { 'paymentDetails.paymentStatus': 'Paid', 'paymentDetails.transactionId': reference, 'paymentDetails.paymentDate': payment.paymentDetails.paymentDate, status: 'Paid' } : { paymentStatus: 'Paid', transactionId: reference, paymentDate: payment.paymentDate };
      const saved = await Model.findOneAndUpdate({
        ...scope, [statusKey]: status, 'bankIntegration.provider': { $ne: 'ICICI_CIB' },
        'paymentSettlement.confirmedAt': null, ...(payment.updatedAt ? { updatedAt: payment.updatedAt } : {}),
      }, { $set: { ...fields, paymentSettlement: payment.paymentSettlement } }, { new: true, runValidators: true });
      if (!saved) return fail('The payment changed while confirming. Refresh and review it again.', 409);
      if (kind === 'advance') await syncPodAdvanceForPurchase(user, saved.purchaseNo);
      const email = await maybeSendPaymentConfirmation(kind, saved, user);
      await notifyModuleDecision({ user, record: saved, module, reference: kind === 'advance' ? saved.paymentNo : saved.balancePaymentNo, action: 'complete', url: `/admin/${kind === 'advance' ? 'Advance-Payment' : 'Balance-Payment'}/${id}` }).catch(error => console.error('Payment confirmation notification failed:', error));
      return NextResponse.json({ success: true, message: 'Payment confirmed as Paid.', paymentEmail: email });
    } catch (error) { return fail(error.message || 'Unable to update payment confirmation.', error.status || 500); }
  }, { module, actions: ['edit', 'approve'] });

  const POST = withAuth(async (req, context, user) => {
    try {
      const { id } = await context.params;
      if (!valid(id)) return fail('Invalid payment ID.');
      const body = await req.json();
      if (body.resend !== undefined && typeof body.resend !== 'boolean') return fail('Invalid resend request.');
      const result = await sendPaymentConfirmation(kind, id, user, { resend: body.resend === true });
      return NextResponse.json({ success: ['sent', 'alreadySent'].includes(result.state), message: result.message, data: result }, { status: ['sent', 'alreadySent'].includes(result.state) ? 200 : result.state === 'failed' ? 502 : 409 });
    } catch (error) { return fail(error.message || 'Unable to send payment confirmation.', error.status || 500); }
  }, { module, action: 'approve' });
  return { GET: withBranchAccess(GET), PATCH: withBranchAccess(PATCH), POST: withBranchAccess(POST) };
}
