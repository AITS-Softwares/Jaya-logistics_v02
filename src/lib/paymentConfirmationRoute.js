import { NextResponse } from 'next/server';
import { withAuth, hasPermission } from '@/lib/auth';
import { withBranchAccess } from '@/lib/branchAccess';
import { companyScopeFilter } from '@/lib/companyScope';
import { paymentAmount, paymentReference } from '@/lib/paymentConfirmationRules.mjs';
import { loadPaymentConfirmation, paymentModel, sendPaymentConfirmation } from '@/lib/paymentConfirmationService';

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
      return NextResponse.json({ success: true, data: {
        canApprove: hasPermission(user, module, 'approve'),
        requested: !!p.paymentEmail?.requested, canEditPreference: hasPermission(user, module, 'edit'),
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
      if (body.action === 'confirm-paid') return fail('Manual payment confirmation is disabled. Refresh bank status to confirm payment.', 409);
      if (body.action !== 'preference') return fail('Invalid payment action.');
      if (!hasPermission(user, module, 'edit')) return fail('edit permission is required.', 403);
      await loadPaymentConfirmation(kind, id, user);
      const Model = paymentModel(kind), scope = companyScopeFilter(user, { _id: id });
      if (body.action === 'preference') {
        if (typeof body.requested !== 'boolean') return fail('Choose whether to send payment confirmation emails.');
        await Model.updateOne(scope, { $set: { 'paymentEmail.requested': body.requested } });
        return NextResponse.json({ success: true, message: 'Email preference saved. It does not change payment status.' });
      }

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
