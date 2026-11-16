import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { withAuth } from "@/lib/auth";
import { withBranchAccess } from "@/lib/branchAccess";
import connectDb from "@/lib/db";
import { companyScopeFilter } from "@/lib/companyScope";
import ConsignmentNote from "../../ConsignmentNote";
import SubCompany from "@/models/SubCompany";
import { getOperatingCompanyFrappeConfig } from "@/lib/frappe-company-config.mjs";
import { createFrappeClient } from "@/lib/frappe-client.mjs";
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
    const { action } = await req.json();
    if (!["generate", "fetch"].includes(action)) return fail("Invalid action.");
    const method = process.env[action === "generate" ? "FRAPPE_EWAYBILL_GENERATE_METHOD" : "FRAPPE_EWAYBILL_FETCH_METHOD"];
    if (!method) return fail("E-way bill integration is not configured for this action.", 503);
    if (action === "fetch" && !/^\d{12}$/.test(note.ewaybill?.ewaybillNo?.replace(/\s/g, "") || "")) return fail("Save a 12-digit e-way bill number on the LR first.");
    if (action === "generate" && note.ewaybill?.ewaybillNo) return fail("An e-way bill number already exists. Use Fetch to retrieve it.", 409);
    if (action === "generate" && !note.invoice?.file?.filePath) return fail("Save the invoice on the LR first.");
    const company = await SubCompany.findOne({ _id: note.subCompanyId, companyId: note.companyId, isOperatingCompany: true, isActive: true }).lean();
    if (!company) return fail("The LR operating company is unavailable.");
    const config = getOperatingCompanyFrappeConfig(company, { purpose: "statutory" });
    const client = createFrappeClient();
    const locked = await ConsignmentNote.updateOne({ _id: note._id, "ewaybill.apiState": { $nin: action === "generate" ? ["processing", "uncertain"] : ["processing"] } }, { $set: { "ewaybill.apiState": "processing" } });
    if (!locked.modifiedCount) return fail("A request is processing or its outcome is uncertain. Reconcile with ERPNext before generating again.", 409);
    lockedId = note._id;
    const result = await client.call(method, { company: config.erpnextCompany, gstin: config.localGstin, external_id: `lr-ewaybill-${note._id}`, ewaybill_no: note.ewaybill?.ewaybillNo?.replace(/\s/g, ""), lr: { lrNo: note.lrNo, header: note.header, consignor: note.consignor, consignee: note.consignee, invoice: { ...note.invoice?.toObject(), file: undefined }, ewaybill: { containerNo: note.ewaybill?.containerNo }, consignmentBreakdown: note.consignmentBreakdown } });
    if (!/^\d{12}$/.test(String(result?.ewaybillNo || "")) || !result?.expiryDate) throw new Error("ERPNext returned incomplete e-way bill details. Reconcile before retrying generation.");
    if (action === "fetch" && String(result.ewaybillNo) !== note.ewaybill.ewaybillNo.replace(/\s/g, "")) throw new Error("ERPNext returned a different e-way bill number.");
    const patch = { "ewaybill.ewaybillNo": String(result.ewaybillNo), "ewaybill.expiryDate": result.expiryDate, "ewaybill.source": action === "generate" ? "generated" : "fetched", "ewaybill.apiState": "complete", "ewaybill.verifiedAt": new Date() };
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
    if (lockedId) await ConsignmentNote.updateOne({ _id: lockedId }, { $set: { "ewaybill.apiState": "uncertain" } });
    return fail(error.message || "E-way bill request failed.", 400);
  }
}, { module: "Consignment Note", actions: ["create", "edit"] }));
