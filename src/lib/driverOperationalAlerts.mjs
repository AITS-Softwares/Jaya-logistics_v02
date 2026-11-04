import { liveTrackingStatus } from "./driverLiveTracking.mjs";

const TRACKING_EXPECTED_STATES = new Set(["started", "at_pickup", "in_transit", "at_stop", "delivered"]);

export function exceptionsForTrip(trip, session, now = new Date(), stop = null) {
  const alerts = [];
  const high = trip.state === "in_transit";
  if (trip.issueStatus) alerts.push({ kind: "driver_issue", severity: high ? "high" : "medium", message: `Driver reported: ${trip.issueStatus}.` });
  if (!TRACKING_EXPECTED_STATES.has(trip.state)) return alerts;
  if (!session) {
    alerts.push({ kind: "tracking_missing", severity: high ? "high" : "medium", message: "Trip has started but no active tracking session exists." });
    return alerts;
  }
  if (liveTrackingStatus(session, null, now) === "stale") {
    alerts.push({ kind: "tracking_stale", severity: high ? "high" : "medium", message: "No recent GPS update is available from the active tracking session." });
  }
  if (stop && !stop.confirmedByDriver && stop.linkedStopIndex == null && stop.durationSec >= 30 * 60) {
    alerts.push({ kind: "stop_unconfirmed", severity: stop.durationSec >= 45 * 60 ? "high" : "medium", message: "Driver has not confirmed the reason for a prolonged unplanned stop." });
  }
  return alerts;
}

export async function scanTripOperationalAlerts(db, trips, now = new Date()) {
  if (!trips.length) return;
  const tripIds = trips.map((trip) => trip._id);
  const [sessions, stops] = await Promise.all([
    db.collection("trackingsessions").find({ tripId: { $in: tripIds }, state: { $in: ["active", "paused", "stale"] } }).sort({ startedAt: -1 }).toArray(),
    db.collection("stopepisodes").find({ tripId: { $in: tripIds }, endedAt: null }).sort({ startedAt: -1 }).toArray(),
  ]);
  const latestBy = (records, field) => {
    const result = new Map();
    for (const record of records) if (!result.has(String(record[field]))) result.set(String(record[field]), record);
    return result;
  };
  const sessionByTrip = latestBy(sessions, "tripId");
  const stopBySession = latestBy(stops, "sessionId");
  const collection = db.collection("mobileoperationalalerts");
  const operations = [];
  for (const trip of trips) {
    const session = sessionByTrip.get(String(trip._id));
    const alerts = exceptionsForTrip(trip, session, now, stopBySession.get(String(session?._id)));
    const base = { companyId: trip.companyId, tripId: trip._id, state: { $in: ["open", "acknowledged"] } };
    for (const { kind, severity, message } of alerts) operations.push({ updateOne: {
      filter: { ...base, kind },
      update: { $set: { severity, message, lastDetectedAt: now, updatedAt: now }, $setOnInsert: { state: "open", firstDetectedAt: now, createdAt: now } },
      upsert: true,
    } });
    const cleared = ["tracking_missing", "tracking_stale", "stop_unconfirmed"].filter((kind) => !alerts.some((alert) => alert.kind === kind));
    if (cleared.length) operations.push({ updateMany: {
      filter: { ...base, kind: { $in: cleared } },
      update: { $set: { state: "resolved", resolvedAt: now, updatedAt: now, resolutionNote: "Condition cleared automatically." } },
    } });
  }
  if (operations.length) await collection.bulkWrite(operations);
}
