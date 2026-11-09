import { NextResponse } from "next/server";
import { verifyToken, hasAnyPermission } from "@/lib/auth";

// Tracking Plan owns both vehicle tracking and every Driver Mobile staff panel.
// View is read-only; Edit controls driver/device management and mobile settings.
export function requireDriverMobileStaff(req, action = "view") {
  try {
    const user = verifyToken(req);
    if (!user) throw new Error("Unauthorized");
    const permitted = user.type === "company" || user.roles?.includes("Admin") || hasAnyPermission(user, "Tracking Plan", action === "edit" ? ["edit"] : ["view", "edit"]);
    if (!permitted) return { error: NextResponse.json({ success: false, code: "FORBIDDEN", message: `Tracking Plan ${action} permission is required.` }, { status: 403 }) };
    return { user };
  } catch {
    return { error: NextResponse.json({ success: false, code: "UNAUTHORIZED", message: "A valid staff token is required." }, { status: 401 }) };
  }
}

// Keep route imports stable; all staff endpoints now share the same permission.
export function requireDriverMobileSettingsStaff(req, action = "view") {
  return requireDriverMobileStaff(req, action);
}
export function requireDriverAccessMasterStaff(req) {
  return requireDriverMobileStaff(req, "view");
}
