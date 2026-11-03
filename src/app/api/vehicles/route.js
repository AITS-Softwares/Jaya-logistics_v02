import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Vehicle from "./Vehicle";
import Owner from "@/app/api/owners/Owner";
import mongoose from "mongoose";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { validateMasterDataRequest } from '@/lib/masterDataPermission';

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
  return validateMasterDataRequest(req, action, "Vehicles", { allowLookup: action === "view" });
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };

  try {
    const user = await verifyJWT(token);
    if (!user) return { error: "Invalid token", status: 401 };
    if (!isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user, error: null, status: 200 };
  } catch (err) {
    console.error("JWT Verification Failed:", err?.message || err);
    return { error: "Invalid token", status: 401 };
  }
}

/* ========================================
   GET /api/vehicles
======================================== */
export async function GET(req) {
  await connectDb();
  const { user, error, status, access } = await validateUser(req, 'view');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("ownerOptions") === "1") {
      if (access === "lookup") {
        return NextResponse.json({ success: false, message: "Vehicle Master view access is required." }, { status: 403 });
      }
      const owners = await Owner.find({ companyId: user.companyId })
        .select("ownerName vehicleNumber rcNumber rcDocuments rcBackDocuments isActive")
        .sort({ ownerName: 1, vehicleNumber: 1 }).lean();
      return NextResponse.json({ success: true, data: owners });
    }
    const search = searchParams.get("search");
    const isActive = searchParams.get("isActive");

    // Build query
    let query = { companyId: user.companyId };

    if (isActive !== null) {
      query.isActive = isActive === "true";
    }

    if (search) {
      query.$or = [
        { vehicleNumber: { $regex: search, $options: "i" } },
        { rcNumber: { $regex: search, $options: "i" } },
        { ownerName: { $regex: search, $options: "i" } },
        { chasisNumber: { $regex: search, $options: "i" } },
      ];
    }

    const vehicles = await Vehicle.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: vehicles }, { status: 200 });
  } catch (err) {
    console.error("GET /vehicles error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch vehicles" }, { status: 500 });
  }
}

/* ========================================
   POST /api/vehicles
======================================== */
async function resolveVehicleOwner(companyId, ownerId, vehicleNumber, currentVehicle = null) {
  if (!mongoose.isValidObjectId(ownerId)) return { error: "Select an owner from Vehicle Owners." };
  const owner = await Owner.findOne({ _id: ownerId, companyId })
    .select("ownerName vehicleNumber rcNumber rcDocuments rcBackDocuments isActive").lean();
  if (!owner || (owner.isActive === false && String(currentVehicle?.ownerId) !== String(ownerId))) {
    return { error: "Select an active owner from Vehicle Owners." };
  }
  if (owner.vehicleNumber !== String(vehicleNumber || "").trim().toUpperCase()) {
    return { error: "The selected owner belongs to a different vehicle number." };
  }
  const duplicate = await Vehicle.exists({
    companyId, ownerId,
    ...(currentVehicle ? { _id: { $ne: currentVehicle._id } } : {}),
  });
  if (duplicate) return { error: "This owner is already linked to a vehicle." };
  if (!owner.rcNumber?.trim()) return { error: "Enter the RC number in Vehicle Owners first." };
  return {
    fields: {
      ownerId: owner._id,
      ownerName: owner.ownerName,
      vehicleNumber: owner.vehicleNumber,
      rcNumber: owner.rcNumber,
      rcDocuments: owner.rcDocuments || [],
      rcBackDocuments: owner.rcBackDocuments || [],
    },
  };
}

const requiredUploads = {
  rcDocuments: "RC front",
  fitnessDocuments: "Fitness",
  weightSlipDocuments: "National Permit",
  chasisDocuments: "State Permit",
  vehiclePhotos: "Vehicle Photo",
};

function missingUploadMessage(record) {
  const missing = Object.entries(requiredUploads)
    .filter(([field]) => !Array.isArray(record[field]) || !record[field].some(path => typeof path === "string" && path.trim()))
    .map(([, label]) => label);
  return missing.length ? `Upload the required documents: ${missing.join(", ")}.` : "";
}

export async function POST(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req, 'create');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const {
      vehicleNumber, pucNumber, fitnessNumber,
      chasisNumber, insuranceNumber,
      weightSlipNumber,                       // NEW
      vehicleType, vehicleWeight, vehiclePhoto, isActive,
      ownerId, pucDocuments, fitnessDocuments,   // NEW
      weightSlipDocuments, insuranceDocuments, chasisDocuments, vehiclePhotos, // NEW
    } = await req.json();

    const owner = await resolveVehicleOwner(user.companyId, ownerId, vehicleNumber);
    if (owner.error) return NextResponse.json({ success: false, message: owner.error }, { status: 400 });

    // ✅ Prevent duplicate vehicle number in the same company
    const existingVehicle = await Vehicle.findOne({
      vehicleNumber: owner.fields.vehicleNumber,
      companyId: user.companyId,
    });

    if (existingVehicle) {
      return NextResponse.json({
        success: false,
        message: "Vehicle number already exists for this company"
      }, { status: 400 });
    }

    // ✅ Create new vehicle
    const newVehicle = new Vehicle({
      ...owner.fields,
      pucNumber: pucNumber?.toUpperCase(),
      fitnessNumber: fitnessNumber?.toUpperCase(),
      chasisNumber: chasisNumber?.toUpperCase(),
      insuranceNumber: insuranceNumber?.toUpperCase(),
      weightSlipNumber: weightSlipNumber?.toUpperCase() || '',   // NEW
      pucDocuments: pucDocuments || [],                          // NEW
      fitnessDocuments: fitnessDocuments || [],                  // NEW
      weightSlipDocuments: weightSlipDocuments || [],            // NEW
      insuranceDocuments: insuranceDocuments || [],              // NEW
      chasisDocuments: chasisDocuments || [],                    // NEW
      vehiclePhotos: vehiclePhotos || [],                        // NEW
      vehicleType: vehicleType || '',
      vehicleWeight: vehicleWeight || 0,
      vehiclePhoto: vehiclePhoto || '',
      isActive: isActive !== undefined ? isActive : true,
      companyId: user.companyId,
      createdBy: user.id,
    });

    const uploadError = missingUploadMessage({ ...owner.fields, fitnessDocuments, weightSlipDocuments, chasisDocuments, vehiclePhotos });
    if (uploadError) return NextResponse.json({ success: false, message: uploadError }, { status: 400 });

    await newVehicle.save();
    return NextResponse.json({ success: true, data: newVehicle }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) return NextResponse.json({ success: false, message: "This vehicle number is already registered." }, { status: 409 });
    console.error("POST /vehicles error:", error);
    return NextResponse.json({ success: false, message: "Failed to create vehicle" }, { status: 500 });
  }
}

/* ========================================
   DELETE /api/vehicles?id=123
======================================== */
export async function DELETE(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req, 'delete');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const url = new URL(req.url);
    const vehicleId = url.searchParams.get("id");

    if (!vehicleId) {
      return NextResponse.json({ success: false, message: "Vehicle ID is required" }, { status: 400 });
    }

    const deletedVehicle = await Vehicle.findOneAndDelete({
      _id: vehicleId,
      companyId: user.companyId,
    });

    if (!deletedVehicle) {
      return NextResponse.json({ success: false, message: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Vehicle deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /vehicles error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete vehicle" }, { status: 500 });
  }
}

/* ========================================
   PUT /api/vehicles (for update)
======================================== */
export async function PUT(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req, 'edit');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("id");
    const updates = await req.json();

    if (!vehicleId) {
      return NextResponse.json({ success: false, message: "Vehicle ID is required" }, { status: 400 });
    }

    if (["ownerId", "vehicleNumber", "ownerName", "rcNumber", "rcDocuments", "rcBackDocuments"].some(field => Object.hasOwn(updates, field))) {
      const current = await Vehicle.findOne({ _id: vehicleId, companyId: user.companyId })
        .select("ownerId vehicleNumber").lean();
      if (!current) return NextResponse.json({ success: false, message: "Vehicle not found" }, { status: 404 });
      const owner = await resolveVehicleOwner(user.companyId, updates.ownerId ?? current.ownerId, updates.vehicleNumber ?? current.vehicleNumber, current);
      if (owner.error) return NextResponse.json({ success: false, message: owner.error }, { status: 400 });
      Object.assign(updates, owner.fields);
    }

    // Check for duplicate vehicle number if it's being updated
    if (updates.vehicleNumber) {
      const existingVehicle = await Vehicle.findOne({
        vehicleNumber: updates.vehicleNumber.toUpperCase(),
        companyId: user.companyId,
        _id: { $ne: vehicleId }
      });

      if (existingVehicle) {
        return NextResponse.json({
          success: false,
          message: "Vehicle number already exists for this company"
        }, { status: 400 });
      }

      updates.vehicleNumber = updates.vehicleNumber.toUpperCase();
    }

    // Convert string fields to uppercase
    if (updates.rcNumber) updates.rcNumber = updates.rcNumber.toUpperCase();
    if (updates.pucNumber) updates.pucNumber = updates.pucNumber.toUpperCase();
    if (updates.fitnessNumber) updates.fitnessNumber = updates.fitnessNumber.toUpperCase();
    if (updates.chasisNumber) updates.chasisNumber = updates.chasisNumber.toUpperCase();
    if (updates.insuranceNumber) updates.insuranceNumber = updates.insuranceNumber.toUpperCase();
    if (typeof updates.weightSlipNumber === 'string')
      updates.weightSlipNumber = updates.weightSlipNumber.trim().toUpperCase();

    // Handle vehicle weight as number
    if (updates.vehicleWeight) updates.vehicleWeight = parseFloat(updates.vehicleWeight) || 0;

    if (Object.keys(requiredUploads).some(field => Object.hasOwn(updates, field))) {
      const current = await Vehicle.findOne({ _id: vehicleId, companyId: user.companyId })
        .select(Object.keys(requiredUploads).join(" ")).lean();
      if (!current) return NextResponse.json({ success: false, message: "Vehicle not found" }, { status: 404 });
      const uploadError = missingUploadMessage({ ...current, ...updates });
      if (uploadError) return NextResponse.json({ success: false, message: uploadError }, { status: 400 });
    }

    const updatedVehicle = await Vehicle.findOneAndUpdate(
      { _id: vehicleId, companyId: user.companyId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedVehicle) {
      return NextResponse.json({ success: false, message: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedVehicle }, { status: 200 });
  } catch (error) {
    if (error.code === 11000) return NextResponse.json({ success: false, message: "This vehicle number is already registered." }, { status: 409 });
    console.error("PUT /vehicles error:", error);
    return NextResponse.json({ success: false, message: "Failed to update vehicle" }, { status: 500 });
  }
}
