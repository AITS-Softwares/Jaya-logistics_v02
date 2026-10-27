import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { withAuth } from "@/lib/auth";
import SubCompany from "@/models/SubCompany";
import {
  getOperatingCompanyFrappeConfig,
  isFrappeAccountingSyncEnabled,
} from "@/lib/frappe-company-config.mjs";
import { isFrappeConfigured } from "@/lib/frappe-client.mjs";

export const runtime = "nodejs";

function maskGstin(value) {
  const gstin = String(value || "").trim().toUpperCase();
  if (!gstin) return "";
  if (gstin.length <= 5) return "•".repeat(gstin.length);
  return `${gstin.slice(0, 2)}••••••••••${gstin.slice(-3)}`;
}

function safeMappingStatus(operatingCompany, purpose) {
  try {
    const config = getOperatingCompanyFrappeConfig(operatingCompany, { purpose });
    const enabled = Boolean(config.accountingSyncEnabled && config.enabled);

    return {
      purpose,
      configured: true,
      ready: enabled,
      globalExportEnabled: config.accountingSyncEnabled,
      operatingCompanyPilotEnabled: config.enabled,
      erpnextCompany: config.erpnextCompany,
      companyAbbr: config.companyAbbr || "",
      costCenter: config.costCenter || "",
      defaultWarehouse: config.defaultWarehouse || "",
      mappedGstin: maskGstin(config.gstin),
      localGstin: maskGstin(config.localGstin),
    };
  } catch (error) {
    return {
      purpose,
      configured: false,
      ready: false,
      globalExportEnabled: isFrappeAccountingSyncEnabled(),
      operatingCompanyPilotEnabled: false,
      code: error?.code || "FRAPPE_PREFLIGHT_FAILED",
      message: error?.message || "ERPNext operating-company mapping could not be validated.",
    };
  }
}

/**
 * Read-only configuration preflight for the selected legal operating company.
 * It never makes an ERPNext request and never returns credentials or a full
 * GSTIN. Financial/statutory export routes will use the same mapping gate
 * before they are introduced.
 */
export const GET = withAuth(async (_req, _context, user) => {
  if (!user.activeOperatingCompanyId) {
    return NextResponse.json({
      success: false,
      message: "Select an operating company before checking ERPNext readiness.",
    }, { status: 400 });
  }

  await connectDb();
  const operatingCompany = await SubCompany.findOne({
    _id: user.activeOperatingCompanyId,
    companyId: user.companyId,
    isOperatingCompany: true,
    isActive: true,
  }).select("name code legalProfile.gstNumber").lean();

  if (!operatingCompany) {
    return NextResponse.json({
      success: false,
      message: "The selected operating company is unavailable.",
    }, { status: 404 });
  }

  const scopedOperatingCompany = {
    _id: operatingCompany._id,
    subCompanyId: operatingCompany._id,
    code: operatingCompany.code,
    subCompanyCode: operatingCompany.code,
    legalProfile: operatingCompany.legalProfile || {},
  };

  const accounting = safeMappingStatus(scopedOperatingCompany, "accounting");
  const statutory = safeMappingStatus(scopedOperatingCompany, "statutory");

  return NextResponse.json({
    success: true,
    data: {
      // Credential presence is intentionally a boolean, never the endpoint,
      // key, secret, or any portion of their values.
      connectionConfigured: isFrappeConfigured(),
      activeOperatingCompany: {
        id: String(operatingCompany._id),
        name: operatingCompany.name,
        code: operatingCompany.code,
        localGstin: maskGstin(operatingCompany.legalProfile?.gstNumber),
      },
      accounting,
      statutory,
      nextStep: accounting.ready && statutory.ready
        ? "This legal entity is configuration-ready. Keep submission routes disabled until its controlled pilot is approved."
        : "Complete the explicit ERPNext Company/GSTIN mapping and keep both export flags disabled until a controlled pilot is approved.",
    },
  });
}, { module: "Journal Entry", action: "view" });
