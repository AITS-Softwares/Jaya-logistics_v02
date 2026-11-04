export const LIVE_TRACKING_STALE_AFTER_MS = 10 * 60 * 1000;

export function liveTrackingStatus(session, point, now = new Date()) {
  if (!session) return "not_started";
  if (session.state === "ended") return "ended";
  const lastAt = point?.recordedAt || session.lastRecordedAt;
  const health = session.deviceHealth;
  const healthAge = health?.reportedAt ? now - new Date(health.reportedAt) : null;
  const overnight = health?.samplingMode === "overnight" && health.locationReady && healthAge !== null && healthAge < 2 * 60000;
  if (!lastAt || now.getTime() - new Date(lastAt).getTime() > (overnight ? 20 * 60000 : LIVE_TRACKING_STALE_AFTER_MS) || (healthAge !== null && healthAge < 2 * 60000 && !health.locationReady)) return "stale";
  return session.state;
}
