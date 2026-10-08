import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverTrip from "@/models/DriverTrip";
import { isDriverMobileEnabled, mobileUnavailableResponse } from "@/lib/driverMobileAuth";
import { requireDriverMobileStaff } from "@/lib/driverMobileStaff";

// The dispatcher explicitly approves map-derived route data before it becomes
// visible as an ETA baseline. GPS never silently rewrites the plan.
export async function POST(req, { params }) {
  if (!isDriverMobileEnabled()) return mobileUnavailableResponse();
  const staff = requireDriverMobileStaff(req, "edit");
  if (staff.error) return staff.error;
  const { tripId } = await params;
  if (!mongoose.isValidObjectId(tripId)) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Trip not found." }, { status: 404 });
  try {
    const body = await req.json();
    const distanceKm = Number(body.distanceKm);
    const durationMinutes = Number(body.durationMinutes);
    const expectedDays = Number(body.expectedDays);
    if (!Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > 10000 || !Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 43200 || !Number.isInteger(expectedDays) || expectedDays < 1 || expectedDays > 60) {
      return NextResponse.json({ success: false, code: "INVALID_ROUTE_BASELINE", message: "Route distance, duration, or expected days are invalid." }, { status: 400 });
    }
    await dbConnect();
    const trip = await DriverTrip.findOneAndUpdate({ _id: tripId, companyId: staff.user.companyId }, {
      $set: { "routeSnapshot.routeBaseline": { distanceKm, durationMinutes, expectedDays, approvedAt: new Date(), approvedBy: staff.user.id } },
    }, { new: true });
    if (!trip) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Trip not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: { tripId: String(trip._id), routeBaseline: trip.routeSnapshot.routeBaseline } });
  } catch (error) {
    console.error("mobile trip route baseline:", error.message);
    return NextResponse.json({ success: false, code: "ROUTE_BASELINE_FAILED", message: "Unable to save the route baseline." }, { status: 500 });
  }
}
