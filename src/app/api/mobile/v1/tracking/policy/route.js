import { NextResponse } from "next/server";
import { requireMobileAuth } from "@/lib/driverMobileAuth";
import { TRACKING_POLICY } from "@/lib/driverTracking";

export async function GET(req) {
  const auth = await requireMobileAuth(req);
  if (auth.error) return auth.error;
  return NextResponse.json({ success: true, data: TRACKING_POLICY });
}
