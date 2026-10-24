// ✅ File: app/api/items/by-code/[code]/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Item from "@/models/ItemModels";
import { validateMasterDataRequest } from "@/lib/masterDataPermission";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { user, error, status } = await validateMasterDataRequest(req, 'view', 'Items', { allowLookup: true });
    if (error) return NextResponse.json({ success: false, error }, { status });

    const { code } = params;
    if (!code?.trim())
      return NextResponse.json(
        { success: false, error: "Item code is required" },
        { status: 400 }
      );

    const item = await Item.findOne({
      companyId: user.companyId,
      itemCode: code.trim(),
    }).lean();

    if (!item)
      return NextResponse.json(
        { success: false, error: "Item not found" },
        { status: 404 }
      );

    return NextResponse.json({ success: true, data: item });
  } catch (err) {
    console.error("❌ Error in /api/items/by-code/[code]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
