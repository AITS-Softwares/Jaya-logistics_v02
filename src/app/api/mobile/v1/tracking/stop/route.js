import { NextResponse } from "next/server";
import TrackingSession from "@/models/TrackingSession";
import TripEvent from "@/models/TripEvent";
import { requireMobileAuth } from "@/lib/driverMobileAuth";
import { createIdempotencyKey } from "@/lib/driverMobileCore.mjs";
import { isObjectId, sameObjectId } from "@/lib/driverTracking";

export async function POST(req) {
  const auth = await requireMobileAuth(req);
  if (auth.error) return auth.error;
  try {
    const { sessionId, reason } = await req.json();
    if (!isObjectId(sessionId)) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Tracking session not found." }, { status: 404 });
    const session = await TrackingSession.findOne({ _id: sessionId, companyId: auth.driver.companyId, driverId: auth.driver._id, state: { $in: ["active", "paused", "stale"] } });
    if (!session || !sameObjectId(session.deviceId, auth.device._id)) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Tracking session not found." }, { status: 404 });
    session.state = "ended"; session.endedAt = new Date(); await session.save();
    await TripEvent.create({ companyId: session.companyId, tripId: session.tripId, type: "tracking_stopped", source: "driver", idempotencyKey: createIdempotencyKey(), createdByDriverId: auth.driver._id, payload: { sessionId: String(session._id), reason: String(reason || "driver_stop").slice(0, 100) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("mobile tracking stop:", error.message);
    return NextResponse.json({ success: false, code: "TRACKING_STOP_FAILED", message: "Unable to stop tracking." }, { status: 500 });
  }
}
