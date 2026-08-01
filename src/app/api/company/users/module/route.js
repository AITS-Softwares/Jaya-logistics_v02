// app/api/company/users/modules/route.js

import dbConnect from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { NextResponse } from "next/server";
import { verifyCompany } from "@/lib/auth";

/**
 * PUT /api/company/users/modules
 * Body: { userId: string, modulePermissions: Record<string, string> }
 * 
 * Updates the modules map for the given user.
 * modulePermissions keys are module names, values are:
 *   "Full Authorization", "Read Only", or "No Authorization"
 */
export async function PUT(req) {
  try {
    // Ensure only company admins can call this endpoint
    const company = verifyCompany(req);

    // Parse request body
    const { userId, modulePermissions } = await req.json();

    // Validate required fields
    if (!userId || !modulePermissions || typeof modulePermissions !== "object") {
      return NextResponse.json(
        { message: "Missing userId or invalid modulePermissions" },
        { status: 400 }
      );
    }

    // Connect to the database
    await dbConnect();

    // Find the user within the same company
    const user = await CompanyUser.findOne({
      _id: userId,
      companyId: company.companyId,
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Update each module's permissions
    for (const [moduleName, permissionValue] of Object.entries(modulePermissions)) {
      // Convert the dropdown value to a full permissions object
      const permissions = getPermissionsFromDropdown(permissionValue);
      user.modules.set(moduleName, {
        selected: permissionValue !== "No Authorization",
        permissions,
      });
    }

    // Save the updated user document
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Authorizations updated successfully",
    });
  } catch (error) {
    console.error("PUT /api/company/users/modules error:", error);
    const status = error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 500;
    return NextResponse.json({ message: error.message }, { status });
  }
}

/**
 * Helper: maps a dropdown string to the detailed permissions object.
 * 
 * Full Authorization  → all actions true
 * Read Only           → only view true, others false
 * No Authorization    → all false
 */
function getPermissionsFromDropdown(value) {
  switch (value) {
    case "Full Authorization":
      return {
        create: true,
        view: true,
        edit: true,
        delete: true,
        print: true,
        approve: true,
        reject: true,
        import: true,
        export: true,
        upload: true,
        download: true,
        email: true,
        copy: true,
        whatsapp: true,
      };
    case "Read Only":
      return {
        create: false,
        view: true,
        edit: false,
        delete: false,
        print: false,
        approve: false,
        reject: false,
        import: false,
        export: false,
        upload: false,
        download: false,
        email: false,
        copy: false,
        whatsapp: false,
      };
    default: // "No Authorization" or any other unrecognized value
      return {
        create: false,
        view: false,
        edit: false,
        delete: false,
        print: false,
        approve: false,
        reject: false,
        import: false,
        export: false,
        upload: false,
        download: false,
        email: false,
        copy: false,
        whatsapp: false,
      };
  }
}