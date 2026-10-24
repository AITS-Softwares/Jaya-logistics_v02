// ✅ File: app/api/items/search/route.js
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
    const q = searchParams.get("q")?.trim() || "";
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);

    const filter = { companyId: user.companyId };

    if (q) {
      const rx = new RegExp(q, "i");
      filter.$or = [
        { itemCode: rx },
        { itemName: rx },
        { description: rx },
      ];
    }

    const data = await Item.find(filter).limit(limit).lean();

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("❌ Error in /api/items/search:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
