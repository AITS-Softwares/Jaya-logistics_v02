import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Item from "@/models/ItemModels";
import Customer from "@/models/CustomerModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { validateMasterDataRequest } from '@/lib/masterDataPermission';
import { syncItem } from '@/lib/frappe-item.mjs';

/* -------------------------------
   ✅ Role-Based Access
-------------------------------- */
function isAuthorized(user) {
  if (!user) return false;

  if (user.type === "company") return true;

  const allowedRoles = [
    "admin",
    "sales manager",
    "purchase manager",
    "inventory manager",
    "accounts manager",
    "hr manager",
    "support executive",
    "production head",
    "project manager",
  ];

  const userRoles = Array.isArray(user.roles)
    ? user.roles
    : [];

  return userRoles.some(role =>
    allowedRoles.includes(role.trim().toLowerCase())
  );
}

/* ✅ Validate User Helper */
async function validateUser(req, action = 'view') {
  return validateMasterDataRequest(req, action, "Items", { allowLookup: action === "view" });
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };

  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch (err) {
    console.error("JWT Verification Failed:", err.message);
    return { error: "Invalid token", status: 401 };
  }
}

/* ========================================
   ✅ GET /api/item/[id] - Fetch single item
======================================== */
export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, 'view');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const { id } = params;
  if (!id) return NextResponse.json({ success: false, message: "Item ID is required" }, { status: 400 });

  try {
    const item = await Item.findOne({ _id: id, companyId: user.companyId });
    if (!item) {
      return NextResponse.json({ success: false, message: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: item }, { status: 200 });
  } catch (err) {
    console.error("GET /item/:id error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch item" }, { status: 500 });
  }
}

/* ========================================
   ✅ PUT /api/item/[id] - Update item
======================================== */
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, 'edit');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const { id } = params;
  if (!id) return NextResponse.json({ success: false, message: "Item ID is required" }, { status: 400 });

  try {
    const data = await req.json();
    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, message: "No data provided" }, { status: 400 });
    }

    if (!data.customerId) {
      return NextResponse.json({ success: false, message: "Customer is required" }, { status: 400 });
    }
    const customer = await Customer.findOne({ _id: data.customerId, companyId: user.companyId }).select('customerName customerCode');
    if (!customer) {
      return NextResponse.json({ success: false, message: "Select a valid customer from Customer Management" }, { status: 400 });
    }

    const updatedItem = await Item.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { ...data, customerId: customer._id, customerName: customer.customerName, customerCode: customer.customerCode || "" },
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return NextResponse.json({ success: false, message: "Item not found or unauthorized" }, { status: 404 });
    }

    const frappeSync = await syncItem(updatedItem);
    updatedItem.frappeSync = { ...frappeSync, attemptedAt: new Date() };
    await updatedItem.save();
    return NextResponse.json({ success: true, data: updatedItem, frappeSync }, { status: 200 });
  } catch (err) {
    console.error("PUT /item/:id error:", err);
    return NextResponse.json({ success: false, message: "Failed to update item" }, { status: 500 });
  }
}

/* ========================================
   ✅ DELETE /api/item/[id] - Remove item
======================================== */
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, 'delete');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const { id } = params;
  if (!id) return NextResponse.json({ success: false, message: "Item ID is required" }, { status: 400 });

  try {
    const deletedItem = await Item.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deletedItem) {
      return NextResponse.json({ success: false, message: "Item not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Item deleted successfully", deletedId: id }, { status: 200 });
  } catch (err) {
    console.error("DELETE /item/:id error:", err);
    return NextResponse.json({ success: false, message: "Failed to delete item" }, { status: 500 });
  }
}
