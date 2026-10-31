import {masterApprovalAccess,withMasterSubmitterNames} from '@/lib/masterApprovalAccess';
import {submitMasterChange,approvalManagementRecord} from '@/lib/masterApprovalService';
import {notifyMasterSubmission} from '@/lib/masterApprovalRoutes';
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Supplier from "@/models/SupplierModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { validateMasterDataRequest } from '@/lib/masterDataPermission';
import { syncSupplier } from '@/lib/frappe-supplier.mjs';

function isAuthorized(user) {
  return user?.type === "company" || user?.role === "Admin" || user?.permissions?.includes("supplier");
}

async function validateUser(req, action = 'view') {
  return masterApprovalAccess(req,action,'Suppliers');
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };

  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return { error: "Invalid token", status: 401 };
  }
}

/* ---------------------------
   GET: Single Supplier
--------------------------- */
export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status, access } = await validateUser(req, 'view');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const {id}=await params;
    const supplier = await Supplier.findOne({ _id:id, companyId:user.companyId,...(access==='lookup'?{approvalStatus:'Approved'}:{}) }).setOptions({includeUnapprovedMasters:true})
      .select(access==='lookup'?'-pendingChange -lastRejectedProposal -approvalLog -reservedSupplierCode':'')
      .populate("glAccount", "accountName accountCode");

    if (!supplier) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: access==='lookup'?supplier:approvalManagementRecord(supplier) }, { status: 200 });
  } catch (err) {
    console.error("GET single supplier error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch supplier" }, { status: 500 });
  }
}

/* ---------------------------
   PUT: Update Supplier
--------------------------- */
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, 'edit');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const data = await req.json();
    if (data.status !== undefined && !["Active", "Inactive"].includes(data.status)) return NextResponse.json({ success: false, message: "Status must be Active or Inactive" }, { status: 400 });

    const {id}=await params;
    const existing = await Supplier.findOne({ _id:id, companyId: user.companyId }).setOptions({includeUnapprovedMasters:true});
    if (!existing) return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    const dueDays = data.dueDays ?? existing.dueDays;
    if (dueDays === undefined || dueDays === null || String(dueDays).trim() === "" || !Number.isFinite(Number(dueDays)) || Number(dueDays) < 0) {
      return NextResponse.json({ success: false, message: "Due days are required and must be zero or a positive number" }, { status: 400 });
    }

    const updated = await submitMasterChange({Model:Supplier,record:existing,input:{...data,dueDays:Number(dueDays)},user,kind:'supplier'});
    await notifyMasterSubmission(user,updated,'supplier');
    const frappeSync = updated.frappeSync || {status:'not_configured',message:'Only approved values are synced.'};
    return NextResponse.json({ success: true, data: updated, frappeSync }, { status: 200 });
  } catch (err) {
    console.error("PUT supplier error:", err);
    return NextResponse.json({ success: false, message: err.status ? err.message : "Failed to update supplier" }, { status: err.status || 500 });
  }
}

/* ---------------------------
   DELETE: Remove Supplier
--------------------------- */
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, 'delete');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const {id}=await params;
    const deleted = await Supplier.findOneAndDelete({ _id:id, companyId: user.companyId });

    if (!deleted) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Supplier deleted" }, { status: 200 });
  } catch (err) {
    console.error("DELETE supplier error:", err);
    return NextResponse.json({ success: false, message: "Failed to delete supplier" }, { status: 500 });
  }
}
