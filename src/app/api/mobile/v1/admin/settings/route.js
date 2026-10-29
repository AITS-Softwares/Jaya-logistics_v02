import { withBranchAccess } from '@/lib/branchAccess';
import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireDriverMobileSettingsStaff } from "@/lib/driverMobileStaff";
import { encryptDriverMobileSecret, getDriverMobileConfig, normalisePilotMobiles, publicDriverMobileConfig } from "@/lib/driverMobileConfig";
import DriverMobileConfig from "@/models/DriverMobileConfig";
import dbConnect from "@/lib/db";

async function branchHandlerGET(req) {
  const staff = requireDriverMobileSettingsStaff(req);
  if (staff.error) return staff.error;
  const config = await getDriverMobileConfig(staff.user.companyId, { includeSecret: true });
  return NextResponse.json({ success: true, data: publicDriverMobileConfig(config) });
}

async function branchHandlerPUT(req) {
  const staff = requireDriverMobileSettingsStaff(req, "edit");
  if (staff.error) return staff.error;
  try {
    const body = await req.json();
    const enabled = body.enabled === true;
    const rolloutMode = body.rolloutMode === "production" ? "production" : "pilot";
    const pilotMobiles = normalisePilotMobiles(body.pilotMobiles);
    const movingIntervalSec = Number(body.movingIntervalSec || 30);
    const minDistanceM = Number(body.minDistanceM || 100);
    if (enabled && rolloutMode === "pilot" && !pilotMobiles.length) return NextResponse.json({ success: false, message: "Add at least one pilot mobile number before enabling pilot mode." }, { status: 400 });
    if (movingIntervalSec < 15 || movingIntervalSec > 300 || minDistanceM < 25 || minDistanceM > 2000) return NextResponse.json({ success: false, message: "Tracking policy is outside the allowed range." }, { status: 400 });
    await dbConnect();
    const config = await DriverMobileConfig.findOne({ companyId: staff.user.companyId }).select("+encryptedJwtSecret");
    const secret = String(body.newJwtSecret || "").trim();
    if (!config && !secret) return NextResponse.json({ success: false, message: "Create a mobile signing secret before saving settings." }, { status: 400 });
    if (secret && secret.length < 32) return NextResponse.json({ success: false, message: "The mobile signing secret must be at least 32 characters." }, { status: 400 });
    if (enabled && !secret && !config?.encryptedJwtSecret) return NextResponse.json({ success: false, message: "A mobile signing secret is required before enabling access." }, { status: 400 });
    const target = config || new DriverMobileConfig({ companyId: staff.user.companyId });
    const rotated = Boolean(secret);
    target.enabled = enabled; target.rolloutMode = rolloutMode; target.pilotMobiles = pilotMobiles;
    target.movingIntervalSec = movingIntervalSec; target.minDistanceM = minDistanceM;
    if (rotated) target.encryptedJwtSecret = encryptDriverMobileSecret(secret);
    target.audit.push({ action: rotated ? "settings_saved_secret_rotated" : "settings_saved", by: staff.user.id, details: `enabled=${enabled}; rollout=${rolloutMode}; pilots=${pilotMobiles.length}` });
    await target.save();
    return NextResponse.json({ success: true, data: publicDriverMobileConfig(target) });
  } catch (error) {
    console.error("driver mobile settings:", error.message);
    return NextResponse.json({ success: false, message: "Unable to save driver mobile settings." }, { status: 500 });
  }
}

async function branchHandlerPOST(req) {
  const staff = requireDriverMobileSettingsStaff(req, "edit");
  if (staff.error) return staff.error;
  const generated = crypto.randomBytes(48).toString("base64url");
  return NextResponse.json({ success: true, data: { generatedSecret: generated } });
}

export const GET = withBranchAccess(branchHandlerGET);
export const PUT = withBranchAccess(branchHandlerPUT);
export const POST = withBranchAccess(branchHandlerPOST);
