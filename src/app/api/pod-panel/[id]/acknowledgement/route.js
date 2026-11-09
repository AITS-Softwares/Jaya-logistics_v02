import { withBranchAccess } from '@/lib/branchAccess';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import connectDb from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { companyScopeFilter } from '@/lib/companyScope';
import POD from '@/app/api/pod-panel/POD';
import Supplier from '@/models/SupplierModels';
import EmailMaster from '@/models/emailMaster/emailMaster';
import { getEmailMasterIssue, sendMailFromEmailMaster } from '@/lib/emailMasterMailer';
import { buildPodAcknowledgementEmail, ACK_ALLOWED_STATUSES } from '@/lib/podAcknowledgementEmail';

export const runtime = 'nodejs';
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const fail = (message, status = 400) => NextResponse.json({ success: false, message }, { status });

async function load(user, id, previewSection = null) {
  if (!OBJECT_ID_RE.test(id || '')) return { error: fail('Invalid POD id.') };
  await connectDb();
  const pod = await POD.findOne(companyScopeFilter(user, { _id: id })).lean();
  if (!pod) return { error: fail('POD not found.', 404) };
  const vendorCode = pod.vendorFinancial?.vendorCode || '';
  const supplier = vendorCode ? await Supplier.findOne({ supplierCode: vendorCode, companyId: user.companyId }).select('supplierName emailId').lean() : null;
  const emailMaster = await EmailMaster.findOne({ companyId: user.companyId, status: 'Active' }).sort({ updatedAt: -1, _id: -1 }).lean();
  const email = String(supplier?.emailId || '').trim();
  const section = { ...(pod.podStatusSection || {}) };
  if (previewSection) {
    for (const key of ['podStatus', 'lastPodDate', 'dueDate', 'paymentDate']) {
      if (typeof previewSection[key] === 'string') section[key] = previewSection[key].slice(0, 100);
    }
  }
  const status = section.podStatus || pod.podStatus || 'Pending';
  const { subject, html } = buildPodAcknowledgementEmail({ ...pod, podStatusSection: section }, { supplierName: supplier?.supplierName || pod.vendorFinancial?.vendorName, companyName: pod.companyName });
  const emailMasterIssue = getEmailMasterIssue(emailMaster);
  let setupIssue = '';
  if (pod.podStatusSection?.ackMailRequested !== true) setupIssue = 'Email was not requested. Select “Send acknowledgement email after approval” on POD Create/Edit and save it first.';
  else if (emailMasterIssue) setupIssue = emailMasterIssue;
  else if (!supplier) setupIssue = 'Supplier not found for this vendor code.';
  else if (!EMAIL_RE.test(email)) setupIssue = 'Supplier has no valid email ID. Add it in Supplier Management.';
  else if (!ACK_ALLOWED_STATUSES.includes(status)) setupIssue = 'Set a received POD status such as Clear & Ok or Deductions before sending.';
  const awaitingApproval = pod.approvalStatus !== 'Approved' || pod.isDraft || ['Draft', 'Pending', 'Rejected', 'Cancelled'].includes(pod.podStatus);
  const blockedReason = setupIssue || (awaitingApproval ? 'Approve this POD before sending its acknowledgement email.' : '');
  return { pod, supplier, emailMaster, email, subject, html, blockedReason, setupIssue };
}
function previewData(r) {
  const section = r.pod.podStatusSection || {};
  return {
    to: r.email, from: r.emailMaster?.email || '', supplierName: r.supplier?.supplierName || r.pod.vendorFinancial?.vendorName || '', subject: r.subject, html: r.html,
    requested: section.ackMailRequested === true, canSend: !r.blockedReason, canApproveAndSend: !r.setupIssue,
    blockedReason: r.blockedReason, setupIssue: r.setupIssue,
    alreadySent: !!(section.ackMailSentAt || section.acknowledgementMail), sentAt: section.ackMailSentAt || null, sentBy: section.ackMailSentBy || '', sentTo: section.ackMailTo || '',
  };
}
const branchHandlerGET = withAuth(async (req, context, user) => {
  try {
    const { id } = await context.params;
    const r = await load(user, id);
    if (r.error) return r.error;
    return NextResponse.json({ success: true, data: previewData(r) });
  } catch (error) { console.error('POD email preview error:', error); return fail('Failed to build email preview.', 500); }
}, { module: 'Proof Of Delivery', action: 'approve' });

const branchHandlerPOST = withAuth(async (req, context, user) => {
  let scope, attemptId, accepted = false;
  try {
    const { id } = await context.params;
    let body;
    try { const raw = await req.text(); body = raw.trim() ? JSON.parse(raw) : {}; }
    catch { return fail('Request body must be valid JSON.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Invalid email request.');
    if (body.action && !['preview', 'send'].includes(body.action)) return fail('Invalid email action.');
    const r = await load(user, id, body.action === 'preview' ? body.podStatusSection : null);
    if (r.error) return r.error;
    // An approval preview uses proposed status/dates without saving or emailing.
    if (body.action === 'preview') return NextResponse.json({ success: true, data: previewData(r) });
    if (r.blockedReason) return fail(r.blockedReason);
    const section = r.pod.podStatusSection || {};
    if (body.resend !== true && (section.ackMailSentAt || section.acknowledgementMail)) {
      return NextResponse.json({ success: true, message: 'Acknowledgement was already sent. Use Preview / Resend to send it again.', data: { to: section.ackMailTo, sentAt: section.ackMailSentAt, sentBy: section.ackMailSentBy } });
    }
    scope = companyScopeFilter(user, { _id: id }); attemptId = randomUUID();
    const now = new Date();
    const lock = await POD.updateOne({
      ...scope, approvalStatus: 'Approved', isDraft: { $ne: true }, podStatus: { $nin: ['Draft', 'Pending', 'Rejected', 'Cancelled'] }, 'podStatusSection.ackMailRequested': true,
      ...(section.podStatus ? { 'podStatusSection.podStatus': section.podStatus } : {}),
      ...(r.pod.updatedAt ? { updatedAt: r.pod.updatedAt } : {}),
      ...(body.resend === true ? {} : { 'podStatusSection.ackMailSentAt': null, 'podStatusSection.acknowledgementMail': { $ne: true } }),
      $or: [{ 'podStatusSection.ackMailSendingUntil': null }, { 'podStatusSection.ackMailSendingUntil': { $lte: now } }],
    }, { $set: { 'podStatusSection.ackMailAttemptId': attemptId, 'podStatusSection.ackMailSendingUntil': new Date(now.getTime() + 120000) } });
    if (!lock.matchedCount) return fail('Email is already being sent or this POD changed. Refresh before retrying.', 409);
    await sendMailFromEmailMaster({ emailMaster: r.emailMaster, to: r.email, subject: r.subject, html: r.html });
    accepted = true;
    const sentAt = new Date();
    const result = await POD.updateOne({ ...scope, 'podStatusSection.ackMailAttemptId': attemptId }, {
      $set: { 'podStatusSection.acknowledgementMail': true, 'podStatusSection.ackMailSentAt': sentAt, 'podStatusSection.ackMailSentBy': user.name || '', 'podStatusSection.ackMailTo': r.email },
      $inc: { 'podStatusSection.ackMailCount': 1 }, $unset: { 'podStatusSection.ackMailAttemptId': '', 'podStatusSection.ackMailSendingUntil': '' },
    });
    if (!result.matchedCount) throw new Error('Email sent but audit record changed.');
    return NextResponse.json({ success: true, message: `Acknowledgement sent to ${r.email}`, data: { to: r.email, sentAt, sentBy: user.name || '' } });
  } catch (error) {
    if (scope && attemptId && !accepted) await POD.updateOne({ ...scope, 'podStatusSection.ackMailAttemptId': attemptId }, { $unset: { 'podStatusSection.ackMailAttemptId': '', 'podStatusSection.ackMailSendingUntil': '' } }).catch(() => {});
    console.error('POD acknowledgement send error:', error);
    return fail(accepted ? 'Email was submitted, but its sent status could not be saved. Check delivery before resending.' : 'Email could not be sent. Approval remains saved; retry from Preview & Send.', 500);
  }
}, { module: 'Proof Of Delivery', action: 'approve' });
export const GET = withBranchAccess(branchHandlerGET);
export const POST = withBranchAccess(branchHandlerPOST);
