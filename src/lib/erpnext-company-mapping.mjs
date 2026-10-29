/**
 * Local legal-entity readiness. This does not make a network call; creating
 * or enabling an ERPNext Company requires the separate finance-approved
 * configuration gate.
 */
const REQUIRED_LEGAL_PROFILE_FIELDS = [
  "legalName", "gstNumber", "pan", "address", "country", "state", "pinCode", "phone", "email", "currency",
];

function text(value) {
  return String(value || "").trim();
}

export function missingLegalProfileFields(legalProfile = {}) {
  return REQUIRED_LEGAL_PROFILE_FIELDS.filter((field) => !text(legalProfile[field]));
}

export function localErpNextCompanyName(subCompany) {
  // ERPNext Company names must remain the same as the existing local
  // SubCompany name unless a deliberate future migration is approved.
  return text(subCompany?.name);
}

export function erpNextMappingSnapshot(subCompany, { now = new Date() } = {}) {
  const companyName = localErpNextCompanyName(subCompany);
  const missingFields = missingLegalProfileFields(subCompany?.legalProfile);
  const ready = Boolean(subCompany?.isOperatingCompany && subCompany?.isActive && companyName && missingFields.length === 0);

  return {
    companyName,
    status: ready ? "ready_for_erpnext_setup" : "pending_legal_profile",
    lastProfileUpdatedAt: now,
    // Do not set lastMappedAt here: it means an ERPNext Company is actually
    // configured and verified, not merely that the local record is ready.
    lastError: "",
    missingFields,
  };
}

export function erpNextCompanyPayload(subCompany) {
  const profile = subCompany?.legalProfile || {};
  const name = localErpNextCompanyName(subCompany);
  const abbreviation = text(subCompany?.code).toUpperCase();
  const missingFields = missingLegalProfileFields(profile);

  if (!subCompany?.isOperatingCompany || !subCompany?.isActive || !name || !abbreviation || missingFields.length) {
    const error = new Error("Complete the legal profile before syncing this ERPNext Company.");
    error.code = "ERP_NEXT_COMPANY_NOT_READY";
    error.missingFields = missingFields;
    throw error;
  }

  return {
    doctype: "Company",
    // Deliberately use the existing local master name, not legalName, so the
    // Company master has one stable name in both systems.
    company_name: name,
    abbr: abbreviation,
    country: text(profile.country),
    default_currency: text(profile.currency).toUpperCase(),
    is_group: 0,
  };
}
