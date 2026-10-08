// src/app/api/loading-panel/lrOut.js
//
// Out Date / Out Time of a Loading Info = the moment its LAST LR is printed
// (the LR whose first print completes the set, in any order).
import LoadingPanel from "@/app/api/loading-panel/LoadingPanel";
import PurchasePanel from "@/app/api/purchase-panel/PurchasePanel";
import DetentionRule from "@/app/api/detention-rules/DetentionRule";
import { calculateDetention, selectDetentionRule } from "@/lib/detentionCalculation";
import { companyScopeFilter } from "@/lib/companyScope";

function formatIndiaDateTime(timestamp) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(timestamp).reduce((result, part) => {
        result[part.type] = part.value;
        return result;
    }, {});

    return {
        date: `${parts.year}-${parts.month}-${parts.day}`,
        time: `${parts.hour}:${parts.minute}:${parts.second}`
    };
}

async function synchronizePurchaseDetention(user, loadingInfo, outDate, outTime) {
    const purchase = await PurchasePanel.findOne(companyScopeFilter(user, {
        loadingInfoNo: loadingInfo.vehicleArrivalNo
    }));

    if (!purchase) return;

    const inDate = loadingInfo.arrivalDetails?.date;
    const inTime = loadingInfo.arrivalDetails?.time || '';
    const localStatus = purchase.orderRows?.[0]?.localStatus || 'unknown';
    const rules = await DetentionRule.find(companyScopeFilter(user, {
        active: true, effectiveFrom: { $lte: new Date() }
    })).sort({ priority: 1, effectiveFrom: -1 }).lean();
    const rule = selectDetentionRule(rules, localStatus, inTime);
    const result = calculateDetention({ inDate, inTime, outDate, outTime, localStatus, rule });

    purchase.arrivalDetails = purchase.arrivalDetails || {};
    purchase.arrivalDetails.inDate = inDate || purchase.arrivalDetails.inDate;
    purchase.arrivalDetails.inTime = inTime;
    purchase.arrivalDetails.outDate = new Date(`${outDate}T00:00:00.000Z`);
    purchase.arrivalDetails.outTime = outTime;
    if (result) Object.assign(purchase.arrivalDetails, result);
    await purchase.save();
}

/**
 * Saves Out Date/Time once, when every LR is ready AND printed.
 * `completion` is getLRCompletion(...); its completedAt is the time of the last first-print.
 */
export async function recordOutAfterAllPrinted(user, panelId, completion) {
    if (!completion?.complete || !completion.completedAt) return null;
    const loadingInfo = await LoadingPanel.findOne(companyScopeFilter(user, { _id: panelId }));
    if (!loadingInfo || loadingInfo.arrivalDetails?.outDate) return null; // never overwrite

    const { date: outDate, time: outTime } = formatIndiaDateTime(completion.completedAt);
    loadingInfo.arrivalDetails = loadingInfo.arrivalDetails || {};
    loadingInfo.arrivalDetails.outDate = new Date(`${outDate}T00:00:00.000Z`);
    loadingInfo.arrivalDetails.outTime = outTime;
    await loadingInfo.save();
    await synchronizePurchaseDetention(user, loadingInfo, outDate, outTime);
    return { outDate, outTime };
}