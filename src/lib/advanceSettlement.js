// import AdvancePayment from "@/app/api/Advance-Payment/AdvancePayment";
// import POD from "@/app/api/pod-panel/POD";
// import { companyScopeFilter } from "@/lib/companyScope";
// import { summarizeAdvances, deriveBalanceFields } from "@/lib/paymentRules";

// const ADV_SELECT = "paymentNo purchaseNo status queueGenerated paymentDetails.paymentStatus paymentDetails.finalAmount vendorDetails.advance";

// export async function getPaidAdvanceForPurchase(user, purchaseNo) {
//     const no = String(purchaseNo ?? "").trim();
//     if (!no) return summarizeAdvances([]);
//     const payments = await AdvancePayment.find(companyScopeFilter(user, { purchaseNo: no })).select(ADV_SELECT).lean();
//     return summarizeAdvances(payments);
// }

// export async function getAdvanceSummaryMap(user, purchaseNos) {
//     const nos = [...new Set((purchaseNos || []).map((v) => String(v ?? "").trim()).filter(Boolean))];
//     const map = new Map();
//     if (!nos.length) return map;
//     const payments = await AdvancePayment.find(companyScopeFilter(user, { purchaseNo: { $in: nos } })).select(ADV_SELECT).lean();
//     const grouped = new Map();
//     for (const p of payments) {
//         if (!grouped.has(p.purchaseNo)) grouped.set(p.purchaseNo, []);
//         grouped.get(p.purchaseNo).push(p);
//     }
//     for (const no of nos) map.set(no, summarizeAdvances(grouped.get(no) || []));
//     return map;
// }

// // Re-apply the paid advance to every POD of a purchase (POD pre-save recalculates balances). Never throws.
// export async function syncPodAdvanceForPurchase(user, purchaseNo) {
//     try {
//         const no = String(purchaseNo ?? "").trim();
//         if (!no) return 0;
//         const { advance } = await getPaidAdvanceForPurchase(user, no);
//         const pods = await POD.find(companyScopeFilter(user, { purchaseNo: no }));
//         let changed = 0;
//         for (const pod of pods) {
//             if (!pod.vendorFinancial || Number(pod.vendorFinancial.advance) === advance) continue;
//             try { pod.vendorFinancial.advance = advance; await pod.save(); changed++; }
//             catch (e) { console.warn("POD advance sync failed for", pod.podNo, e?.message); }
//         }
//         return changed;
//     } catch (e) { console.warn("syncPodAdvanceForPurchase failed:", e?.message); return 0; }
// }

// export async function deriveBalanceForPod(user, podNo) {
//     const no = String(podNo ?? "").trim();
//     if (!no) return { error: "POD number is required", status: 400 };
//     const pod = await POD.findOne(companyScopeFilter(user, { podNo: no })).lean();
//     if (!pod) return { error: "POD not found", status: 404 };
//     const adv = await getPaidAdvanceForPurchase(user, pod.purchaseNo);
//     return { pod, adv, fields: deriveBalanceFields(pod, adv.advance) };
// }

// // Payee details only: no UTR, no remarks.
// export async function getAdvanceBankDetails(user, purchaseNo) {
//     const no = String(purchaseNo ?? "").trim();
//     if (!no) return {};
//     const a = await AdvancePayment.findOne(companyScopeFilter(user, { purchaseNo: no, status: { $ne: "Rejected" } }))
//         .select("vendorDetails.accountNo vendorDetails.vendorCode paymentDetails.vendorNameDebit paymentDetails.accountNoCredit paymentDetails.bankVendorCode")
//         .sort({ createdAt: -1 }).lean();
//     if (!a) return {};
//     return {
//         vendorNameDebit: a.paymentDetails?.vendorNameDebit || "",
//         accountNoCredit: a.paymentDetails?.accountNoCredit || a.vendorDetails?.accountNo || "",
//         bankVendorCode: a.paymentDetails?.bankVendorCode || a.vendorDetails?.vendorCode || "",
//     };
// }

import AdvancePayment from "@/app/api/Advance-Payment/AdvancePayment";
import POD from "@/app/api/pod-panel/POD";
import { companyScopeFilter } from "@/lib/companyScope";
import PurchasePanel from "@/app/api/purchase-panel/PurchasePanel";
import LoadingPanel from "@/app/api/loading-panel/LoadingPanel";
import { summarizeAdvances, deriveBalanceFields, buildAdjustments } from "@/lib/paymentRules";

const ADV_SELECT = "paymentNo purchaseNo status queueGenerated paymentDetails.paymentStatus paymentDetails.finalAmount vendorDetails.advance";

export async function getPaidAdvanceForPurchase(user, purchaseNo) {
    const no = String(purchaseNo ?? "").trim();
    if (!no) return summarizeAdvances([]);
    const payments = await AdvancePayment.find(companyScopeFilter(user, { purchaseNo: no })).select(ADV_SELECT).lean();
    return summarizeAdvances(payments);
}

export async function getAdvanceSummaryMap(user, purchaseNos) {
    const nos = [...new Set((purchaseNos || []).map((v) => String(v ?? "").trim()).filter(Boolean))];
    const map = new Map();
    if (!nos.length) return map;
    const payments = await AdvancePayment.find(companyScopeFilter(user, { purchaseNo: { $in: nos } })).select(ADV_SELECT).lean();
    const grouped = new Map();
    for (const p of payments) {
        if (!grouped.has(p.purchaseNo)) grouped.set(p.purchaseNo, []);
        grouped.get(p.purchaseNo).push(p);
    }
    for (const no of nos) map.set(no, summarizeAdvances(grouped.get(no) || []));
    return map;
}

// Re-apply the paid advance to every POD of a purchase (POD pre-save recalculates balances). Never throws.
export async function syncPodAdvanceForPurchase(user, purchaseNo) {
    try {
        const no = String(purchaseNo ?? "").trim();
        if (!no) return 0;
        const { advance } = await getPaidAdvanceForPurchase(user, no);
        const pods = await POD.find(companyScopeFilter(user, { purchaseNo: no }));
        let changed = 0;
        for (const pod of pods) {
            if (!pod.vendorFinancial || Number(pod.vendorFinancial.advance) === advance) continue;
            try { pod.vendorFinancial.advance = advance; await pod.save(); changed++; }
            catch (e) { console.warn("POD advance sync failed for", pod.podNo, e?.message); }
        }
        return changed;
    } catch (e) { console.warn("syncPodAdvanceForPurchase failed:", e?.message); return 0; }
}

export async function getPurchaseAdjustments(user, purchaseNo) {
    const no = String(purchaseNo ?? "").trim();
    if (!no) return buildAdjustments(null);
    const purchase = await PurchasePanel.findOne(companyScopeFilter(user, { purchaseNo: no })).lean();
    if (!purchase) return buildAdjustments(null);
    const loadingInfo = purchase.loadingInfoNo
        ? await LoadingPanel.findOne(companyScopeFilter(user, { vehicleArrivalNo: purchase.loadingInfoNo })).lean()
        : null;
    return buildAdjustments(purchase, loadingInfo);
}

export async function deriveBalanceForPod(user, podNo) {
    const no = String(podNo ?? "").trim();
    if (!no) return { error: "POD number is required", status: 400 };
    const pod = await POD.findOne(companyScopeFilter(user, { podNo: no })).lean();
    if (!pod) return { error: "POD not found", status: 404 };
    const adv = await getPaidAdvanceForPurchase(user, pod.purchaseNo);
    const adj = await getPurchaseAdjustments(user, pod.purchaseNo);
    return { pod, adv, adj, fields: deriveBalanceFields(pod, adv.advance, adj) };
}

// Payee details only: no UTR, no remarks.
export async function getAdvanceBankDetails(user, purchaseNo) {
    const no = String(purchaseNo ?? "").trim();
    if (!no) return {};
    const a = await AdvancePayment.findOne(companyScopeFilter(user, { purchaseNo: no, status: { $ne: "Rejected" } }))
        .select("vendorDetails.accountNo vendorDetails.vendorCode paymentDetails.vendorNameDebit paymentDetails.accountNoCredit paymentDetails.bankVendorCode")
        .sort({ createdAt: -1 }).lean();
    if (!a) return {};
    return {
        vendorNameDebit: a.paymentDetails?.vendorNameDebit || "",
        accountNoCredit: a.paymentDetails?.accountNoCredit || a.vendorDetails?.accountNo || "",
        bankVendorCode: a.paymentDetails?.bankVendorCode || a.vendorDetails?.vendorCode || "",
    };
}