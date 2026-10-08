import crypto from "node:crypto";

export const DRIVER_TRIP_STATES = [
  "assigned", "started", "at_pickup", "in_transit", "at_stop", "delivered", "completed", "cancelled",
];

export const DRIVER_ACTIONS = {
  ACKNOWLEDGE: { eventType: "trip_acknowledged" },
  START_TRIP: { from: ["assigned"], to: "started", eventType: "trip_started" },
  AT_PICKUP: { from: ["started", "in_transit"], to: "at_pickup", eventType: "pickup_arrived" },
  DEPART: { from: ["started", "at_pickup", "at_stop"], to: "in_transit", eventType: "in_transit" },
  ARRIVE_STOP: { from: ["in_transit"], to: "at_stop", eventType: "stop_arrived" },
  DELIVER: { from: ["in_transit", "at_stop"], to: "delivered", eventType: "delivery_confirmed" },
  COMPLETE: { from: ["delivered"], to: "completed", eventType: "trip_completed" },
  REPORT_ISSUE: { eventType: "issue_reported" },
};

export function normalizeDriverMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return "";
}

export function hashSecret(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function createOpaqueToken() {
  return crypto.randomBytes(48).toString("base64url");
}

export function createIdempotencyKey() {
  return crypto.randomUUID();
}

export function getActionDefinition(action) {
  return DRIVER_ACTIONS[String(action || "").toUpperCase()] || null;
}

export function canApplyDriverAction(state, action) {
  const definition = getActionDefinition(action);
  if (!definition) return false;
  return !definition.from || definition.from.includes(state);
}

export function driverActionNamesForState(state) {
  return Object.entries(DRIVER_ACTIONS)
    .filter(([, definition]) => !definition.from || definition.from.includes(state))
    .map(([action]) => action);
}

export function driverSafeTripDto(trip) {
  const plain = typeof trip?.toObject === "function" ? trip.toObject() : (trip || {});
  return {
    id: String(plain._id || plain.id || ""),
    loadingReference: plain.loadingReference || "",
    lrNumbers: plain.lrNumbers || [],
    state: plain.state,
    vehicle: plain.vehicle || {},
    stops: (plain.routeSnapshot?.stops || []).map((stop) => ({
      sequence: stop.sequence,
      type: stop.type,
      label: stop.label,
      address: stop.address,
      city: stop.city || "",
      pinCode: stop.pinCode || "",
      status: stop.status || "pending",
    })),
    nextStopIndex: plain.nextStopIndex || 0,
    startedAt: plain.startedAt || null,
    completedAt: plain.completedAt || null,
    issueStatus: plain.issueStatus || null,
    version: plain.version || 0,
    allowedActions: driverActionNamesForState(plain.state),
  };
}
