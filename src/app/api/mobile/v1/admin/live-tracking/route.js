import { withBranchAccess } from '@/lib/branchAccess';
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

// Staff-only view for the existing Tracking Plan screen. It never exposes raw
// mobile credentials or lets the desktop ERP mutate a driver's tracking data.
async function branchHandlerGET(req) {
  if (!(await isDriverMobileEnabled())) return mobileUnavailableResponse();
  const staff = requireDriverMobileStaff(req);
  if (staff.error) return staff.error;

  const params = new URL(req.url).searchParams;
  if (params.has("loadingIds")) {
    const ids = [...new Set(params.get("loadingIds").split(","))];
    if (ids.length > 25 || ids.some((id) => !mongoose.isValidObjectId(id))) {
      return NextResponse.json({ success: false, message: "Select up to 25 valid loading IDs." }, { status: 400 });
    }
    await dbConnect();
    const companyId = staff.user.companyId;
    const trips = await DriverTrip.find({ companyId, loadingId: { $in: ids } })
      .select("loadingId state").sort({ updatedAt: -1, _id: -1 }).lean();
    const ended = (trip) => ["completed", "cancelled"].includes(trip.state);
    const byLoading = new Map();
    for (const trip of trips) {
      const id = String(trip.loadingId);
      const previous = byLoading.get(id);
      if (!previous || (ended(previous) && !ended(trip))) byLoading.set(id, trip);
    }
    const sessions = await TrackingSession.find({ companyId, tripId: { $in: [...byLoading.values()].map((trip) => trip._id) } })
      .select("tripId state lastRecordedAt deviceHealth").sort({ startedAt: -1, _id: -1 }).lean();
    const byTrip = new Map();
    for (const session of sessions) {
      const id = String(session.tripId);
      if (!byTrip.has(id)) byTrip.set(id, session);
    }
    const now = new Date();
    const rows = Array.from(byLoading, ([loadingId, trip]) => {
      const session = byTrip.get(String(trip._id));
      return {
        loadingId,
        tripState: trip.state,
        trackingStatus: ended(trip) ? "ended" : liveTrackingStatus(session, null, now),
        lastRecordedAt: session?.lastRecordedAt || null,
      };
    });
    return NextResponse.json({ success: true, data: rows });
  }
  const loadingId = params.get("loadingId");
  if (!mongoose.isValidObjectId(loadingId)) {
    return NextResponse.json({ success: false, code: "INVALID_LOADING", message: "A valid loading ID is required." }, { status: 400 });
  }

  await dbConnect();
  const trailTripId = params.get("trailTripId");
  if (trailTripId) {
    const from = new Date(params.get("from") || "");
    const to = new Date(params.get("to") || "");
    const span = to - from;
    if (!mongoose.isValidObjectId(trailTripId) || !Number.isFinite(span) || span <= 0 || span > 24 * 60 * 60 * 1000) {
      return NextResponse.json({ success: false, message: "Select a trip and a GPS trail window of up to 24 hours." }, { status: 400 });
    }
    const companyId = staff.user.companyId;
    const trip = await DriverTrip.exists({ _id: trailTripId, companyId, loadingId });
    if (!trip) return NextResponse.json({ success: false, message: "Trip not found." }, { status: 404 });
    const points = await LocationPoint.find({ companyId, tripId: trailTripId, recordedAt: { $gte: from, $lte: to }, accuracyM: { $lte: 100 }, isMocked: { $ne: true } })
      .select("latitude longitude recordedAt").sort({ recordedAt: 1 }).limit(4001).lean();
    const stride = Math.max(1, Math.ceil(points.length / 800));
    return NextResponse.json({ success: true, data: {
      points: points.filter((_, index) => index % stride === 0 || index === points.length - 1).map((point) => ({ lat: point.latitude, lng: point.longitude })),
      limited: points.length === 4001,
    } });
  }
  const trips = await DriverTrip.find({ companyId: staff.user.companyId, loadingId })
    .sort({ updatedAt: -1 }).limit(20).lean();
  const driverIds = trips.map((trip) => trip.driverId);
  const drivers = await DriverProfile.find({ _id: { $in: driverIds }, companyId: staff.user.companyId })
    .select("displayName mobileE164").lean();
  const driverById = new Map(drivers.map((driver) => [String(driver._id), driver]));
  const now = new Date();

  const result = await Promise.all(trips.map(async (trip) => {
    const session = await TrackingSession.findOne({ companyId: staff.user.companyId, tripId: trip._id })
      .sort({ startedAt: -1 }).lean();
    const [point, stopEpisode, firstPoint] = session ? await Promise.all([
      LocationPoint.findOne({ companyId: staff.user.companyId, sessionId: session._id }).sort({ recordedAt: -1 }).lean(),
      StopEpisode.findOne({ companyId: staff.user.companyId, sessionId: session._id, endedAt: null }).sort({ startedAt: -1 }).lean(),
      LocationPoint.findOne({ companyId: staff.user.companyId, tripId: trip._id }).sort({ recordedAt: 1 }).lean(),
    ]) : [null, null, null];
    const driver = driverById.get(String(trip.driverId));
    const status = liveTrackingStatus(session, point, now);
    const lastAt = point?.recordedAt || session?.lastRecordedAt || null;
    const ended = ["completed", "cancelled"].includes(trip.state);
    return {
      tripId: String(trip._id),
      loadingReference: trip.loadingReference,
      vehicleNo: trip.vehicle?.vehicleNo || "",
      tripState: trip.state,
      driver: driver ? { displayName: driver.displayName, mobile: driver.mobileE164 } : null,
      startedAt: trip.startedAt || null,
      session: session ? { id: String(session._id), status: ended ? "ended" : status, startedAt: session.startedAt, lastRecordedAt: lastAt, lastSequence: session.lastSequence } : null,
      deviceHealth: session?.deviceHealth?.reportedAt ? session.deviceHealth : null,
      driverStart: firstPoint ? { latitude: firstPoint.latitude, longitude: firstPoint.longitude, recordedAt: firstPoint.recordedAt } : null,
      actualPickup: trip.actualPickup?.recordedAt ? trip.actualPickup : null,
      deliveryStartedAt: trip.deliveryStartedAt || null,
      latestLocation: point ? {
        latitude: point.latitude, longitude: point.longitude, accuracyM: point.accuracyM,
        speedMps: point.speedMps, bearingDeg: point.bearingDeg, recordedAt: point.recordedAt,
        receivedAt: point.receivedAt, batteryPct: point.batteryPct, isCharging: point.isCharging, networkType: point.networkType, isMocked: point.isMocked,
      } : null,
      operationalStop: stopEpisode ? { startedAt: stopEpisode.startedAt, durationSec: stopEpisode.durationSec, classification: stopEpisode.classification, confidence: stopEpisode.confidence } : null,
      eta: etaGuard(trip.routeSnapshot?.routeBaseline),
      remainingStops: ended || trip.state === "delivered" ? [] : (trip.routeSnapshot?.stops || []).filter((stop) => stop.type === "drop" && stop.status !== "completed").map(({ sequence, address, city, pinCode }) => ({ sequence, address, city, pinCode })),
      drops: ended ? [] : (trip.routeSnapshot?.stops || []).filter((stop) => stop.type === "drop").map(({ sequence, label, address, city, pinCode, status, geofence, contactPhone }) => ({ sequence, label, address, city, pinCode, status, geofence, contactPhone })),
    };
  }));

  return NextResponse.json({ success: true, data: { generatedAt: now, staleAfterSeconds: LIVE_TRACKING_STALE_AFTER_MS / 1000, trips: result } });
}

export const GET = withBranchAccess(branchHandlerGET);
