import assert from "node:assert/strict";
import { TRACKING_POLICY, validateLocationPoint } from "../src/lib/driverTracking.js";

const now = new Date().toISOString();
const valid = validateLocationPoint({
  sequence: 1,
  idempotencyKey: "11111111-2222-3333-4444-555555555555",
  latitude: 19.076,
  longitude: 72.8777,
  accuracyM: 12,
  speedMps: 16.5,
  bearingDeg: 180,
  recordedAt: now,
  batteryPct: 80,
});
assert.equal(valid.error, undefined);
assert.equal(valid.value.latitude, 19.076);
assert.equal(validateLocationPoint({ ...valid.value, latitude: 95 }).error, "Coordinates are invalid.");
assert.equal(validateLocationPoint({ ...valid.value, accuracyM: 10001 }).error, "Location accuracy is invalid.");
assert.equal(validateLocationPoint({ ...valid.value, sequence: 0 }).error, "Location sequence is invalid.");
assert.equal(validateLocationPoint({ ...valid.value, idempotencyKey: "short" }).error, "Location idempotency key is invalid.");
assert.equal(TRACKING_POLICY.maximumBatchPoints, 100);
assert.equal(TRACKING_POLICY.rawPointRetentionDays, 90);
console.log("Driver mobile Phase 4 tracking validation tests passed.");
