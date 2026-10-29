import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { withAuth } from "@/lib/auth";
import ErpNextIntegrationOutbox from "@/models/ErpNextIntegrationOutbox";

export const runtime = "nodejs";

export const GET = withAuth(async (req, _context, user) => {
  await connectDb();
  if (!user.activeOperatingCompanyId) {
    return NextResponse.json({ success: false, message: "Select an operating company before viewing ERPNext exports." }, { status: 400 });
  }
  const { searchParams } = new URL(req.url);
  const state = String(searchParams.get("state") || "").trim();
  const limit = Math.max(1, Math.min(Number(searchParams.get("limit") || 50), 100));
  const query = { companyId: user.companyId, subCompanyId: user.activeOperatingCompanyId };
  if (state) query.state = state;
  const rows = await ErpNextIntegrationOutbox.find(query)
    .select("localDoctype localRecordId erpNextCompany erpNextDoctype eventType state attempts nextAttemptAt lastError erpNextName createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
  return NextResponse.json({ success: true, data: rows });
}, { module: "Journal Entry", action: "view" });
