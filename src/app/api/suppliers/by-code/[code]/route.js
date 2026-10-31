// ✅ File: app/api/suppliers/by-code/[code]/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Supplier from "@/models/SupplierModels";
import { validateMasterDataRequest } from "@/lib/masterDataPermission";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { user, error, status } = await validateMasterDataRequest(req, 'view', 'Suppliers', { allowLookup: true });
    if (error) return NextResponse.json({ success: false, error }, { status });

   const { code } = await params;
    if (!code?.trim())
      return NextResponse.json(
        { success: false, error: "Supplier code required" },
        { status: 400 }
      );

    const supplier = await Supplier.findOne({
      companyId: user.companyId,
      approvalStatus:'Approved',
      supplierCode: code.trim(),
    }).select('-pendingChange -lastRejectedProposal -approvalLog -reservedSupplierCode').lean();

    if (!supplier)
      return NextResponse.json(
        { success: false, error: "Supplier not found" },
        { status: 404 }
      );

    return NextResponse.json({ success: true, data: supplier });
  } catch (err) {
    console.error("❌ Error in /api/suppliers/by-code:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
