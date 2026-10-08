import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverTrip from "@/models/DriverTrip";
import TripEvent from "@/models/TripEvent";
import { isDriverMobileEnabled, mobileUnavailableResponse } from "@/lib/driverMobileAuth";
import { requireDriverMobileStaff } from "@/lib/driverMobileStaff";

function safePayload(payload = {}) {
  const allowed = ["loadingReference", "overrideReason", "issueType", "note", "recordedAt", "sessionId", "reason"];
  return Object.fromEntries(allowed.filter((key) => payload[key] !== undefined && payload[key] !== "").map((key) => [key, payload[key]]));
}

// Read-only, staff-only event history. Driver credentials, token metadata, and
// raw location point payloads are intentionally not part of this endpoint.
export async function GET(req, { params }) {
  if (!isDriverMobileEnabled()) return mobileUnavailableResponse();
  const staff = requireDriverMobileStaff(req);
  if (staff.error) return staff.error;
  const { tripId } = await params;
  if (!mongoose.isValidObjectId(tripId)) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Trip not found." }, { status: 404 });
  await dbConnect();
  const trip = await DriverTrip.findOne({ _id: tripId, companyId: staff.user.companyId }).lean();
  if (!trip) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Trip not found." }, { status: 404 });
  const events = await TripEvent.find({ companyId: staff.user.companyId, tripId: trip._id }).sort({ occurredAt: -1 }).limit(100).lean();
  return NextResponse.json({ success: true, data: {
    trip: { id: String(trip._id), loadingReference: trip.loadingReference, vehicleNo: trip.vehicle?.vehicleNo || "", state: trip.state },
    events: events.map((event) => ({ id: String(event._id), type: event.type, source: event.source, occurredAt: event.occurredAt, payload: safePayload(event.payload) })),
  } });
}
