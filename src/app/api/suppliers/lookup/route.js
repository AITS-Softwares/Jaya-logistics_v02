// ✅ File: app/api/suppliers/lookup/route.js
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
    const code = searchParams.get("code")?.trim();
    const name = searchParams.get("name")?.trim();

    if (!code && !name)
      return NextResponse.json(
        { success: false, error: "Provide code or name" },
        { status: 400 }
      );

    let supplier = null;

    if (code) {
      supplier = await Supplier.findOne({
        companyId: user.companyId,
        supplierCode: code,
      }).lean();
      if (supplier) return NextResponse.json({ success: true, data: supplier });
    }

    if (name) {
      supplier = await Supplier.findOne({
        companyId: user.companyId,
        supplierName: name,
      }).lean();
      if (supplier) return NextResponse.json({ success: true, data: supplier });
    }

    return NextResponse.json(
      { success: false, error: "Supplier not found" },
      { status: 404 }
    );
  } catch (err) {
    console.error("❌ Error in /api/suppliers/lookup:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
