import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Customer from "@/models/CustomerModel";
import { validateMasterDataRequest } from "@/lib/masterDataPermission";
import { syncCustomer } from "@/lib/frappe-customer.mjs";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    await dbConnect();
    const { user, error, status } = await validateMasterDataRequest(req, 'edit', 'Customers');
    if (error) return NextResponse.json({ success: false, message: error }, { status });

    const customers = await Customer.find({ companyId: user.companyId }).sort({ createdAt: 1 });
    const summary = { total: customers.length, synced: 0, failed: 0, notConfigured: 0 };
    const failures = [];

    // Process sequentially to avoid burst requests to Frappe Cloud.
    for (const customer of customers) {
      const frappeSync = await syncCustomer(customer);
      await Customer.updateOne(
        { _id: customer._id, companyId: user.companyId },
        { $set: { frappeSync: { ...frappeSync, attemptedAt: new Date() } } }
      );

      if (frappeSync.status === "synced") {
        summary.synced += 1;
      } else if (frappeSync.status === "not_configured") {
        summary.notConfigured += 1;
      } else {
        summary.failed += 1;
        failures.push({ customerName: customer.customerName, message: frappeSync.message });
      }
    }

    return NextResponse.json({ success: true, summary, failures });
  } catch (error) {
    console.error("POST /customers/sync error:", error);
    return NextResponse.json({ success: false, message: "Failed to sync customers" }, { status: 500 });
  }
}
