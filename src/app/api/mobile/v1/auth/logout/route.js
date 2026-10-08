import { NextResponse } from "next/server";
import { requireMobileAuth } from "@/lib/driverMobileAuth";

export async function POST(req) {
  const auth = await requireMobileAuth(req, { requireDevice: false });
  if (auth.error) return auth.error;
  await auth.session.updateOne({ $set: { revokedAt: new Date(), revokeReason: "logout" } });
  return NextResponse.json({ success: true });
}
