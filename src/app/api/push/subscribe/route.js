import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import PushSubscription from '@/models/PushSubscription';
import { pushIdentity, pushConfigured } from '@/lib/pushAuth';
import { validSubscription, validPushEndpoint } from '@/lib/pushPolicy.mjs';

export const runtime = 'nodejs';
const hash = endpoint => createHash('sha256').update(endpoint).digest('hex');
const fail = error => NextResponse.json({ message: error.status ? error.message : 'Unable to update notification settings.' }, { status: error.status || 500 });

export async function GET(req) {
  try {
    await pushIdentity(req);
    return NextResponse.json({ configured: pushConfigured(), publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return fail(error); }
}

export async function POST(req) {
  try {
    const user = await pushIdentity(req);
    if (!pushConfigured()) return NextResponse.json({ message: 'Push notifications need server configuration.' }, { status: 503 });
    const sub = await req.json().catch(() => null);
    if (!validSubscription(sub)) return NextResponse.json({ message: 'Invalid browser subscription.' }, { status: 400 });
    // An endpoint belongs to one signed-in account at a time on shared tablets.
    await PushSubscription.findOneAndUpdate({ endpointHash: hash(sub.endpoint) }, { $set: {
      endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      userId: user.id, companyId: user.companyId, accountType: user.type,
      userAgent: (req.headers.get('user-agent') || '').slice(0, 300),
    } }, { upsert: true, runValidators: true });
    return NextResponse.json({ success: true });
  } catch (error) { return fail(error); }
}

export async function DELETE(req) {
  try {
    const user = await pushIdentity(req);
    const body = await req.json().catch(() => null);
    if (!validPushEndpoint(body?.endpoint)) return NextResponse.json({ message: 'Invalid subscription.' }, { status: 400 });
    await PushSubscription.deleteOne({ endpointHash: hash(body.endpoint), userId: user.id, companyId: user.companyId, accountType: user.type });
    return NextResponse.json({ success: true });
  } catch (error) { return fail(error); }
}
