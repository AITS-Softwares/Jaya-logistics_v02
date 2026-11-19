import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { withAuth } from "@/lib/auth";
import { withBranchAccess } from "@/lib/branchAccess";
import connectDb from "@/lib/db";
import { companyScopeFilter } from "@/lib/companyScope";
import ConsignmentNote from "../../ConsignmentNote";
import SubCompany from "@/models/SubCompany";
import { getOperatingCompanyFrappeConfig } from "@/lib/frappe-company-config.mjs";
import { createFrappeClient, isFrappeConfigured } from "@/lib/frappe-client.mjs";
import { buildEwaybillPayload, ewaybillPreviewToken } from "@/lib/ewaybill-preview.mjs";
import { validateEwaybillLr } from "@/lib/ewaybill-validation.mjs";
import { recoverEwaybill, ewaybillStatusMethod } from "@/lib/ewaybill-recovery.mjs";
import { storeEwaybillPdf, readEwaybillPdf } from "@/lib/ewaybill-file";
export const runtime = "nodejs";
const fail = (message, status = 400) => NextResponse.json({ success: false, message }, { status });
async function find(req, context, user) {
  const { id } = await context.params;
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDb();
  return ConsignmentNote.findOne(companyScopeFilter(user, { _id: id }));
}
export const GET = withBranchAccess(withAuth(async (req, context, user) => {
  try {
    const note = await find(req, context, user);
    if (!note) return fail("LR not found.", 404);
    if (new URL(req.url).searchParams.has("file")) return new NextResponse(await readEwaybillPdf(note.ewaybill?.file), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline", "Cache-Control": "private, no-store" } });
    return NextResponse.json({ success: true, data: note.ewaybill || {} });
  } catch { return fail("E-way bill document unavailable.", 404); }
}, { module: "Consignment Note", actions: ["view", "create", "edit"] }));
export const POST = withBranchAccess(withAuth(async (req, context, user) => {
  let lockedId;
  let recoveryContext;
  try {
    const note = await find(req, context, user);
    if (!note) return fail("Save the LR first.", 404);
    if (["Approved", "Completed", "Rejected"].includes(note.header?.status) || (note.reapprovalState && note.reapprovalState !== "none") || note.upstreamPending?.length) return fail("Edit the LR through its existing review workflow before changing the e-way bill.", 409);
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const file = (await req.formData()).get("file");
      if (!file || file.size > 5 * 1024 * 1024) return fail("Upload a PDF up to 5 MB.");
      const saved = await storeEwaybillPdf(Buffer.from(await file.arrayBuffer()), file.name);
      await ConsignmentNote.updateOne({ _id: note._id }, { $set: { "ewaybill.file": saved, "ewaybill.source": "uploaded" } });
      return NextResponse.json({ success: true, data: { ...note.ewaybill?.toObject(), file: saved, source: "uploaded" } });
    }
    const { action, previewToken } = await req.json();
    if (!["generate", "fetch", "preview", "status"].includes(action)) return fail("Invalid action.");
    const method = action === "status" ? ewaybillStatusMethod() : process.env[action === "fetch" ? "FRAPPE_EWAYBILL_FETCH_METHOD" : "FRAPPE_EWAYBILL_GENERATE_METHOD"];
    if (action !== "preview" && !method) return fail("E-way bill integration is not configured for this action.", 503);
    if (action === "fetch" && !/^\d{12}$/.test(note.ewaybill?.ewaybillNo?.replace(/\s/g, "") || "")) return fail("Save a 12-digit e-way bill number on the LR first.");
    if (action === "generate" && note.ewaybill?.ewaybillNo) return fail("An e-way bill number already exists. Use Fetch to retrieve it.", 409);
    if (action === "generate" && !note.invoice?.file?.filePath) return fail("Save the invoice on the LR first.");
    const company = await SubCompany.findOne({ _id: note.subCompanyId, companyId: note.companyId, isOperatingCompany: true, isActive: true }).lean();
    if (!company) return fail("The LR operating company is unavailable.");
    let config, configError;
    try { config = getOperatingCompanyFrappeConfig(company, { purpose: "statutory" }); }
    catch (error) { if (action !== "preview") throw error; configError = error.message; }
    const payload = buildEwaybillPayload(note, config);
    if (action === "status") {
      const recovery = await recoverEwaybill(createFrappeClient(),method,payload);
      const stored = await ConsignmentNote.updateOne({_id:note._id,updatedAt:note.updatedAt},{$set:recovery.patch});
      if (!stored.modifiedCount) return fail("The LR changed while checking ERPNext. Check again.",409);
      const updated = await ConsignmentNote.findById(note._id).select("ewaybill").lean();
      return NextResponse.json({success:true,data:updated.ewaybill,message:recovery.message});
    }
    const currentToken = ewaybillPreviewToken(method, payload);
    if (action === "preview") {
      const previewMethod = process.env.FRAPPE_EWAYBILL_PREVIEW_METHOD;
      const verificationOnly = Boolean(note.ewaybill?.ewaybillNo) || note.ewaybill?.status === 'Provided by Customer';
      const localValidation = validateEwaybillLr(payload.lr, { fetchOnly: verificationOnly });
      const warnings = [...localValidation, configError, !method && "ERPNext generation method is not configured.",
        !previewMethod && "ERPNext prepare/preview method is not configured.",
        process.env.FRAPPE_EWAYBILL_ENABLED !== "true" && "E-way bill generation is disabled for this environment.",
        config && !config.enabled && "E-way bill generation is not enabled for this operating company.",
        !isFrappeConfigured() && "ERPNext connection keys are not configured. You can review this preview, but cannot send it yet.",
        note.ewaybill?.ewaybillNo && "An e-way bill number already exists. Use Fetch & Verify instead of generating another bill.",
        !note.invoice?.file?.filePath && "Upload and save the consignor invoice first.",
        ["processing", "uncertain"].includes(note.ewaybill?.apiState) && "Reconcile the previous request before generating again."].filter(Boolean);
      let prepared;
      // A remote preview prepares a persistent request; it never calls the statutory API.
      if (!verificationOnly && !configError && previewMethod && isFrappeConfigured() && !localValidation.length && !["processing", "uncertain"].includes(note.ewaybill?.apiState)) {
        const { ewaybill_no, ...args } = payload;
        prepared = await createFrappeClient().call(previewMethod, args);
        if (!prepared?.requestName || !prepared?.preparedVersion) throw new Error("ERPNext preview returned no prepared request reference.");
        warnings.push(...(prepared.warnings || []));
        if (!prepared.canGenerate && !prepared.warnings?.length) warnings.push("ERPNext request is not ready for generation.");
        const stored = await ConsignmentNote.updateOne({ _id: note._id, updatedAt: note.updatedAt, "ewaybill.apiState": { $nin: ["processing", "uncertain"] } }, { $set: {
          "ewaybill.requestName": prepared.requestName, "ewaybill.preparedVersion": prepared.preparedVersion, "ewaybill.previewToken": currentToken } });
        if (!stored.modifiedCount) return fail("The LR changed during preparation. Open the preview again.", 409);
      }
      return NextResponse.json({ success: true, data: { payload, method: method || '', previewToken: currentToken,
        requestName: prepared?.requestName, providerPayload: prepared?.providerPayload,
        canGenerate: warnings.length === 0 && Boolean(prepared?.canGenerate), warnings } });
    }
    if (action === "generate" && previewToken !== currentToken) return fail("The LR or ERPNext settings changed, or this request has not been previewed. Open the preview again before confirming.", 409);
    if (action === "generate" && (process.env.FRAPPE_EWAYBILL_ENABLED !== "true" || !config.enabled)) return fail("E-way bill generation is disabled for this environment or operating company.", 403);
    const validation = validateEwaybillLr(payload.lr, { fetchOnly: action === "fetch" });
    if (validation.length) return fail(validation.join(" "));
    if (action === "generate" && (!note.ewaybill?.preparedVersion || note.ewaybill.previewToken !== currentToken)) return fail("Prepare and preview this request in ERPNext before generating.", 409);
    const client = createFrappeClient();
    recoveryContext = {client,payload,action,previousState:note.ewaybill?.apiState || 'idle'};
    const stateFilter = action === "generate" ? { "ewaybill.apiState": { $nin: ["processing", "uncertain"] } } : { $or: [
      { "ewaybill.apiState": { $ne: "processing" } }, { "ewaybill.processingStartedAt": { $lte: new Date(Date.now() - 120_000) } }
    ] };
    const locked = await ConsignmentNote.updateOne({ _id: note._id, updatedAt: note.updatedAt, ...stateFilter }, { $set: { "ewaybill.apiState": "processing", "ewaybill.processingStartedAt": new Date() } });
    if (!locked.modifiedCount) return fail("A request is processing or its outcome is uncertain. Reconcile with ERPNext before generating again.", 409);
    lockedId = note._id;
    const { ewaybill_no, ...args } = payload;
    const result = await client.call(method, action === "generate" ? { ...args, prepared_version: note.ewaybill.preparedVersion } : { ...args, ewaybill_no });
    if (!/^\d{12}$/.test(String(result?.ewaybillNo || "")) || !result?.expiryDate) throw new Error("ERPNext returned incomplete e-way bill details. Reconcile before retrying generation.");
    if (action === "fetch" && String(result.ewaybillNo) !== note.ewaybill.ewaybillNo.replace(/\s/g, "")) throw new Error("ERPNext returned a different e-way bill number.");
    const patch = { "ewaybill.ewaybillNo": String(result.ewaybillNo), "ewaybill.expiryDate": result.expiryDate, "ewaybill.source": action === "generate" ? "generated" : "fetched", "ewaybill.apiState": "complete", "ewaybill.verifiedAt": new Date() };
    if (result.requestName) patch["ewaybill.requestName"] = result.requestName;
    if (Number(result.distance) > 0 && Number(result.distance) <= 4000) patch["ewaybill.distance"] = Number(result.distance);
    // Persist statutory success before attempting document storage.
    await ConsignmentNote.updateOne({ _id: note._id }, { $set: patch });
    lockedId = null;
    let message = "E-way bill saved. PDF pending; upload it or Fetch again.";
    if (result.pdfBase64) {
      try {
        const file = await storeEwaybillPdf(Buffer.from(result.pdfBase64, "base64"));
        await ConsignmentNote.updateOne({ _id: note._id }, { $set: { "ewaybill.file": file } });
        message = "E-way bill and PDF saved.";
      } catch { message = "E-way bill saved, but PDF storage failed. Upload the PDF or Fetch again."; }
    }
    const updated = await ConsignmentNote.findById(note._id).select("ewaybill").lean();
    return NextResponse.json({ success: true, data: updated.ewaybill, message });
  } catch (error) {
    if (lockedId) {
      let patch = {"ewaybill.apiState":recoveryContext?.action === 'fetch' ? recoveryContext.previousState : 'uncertain'};
      if (recoveryContext?.action === 'generate') {
        try {
          const recovery = await recoverEwaybill(recoveryContext.client,ewaybillStatusMethod(),recoveryContext.payload);
          patch = recovery.patch;
          error.message = `${error.message} ${recovery.message}`;
        } catch { /* Unreachable/unauthorised status cannot prove a safe retry. */ }
      }
      await ConsignmentNote.updateOne({ _id: lockedId }, { $set: patch });
    }
    return fail(error.message || "E-way bill request failed.", 400);
  }
}, { module: "Consignment Note", actions: ["create", "edit"] }));
