import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverTrip from "@/models/DriverTrip";
import TrackingSession from "@/models/TrackingSession";
import TripEvent from "@/models/TripEvent";
import { isDriverMobileEnabled, mobileUnavailableResponse } from "@/lib/driverMobileAuth";
import { requireDriverMobileStaff } from "@/lib/driverMobileStaff";
import { createIdempotencyKey, driverSafeTripDto } from "@/lib/driverMobileCore.mjs";

const ACTIVE_STATES = ["assigned", "started", "at_pickup", "in_transit", "at_stop", "delivered"];

// Cancellation is deliberately separate from Loading Info: a dispatcher can
// stop mobile delivery access without changing the established ERP record.
export async function PATCH(req, { params }) {
  if (!isDriverMobileEnabled()) return mobileUnavailableResponse();
  const staff = requireDriverMobileStaff(req, "edit");
  if (staff.error) return staff.error;
  const { tripId } = await params;
  if (!mongoose.isValidObjectId(tripId)) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Trip not found." }, { status: 404 });
  try {
    const { action, reason } = await req.json();
    const cancellationReason = String(reason || "").trim().slice(0, 300);
    if (action !== "cancel" || !cancellationReason) {
      return NextResponse.json({ success: false, code: "CANCELLATION_REASON_REQUIRED", message: "Choose cancel and provide a reason." }, { status: 400 });
    }
    await dbConnect();
    const trip = await DriverTrip.findOne({ _id: tripId, companyId: staff.user.companyId });
    if (!trip) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Trip not found." }, { status: 404 });
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
