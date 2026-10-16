import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Customer from "@/models/CustomerModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { syncCustomer } from "@/lib/frappe-customer.mjs";

export const runtime = "nodejs";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;

  const allowedRoles = [
    "admin", "crm", "sales manager", "purchase manager", "inventory manager",
    "accounts manager", "hr manager", "support executive", "production head", "project manager",
  ];
  return (Array.isArray(user.roles) ? user.roles : [])
    .some((role) => allowedRoles.includes(String(role).trim().toLowerCase()));
}

export async function POST(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    const user = verifyJWT(token);

    if (!isAuthorized(user)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

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
