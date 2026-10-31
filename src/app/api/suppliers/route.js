import {masterApprovalAccess,withMasterSubmitterNames} from '@/lib/masterApprovalAccess';
import {createPendingMaster,submitMasterChange,approvalManagementRecord} from '@/lib/masterApprovalService';
import {pickPaths,SUPPLIER_SENSITIVE,SUPPLIER_IMMEDIATE} from '@/lib/masterApprovalPolicy.mjs';
import {notifyMasterSubmission} from '@/lib/masterApprovalRoutes';

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Supplier from "@/models/SupplierModels";
import BankHead from "@/models/BankHead";
import { validateMasterDataRequest } from '@/lib/masterDataPermission';
import { identifierFormatError } from "@/lib/identifierFormats";
import { syncSupplier } from "@/lib/frappe-supplier.mjs";

async function validateUser(req, action = 'view') {
  return masterApprovalAccess(req,action,'Suppliers');
}

// GET /api/suppliers
export async function GET(req) {
  await dbConnect();
  const { user, error, status, access } = await validateUser(req, 'view');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const management=new URL(req.url).searchParams.get('management')==='true' && access!=='lookup';
    const approvalStatus = new URL(req.url).searchParams.get('approvalStatus');
    const filter = {companyId:user.companyId,...(!management ? {approvalStatus:'Approved'} : approvalStatus ? {approvalStatus} : {})};
    const suppliers = await Supplier.find(filter).setOptions({includeUnapprovedMasters:true})
      .select(!management ? '-pendingChange -lastRejectedProposal -approvalLog -reservedSupplierCode' : '')
      .populate("glAccount", "accountName accountCode")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: management ? await withMasterSubmitterNames(suppliers.map(approvalManagementRecord)) : suppliers }, { status: 200 });
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
    if (body.status !== undefined && !["Active", "Inactive"].includes(body.status)) return NextResponse.json({ success: false, message: "Status must be Active or Inactive" }, { status: 400 });
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
    const existing = await Supplier.findOne({ supplierCode: body.supplierCode, companyId: user.companyId }).setOptions({includeUnapprovedMasters:true});
    if (existing) {
      return NextResponse.json({ success: false, message: "Supplier Code already exists" }, { status: 400 });
    }

    const fields = pickPaths(body,[...SUPPLIER_SENSITIVE,...SUPPLIER_IMMEDIATE]);
    const candidate = new Supplier({companyId:user.companyId,createdBy:user.id});
    for(const [path,value] of Object.entries(fields)) candidate.set(path,value);
    candidate.pan=pan;
    const supplier = await createPendingMaster({Model:Supplier,data:candidate.toObject(),user});
    await notifyMasterSubmission(user,supplier,'supplier');
    const frappeSync = {status:'not_configured',message:'Waiting for supplier approval.'};

    const populated = await Supplier.findById(supplier._id).setOptions({includeUnapprovedMasters:true}).populate("glAccount", "accountName accountCode");
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
  const { user, error, status } = await validateUser(req, 'edit');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const id = (await params)?.id || new URL(req.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: "Supplier ID is required" }, { status: 400 });
    }

    const body = await req.json();
    if (body.status !== undefined && !["Active", "Inactive"].includes(body.status)) return NextResponse.json({ success: false, message: "Status must be Active or Inactive" }, { status: 400 });
    const formatError = identifierFormatError(body);
    if (formatError) return NextResponse.json({ success: false, message: formatError }, { status: 400 });

    const existingSupplier = await Supplier.findOne({ _id: id, companyId: user.companyId }).setOptions({includeUnapprovedMasters:true});
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
    const updatedSupplier = await submitMasterChange({Model:Supplier,record:existingSupplier,input:{...body,dueDays:Number(dueDays),pan},user,kind:'supplier'});
    await notifyMasterSubmission(user,updatedSupplier,'supplier');

    return NextResponse.json({ success: true, data: updatedSupplier }, { status: 200 });

  } catch (err) {
    console.error("PUT /suppliers error:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return NextResponse.json({ success: false, message: `${field} already exists` }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: err.status ? err.message : "Failed to update supplier" }, { status: err.status || 500 });
  }
}

// DELETE /api/suppliers/[id]
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req,'delete');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const id = (await params)?.id || new URL(req.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: "Supplier ID is required" }, { status: 400 });
    }

    const supplier = await Supplier.findOne({ _id: id, companyId: user.companyId }).setOptions({includeUnapprovedMasters:true});
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
