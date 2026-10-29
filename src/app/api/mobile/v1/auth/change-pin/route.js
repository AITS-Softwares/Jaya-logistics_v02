import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverProfile from "@/models/DriverProfile";
import { requireMobileAuth, revokeDriverSessions, validateDriverPin } from "@/lib/driverMobileAuth";

export async function POST(req) {
  const auth = await requireMobileAuth(req, { requireDevice: false });
  if (auth.error) return auth.error;
  try {
    const { currentPin, newPin } = await req.json();
    if (String(newPin || "").length < 4 || String(newPin || "").length > 32) return NextResponse.json({ success: false, code: "INVALID_PIN", message: "New PIN must be 4 to 32 characters." }, { status: 400 });
    await dbConnect();
    const driver = await DriverProfile.findOne({ _id: auth.driver._id, companyId: auth.driver.companyId }).select("+pinHash");
    if (!driver || !(await validateDriverPin(driver, currentPin))) return NextResponse.json({ success: false, code: "INVALID_CURRENT_PIN", message: "Current PIN is incorrect." }, { status: 401 });
    driver.pinHash = await bcrypt.hash(String(newPin), 12);
    driver.passwordChangeRequired = false;
    driver.passwordSetAt = new Date();
    await driver.save();
    await revokeDriverSessions({ companyId: driver.companyId, driverId: driver._id, reason: "pin_changed", exceptSessionId: auth.session._id });
    return NextResponse.json({ success: true, data: { passwordChangeRequired: false } });
  } catch (error) {
    console.error("mobile change PIN:", error.message);
    return NextResponse.json({ success: false, code: "PIN_CHANGE_FAILED", message: "Unable to change PIN." }, { status: 500 });
  }
}
