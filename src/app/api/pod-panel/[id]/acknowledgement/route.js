import { withBranchAccess } from '@/lib/branchAccess';
import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { companyScopeFilter } from "@/lib/companyScope";
import POD from "@/app/api/pod-panel/POD";
import Supplier from "@/models/SupplierModels";
import EmailMaster from "@/models/emailMaster/emailMaster";
import { getEmailMasterIssue, sendMailFromEmailMaster } from "@/lib/emailMasterMailer";
import { buildPodAcknowledgementEmail, ACK_ALLOWED_STATUSES } from "@/lib/podAcknowledgementEmail";

export const runtime = "nodejs";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function fail(message, status = 400, extra = {}) {
    return NextResponse.json({ success: false, message, ...extra }, { status });
}

// Loads the POD (company scoped) and the supplier matched by its OWN vendor code.
async function load(user, id) {
    if (!OBJECT_ID_RE.test(id || "")) return { error: fail("Invalid POD id.", 400) };
    await connectDb();

    const pod = await POD.findOne(companyScopeFilter(user, { _id: id })).lean();
    if (!pod) return { error: fail("POD not found.", 404) };

    const vendorCode = pod.vendorFinancial?.vendorCode || "";
    const supplier = vendorCode
        ? await Supplier.findOne({ supplierCode: vendorCode, companyId: user.companyId })
            .select("supplierName emailId").lean()
        : null;
    const emailMaster = await EmailMaster.findOne({ companyId: user.companyId, status: "Active" })
        .sort({ updatedAt: -1, _id: -1 }).lean();

    const email = String(supplier?.emailId || "").trim();
    const status = pod.podStatusSection?.podStatus || pod.podStatus || "Pending";
    const { subject, html } = buildPodAcknowledgementEmail(pod, {
        supplierName: supplier?.supplierName || pod.vendorFinancial?.vendorName,
        companyName: pod.companyName,
    });

    let blockedReason = "";
    const emailMasterIssue = getEmailMasterIssue(emailMaster);
    if (emailMasterIssue) blockedReason = emailMasterIssue;
    else if (pod.approvalStatus !== "Approved") blockedReason = "Approve this POD before sending its acknowledgement email.";
    else if (!supplier) blockedReason = "Supplier not found for this vendor code.";
    else if (!EMAIL_RE.test(email)) blockedReason = "Supplier has no valid email ID. Add it in Supplier Management.";
    else if (!ACK_ALLOWED_STATUSES.includes(status)) {
        blockedReason = `POD status is "${status}". Set the POD status (Received / Clear & Ok / Deductions) before sending.`;
    }

    return { pod, supplier, emailMaster, email, status, subject, html, blockedReason };
}

// GET -> preview of the exact email that will be sent
const branchHandlerGET = withAuth(
    async (req, context, user) => {
        try {
            const { id } = await context.params;
            const r = await load(user, id);
            if (r.error) return r.error;
            const s = r.pod.podStatusSection || {};
            return NextResponse.json({
                success: true,
                data: {
                    to: r.email,
                    from: r.emailMaster?.email || "",
                    supplierName: r.supplier?.supplierName || r.pod.vendorFinancial?.vendorName || "",
                    subject: r.subject,
                    html: r.html,
                    canSend: !r.blockedReason,
                    blockedReason: r.blockedReason,
                    alreadySent: !!s.ackMailSentAt,
                    sentAt: s.ackMailSentAt || null,
                    sentBy: s.ackMailSentBy || "",
                    sentTo: s.ackMailTo || "",
                },
            });
        } catch (err) {
            console.error("GET POD acknowledgement preview error:", err);
            return fail("Failed to build email preview.", 500);
        }
    },
    { module: "Proof Of Delivery", action: "approve" }
);

// POST -> really send it (server decides recipient + content)
const branchHandlerPOST = withAuth(
    async (req, context, user) => {
        try {
            const { id } = await context.params;
            const r = await load(user, id);
            if (r.error) return r.error;
            if (r.blockedReason) return fail(r.blockedReason, 400);

            await sendMailFromEmailMaster({ emailMaster: r.emailMaster, to: r.email, subject: r.subject, html: r.html });

            const sentAt = new Date();
            await POD.updateOne(
                { _id: r.pod._id },
                {
                    $set: {
                        "podStatusSection.acknowledgementMail": true,
                        "podStatusSection.ackMailSentAt": sentAt,
                        "podStatusSection.ackMailSentBy": user.name || "",
                        "podStatusSection.ackMailTo": r.email,
                    },
                    $inc: { "podStatusSection.ackMailCount": 1 },
                }
            );

            return NextResponse.json({
                success: true,
                message: `Acknowledgement sent to ${r.email}`,
                data: { to: r.email, sentAt, sentBy: user.name || "" },
            });
        } catch (err) {
            console.error("POST POD acknowledgement send error:", err);
            return fail(err?.message || "Failed to send email.", 500);
        }
    },
    { module: "Proof Of Delivery", action: "approve" }
);

export const GET = withBranchAccess(branchHandlerGET);
export const POST = withBranchAccess(branchHandlerPOST);
