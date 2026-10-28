import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import PushSubscription from "@/models/PushSubscription";

export const runtime = "nodejs";

function getAuthenticatedUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const user = verifyJWT(token);
  if (!user?.id || !user?.companyId || !["user", "company"].includes(user.type)) return null;
  return user;
}

function isTrustedPushEndpoint(endpoint) {
  try {
    const hostname = new URL(endpoint).hostname.toLowerCase();
    return ["fcm.googleapis.com", "push.services.mozilla.com", "web.push.apple.com", "notify.windows.com"]
      .some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export async function POST(req) {
  const user = getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ message: "Authentication required" }, { status: 401 });

  try {
    const body = await req.json();
    const sub = body?.subscription;
    if (
      typeof sub?.endpoint !== "string" || !isTrustedPushEndpoint(sub.endpoint) ||
      typeof sub?.keys?.p256dh !== "string" || typeof sub?.keys?.auth !== "string"
    ) {
      return NextResponse.json({ message: "A valid browser push subscription is required" }, { status: 400 });
    }

    await connectDB();
    await PushSubscription.findOneAndUpdate(
      { endpoint: sub.endpoint },
      {
        $set: {
          user: user.id,
          company: user.companyId,
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          expirationTime: sub.expirationTime ? new Date(sub.expirationTime) : null,
          userAgent: String(req.headers.get("user-agent") || "").slice(0, 500),
          lastUsedAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Push subscription save failed:", error);
    return NextResponse.json({ message: "Could not save notification subscription" }, { status: 500 });
  }
}

export async function DELETE(req) {
  const user = getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ message: "Authentication required" }, { status: 401 });

  try {
    const body = await req.json();
    if (typeof body?.endpoint !== "string" || !isTrustedPushEndpoint(body.endpoint)) {
      return NextResponse.json({ message: "A valid subscription endpoint is required" }, { status: 400 });
    }
    await connectDB();
    await PushSubscription.deleteOne({ endpoint: body.endpoint, user: user.id, company: user.companyId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscription removal failed:", error);
    return NextResponse.json({ message: "Could not remove notification subscription" }, { status: 500 });
  }
}
