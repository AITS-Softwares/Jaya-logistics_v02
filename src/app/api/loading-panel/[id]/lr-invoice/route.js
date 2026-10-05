import { NextResponse } from "next/server";
import mongoose from "mongoose";
import path from "path";
import { readFile } from "fs/promises";
import connectDb from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { companyScopeFilter } from "@/lib/companyScope";
import LoadingPanel from "@/app/api/loading-panel/LoadingPanel";
import ConsignmentNote from "@/app/api/consignment-note/ConsignmentNote";

export const runtime = "nodejs";

export const GET = withAuth(async (req, context, user) => {
    const { id } = await context.params;
    const lrId = new URL(req.url).searchParams.get("lrId");
    const fail = (m, s) => NextResponse.json({ success: false, message: m }, { status: s });
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(lrId)) return fail("Invalid request.", 400);

    await connectDb();
    const panel = await LoadingPanel.findOne(companyScopeFilter(user, { _id: id })).select("vehicleArrivalNo").lean();
    if (!panel?.vehicleArrivalNo) return fail("Loading Info not found.", 404);

    const note = await ConsignmentNote.findOne(
        companyScopeFilter(user, { _id: lrId, loadingInfoNo: panel.vehicleArrivalNo })
    ).select("invoice.file").lean();
    const f = note?.invoice?.file;
    if (!f?.filePath) return fail("No invoice uploaded for this LR.", 404);

    try {
        const buf = await readFile(path.join(process.cwd(), "uploads", "lr-invoice", path.basename(f.filePath)));
        return new NextResponse(buf, {
            headers: {
                "Content-Type": f.mimeType || "application/octet-stream",
                "Content-Disposition": "inline", "Cache-Control": "private, no-store"
            }
        });
    } catch { return fail("Invoice file is no longer on the server.", 404); }
}, { module: "Loading Info", action: "view" });