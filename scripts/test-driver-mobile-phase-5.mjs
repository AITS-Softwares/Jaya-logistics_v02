import assert from "node:assert/strict";
import { LIVE_TRACKING_STALE_AFTER_MS, liveTrackingStatus } from "../src/lib/driverLiveTracking.mjs";

const now = new Date("2026-10-07T12:00:00.000Z");
assert.equal(liveTrackingStatus(null, null, now), "not_started");
assert.equal(liveTrackingStatus({ state: "ended", lastRecordedAt: now }, null, now), "ended");
assert.equal(liveTrackingStatus({ state: "active", lastRecordedAt: new Date(now - LIVE_TRACKING_STALE_AFTER_MS - 1) }, null, now), "stale");
assert.equal(liveTrackingStatus({ state: "active", lastRecordedAt: new Date(now - LIVE_TRACKING_STALE_AFTER_MS) }, null, now), "active");
assert.equal(liveTrackingStatus({ state: "active", lastRecordedAt: null }, { recordedAt: new Date(now - 30_000) }, now), "active");
const overnight = { state: "active", lastRecordedAt: new Date(now - 15 * 60000), deviceHealth: { samplingMode: "overnight", locationReady: true, reportedAt: now } };
assert.equal(liveTrackingStatus(overnight, null, now), "active");
assert.equal(liveTrackingStatus({ ...overnight, deviceHealth: { ...overnight.deviceHealth, reportedAt: new Date(now - 3 * 60000) } }, null, now), "stale");
assert.equal(liveTrackingStatus({ ...overnight, lastRecordedAt: now, deviceHealth: { ...overnight.deviceHealth, locationReady: false } }, null, now), "stale");
console.log("Driver mobile Phase 5 live-tracking status tests passed.");
