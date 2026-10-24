// ✅ File: app/api/suppliers/search/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Supplier from "@/models/SupplierModels";
import { validateMasterDataRequest } from "@/lib/masterDataPermission";

export async function GET(req) {
  try {
    await connectDB();

    const { user, error, status } = await validateMasterDataRequest(req, 'view', 'Suppliers', { allowLookup: true });
    if (error) return NextResponse.json({ success: false, error }, { status });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    const rx = new RegExp(q, "i");

    const data = await Supplier.find({
      companyId: user.companyId,
      $or: [{ supplierCode: rx }, { supplierName: rx }, { pan: rx }, { contactPersonName: rx }],
    })
      .limit(20)
      .lean();

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("❌ Error in /api/suppliers/search:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
