import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { withBranchAccess } from '@/lib/branchAccess';
import { pushIdentity } from '@/lib/pushAuth';
import { visibleInbox, inboxItem, markInboxRead } from '@/lib/notificationInbox';

async function handle(req, { params }) {
  try {
    const user = await pushIdentity(req);
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ message: 'Invalid notification.' }, { status: 400 });
    const [item] = await visibleInbox(user, { _id: id }, new URL(req.url).searchParams.get('view'));
    if (!item) return NextResponse.json({ message: 'Notification is unavailable in this workspace.' }, { status: 404 });
    if (req.method !== 'GET') {
      await markInboxRead(user, [item]);
      item.read = true;
    }
    return NextResponse.json(inboxItem(item), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return NextResponse.json({ message: error.status ? error.message : 'Unable to update notification.' }, { status: error.status || 500 }); }
}
export const GET = withBranchAccess(handle);
export const PUT = withBranchAccess(handle);
