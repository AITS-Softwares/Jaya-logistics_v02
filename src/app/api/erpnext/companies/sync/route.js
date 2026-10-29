import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import SubCompany from "@/models/SubCompany";
import { validateMasterDataRequest } from "@/lib/masterDataPermission";
import { createFrappeClient, FrappeClientError, isFrappeConfigured } from "@/lib/frappe-client.mjs";
import { erpNextCompanyPayload, erpNextMappingSnapshot } from "@/lib/erpnext-company-mapping.mjs";
import { completeSyncAttempt, failSyncAttempt, startSyncAttempt } from "@/lib/erpnext-sync-log.mjs";

export const runtime = "nodejs";

function syncKey(subCompany) {
  return `erpnext-company:create:${String(subCompany._id)}`;
}

async function findExactCompany(client, name) {
  const records = await client.list("Company", {
    fields: ["name", "abbr", "country", "default_currency"],
    filters: [["name", "=", name]],
    limitPageLength: 2,
  });
  if (records.length > 1) {
    throw new FrappeClientError("ERPNext contains duplicate Companies with this name; manual review is required.", {
      code: "FRAPPE_DUPLICATE_COMPANY_NAME",
    });
  }
  return records[0] || null;
}

export async function POST(req) {
  await connectDb();
  const auth = await validateMasterDataRequest(req, "edit", "Sub Companies");
  if (auth.error) return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });

  try {
    const { subCompanyId } = await req.json().catch(() => ({}));
    if (!subCompanyId) return NextResponse.json({ success: false, message: "Sub-company ID is required." }, { status: 400 });

    const subCompany = await SubCompany.findOne({
      _id: subCompanyId,
      companyId: auth.user.companyId,
      isOperatingCompany: true,
      isActive: true,
    });
    if (!subCompany) return NextResponse.json({ success: false, message: "An active operating sub-company was not found." }, { status: 404 });

    let payload;
    try {
      payload = erpNextCompanyPayload(subCompany);
    } catch (error) {
      const mapping = erpNextMappingSnapshot(subCompany);
      await SubCompany.updateOne({ _id: subCompany._id, companyId: auth.user.companyId }, {
        $set: {
          "erpNextMapping.companyName": mapping.companyName,
          "erpNextMapping.status": "pending_legal_profile",
          "erpNextMapping.lastProfileUpdatedAt": mapping.lastProfileUpdatedAt,
          "erpNextMapping.lastError": "Complete required legal profile fields before ERPNext Company sync.",
        },
      });
      return NextResponse.json({ success: false, message: error.message, missingFields: error.missingFields || [] }, { status: 422 });
    }

    if (!isFrappeConfigured()) return NextResponse.json({ success: false, message: "ERPNext connection is not configured." }, { status: 503 });

    const attemptInput = {
      companyId: auth.user.companyId,
      subCompanyId: subCompany._id,
      subCompanyCode: subCompany.code,
      subCompanyName: subCompany.name,
      localDoctype: "SubCompany",
      localRecordId: subCompany._id,
      erpNextDoctype: "Company",
      action: "create",
      idempotencyKey: syncKey(subCompany),
      createdBy: auth.user.id,
      metadata: { action: "create", doctype: "Company", document: payload.company_name },
    };
    await startSyncAttempt(attemptInput);

    try {
      const client = createFrappeClient();
      let company = await findExactCompany(client, payload.company_name);
      const created = !company;
      if (!company) company = await client.create("Company", payload);
      const name = String(company?.name || company?.company_name || payload.company_name).trim();
      if (!name) throw new FrappeClientError("ERPNext did not return a Company name.", { code: "FRAPPE_COMPANY_CREATE_INVALID_RESPONSE" });

      await SubCompany.updateOne({ _id: subCompany._id, companyId: auth.user.companyId }, {
        $set: {
          "erpNextMapping.companyName": name,
          "erpNextMapping.status": "mapped",
          "erpNextMapping.lastMappedAt": new Date(),
          "erpNextMapping.lastError": "",
        },
      });
      await completeSyncAttempt({
        ...attemptInput,
        erpNextName: name,
        metadata: { action: created ? "create" : "refresh", doctype: "Company", document: name, status: "mapped" },
      });
      return NextResponse.json({ success: true, created, erpNextCompany: { name, abbr: company?.abbr || payload.abbr } });
    } catch (error) {
      const requiresReview = !(error instanceof FrappeClientError) || !error.retryable;
      await failSyncAttempt({ ...attemptInput, error, httpStatus: error?.status, requiresReview });
      await SubCompany.updateOne({ _id: subCompany._id, companyId: auth.user.companyId }, {
        $set: { "erpNextMapping.status": "blocked", "erpNextMapping.lastError": error?.message || "ERPNext Company sync failed." },
      });
      return NextResponse.json({ success: false, message: error?.message || "ERPNext Company sync failed.", code: error?.code || "ERP_NEXT_COMPANY_SYNC_FAILED" }, { status: error?.status || 502 });
    }
  } catch (error) {
    console.error("POST /erpnext/companies/sync error:", error);
    return NextResponse.json({ success: false, message: "ERPNext Company sync could not be started." }, { status: 500 });
  }
}
