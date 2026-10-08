import { NextResponse } from "next/server";
import mongoose from "mongoose";
import path from "path";
import { readFile } from "fs/promises";
import connectDb from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { companyScopeFilter } from "@/lib/companyScope";
import LoadingPanel from "@/app/api/loading-panel/LoadingPanel";
import ConsignmentNote from "@/app/api/consignment-note/ConsignmentNote";
import { getLRCompletion, LR_COMPLETION_SELECT, getLoadingApprovals, LOADING_APPROVAL_SELECT } from "../../findLRs";

export const runtime = "nodejs";

async function readInvoiceFile(name) {
    const locations = [
        path.join(process.cwd(), "public", "uploads", "lr-invoice", name),
        path.join(process.cwd(), "uploads", "lr-invoice", name),
    ];
    let missing;
    for (const loc of locations) {
        try { return await readFile(loc); }
        catch (e) { if (e?.code !== "ENOENT") throw e; missing = e; }
    }
    throw missing;
}

export const GET = withAuth(async (req, context, user) => {
    const { id } = await context.params;
    const lrId = new URL(req.url).searchParams.get("lrId");
    const fail = (m, s) => NextResponse.json({ success: false, message: m }, { status: s });
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(lrId)) return fail("Invalid request.", 400);

    await connectDb();
    const panel = await LoadingPanel.findOne(companyScopeFilter(user, { _id: id }))
        .select("vehicleArrivalNo consignmentNote orderRows._id orderRows.orderNo orderRows.to orderRows.toName orderRows.weight " + LOADING_APPROVAL_SELECT).lean();
    if (!panel) return fail("Loading Info not found.", 404);

    // Block unless VBP, VFT, VOT and VL are all Approved.
    const approvals = getLoadingApprovals(panel);
    if (!approvals.allApproved) return fail(approvals.message, 403);

    // Invoices are released only when every LR of this Loading Info is approved with its invoice.
    const c = await getLRCompletion(user, panel, LR_COMPLETION_SELECT);
    // Each invoice opens as soon as its own LR is approved and the invoice is uploaded.
    const note = c.notes.find((n) => String(n._id) === String(lrId));
    if (!note) return fail("This invoice is available once its LR is approved and the invoice is uploaded.", 403);
    const f = note?.invoice?.file;
    if (!f?.filePath) return fail("No invoice uploaded for this LR.", 404);

    try {
        const buf = await readInvoiceFile(path.basename(f.filePath));
        return new NextResponse(buf, {
            headers: {
                "Content-Type": f.mimeType || "application/octet-stream",
                "Content-Disposition": "inline", "Cache-Control": "private, no-store"
            }
        });
    } catch { return fail("Invoice file is no longer on the server.", 404); }
}, { module: "Loading Info", action: "view" });