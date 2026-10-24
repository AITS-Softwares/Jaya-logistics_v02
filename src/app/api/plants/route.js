import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Plant from "./schema";
import OrderPanel from "@/app/api/order-panel/OrderPanel";
import { companyScopeFilter } from "@/lib/companyScope";
import mongoose from "mongoose";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { validateMasterDataRequest } from '@/lib/masterDataPermission';

// ✅ Role-based access check
// ✅ Role-based access for vehicle negotiation management
function isAuthorized(user) {
  if (!user) return false;

  // ✅ Company users have full access
  if (user.type === "company") return true;

  // ✅ Check for specific roles
  const allowedRoles = [
    "admin",
    "sales manager",
    "purchase manager",
    "inventory manager",
    "accounts manager",
    "hr manager",
    "support executive",
    "production head",
    "project manager"
  ];

  // Handle both single role and roles array
  const userRoles = Array.isArray(user.roles) 
    ? user.roles 
    : (user.role ? [user.role] : []);

  const hasAllowedRole = userRoles.some(role =>
    allowedRoles.includes(role.trim().toLowerCase())
  );

  if (hasAllowedRole) return true;

  // ✅ Check for specific permission (if your system uses permissions)
  if (Array.isArray(user.permissions) && 
      user.permissions.includes("vehicle_negotiation")) {
    return true;
  }

  return false;
}

async function validateUser(req, action = 'view') {
  return validateMasterDataRequest(req, action, "Plants", { allowLookup: action === "view" });
}

/* ========================================
   GET /api/plants
======================================== */
export async function GET(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req, 'view');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const url = new URL(req.url);
    const branchId = url.searchParams.get("branchId");
    let plantQuery = { companyId: user.companyId };

    if (branchId) {
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        return NextResponse.json({ success: false, message: "Invalid branch ID" }, { status: 400 });
      }
      const orderPanels = await OrderPanel.find(companyScopeFilter(user, { branch: branchId }))
        .select("plantRows.plantCode plantRows.plantCodeValue")
        .lean();
      const plantIds = new Set();
      const plantCodes = new Set();
      orderPanels.forEach((panel) => (panel.plantRows || []).forEach((row) => {
        if (row.plantCode && mongoose.Types.ObjectId.isValid(String(row.plantCode))) plantIds.add(String(row.plantCode));
        if (row.plantCodeValue) plantCodes.add(String(row.plantCodeValue).trim());
      }));
      plantQuery = {
        companyId: user.companyId,
        $or: [
          ...(plantIds.size ? [{ _id: { $in: [...plantIds] } }] : []),
          ...(plantCodes.size ? [{ code: { $in: [...plantCodes] } }] : []),
        ],
      };
      if (!plantIds.size && !plantCodes.size) {
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
      }
    }

    const plants = await Plant.find(plantQuery).sort({ name: 1 });

    return NextResponse.json({ success: true, data: plants }, { status: 200 });
  } catch (err) {
    console.error("GET /plants error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch plants" }, { status: 500 });
  }
}

/* ========================================
   POST /api/plants
======================================== */
export async function POST(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req, 'create');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { name, code } = await req.json();

    if (!name || !code) {
      return NextResponse.json({ success: false, message: "Plant name and code are required" }, { status: 400 });
    }

    // ✅ Prevent duplicate plant code in the same company
    const existingPlant = await Plant.findOne({
      code,
      companyId: user.companyId,
    });
    
    if (existingPlant) {
      return NextResponse.json({ success: false, message: "Plant code already exists" }, { status: 400 });
    }

    // ✅ Create new plant
    const newPlant = new Plant({
      name,
      code,
      companyId: user.companyId,
      createdBy: user.id,
    });

    await newPlant.save();
    return NextResponse.json({ success: true, data: newPlant }, { status: 201 });
  } catch (error) {
    console.error("POST /plants error:", error);
    return NextResponse.json({ success: false, message: "Failed to create plant" }, { status: 500 });
  }
}

/* ========================================
   DELETE /api/plants?id=123
======================================== */
export async function DELETE(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req, 'delete');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const url = new URL(req.url);
    const plantId = url.searchParams.get("id");

    if (!plantId) {
      return NextResponse.json({ success: false, message: "Plant ID is required" }, { status: 400 });
    }

    const deletedPlant = await Plant.findOneAndDelete({
      _id: plantId,
      companyId: user.companyId,
    });

    if (!deletedPlant) {
      return NextResponse.json({ success: false, message: "Plant not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Plant deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /plants error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete plant" }, { status: 500 });
  }
}
