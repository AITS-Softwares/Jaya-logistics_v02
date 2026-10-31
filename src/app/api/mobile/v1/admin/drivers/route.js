import { withBranchAccess } from '@/lib/branchAccess';
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DriverProfile from "@/models/DriverProfile";
import { isDriverMobileEnabled, mobileUnavailableResponse } from "@/lib/driverMobileAuth";
import { requireDriverAccessMasterStaff, requireDriverMobileStaff } from "@/lib/driverMobileStaff";
import { normalizeDriverMobile } from "@/lib/driverMobileCore.mjs";

async function branchHandlerGET(req) {
  if (!(await isDriverMobileEnabled())) return mobileUnavailableResponse();
  const staff = requireDriverAccessMasterStaff(req);
  if (staff.error) return staff.error;
  await dbConnect();
  const drivers = await DriverProfile.find({ companyId: staff.user.companyId }).select("-pinHash").sort({ displayName: 1 }).lean();
  return NextResponse.json({ success: true, data: drivers.map((driver) => ({
    id: String(driver._id),
    displayName: driver.displayName,
    mobileE164: driver.mobileE164,
    licenseNumber: driver.licenseNumber || "",
    status: driver.status,
    mobileAccessStatus: driver.mobileAccessStatus || "not_registered",
    mobileAccessEnabled: driver.mobileAccessEnabled === true,
    lastReleasedMobile: driver.mobileHistory?.length ? driver.mobileHistory[driver.mobileHistory.length - 1].mobileE164 : "",
    passwordChangeRequired: driver.passwordChangeRequired === true,
    registrationStatus: driver.registrationStatus || "draft",
    lastOperationalSource: driver.lastOperationalSource || "",
    lastOperationalReference: driver.lastOperationalReference || "",
    preferredLanguage: driver.preferredLanguage,
    createdAt: driver.createdAt,
  })) });
}

async function branchHandlerPOST(req) {
  if (!(await isDriverMobileEnabled())) return mobileUnavailableResponse();
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
      licenseNumber: String(body.licenseNumber || "").trim().replace(/\s+/g, " ").toUpperCase().slice(0, 80),
      registrationStatus: "registered",
      preferredLanguage: String(body.preferredLanguage || "en").slice(0, 12),
      consentVersion: String(body.consentVersion || "").slice(0, 60),
      passwordSetAt: new Date(),
      createdBy: staff.user.id,
    });
    return NextResponse.json({ success: true, data: { id: String(driver._id), displayName: driver.displayName, mobileE164: driver.mobileE164, status: driver.status } }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) return NextResponse.json({ success: false, code: "DUPLICATE_MOBILE", message: "A driver with this mobile number already exists." }, { status: 409 });
    console.error("mobile admin driver create:", error.message);
    return NextResponse.json({ success: false, code: "DRIVER_CREATE_FAILED", message: "Unable to create driver." }, { status: 500 });
  }
}

export const GET = withBranchAccess(branchHandlerGET);
export const POST = withBranchAccess(branchHandlerPOST);
