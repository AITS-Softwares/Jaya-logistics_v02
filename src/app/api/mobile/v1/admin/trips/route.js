import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LoadingPanel from "@/app/api/loading-panel/LoadingPanel";
import ConsignmentNote from "@/app/api/consignment-note/ConsignmentNote";
import DriverProfile from "@/models/DriverProfile";
import DriverTrip from "@/models/DriverTrip";
import TripEvent from "@/models/TripEvent";
import { isDriverMobileEnabled, mobileUnavailableResponse } from "@/lib/driverMobileAuth";
import { requireDriverMobileStaff } from "@/lib/driverMobileStaff";
import { buildDriverTripSnapshot } from "@/lib/driverTripSnapshot";
import { createIdempotencyKey, driverSafeTripDto } from "@/lib/driverMobileCore.mjs";

const ACTIVE_STATES = ["assigned", "started", "at_pickup", "in_transit", "at_stop", "delivered"];

export async function GET(req) {
  if (!isDriverMobileEnabled()) return mobileUnavailableResponse();
  const staff = requireDriverMobileStaff(req);
  if (staff.error) return staff.error;
  await dbConnect();
  const state = new URL(req.url).searchParams.get("state");
  const query = { companyId: staff.user.companyId };
  if (state === "active") query.state = { $in: ACTIVE_STATES };
  else if (state) query.state = state;
  const trips = await DriverTrip.find(query).sort({ updatedAt: -1 }).limit(100).lean();
  return NextResponse.json({ success: true, data: trips.map(driverSafeTripDto) });
}

export async function POST(req) {
  if (!isDriverMobileEnabled()) return mobileUnavailableResponse();
  const staff = requireDriverMobileStaff(req, "edit");
  if (staff.error) return staff.error;
  try {
    const body = await req.json();
    const { loadingId, driverId } = body;
    const allowConcurrent = body.allowConcurrent === true;
    const overrideReason = String(body.overrideReason || "").slice(0, 300);
    if (!mongoose.isValidObjectId(loadingId) || !mongoose.isValidObjectId(driverId)) {
      return NextResponse.json({ success: false, code: "INVALID_ASSIGNMENT", message: "A valid loading and driver are required." }, { status: 400 });
    }
    await dbConnect();
    const [loading, driver] = await Promise.all([
      LoadingPanel.findOne({ _id: loadingId, companyId: staff.user.companyId }).lean(),
      DriverProfile.findOne({ _id: driverId, companyId: staff.user.companyId, status: "active" }).lean(),
    ]);
    if (!loading || !driver) return NextResponse.json({ success: false, code: "INVALID_ASSIGNMENT", message: "Loading or active driver was not found." }, { status: 404 });
    const snapshot = buildDriverTripSnapshot(loading, await ConsignmentNote.find({ companyId: staff.user.companyId, loadingInfoNo: loading.vehicleArrivalNo }).lean());
    if (!snapshot.vehicle.vehicleNo) return NextResponse.json({ success: false, code: "MISSING_VEHICLE", message: "The loading has no vehicle number." }, { status: 409 });
    if (snapshot.driverMobile && snapshot.driverMobile !== driver.mobileE164) {
      return NextResponse.json({ success: false, code: "DRIVER_MISMATCH", message: "The loading driver mobile does not match the selected Driver Profile." }, { status: 409 });
    }
    if (!allowConcurrent) {
      const conflict = await DriverTrip.findOne({
        companyId: staff.user.companyId,
        state: { $in: ACTIVE_STATES },
        $or: [{ driverId: driver._id }, { "vehicle.vehicleNo": snapshot.vehicle.vehicleNo }],
      }).lean();
      if (conflict) return NextResponse.json({ success: false, code: "ACTIVE_TRIP_CONFLICT", message: "This driver or vehicle already has an active trip. Cancel/reassign it first, or use the approved override process." }, { status: 409 });
    } else if (!overrideReason) {
      return NextResponse.json({ success: false, code: "OVERRIDE_REASON_REQUIRED", message: "An override reason is required for concurrent trip assignment." }, { status: 400 });
    }
    const trip = await DriverTrip.create({
      companyId: staff.user.companyId,
      loadingId: loading._id,
      loadingReference: snapshot.loadingReference,
      lrIds: snapshot.lrIds,
      lrNumbers: snapshot.lrNumbers,
      vehicle: snapshot.vehicle,
      driverId: driver._id,
      routeSnapshot: snapshot.routeSnapshot,
      createdBy: staff.user.id,
    });
    await TripEvent.create({
      companyId: trip.companyId,
      tripId: trip._id,
      type: "trip_assigned",
      source: "dispatcher",
      idempotencyKey: createIdempotencyKey(),
      payload: { loadingReference: trip.loadingReference, overrideReason: allowConcurrent ? overrideReason : "" },
      createdByUserId: staff.user.id,
    });
    return NextResponse.json({ success: true, data: driverSafeTripDto(trip) }, { status: 201 });
  } catch (error) {
    console.error("mobile admin trip create:", error.message);
    return NextResponse.json({ success: false, code: "TRIP_CREATE_FAILED", message: "Unable to create driver trip." }, { status: 500 });
  }
}
