import mongoose from "mongoose";
import { NextResponse } from "next/server";
import DriverTrip from "@/models/DriverTrip";
import TripEvent from "@/models/TripEvent";
import TrackingSession from "@/models/TrackingSession";
import StopEpisode from "@/models/StopEpisode";
import MobileOperationalAlert from "@/models/MobileOperationalAlert";
import LocationPoint from "@/models/LocationPoint";
import { distanceM } from "@/lib/driverStopIntelligence.mjs";
import { requireMobileAuth } from "@/lib/driverMobileAuth";
import { canApplyDriverAction, driverSafeTripDto, effectiveDriverTripState, getActionDefinition, nextDriverDrop } from "@/lib/driverMobileCore.mjs";

const ACTIVE_STATES = new Set(["assigned", "started", "at_pickup", "in_transit", "at_stop", "delivered"]);

function safeEventPayload(body, action) {
  const payload = {};
  if (action === "REPORT_ISSUE") {
    payload.issueType = String(body.issueType || "other").slice(0, 60);
    payload.note = String(body.note || "").slice(0, 500);
  }
  if (body.recordedAt && !Number.isNaN(Date.parse(body.recordedAt))) payload.recordedAt = new Date(body.recordedAt);
  return payload;
}

export async function POST(req, { params }) {
  const auth = await requireMobileAuth(req);
  if (auth.error) return auth.error;
  const { tripId } = await params;
  if (!mongoose.isValidObjectId(tripId)) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Trip not found." }, { status: 404 });
  try {
    const body = await req.json();
    const action = String(body.action || "").toUpperCase();
    const idempotencyKey = String(body.idempotencyKey || "");
    const expectedVersion = Number(body.expectedVersion);
    const definition = getActionDefinition(action);
    if (!definition || idempotencyKey.length < 12 || idempotencyKey.length > 120 || !Number.isInteger(expectedVersion) || expectedVersion < 0) {
      return NextResponse.json({ success: false, code: "INVALID_ACTION", message: "Action, idempotency key, or expected trip version is invalid." }, { status: 400 });
    }
    const trip = await DriverTrip.findOne({ _id: tripId, companyId: auth.driver.companyId, driverId: auth.driver._id });
    if (!trip) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Trip not found." }, { status: 404 });
    const previousEvent = await TripEvent.findOne({ tripId: trip._id, idempotencyKey }).lean();
    if (previousEvent) return NextResponse.json({ success: true, data: driverSafeTripDto(trip), idempotent: true });
    if (!ACTIVE_STATES.has(trip.state) || !canApplyDriverAction(effectiveDriverTripState(trip), action)) {
      return NextResponse.json({ success: false, code: "INVALID_TRANSITION", message: "This action is not allowed for the current trip state." }, { status: 409 });
    }
    if (trip.version !== expectedVersion) {
      return NextResponse.json({ success: false, code: "STALE_TRIP", message: "This trip changed. Refresh it before taking another action." }, { status: 409 });
    }
    const now = new Date();
    const update = { $inc: { version: 1 } };
    if (definition.to) update.$set = { state: definition.to };
    if (action === "START_TRIP" || action === "START_DELIVERY") {
      const otherTrip = await DriverTrip.exists({ companyId: trip.companyId, deviceId: auth.device._id, _id: { $ne: trip._id }, state: { $in: ["started", "at_pickup", "in_transit", "at_stop", "delivered"] } });
      if (otherTrip) return NextResponse.json({ success: false, code: "OTHER_TRIP_TRACKING", message: "Finish the current trip before starting another one." }, { status: 409 });
      update.$set = { ...update.$set, startedAt: trip.startedAt || now, deviceId: auth.device._id };
      if (action === "START_DELIVERY") {
        if (trip.deviceId && String(trip.deviceId) !== String(auth.device._id)) {
          return NextResponse.json({ success: false, code: "DEVICE_MISMATCH", message: "Start delivery on the phone assigned to this trip." }, { status: 409 });
        }
        update.$set.deliveryStartedAt = now;
        update.$set.deliveryLegStartedAt = now;
      }
    }
    const stops = trip.routeSnapshot?.stops || [];
    const nextDrop = nextDriverDrop(stops);
    const payload = safeEventPayload(body, action);
    if (action === "ARRIVE_STOP" || action === "DELIVER") {
      const drops = stops.filter((stop) => stop.type === "drop");
      const sequence = body.stopSequence ?? (drops.length === 1 ? nextDrop?.sequence : null);
      if (!nextDrop || sequence !== nextDrop.sequence) {
        return NextResponse.json({ success: false, code: "INVALID_STOP", message: "Refresh the trip and select its next pending drop." }, { status: 409 });
      }
      if (action === "DELIVER" && (trip.deliveryStartedAt || drops.length > 1 || nextDrop.geofence?.radiusM) && nextDrop.status !== "arrived") {
        return NextResponse.json({ success: false, code: "ARRIVAL_REQUIRED", message: "Confirm arrival at this drop before recording delivery." }, { status: 409 });
      }
      if (action === "ARRIVE_STOP" && trip.deliveryStartedAt) {
        return NextResponse.json({ success: false, code: "GPS_ARRIVAL_ONLY", message: "Arrival is recorded automatically from GPS or by dispatch." }, { status: 409 });
      }
      if (action === "ARRIVE_STOP" && nextDrop.geofence?.radiusM) {
        const actionAt = payload.recordedAt && payload.recordedAt < now ? payload.recordedAt : now;
        const gps = await LocationPoint.findOne({ tripId: trip._id, companyId: trip.companyId, deviceId: auth.device._id, accuracyM: { $lte: 100 }, isMocked: { $ne: true }, recordedAt: { $gte: new Date(actionAt - 5 * 60000), $lte: new Date(Math.min(now.getTime(), actionAt.getTime() + 60000)) } }).sort({ recordedAt: -1 }).lean();
        if (!gps || distanceM(gps, nextDrop.geofence) + gps.accuracyM > nextDrop.geofence.radiusM) {
          return NextResponse.json({ success: false, code: "ARRIVAL_GPS_REQUIRED", message: "A recent GPS reading inside this drop is required. Wait for GPS or contact dispatch to confirm arrival." }, { status: 409 });
        }
        payload.gpsVerified = true;
      } else if (action === "ARRIVE_STOP") payload.gpsVerified = false;
      update.$set[`routeSnapshot.stops.${stops.indexOf(nextDrop)}.status`] = action === "DELIVER" ? "completed" : "arrived";
      if (action === "DELIVER") {
        const hasMoreDrops = drops.some((stop) => stop !== nextDrop && stop.status !== "completed");
        if (hasMoreDrops) {
          update.$set.state = trip.deliveryStartedAt ? "in_transit" : "at_stop";
          update.$set.deliveryLegStartedAt = now;
        } else if (trip.deliveryStartedAt) {
          update.$set.state = "completed";
          update.$set.completedAt = now;
        }
      }
      payload.stopSequence = nextDrop.sequence;
    }
    if (action === "COMPLETE" && nextDrop && stops.filter((stop) => stop.type === "drop").length > 1) {
      return NextResponse.json({ success: false, code: "DROPS_PENDING", message: "Every drop must be delivered before completing this trip." }, { status: 409 });
    }
    if (action === "COMPLETE") update.$set = { ...(update.$set || {}), completedAt: now };
    if (action === "REPORT_ISSUE") update.$set = { ...(update.$set || {}), issueStatus: safeEventPayload(body, action).issueType || "other" };
    const updated = await DriverTrip.findOneAndUpdate({ _id: trip._id, version: expectedVersion }, update, { new: true });
    if (!updated) return NextResponse.json({ success: false, code: "STALE_TRIP", message: "This trip changed. Refresh it before taking another action." }, { status: 409 });
    if (updated.state === "completed") {
      await TrackingSession.updateMany({ companyId: updated.companyId, tripId: updated._id, state: { $ne: "ended" } }, { $set: { state: "ended", endedAt: now } });
      await MobileOperationalAlert.updateMany({ companyId: updated.companyId, tripId: updated._id, kind: { $ne: "driver_issue" }, state: { $ne: "resolved" } }, { $set: { state: "resolved", resolvedAt: now, resolutionNote: "Trip completed." } });
    }
    if (action === "REPORT_ISSUE" && mongoose.isValidObjectId(body.stopEpisodeId)) {
      const classification = { fuel: "fuel", waiting: "customer_wait", breakdown: "breakdown", traffic: "traffic", break: "meal" }[payload.issueType] || "unknown";
      await StopEpisode.updateOne({ _id: body.stopEpisodeId, companyId: updated.companyId, tripId: updated._id }, { $set: { confirmedByDriver: true, classification } });
      payload.stopEpisodeId = body.stopEpisodeId;
    }
    await TripEvent.create({
      companyId: updated.companyId,
      tripId: updated._id,
      type: definition.eventType,
      source: "driver",
      idempotencyKey,
      occurredAt: now,
      payload,
      createdByDriverId: auth.driver._id,
    });
    return NextResponse.json({ success: true, data: driverSafeTripDto(updated), idempotent: false });
  } catch (error) {
    if (error?.code === 11000) return NextResponse.json({ success: false, code: "DUPLICATE_ACTION", message: "This action was already received. Refresh the trip." }, { status: 409 });
    console.error("mobile trip action:", error.message);
    return NextResponse.json({ success: false, code: "ACTION_FAILED", message: "Unable to save the trip action." }, { status: 500 });
  }
}
