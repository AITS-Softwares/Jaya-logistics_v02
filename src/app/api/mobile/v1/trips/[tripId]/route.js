import mongoose from "mongoose";
import { NextResponse } from "next/server";
import DriverTrip from "@/models/DriverTrip";
import { requireMobileAuth } from "@/lib/driverMobileAuth";
import { driverSafeTripDto } from "@/lib/driverMobileCore.mjs";

export async function GET(req, { params }) {
  const auth = await requireMobileAuth(req);
  if (auth.error) return auth.error;
  const { tripId } = await params;
  if (!mongoose.isValidObjectId(tripId)) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Trip not found." }, { status: 404 });
  const trip = await DriverTrip.findOne({ _id: tripId, companyId: auth.driver.companyId, driverId: auth.driver._id }).lean();
  if (!trip) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Trip not found." }, { status: 404 });
  return NextResponse.json({ success: true, data: driverSafeTripDto(trip) });
}
