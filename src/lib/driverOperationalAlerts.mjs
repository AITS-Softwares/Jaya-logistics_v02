import { liveTrackingStatus } from "./driverLiveTracking.mjs";

const TRACKING_EXPECTED_STATES = new Set(["started", "at_pickup", "in_transit", "at_stop", "delivered"]);

export function exceptionsForTrip(trip, session, now = new Date()) {
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
  return alerts;
}
