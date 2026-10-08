import ConsignmentNote from "@/app/api/consignment-note/ConsignmentNote";
import { companyScopeFilter } from "@/lib/companyScope";

const norm = (v) => String(v || "").replace(/[\s-]/g, "").toUpperCase();

export async function findLRsForPanel(user, panel, extraFilter = {}, projection = "") {
    const rows = panel.orderRows || [];
    const orderNos = [...new Set(rows.map((r) => String(r.orderNo || "").trim()).filter(Boolean))];
    const rowIds = rows.map((r) => String(r._id || "")).filter(Boolean);
    const or = [];
    // An LR created for one of this Loading Info's order rows belongs to it, whatever its other fields say.
    if (rowIds.length) or.push({ orderRowId: { $in: rowIds } });
    if (panel.vehicleArrivalNo) or.push({ loadingInfoNo: panel.vehicleArrivalNo });
    if (orderNos.length) or.push({ loadingInfoNo: "", "header.orderNo": { $in: orderNos } });
    if (!or.length) return [];

    const notes = await ConsignmentNote.find(companyScopeFilter(user, {
        $or: or,
        "header.status": { $in: ["Approved", "Completed"] },
        ...extraFilter,
    })).select(projection).sort({ createdAt: 1 }).lean();

    return notes.filter((n) => {
        if (n.loadingInfoNo === panel.vehicleArrivalNo) return true;
        if (n.orderRowId && rowIds.includes(String(n.orderRowId))) return true;
        // An unlinked (legacy) LR created before this loading cannot belong to it.
        if (panel.createdAt && n.createdAt && new Date(n.createdAt) < new Date(panel.createdAt)) return false;
        const b = n.consignmentBreakdown?.[0] || {};
        const w = Number(b.weight);
        const to = norm(b.to || n.header?.to);
        return rows.some((r) =>
            norm(r.orderNo) === norm(n.header?.orderNo) &&
            norm(r.toName || r.to) === to &&
            (!w || Number(r.weight) === w));
    });
}

/* ========================================================================
   LR completion
   ------------------------------------------------------------------------
   A Loading Info expects one LR per order row (sub-order). Its LRs and
   invoices are only shown, and its Out Date/Time is only set, once EVERY row
   is covered by an LR that is Approved/Completed AND has an invoice uploaded.
   ======================================================================== */
const APPROVED = ["Approved", "Completed"];
const hasInvoice = (n) => Boolean(n?.invoice?.file?.filePath);
const printTime = (n) => (n?.header?.printedAt ? new Date(n.header.printedAt).getTime() : NaN);

export const LR_COMPLETION_SELECT =
    "lrNo orderRowId loadingInfoNo invoice.file header.status header.approvedAt header.printedAt header.orderNo header.to " +
    "consignmentBreakdown createdAt updatedAt";

const rowLabel = (r) => {
    const to = r.toName || r.to;
    const w = Number(r.weight);
    return [r.orderNo ? `Order ${r.orderNo}` : "Order", to ? `to ${to}` : "", w ? `${w} MT` : ""].filter(Boolean).join(" · ");
};

/** Which order rows does this LR cover? `claimed` stops two LRs claiming the same row by fuzzy match. */
function rowsCoveredBy(note, rows, panel, claimed) {
    const covered = [];
    const byId = note.orderRowId ? rows.find((r) => String(r._id) === String(note.orderRowId)) : null;
    if (byId) return [byId];

    const breakdown = Array.isArray(note.consignmentBreakdown) && note.consignmentBreakdown.length
        ? note.consignmentBreakdown : null;

    // Legacy single LR for the whole Loading Info (no row id, no breakdown).
    if (!note.orderRowId && !breakdown && note.loadingInfoNo && note.loadingInfoNo === panel.vehicleArrivalNo) return [...rows];

    const items = breakdown || [{ orderNo: note.header?.orderNo, to: note.header?.to, weight: 0 }];
    const matches = (r) => items.some((b) => {
        const orderNo = b.orderNo || note.header?.orderNo;
        const to = b.to || note.header?.to;
        const w = Number(b.weight);
        return norm(orderNo) === norm(r.orderNo) &&
            (!to || norm(to) === norm(r.toName) || norm(to) === norm(r.to)) &&
            (!w || w === Number(r.weight));
    });

    if (note.orderRowId || !breakdown) {
        // A per-row LR: it covers exactly one row. Take the first matching row nobody else holds.
        const r = rows.find((x) => matches(x) && !claimed.has(String(x._id)));
        return r ? [r] : [];
    }
    rows.forEach((r) => { if (matches(r)) covered.push(r); });
    return covered;
}

/** Plain summary of one LR for the Loading Info screen (no sensitive/heavy fields). */
const summarize = (n) => ({
    _id: String(n._id),
    lrNo: n.lrNo || "",
    status: n.header?.status || "",
    approved: APPROVED.includes(n.header?.status),
    invoiceUploaded: hasInvoice(n),
    printed: Boolean(n.header?.printedAt),
    printedAt: n.header?.printedAt || null,
    invoiceNo: n.invoice?.boeInvoiceNo || "",
    invoiceFileName: n.invoice?.file?.fileName || "",
});

/** State of one order row, given the LR(s) attached to it. */
function describe(notes) {
    const good = notes.find((n) => APPROVED.includes(n.header?.status) && hasInvoice(n));
    const best = good || notes.find((n) => APPROVED.includes(n.header?.status)) || notes.find(hasInvoice) || notes[0] || null;
    if (!best) return { state: "missing", reason: "LR not created yet", lr: null, good: null };
    const issues = [
        !APPROVED.includes(best.header?.status) && "LR not approved yet",
        !hasInvoice(best) && "Invoice not uploaded",
    ].filter(Boolean);
    return { state: good ? "ready" : "incomplete", reason: issues.join(" · "), lr: summarize(best), good };
}

export async function getLRCompletion(user, panel, projection = "-companyId -createdBy -updatedBy -__v") {
    const rows = panel.orderRows || [];
    // Every LR linked to this Loading Info, whatever its status.
    const all = await findLRsForPanel(user, panel, { "header.status": { $exists: true } }, projection);

    const state = new Map(rows.map((r) => [String(r._id), { row: r, notes: [] }]));
    const claimed = new Set();
    const attached = new Set();
    const claim = (note, list) => list.forEach((r) => {
        claimed.add(String(r._id));
        attached.add(String(note._id));
        state.get(String(r._id))?.notes.push(note);
    });

    // Pass 1: LRs with a valid row id claim their own row; pass 2: everything else.
    const direct = (n) => n.orderRowId && rows.some((r) => String(r._id) === String(n.orderRowId));
    all.filter(direct).forEach((n) => claim(n, rowsCoveredBy(n, rows, panel, claimed)));
    all.filter((n) => !direct(n)).forEach((n) => claim(n, rowsCoveredBy(n, rows, panel, claimed)));

    // Pass 3: a row still without an LR takes a leftover LR of the same order
    // (e.g. its weight/destination was edited after it was created).
    for (const s of state.values()) {
        if (s.notes.length) continue;
        const left = all.filter((n) => !attached.has(String(n._id)) && !direct(n) && norm(n.header?.orderNo) === norm(s.row.orderNo));
        const rowTo = norm(s.row.toName || s.row.to);
        const pick = left.find((n) => norm(n.consignmentBreakdown?.[0]?.to || n.header?.to) === rowTo) || left[0];
        if (pick) claim(pick, [s.row]);
    }

    const pending = [];
    const readyNotes = new Map();
    const rowsOut = [];
    let ready = 0;
    for (const { row, notes } of state.values()) {
        const d = describe(notes);
        rowsOut.push({
            rowId: String(row._id), orderNo: row.orderNo || "", to: row.toName || row.to || "",
            weight: Number(row.weight) || 0, label: rowLabel(row),
            state: d.state, reason: d.reason, lr: d.lr,
        });
        if (d.good) { ready += 1; readyNotes.set(String(d.good._id), d.good); continue; }
        pending.push({ rowId: String(row._id), label: rowLabel(row), reason: d.reason.split(" · ")[0] });
    }

    let total = rows.length;
    if (!total) {
        // No order rows to compare against: judge by the LRs that exist.
        const approvedNotes = all.filter((n) => APPROVED.includes(n.header?.status));
        total = approvedNotes.length;
        approvedNotes.filter(hasInvoice).forEach((n) => readyNotes.set(String(n._id), n));
        ready = readyNotes.size;
        all.forEach((n) => {
            const b = n.consignmentBreakdown?.[0] || {};
            const d = describe([n]);
            rowsOut.push({
                rowId: String(n._id), orderNo: n.header?.orderNo || "", to: b.to || n.header?.to || "",
                weight: Number(b.weight) || 0, label: [n.header?.orderNo ? `Order ${n.header.orderNo}` : "", b.to || n.header?.to ? `to ${b.to || n.header.to}` : ""].filter(Boolean).join(" · "),
                state: d.state, reason: d.reason, lr: d.lr,
            });
        });
    }

    const complete = total > 0 && ready >= total;
    const notes = [...readyNotes.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    // Out time = moment the LAST LR got its first print (any order). Null until every LR is printed.
    const printTimes = notes.map(printTime);
    const allPrinted = notes.length > 0 && printTimes.every(Number.isFinite);
    const completedAt = complete && allPrinted ? new Date(Math.max(...printTimes)) : null;

    const counts = {
        expected: rowsOut.length,
        created: rowsOut.filter((r) => r.lr).length,
        approved: rowsOut.filter((r) => r.lr?.approved).length,
        invoiceUploaded: rowsOut.filter((r) => r.lr?.invoiceUploaded).length,
        printed: rowsOut.filter((r) => r.lr?.printed).length,
    };

    const message = complete ? "" :
        `${ready} out of ${total} LR${total === 1 ? " is" : "s are"} created, approved and have the invoice uploaded. ` +
        `The LR and invoice will be available here once all ${total} are done.`;

    return { total, ready, complete, pending, rows: rowsOut, counts, notes, completedAt, message };
}


/* ========================================================================
   Loading Info approvals
   ------------------------------------------------------------------------
   The Loading Info has 4 approval statuses: VBP, VFT, VOT and VL.
   LRs and invoices may be viewed / printed only when ALL 4 are "Approved".
   ======================================================================== */
export const LOADING_APPROVAL_SELECT =
    "vbpUploads.approval vftUploads.approval votUploads.approval vlUploads.approval";

export function getLoadingApprovals(panel) {
    const items = [
        ["VBP", panel?.vbpUploads?.approval],
        ["VFT", panel?.vftUploads?.approval],
        ["VOT", panel?.votUploads?.approval],
        ["VL", panel?.vlUploads?.approval],
    ].map(([key, value]) => ({
        key,
        value: value || "Not Set",
        approved: String(value || "").trim().toLowerCase() === "approved",
    }));
    const pending = items.filter((i) => !i.approved);
    const allApproved = pending.length === 0;
    return {
        allApproved,
        items,
        pending: pending.map((i) => i.key),
        message: allApproved ? "" :
            `Not Approved: ${pending.map((i) => i.key).join(", ")} ${pending.length === 1 ? "is" : "are"} not approved yet. ` +
            "LR and Invoice can be viewed and printed only when VBP, VFT, VOT and VL are all Approved.",
    };
}