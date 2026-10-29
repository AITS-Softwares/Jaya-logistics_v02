import { withBranchAccess } from '@/lib/branchAccess';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import VehicleNegotiation from '@/app/api/vehicle-negotiation/VehicleNegotiation';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
import { activeOperatingCompanyId, companyScopeFilter } from '@/lib/companyScope';
import { isVnnReadyForDownstream } from '@/lib/vehicleNegotiationWorkflow';

function authorize(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: 'Authentication required.', status: 401 };
  try {
    const user = verifyJWT(token);
    if (!user) return { error: 'Invalid session.', status: 401 };
    activeOperatingCompanyId(user);
    if (user.type === 'company' || user.roles?.includes('Admin')) return { user };
    const module = user.modules?.['Vehicle Negotiation'];
    if (!module?.selected || module.permissions?.edit !== true) {
      return { error: 'Vehicle Negotiation edit permission is required.', status: 403 };
    }
    return { user };
  } catch {
    return { error: 'Invalid session.', status: 401 };
  }
}

async function branchHandlerPATCH(req, { params }) {
  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, message: 'Invalid record id.' }, { status: 400 });
  const auth = authorize(req);
  if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });

  const { memoFile } = await req.json();
  await dbConnect();
  const record = await VehicleNegotiation.findOne(companyScopeFilter(auth.user, { _id: id }));
  if (!record) return NextResponse.json({ success: false, message: 'Vehicle Negotiation not found.' }, { status: 404 });
  if (record.upstreamPending?.length || record.reapprovalState === 'blockedByUpstream') return NextResponse.json({ success: false, message: 'This Vehicle Negotiation is blocked by an upstream correction.' }, { status: 409 });
  if (record.reapprovalState === 'pendingApproval' || record.reapprovalState === 'syncFailed') return NextResponse.json({ success: false, message: 'This Vehicle Negotiation is waiting for approval or admin sync recovery.' }, { status: 409 });
  if (isVnnReadyForDownstream(record) && !['unlocked', 'pendingApproval', 'pendingReapproval'].includes(record.reapprovalState)) return NextResponse.json({ success: false, message: 'Approved Vehicle Negotiation records are locked. Ask an admin to unlock this record first.' }, { status: 409 });
  const hasFile = memoFile && typeof memoFile === 'object' && (memoFile.filePath || memoFile.filename || memoFile.originalName);
  record.approval.memoFile = hasFile ? {
    filePath: memoFile.filePath || '', fullPath: memoFile.fullPath || '', filename: memoFile.filename || '',
    originalName: memoFile.originalName || '', size: Number(memoFile.size) || 0, mimeType: memoFile.mimeType || '', uploadedAt: new Date()
  } : null;
  record.approval.memoStatus = hasFile ? 'Uploaded' : 'Pending';
  if (['unlocked', 'pendingApproval', 'pendingReapproval'].includes(record.reapprovalState)) {
    record.approval.part1Status = 'Pending';
    record.approval.part3Status = 'Pending';
    record.panelStatus = 'Submitted';
    record.reapprovalState = 'pendingApproval';
  }
  record.workflow.audit = record.workflow.audit || [];
  record.workflow.audit.push({ action: hasFile ? 'memo-uploaded' : 'memo-cleared', by: auth.user.id || null, at: new Date() });
  await record.save();
  return NextResponse.json({ success: true, data: { memoStatus: record.approval.memoStatus, memoFile: record.approval.memoFile } });
}

export const PATCH = withBranchAccess(branchHandlerPATCH);
