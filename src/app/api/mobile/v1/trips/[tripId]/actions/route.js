import mongoose from "mongoose";
import { NextResponse } from "next/server";
import DriverTrip from "@/models/DriverTrip";
import TripEvent from "@/models/TripEvent";
import { requireMobileAuth } from "@/lib/driverMobileAuth";
import { canApplyDriverAction, driverSafeTripDto, getActionDefinition } from "@/lib/driverMobileCore.mjs";

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
    if (!ACTIVE_STATES.has(trip.state) || !canApplyDriverAction(trip.state, action)) {
      return NextResponse.json({ success: false, code: "INVALID_TRANSITION", message: "This action is not allowed for the current trip state." }, { status: 409 });
    }
    if (trip.version !== expectedVersion) {
      return NextResponse.json({ success: false, code: "STALE_TRIP", message: "This trip changed. Refresh it before taking another action." }, { status: 409 });
    }
    const now = new Date();
    const update = { $inc: { version: 1 } };
    if (definition.to) update.$set = { state: definition.to };
    if (action === "START_TRIP") update.$set = { ...(update.$set || {}), startedAt: now, deviceId: auth.device._id };
    if (action === "COMPLETE") update.$set = { ...(update.$set || {}), completedAt: now };
    if (action === "REPORT_ISSUE") update.$set = { ...(update.$set || {}), issueStatus: safeEventPayload(body, action).issueType || "other" };
    const updated = await DriverTrip.findOneAndUpdate({ _id: trip._id, version: expectedVersion }, update, { new: true });
    if (!updated) return NextResponse.json({ success: false, code: "STALE_TRIP", message: "This trip changed. Refresh it before taking another action." }, { status: 409 });
    await TripEvent.create({
      companyId: updated.companyId,
      tripId: updated._id,
      type: definition.eventType,
      source: "driver",
      idempotencyKey,
      occurredAt: now,
      payload: safeEventPayload(body, action),
      createdByDriverId: auth.driver._id,
    });
    return NextResponse.json({ success: true, data: driverSafeTripDto(updated), idempotent: false });
  } catch (error) {
    if (error?.code === 11000) return NextResponse.json({ success: false, code: "DUPLICATE_ACTION", message: "This action was already received. Refresh the trip." }, { status: 409 });
    console.error("mobile trip action:", error.message);
    return NextResponse.json({ success: false, code: "ACTION_FAILED", message: "Unable to save the trip action." }, { status: 500 });
  }
}
