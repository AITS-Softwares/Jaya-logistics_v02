import assert from "node:assert/strict";
import { deriveStopEpisode, etaGuard } from "../src/lib/driverStopIntelligence.mjs";

const origin = { latitude: 19.076, longitude: 72.8777, accuracyM: 20, speedMps: 0 };
const points = [0, 5, 11].map((minutes) => ({ ...origin, recordedAt: new Date(`2026-10-07T12:${String(minutes).padStart(2, "0")}:00.000Z`) }));
const episode = deriveStopEpisode(points);
assert.ok(episode);
assert.equal(episode.durationSec, 660);
assert.equal(episode.classification, "unknown");
assert.equal(deriveStopEpisode([{ ...origin, speedMps: 5, recordedAt: new Date() }, { ...origin, speedMps: 5, recordedAt: new Date(Date.now() + 660000) }]), null);
assert.equal(etaGuard(null).status, "baseline_required");
assert.equal(etaGuard({ distanceKm: 100, durationMinutes: 180 }).status, "available");
console.log("Driver mobile Phase 11 stop and ETA guard tests passed.");
