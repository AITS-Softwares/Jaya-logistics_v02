import { NextResponse } from "next/server";
import { requireMobileAuth } from "@/lib/driverMobileAuth";
import { TRACKING_POLICY } from "@/lib/driverTracking";
import { getDriverMobileConfig } from "@/lib/driverMobileConfig";

export async function GET(req) {
  const auth = await requireMobileAuth(req);
  if (auth.error) return auth.error;
  const config = await getDriverMobileConfig(auth.driver.companyId);
  return NextResponse.json({ success: true, data: { ...TRACKING_POLICY, movingIntervalSec: config?.movingIntervalSec || TRACKING_POLICY.movingIntervalSec, minDistanceM: config?.minDistanceM || TRACKING_POLICY.minDistanceM } });
}
