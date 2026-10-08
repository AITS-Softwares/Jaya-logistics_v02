import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverDevice from "@/models/DriverDevice";
import DriverProfile from "@/models/DriverProfile";
import DriverTrip from "@/models/DriverTrip";
import { isDriverMobileEnabled, mobileRolloutMode, mobileUnavailableResponse } from "@/lib/driverMobileAuth";
import { pilotMobileAllowList } from "@/lib/driverRollout.mjs";
import { requireDriverMobileStaff } from "@/lib/driverMobileStaff";

const ACTIVE_STATES = ["assigned", "started", "at_pickup", "in_transit", "at_stop", "delivered"];

// A staff-only deployment signal for the ERP screen. Values are operational
// counts/configuration booleans only—never secrets, database URIs, or tokens.
export async function GET(req) {
  if (!isDriverMobileEnabled()) return mobileUnavailableResponse();
  const staff = requireDriverMobileStaff(req);
  if (staff.error) return staff.error;
  await dbConnect();
  const companyId = staff.user.companyId;
  const [drivers, pendingDevices, activeTrips] = await Promise.all([
    DriverProfile.countDocuments({ companyId, status: "active" }),
    DriverDevice.countDocuments({ companyId, status: "pending" }),
    DriverTrip.countDocuments({ companyId, state: { $in: ACTIVE_STATES } }),
  ]);
  return NextResponse.json({ success: true, data: {
    mobileEnabled: true,
    dedicatedMobileSecretConfigured: Boolean(process.env.DRIVER_MOBILE_JWT_SECRET),
    rolloutMode: mobileRolloutMode(),
    pilotDriversConfigured: pilotMobileAllowList(process.env.DRIVER_MOBILE_PILOT_MOBILES).size,
    databaseConnected: true,
    drivers,
    pendingDevices,
    activeTrips,
  } });
}
