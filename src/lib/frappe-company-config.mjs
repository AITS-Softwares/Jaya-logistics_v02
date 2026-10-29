import { FrappeClientError } from "@/lib/frappe-client.mjs";

// This module is deliberately server-only. It contains legal-entity metadata,
// never credentials. Keep FRAPPE_URL / FRAPPE_API_KEY / FRAPPE_API_SECRET in
// the normal server environment and never place them in this mapping or a
// NEXT_PUBLIC variable.
const MAP_ENV_KEY = "FRAPPE_OPERATING_COMPANY_MAP";
const ACCOUNTING_ENABLED_ENV_KEY = "FRAPPE_ACCOUNTING_SYNC_ENABLED";
const SENSITIVE_KEY = /(?:api[_-]?(?:key|secret)|authorization|token|password|cookie|session|url|host)/i;
const ALLOWED_ENTRY_KEYS = new Set([
  "erpnextCompany",
  "companyAbbr",
  "gstin",
  "localSubCompanyId",
  "costCenter",
  "defaultWarehouse",
  "defaultReceivableAccount",
  "defaultPayableAccount",
  "defaultIncomeAccount",
  "defaultExpenseAccount",
  "defaultBankAccount",
  "defaultModeOfPayment",
  "salesTaxTemplate",
  "purchaseTaxTemplate",
  "enabled",
]);

export class FrappeCompanyConfigError extends FrappeClientError {
  constructor(message, { code = "FRAPPE_COMPANY_MAPPING_INVALID" } = {}) {
    super(message, { code, retryable: false });
    this.name = "FrappeCompanyConfigError";
  }
}

function readText(env, key) {
  const value = env?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function safeCode(value) {
  const code = String(value || "").trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_-]{1,39}$/.test(code)) {
    throw new FrappeCompanyConfigError("A valid operating-company code is required.", {
      code: "FRAPPE_OPERATING_COMPANY_REQUIRED",
    });
  }
  return code;
}

function optionalText(value, field, maxLength = 160) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") {
    throw new FrappeCompanyConfigError(`ERPNext company mapping field "${field}" must be text.`);
  }
  const text = value.trim();
  if (!text || text.length > maxLength) {
    throw new FrappeCompanyConfigError(`ERPNext company mapping field "${field}" is invalid.`);
  }
  return text;
}

function optionalGstin(value) {
  const gstin = optionalText(value, "gstin", 15).toUpperCase();
  // A complete statutory workflow requires a valid Indian GSTIN. The strict
  // check stays here rather than guessing an issuer from a customer record.
  if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) {
    throw new FrappeCompanyConfigError("ERPNext company mapping contains an invalid GSTIN.", {
      code: "FRAPPE_OPERATING_COMPANY_GSTIN_INVALID",
    });
  }
  return gstin;
}

function normalizeEntry(code, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new FrappeCompanyConfigError(`ERPNext company mapping for ${code} must be an object.`);
  }

  for (const key of Object.keys(value)) {
    if (SENSITIVE_KEY.test(key) || !ALLOWED_ENTRY_KEYS.has(key)) {
      throw new FrappeCompanyConfigError(`ERPNext company mapping for ${code} contains an unsupported field.`, {
        code: "FRAPPE_OPERATING_COMPANY_MAPPING_UNSAFE",
      });
    }
  }

  if (value.enabled !== undefined && typeof value.enabled !== "boolean") {
    throw new FrappeCompanyConfigError(`ERPNext company mapping field "enabled" for ${code} must be true or false.`);
  }

  return Object.freeze({
    operatingCompanyCode: code,
    erpnextCompany: optionalText(value.erpnextCompany, "erpnextCompany"),
    companyAbbr: optionalText(value.companyAbbr, "companyAbbr", 30),
    gstin: optionalGstin(value.gstin),
    localSubCompanyId: optionalText(value.localSubCompanyId, "localSubCompanyId", 128),
    costCenter: optionalText(value.costCenter, "costCenter"),
    defaultWarehouse: optionalText(value.defaultWarehouse, "defaultWarehouse"),
    defaultReceivableAccount: optionalText(value.defaultReceivableAccount, "defaultReceivableAccount"),
    defaultPayableAccount: optionalText(value.defaultPayableAccount, "defaultPayableAccount"),
    defaultIncomeAccount: optionalText(value.defaultIncomeAccount, "defaultIncomeAccount"),
    defaultExpenseAccount: optionalText(value.defaultExpenseAccount, "defaultExpenseAccount"),
    defaultBankAccount: optionalText(value.defaultBankAccount, "defaultBankAccount"),
    defaultModeOfPayment: optionalText(value.defaultModeOfPayment, "defaultModeOfPayment"),
    salesTaxTemplate: optionalText(value.salesTaxTemplate, "salesTaxTemplate"),
    purchaseTaxTemplate: optionalText(value.purchaseTaxTemplate, "purchaseTaxTemplate"),
    enabled: value.enabled === true,
  });
}

/**
 * Parses the explicit legal-entity map required for accounting and statutory
 * exports. The supported environment shape is deliberately metadata-only:
 *
 * {
 *   "JGL": {
 *     "erpnextCompany": "Jaya Global Logistics Pvt Ltd",
 *     "gstin": "27AAAAA0000A1Z5",
 *     "localSubCompanyId": "optional Mongo id",
 *     "costCenter": "JGL - JGL",
 *     "defaultWarehouse": "Main - JGL",
 *     "enabled": false
 *   },
 *   "JL": { "erpnextCompany": "...", "gstin": "...", "enabled": false },
 *   "NK": { "erpnextCompany": "...", "gstin": "...", "enabled": false }
 * }
 *
 * `enabled` should stay false until that legal entity has passed the pilot.
 */
export function getOperatingCompanyMap({ env = process.env } = {}) {
  const raw = readText(env, MAP_ENV_KEY);
  if (!raw) return Object.freeze({});

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new FrappeCompanyConfigError("ERPNext operating-company mapping is not valid JSON.", {
      code: "FRAPPE_OPERATING_COMPANY_MAPPING_INVALID_JSON",
    });
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new FrappeCompanyConfigError("ERPNext operating-company mapping must be a JSON object.");
  }

  const normalized = {};
  for (const [rawCode, entry] of Object.entries(parsed)) {
    const code = safeCode(rawCode);
    if (normalized[code]) {
      throw new FrappeCompanyConfigError(`ERPNext operating-company mapping duplicates ${code}.`);
    }
    normalized[code] = normalizeEntry(code, entry);
  }
  return Object.freeze(normalized);
}

/** Returns true only when the global accounting export feature flag is explicit. */
export function isFrappeAccountingSyncEnabled(env = process.env) {
  return readText(env, ACCOUNTING_ENABLED_ENV_KEY).toLowerCase() === "true";
}

/**
 * Returns the mapping for an active legal entity. It intentionally has no
 * fallback to FRAPPE_COMPANY_ID: the legacy parent-company scope is safe for
 * Customer/Item master sync only, not invoices, payments, GL, e-Invoice, or
 * e-Way Bill generation.
 */
export function getOperatingCompanyFrappeConfig(operatingCompany, { env = process.env, purpose = "accounting" } = {}) {
  const code = safeCode(operatingCompany?.subCompanyCode || operatingCompany?.code);
  const map = getOperatingCompanyMap({ env });
  const config = map[code];
  if (!config) {
    throw new FrappeCompanyConfigError(`No explicit ERPNext Company mapping exists for ${code}.`, {
      code: "FRAPPE_OPERATING_COMPANY_MAPPING_MISSING",
    });
  }

  const localId = String(operatingCompany?.subCompanyId || operatingCompany?._id || "").trim();
  if (config.localSubCompanyId && localId && config.localSubCompanyId !== localId) {
    throw new FrappeCompanyConfigError(`ERPNext Company mapping for ${code} belongs to a different operating company.`, {
      code: "FRAPPE_OPERATING_COMPANY_MAPPING_MISMATCH",
    });
  }
  if (!config.erpnextCompany) {
    throw new FrappeCompanyConfigError(`ERPNext Company name is missing for ${code}.`, {
      code: "FRAPPE_OPERATING_COMPANY_ERP_COMPANY_MISSING",
    });
  }

  // The local operating company is the legal source for the issuer GSTIN.
  // A configured ERPNext value may never silently override it. The comparison
  // is deliberately performed before a future caller creates even a draft.
  const localGstin = optionalGstin(
    operatingCompany?.legalProfile?.gstNumber || operatingCompany?.gstNumber
  );
  if (config.gstin && localGstin && config.gstin !== localGstin) {
    throw new FrappeCompanyConfigError(`ERPNext Company mapping GSTIN does not match ${code}.`, {
      code: "FRAPPE_OPERATING_COMPANY_GSTIN_MISMATCH",
    });
  }

  const normalizedPurpose = String(purpose || "accounting").trim().toLowerCase();
  if (!new Set(["accounting", "statutory"]).has(normalizedPurpose)) {
    throw new FrappeCompanyConfigError("ERPNext mapping purpose must be accounting or statutory.", {
      code: "FRAPPE_OPERATING_COMPANY_PURPOSE_INVALID",
    });
  }
  if (normalizedPurpose === "statutory" && (!config.gstin || !localGstin)) {
    throw new FrappeCompanyConfigError(`Matching local and ERPNext GSTINs are required for ${code} statutory generation.`, {
      code: "FRAPPE_OPERATING_COMPANY_GSTIN_MISSING",
    });
  }

  return Object.freeze({
    ...config,
    localGstin,
    purpose: normalizedPurpose,
    accountingSyncEnabled: isFrappeAccountingSyncEnabled(env),
  });
}

/**
 * Blocks a financial or statutory export unless both the global feature flag
 * and the individual legal-entity pilot flag are true. It performs no I/O.
 */
export function assertOperatingCompanyFrappeReady(operatingCompany, options = {}) {
  const config = getOperatingCompanyFrappeConfig(operatingCompany, options);
  if (!isFrappeAccountingSyncEnabled(options.env || process.env)) {
    throw new FrappeCompanyConfigError("ERPNext accounting export is disabled for this environment.", {
      code: "FRAPPE_ACCOUNTING_SYNC_DISABLED",
    });
  }
  if (!config.enabled) {
    throw new FrappeCompanyConfigError(`ERPNext accounting export is not enabled for ${config.operatingCompanyCode}.`, {
      code: "FRAPPE_OPERATING_COMPANY_SYNC_DISABLED",
    });
  }
  return config;
}

/**
 * Documents the legacy master-data scope without treating it as a legal-entity
 * mapping. Existing Customer/Item sync may continue to use FRAPPE_COMPANY_ID
 * until it is migrated to an explicit, reviewed master-data strategy.
 */
export function getLegacyMasterSyncScope(env = process.env) {
  return Object.freeze({
    enabled: Boolean(readText(env, "FRAPPE_COMPANY_ID")),
    localParentCompanyId: readText(env, "FRAPPE_COMPANY_ID"),
  });
}
