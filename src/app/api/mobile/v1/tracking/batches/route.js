import { NextResponse } from "next/server";
import DriverTrip from "@/models/DriverTrip";
import TrackingSession from "@/models/TrackingSession";
import LocationPoint from "@/models/LocationPoint";
import StopEpisode from "@/models/StopEpisode";
import { requireMobileAuth } from "@/lib/driverMobileAuth";
import { TRACKING_POLICY, isObjectId, sameObjectId, validateLocationPoint } from "@/lib/driverTracking";
import { deriveStopEpisode } from "@/lib/driverStopIntelligence.mjs";

export async function POST(req) {
  const auth = await requireMobileAuth(req);
  if (auth.error) return auth.error;
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > TRACKING_POLICY.maximumBatchBytes) return NextResponse.json({ success: false, code: "BATCH_TOO_LARGE", message: "Tracking batch is too large." }, { status: 413 });
    const { tripId, sessionId, points } = await req.json();
    if (!isObjectId(tripId) || !isObjectId(sessionId) || !Array.isArray(points) || points.length < 1 || points.length > TRACKING_POLICY.maximumBatchPoints) return NextResponse.json({ success: false, code: "INVALID_BATCH", message: "Trip, session, or points are invalid." }, { status: 400 });
    const validated = points.map(validateLocationPoint);
    const invalid = validated.find((result) => result.error);
    if (invalid) return NextResponse.json({ success: false, code: "INVALID_POINT", message: invalid.error }, { status: 400 });
    const trip = await DriverTrip.findOne({ _id: tripId, companyId: auth.driver.companyId, driverId: auth.driver._id });
    const session = await TrackingSession.findOne({ _id: sessionId, companyId: auth.driver.companyId, tripId, driverId: auth.driver._id, state: "active" });
    if (!trip || !session || !sameObjectId(session.deviceId, auth.device._id) || !sameObjectId(trip.deviceId, auth.device._id)) return NextResponse.json({ success: false, code: "SESSION_INVALID", message: "The tracking session is not active for this trip and device." }, { status: 409 });
    const accepted = [];
    const existing = [];
    const expiresAt = new Date(Date.now() + TRACKING_POLICY.rawPointRetentionDays * 86400000);
    for (const { value } of validated) {
      try {
        await LocationPoint.create({ ...value, companyId: trip.companyId, sessionId: session._id, tripId: trip._id, driverId: auth.driver._id, deviceId: auth.device._id, expiresAt });
        accepted.push(value.idempotencyKey);
      } catch (error) {
        if (error?.code === 11000) existing.push(value.idempotencyKey);
        else throw error;
      }
    }
    const newest = validated.map(({ value }) => value).sort((a, b) => b.recordedAt - a.recordedAt)[0];
    await TrackingSession.updateOne({ _id: session._id }, { $set: { lastSequence: Math.max(session.lastSequence || 0, ...validated.map(({ value }) => value.sequence)), lastRecordedAt: newest.recordedAt } });
    // Stop episodes are operational hints only. They never advance a delivery
    // stop or rewrite the planned route; a driver action remains authoritative.
    const recentPoints = await LocationPoint.find({ sessionId: session._id }).sort({ recordedAt: -1 }).limit(60).lean();
    const detectedStop = deriveStopEpisode(recentPoints.reverse());
    const activeStop = await StopEpisode.findOne({ sessionId: session._id, endedAt: null }).sort({ startedAt: -1 });
    if (detectedStop) {
      if (activeStop) {
        activeStop.durationSec = detectedStop.durationSec; activeStop.centre = detectedStop.centre; activeStop.classification = detectedStop.classification; activeStop.confidence = detectedStop.confidence;
        await activeStop.save();
      } else {
        const { endedAt, ...episode } = detectedStop;
        await StopEpisode.create({ companyId: trip.companyId, tripId: trip._id, sessionId: session._id, ...episode });
      }
    } else if (activeStop) {
      activeStop.endedAt = newest.recordedAt; activeStop.durationSec = Math.max(0, Math.floor((newest.recordedAt - activeStop.startedAt) / 1000));
      await activeStop.save();
    }
    return NextResponse.json({ success: true, data: { acceptedIdempotencyKeys: accepted, existingIdempotencyKeys: existing, highestSequence: Math.max(session.lastSequence || 0, ...validated.map(({ value }) => value.sequence)) } });
  } catch (error) {
    console.error("mobile tracking batch:", error.message);
    return NextResponse.json({ success: false, code: "TRACKING_BATCH_FAILED", message: "Unable to store tracking points." }, { status: 500 });
  }
}
