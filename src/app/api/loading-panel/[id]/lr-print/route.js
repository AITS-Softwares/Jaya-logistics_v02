// app/api/loading-panel/[id]/lr-print/route.js
//
// Records that an LR was printed from the Loading Info page. Allowed only when VBP, VFT, VOT
// and VL are all Approved and every LR is created, approved and has its invoice.
// The first print of each LR is stored; when the last LR gets its first print, the
// Loading Info Out Date/Time is saved from that moment.
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDb from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { companyScopeFilter } from "@/lib/companyScope";
import LoadingPanel from "@/app/api/loading-panel/LoadingPanel";
import ConsignmentNote from "@/app/api/consignment-note/ConsignmentNote";
import { getLRCompletion, getLoadingApprovals, LOADING_APPROVAL_SELECT } from "../../findLRs";
import { recordOutAfterAllPrinted } from "../../lrOut";

export const runtime = "nodejs";

export const POST = withAuth(async (req, context, user) => {
    const fail = (message, status) => NextResponse.json({ success: false, message }, { status });
    try {
        const { id: panelId } = await context.params;
        const body = await req.json().catch(() => ({}));
        const lrId = body?.lrId;
        if (!mongoose.isValidObjectId(panelId) || !mongoose.isValidObjectId(lrId)) return fail("Invalid request.", 400);

        await connectDb();
        const panel = await LoadingPanel.findOne(companyScopeFilter(user, { _id: panelId }))
            .select("vehicleArrivalNo consignmentNote createdAt orderRows._id orderRows.orderNo orderRows.to orderRows.toName orderRows.weight " + LOADING_APPROVAL_SELECT)
            .lean();
        if (!panel) return fail("Loading Info not found.", 404);

        const approvals = getLoadingApprovals(panel);
        if (!approvals.allApproved) return fail(approvals.message, 403);

        const before = await getLRCompletion(user, panel);
        if (!before.complete) return fail(before.message || "All LRs must be created, approved and have their invoice uploaded.", 403);
        if (!before.notes.some((n) => String(n._id) === String(lrId))) return fail("This LR does not belong to this Loading Info.", 403);

        // First print only - re-prints never move the Out time.
        await ConsignmentNote.updateOne(
            companyScopeFilter(user, { _id: lrId, "header.printedAt": null }),
            { $set: { "header.printedAt": new Date() } }
        );

        const after = await getLRCompletion(user, panel);
        const out = await recordOutAfterAllPrinted(user, panelId, after);

        return NextResponse.json({
            success: true,
            data: {
                printed: after.counts.printed,
                expected: after.counts.expected,
                out, // { outDate, outTime } only on the print that completes the set
            },
        });
    } catch (error) {
        console.error("POST /api/loading-panel/[id]/lr-print error:", error);
        return fail("Unable to record the print.", 500);
    }
}, { module: "Loading Info", action: "view" });