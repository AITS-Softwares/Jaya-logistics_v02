import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverDevice from "@/models/DriverDevice";
import { createMobileSession, requireMobileAuth } from "@/lib/driverMobileAuth";
import { hashSecret } from "@/lib/driverMobileCore.mjs";

export async function POST(req) {
  const auth = await requireMobileAuth(req, { requireDevice: false });
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    const installationId = String(body.installationId || "");
    if (installationId.length < 24 || installationId.length > 300) {
      return NextResponse.json({ success: false, code: "INVALID_DEVICE", message: "A valid app installation ID is required." }, { status: 400 });
    }
    await dbConnect();
    const installationIdHash = hashSecret(installationId);
    let device = await DriverDevice.findOne({ companyId: auth.driver.companyId, installationIdHash }).select("+installationIdHash");
    if (device && String(device.driverId) !== String(auth.driver._id)) {
      return NextResponse.json({ success: false, code: "DEVICE_ASSIGNED", message: "This device is already registered to another driver." }, { status: 409 });
    }
    if (!device) {
      device = await DriverDevice.create({
        companyId: auth.driver.companyId,
        driverId: auth.driver._id,
        installationIdHash,
        platform: "android",
        manufacturer: String(body.manufacturer || "").slice(0, 80),
        model: String(body.model || "").slice(0, 120),
        appVersion: String(body.appVersion || "").slice(0, 40),
        status: "pending",
        lastSeenAt: new Date(),
      });
    } else {
      device.manufacturer = String(body.manufacturer || device.manufacturer || "").slice(0, 80);
      device.model = String(body.model || device.model || "").slice(0, 120);
      device.appVersion = String(body.appVersion || device.appVersion || "").slice(0, 40);
      device.lastSeenAt = new Date();
      await device.save();
    }
    const session = await createMobileSession({ companyId: auth.driver.companyId, driverId: auth.driver._id, deviceId: device._id });
    await auth.session.updateOne({ $set: { revokedAt: new Date(), revokeReason: "device_registered" } });
    return NextResponse.json({
      success: true,
      data: {
        deviceId: String(device._id),
        deviceStatus: device.status,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresInSeconds: session.expiresInSeconds,
      },
    }, { status: device.status === "approved" ? 200 : 202 });
  } catch (error) {
    console.error("mobile device registration:", error.message);
    return NextResponse.json({ success: false, code: "DEVICE_REGISTRATION_FAILED", message: "Unable to register this device." }, { status: 500 });
  }
}
