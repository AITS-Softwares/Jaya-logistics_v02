import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Warehouse from "@/models/warehouseModels";
import SubCompany from "@/models/SubCompany";
import { validateMasterDataRequest } from "@/lib/masterDataPermission";
import { createFrappeClient, isFrappeConfigured } from "@/lib/frappe-client.mjs";
import { getOperatingCompanyFrappeConfig } from "@/lib/frappe-company-config.mjs";
export const runtime = "nodejs";
export async function POST(req) {
  await connectDb(); const { user, error, status } = await validateMasterDataRequest(req, "edit", "Warehouse Details");
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  const { warehouseId } = await req.json().catch(() => ({}));
  const warehouse = await Warehouse.findOne({ _id: warehouseId, companyId: user.companyId });
  if (!warehouse?.subCompanyId) return NextResponse.json({ success: false, message: "Assign this warehouse to an operating company before syncing." }, { status: 422 });
  const sub = await SubCompany.findOne({ _id: warehouse.subCompanyId, companyId: user.companyId, isOperatingCompany: true, isActive: true }).lean();
  if (!sub || !isFrappeConfigured()) return NextResponse.json({ success: false, message: "ERPNext connection or operating company is unavailable." }, { status: 503 });
  try {
    const config = getOperatingCompanyFrappeConfig({ _id: sub._id, code: sub.code, legalProfile: sub.legalProfile });
    const client = createFrappeClient(); const name = warehouse.warehouseName;
    const rows = await client.list("Warehouse", { fields: ["name"], filters: [["warehouse_name", "=", name], ["company", "=", config.erpnextCompany]], limitPageLength: 2 });
    const result = rows[0] || await client.create("Warehouse", { doctype: "Warehouse", warehouse_name: name, company: config.erpnextCompany, is_group: 0 });
    await Warehouse.updateOne({ _id: warehouse._id }, { $set: { frappeSync: { status: "synced", name: result.name, attemptedAt: new Date() } } });
    return NextResponse.json({ success: true, created: !rows[0], frappeSync: { status: "synced", name: result.name } });
  } catch (syncError) { await Warehouse.updateOne({ _id: warehouse._id }, { $set: { frappeSync: { status: "failed", message: syncError.message, attemptedAt: new Date() } } }); return NextResponse.json({ success: false, message: syncError.message || "Warehouse sync failed." }, { status: 502 }); }
}
