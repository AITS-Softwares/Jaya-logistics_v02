import CompanyUser from "@/models/CompanyUser";
import Notification from "@/models/project/NotificationModel";
import { sendWebPushToUsers } from "@/lib/webPush";

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
 * action, then make a best-effort Web Push attempt for their subscribed devices.
 */
export async function notifyModulePermissionUsers({
  user,
  module,
  action,
  type,
  message,
  pushTitle,
  pushBody,
  url,
}) {
  try {
    const candidates = await CompanyUser.find({
      companyId: user.companyId,
      isActive: { $ne: false },
    }).select("_id roles modules").lean();
    const recipients = candidates.filter((recipient) => permissionFor(recipient, module, action));
    if (!recipients.length) return { recipients: 0, pushSent: 0 };

    await Notification.insertMany(recipients.map((recipient) => ({
      user: user.type === "user" ? user.id : recipient._id,
      company: user.companyId,
      assignedTo: recipient._id,
      type,
      message,
      role: "user",
    })));

    const pushResult = await sendWebPushToUsers({
      companyId: user.companyId,
      userIds: recipients.map((recipient) => recipient._id),
      payload: { title: pushTitle, body: pushBody, url },
    });
    return { recipients: recipients.length, pushSent: pushResult.sent };
  } catch (error) {
    // The panel transition is already saved. Notifications must never roll it back.
    console.error(`Workflow notification failed (${module}/${action}):`, error);
    return { recipients: 0, pushSent: 0, failed: true };
  }
}

export async function notifyModuleCreateUsers({ user, module, panelLabel, reference, url, readyMessage }) {
  const subject = reference ? `${panelLabel} ${reference}` : panelLabel;
  const body = readyMessage || `${subject} is ready to create.`;
  return notifyModulePermissionUsers({
    user,
    module,
    action: "create",
    type: `pending-create:${module.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    message: body,
    pushTitle: `${panelLabel} ready to create`,
    pushBody: readyMessage || `${panelLabel} is ready to create.`,
    url,
  });
}

export async function notifyModuleApprovers({ user, module, panelLabel, reference, url }) {
  const subject = reference ? `${panelLabel} ${reference}` : panelLabel;
  return notifyModulePermissionUsers({
    user,
    module,
    action: "approve",
    type: `approval-request:${module.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    message: `${subject} was submitted for approval.`,
    pushTitle: `${panelLabel} needs approval`,
    pushBody: `${panelLabel} was submitted for approval.`,
    url,
  });
}
