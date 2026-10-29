import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ItemGroup from "@/models/ItemGroupModels";
import { validateMasterDataRequest } from "@/lib/masterDataPermission";
import { syncItemGroup } from "@/lib/frappe-item-group.mjs";
export const runtime = "nodejs";
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateMasterDataRequest(req, "edit", "Item Groups");
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  const { itemGroupId } = await req.json().catch(() => ({}));
  const group = await ItemGroup.findOne({ _id: itemGroupId, companyId: user.companyId });
  if (!group) return NextResponse.json({ success: false, message: "Item Group not found." }, { status: 404 });
  const frappeSync = await syncItemGroup(group);
  await ItemGroup.updateOne({ _id: group._id, companyId: user.companyId }, { $set: { frappeSync: { ...frappeSync, attemptedAt: new Date() } } });
  return NextResponse.json({ success: frappeSync.status !== "failed", frappeSync, message: frappeSync.message }, { status: frappeSync.status === "failed" ? 502 : 200 });
}
