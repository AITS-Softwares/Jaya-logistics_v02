import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Supplier from "@/models/SupplierModels";
import { validateMasterDataRequest } from "@/lib/masterDataPermission";
import { syncSupplier } from "@/lib/frappe-supplier.mjs";

export const runtime = "nodejs";

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateMasterDataRequest(req, "edit", "Suppliers");
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  const body = await req.json().catch(() => ({}));
  const supplierId = String(body.supplierId || "").trim();
  const offset = Math.max(0, Number.parseInt(body.offset, 10) || 0);
  const batchSize = Math.min(25, Math.max(1, Number.parseInt(body.batchSize, 10) || 10));
  const [total, suppliers] = await Promise.all([
    Supplier.countDocuments({ companyId: user.companyId, ...(supplierId ? { _id: supplierId } : {}) }),
    Supplier.find({ companyId: user.companyId, ...(supplierId ? { _id: supplierId } : {}) }).sort({ _id: 1 }).skip(supplierId ? 0 : offset).limit(supplierId ? 1 : batchSize),
  ]);
  const summary = { processed: suppliers.length, synced: 0, failed: 0, notConfigured: 0 };
  const failures = [];
  for (const supplier of suppliers) {
    const frappeSync = await syncSupplier(supplier);
    await Supplier.updateOne({ _id: supplier._id, companyId: user.companyId }, { $set: { frappeSync: { ...frappeSync, attemptedAt: new Date() } } });
    if (frappeSync.status === "synced") summary.synced += 1;
    else if (frappeSync.status === "not_configured") summary.notConfigured += 1;
    else { summary.failed += 1; failures.push({ supplierName: supplier.supplierName, message: frappeSync.message }); }
  }
  const nextOffset = offset + suppliers.length;
  return NextResponse.json({ success: true, total, summary, failures, nextOffset: supplierId ? null : (nextOffset < total ? nextOffset : null) });
}
