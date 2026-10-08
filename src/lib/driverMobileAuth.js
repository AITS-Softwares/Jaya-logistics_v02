import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverProfile from "@/models/DriverProfile";
import DriverDevice from "@/models/DriverDevice";
import DriverMobileSession from "@/models/DriverMobileSession";
import { createOpaqueToken, hashSecret } from "@/lib/driverMobileCore.mjs";
import { driverMobileRolloutMode, isDriverAllowedInRollout, pilotMobileAllowList } from "@/lib/driverRollout.mjs";

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function isDriverMobileEnabled() {
  return process.env.DRIVER_MOBILE_ENABLED === "true";
}

export function mobileRolloutMode() {
  return driverMobileRolloutMode(process.env.DRIVER_MOBILE_ROLLOUT_MODE);
}

export function isDriverAllowedForMobileRollout(mobile) {
  return isDriverAllowedInRollout(mobile, mobileRolloutMode(), pilotMobileAllowList(process.env.DRIVER_MOBILE_PILOT_MOBILES));
}

function secret() {
  const value = process.env.DRIVER_MOBILE_JWT_SECRET || process.env.JWT_SECRET;
  if (!value) throw new Error("Driver mobile authentication is not configured");
  return value;
}

export function mobileUnavailableResponse() {
  return NextResponse.json({ success: false, code: "MOBILE_DISABLED", message: "Driver mobile access is not enabled." }, { status: 503 });
}

export function mobileError(message, status = 401, code = "UNAUTHORIZED") {
  return NextResponse.json({ success: false, code, message }, { status });
}

function tokenFromRequest(req) {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

function signAccess(session) {
  return jwt.sign({
    aud: "driver-mobile",
    sub: String(session.driverId),
    companyId: String(session.companyId),
    deviceId: session.deviceId ? String(session.deviceId) : null,
    sessionId: String(session._id),
  }, secret(), { expiresIn: ACCESS_TTL_SECONDS, issuer: "jaya-logistics" });
}

export async function createMobileSession({ companyId, driverId, deviceId = null, familyId = createOpaqueToken() }) {
  const refreshToken = createOpaqueToken();
  const session = await DriverMobileSession.create({
    companyId,
    driverId,
    deviceId,
    familyId,
    refreshTokenHash: hashSecret(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    lastUsedAt: new Date(),
  });
  return {
    accessToken: signAccess(session),
    refreshToken,
    expiresInSeconds: ACCESS_TTL_SECONDS,
    session,
  };
}

export async function rotateMobileSession(refreshToken) {
  if (!refreshToken) return null;
  const session = await DriverMobileSession.findOne({ refreshTokenHash: hashSecret(refreshToken) }).select("+refreshTokenHash");
  if (!session) return null;
  if (session.revokedAt || session.expiresAt <= new Date()) {
    // Reuse of a token that has already been rotated is a strong compromise
    // signal. Revoke its complete token family rather than leaving the latest
    // token usable.
    if (session.revokeReason === "rotated") {
      await DriverMobileSession.updateMany({ familyId: session.familyId, revokedAt: null }, { $set: { revokedAt: new Date(), revokeReason: "refresh_reuse_detected" } });
    }
    return null;
  }
  const [driver, device] = await Promise.all([
    DriverProfile.findOne({ _id: session.driverId, companyId: session.companyId, status: "active" }),
    session.deviceId ? DriverDevice.findOne({ _id: session.deviceId, companyId: session.companyId, status: "approved" }) : null,
  ]);
  if (!driver || (session.deviceId && !device)) {
    session.revokedAt = new Date();
    session.revokeReason = "identity_or_device_inactive";
    await session.save();
    return null;
  }
  if (!isDriverAllowedForMobileRollout(driver.mobileE164)) return null;
  session.revokedAt = new Date();
  session.revokeReason = "rotated";
  await session.save();
  return createMobileSession({ companyId: session.companyId, driverId: session.driverId, deviceId: session.deviceId, familyId: session.familyId });
}

export async function requireMobileAuth(req, { requireDevice = true } = {}) {
  if (!isDriverMobileEnabled()) return { error: mobileUnavailableResponse() };
  const token = tokenFromRequest(req);
  if (!token) return { error: mobileError("A driver access token is required.") };
  let payload;
  try {
    payload = jwt.verify(token, secret(), { audience: "driver-mobile", issuer: "jaya-logistics" });
  } catch {
    return { error: mobileError("The driver access token is invalid or expired.") };
  }
  await dbConnect();
  const session = await DriverMobileSession.findOne({ _id: payload.sessionId, companyId: payload.companyId, driverId: payload.sub });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return { error: mobileError("The driver session is no longer active.") };
  const driver = await DriverProfile.findOne({ _id: payload.sub, companyId: payload.companyId, status: "active" });
  if (!driver) return { error: mobileError("The driver account is not active.", 403, "DRIVER_INACTIVE") };
  if (!isDriverAllowedForMobileRollout(driver.mobileE164)) return { error: mobileError("Mobile pilot access is not enabled for this driver.", 403, "PILOT_NOT_ENROLLED") };
  let device = null;
  if (payload.deviceId) {
    device = await DriverDevice.findOne({ _id: payload.deviceId, companyId: payload.companyId, driverId: payload.sub });
  }
  if (requireDevice) {
    if (!payload.deviceId || String(session.deviceId || "") !== String(payload.deviceId)) return { error: mobileError("An approved driver device is required.", 403, "DEVICE_REQUIRED") };
    if (!device || device.status !== "approved") return { error: mobileError("This device is not approved.", 403, "DEVICE_NOT_APPROVED") };
    await DriverDevice.updateOne({ _id: device._id }, { $set: { lastSeenAt: new Date() } });
  }
  await DriverMobileSession.updateOne({ _id: session._id }, { $set: { lastUsedAt: new Date() } });
  return { payload, session, driver, device };
}

export async function validateDriverPin(driver, pin) {
  if (!driver?.pinHash || !pin) return false;
  return bcrypt.compare(String(pin), driver.pinHash);
}

export async function revokeDriverSessions({ companyId, driverId, reason, exceptSessionId = null }) {
  const query = { companyId, driverId, revokedAt: null };
  if (exceptSessionId) query._id = { $ne: exceptSessionId };
  await DriverMobileSession.updateMany(query, { $set: { revokedAt: new Date(), revokeReason: reason } });
}
