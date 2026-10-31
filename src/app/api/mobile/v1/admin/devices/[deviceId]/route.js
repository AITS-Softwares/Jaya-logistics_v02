import { withBranchAccess } from '@/lib/branchAccess';
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverDevice from "@/models/DriverDevice";
import TrackingSession from "@/models/TrackingSession";
import DriverTrip from "@/models/DriverTrip";
import { isDriverMobileEnabled, mobileUnavailableResponse, revokeDriverSessions } from "@/lib/driverMobileAuth";
import { requireDriverMobileStaff } from "@/lib/driverMobileStaff";

async function branchHandlerPATCH(req, { params }) {
  if (!(await isDriverMobileEnabled())) return mobileUnavailableResponse();
  const staff = requireDriverMobileStaff(req, "edit");
  if (staff.error) return staff.error;
  const { deviceId } = await params;
  if (!mongoose.isValidObjectId(deviceId)) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Device not found." }, { status: 404 });
  try {
    const { action, reason } = await req.json();
    if (!["approve", "revoke", "unlink"].includes(action)) return NextResponse.json({ success: false, code: "INVALID_ACTION", message: "Use approve, revoke, or unlink." }, { status: 400 });
    await dbConnect();
    const device = await DriverDevice.findOne({ _id: deviceId, companyId: staff.user.companyId });
    if (!device) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Device not found." }, { status: 404 });
    if (action === "approve") {
      const activeTrackingOnOtherPhone = await TrackingSession.exists({ companyId: device.companyId, driverId: device.driverId, deviceId: { $ne: device._id }, state: "active" });
      if (activeTrackingOnOtherPhone) return NextResponse.json({ success: false, code: "ACTIVE_PHONE_TRACKING", message: "Another approved phone is actively tracking a trip. End that trip before moving this driver to a different phone." }, { status: 409 });
      await DriverDevice.updateMany({ companyId: device.companyId, driverId: device.driverId, _id: { $ne: device._id }, status: "approved" }, { $set: { status: "revoked", revokedAt: new Date(), revokedBy: staff.user.id, revokeReason: "another_device_approved" } });
      device.status = "approved";
      device.approvedAt = new Date();
      device.approvedBy = staff.user.id;
      device.revokedAt = null;
      device.revokeReason = "";
      await device.save();
    } else if (action === "revoke") {
      device.status = "revoked";
      device.revokedAt = new Date();
      device.revokedBy = staff.user.id;
      device.revokeReason = String(reason || "revoked_by_staff").slice(0, 300);
      await device.save();
      await revokeDriverSessions({ companyId: device.companyId, driverId: device.driverId, reason: "device_revoked" });
    } else {
      if (!device.driverId) return NextResponse.json({ success: true, data: { id: String(device._id), status: "unlinked" } });
      const protectedTripStates = ["started", "at_pickup", "in_transit", "at_stop", "delivered"];
      const [activeTracking, activeTrip] = await Promise.all([
        TrackingSession.exists({ companyId: device.companyId, deviceId: device._id, state: "active" }),
        DriverTrip.exists({ companyId: device.companyId, deviceId: device._id, state: { $in: protectedTripStates } }),
      ]);
      if (activeTracking || activeTrip) return NextResponse.json({ success: false, code: "ACTIVE_TRIP_DEVICE_LOCKED", message: "This phone has an active or in-progress trip. Complete or cancel that trip before unlinking the phone." }, { status: 409 });
      const previousDriverId = device.driverId;
      const now = new Date();
      const releaseReason = String(reason || "released_for_reassignment").slice(0, 300);
      const currentAssignment = [...(device.assignmentHistory || [])].reverse().find((entry) => String(entry.driverId) === String(previousDriverId) && !entry.releasedAt);
      if (currentAssignment) { currentAssignment.releasedAt = now; currentAssignment.releasedBy = staff.user.id; currentAssignment.releaseReason = releaseReason; }
      device.driverId = null;
      device.status = "unlinked";
      device.approvedAt = null;
      device.approvedBy = null;
      device.revokedAt = now;
      device.revokedBy = staff.user.id;
      device.revokeReason = "released_for_reassignment";
      device.releasedAt = now;
      device.releasedBy = staff.user.id;
      device.releaseReason = releaseReason;
      await device.save();
      await revokeDriverSessions({ companyId: device.companyId, driverId: previousDriverId, reason: "device_unlinked" });
    }
    return NextResponse.json({ success: true, data: { id: String(device._id), status: device.status } });
  } catch (error) {
    console.error("mobile admin device:", error.message);
    return NextResponse.json({ success: false, code: "DEVICE_UPDATE_FAILED", message: "Unable to update device." }, { status: 500 });
  }
}

export const PATCH = withBranchAccess(branchHandlerPATCH);
