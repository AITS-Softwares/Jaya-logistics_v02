import CompanyUser from "@/models/CompanyUser";
import Notification from "@/models/project/NotificationModel";

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
 * action. Delivery remains inside the application.
 */
export async function notifyModulePermissionUsers({
  user,
  module,
  action,
  type,
  message,
}) {
  try {
    const candidates = await CompanyUser.find({
      companyId: user.companyId,
      isActive: { $ne: false },
    }).select("_id roles modules").lean();
    const recipients = candidates.filter((recipient) => permissionFor(recipient, module, action));
    if (!recipients.length) return { recipients: 0 };

    await Notification.insertMany(recipients.map((recipient) => ({
      user: user.type === "user" ? user.id : recipient._id,
      company: user.companyId,
      assignedTo: recipient._id,
      type,
      message,
      role: "user",
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
  const body = readyMessage || `${subject} is ready to create.`;
  return notifyModulePermissionUsers({
    user,
    module,
    action: "create",
    type: `pending-create:${module.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    message: body,
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
  });
}
