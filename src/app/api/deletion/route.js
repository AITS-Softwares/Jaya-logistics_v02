import { NextResponse } from 'next/server';
import connectDb from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { TYPES } from '@/lib/deletion/linkGraph';
import { deleteRecord, previewDeletion, restoreRecord } from '@/lib/deletion/handler';
import { isDeletionAdmin } from '@/lib/deletion/rules';

function send(result) {
  return NextResponse.json(result.body, { status: result.status });
}

function userFromRequest(req) {
  try { return verifyToken(req); } catch (error) { return { error: error.message }; }
}

export async function DELETE(req) {
  await connectDb();
  const user = userFromRequest(req);
  if (user.error) return NextResponse.json({ success: false, message: user.error }, { status: 401 });
  const url = new URL(req.url);
  const args = { type: url.searchParams.get('type'), id: url.searchParams.get('id'), user };
  if (url.searchParams.get('dryRun') === 'true') return send(await previewDeletion(args));
  const body = await req.json().catch(() => ({}));
  return send(await deleteRecord({ ...args, reason: body.reason }));
}

export async function POST(req) {
  await connectDb();
  const user = userFromRequest(req);
  if (user.error) return NextResponse.json({ success: false, message: user.error }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  return send(await restoreRecord({ type: body.type, id: body.id, user }));
}

export async function GET(req) {
  await connectDb();
  const user = userFromRequest(req);
  if (user.error) return NextResponse.json({ success: false, message: user.error }, { status: 401 });
  if (!isDeletionAdmin(user)) return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');
  if (url.searchParams.get('dryRun') === 'true') {
    return send(await previewDeletion({ type, id, user }));
  }
  if (url.searchParams.get('includeDeleted') !== 'true') return NextResponse.json({ success: false, message: 'includeDeleted=true is required' }, { status: 400 });
  const entry = TYPES[type];
  if (!entry) return NextResponse.json({ success: false, message: 'Invalid record type' }, { status: 400 });
  const data = await entry.Model.find({ companyId: user.companyId, isDeleted: true }).setOptions({ includeDeleted: true }).sort({ deletedAt: -1 }).lean();
  return NextResponse.json({ success: true, data });
}
