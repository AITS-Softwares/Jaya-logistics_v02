import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { processErpNextInboundStatus, verifyErpNextWebhookSignature } from "@/lib/erpnext-inbound.mjs";

export const runtime = "nodejs";

export async function POST(req) {
  const rawBody = await req.text();
  const secret = process.env.FRAPPE_WEBHOOK_SECRET || "";
  const signature = req.headers.get("x-jaya-signature") || "";
  if (!verifyErpNextWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ success: false, message: "Invalid ERPNext webhook signature." }, { status: 401 });
  }
  try {
    const payload = JSON.parse(rawBody);
    await connectDb();
    const result = await processErpNextInboundStatus(payload, rawBody);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, message: error?.message || "ERPNext webhook could not be processed." }, { status: 422 });
  }
}
