import SubCompany from "@/models/SubCompany";

export const OPERATING_COMPANY_SEEDS = [
  { code: "JGL", name: "Jaya Global Logistics", documentPrefix: "JGL" },
  { code: "JL", name: "Jaya Logistics", documentPrefix: "JL" },
  { code: "NK", name: "Neelkanth", documentPrefix: "NK" },
];

export async function ensureOperatingCompanies(companyId, createdBy = null) {
  const result = [];
  for (const seed of OPERATING_COMPANY_SEEDS) {
    let operatingCompany = await SubCompany.findOne({ companyId, code: seed.code });
    if (!operatingCompany) {
      operatingCompany = await SubCompany.create({
        companyId,
        name: seed.name,
        code: seed.code,
        createdBy,
        isActive: true,
        isOperatingCompany: true,
        legalProfile: { legalName: seed.name, documentPrefix: seed.documentPrefix },
      });
    } else if (!operatingCompany.isOperatingCompany) {
      operatingCompany.isOperatingCompany = true;
      if (!operatingCompany.legalProfile?.legalName) operatingCompany.legalProfile.legalName = operatingCompany.name;
      if (!operatingCompany.legalProfile?.documentPrefix) operatingCompany.legalProfile.documentPrefix = seed.documentPrefix;
      await operatingCompany.save();
    }
    result.push(operatingCompany);
  }
  return result;
}

export function activeOperatingCompanyId(user) {
  if (!user?.activeOperatingCompanyId) {
    throw new Error("An operating company must be selected at login.");
  }
  return user.activeOperatingCompanyId;
}

export function companyScopeFilter(user, filter = {}, { includeLegacyJgl = true } = {}) {
  const operatingCompanyId = activeOperatingCompanyId(user);
  const tenantFilter = { companyId: user.companyId };

  // Existing transactions are confirmed to belong to JGL. Until the supplied
  // migration is executed, JGL users continue to see legacy records with no
  // subCompanyId; other operating companies never receive that fallback.
  if (includeLegacyJgl && user.activeOperatingCompanyCode === "JGL") {
    return {
      $and: [
        filter,
        tenantFilter,
        {
          $or: [
            { subCompanyId: operatingCompanyId },
            { subCompanyId: null },
            { subCompanyId: { $exists: false } },
          ],
        },
      ],
    };
  }

  return { $and: [filter, tenantFilter, { subCompanyId: operatingCompanyId }] };
}

export function attachOperatingCompany(data, user) {
  return {
    ...data,
    subCompanyId: user.activeOperatingCompanyId,
    subCompanyName: user.activeOperatingCompanyName,
    subCompanyCode: user.activeOperatingCompanyCode,
  };
}

export function canUseOperatingCompany(user, operatingCompanyId) {
  if (user?.type === "company" || user?.accessAllOperatingCompanies) return true;
  return (user?.operatingCompanyIds || []).map(String).includes(String(operatingCompanyId));
}
