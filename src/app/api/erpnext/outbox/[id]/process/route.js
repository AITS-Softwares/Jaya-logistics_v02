import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { processErpNextOutboxById } from "@/lib/erpnext-outbox-worker.mjs";

export const runtime = "nodejs";

export const POST = withAuth(async (_req, { params }, user) => {
  await connectDb();
  try {
    const { id } = await params;
    if (!user.activeOperatingCompanyId) {
      return NextResponse.json({ success: false, message: "Select an operating company before processing an ERPNext export." }, { status: 400 });
    }
    const result = await processErpNextOutboxById({ outboxId: id, companyId: user.companyId, subCompanyId: user.activeOperatingCompanyId });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, message: error?.message || "ERPNext export failed." }, { status: 422 });
  }
}, { module: "Journal Entry", action: "create" });
