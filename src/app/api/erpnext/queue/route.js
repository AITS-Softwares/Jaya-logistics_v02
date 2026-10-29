import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { activeOperatingCompanyId, companyScopeFilter } from "@/lib/companyScope";
import { getOperatingCompanyFrappeConfig } from "@/lib/frappe-company-config.mjs";
import { enqueueErpNextExport, integrationExternalId } from "@/lib/erpnext-outbox.mjs";
import { buildPaymentEntryPayload, buildPurchaseInvoicePayload, buildSalesInvoicePayload } from "@/lib/erpnext-accounting-payload.mjs";
import SubCompany from "@/models/SubCompany";
import SalesInvoice from "@/models/SalesInvoice";
import PurchaseInvoice from "@/models/InvoiceModel";
import Customer from "@/models/CustomerModel";
import Supplier from "@/models/SupplierModels";
import Item from "@/models/ItemModels";
import Warehouse from "@/models/warehouseModels";
import Payment from "@/models/Payment";
import ErpNextIntegrationMapping from "@/models/ErpNextIntegrationMapping";

export const runtime = "nodejs";

const sources = {
  sales_invoice: { model: SalesInvoice, localDoctype: "SalesInvoice", erpNextDoctype: "Sales Invoice", field: "erpNext", builder: buildSalesInvoicePayload },
  purchase_invoice: { model: PurchaseInvoice, localDoctype: "PurchaseInvoice", erpNextDoctype: "Purchase Invoice", field: "erpNext", builder: buildPurchaseInvoicePayload },
  payment: { model: Payment, localDoctype: "Payment", erpNextDoctype: "Payment Entry", field: "erpNext", builder: buildPaymentEntryPayload },
};

async function lookupMappings(items) {
  const itemIds = [...new Set((items || []).map((item) => String(item.item || "")).filter(Boolean))];
  const warehouseIds = [...new Set((items || []).map((item) => String(item.warehouse || "")).filter(Boolean))];
  const [itemDocs, warehouseDocs] = await Promise.all([
    itemIds.length ? Item.find({ _id: { $in: itemIds } }).select("_id itemCode frappeSync.name").lean() : [],
    warehouseIds.length ? Warehouse.find({ _id: { $in: warehouseIds } }).select("_id name frappeSync.name").lean() : [],
  ]);
  return {
    itemMappings: Object.fromEntries(itemDocs.map((item) => [String(item._id), item.frappeSync?.name || item.itemCode])),
    warehouseMappings: Object.fromEntries(warehouseDocs.map((warehouse) => [String(warehouse._id), warehouse.frappeSync?.name || warehouse.name])),
  };
}

export const POST = withAuth(async (req, _context, user) => {
  await connectDb();
  try {
    activeOperatingCompanyId(user);
    const { sourceType, sourceId } = await req.json().catch(() => ({}));
    const normalizedSourceType = String(sourceType || "").trim().toLowerCase();
    const source = sources[normalizedSourceType];
    if (!source || !sourceId) return NextResponse.json({ success: false, message: "A supported source type and source ID are required." }, { status: 400 });

    const [record, operatingCompany] = await Promise.all([
      source.model.findOne(companyScopeFilter(user, { _id: sourceId })).lean(),
      SubCompany.findOne({ _id: user.activeOperatingCompanyId, companyId: user.companyId, isOperatingCompany: true, isActive: true }).lean(),
    ]);
    if (!record) return NextResponse.json({ success: false, message: "The source document is unavailable in the selected operating company." }, { status: 404 });
    if (!operatingCompany) return NextResponse.json({ success: false, message: "The selected operating company is unavailable." }, { status: 404 });
    if (String(record.subCompanyId || "") !== String(operatingCompany._id)) return NextResponse.json({ success: false, message: "This document has no valid legal-company scope and cannot be exported." }, { status: 409 });

    const config = getOperatingCompanyFrappeConfig(operatingCompany);
    const externalId = integrationExternalId({ localDoctype: source.localDoctype, localRecordId: record._id, subCompanyCode: operatingCompany.code });
    const mappings = await lookupMappings(record.items);
    let payload;
    if (normalizedSourceType === "sales_invoice") {
      const customer = await Customer.findOne({ _id: record.customer, companyId: user.companyId }).select("frappeSync.name customerName").lean();
      payload = source.builder({ invoice: record, config, customerName: customer?.frappeSync?.name || "", ...mappings, externalIdField: process.env.FRAPPE_SALES_INVOICE_ID_FIELD, externalId });
    } else if (normalizedSourceType === "purchase_invoice") {
      const supplier = await Supplier.findOne({ _id: record.supplier, companyId: user.companyId }).select("frappeSync.name supplierName").lean();
      payload = source.builder({ invoice: record, config, supplierName: supplier?.frappeSync?.name || "", ...mappings, externalIdField: process.env.FRAPPE_PURCHASE_INVOICE_ID_FIELD, externalId });
    } else {
      const references = Array.isArray(record.references) ? record.references : [];
      const referenceMappings = await Promise.all(references.map(async (reference) => {
        const erpNextDoctype = reference.model === "SalesInvoice" ? "Sales Invoice" : "Purchase Invoice";
        const mapping = await ErpNextIntegrationMapping.findOne({
          companyId: user.companyId, subCompanyId: operatingCompany._id, localDoctype: reference.model,
          localRecordId: reference.invoiceId, erpNextDoctype, status: "synced",
        }).select("erpNextName").lean();
        return { doctype: erpNextDoctype, name: mapping?.erpNextName || "", allocatedAmount: reference.paidAmount };
      }));
      const party = record.paymentType === "Customer"
        ? await Customer.findOne({ companyId: user.companyId, customerCode: record.customerCode }).select("frappeSync.name").lean()
        : await Supplier.findOne({ companyId: user.companyId, supplierCode: record.supplierCode }).select("frappeSync.name").lean();
      payload = source.builder({ payment: record, config, partyName: party?.frappeSync?.name || "", invoiceReferences: referenceMappings, externalIdField: process.env.FRAPPE_PAYMENT_ENTRY_ID_FIELD, externalId });
    }

    const result = await enqueueErpNextExport({
      companyId: user.companyId, subCompanyId: operatingCompany._id, subCompanyCode: operatingCompany.code,
      localDoctype: source.localDoctype, localRecordId: record._id, erpNextCompany: config.erpnextCompany,
      erpNextDoctype: source.erpNextDoctype, eventType: "create", payloadSnapshot: payload, createdBy: user.id,
    });
    await source.model.updateOne({ _id: record._id, companyId: user.companyId }, { $set: { [`${source.field}.syncStatus`]: "pending" } });
    return NextResponse.json({ success: true, data: { outboxId: String(result.outbox._id), state: result.outbox.state, sourceHash: result.sourceHash } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error?.message || "ERPNext export could not be queued." }, { status: 422 });
  }
}, { module: "Journal Entry", action: "create" });
