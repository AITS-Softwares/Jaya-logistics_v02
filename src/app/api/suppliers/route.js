
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Supplier from "@/models/SupplierModels";
import BankHead from "@/models/BankHead";
import { validateMasterDataRequest } from '@/lib/masterDataPermission';
import { identifierFormatError } from "@/lib/identifierFormats";
import { syncSupplier } from "@/lib/frappe-supplier.mjs";

async function validateUser(req, action = 'view') {
  return validateMasterDataRequest(req, action, "Suppliers", { allowLookup: action === "view" });
}

// GET /api/suppliers
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, 'view');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const suppliers = await Supplier.find({ companyId: user.companyId })
      .populate("glAccount", "accountName accountCode")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: suppliers }, { status: 200 });
  } catch (err) {
    console.error("GET /suppliers error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch suppliers" }, { status: 500 });
  }
}

// POST /api/suppliers
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, 'create');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    const formatError = identifierFormatError(body);
    if (formatError) return NextResponse.json({ success: false, message: formatError }, { status: 400 });

    const requiredFields = ["supplierCode", "supplierName", "supplierType", "pan"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    if (body.dueDays === undefined || body.dueDays === null || String(body.dueDays).trim() === "" || !Number.isFinite(Number(body.dueDays)) || Number(body.dueDays) < 0) {
      return NextResponse.json({ success: false, message: "Due days are required and must be zero or a positive number" }, { status: 400 });
    }

    const pan = String(body.pan || "").trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      return NextResponse.json({ success: false, message: "Invalid PAN format. Example: ABCDE1234F" }, { status: 400 });
    }
    const existing = await Supplier.findOne({ supplierCode: body.supplierCode, companyId: user.companyId });
    if (existing) {
      return NextResponse.json({ success: false, message: "Supplier Code already exists" }, { status: 400 });
    }

    const supplier = new Supplier({ ...body, pan, companyId: user.companyId, createdBy: user.id });
    await supplier.save();
    const frappeSync = await syncSupplier(supplier);
    await Supplier.updateOne({ _id: supplier._id, companyId: user.companyId }, {
      $set: { frappeSync: { ...frappeSync, attemptedAt: new Date() } },
    });

    const populated = await Supplier.findById(supplier._id).populate("glAccount", "accountName accountCode");
    return NextResponse.json({ success: true, data: populated, frappeSync }, { status: 201 });

  } catch (err) {
    console.error("POST /suppliers error:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return NextResponse.json({ success: false, message: `${field} already exists` }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to create supplier" }, { status: 500 });
  }
}

// PUT /api/suppliers/[id]
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ success: false, message: "Supplier ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const formatError = identifierFormatError(body);
    if (formatError) return NextResponse.json({ success: false, message: formatError }, { status: 400 });

    const existingSupplier = await Supplier.findOne({ _id: id, companyId: user.companyId });
    if (!existingSupplier) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    const dueDays = body.dueDays ?? existingSupplier.dueDays;
    if (dueDays === undefined || dueDays === null || String(dueDays).trim() === "" || !Number.isFinite(Number(dueDays)) || Number(dueDays) < 0) {
      return NextResponse.json({ success: false, message: "Due days are required and must be zero or a positive number" }, { status: 400 });
    }

    const pan = String(body.pan ?? existingSupplier.pan ?? "").trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      return NextResponse.json({ success: false, message: "Valid PAN is required. Example: ABCDE1234F" }, { status: 400 });
    }
    const updatedSupplier = await Supplier.findByIdAndUpdate(
      id,
      { ...body, dueDays: Number(dueDays), pan, companyId: user.companyId, createdBy: user.id },
      { new: true, runValidators: true }
    ).populate("glAccount", "accountName accountCode");

    return NextResponse.json({ success: true, data: updatedSupplier }, { status: 200 });

  } catch (err) {
    console.error("PUT /suppliers error:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return NextResponse.json({ success: false, message: `${field} already exists` }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to update supplier" }, { status: 500 });
  }
}

// DELETE /api/suppliers/[id]
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ success: false, message: "Supplier ID is required" }, { status: 400 });
    }

    const supplier = await Supplier.findOne({ _id: id, companyId: user.companyId });
    if (!supplier) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    await Supplier.deleteOne({ _id: id });

    return NextResponse.json({ success: true, message: "Supplier deleted successfully" }, { status: 200 });

  } catch (err) {
    console.error("DELETE /suppliers error:", err);
    return NextResponse.json({ success: false, message: "Failed to delete supplier" }, { status: 500 });
  }
}
