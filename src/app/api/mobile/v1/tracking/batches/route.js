import { NextResponse } from "next/server";
import DriverTrip from "@/models/DriverTrip";
import TrackingSession from "@/models/TrackingSession";
import LocationPoint from "@/models/LocationPoint";
import StopEpisode from "@/models/StopEpisode";
import dbConnect from "@/lib/db";
import DriverProfile from "@/models/DriverProfile";
import DriverDevice from "@/models/DriverDevice";
import TripEvent from "@/models/TripEvent";
import { nextDriverDrop } from "@/lib/driverMobileCore.mjs";
import { hasDriverMobileAccess, isDriverAllowedForMobileRollout, isDriverMobileEnabled, requireMobileAuth, verifyTrackingAccess } from "@/lib/driverMobileAuth";
import { TRACKING_POLICY, isObjectId, sameObjectId, validateLocationPoint } from "@/lib/driverTracking";
import { deriveStopEpisode, distanceM, gpsConfirmsDropArrival, STOP_INTELLIGENCE_POLICY } from "@/lib/driverStopIntelligence.mjs";

const activeTripStates = ["started", "at_pickup", "in_transit", "at_stop", "delivered"];
const closingSyncMs = 24 * 60 * 60 * 1000;

export async function POST(req) {
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > TRACKING_POLICY.maximumBatchBytes) return NextResponse.json({ success: false, code: "BATCH_TOO_LARGE", message: "Tracking batch is too large." }, { status: 413 });
    const { tripId, sessionId, points, health } = await req.json();
    const scoped = req.headers.has("x-driver-tracking-token");
    if (!isObjectId(tripId) || !isObjectId(sessionId) || !Array.isArray(points) || (!scoped && points.length < 1) || points.length > TRACKING_POLICY.maximumBatchPoints) return NextResponse.json({ success: false, code: "INVALID_BATCH", message: "Trip, session, or points are invalid." }, { status: 400 });
    const claims = scoped ? await verifyTrackingAccess(req, sessionId) : null;
    if (scoped && !claims) return NextResponse.json({ success: false, code: "INVALID_TRACKING_TOKEN" }, { status: 401 });
    const auth = scoped ? null : await requireMobileAuth(req);
    if (auth?.error) return auth.error;
    await dbConnect();
    const companyId = claims?.companyId || auth.driver.companyId;
    const session = await TrackingSession.findOne({ _id: sessionId, companyId, tripId });
    const trip = session && await DriverTrip.findOne({ _id: tripId, companyId, driverId: session.driverId });
    const invalidSession = () => NextResponse.json({ success: false, code: "SESSION_INVALID", message: "The tracking session is not active for this trip and device." }, { status: 409 });
    if (!trip || !sameObjectId(trip.deviceId, session.deviceId)) return invalidSession();
    if (scoped) {
      const [driver, device, enabled] = await Promise.all([
        DriverProfile.findOne({ _id: session.driverId, companyId }),
        DriverDevice.exists({ _id: session.deviceId, companyId, driverId: session.driverId, status: "approved" }),
        isDriverMobileEnabled(companyId),
      ]);
      if (!enabled || !device || !hasDriverMobileAccess(driver) || !(await isDriverAllowedForMobileRollout(driver.mobileE164, companyId))) return invalidSession();
    } else if (!sameObjectId(session.driverId, auth.driver._id) || !sameObjectId(session.deviceId, auth.device._id)) {
      return invalidSession();
    }
    const active = session.state === "active" && activeTripStates.includes(trip.state);
    const cutoff = !active && trip.state === "completed" ? trip.completedAt : null;
    if (!active && (!scoped || !cutoff || Date.now() - cutoff.getTime() > closingSyncMs)) return invalidSession();
    if (active && scoped && health && typeof health.locationReady === "boolean") {
      await TrackingSession.updateOne({ _id: session._id, state: "active" }, { $set: { deviceHealth: {
        reportedAt: new Date(),
        locationReady: health.locationReady,
        samplingMode: ["moving", "slow", "stationary", "overnight"].includes(health.samplingMode) ? health.samplingMode : "unknown",
        queuedPoints: Number.isSafeInteger(health.queuedPoints) && health.queuedPoints >= 0 ? health.queuedPoints : null,
      } } });
    }
    const validated = points.map(validateLocationPoint);
    const invalid = validated.find((result) => result.error);
    if (invalid && !scoped) return NextResponse.json({ success: false, code: "INVALID_POINT", message: invalid.error }, { status: 400 });
    const rejected = points.filter((_, index) => validated[index].error || (cutoff && validated[index].value.recordedAt > cutoff)).map((point) => point?.idempotencyKey);
    const valid = validated.flatMap(({ value }) => value && (!cutoff || value.recordedAt <= cutoff) ? [value] : []);
    const accepted = [];
    const existing = [];
    const expiresAt = new Date(Date.now() + TRACKING_POLICY.rawPointRetentionDays * 86400000);
    for (const value of valid) {
      try {
        await LocationPoint.create({ ...value, companyId, sessionId: session._id, tripId: trip._id, driverId: session.driverId, deviceId: session.deviceId, expiresAt });
        accepted.push(value.idempotencyKey);
      } catch (error) {
        if (error?.code === 11000) existing.push(value.idempotencyKey);
        else throw error;
      }
    }
    const newest = valid.sort((a, b) => b.recordedAt - a.recordedAt)[0];
    const highestSequence = Math.max(session.lastSequence || 0, ...valid.map(({ sequence }) => sequence));
    const response = () => NextResponse.json({ success: true, data: { acceptedIdempotencyKeys: accepted, existingIdempotencyKeys: existing, rejectedIdempotencyKeys: rejected, highestSequence, trackingEnded: !active } });
    if (!newest) return response();
    await TrackingSession.updateOne({ _id: session._id }, { $max: { lastSequence: highestSequence, lastRecordedAt: newest.recordedAt } });
    if (!active) return response();
    if (trip.deliveryStartedAt && !trip.actualPickup?.recordedAt) {
      const pickup = await LocationPoint.findOne({
        companyId, tripId: trip._id, deviceId: session.deviceId, isMocked: { $ne: true }, accuracyM: { $lte: 100 },
        recordedAt: { $gte: trip.deliveryStartedAt, $lte: new Date() },
      }).sort({ recordedAt: 1, sequence: 1 }).lean();
      if (pickup) await DriverTrip.updateOne(
        { _id: trip._id, companyId, "actualPickup.recordedAt": null },
        { $set: { actualPickup: { latitude: pickup.latitude, longitude: pickup.longitude, recordedAt: pickup.recordedAt } } },
      );
    }

    const recentPoints = await LocationPoint.find({ sessionId: session._id, accuracyM: { $lte: 100 }, isMocked: { $ne: true } }).sort({ recordedAt: -1 }).limit(60).lean();
    const stops = trip.routeSnapshot?.stops || [];
    const nextDrop = trip.state === "in_transit" ? nextDriverDrop(stops) : null;
    if (nextDrop && (!nextDrop.status || nextDrop.status === "pending") && nextDrop.geofence?.radiusM
      && gpsConfirmsDropArrival(recentPoints, nextDrop.geofence, trip.deliveryLegStartedAt)) {
      const [latest] = recentPoints;
      const stopPath = `routeSnapshot.stops.${stops.indexOf(nextDrop)}.status`;
      const arrival = await DriverTrip.updateOne(
        { _id: trip._id, companyId, version: trip.version, state: "in_transit", [stopPath]: { $in: ["pending", null] } },
        { $set: { state: "at_stop", [stopPath]: "arrived" }, $inc: { version: 1 } },
      );
      if (arrival.modifiedCount) await TripEvent.create({
        companyId, tripId: trip._id, type: "stop_arrived", source: "system",
        idempotencyKey: `gps-arrival:${nextDrop.sequence}:${trip.version}`,
        occurredAt: latest.recordedAt, payload: { stopSequence: nextDrop.sequence, gpsVerified: true },
      });
    }
    const detectedStop = deriveStopEpisode(recentPoints.reverse());
    const activeStop = await StopEpisode.findOne({ sessionId: session._id, endedAt: null }).sort({ startedAt: -1 });
    if (detectedStop) {
      const matchingStop = (trip.routeSnapshot?.stops || []).findIndex((stop) => stop.geofence?.radiusM && distanceM(stop.geofence, detectedStop.centre) <= stop.geofence.radiusM);
      const linkedStopIndex = matchingStop < 0 ? null : matchingStop;
      if (activeStop && distanceM(activeStop.centre, detectedStop.centre) <= STOP_INTELLIGENCE_POLICY.stopRadiusM) {
        activeStop.durationSec = Math.max(activeStop.durationSec, Math.floor((detectedStop.endedAt - activeStop.startedAt) / 1000));
        activeStop.centre = detectedStop.centre;
        activeStop.linkedStopIndex = linkedStopIndex;
        if (!activeStop.confirmedByDriver) activeStop.classification = linkedStopIndex !== null ? "customer_wait" : activeStop.durationSec >= STOP_INTELLIGENCE_POLICY.overnightSeconds ? "overnight" : "unknown";
        activeStop.confidence = detectedStop.confidence;
        await activeStop.save();
      } else {
        if (activeStop) await StopEpisode.updateOne({ _id: activeStop._id }, { $set: { endedAt: detectedStop.startedAt } });
        const { endedAt, ...episode } = detectedStop;
        await StopEpisode.create({ companyId: trip.companyId, tripId: trip._id, sessionId: session._id, ...episode, linkedStopIndex, classification: linkedStopIndex !== null ? "customer_wait" : episode.classification });
      }
    } else if (activeStop) {
      activeStop.endedAt = newest.recordedAt; activeStop.durationSec = Math.max(0, Math.floor((newest.recordedAt - activeStop.startedAt) / 1000));
      await activeStop.save();
    }
    return response();
  } catch (error) {
    console.error("mobile tracking batch:", error.message);
    return NextResponse.json({ success: false, code: "TRACKING_BATCH_FAILED", message: "Unable to store tracking points." }, { status: 500 });
  }
}
