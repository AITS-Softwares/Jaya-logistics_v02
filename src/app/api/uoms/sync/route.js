import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import UOM from "@/app/api/uoms/schema";
import { validateMasterDataRequest } from "@/lib/masterDataPermission";
import { syncUom } from "@/lib/frappe-uom.mjs";
export const runtime = "nodejs";
export async function POST(req) {
  await connectDb();
  const { user, error, status } = await validateMasterDataRequest(req, "edit", "UOM");
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  const { uomId } = await req.json().catch(() => ({}));
  if (!uomId) return NextResponse.json({ success: false, message: "UOM ID is required." }, { status: 400 });
  const uom = await UOM.findOne({ _id: uomId, companyId: user.companyId, isActive: true });
  if (!uom) return NextResponse.json({ success: false, message: "Active UOM not found." }, { status: 404 });
  const frappeSync = await syncUom(uom);
  await UOM.updateOne({ _id: uom._id, companyId: user.companyId }, { $set: { frappeSync: { ...frappeSync, attemptedAt: new Date() } } });
  const statusCode = frappeSync.status === "failed" ? 502 : 200;
  return NextResponse.json({ success: frappeSync.status !== "failed", frappeSync, message: frappeSync.message }, { status: statusCode });
}
