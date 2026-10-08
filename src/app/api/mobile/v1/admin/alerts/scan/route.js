import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverTrip from "@/models/DriverTrip";
import MobileOperationalAlert from "@/models/MobileOperationalAlert";
import TrackingSession from "@/models/TrackingSession";
import { exceptionsForTrip } from "@/lib/driverOperationalAlerts.mjs";
import { isDriverMobileEnabled, mobileUnavailableResponse } from "@/lib/driverMobileAuth";
import { requireDriverMobileStaff } from "@/lib/driverMobileStaff";

const ACTIVE_STATES = ["assigned", "started", "at_pickup", "in_transit", "at_stop", "delivered"];
const AUTO_RESOLVE_KINDS = ["tracking_missing", "tracking_stale"];

function alertDto(alert, trip) {
  return { id: String(alert._id), kind: alert.kind, severity: alert.severity, state: alert.state, message: alert.message, firstDetectedAt: alert.firstDetectedAt, lastDetectedAt: alert.lastDetectedAt, trip: trip ? { id: String(trip._id), loadingReference: trip.loadingReference, vehicleNo: trip.vehicle?.vehicleNo || "", state: trip.state } : null };
}

// Explicit operator-triggered scan. It creates/refreshes alerts only for the
// caller's company and auto-resolves tracking alerts once a healthy signal is
// detected. Driver-reported issues require a dispatcher to resolve them.
export async function POST(req) {
  if (!isDriverMobileEnabled()) return mobileUnavailableResponse();
  const staff = requireDriverMobileStaff(req);
  if (staff.error) return staff.error;
  await dbConnect();
  const now = new Date();
  const trips = await DriverTrip.find({ companyId: staff.user.companyId, state: { $in: ACTIVE_STATES } }).lean();
  const sessions = await TrackingSession.find({ companyId: staff.user.companyId, tripId: { $in: trips.map((trip) => trip._id) }, state: { $in: ["active", "paused", "stale"] } }).sort({ startedAt: -1 }).lean();
  const sessionByTrip = new Map();
  for (const session of sessions) if (!sessionByTrip.has(String(session.tripId))) sessionByTrip.set(String(session.tripId), session);

  for (const trip of trips) {
    const detected = exceptionsForTrip(trip, sessionByTrip.get(String(trip._id)), now);
    const kinds = new Set(detected.map((alert) => alert.kind));
    for (const alert of detected) {
      const existing = await MobileOperationalAlert.findOne({ companyId: trip.companyId, tripId: trip._id, kind: alert.kind, state: { $in: ["open", "acknowledged"] } });
      if (existing) {
        existing.severity = alert.severity; existing.message = alert.message; existing.lastDetectedAt = now; await existing.save();
      } else {
        await MobileOperationalAlert.create({ companyId: trip.companyId, tripId: trip._id, ...alert, state: "open", firstDetectedAt: now, lastDetectedAt: now });
      }
    }
    const autoResolvable = AUTO_RESOLVE_KINDS.filter((kind) => !kinds.has(kind));
    if (autoResolvable.length) await MobileOperationalAlert.updateMany({ companyId: trip.companyId, tripId: trip._id, kind: { $in: autoResolvable }, state: { $in: ["open", "acknowledged"] } }, { $set: { state: "resolved", resolvedAt: now, resolutionNote: "Condition cleared automatically." } });
  }

  const alerts = await MobileOperationalAlert.find({ companyId: staff.user.companyId, state: { $in: ["open", "acknowledged"] } }).sort({ severity: -1, lastDetectedAt: -1 }).limit(100).lean();
  const tripById = new Map(trips.map((trip) => [String(trip._id), trip]));
  return NextResponse.json({ success: true, data: alerts.map((alert) => alertDto(alert, tripById.get(String(alert.tripId)))) });
}
