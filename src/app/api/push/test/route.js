import { NextResponse } from 'next/server';
import Notification from '@/models/project/NotificationModel';
import { pushIdentity, pushConfigured } from '@/lib/pushAuth';

export async function POST(req) {
  try {
    const user = await pushIdentity(req);
    if (!pushConfigured()) return NextResponse.json({ message: 'Push notifications need server configuration.' }, { status: 503 });
    const recent = await Notification.exists({ assignedTo: user.id, company: user.companyId, type: 'push-test', createdAt: { $gte: new Date(Date.now() - 60000) } });
    if (recent) return NextResponse.json({ message: 'Wait one minute before sending another test.' }, { status: 429 });
    await Notification.create({ user: user.id, assignedTo: user.id, company: user.companyId, type: 'push-test', message: 'Your Jaya ERP notification test was queued.', url: '/admin' });
    return NextResponse.json({ success: true, message: 'Test queued. The server notification worker will deliver it.' });
  } catch (error) { return NextResponse.json({ message: error.status ? error.message : 'Unable to queue a test.' }, { status: error.status || 500 }); }
}
