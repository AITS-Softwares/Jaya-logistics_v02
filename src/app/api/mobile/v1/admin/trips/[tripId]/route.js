import { withBranchAccess } from '@/lib/branchAccess';
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverTrip from "@/models/DriverTrip";
import TrackingSession from "@/models/TrackingSession";
import TripEvent from "@/models/TripEvent";
import { isDriverMobileEnabled, mobileUnavailableResponse } from "@/lib/driverMobileAuth";
import { requireDriverMobileStaff } from "@/lib/driverMobileStaff";
import { createIdempotencyKey, driverSafeTripDto, nextDriverDrop, normalizeDriverMobile } from "@/lib/driverMobileCore.mjs";
import MobileOperationalAlert from "@/models/MobileOperationalAlert";
import { lookupTrackingStops, trackingGeocodeKey } from "@/app/api/tracking/geocode/lookup";

const ACTIVE_STATES = ["assigned", "started", "at_pickup", "in_transit", "at_stop", "delivered"];

// Cancellation is deliberately separate from Loading Info: a dispatcher can
// stop mobile delivery access without changing the established ERP record.
async function branchHandlerPATCH(req, { params }) {
  if (!(await isDriverMobileEnabled())) return mobileUnavailableResponse();
  const staff = requireDriverMobileStaff(req, "edit");
  if (staff.error) return staff.error;
  const { tripId } = await params;
  if (!mongoose.isValidObjectId(tripId)) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Trip not found." }, { status: 404 });
  try {
    const { action, reason, stopSequence, radiusM, contactPhone } = await req.json();
    const cancellationReason = String(reason || "").trim().slice(0, 300);
    await dbConnect();
    const trip = await DriverTrip.findOne({ _id: tripId, companyId: staff.user.companyId });
    if (!trip) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Trip not found." }, { status: 404 });
    if (["configure_stop", "override_arrival", "resolve_drop"].includes(action)) {
      const stops = trip.routeSnapshot?.stops || [];
      const index = stops.findIndex((stop) => stop.type === "drop" && stop.sequence === stopSequence);
      if (index < 0 || !ACTIVE_STATES.includes(trip.state) || (action !== "configure_stop" && !cancellationReason)) {
        return NextResponse.json({ success: false, message: "Choose a drop on an active trip and enter a reason." }, { status: 400 });
      }
      const path = `routeSnapshot.stops.${index}`;
      const changes = {};
      if (action !== "configure_stop") {
        const resolve = action === "resolve_drop";
        if (!(trip.state === "in_transit" || (resolve && trip.state === "at_stop")) || nextDriverDrop(stops) !== stops[index]) {
          return NextResponse.json({ success: false, message: "Only the next drop on an active delivery can be updated." }, { status: 409 });
        }
        const last = !stops.some((stop) => stop.type === "drop" && stop !== stops[index] && stop.status !== "completed");
        changes.state = "at_stop";
        if (resolve) {
          changes.deliveryLegStartedAt = new Date();
          if (trip.deliveryStartedAt) {
            changes.state = last ? "completed" : "in_transit";
            if (last) changes.completedAt = changes.deliveryLegStartedAt;
          } else if (last) changes.state = "delivered";
        }
        changes[`${path}.status`] = resolve ? "completed" : "arrived";
      } else {
        const phone = contactPhone ? normalizeDriverMobile(contactPhone) : "";
        if ((contactPhone && !phone) || !Number.isFinite(radiusM) || radiusM < 50 || radiusM > 1000) {
          return NextResponse.json({ success: false, message: "Enter a radius from 50–1,000 m and a valid phone number if supplied." }, { status: 400 });
        }
        const drop = stops[index];
        const key = trackingGeocodeKey();
        if (!key) return NextResponse.json({ success: false, message: "Drop address lookup is unavailable." }, { status: 503 });
        const { results } = await lookupTrackingStops([{ key: "drop", text: drop.address, city: drop.city, pin: drop.pinCode }], trip.companyId, key);
        const location = results.drop;
        if (location?.status === "error") return NextResponse.json({ success: false, message: "Drop address lookup is temporarily unavailable. Try again." }, { status: 503 });
        if (location?.status !== "ok" || location.accuracy !== "precise") {
          return NextResponse.json({ success: false, message: "A precise delivery location could not be found. Check the drop address before setting an arrival radius." }, { status: 422 });
        }
        changes[`${path}.geofence`] = { latitude: location.lat, longitude: location.lng, radiusM };
        if (contactPhone !== undefined) changes[`${path}.contactPhone`] = phone;
      }
      const updated = await DriverTrip.findOneAndUpdate({ _id: trip._id, version: trip.version }, { $set: changes, $inc: { version: 1 } }, { new: true });
      if (!updated) return NextResponse.json({ success: false, message: "Trip changed. Refresh and try again." }, { status: 409 });
      if (changes.state === "completed") {
        await TrackingSession.updateMany({ companyId: trip.companyId, tripId: trip._id, state: { $ne: "ended" } }, { $set: { state: "ended", endedAt: changes.completedAt } });
        await MobileOperationalAlert.updateMany({ companyId: trip.companyId, tripId: trip._id, kind: { $ne: "driver_issue" }, state: { $ne: "resolved" } }, { $set: { state: "resolved", resolvedAt: changes.completedAt, resolutionNote: "Trip completed." } });
      }
      await TripEvent.create({
        companyId: trip.companyId, tripId: trip._id, type: { override_arrival: "arrival_overridden", resolve_drop: "drop_resolved", configure_stop: "stop_configured" }[action], source: "dispatcher",
        idempotencyKey: createIdempotencyKey(), createdByUserId: staff.user.id,
        payload: { stopSequence, reason: cancellationReason || "Arrival area set from drop address." },
      });
      return NextResponse.json({ success: true, data: driverSafeTripDto(updated) });
    }
    if (action !== "cancel" || !cancellationReason) {
      return NextResponse.json({ success: false, code: "CANCELLATION_REASON_REQUIRED", message: "Choose cancel and provide a reason." }, { status: 400 });
    }
    if (trip.state === "cancelled") return NextResponse.json({ success: true, data: driverSafeTripDto(trip), alreadyCancelled: true });
    if (!ACTIVE_STATES.includes(trip.state)) {
      return NextResponse.json({ success: false, code: "TRIP_NOT_CANCELLABLE", message: "Only an active mobile trip can be cancelled." }, { status: 409 });
    }
    const now = new Date();
    const updated = await DriverTrip.findOneAndUpdate(
      { _id: trip._id, companyId: staff.user.companyId, state: trip.state, version: trip.version },
      { $set: { state: "cancelled", cancelledAt: now, cancelReason: cancellationReason }, $inc: { version: 1 } },
      { new: true },
    );
    if (!updated) return NextResponse.json({ success: false, code: "TRIP_CHANGED", message: "Trip changed while it was being cancelled. Refresh and try again." }, { status: 409 });
    await TrackingSession.updateMany({ companyId: updated.companyId, tripId: updated._id, state: { $in: ["active", "paused", "stale"] } }, { $set: { state: "ended", endedAt: now } });
    await MobileOperationalAlert.updateMany({ companyId: updated.companyId, tripId: updated._id, kind: { $ne: "driver_issue" }, state: { $ne: "resolved" } }, { $set: { state: "resolved", resolvedAt: now, resolutionNote: "Trip cancelled." } });
    await TripEvent.create({
      companyId: updated.companyId, tripId: updated._id, type: "trip_cancelled", source: "dispatcher",
      idempotencyKey: createIdempotencyKey(), occurredAt: now, createdByUserId: staff.user.id,
      payload: { reason: cancellationReason },
    });
    return NextResponse.json({ success: true, data: driverSafeTripDto(updated) });
  } catch (error) {
    console.error("mobile admin trip cancel:", error.message);
    return NextResponse.json({ success: false, code: "TRIP_CANCEL_FAILED", message: "Unable to cancel this mobile trip." }, { status: 500 });
  }
}

export const PATCH = withBranchAccess(branchHandlerPATCH);
