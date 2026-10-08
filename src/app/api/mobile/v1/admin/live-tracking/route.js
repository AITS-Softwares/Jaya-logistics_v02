import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { isDriverMobileEnabled, mobileUnavailableResponse } from "@/lib/driverMobileAuth";
import { requireDriverMobileStaff } from "@/lib/driverMobileStaff";
import { LIVE_TRACKING_STALE_AFTER_MS, liveTrackingStatus } from "@/lib/driverLiveTracking.mjs";
import DriverProfile from "@/models/DriverProfile";
import DriverTrip from "@/models/DriverTrip";
import LocationPoint from "@/models/LocationPoint";
import StopEpisode from "@/models/StopEpisode";
import TrackingSession from "@/models/TrackingSession";
import { etaGuard } from "@/lib/driverStopIntelligence.mjs";

const ACTIVE_TRIP_STATES = ["assigned", "started", "at_pickup", "in_transit", "at_stop", "delivered"];
// Staff-only view for the existing Tracking Plan screen. It never exposes raw
// mobile credentials or lets the desktop ERP mutate a driver's tracking data.
export async function GET(req) {
  if (!isDriverMobileEnabled()) return mobileUnavailableResponse();
  const staff = requireDriverMobileStaff(req);
  if (staff.error) return staff.error;

  const loadingId = new URL(req.url).searchParams.get("loadingId");
  if (!mongoose.isValidObjectId(loadingId)) {
    return NextResponse.json({ success: false, code: "INVALID_LOADING", message: "A valid loading ID is required." }, { status: 400 });
  }

  await dbConnect();
  const trips = await DriverTrip.find({ companyId: staff.user.companyId, loadingId, state: { $in: ACTIVE_TRIP_STATES } })
    .sort({ updatedAt: -1 }).limit(20).lean();
  const driverIds = trips.map((trip) => trip.driverId);
  const drivers = await DriverProfile.find({ _id: { $in: driverIds }, companyId: staff.user.companyId })
    .select("displayName mobileE164").lean();
  const driverById = new Map(drivers.map((driver) => [String(driver._id), driver]));
  const now = new Date();

  const result = await Promise.all(trips.map(async (trip) => {
    const session = await TrackingSession.findOne({ companyId: staff.user.companyId, tripId: trip._id })
      .sort({ startedAt: -1 }).lean();
    const [point, stopEpisode] = session ? await Promise.all([
      LocationPoint.findOne({ companyId: staff.user.companyId, sessionId: session._id }).sort({ recordedAt: -1 }).lean(),
      StopEpisode.findOne({ companyId: staff.user.companyId, sessionId: session._id, endedAt: null }).sort({ startedAt: -1 }).lean(),
    ]) : [null, null];
    const driver = driverById.get(String(trip.driverId));
    const status = liveTrackingStatus(session, point, now);
    const lastAt = point?.recordedAt || session?.lastRecordedAt || null;
    return {
      tripId: String(trip._id),
      loadingReference: trip.loadingReference,
      vehicleNo: trip.vehicle?.vehicleNo || "",
      tripState: trip.state,
      driver: driver ? { displayName: driver.displayName, mobile: driver.mobileE164 } : null,
      session: session ? { id: String(session._id), status, startedAt: session.startedAt, lastRecordedAt: lastAt, lastSequence: session.lastSequence } : null,
      latestLocation: point ? {
        latitude: point.latitude, longitude: point.longitude, accuracyM: point.accuracyM,
        speedMps: point.speedMps, bearingDeg: point.bearingDeg, recordedAt: point.recordedAt,
        receivedAt: point.receivedAt, batteryPct: point.batteryPct, isMocked: point.isMocked,
      } : null,
      operationalStop: stopEpisode ? { startedAt: stopEpisode.startedAt, durationSec: stopEpisode.durationSec, classification: stopEpisode.classification, confidence: stopEpisode.confidence } : null,
      eta: etaGuard(trip.routeSnapshot?.routeBaseline),
    };
  }));

  return NextResponse.json({ success: true, data: { generatedAt: now, staleAfterSeconds: LIVE_TRACKING_STALE_AFTER_MS / 1000, trips: result } });
}
