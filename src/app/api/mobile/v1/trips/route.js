import { NextResponse } from "next/server";
import DriverTrip from "@/models/DriverTrip";
import { requireMobileAuth } from "@/lib/driverMobileAuth";
import { driverSafeTripDto } from "@/lib/driverMobileCore.mjs";

export async function GET(req) {
  const auth = await requireMobileAuth(req);
  if (auth.error) return auth.error;
  const requestedState = new URL(req.url).searchParams.get("state") || "active";
  const query = { companyId: auth.driver.companyId, driverId: auth.driver._id };
  if (requestedState === "active") query.state = { $in: ["assigned", "started", "at_pickup", "in_transit", "at_stop", "delivered"] };
  else if (["assigned", "started", "at_pickup", "in_transit", "at_stop", "delivered", "completed", "cancelled"].includes(requestedState)) query.state = requestedState;
  else return NextResponse.json({ success: false, code: "INVALID_STATE", message: "Unsupported trip state filter." }, { status: 400 });
  const trips = await DriverTrip.find(query).sort({ updatedAt: -1 }).limit(50).lean();
  return NextResponse.json({ success: true, data: trips.map(driverSafeTripDto) });
}
