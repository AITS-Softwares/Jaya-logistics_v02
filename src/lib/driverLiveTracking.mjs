export const LIVE_TRACKING_STALE_AFTER_MS = 10 * 60 * 1000;

export function liveTrackingStatus(session, point, now = new Date()) {
  if (!session) return "not_started";
  if (session.state === "ended") return "ended";
  const lastAt = point?.recordedAt || session.lastRecordedAt;
  if (!lastAt || now.getTime() - new Date(lastAt).getTime() > LIVE_TRACKING_STALE_AFTER_MS) return "stale";
  return session.state;
}
