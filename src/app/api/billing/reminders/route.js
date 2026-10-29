import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { withBranchAccess } from '@/lib/branchAccess';
import { pushIdentity } from '@/lib/pushAuth';
import { loadBillingReminderGroups, billingGroupUrl } from '@/lib/billingReminders.mjs';
import { billingGroupsForUser, hasBillingWorkPermission } from '@/lib/billingReminderPolicy.mjs';

async function getBillingWork(req) {
  try {
    const user = await pushIdentity(req);
    if (!hasBillingWorkPermission(user)) return NextResponse.json({ success: true, records: [] });
    const groups = billingGroupsForUser(user, await loadBillingReminderGroups(mongoose.connection.db, user.companyId), { operatingCompanyId: user.activeOperatingCompanyId });
    return NextResponse.json({ success: true, records: groups.map(group => ({
      type: 'billing', id: group.groupKey, module: 'Billing', no: group.clientName,
      reapprovalState: 'pendingBilling', actionable: true, path: billingGroupUrl(group),
      lrCount: group.rows.length,
    })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return NextResponse.json({ success: false, message: error.status ? error.message : 'Unable to load billing reminders.' }, { status: error.status || 500 }); }
}
export const GET = withBranchAccess(getBillingWork);
