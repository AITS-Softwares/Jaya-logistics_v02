import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverProfile from "@/models/DriverProfile";
import { isDriverMobileEnabled, mobileUnavailableResponse } from "@/lib/driverMobileAuth";
import { requireDriverMobileStaff } from "@/lib/driverMobileStaff";
import { normalizeDriverMobile } from "@/lib/driverMobileCore.mjs";

export async function GET(req) {
  if (!isDriverMobileEnabled()) return mobileUnavailableResponse();
  const staff = requireDriverMobileStaff(req);
  if (staff.error) return staff.error;
  await dbConnect();
  const drivers = await DriverProfile.find({ companyId: staff.user.companyId }).select("-pinHash").sort({ displayName: 1 }).lean();
  return NextResponse.json({ success: true, data: drivers.map((driver) => ({ id: String(driver._id), displayName: driver.displayName, mobileE164: driver.mobileE164, status: driver.status, preferredLanguage: driver.preferredLanguage, createdAt: driver.createdAt })) });
}

export async function POST(req) {
  if (!isDriverMobileEnabled()) return mobileUnavailableResponse();
  const staff = requireDriverMobileStaff(req, "edit");
  if (staff.error) return staff.error;
  try {
    const body = await req.json();
    const displayName = String(body.displayName || "").trim();
    const mobileE164 = normalizeDriverMobile(body.mobile);
    const pin = String(body.pin || "");
    if (!displayName || !mobileE164 || pin.length < 4 || pin.length > 32) return NextResponse.json({ success: false, code: "INVALID_DRIVER", message: "Name, mobile number, and a 4-32 character PIN are required." }, { status: 400 });
    await dbConnect();
    const driver = await DriverProfile.create({
      companyId: staff.user.companyId,
      displayName,
      mobileE164,
      pinHash: await bcrypt.hash(pin, 12),
      employeeOrVendorRef: String(body.employeeOrVendorRef || "").slice(0, 120),
      preferredLanguage: String(body.preferredLanguage || "en").slice(0, 12),
      consentVersion: String(body.consentVersion || "").slice(0, 60),
      createdBy: staff.user.id,
    });
    return NextResponse.json({ success: true, data: { id: String(driver._id), displayName: driver.displayName, mobileE164: driver.mobileE164, status: driver.status } }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) return NextResponse.json({ success: false, code: "DUPLICATE_MOBILE", message: "A driver with this mobile number already exists." }, { status: 409 });
    console.error("mobile admin driver create:", error.message);
    return NextResponse.json({ success: false, code: "DRIVER_CREATE_FAILED", message: "Unable to create driver." }, { status: 500 });
  }
}
