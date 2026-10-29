import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverProfile from "@/models/DriverProfile";
import DriverDevice from "@/models/DriverDevice";
import { isDriverMobileEnabled, mobileUnavailableResponse, revokeDriverSessions } from "@/lib/driverMobileAuth";
import { requireDriverMobileSettingsStaff } from "@/lib/driverMobileStaff";
import { normalizeDriverMobile } from "@/lib/driverMobileCore.mjs";

export async function PATCH(req, { params }) {
  const staff = requireDriverMobileSettingsStaff(req, "edit");
  if (staff.error) return staff.error;
  if (!(await isDriverMobileEnabled(staff.user.companyId))) return mobileUnavailableResponse();
  const { driverId } = await params;
  if (!mongoose.isValidObjectId(driverId)) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Driver not found." }, { status: 404 });

  try {
    const { action, pin, profile } = await req.json();
    if (!["enable_mobile_access", "disable_mobile_access", "reset_pin", "update_profile"].includes(action)) {
      return NextResponse.json({ success: false, code: "INVALID_ACTION", message: "Use enable_mobile_access, disable_mobile_access, reset_pin, or update_profile." }, { status: 400 });
    }
    if (action === "reset_pin" && (String(pin || "").length < 4 || String(pin || "").length > 32)) {
      return NextResponse.json({ success: false, code: "INVALID_PIN", message: "Temporary PIN must be 4 to 32 characters." }, { status: 400 });
    }

    await dbConnect();
    const driver = await DriverProfile.findOne({ _id: driverId, companyId: staff.user.companyId }).select("+pinHash");
    if (!driver) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Driver not found." }, { status: 404 });
    const now = new Date();
    let mobileChanged = false;

    if (action === "update_profile") {
      const displayName = String(profile?.displayName || "").trim().replace(/\s+/g, " ").slice(0, 120);
      const mobileE164 = normalizeDriverMobile(profile?.mobile);
      const licenseNumber = String(profile?.licenseNumber || "").trim().replace(/\s+/g, " ").toUpperCase().slice(0, 80);
      const registrationStatus = String(profile?.registrationStatus || "");
      if (!displayName || !mobileE164 || !["draft", "registered"].includes(registrationStatus)) {
        return NextResponse.json({ success: false, code: "INVALID_PROFILE", message: "Name, valid mobile number, and registration status are required." }, { status: 400 });
      }
      if (mobileE164 !== driver.mobileE164) {
        const duplicate = await DriverProfile.exists({ companyId: driver.companyId, mobileE164, _id: { $ne: driver._id } });
        if (duplicate) return NextResponse.json({ success: false, code: "DUPLICATE_MOBILE", message: "Another driver already uses this mobile number." }, { status: 409 });
        mobileChanged = true;
        driver.mobileE164 = mobileE164;
        // A changed login number may identify a different person. Require an
        // explicit PIN reset and access re-enable after the administrator has
        // verified the new details.
        driver.mobileAccessEnabled = false;
        driver.mobileAccessStatus = "disabled";
      }
      driver.displayName = displayName;
      driver.licenseNumber = licenseNumber;
      driver.registrationStatus = registrationStatus;
    }

    if (action === "enable_mobile_access") {
      if (!driver.pinHash) return NextResponse.json({ success: false, code: "PIN_REQUIRED", message: "Set a temporary PIN before enabling mobile access." }, { status: 409 });
      driver.mobileAccessEnabled = true;
      driver.mobileAccessStatus = "enabled";
    }
    if (action === "disable_mobile_access") {
      driver.mobileAccessEnabled = false;
      driver.mobileAccessStatus = "disabled";
    }
    if (action === "reset_pin") {
      driver.pinHash = await bcrypt.hash(String(pin), 12);
      driver.passwordSetAt = now;
      driver.passwordChangeRequired = true;
    }
    driver.mobileAccessUpdatedAt = now;
    driver.mobileAccessUpdatedBy = staff.user.id;
    await driver.save();

    if (action === "disable_mobile_access" || action === "reset_pin" || mobileChanged) {
      await revokeDriverSessions({ companyId: driver.companyId, driverId: driver._id, reason: action });
    }
    if (mobileChanged) {
      await DriverDevice.updateMany(
        { companyId: driver.companyId, driverId: driver._id, status: { $in: ["pending", "approved"] } },
        { $set: { status: "revoked", revokedAt: now, revokedBy: staff.user.id, revokeReason: "driver_mobile_changed" } },
      );
    }
    return NextResponse.json({ success: true, data: {
      id: String(driver._id),
      displayName: driver.displayName,
      mobileE164: driver.mobileE164,
      licenseNumber: driver.licenseNumber,
      registrationStatus: driver.registrationStatus,
      mobileAccessEnabled: driver.mobileAccessEnabled,
      mobileAccessStatus: driver.mobileAccessStatus,
      passwordSetAt: driver.passwordSetAt,
    } });
  } catch (error) {
    console.error("mobile admin driver access:", error.message);
    return NextResponse.json({ success: false, code: "DRIVER_ACCESS_UPDATE_FAILED", message: "Unable to update driver mobile access." }, { status: 500 });
  }
}
