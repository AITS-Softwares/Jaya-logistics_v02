import { NextResponse } from 'next/server';
import { withBranchAccess } from '@/lib/branchAccess';
import { withAuth, hasPermission } from '@/lib/auth';
import { companyScopeFilter } from '@/lib/companyScope';
import connectDb from '@/lib/db';
import PricingPanel from '@/app/api/pricing-panel/PricingPanel';
import { canUnlockForCorrection } from '@/lib/reapprovalPermissions.mjs';
import { notifyModulePermissionUsers } from '@/lib/workflowNotifications';

const read = withAuth(async (req, { params }, user) => {
  await connectDb();
  if (!canUnlockForCorrection(user, 'pricing') && !['view', 'edit'].some(action => hasPermission(user, 'Pricing Panel', action))) return NextResponse.json({ success: false, message: 'Pricing permission required.' }, { status: 403 });
  const panel = await PricingPanel.findOne(companyScopeFilter(user, { _id: (await params).id })).lean();
  if (!panel) return NextResponse.json({ success: false, message: 'Pricing Panel not found.' }, { status: 404 });
  return NextResponse.json({ success: true, rows: (panel.orders || []).filter(row => row.cancellationChargeRequired), review: panel.cancellation?.chargeReview || null, canApprove: canUnlockForCorrection(user, 'pricing'), reference: panel.pricingSerialNo });
});

const write = withAuth(async (req, { params }, user) => {
  await connectDb();
  const { id } = await params;
  const body = await req.json();
  const reviewer = canUnlockForCorrection(user, 'pricing');
  if (body.action === 'submit' ? !hasPermission(user, 'Pricing Panel', 'edit') : !reviewer) return NextResponse.json({ success: false, message: 'Pricing edit permission is required to submit; Pricing approval permission is required to decide.' }, { status: 403 });
  if (!['submit', 'approve', 'reject'].includes(body.action)) return NextResponse.json({ success: false, message: 'Invalid charge action.' }, { status: 400 });
  const panel = await PricingPanel.findOne(companyScopeFilter(user, { _id: id }));
  if (!panel || !panel.orders.some(row => row.cancellationChargeRequired)) return NextResponse.json({ success: false, message: 'No cancellation charges are outstanding.' }, { status: 409 });
  const before = panel.cancellation?.chargeReview;
  if (body.action === 'submit') {
    if (before?.status === 'pending') return NextResponse.json({ success: false, message: 'Charges are already waiting for approval.' }, { status: 409 });
    const wanted = panel.orders.filter(row => row.cancellationChargeRequired);
    if (!Array.isArray(body.rows) || body.rows.length !== wanted.length || new Set(body.rows.map(row => String(row.id))).size !== wanted.length) return NextResponse.json({ success: false, message: 'Enter charges for every affected row exactly once.' }, { status: 400 });
    for (const row of wanted) {
      const input = body.rows.find(input => String(input.id) === String(row._id));
      if (!input || String(input.amount ?? '').trim() === '' || !Number.isFinite(Number(input.amount)) || Number(input.amount) < 0) return NextResponse.json({ success: false, message: 'Each affected row needs an explicit non-negative amount; zero is allowed.' }, { status: 400 });
    }
  } else if (before?.status !== 'pending') return NextResponse.json({ success: false, message: 'Submit charges before reviewing them.' }, { status: 409 });
  if (body.action === 'reject' && !String(body.reason || '').trim()) return NextResponse.json({ success: false, message: 'A rejection reason is required.' }, { status: 400 });
  const at = new Date();
  const review = body.action === 'submit' ? { status: 'pending', rows: body.rows.map(row => ({ id: String(row.id), amount: Number(row.amount) })), by: user.id, at } : { ...before, status: body.action === 'approve' ? 'approved' : 'rejected', reviewedBy: user.id, reviewedAt: at, reason: String(body.reason || '').trim() };
  if (body.action === 'approve') for (const row of panel.orders) {
    const approved = review.rows.find(input => input.id === String(row._id));
    if (approved) { row.cancellationCharges = String(approved.amount); row.cancellationChargeRequired = false; }
  }
  panel.cancellation = { ...(panel.cancellation || {}), chargeReview: review };
  panel.reapprovalHistory.push({ action: `cancellationCharges:${body.action}`, actorId: user.id, at, rows: review.rows, reason: review.reason });
  panel.$locals.allowCancellationWrite = true;
  // Atomic version check prevents stale submissions/approval decisions.
  panel.increment();
  await panel.save();
  await notifyModulePermissionUsers({ user, module: body.action === 'submit' ? 'Pricing Panel - Part 2 Approval' : 'Pricing Panel', action: body.action === 'submit' ? 'approve' : 'edit', type: `cancellation-charges:${body.action}`, reference: panel.pricingSerialNo, url: `/admin/pricing-panel/${id}/view`, message: `Cancellation charges for ${panel.pricingSerialNo}: ${review.status}.` });
  return NextResponse.json({ success: true, message: `Cancellation charges ${review.status}.` });
});

export const GET = withBranchAccess(read);
export const POST = withBranchAccess(write);
