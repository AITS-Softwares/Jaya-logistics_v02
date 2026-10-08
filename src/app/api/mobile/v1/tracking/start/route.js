import { NextResponse } from "next/server";
import DriverTrip from "@/models/DriverTrip";
import TrackingSession from "@/models/TrackingSession";
import TripEvent from "@/models/TripEvent";
import { requireMobileAuth } from "@/lib/driverMobileAuth";
import { createIdempotencyKey } from "@/lib/driverMobileCore.mjs";
import { isObjectId, sameObjectId, TRACKING_POLICY } from "@/lib/driverTracking";

export async function POST(req) {
  const auth = await requireMobileAuth(req);
  if (auth.error) return auth.error;
  try {
    const { tripId } = await req.json();
    if (!isObjectId(tripId)) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Trip not found." }, { status: 404 });
    const trip = await DriverTrip.findOne({ _id: tripId, companyId: auth.driver.companyId, driverId: auth.driver._id });
    if (!trip) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Trip not found." }, { status: 404 });
    if (!['started', 'at_pickup', 'in_transit', 'at_stop'].includes(trip.state)) return NextResponse.json({ success: false, code: "TRACKING_NOT_ALLOWED", message: "Start the trip before enabling tracking." }, { status: 409 });
    if (trip.deviceId && !sameObjectId(trip.deviceId, auth.device._id)) return NextResponse.json({ success: false, code: "DEVICE_MISMATCH", message: "This trip is active on another approved device." }, { status: 409 });
    let session = await TrackingSession.findOne({ companyId: trip.companyId, tripId: trip._id, state: { $in: ["active", "paused", "stale"] } }).sort({ createdAt: -1 });
    if (session && !sameObjectId(session.deviceId, auth.device._id)) return NextResponse.json({ success: false, code: "SESSION_DEVICE_MISMATCH", message: "An active tracking session exists on another device." }, { status: 409 });
    if (!session) {
      session = await TrackingSession.create({ companyId: trip.companyId, tripId: trip._id, driverId: auth.driver._id, deviceId: auth.device._id, state: "active" });
      await TripEvent.create({ companyId: trip.companyId, tripId: trip._id, type: "tracking_started", source: "driver", idempotencyKey: createIdempotencyKey(), createdByDriverId: auth.driver._id, payload: { sessionId: String(session._id) } });
    } else if (session.state !== "active") {
      session.state = "active"; session.endedAt = null; await session.save();
    }
    if (!trip.deviceId) { trip.deviceId = auth.device._id; await trip.save(); }
    return NextResponse.json({ success: true, data: { sessionId: String(session._id), state: session.state, policy: TRACKING_POLICY } });
  } catch (error) {
    console.error("mobile tracking start:", error.message);
    return NextResponse.json({ success: false, code: "TRACKING_START_FAILED", message: "Unable to start tracking." }, { status: 500 });
  }
}
