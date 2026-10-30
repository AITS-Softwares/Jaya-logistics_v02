import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverDevice from "@/models/DriverDevice";
import { requireMobileAuth } from "@/lib/driverMobileAuth";

// Metadata is display-only. Never collect IMEI, serial, contacts, or other
// sensitive device identifiers.
export async function POST(req) {
  const auth = await requireMobileAuth(req, { requireDevice: false });
  if (auth.error) return auth.error;
  if (!auth.session.deviceId) return NextResponse.json({ success: true, data: { updated: false } });
  try {
    const body = await req.json();
    await dbConnect();
    const device = await DriverDevice.findOne({ _id: auth.session.deviceId, companyId: auth.driver.companyId, driverId: auth.driver._id });
    if (!device) return NextResponse.json({ success: false, code: "DEVICE_NOT_FOUND", message: "Phone registration was not found." }, { status: 404 });
    device.manufacturer = String(body.manufacturer || device.manufacturer || "").slice(0, 80);
    device.model = String(body.model || device.model || "").slice(0, 120);
    device.appVersion = String(body.appVersion || device.appVersion || "").slice(0, 40);
    device.lastSeenAt = new Date();
    await device.save();
    return NextResponse.json({ success: true, data: { updated: true } });
  } catch (error) {
    console.error("mobile device metadata:", error.message);
    return NextResponse.json({ success: false, code: "DEVICE_METADATA_FAILED", message: "Unable to update phone information." }, { status: 500 });
  }
}
