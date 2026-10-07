import { NextResponse } from "next/server";
import mongoose from "mongoose";
import path from "path";
import { readFile } from "fs/promises";
import connectDb from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { companyScopeFilter } from "@/lib/companyScope";
import LoadingPanel from "@/app/api/loading-panel/LoadingPanel";
import ConsignmentNote from "@/app/api/consignment-note/ConsignmentNote";
import { findLRsForPanel } from "../../findLRs";

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
        .select("vehicleArrivalNo consignmentNote orderRows.orderNo orderRows.to orderRows.toName orderRows.weight").lean();
    if (!panel) return fail("Loading Info not found.", 404);

    const note = (await findLRsForPanel(user, panel, { _id: lrId }, "invoice.file loadingInfoNo header.orderNo header.to consignmentBreakdown"))[0];
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