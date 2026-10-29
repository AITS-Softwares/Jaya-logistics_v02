import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { withAuth } from "@/lib/auth";
import SubCompany from "@/models/SubCompany";
import {
  getOperatingCompanyFrappeConfig,
  isFrappeAccountingSyncEnabled,
} from "@/lib/frappe-company-config.mjs";
import { createFrappeClient, isFrappeConfigured } from "@/lib/frappe-client.mjs";

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
    const requiredAccountingReferences = [
      "defaultReceivableAccount", "defaultPayableAccount", "defaultIncomeAccount", "defaultExpenseAccount",
      "defaultBankAccount", "defaultModeOfPayment", "salesTaxTemplate", "purchaseTaxTemplate",
    ];
    const missingAccountingReferences = requiredAccountingReferences.filter((field) => !config[field]);
    const enabled = Boolean(config.accountingSyncEnabled && config.enabled && missingAccountingReferences.length === 0);

    return {
      purpose,
      configured: true,
      ready: enabled,
      accountingReferencesComplete: missingAccountingReferences.length === 0,
      missingAccountingReferences,
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
async function remoteCompanyStatus(companyName) {
  if (!isFrappeConfigured()) {
    return { checked: false, exists: false, message: "ERPNext connection is not configured." };
  }

  try {
    const client = createFrappeClient();
    // Read-only exact-name lookup. This intentionally never creates or edits
    // an ERPNext Company: finance must approve its legal/accounting setup.
    const records = await client.list("Company", {
      // Keep this to fields that are permitted by a standard Company list
      // permission; status validation happens later during setup.
      fields: ["name", "abbr", "country", "default_currency"],
      filters: [["name", "=", companyName]],
      limitPageLength: 2,
    });
    if (records.length > 1) {
      return { checked: true, exists: false, message: "ERPNext returned duplicate Companies with this name; manual review is required." };
    }
    const company = records[0];
    return company
      ? { checked: true, exists: true, company: { name: company.name, abbr: company.abbr || "", country: company.country || "", currency: company.default_currency || "" } }
      : { checked: true, exists: false, message: "No ERPNext Company exists with this exact local sub-company name." };
  } catch (error) {
    return { checked: false, exists: false, code: error?.code || "FRAPPE_REMOTE_CHECK_FAILED", message: error?.message || "ERPNext Company check failed." };
  }
}

export const GET = withAuth(async (req, _context, user) => {
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
  }).select("name code legalProfile erpNextMapping").lean();

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
  const verifyRemote = new URL(req.url).searchParams.get("verifyRemote") === "true";
  const desiredErpNextCompany = operatingCompany.erpNextMapping?.companyName || operatingCompany.name;
  const remoteCompany = verifyRemote ? await remoteCompanyStatus(desiredErpNextCompany) : { checked: false };

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
        // This is always derived from the local SubCompany name. It is not
        // evidence that the ERPNext Company has been created yet.
        desiredErpNextCompany: operatingCompany.erpNextMapping?.companyName || operatingCompany.name,
        localMappingStatus: operatingCompany.erpNextMapping?.status || "pending_legal_profile",
      },
      accounting,
      statutory,
      remoteCompany,
      nextStep: accounting.ready && statutory.ready
        ? "This legal entity is configuration-ready. Keep submission routes disabled until its controlled pilot is approved."
        : "Complete the explicit ERPNext Company/GSTIN mapping and keep both export flags disabled until a controlled pilot is approved.",
    },
  });
}, { module: "Journal Entry", action: "view" });
