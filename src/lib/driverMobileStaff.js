import { NextResponse } from "next/server";
import { verifyToken, hasAnyPermission } from "@/lib/auth";

// Company accounts and ERP administrators already have access. Other staff
// require an existing Tracking Plan view/edit permission, preserving the ERP's
// current RBAC model instead of introducing a second staff identity system.
export function requireDriverMobileStaff(req, action = "view") {
  try {
    const user = verifyToken(req);
    if (!user) throw new Error("Unauthorized");
    const permitted = user.type === "company" || user.roles?.includes("Admin") || hasAnyPermission(user, "Tracking Plan", action === "edit" ? ["edit", "create", "approve"] : ["view", "edit", "create", "approve"]);
    if (!permitted) {
      return { error: NextResponse.json({ success: false, code: "FORBIDDEN", message: "Tracking Plan permission is required." }, { status: 403 }) };
    }
    return { user };
  } catch {
    return { error: NextResponse.json({ success: false, code: "UNAUTHORIZED", message: "A valid staff token is required." }, { status: 401 }) };
  }
}
