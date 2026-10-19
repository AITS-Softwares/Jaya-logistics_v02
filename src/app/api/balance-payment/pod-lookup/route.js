// import { NextResponse } from "next/server";
// import connectDb from "@/lib/db";
// import POD from "@/app/api/pod-panel/POD";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { activeOperatingCompanyId, companyScopeFilter } from "@/lib/companyScope";
// import { getAdvanceSummaryMap, deriveBalanceForPod, getAdvanceBankDetails } from "@/lib/advanceSettlement";
// import { derivePodFigures } from "@/lib/paymentRules";

// export const runtime = "nodejs";

// // Balance-Payment permission ONLY: users need no Proof Of Delivery / Advance Payment access.
// function authorize(req) {
//     const token = getTokenFromHeader(req);
//     if (!token) return { error: "Authentication required. Please login.", status: 401 };
//     let user;
//     try {
//         user = verifyJWT(token);
//         if (!user) return { error: "Invalid or expired token. Please login again.", status: 401 };
//         activeOperatingCompanyId(user);
//     } catch (e) { return { error: e?.message || "Authentication failed.", status: 401 }; }
//     if (user.type === "company" || user.roles?.includes("Admin")) return { user };
//     const m = (user.modules || {})["Balance-Payment"];
//     const p = m?.permissions || {};
//     if (m?.selected && (p.view === true || p.create === true || p.edit === true)) return { user };
//     return { error: "Access denied. You don't have permission to access Balance Payment.", status: 403 };
// }

// export async function GET(req) {
//     try {
//         await connectDb();
//         const { user, error, status } = authorize(req);
//         if (error) return NextResponse.json({ success: false, message: error }, { status });
//         const podNo = new URL(req.url).searchParams.get("podNo");

//         if (podNo) {
//             const r = await deriveBalanceForPod(user, podNo);
//             if (r.error) return NextResponse.json({ success: false, message: r.error }, { status: r.status });
//             const { pod, adv } = r;
//             const f = derivePodFigures(pod, adv.advance);
//             return NextResponse.json({
//                 success: true, data: {
//                     _id: pod._id, podNo: pod.podNo, purchaseNo: pod.purchaseNo,
//                     companyName: pod.companyName, companyCode: pod.companyCode,
//                     subCompanyId: pod.subCompanyId, subCompanyName: pod.subCompanyName, subCompanyCode: pod.subCompanyCode,
//                     header: pod.header, purchaseOrders: pod.purchaseOrders,
//                     podStatusSection: { dueDate: pod.podStatusSection?.dueDate || "", podStatus: pod.podStatusSection?.podStatus || "" },
//                     vendorFinancial: {
//                         ...(pod.vendorFinancial || {}), advance: f.advance, poDeduction: 0,
//                         podDeduction: f.podDeduction, balance: f.balance, finalBalance: f.finalBalance
//                     },
//                     advanceSummary: { advance: adv.advance, pendingAdvance: adv.pendingAdvance },
//                     advanceBank: await getAdvanceBankDetails(user, pod.purchaseNo),
//                 }
//             });
//         }

//         const pods = await POD.find(companyScopeFilter(user))
//             .select("podNo purchaseNo companyName subCompanyName vendorFinancial products podStatus createdAt purchaseOrders.orderNo")
//             .sort({ createdAt: -1 }).limit(5000).lean();
//         const advMap = await getAdvanceSummaryMap(user, pods.map((p) => p.purchaseNo));
//         const data = pods.map((p) => {
//             const f = derivePodFigures(p, advMap.get(String(p.purchaseNo || "").trim())?.advance || 0);
//             return {
//                 _id: p._id, podNo: p.podNo, purchaseNo: p.purchaseNo, companyName: p.companyName || "",
//                 subCompanyName: p.subCompanyName || "", vendorName: p.vendorFinancial?.vendorName || "",
//                 vendorCode: p.vendorFinancial?.vendorCode || "", totalAmount: f.total,
//                 finalBalance: f.finalBalance, podStatus: p.podStatus || ""
//             };
//         });
//         return NextResponse.json({ success: true, data, count: data.length });
//     } catch (err) {
//         console.error("GET /balance-payment/pod-lookup error:", err);
//         return NextResponse.json({ success: false, message: err?.message || "Failed to load POD" }, { status: 500 });
//     }
// }
import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import POD from "@/app/api/pod-panel/POD";
import Plant from "@/app/api/plants/schema";
import PurchasePanel from "@/app/api/purchase-panel/PurchasePanel";
import BalancePayment from "@/app/api/balance-payment/BalancePayment";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { activeOperatingCompanyId, companyScopeFilter } from "@/lib/companyScope";
import { getAdvanceSummaryMap, deriveBalanceForPod, getAdvanceBankDetails } from "@/lib/advanceSettlement";
import { derivePodFigures } from "@/lib/paymentRules";

export const runtime = "nodejs";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
// Balance Payment is only possible for PODs that have been APPROVED on the POD approve page.
// approvalStatus is written by the server on approval; paymentStatus covers older approved PODs.
const APPROVED_PAYMENT_STATUSES = ["Approved", "Partially Paid", "Paid"];
const APPROVED_POD_FILTER = {
    isDraft: { $ne: true },
    podStatus: { $ne: "Rejected" },
    $or: [{ approvalStatus: "Approved" }, { paymentStatus: { $in: APPROVED_PAYMENT_STATUSES } }],
};
const isPodApproved = (p) =>
    !!p && !p.isDraft && p.podStatus !== "Rejected" && (p.approvalStatus === "Approved" || APPROVED_PAYMENT_STATUSES.includes(p.paymentStatus));

// Balance-Payment permission ONLY: users need no Proof Of Delivery / Advance Payment access.
function authorize(req) {
    const token = getTokenFromHeader(req);
    if (!token) return { error: "Authentication required. Please login.", status: 401 };
    let user;
    try {
        user = verifyJWT(token);
        if (!user) return { error: "Invalid or expired token. Please login again.", status: 401 };
        activeOperatingCompanyId(user);
    } catch (e) { return { error: e?.message || "Authentication failed.", status: 401 }; }
    if (user.type === "company" || user.roles?.includes("Admin")) return { user };
    const m = (user.modules || {})["Balance-Payment"];
    const p = m?.permissions || {};
    if (m?.selected && (p.view === true || p.create === true || p.edit === true)) return { user };
    return { error: "Access denied. You don't have permission to access Balance Payment.", status: 403 };
}

// The POD stores the plant's database _id in plantCode. Turn it into "Plant Name (CODE)" for display.
async function withPlantCodes(orders) {
    const raw = (orders || []).map((o) => (o?.toObject ? o.toObject() : o));
    const ids = [...new Set(raw.map((o) => String(o?.plantCode || "")).filter((id) => OBJECT_ID_RE.test(id)))];
    const docs = ids.length ? await Plant.find({ _id: { $in: ids } }).select("name code").lean() : [];
    const map = {};
    docs.forEach((p) => { map[String(p._id)] = p.name && p.code ? `${p.name} (${p.code})` : p.name || p.code || ""; });
    return raw.map((o) => {
        const pc = String(o?.plantCode || "");
        return { ...o, plantCode: map[pc] || (OBJECT_ID_RE.test(pc) ? "" : pc) };
    });
}

export async function GET(req) {
    try {
        await connectDb();
        const { user, error, status } = authorize(req);
        if (error) return NextResponse.json({ success: false, message: error }, { status });
        const podNo = new URL(req.url).searchParams.get("podNo");

        if (podNo) {
            const r = await deriveBalanceForPod(user, podNo);
            if (r.error) return NextResponse.json({ success: false, message: r.error }, { status: r.status });
            // fields = the single balance calculation (amount, advance, PO/POD additions & deductions, final balance, breakdown)
            const { pod, adv, fields: f } = r;
            if (!isPodApproved(pod)) {
                return NextResponse.json({ success: false, message: "This POD is not approved yet. Balance Payment can only be created for approved PODs." }, { status: 400 });
            }
            const purchaseOrders = await withPlantCodes(pod.purchaseOrders);
            // Vendor rate / weight / vehicle live on the Purchase Panel (the POD does not carry them).
            const purchaseNoKey = String(pod.purchaseNo || "").trim();
            const purchase = purchaseNoKey
                ? await PurchasePanel.findOne(companyScopeFilter(user, { purchaseNo: purchaseNoKey }))
                    .select("purchaseDetails.rate purchaseDetails.rateType purchaseDetails.weight purchaseDetails.amount purchaseDetails.vehicleNo purchaseDetails.vehicleType")
                    .lean()
                : null;
            const pdt = purchase?.purchaseDetails || {};
            return NextResponse.json({
                success: true, data: {
                    _id: pod._id, podNo: pod.podNo, purchaseNo: pod.purchaseNo,
                    companyName: pod.companyName, companyCode: pod.companyCode,
                    subCompanyId: pod.subCompanyId, subCompanyName: pod.subCompanyName, subCompanyCode: pod.subCompanyCode,
                    header: pod.header, purchaseOrders,
                    podStatusSection: { dueDate: pod.podStatusSection?.dueDate || "", podStatus: pod.podStatusSection?.podStatus || "" },
                    vendorFinancial: {
                        ...(pod.vendorFinancial || {}), advance: f.advance,
                        poAddition: f.poAddition, poDeduction: f.poDeduction, podDeduction: f.podDeduction,
                        totalAddition: f.totalAddition, totalDeduction: f.totalDeduction, finalBalance: f.finalBalance
                    },
                    purchaseDetails: {
                        rate: pdt.rate || 0, rateType: pdt.rateType || "", weight: pdt.weight || 0,
                        amount: pdt.amount || 0, vehicleNo: pdt.vehicleNo || "", vehicleType: pdt.vehicleType || ""
                    },
                    breakdown: f.breakdown,
                    advanceSummary: { advance: adv.advance, pendingAdvance: adv.pendingAdvance },
                    advanceBank: await getAdvanceBankDetails(user, pod.purchaseNo),
                }
            });
        }

        const pods = await POD.find(companyScopeFilter(user, APPROVED_POD_FILTER))
            .select("podNo purchaseNo companyName subCompanyName vendorFinancial products podStatus createdAt purchaseOrders.orderNo")
            .sort({ createdAt: -1 }).limit(5000).lean();
        const existingPayments = await BalancePayment.find(companyScopeFilter(user, { isDraft: { $ne: true } }))
            .select("podNo purchaseNo orderRows.orderNo")
            .lean();
        const paidPodNos = new Set(existingPayments.map((payment) => String(payment.podNo || "").trim()).filter(Boolean));
        const paidPurchaseNos = new Set(existingPayments.map((payment) => String(payment.purchaseNo || "").trim()).filter(Boolean));
        const paidOrderNos = new Set(existingPayments.flatMap((payment) => (payment.orderRows || [])
            .map((row) => String(row.orderNo || "").trim()).filter(Boolean)));
        const availablePods = pods.filter((pod) => {
            const podNoKey = String(pod.podNo || "").trim();
            const purchaseNoKey = String(pod.purchaseNo || "").trim();
            const orderNos = (pod.purchaseOrders || []).map((order) => String(order.orderNo || "").trim()).filter(Boolean);
            return !paidPodNos.has(podNoKey) && !paidPurchaseNos.has(purchaseNoKey) && !orderNos.some((orderNo) => paidOrderNos.has(orderNo));
        });
        if (new URL(req.url).searchParams.get("lookup") === "pendingCount") {
            return NextResponse.json({ success: true, data: { count: availablePods.length } });
        }
        const advMap = await getAdvanceSummaryMap(user, availablePods.map((p) => p.purchaseNo));
        const data = availablePods.map((p) => {
            const f = derivePodFigures(p, advMap.get(String(p.purchaseNo || "").trim())?.advance || 0);
            return {
                _id: p._id, podNo: p.podNo, purchaseNo: p.purchaseNo,
                orderNo: [...new Set((p.purchaseOrders || []).map((o) => o.orderNo).filter(Boolean))].join(", "),
                companyName: p.companyName || "",
                subCompanyName: p.subCompanyName || "", vendorName: p.vendorFinancial?.vendorName || "",
                vendorCode: p.vendorFinancial?.vendorCode || "", totalAmount: f.total,
                finalBalance: f.finalBalance, podStatus: p.podStatus || ""
            };
        });
        return NextResponse.json({ success: true, data, count: data.length });
    } catch (err) {
        console.error("GET /balance-payment/pod-lookup error:", err);
        return NextResponse.json({ success: false, message: err?.message || "Failed to load POD" }, { status: 500 });
    }
}
