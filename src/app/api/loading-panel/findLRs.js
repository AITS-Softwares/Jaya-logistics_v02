import ConsignmentNote from "@/app/api/consignment-note/ConsignmentNote";
import { companyScopeFilter } from "@/lib/companyScope";

const norm = (v) => String(v || "").replace(/[\s-]/g, "").toUpperCase();

export async function findLRsForPanel(user, panel, extraFilter = {}, projection = "") {
    const rows = panel.orderRows || [];
    const orderNos = [...new Set(rows.map((r) => String(r.orderNo || "").trim()).filter(Boolean))];
    const or = [];
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