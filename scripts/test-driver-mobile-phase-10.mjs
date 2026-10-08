import assert from "node:assert/strict";
import { LIVE_TRACKING_STALE_AFTER_MS } from "../src/lib/driverLiveTracking.mjs";
import { exceptionsForTrip } from "../src/lib/driverOperationalAlerts.mjs";

const now = new Date("2026-10-07T12:00:00.000Z");
assert.deepEqual(exceptionsForTrip({ state: "assigned" }, null, now), []);
assert.equal(exceptionsForTrip({ state: "in_transit" }, null, now)[0].kind, "tracking_missing");
assert.equal(exceptionsForTrip({ state: "in_transit" }, null, now)[0].severity, "high");
assert.deepEqual(exceptionsForTrip({ state: "started" }, { state: "active", lastRecordedAt: new Date(now - 30_000) }, now), []);
assert.equal(exceptionsForTrip({ state: "started" }, { state: "active", lastRecordedAt: new Date(now - LIVE_TRACKING_STALE_AFTER_MS - 1) }, now)[0].kind, "tracking_stale");
const issue = exceptionsForTrip({ state: "at_stop", issueStatus: "breakdown" }, { state: "active", lastRecordedAt: new Date(now - 30_000) }, now);
assert.equal(issue.length, 1);
assert.equal(issue[0].kind, "driver_issue");
console.log("Driver mobile Phase 10 operational-alert tests passed.");
