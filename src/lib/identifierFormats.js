const FORMATS = [
  { test: /^(aadhaar|aadhar)(number|no)?$/i, label: "Aadhaar", pattern: /^\d{12}$/, expected: "exactly 12 digits" },
  { test: /^(gstin|gstnumber|gstno|gst)$/i, label: "GSTIN", pattern: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[A-Z0-9]$/, expected: "15 characters in the valid GSTIN format", uppercase: true },
  { test: /^(pan|panno|pannumber|permanentaccountnumber)$/i, label: "PAN", pattern: /^[A-Z]{5}\d{4}[A-Z]$/, expected: "10 characters in the valid PAN format", uppercase: true },
  { test: /^(tan|tanno|tannumber)$/i, label: "TAN", pattern: /^[A-Z]{4}\d{5}[A-Z]$/, expected: "10 characters in the valid TAN format", uppercase: true },
  { test: /^(ifsc|ifsccode)$/i, label: "IFSC", pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/, expected: "11 characters: 4 letters, 0, then 6 letters or digits", uppercase: true },
  { test: /^(pincode|pincodenumber|postalpin|pin|billingpin|shippingpin)$/i, label: "PIN code", pattern: /^\d{6}$/, expected: "exactly 6 digits" },
  { test: /^(mobile|mobileno|mobilenumber|phone|phonenumber|phoneno|contactnumber|contactmobile|drivermobileno)$/i, label: "Indian mobile number", pattern: /^\d{10}$/, expected: "exactly 10 digits" },
  { test: /^(cin|cinno|cinnumber|corporateidentificationnumber)$/i, label: "CIN", pattern: /^(L|U)\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/, expected: "21 characters in the valid CIN format", uppercase: true },
  { test: /^(iec|ieccode|importexportcode)$/i, label: "IEC", pattern: /^\d{10}$/, expected: "exactly 10 digits" },
];

/** Validate fixed-format identifiers anywhere in a master or sales payload. */
export function validateIdentifierFormats(payload) {
  const issues = [];
  const visit = (value, path = "") => {
    if (!value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value)) {
      const fieldPath = path ? `${path}.${key}` : key;
      const textValue = typeof item === "string" ? item.trim() : (typeof item === "number" && Number.isFinite(item) ? String(item) : "");
      if (textValue && !["-", "—", "n/a"].includes(textValue.toLowerCase())) {
        const normalizedKey = key.replace(/[^a-z0-9]/gi, "");
        let rule = FORMATS.find((candidate) => candidate.test.test(normalizedKey));
        if (!rule && /^(billingzip|shippingzip)$/i.test(normalizedKey)) {
          const country = value[normalizedKey.startsWith("billing") ? "billingCountry" : "shippingCountry"];
          if (!country || /india/i.test(String(country))) {
            rule = { pattern: /^\d{6}$/, expected: "exactly 6 digits" };
          }
        }
        if (!rule) continue;
        const normalized = textValue;
        const comparable = rule.uppercase ? normalized.toUpperCase() : normalized;
        if (rule.uppercase && typeof item === "string") value[key] = comparable;
        if (!rule.pattern.test(comparable)) issues.push(`${fieldPath} must be ${rule.expected}.`);
      } else if (item && typeof item === "object") {
        visit(item, fieldPath);
      }
    }
  };
  visit(payload);
  return issues;
}

export function identifierFormatError(payload) {
  const issues = validateIdentifierFormats(payload);
  return issues.length ? issues.join(" ") : null;
}
