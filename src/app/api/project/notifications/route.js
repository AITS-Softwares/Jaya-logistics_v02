import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { withBranchAccess } from '@/lib/branchAccess';
import { pushIdentity } from '@/lib/pushAuth';
import { visibleInbox, inboxItem, markInboxRead } from '@/lib/notificationInbox';
import { canOverview, activitySettings } from '@/lib/notificationActivityPolicy.mjs';

async function getInbox(req) {
  try {
    const user = await pushIdentity(req);
    const query = new URL(req.url).searchParams;
    const filter = {};
    const search = String(query.get('search') || '').trim().slice(0, 120);
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = ['message', 'reference', 'moduleName'].map(field => ({ [field]: { $regex: escaped, $options: 'i' } }));
    }
    if (query.get('module')) filter.moduleName = String(query.get('module')).slice(0, 100);
    if (query.get('from') || query.get('to')) {
      filter.createdAt = {};
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.get('from') || '')) filter.createdAt.$gte = new Date(`${query.get('from')}T00:00:00+05:30`);
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.get('to') || '')) filter.createdAt.$lte = new Date(`${query.get('to')}T23:59:59.999+05:30`);
      if (!Object.keys(filter.createdAt).length) delete filter.createdAt;
    }
    const items = (await visibleInbox(user, filter, query.get('view'))).map(inboxItem);
    return NextResponse.json(query.get('meta') === '1' ? { items, isAdmin: canOverview(user), canOverview: activitySettings.adminOverview && canOverview(user) } : items, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return NextResponse.json({ message: error.status ? error.message : 'Unable to load notifications.' }, { status: error.status || 500 }); }
}

async function markRead(req) {
  try {
    const user = await pushIdentity(req);
    const body = await req.json().catch(() => null);
    const ids = body?.ids || (body?.id ? [body.id] : []);
    if (!Array.isArray(ids) || ids.length > 200 || ids.some(id => typeof id !== 'string' || !mongoose.isValidObjectId(id))) {
      return NextResponse.json({ message: 'Invalid notification selection.' }, { status: 400 });
    }
    const visible = await visibleInbox(user, body?.all === true || req.method === 'PUT' ? {} : { _id: { $in: ids } }, new URL(req.url).searchParams.get('view'));
    await markInboxRead(user, visible);
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ message: error.status ? error.message : 'Unable to update notifications.' }, { status: error.status || 500 }); }
}

export const GET = withBranchAccess(getInbox);
export const PATCH = withBranchAccess(markRead);
export const PUT = withBranchAccess(markRead);
