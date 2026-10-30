import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverDevice from "@/models/DriverDevice";
import { requireMobileAuth } from "@/lib/driverMobileAuth";
import { hashSecret } from "@/lib/driverMobileCore.mjs";

// Re-approval is deliberately explicit. A revoked phone cannot silently make
// itself active again; it becomes pending and requires dispatcher approval.
export async function POST(req) {
  const auth = await requireMobileAuth(req, { requireDevice: false });
  if (auth.error) return auth.error;
  try {
    const { installationId } = await req.json();
    const value = String(installationId || "");
    if (value.length < 24 || value.length > 300) {
      return NextResponse.json({ success: false, code: "INVALID_DEVICE", message: "A valid app installation ID is required." }, { status: 400 });
    }
    await dbConnect();
    const device = await DriverDevice.findOne({
      companyId: auth.driver.companyId,
      driverId: auth.driver._id,
      installationIdHash: hashSecret(value),
    }).select("+installationIdHash");
    if (!device) return NextResponse.json({ success: false, code: "DEVICE_NOT_FOUND", message: "This phone is not registered to your driver account." }, { status: 404 });
    if (device.status === "approved") return NextResponse.json({ success: true, data: { deviceId: String(device._id), deviceStatus: "approved" } });
    if (device.status !== "revoked") return NextResponse.json({ success: true, data: { deviceId: String(device._id), deviceStatus: device.status } });

    device.status = "pending";
    device.lastSeenAt = new Date();
    device.reapprovalRequestedAt = new Date();
    device.reapprovalRequestCount = (Number(device.reapprovalRequestCount) || 0) + 1;
    device.revokedAt = null;
    device.revokedBy = null;
    device.revokeReason = "";
    await device.save();
    return NextResponse.json({ success: true, data: { deviceId: String(device._id), deviceStatus: "pending" } }, { status: 202 });
  } catch (error) {
    console.error("mobile device reapproval:", error.message);
    return NextResponse.json({ success: false, code: "DEVICE_REAPPROVAL_FAILED", message: "Unable to request phone approval." }, { status: 500 });
  }
}
