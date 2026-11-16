import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { withAuth } from "@/lib/auth";
import { withBranchAccess } from "@/lib/branchAccess";
import connectDb from "@/lib/db";
import { companyScopeFilter } from "@/lib/companyScope";
import LoadingPanel from "../../LoadingPanel";
import { getLRCompletion, getLoadingGate } from "../../findLRs";
import { readEwaybillPdf } from "@/lib/ewaybill-file";
export const runtime = "nodejs";
const fail = (message, status = 403) => NextResponse.json({ success: false, message }, { status });
export const GET = withBranchAccess(withAuth(async (req, context, user) => {
  try {
    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) return fail("Invalid Loading Info.", 400);
    await connectDb();
    const panel = await LoadingPanel.findOne(companyScopeFilter(user, { _id: id })).lean();
    if (!panel) return fail("Loading Info not found.", 404);
    const completion = await getLRCompletion(user, panel);
    const gate = await getLoadingGate(user, panel);
    const review = Boolean((panel.reapprovalState && panel.reapprovalState !== "none") || panel.upstreamPending?.length);
    const allowed = completion.complete && gate.allApproved && !review;
    const message = review ? "Loading Info has pending upstream review." : !gate.allApproved ? gate.message : completion.message;
    const url = new URL(req.url);
    if (!url.searchParams.has("lrId")) return NextResponse.json({ success: true, data: { allowed, message, counts: completion.counts, ready: completion.ready, complete: completion.complete, approvals: gate, rows: completion.rows.map(row => ({ ...row, lrNo: row.lr?.lrNo || row.orderNo, status: row.lr ? "LR incomplete" : "LR pending", ...(() => {
      const n = completion.notes.find(n => String(n._id) === String(row.lr?._id));
      return n ? { id: String(n._id), lrNo: n.lrNo, status: n.ewaybill?.ewaybillNo ? "Recorded" : "Pending", number: allowed ? n.ewaybill?.ewaybillNo : undefined, expiry: allowed ? n.ewaybill?.expiryDate : undefined, container: allowed ? n.ewaybill?.containerNo : undefined, hasFile: allowed && Boolean(n.ewaybill?.file?.storageName) } : {};
    })() })) } });
    if (!allowed) return fail(message || "All LRs and approvals must be complete.");
    const note = completion.notes.find(n => String(n._id) === url.searchParams.get("lrId"));
    if (!note) return fail("LR does not belong to this Loading Info.");
    if ((note.reapprovalState && note.reapprovalState !== "none") || note.upstreamPending?.length) return fail("LR has pending upstream review.");
    if (url.searchParams.get("print") === "1" && panel.loadingWorkflow?.version === 2 && panel.loadingWorkflow?.part2Status !== "Approved") return fail("Loading Info Part 2 must be approved before printing.");
    return new NextResponse(await readEwaybillPdf(note.ewaybill?.file), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline", "Cache-Control": "private, no-store" } });
  } catch { return fail("E-way bill document unavailable.", 404); }
}, { module: "Loading Info", action: "view" }));
