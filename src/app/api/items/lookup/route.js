// ✅ File: app/api/items/lookup/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Item from "@/models/ItemModels";
import { validateMasterDataRequest } from "@/lib/masterDataPermission";

export async function GET(req) {
  try {
    await connectDB();

    const { user, error, status } = await validateMasterDataRequest(req, 'view', 'Items', { allowLookup: true });
    if (error) return NextResponse.json({ success: false, error }, { status });

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim();
    const name = searchParams.get("name")?.trim();

    if (!code && !name)
      return NextResponse.json(
        { success: false, error: "Provide code or name" },
        { status: 400 }
      );

    let item = null;

    if (code) {
      item = await Item.findOne({
        companyId: user.companyId,
        itemCode: code,
      }).lean();
      if (item) return NextResponse.json({ success: true, data: item });
    }

    if (name) {
      item = await Item.findOne({
        companyId: user.companyId,
        $or: [{ itemName: name }, { description: name }],
      }).lean();
      if (item) return NextResponse.json({ success: true, data: item });
    }

    return NextResponse.json(
      { success: false, error: "Item not found" },
      { status: 404 }
    );
  } catch (err) {
    console.error("❌ Error in /api/items/lookup:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
