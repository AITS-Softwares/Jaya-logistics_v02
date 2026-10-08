import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverProfile from "@/models/DriverProfile";
import { createMobileSession, isDriverAllowedForMobileRollout, isDriverMobileEnabled, mobileUnavailableResponse, validateDriverPin } from "@/lib/driverMobileAuth";
import { normalizeDriverMobile } from "@/lib/driverMobileCore.mjs";

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function allowedAttempt(req, mobile) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const key = `${mobile}:${forwarded.split(",")[0].trim() || "unknown"}`;
  const now = Date.now();
  const current = (attempts.get(key) || []).filter((time) => now - time < WINDOW_MS);
  if (current.length >= MAX_ATTEMPTS) return false;
  current.push(now);
  attempts.set(key, current);
  if (attempts.size > 5000) attempts.delete(attempts.keys().next().value);
  return true;
}

export async function POST(req) {
  if (!isDriverMobileEnabled()) return mobileUnavailableResponse();
  try {
    const body = await req.json();
    const mobileE164 = normalizeDriverMobile(body.mobile);
    const pin = String(body.pin || "");
    if (!mobileE164 || pin.length < 4 || pin.length > 64) {
      return NextResponse.json({ success: false, code: "INVALID_CREDENTIALS", message: "Mobile number or PIN is invalid." }, { status: 400 });
    }
    if (!allowedAttempt(req, mobileE164)) return NextResponse.json({ success: false, code: "RATE_LIMITED", message: "Too many sign-in attempts. Please wait and try again." }, { status: 429 });
    await dbConnect();
    const driver = await DriverProfile.findOne({ mobileE164, status: "active" }).select("+pinHash");
    if (!driver || !(await validateDriverPin(driver, pin))) {
      return NextResponse.json({ success: false, code: "INVALID_CREDENTIALS", message: "Mobile number or PIN is invalid." }, { status: 401 });
    }
    if (!isDriverAllowedForMobileRollout(driver.mobileE164)) return NextResponse.json({ success: false, code: "PILOT_NOT_ENROLLED", message: "Mobile pilot access is not enabled for this driver." }, { status: 403 });
    const session = await createMobileSession({ companyId: driver.companyId, driverId: driver._id });
    return NextResponse.json({
      success: true,
      data: {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresInSeconds: session.expiresInSeconds,
        requiresDeviceRegistration: true,
        driver: { id: String(driver._id), displayName: driver.displayName, preferredLanguage: driver.preferredLanguage },
      },
    });
  } catch (error) {
    console.error("mobile auth login:", error.message);
    return NextResponse.json({ success: false, code: "LOGIN_FAILED", message: "Unable to sign in." }, { status: 500 });
  }
}
