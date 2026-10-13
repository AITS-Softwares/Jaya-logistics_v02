// // Pure payment rules (no imports): shared by API routes, scripts and tests.
// export const PAID_ADVANCE_STATUSES = ["Paid", "Completed"];
// export const ADVANCE_STATUSES = ["Pending", "Approved", "Rejected", "Paid", "Completed"];
// export const BALANCE_STATUSES = ["Pending", "Queued", "Approved", "Rejected", "Completed", "Paid"];
// export const SETTLED_BALANCE_STATUSES = ["Paid", "Completed"];

// const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
// export const round2 = (v) => Math.round((n(v) + Number.EPSILON) * 100) / 100;

// export function effectiveAdvanceStatus(p) {
//     const a = p?.paymentDetails?.paymentStatus || "";
//     const b = p?.status || "";
//     if (a === "Rejected" || b === "Rejected") return "Rejected";
//     return a || b;
// }

// export function summarizeAdvances(payments = []) {
//     let paid = 0, pending = 0;
//     const rows = [];
//     for (const p of payments) {
//         const status = effectiveAdvanceStatus(p);
//         if (status === "Rejected") continue;
//         // The cash actually paid out is the NET advance (advance + additions - deductions - warehouse deduction),
//         // stored as paymentDetails.finalAmount. vendorDetails.advance is only the gross planned advance, so it is
//         // used purely as a fallback for old records that have no final amount.
//         const finalAmt = n(p?.paymentDetails?.finalAmount);
//         const amount = Math.max(finalAmt > 0 ? finalAmt : n(p?.vendorDetails?.advance), 0);
//         const counted = PAID_ADVANCE_STATUSES.includes(status);
//         if (counted) paid += amount; else pending += amount;
//         rows.push({ paymentNo: p?.paymentNo, status, advance: amount, counted, viaQueue: !!p?.queueGenerated });
//     }
//     return { advance: round2(paid), pendingAdvance: round2(pending), found: rows.length > 0, payments: rows };
// }

// export function derivePodFigures(pod, advance) {
//     const vf = pod?.vendorFinancial || {};
//     const total = n(vf.total);
//     const productDeduction = (pod?.products || []).reduce((s, p) => s + n(p?.value), 0);
//     const manual = n(vf.podDeduction);
//     const podDeduction = manual > 0 ? manual : productDeduction;
//     const adv = n(advance);
//     return {
//         total: round2(total), advance: round2(adv), poDeduction: 0, podDeduction: round2(podDeduction),
//         balance: round2(total - adv), finalBalance: round2(total - adv - podDeduction)
//     };
// }

// export function deriveBalanceFields(pod, advance) {
//     const f = derivePodFigures(pod, advance);
//     return {
//         amount: f.total, advance: f.advance, totalAddition: 0, totalDeduction: 0, poAddition: 0,
//         poDeduction: 0, podDeduction: f.podDeduction, finalBalance: f.finalBalance, purchaseNo: pod?.purchaseNo || ""
//     };
// }

// export function assertValidAmounts(fields) {
//     for (const [label, v] of Object.entries(fields)) {
//         if (v === undefined || v === null || v === "") continue;
//         const x = Number(v);
//         if (!Number.isFinite(x)) return `${label} must be a number`;
//         if (x < 0) return `${label} cannot be negative`;
//     }
//     return null;
// }

// Pure payment rules (no imports): shared by API routes, scripts and tests.
export const PAID_ADVANCE_STATUSES = ["Paid", "Completed"];
export const ADVANCE_STATUSES = ["Pending", "Approved", "Rejected", "Paid", "Completed"];
export const BALANCE_STATUSES = ["Pending", "Queued", "Approved", "Rejected", "Completed", "Paid"];
export const SETTLED_BALANCE_STATUSES = ["Paid", "Completed"];

const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
export const round2 = (v) => Math.round((n(v) + Number.EPSILON) * 100) / 100;
const sumAmounts = (rows) => (rows || []).reduce((s, r) => s + n(r?.amount), 0);

// Expense heads that Loading Info / Purchase Panel deduct at the warehouse.
const WAREHOUSE_HEADS = [
    ["loadingCharges", "Loading charges"],
    ["loadingStaffMunshiyana", "Loading staff munshiyana"],
    ["otherExpenses", "Other expenses"],
    ["vehicleFloorTarpaulin", "Vehicle floor tarpaulin"],
    ["vehicleOuterTarpaulin", "Vehicle outer tarpaulin"],
];

export function effectiveAdvanceStatus(p) {
    const a = p?.paymentDetails?.paymentStatus || "";
    const b = p?.status || "";
    if (a === "Rejected" || b === "Rejected") return "Rejected";
    return a || b;
}

export function summarizeAdvances(payments = []) {
    let paid = 0, pending = 0;
    const rows = [];
    for (const p of payments) {
        const status = effectiveAdvanceStatus(p);
        if (status === "Rejected") continue;
        // The cash actually paid out is the NET advance (advance + additions - deductions - warehouse deduction),
        // stored as paymentDetails.finalAmount. vendorDetails.advance is only the gross planned advance, so it is
        // used purely as a fallback for old records that have no final amount.
        const finalAmt = n(p?.paymentDetails?.finalAmount);
        const amount = Math.max(finalAmt > 0 ? finalAmt : n(p?.vendorDetails?.advance), 0);
        const counted = PAID_ADVANCE_STATUSES.includes(status);
        if (counted) paid += amount; else pending += amount;
        rows.push({ paymentNo: p?.paymentNo, status, advance: amount, counted, viaQueue: !!p?.queueGenerated });
    }
    return { advance: round2(paid), pendingAdvance: round2(pending), found: rows.length > 0, payments: rows };
}

// The Purchase Panel is where the advance was adjusted. Returns the itemised adjustments that were already
// netted into the advance cash, so the Balance Payment can show them line by line.
export function buildAdjustments(purchase, loadingInfo = null) {
    const rows = (arr, fallback) => (arr || [])
        .map((r) => ({ label: String(r?.description || "").trim() || fallback, amount: round2(n(r?.amount)) }))
        .filter((r) => r.amount > 0);
    // Loading Info is the source of truth for loading charges & expenses (same rule as Advance Payment).
    const le = loadingInfo?.loadedWeighment || purchase?.loadingExpenses || {};
    const warehouse = WAREHOUSE_HEADS
        .map(([key, label]) => ({ label, amount: round2(n(le[key])) }))
        .filter((r) => r.amount > 0);
    return {
        grossAdvance: round2(n(purchase?.purchaseDetails?.advance)),
        additions: rows(purchase?.additions, "Addition"),
        deductions: rows(purchase?.deductions, "Deduction"),
        warehouse,
    };
}

export function derivePodFigures(pod, advance) {
    const vf = pod?.vendorFinancial || {};
    const total = n(vf.total);
    const productDeduction = (pod?.products || []).reduce((s, p) => s + n(p?.value), 0);
    const manual = n(vf.podDeduction);
    const podDeduction = manual > 0 ? manual : productDeduction;
    const adv = n(advance);
    return {
        total: round2(total), advance: round2(adv), poDeduction: 0, podDeduction: round2(podDeduction),
        balance: round2(total - adv), finalBalance: round2(total - adv - podDeduction),
        manualPodDeduction: round2(manual), productDeduction: round2(productDeduction)
    };
}

// POD deduction lines: the manual figure if one was entered on the POD, otherwise one line per product.
function podDeductionLines(pod, f) {
    if (f.manualPodDeduction > 0) {
        return { mode: "manual", lines: [{ label: "Manual POD deduction", amount: f.manualPodDeduction, note: "Entered on the POD (replaces product-wise values)", source: "POD " + (pod?.podNo || "") }] };
    }
    const lines = (pod?.products || [])
        .filter((p) => n(p?.value) > 0)
        .map((p) => ({
            label: String(p?.productName || "").trim() || "Product",
            amount: round2(n(p?.value)),
            note: [p?.deduction, p?.deliveryStatus].map((x) => String(x || "").trim()).filter(Boolean).join(" · "),
            source: "POD " + (pod?.podNo || ""),
        }));
    return { mode: lines.length ? "products" : "none", lines };
}

// ONE formula for the whole app:
//   Final Balance = Amount - Advance paid + Total Addition - Total Deduction
//   Total Addition  = PO additions
//   Total Deduction = PO deductions + warehouse deductions + POD deductions
// The advance paid is already net of the PO adjustments, so adding them back here keeps the balance
// equal to (Amount - gross advance - POD deduction).
export function deriveBalanceFields(pod, advance, adjustments = null) {
    const f = derivePodFigures(pod, advance);
    const adj = adjustments || { grossAdvance: 0, additions: [], deductions: [], warehouse: [] };
    const poAddition = round2(sumAmounts(adj.additions));
    const poDeduction = round2(sumAmounts(adj.deductions) + sumAmounts(adj.warehouse));
    const podDeduction = f.podDeduction;
    const totalAddition = poAddition;
    const totalDeduction = round2(poDeduction + podDeduction);
    const finalBalance = round2(f.total - f.advance + totalAddition - totalDeduction);
    const pd = podDeductionLines(pod, f);
    return {
        amount: f.total, advance: f.advance, totalAddition, totalDeduction, poAddition,
        poDeduction, podDeduction, finalBalance, purchaseNo: pod?.purchaseNo || "",
        breakdown: {
            grossAdvance: adj.grossAdvance,
            poAdditions: adj.additions.map((r) => ({ ...r, source: "Purchase Panel " + (pod?.purchaseNo || "") })),
            poDeductions: adj.deductions.map((r) => ({ ...r, source: "Purchase Panel " + (pod?.purchaseNo || "") })),
            warehouse: adj.warehouse.map((r) => ({ ...r, source: "Loading Info / Purchase Panel" })),
            podDeductions: pd.lines,
            podDeductionMode: pd.mode,
        }
    };
}

export function assertValidAmounts(fields) {
    for (const [label, v] of Object.entries(fields)) {
        if (v === undefined || v === null || v === "") continue;
        const x = Number(v);
        if (!Number.isFinite(x)) return `${label} must be a number`;
        if (x < 0) return `${label} cannot be negative`;
    }
    return null;
}