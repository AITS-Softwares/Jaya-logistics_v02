export const STOP_INTELLIGENCE_POLICY = {
  minimumStopSeconds: 10 * 60,
  stationarySpeedMps: 1,
  stopRadiusM: 120,
  overnightSeconds: 6 * 60 * 60,
};

function distanceM(left, right) {
  const rad = (value) => value * Math.PI / 180;
  const earthM = 6371000;
  const dLat = rad(right.latitude - left.latitude);
  const dLng = rad(right.longitude - left.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(left.latitude)) * Math.cos(rad(right.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthM * Math.asin(Math.sqrt(a));
}

// Points must be chronological. This intentionally detects only a stationary
// episode; it never assumes that a stop equals delivery or alters route state.
export function deriveStopEpisode(points = []) {
  if (points.length < 2) return null;
  const ordered = [...points].sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
  const latest = ordered.at(-1);
  if ((latest.speedMps ?? Number.POSITIVE_INFINITY) > STOP_INTELLIGENCE_POLICY.stationarySpeedMps) return null;
  let startIndex = ordered.length - 1;
  for (let index = ordered.length - 2; index >= 0; index -= 1) {
    const point = ordered[index];
    if ((point.speedMps ?? Number.POSITIVE_INFINITY) > STOP_INTELLIGENCE_POLICY.stationarySpeedMps || distanceM(point, latest) > STOP_INTELLIGENCE_POLICY.stopRadiusM) break;
    startIndex = index;
  }
  const startedAt = new Date(ordered[startIndex].recordedAt);
  const endedAt = new Date(latest.recordedAt);
  const durationSec = Math.floor((endedAt - startedAt) / 1000);
  if (durationSec < STOP_INTELLIGENCE_POLICY.minimumStopSeconds) return null;
  const stationary = ordered.slice(startIndex);
  const centre = {
    latitude: stationary.reduce((sum, point) => sum + point.latitude, 0) / stationary.length,
    longitude: stationary.reduce((sum, point) => sum + point.longitude, 0) / stationary.length,
  };
  const accuracy = stationary.reduce((sum, point) => sum + (point.accuracyM || 0), 0) / stationary.length;
  return {
    startedAt, endedAt, durationSec, centre,
    classification: durationSec >= STOP_INTELLIGENCE_POLICY.overnightSeconds ? "overnight" : "unknown",
    confidence: Math.max(0.2, Math.min(0.95, stationary.length / 8 * 0.6 + (accuracy <= 100 ? 0.3 : 0))),
  };
}

export function etaGuard(routeBaseline) {
  if (!routeBaseline?.distanceKm || !routeBaseline?.durationMinutes) return { status: "baseline_required", message: "An approved route distance and duration baseline is required before showing delivery ETA." };
  return { status: "available", message: "ETA baseline is available; route recalculation remains dispatcher-controlled." };
}
