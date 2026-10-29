import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import PaymentTerms from "@/app/api/payment-terms/schema";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { syncPaymentTerm } from "@/lib/frappe-payment-term.mjs";

export const runtime = "nodejs";

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  return user ? { user } : { error: "Invalid token", status: 401 };
}

export async function POST(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const { paymentTermId } = await req.json().catch(() => ({}));
  if (!paymentTermId) return NextResponse.json({ success: false, message: "Payment Term ID is required." }, { status: 400 });
  const paymentTerm = await PaymentTerms.findOne({ _id: paymentTermId, companyId: user.companyId });
  if (!paymentTerm) return NextResponse.json({ success: false, message: "Payment Term not found." }, { status: 404 });

  const frappeSync = await syncPaymentTerm(paymentTerm);
  await PaymentTerms.updateOne(
    { _id: paymentTerm._id, companyId: user.companyId },
    { $set: { frappeSync: { ...frappeSync, attemptedAt: new Date() } } },
  );
  return NextResponse.json({
    success: frappeSync.status !== "failed",
    frappeSync,
    message: frappeSync.message,
  }, { status: frappeSync.status === "failed" ? 502 : 200 });
}
