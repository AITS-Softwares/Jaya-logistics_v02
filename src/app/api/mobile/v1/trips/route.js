import { NextResponse } from "next/server";
import DriverTrip from "@/models/DriverTrip";
import StopEpisode from "@/models/StopEpisode";
import { requireMobileAuth } from "@/lib/driverMobileAuth";
import { driverSafeTripDto } from "@/lib/driverMobileCore.mjs";

export async function GET(req) {
  const auth = await requireMobileAuth(req);
  if (auth.error) return auth.error;
  const requestedState = new URL(req.url).searchParams.get("state") || "active";
  const query = { companyId: auth.driver.companyId, driverId: auth.driver._id };
  if (requestedState === "active") query.state = { $in: ["assigned", "started", "at_pickup", "in_transit", "at_stop", "delivered"] };
  else if (requestedState === "history") query.state = { $in: ["completed", "cancelled"] };
  else if (["assigned", "started", "at_pickup", "in_transit", "at_stop", "delivered", "completed", "cancelled"].includes(requestedState)) query.state = requestedState;
  else return NextResponse.json({ success: false, code: "INVALID_STATE", message: "Unsupported trip state filter." }, { status: 400 });
  const trips = await DriverTrip.find(query).sort({ updatedAt: -1 }).limit(50).lean();
  const prompts = requestedState === "active" ? await StopEpisode.find({ companyId: auth.driver.companyId, tripId: { $in: trips.map((trip) => trip._id) }, endedAt: null, linkedStopIndex: null, confirmedByDriver: { $ne: true }, durationSec: { $gte: 15 * 60 } }).sort({ startedAt: -1 }).select("tripId durationSec").lean() : [];
  return NextResponse.json({ success: true, data: trips.map((trip) => {
    const prompt = prompts.find((stop) => String(stop.tripId) === String(trip._id));
    return { ...driverSafeTripDto(trip), stopPrompt: prompt ? { id: String(prompt._id), durationSec: prompt.durationSec } : null };
  }) });
}
