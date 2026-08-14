import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import VehicleNegotiation from '@/app/api/vehicle-negotiation/VehicleNegotiation';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
import { activeOperatingCompanyId, companyScopeFilter } from '@/lib/companyScope';

function authorize(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: 'Authentication required.', status: 401 };
  try {
    const user = verifyJWT(token);
    if (!user) return { error: 'Invalid session.', status: 401 };
    activeOperatingCompanyId(user);
    if (user.type === 'company' || user.roles?.includes('Admin')) return { user };
    const module = user.modules?.['Vehicle Negotiation'];
    if (!module?.selected || (module.permissions?.edit !== true && module.permissions?.approve !== true)) {
      return { error: 'Vehicle Negotiation edit or approve permission is required.', status: 403 };
    }
    return { user };
  } catch {
    return { error: 'Invalid session.', status: 401 };
  }
}

export async function PATCH(req, { params }) {
  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, message: 'Invalid record id.' }, { status: 400 });
  const auth = authorize(req);
  if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });

  const { memoFile } = await req.json();
  await dbConnect();
  const record = await VehicleNegotiation.findOne(companyScopeFilter(auth.user, { _id: id }));
  if (!record) return NextResponse.json({ success: false, message: 'Vehicle Negotiation not found.' }, { status: 404 });

  const hasFile = memoFile && typeof memoFile === 'object' && (memoFile.filePath || memoFile.filename || memoFile.originalName);
  record.approval.memoFile = hasFile ? {
    filePath: memoFile.filePath || '', fullPath: memoFile.fullPath || '', filename: memoFile.filename || '',
    originalName: memoFile.originalName || '', size: Number(memoFile.size) || 0, mimeType: memoFile.mimeType || '', uploadedAt: new Date()
  } : null;
  record.approval.memoStatus = hasFile ? 'Uploaded' : 'Pending';
  record.workflow.audit = record.workflow.audit || [];
  record.workflow.audit.push({ action: hasFile ? 'memo-uploaded' : 'memo-cleared', by: auth.user.id || null, at: new Date() });
  await record.save();
  return NextResponse.json({ success: true, data: { memoStatus: record.approval.memoStatus, memoFile: record.approval.memoFile } });
}
