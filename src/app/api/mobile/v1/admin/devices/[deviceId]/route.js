import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverDevice from "@/models/DriverDevice";
import { isDriverMobileEnabled, mobileUnavailableResponse, revokeDriverSessions } from "@/lib/driverMobileAuth";
import { requireDriverMobileStaff } from "@/lib/driverMobileStaff";

export async function PATCH(req, { params }) {
  if (!isDriverMobileEnabled()) return mobileUnavailableResponse();
  const staff = requireDriverMobileStaff(req, "edit");
  if (staff.error) return staff.error;
  const { deviceId } = await params;
  if (!mongoose.isValidObjectId(deviceId)) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Device not found." }, { status: 404 });
  try {
    const { action, reason } = await req.json();
    if (!["approve", "revoke"].includes(action)) return NextResponse.json({ success: false, code: "INVALID_ACTION", message: "Use approve or revoke." }, { status: 400 });
    await dbConnect();
    const device = await DriverDevice.findOne({ _id: deviceId, companyId: staff.user.companyId });
    if (!device) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Device not found." }, { status: 404 });
    if (action === "approve") {
      await DriverDevice.updateMany({ companyId: device.companyId, driverId: device.driverId, _id: { $ne: device._id }, status: "approved" }, { $set: { status: "revoked", revokedAt: new Date(), revokedBy: staff.user.id, revokeReason: "another_device_approved" } });
      device.status = "approved";
      device.approvedAt = new Date();
      device.approvedBy = staff.user.id;
      device.revokedAt = null;
      device.revokeReason = "";
      await device.save();
    } else {
      device.status = "revoked";
      device.revokedAt = new Date();
      device.revokedBy = staff.user.id;
      device.revokeReason = String(reason || "revoked_by_staff").slice(0, 300);
      await device.save();
      await revokeDriverSessions({ companyId: device.companyId, driverId: device.driverId, reason: "device_revoked" });
    }
    return NextResponse.json({ success: true, data: { id: String(device._id), status: device.status } });
  } catch (error) {
    console.error("mobile admin device:", error.message);
    return NextResponse.json({ success: false, code: "DEVICE_UPDATE_FAILED", message: "Unable to update device." }, { status: 500 });
  }
}
