import { withBranchAccess } from '@/lib/branchAccess';
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverTrip from "@/models/DriverTrip";
import MobileOperationalAlert from "@/models/MobileOperationalAlert";
import { scanTripOperationalAlerts } from "@/lib/driverOperationalAlerts.mjs";
import { isDriverMobileEnabled, mobileUnavailableResponse } from "@/lib/driverMobileAuth";
import { requireDriverMobileStaff } from "@/lib/driverMobileStaff";

const ACTIVE_STATES = ["assigned", "started", "at_pickup", "in_transit", "at_stop", "delivered"];

function alertDto(alert, trip) {
  return { id: String(alert._id), kind: alert.kind, severity: alert.severity, state: alert.state, message: alert.message, firstDetectedAt: alert.firstDetectedAt, lastDetectedAt: alert.lastDetectedAt, trip: trip ? { id: String(trip._id), loadingReference: trip.loadingReference, vehicleNo: trip.vehicle?.vehicleNo || "", state: trip.state } : null };
}

// Explicit operator-triggered scan. It creates/refreshes alerts only for the
// caller's company and auto-resolves tracking alerts once a healthy signal is
// detected. Driver-reported issues require a dispatcher to resolve them.
async function readAlerts(req) {
  if (!(await isDriverMobileEnabled())) return mobileUnavailableResponse();
  const staff = requireDriverMobileStaff(req);
  if (staff.error) return staff.error;
  const connection = await dbConnect();
  const trips = await DriverTrip.find({ companyId: staff.user.companyId }).select("companyId loadingReference vehicle state").lean();
  if (req.method === "POST") {
    const active = trips.filter((trip) => ACTIVE_STATES.includes(trip.state));
    for (let offset = 0; offset < active.length; offset += 100) {
      await scanTripOperationalAlerts(connection.connection.db, active.slice(offset, offset + 100));
    }
  }
  const alerts = await MobileOperationalAlert.find({ companyId: staff.user.companyId, tripId: { $in: trips.map((trip) => trip._id) }, state: { $in: ["open", "acknowledged"] } }).sort({ severity: -1, lastDetectedAt: -1 }).limit(100).lean();
  const tripById = new Map(trips.map((trip) => [String(trip._id), trip]));
  return NextResponse.json({ success: true, data: alerts.map((alert) => alertDto(alert, tripById.get(String(alert.tripId)))) });
}

export const GET = withBranchAccess(readAlerts);
export const POST = withBranchAccess(readAlerts);
