import { createFrappeClient, isFrappeConfigured } from "@/lib/frappe-client.mjs";

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function values(term) {
  return {
    invoicePortion: numeric(term.invoicePortion, 100),
    dueDateBasedOn: term.dueDateBasedOn || "Day(s) after invoice date",
    creditDays: numeric(term.creditDays, 0),
    creditMonths: numeric(term.creditMonths, 0),
  };
}

function sameValue(left, right) {
  return String(left ?? "") === String(right ?? "");
}

export function paymentTermPayload(term) {
  const schedule = values(term);
  return {
    doctype: "Payment Term",
    payment_term_name: term.name,
    invoice_portion: schedule.invoicePortion,
    due_date_based_on: schedule.dueDateBasedOn,
    credit_days: schedule.creditDays,
    credit_months: schedule.creditMonths,
  };
}

function matchingPaymentTerm(existing, payload) {
  return sameValue(existing.invoice_portion, payload.invoice_portion)
    && sameValue(existing.due_date_based_on, payload.due_date_based_on)
    && sameValue(existing.credit_days, payload.credit_days)
    && sameValue(existing.credit_months, payload.credit_months);
}

function matchingTemplate(existing, paymentTermName, payload) {
  const terms = Array.isArray(existing.terms) ? existing.terms : [];
  if (terms.length !== 1) return false;
  const row = terms[0];
  return sameValue(row.payment_term, paymentTermName)
    && sameValue(row.invoice_portion, payload.invoice_portion)
    && sameValue(row.due_date_based_on, payload.due_date_based_on)
    && sameValue(row.credit_days, payload.credit_days)
    && sameValue(row.credit_months, payload.credit_months);
}

/**
 * Payment Terms are global master records in ERPNext. We never overwrite an
 * existing same-named term, because it may be used by another company.
 */
export async function syncPaymentTerm(term, { env = process.env, fetchImpl = fetch } = {}) {
  if (!env.FRAPPE_COMPANY_ID || String(term.companyId) !== String(env.FRAPPE_COMPANY_ID) || !isFrappeConfigured(env)) {
    return { status: "not_configured" };
  }

  try {
    const client = createFrappeClient({ env, fetchImpl });
    const payload = paymentTermPayload(term);
    const matches = await client.list("Payment Term", {
      fields: ["name", "payment_term_name", "invoice_portion", "due_date_based_on", "credit_days", "credit_months"],
      filters: [["payment_term_name", "=", term.name]],
      limitPageLength: 2,
    });
    if (matches.length > 1) throw new Error("ERPNext has duplicate Payment Term names; manual review is required.");

    let paymentTermName;
    if (matches[0]) {
      if (!matchingPaymentTerm(matches[0], payload)) {
        throw new Error("A same-named ERPNext Payment Term has different rules and was not changed automatically.");
      }
      paymentTermName = matches[0].name;
    } else {
      const created = await client.create("Payment Term", payload);
      paymentTermName = created?.name;
      if (!paymentTermName) throw new Error("ERPNext did not return a Payment Term name.");
    }

    const templates = await client.list("Payment Terms Template", {
      fields: ["name", "template_name"],
      filters: [["template_name", "=", term.name]],
      limitPageLength: 2,
    });
    if (templates.length > 1) throw new Error("ERPNext has duplicate Payment Terms Template names; manual review is required.");

    let templateName;
    if (templates[0]) {
      templateName = templates[0].name;
      const existingTemplate = await client.get("Payment Terms Template", templateName);
      if (!matchingTemplate(existingTemplate, paymentTermName, payload)) {
        throw new Error("A same-named ERPNext Payment Terms Template has different rules and was not changed automatically.");
      }
    } else {
      const schedule = values(term);
      const created = await client.create("Payment Terms Template", {
        doctype: "Payment Terms Template",
        template_name: term.name,
        allocate_payment_based_on_payment_terms: 0,
        terms: [{
          doctype: "Payment Terms Template Detail",
          payment_term: paymentTermName,
          invoice_portion: schedule.invoicePortion,
          due_date_based_on: schedule.dueDateBasedOn,
          credit_days: schedule.creditDays,
          credit_months: schedule.creditMonths,
        }],
      });
      templateName = created?.name;
      if (!templateName) throw new Error("ERPNext did not return a Payment Terms Template name.");
    }

    return { status: "synced", paymentTermName, templateName };
  } catch (error) {
    return { status: "failed", message: error?.message || "ERPNext Payment Term sync failed" };
  }
}
