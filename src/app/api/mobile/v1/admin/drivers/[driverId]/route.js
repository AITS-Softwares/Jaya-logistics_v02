import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverProfile from "@/models/DriverProfile";
import DriverDevice from "@/models/DriverDevice";
import DriverTrip from "@/models/DriverTrip";
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
    if (!["enable_mobile_access", "disable_mobile_access", "reset_pin", "update_profile", "archive_release_mobile", "reactivate_driver"].includes(action)) {
      return NextResponse.json({ success: false, code: "INVALID_ACTION", message: "Use enable_mobile_access, disable_mobile_access, reset_pin, update_profile, archive_release_mobile, or reactivate_driver." }, { status: 400 });
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
      if (driver.status !== "active") return NextResponse.json({ success: false, code: "DRIVER_NOT_ACTIVE", message: "Reactivate the archived driver before enabling mobile access." }, { status: 409 });
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
    if (action === "reactivate_driver") {
      if (driver.status !== "archived") return NextResponse.json({ success: false, code: "DRIVER_NOT_ARCHIVED", message: "Only an archived driver can be reactivated." }, { status: 409 });
      driver.status = "active";
      driver.mobileAccessEnabled = false;
      driver.mobileAccessStatus = "disabled";
    }
    if (action === "archive_release_mobile") {
      const activeTrip = await DriverTrip.exists({
        companyId: driver.companyId,
        driverId: driver._id,
        state: { $in: ["assigned", "started", "at_pickup", "in_transit", "at_stop", "delivered"] },
      });
      if (activeTrip) return NextResponse.json({ success: false, code: "ACTIVE_DRIVER_TRIP", message: "This driver has an assigned or in-progress trip. Complete, cancel, or reassign it before archiving the driver." }, { status: 409 });
      const releasedMobile = driver.mobileE164;
      const archiveReason = String(profile?.reason || "driver_archived").slice(0, 300);
      driver.mobileHistory.push({ mobileE164: releasedMobile, releasedAt: now, releasedBy: staff.user.id, reason: archiveReason });
      // The original number remains in history; this non-login value frees the
      // unique mobile-number slot for a verified new driver profile.
      driver.mobileE164 = `archived-${driver._id}`;
      driver.status = "archived";
      driver.mobileAccessEnabled = false;
      driver.mobileAccessStatus = "disabled";
      driver.passwordChangeRequired = true;
      const devices = await DriverDevice.find({ companyId: driver.companyId, driverId: driver._id });
      for (const device of devices) {
        let assignment = [...(device.assignmentHistory || [])].reverse().find((entry) => String(entry.driverId) === String(driver._id) && !entry.releasedAt);
        if (!assignment) { device.assignmentHistory.push({ driverId: driver._id, assignedAt: device.createdAt || now }); assignment = device.assignmentHistory[device.assignmentHistory.length - 1]; }
        assignment.releasedAt = now; assignment.releasedBy = staff.user.id; assignment.releaseReason = "driver_archived";
        device.driverId = null;
        device.status = "unlinked";
        device.approvedAt = null;
        device.approvedBy = null;
        device.revokedAt = now;
        device.revokedBy = staff.user.id;
        device.revokeReason = "driver_archived";
        device.releasedAt = now;
        device.releasedBy = staff.user.id;
        device.releaseReason = "driver_archived";
        await device.save();
      }
    }
    driver.mobileAccessUpdatedAt = now;
    driver.mobileAccessUpdatedBy = staff.user.id;
    await driver.save();

    if (action === "disable_mobile_access" || action === "reset_pin" || action === "archive_release_mobile" || mobileChanged) {
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
      status: driver.status,
      passwordSetAt: driver.passwordSetAt,
    } });
  } catch (error) {
    console.error("mobile admin driver access:", error.message);
    return NextResponse.json({ success: false, code: "DRIVER_ACCESS_UPDATE_FAILED", message: "Unable to update driver mobile access." }, { status: 500 });
  }
}
