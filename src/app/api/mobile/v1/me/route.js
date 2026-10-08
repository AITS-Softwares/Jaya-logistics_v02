import { NextResponse } from "next/server";
import { requireMobileAuth } from "@/lib/driverMobileAuth";

export async function GET(req) {
  const auth = await requireMobileAuth(req, { requireDevice: false });
  if (auth.error) return auth.error;
  const deviceStatus = auth.session.deviceId
    ? auth.device?.status || "pending"
    : "not_registered";
  return NextResponse.json({
    success: true,
    data: {
      driver: { id: String(auth.driver._id), displayName: auth.driver.displayName, preferredLanguage: auth.driver.preferredLanguage, consentVersion: auth.driver.consentVersion || null },
      device: { id: auth.session.deviceId ? String(auth.session.deviceId) : null, status: deviceStatus },
    },
  });
}
