const REQUIRED_CONFIG = {
  "Sales Invoice": ["erpnextCompany", "defaultReceivableAccount", "defaultIncomeAccount"],
  "Purchase Invoice": ["erpnextCompany", "defaultPayableAccount", "defaultExpenseAccount"],
  "Payment Entry": ["erpnextCompany", "defaultBankAccount", "defaultModeOfPayment", "defaultReceivableAccount", "defaultPayableAccount"],
};

function text(value) { return String(value || "").trim(); }
function date(value, label) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.valueOf())) throw new Error(`${label} is required.`);
  return parsed.toISOString().slice(0, 10);
}
function number(value, label, { positive = false } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || (positive ? parsed <= 0 : parsed < 0)) throw new Error(`${label} is invalid.`);
  return parsed;
}
function requireConfig(config, doctype, includeTaxes) {
  const missing = (REQUIRED_CONFIG[doctype] || []).filter((key) => !text(config?.[key]));
  if (includeTaxes && !text(config?.[doctype === "Sales Invoice" ? "salesTaxTemplate" : "purchaseTaxTemplate"])) {
    missing.push(doctype === "Sales Invoice" ? "salesTaxTemplate" : "purchaseTaxTemplate");
  }
  if (missing.length) throw new Error(`ERPNext ${doctype} mapping is incomplete: ${missing.join(", ")}.`);
}

function sourceReference(source, sourceId) {
  return `JAYA source ${source}:${sourceId}`;
}

export function buildSalesInvoicePayload({ invoice, config, customerName, itemMappings, warehouseMappings, externalIdField, externalId }) {
  requireConfig(config, "Sales Invoice", Number(invoice.gstTotal) > 0);
  if (!text(customerName)) throw new Error("Customer must be synchronized to ERPNext before the invoice is queued.");
  const items = (invoice.items || []).map((item, index) => {
    const itemName = text(itemMappings?.[String(item.item)] || item.itemCode);
    const warehouse = text(warehouseMappings?.[String(item.warehouse)] || config.defaultWarehouse);
    if (!itemName) throw new Error(`Invoice line ${index + 1} has no ERPNext Item mapping.`);
    if (!warehouse) throw new Error(`Invoice line ${index + 1} has no ERPNext Warehouse mapping.`);
    return {
      item_code: itemName,
      qty: number(item.quantity, `Invoice line ${index + 1} quantity`, { positive: true }),
      rate: number(item.unitPrice, `Invoice line ${index + 1} rate`),
      warehouse,
      income_account: config.defaultIncomeAccount,
      ...(text(config.costCenter) ? { cost_center: config.costCenter } : {}),
    };
  });
  if (!items.length) throw new Error("Sales Invoice must have at least one item.");
  if (!text(externalIdField)) throw new Error("FRAPPE_SALES_INVOICE_ID_FIELD is required for duplicate-safe Sales Invoice export.");
  return {
    doctype: "Sales Invoice",
    company: config.erpnextCompany,
    customer: customerName,
    posting_date: date(invoice.postingDate || invoice.invoiceDate, "Sales Invoice posting date"),
    due_date: date(invoice.invoiceDate || invoice.postingDate, "Sales Invoice due date"),
    debit_to: config.defaultReceivableAccount,
    items,
    ...(Number(invoice.gstTotal) > 0 ? { taxes_and_charges: config.salesTaxTemplate } : {}),
    remarks: sourceReference("SalesInvoice", invoice._id),
    [externalIdField]: externalId,
  };
}

export function buildPurchaseInvoicePayload({ invoice, config, supplierName, itemMappings, warehouseMappings, externalIdField, externalId }) {
  requireConfig(config, "Purchase Invoice", Number(invoice.gstTotal) > 0);
  if (!text(supplierName)) throw new Error("Supplier must be synchronized to ERPNext before the invoice is queued.");
  const items = (invoice.items || []).map((item, index) => {
    const itemName = text(itemMappings?.[String(item.item)] || item.itemCode);
    const warehouse = text(warehouseMappings?.[String(item.warehouse)] || config.defaultWarehouse);
    if (!itemName) throw new Error(`Invoice line ${index + 1} has no ERPNext Item mapping.`);
    if (!warehouse) throw new Error(`Invoice line ${index + 1} has no ERPNext Warehouse mapping.`);
    return {
      item_code: itemName,
      qty: number(item.quantity, `Invoice line ${index + 1} quantity`, { positive: true }),
      rate: number(item.unitPrice, `Invoice line ${index + 1} rate`),
      warehouse,
      expense_account: config.defaultExpenseAccount,
      ...(text(config.costCenter) ? { cost_center: config.costCenter } : {}),
    };
  });
  if (!items.length) throw new Error("Purchase Invoice must have at least one item.");
  if (!text(externalIdField)) throw new Error("FRAPPE_PURCHASE_INVOICE_ID_FIELD is required for duplicate-safe Purchase Invoice export.");
  return {
    doctype: "Purchase Invoice",
    company: config.erpnextCompany,
    supplier: supplierName,
    posting_date: date(invoice.postingDate || invoice.documentDate, "Purchase Invoice posting date"),
    bill_no: text(invoice.documentNumberPurchaseInvoice),
    bill_date: date(invoice.documentDate || invoice.postingDate, "Purchase Invoice bill date"),
    credit_to: config.defaultPayableAccount,
    items,
    ...(Number(invoice.gstTotal) > 0 ? { taxes_and_charges: config.purchaseTaxTemplate } : {}),
    remarks: sourceReference("PurchaseInvoice", invoice._id),
    [externalIdField]: externalId,
  };
}

export function buildPaymentEntryPayload({ payment, config, partyName, invoiceReferences, externalIdField, externalId }) {
  requireConfig(config, "Payment Entry", false);
  if (!text(partyName)) throw new Error("The payment party must be synchronized to ERPNext before the payment is queued.");
  if (!text(externalIdField)) throw new Error("FRAPPE_PAYMENT_ENTRY_ID_FIELD is required for duplicate-safe Payment Entry export.");
  const customerPayment = payment.paymentType === "Customer";
  if (!customerPayment && payment.paymentType !== "Supplier") throw new Error("Payment type is invalid.");
  if (!Array.isArray(invoiceReferences) || !invoiceReferences.length) throw new Error("A Payment Entry needs at least one synchronized invoice allocation.");
  const references = invoiceReferences.map((reference, index) => {
    if (!text(reference.name)) throw new Error(`Payment allocation ${index + 1} has no ERPNext invoice mapping.`);
    return {
      reference_doctype: reference.doctype,
      reference_name: reference.name,
      allocated_amount: number(reference.allocatedAmount, `Payment allocation ${index + 1}`, { positive: true }),
    };
  });
  const amount = number(payment.amount, "Payment amount", { positive: true });
  const allocationTotal = references.reduce((total, reference) => total + reference.allocated_amount, 0);
  if (Math.abs(amount - allocationTotal) > 0.01) throw new Error("Payment amount does not match ERPNext invoice allocations.");
  return {
    doctype: "Payment Entry",
    payment_type: customerPayment ? "Receive" : "Pay",
    company: config.erpnextCompany,
    posting_date: date(payment.paymentDate, "Payment date"),
    party_type: customerPayment ? "Customer" : "Supplier",
    party: partyName,
    mode_of_payment: config.defaultModeOfPayment,
    paid_from: customerPayment ? config.defaultReceivableAccount : config.defaultBankAccount,
    paid_to: customerPayment ? config.defaultBankAccount : config.defaultPayableAccount,
    paid_amount: amount,
    received_amount: amount,
    references,
    ...(text(payment.reference) ? { reference_no: text(payment.reference), reference_date: date(payment.paymentDate, "Payment date") } : {}),
    remarks: `${sourceReference("Payment", payment._id)}${text(payment.remarks) ? ` - ${text(payment.remarks).slice(0, 300)}` : ""}`,
    [externalIdField]: externalId,
  };
}
