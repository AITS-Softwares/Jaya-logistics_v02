import CompanyUser from "@/models/CompanyUser";
import Notification from "@/models/project/NotificationModel";
import { branchContext } from '@/lib/branchContext';
import { notificationBranchSource } from '@/lib/branchNotifications';
import { canAccessBranches, key } from '@/lib/branchOwnership.mjs';
import { safeNotificationUrl } from '@/lib/pushPolicy.mjs';

function permissionFor(recipient, moduleName, action) {
  if ((recipient.roles || []).includes("Admin")) return true;
  const modules = recipient.modules instanceof Map
    ? Object.fromEntries(recipient.modules.entries())
    : (recipient.modules || {});
  const module = modules[moduleName];
  return module?.selected === true && module.permissions?.[action] === true;
}

/**
 * Persist an in-app handoff notification for users who can perform the next
 * action. The inbox is persisted first; the server worker delivers Web Push.
 */
export async function notifyModulePermissionUsers({
  user,
  module,
  action,
  type,
  message,
  reference,
  url,
  recipientIds,
}) {
  try {
    const candidates = await CompanyUser.find({
      companyId: user.companyId,
      isActive: { $ne: false },
    }).select("_id roles modules accessAllBranches branchIds accessAllOperatingCompanies operatingCompanyIds").lean();
    const source = await notificationBranchSource({ reference, message });
    const recipients = candidates.filter((recipient) => {
      if (recipientIds && !recipientIds.map(String).includes(String(recipient._id))) return false;
      if (!permissionFor(recipient, module, action)) return false;
      if (user.activeOperatingCompanyId && recipient.accessAllOperatingCompanies !== true &&
          !(recipient.operatingCompanyIds || []).map(key).includes(key(user.activeOperatingCompanyId))) return false;
      return canAccessBranches(recipient, source?.ownership);
    });
    // Keep an overview event even when nobody needs a personal alert.
    // This includes self-approval and workflows with no assigned approver.
    const targets = recipients.length ? recipients : [{ _id: null }];
    await Notification.insertMany(targets.map((recipient) => ({
      user: user.id || user.companyId,
      company: user.companyId,
      assignedTo: recipient._id,
      ...(recipient._id ? {} : { pushState: 'skipped' }),
      type,
      message,
      url: safeNotificationUrl(url),
      reference: reference || '',
      moduleName: module,
      requiredAction: action,
      branchIds: source?.ownership || [],
      role: "user",
      subCompanyId: branchContext.getStore()?.user.activeOperatingCompanyId || user.activeOperatingCompanyId || null,
      sourceModel: source?.sourceModel || '',
      sourceRecordId: source?.sourceRecordId || '',
    })));

    return { recipients: recipients.length };
  } catch (error) {
    // The panel transition is already saved. Notifications must never roll it back.
    console.error(`Workflow notification failed (${module}/${action}):`, error);
    return { recipients: 0, failed: true };
  }
}

export async function notifyModuleCreateUsers({ user, module, panelLabel, reference, url, readyMessage }) {
  const subject = reference ? `${panelLabel} ${reference}` : panelLabel;
  const body = readyMessage || `${module} is ready to create for ${reference || subject}.`;
  return notifyModulePermissionUsers({
    user,
    module,
    action: "create",
    type: `pending-create:${module.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    message: body,
    reference,
    url,
  });
}

export async function notifyModuleApprovers({ user, module, panelLabel, reference, url }) {
  const subject = reference ? `${panelLabel} ${reference}` : panelLabel;
  const approvalPaths = {
    'Order Panel': 'order-panel', 'Vehicle Negotiation': 'vehicle-negotiation',
    'Pricing Panel - Part 2 Approval': 'pricing-panel', 'Loading Info': 'Loading-Info',
    'Consignment Note': 'Consignment-Note', 'Purchase Panel': 'Purchase-Panel',
    'Advance Payment': 'Advance-Payment', 'Proof Of Delivery': 'ProofofDelivery', 'Balance-Payment': 'Balance-Payment',
  };
  const recordId = url?.match(/\/([a-f0-9]{24})\/?$/i)?.[1];
  const approvalUrl = recordId && approvalPaths[module] ? `/admin/${approvalPaths[module]}/approve/${recordId}` : url;
  return notifyModulePermissionUsers({
    user,
    module,
    action: "approve",
    type: `approval-request:${module.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    message: `${subject} was submitted for approval.`,
    reference,
    url: approvalUrl,
  });
}

/** Tell the record's creator the outcome; this never grants approval rights. */
export async function notifyModuleDecision({ user, record, module, reference, action, url }) {
  const decisions = { approve: 'approved', reject: 'returned for correction', complete: 'completed' };
  const creatorId = record.createdBy?._id || record.createdBy;
  if (!decisions[action]) return;
  const recipientIds = creatorId && String(creatorId) !== String(user.id) ? [creatorId] : [];
  return notifyModulePermissionUsers({ user, module, action: 'view', recipientIds,
    type: `workflow-decision:${action}:${module.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    reference, url, message: `${module} ${reference || ''} was ${decisions[action]}.` });
}
