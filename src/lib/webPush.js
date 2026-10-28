import webpush from "web-push";
import PushSubscription from "@/models/PushSubscription";

let configured = false;

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || "";
}

export function isWebPushConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
}

function buildSafePayload(payload = {}) {
  const title = typeof payload.title === "string" ? payload.title.slice(0, 80) : "Jaya Logistics ERP";
  const body = typeof payload.body === "string" ? payload.body.slice(0, 180) : "There is an update ready for you.";
  const candidateUrl = typeof payload.url === "string" ? payload.url : "/admin";
  const url = candidateUrl.startsWith("/") && !candidateUrl.startsWith("//") ? candidateUrl.slice(0, 500) : "/admin";
  const tag = typeof payload.tag === "string" ? payload.tag.slice(0, 80) : undefined;
  return { title, body, url, ...(tag ? { tag } : {}) };
}

function configureWebPush() {
  if (!isWebPushConfigured()) throw new Error("Web Push is not configured");
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  configured = true;
}

/** Send a reviewed, non-sensitive push payload to explicit users in one company. */
export async function sendWebPushToUsers({ userIds, companyId, payload }) {
  if (!isWebPushConfigured()) return { sent: 0, failed: 0, skipped: true };
  if (!Array.isArray(userIds) || !userIds.length || !companyId) {
    return { sent: 0, failed: 0, skipped: false };
  }

  configureWebPush();
  const safePayload = buildSafePayload(payload);
  const subscriptions = await PushSubscription.find({
    company: companyId,
    user: { $in: userIds },
  }).lean();

  const results = await Promise.allSettled(subscriptions.map(async (record) => {
    try {
      await webpush.sendNotification(
        { endpoint: record.endpoint, keys: record.keys, expirationTime: record.expirationTime?.getTime() || null },
        JSON.stringify(safePayload),
        { TTL: 60 * 60 }
      );
      await PushSubscription.updateOne({ _id: record._id }, { $set: { lastUsedAt: new Date() } });
      return "sent";
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await PushSubscription.deleteOne({ _id: record._id });
      }
      throw error;
    }
  }));

  return {
    sent: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
    skipped: false,
  };
}
