import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverDevice from "@/models/DriverDevice";
import DriverProfile from "@/models/DriverProfile";
import { isDriverMobileEnabled, mobileUnavailableResponse } from "@/lib/driverMobileAuth";
import { requireDriverMobileStaff } from "@/lib/driverMobileStaff";

// Deliberately returns device metadata only. Installation identifiers and
// session credentials are never exposed to ERP screens.
export async function GET(req) {
  if (!isDriverMobileEnabled()) return mobileUnavailableResponse();
  const staff = requireDriverMobileStaff(req);
  if (staff.error) return staff.error;
  await dbConnect();
  const status = new URL(req.url).searchParams.get("status");
  const query = { companyId: staff.user.companyId };
  if (["pending", "approved", "revoked"].includes(status)) query.status = status;
  const devices = await DriverDevice.find(query).sort({ updatedAt: -1 }).limit(100).lean();
  const drivers = await DriverProfile.find({ companyId: staff.user.companyId, _id: { $in: devices.map((device) => device.driverId) } })
    .select("displayName mobileE164").lean();
  const driverById = new Map(drivers.map((driver) => [String(driver._id), driver]));
  return NextResponse.json({ success: true, data: devices.map((device) => ({
    id: String(device._id), status: device.status, platform: device.platform, manufacturer: device.manufacturer,
    model: device.model, appVersion: device.appVersion, createdAt: device.createdAt, lastSeenAt: device.lastSeenAt,
    approvedAt: device.approvedAt, revokedAt: device.revokedAt, revokeReason: device.revokeReason,
    driver: driverById.get(String(device.driverId)) ? {
      id: String(device.driverId), displayName: driverById.get(String(device.driverId)).displayName,
      mobileE164: driverById.get(String(device.driverId)).mobileE164,
    } : null,
  })) });
}
