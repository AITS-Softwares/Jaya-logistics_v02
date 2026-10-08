import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import MobileOperationalAlert from "@/models/MobileOperationalAlert";
import { isDriverMobileEnabled, mobileUnavailableResponse } from "@/lib/driverMobileAuth";
import { requireDriverMobileStaff } from "@/lib/driverMobileStaff";

export async function PATCH(req, { params }) {
  if (!isDriverMobileEnabled()) return mobileUnavailableResponse();
  const staff = requireDriverMobileStaff(req, "edit");
  if (staff.error) return staff.error;
  const { alertId } = await params;
  if (!mongoose.isValidObjectId(alertId)) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Alert not found." }, { status: 404 });
  try {
    const { action, note } = await req.json();
    if (!['acknowledge', 'resolve'].includes(action)) return NextResponse.json({ success: false, code: "INVALID_ACTION", message: "Use acknowledge or resolve." }, { status: 400 });
    const cleanNote = String(note || "").trim().slice(0, 500);
    if (action === "resolve" && !cleanNote) return NextResponse.json({ success: false, code: "RESOLUTION_NOTE_REQUIRED", message: "A resolution note is required." }, { status: 400 });
    await dbConnect();
    const alert = await MobileOperationalAlert.findOne({ _id: alertId, companyId: staff.user.companyId });
    if (!alert) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Alert not found." }, { status: 404 });
    const now = new Date();
    if (action === "acknowledge") { alert.state = "acknowledged"; alert.acknowledgedAt = now; alert.acknowledgedBy = staff.user.id; }
    else { alert.state = "resolved"; alert.resolvedAt = now; alert.resolvedBy = staff.user.id; alert.resolutionNote = cleanNote; }
    await alert.save();
    return NextResponse.json({ success: true, data: { id: String(alert._id), state: alert.state } });
  } catch (error) {
    console.error("mobile operational alert update:", error.message);
    return NextResponse.json({ success: false, code: "ALERT_UPDATE_FAILED", message: "Unable to update this alert." }, { status: 500 });
  }
}
