import { withBranchAccess } from '@/lib/branchAccess';
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverDevice from "@/models/DriverDevice";
import DriverProfile from "@/models/DriverProfile";
import DriverTrip from "@/models/DriverTrip";
import { isDriverMobileEnabled, mobileRolloutMode, mobileUnavailableResponse } from "@/lib/driverMobileAuth";
import { getDriverMobileConfig } from "@/lib/driverMobileConfig";
import { requireDriverMobileStaff } from "@/lib/driverMobileStaff";

const ACTIVE_STATES = ["assigned", "started", "at_pickup", "in_transit", "at_stop", "delivered"];

// A staff-only deployment signal for the ERP screen. Values are operational
// counts/configuration booleans only—never secrets, database URIs, or tokens.
async function branchHandlerGET(req) {
  const staff = requireDriverMobileStaff(req);
  if (staff.error) return staff.error;
  if (!(await isDriverMobileEnabled(staff.user.companyId))) return mobileUnavailableResponse();
  await dbConnect();
  const companyId = staff.user.companyId;
  const config = await getDriverMobileConfig(companyId, { includeSecret: true });
  const [drivers, pendingDevices, activeTrips] = await Promise.all([
    DriverProfile.countDocuments({ companyId, status: "active" }),
    DriverDevice.countDocuments({ companyId, status: "pending" }),
    DriverTrip.countDocuments({ companyId, state: { $in: ACTIVE_STATES } }),
  ]);
  return NextResponse.json({ success: true, data: {
    mobileEnabled: true,
    dedicatedMobileSecretConfigured: Boolean(config?.encryptedJwtSecret || process.env.DRIVER_MOBILE_JWT_SECRET),
    rolloutMode: await mobileRolloutMode(companyId),
    pilotDriversConfigured: config?.pilotMobiles?.length || 0,
    databaseConnected: true,
    drivers,
    pendingDevices,
    activeTrips,
  } });
}

export const GET = withBranchAccess(branchHandlerGET);
