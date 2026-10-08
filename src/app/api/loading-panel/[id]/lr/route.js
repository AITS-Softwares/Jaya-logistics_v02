// app/api/loading-panel/[id]/lr/route.js
//
// READ-ONLY lookup of the Consignment Note(s) (LR) created for a Loading Info.
//
// Loading Info users are not allowed to create or edit LRs, and they may not
// have any "Consignment Note" module access either. This endpoint therefore
// only requires the Loading Info "view" permission and can never write.
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDb from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { companyScopeFilter } from "@/lib/companyScope";
import LoadingPanel from "@/app/api/loading-panel/LoadingPanel";
import ConsignmentNote from "@/app/api/consignment-note/ConsignmentNote";
import { getLRCompletion, getLoadingApprovals, LOADING_APPROVAL_SELECT } from "../../findLRs";

export const runtime = "nodejs";

export const GET = withAuth(async (req, context, user) => {
    try {
        // Next.js 15 exposes dynamic route params asynchronously.
        const { id: panelId } = await context.params;
        if (!panelId || !mongoose.Types.ObjectId.isValid(panelId)) {
            return NextResponse.json({ success: false, message: "Valid Loading Info ID is required." }, { status: 400 });
        }

        await connectDb();

        const panel = await LoadingPanel.findOne(companyScopeFilter(user, { _id: panelId }))
            .select("vehicleArrivalNo consignmentNote orderRows._id orderRows.orderNo orderRows.to orderRows.toName orderRows.weight " + LOADING_APPROVAL_SELECT)
            .lean();
        if (!panel) {
            return NextResponse.json({ success: false, message: "Loading Info not found." }, { status: 404 });
        }

        // Each LR is released on its own once it is approved AND has its invoice.
        // Rows still waiting are returned as a light summary (no LR content).
        const c = await getLRCompletion(user, panel);
        // LRs / invoices open only when VBP, VFT, VOT and VL are all Approved.
        const approvals = getLoadingApprovals(panel);

        return NextResponse.json({
            success: true,
            data: {
                loadingInfoNo: panel.vehicleArrivalNo || "",
                consignmentNote: c.complete && approvals.allApproved ? (panel.consignmentNote || c.notes[0]?.lrNo || "") : "",
                rows: c.rows,
                counts: c.counts,
                generated: c.complete,
                complete: c.complete,
                total: c.total,
                ready: c.ready,
                pending: c.pending,
                message: approvals.allApproved ? c.message : approvals.message,
                approvals,
                notes: approvals.allApproved ? c.notes : [],
            },
        });
    } catch (error) {
        console.error("GET /api/loading-panel/[id]/lr error:", error);
        return NextResponse.json({ success: false, message: "Unable to load the Consignment Note." }, { status: 500 });
    }
}, { module: "Loading Info", action: "view" });