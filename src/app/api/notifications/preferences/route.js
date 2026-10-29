import { NextResponse } from 'next/server';
import { pushIdentity } from '@/lib/pushAuth';
import NotificationPreference from '@/models/project/NotificationPreference';
import { adminPushDefaults, isNotificationAdmin, validAdminPushChanges } from '@/lib/adminNotificationPolicy.mjs';

function result(preferences) {
  return Object.fromEntries(Object.entries(adminPushDefaults).map(([key, value]) => [key, preferences?.[key] ?? value]));
}

async function handle(req) {
  try {
    const user = await pushIdentity(req);
    if (!isNotificationAdmin(user)) return NextResponse.json({ message: 'Admin notification settings require an admin account.' }, { status: 403 });
    const filter = { company: user.companyId, account: user.id };
    let preferences;
    if (req.method === 'PATCH') {
      const body = await req.json().catch(() => null);
      if (!validAdminPushChanges(body)) return NextResponse.json({ message: 'Choose valid notification categories.' }, { status: 400 });
      preferences = await NotificationPreference.findOneAndUpdate(filter, { $set: body }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).lean();
    } else preferences = await NotificationPreference.findOne(filter).lean();
    return NextResponse.json({ preferences: result(preferences) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ message: error.status ? error.message : 'Unable to update notification preferences.' }, { status: error.status || 500 });
  }
}
export const GET = handle;
export const PATCH = handle;
