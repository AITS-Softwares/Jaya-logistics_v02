// // GET /api/tracking/stops?loadingId=<id>
// // Pickup = LR consignor address, Drop = LR consignee address. Read-only.
// import { NextResponse } from "next/server";
// import mongoose from "mongoose";
// import connectDb from "@/lib/db";
// import { withAuth } from "@/lib/auth";
// import { companyScopeFilter } from "@/lib/companyScope";
// import LoadingPanel from "@/app/api/loading-panel/LoadingPanel";
// import ConsignmentNote from "@/app/api/consignment-note/ConsignmentNote";

// const clean = (v) => String(v ?? "").trim();
// const joinText = (parts) => parts.map(clean).filter(Boolean).join(", ");
// const emptyGeo = () => ({ lat: null, lng: null, placeId: null, geocodedAt: null });
// // LR addresses end with the 6-digit pin code, e.g. "... Pune Maharashtra 411005"
// const pinFrom = (text) => (String(text || "").match(/\b\d{6}\b/g) || []).pop() || "";

// function lrStop(type, party, orderNo) {
//     const text = clean(party?.address);
//     return {
//         type,
//         orderNo: clean(orderNo),
//         partyName: clean(party?.name),
//         place: { pin: pinFrom(text) },
//         address: { title: clean(party?.selectedAddressTitle), customerId: clean(party?.customerId), text },
//         addressSource: text ? "lr" : "approximate",
//         needsReview: !text,
//         reason: text ? "" : `LR has no ${type === "pickup" ? "consignor" : "consignee"} address`,
//         geo: emptyGeo(),
//     };
// }

// export const GET = withAuth(async (req, context, user) => {
//     await connectDb();
//     try {
//         const loadingId = new URL(req.url).searchParams.get("loadingId");
//         if (!loadingId || !mongoose.Types.ObjectId.isValid(loadingId)) {
//             return NextResponse.json({ success: false, message: "Valid loadingId is required" }, { status: 400 });
//         }

//         const loading = await LoadingPanel.findOne(companyScopeFilter(user, { _id: loadingId }))
//             .select("vehicleArrivalNo orderRows vehicleInfo.vehicleNo").lean();
//         if (!loading) return NextResponse.json({ success: false, message: "Loading Info not found" }, { status: 404 });

//         const lr = await ConsignmentNote.findOne(companyScopeFilter(user, { loadingInfoNo: loading.vehicleArrivalNo }))
//             .select("lrNo header.orderNo consignor consignee").lean();

//         const rows = loading.orderRows || [];
//         let stops = [];

//         if (lr) {
//             const lrOrderNo = clean(lr.header?.orderNo);
//             stops.push(lrStop("pickup", lr.consignor, lrOrderNo));
//             stops.push(lrStop("drop", lr.consignee, lrOrderNo));

//             // One LR per loading: other orders on this loading have no address of their own
//             for (const r of rows) {
//                 if (clean(r.orderNo) === lrOrderNo) continue;
//                 stops.push({
//                     type: "drop", orderNo: clean(r.orderNo), partyName: clean(r.partyName),
//                     place: { city: clean(r.toName || r.to), district: clean(r.districtName || r.district), state: clean(r.stateName || r.state), pin: clean(r.pinCode) },
//                     address: { text: joinText([r.toName || r.to, r.talukaName || r.taluka, r.districtName || r.district, r.stateName || r.state, r.pinCode]) },
//                     addressSource: "approximate", needsReview: true,
//                     reason: "This order is not covered by the LR (one LR per loading)", geo: emptyGeo(),
//                 });
//             }
//         } else {
//             // No LR yet: city-level only, clearly marked
//             for (const r of rows) {
//                 stops.push({
//                     type: "drop", orderNo: clean(r.orderNo), partyName: clean(r.partyName),
//                     place: { city: clean(r.toName || r.to), district: clean(r.districtName || r.district), state: clean(r.stateName || r.state), pin: clean(r.pinCode) },
//                     address: { text: joinText([r.toName || r.to, r.talukaName || r.taluka, r.districtName || r.district, r.stateName || r.state, r.pinCode]) },
//                     addressSource: "approximate", needsReview: true, reason: "LR not created yet", geo: emptyGeo(),
//                 });
//             }
//         }

//         stops = stops.map((s, i) => ({ sequence: i + 1, ...s }));
//         return NextResponse.json({
//             success: true,
//             data: { loadingInfoNo: loading.vehicleArrivalNo, vehicleNo: loading.vehicleInfo?.vehicleNo || "", lrNo: lr?.lrNo || "", stops },
//         });
//     } catch (err) {
//         console.error("tracking/stops error:", err);
//         return NextResponse.json({ success: false, message: "Unable to build tracking stops" }, { status: 500 });
//     }
// }, { module: "Tracking Plan", action: "view" });

// GET /api/tracking/stops?loadingId=<id>
// For each order row of a loading, finds the customer-master shipping address of that town:
// order row -> Order Panel (orderPanelNo) -> customerId -> Customer.shippingAddresses.
// Read-only. LR addresses are applied by the Tracking Plan page, which already has the LR.
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDb from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { companyScopeFilter } from "@/lib/companyScope";
import LoadingPanel from "@/app/api/loading-panel/LoadingPanel";
import OrderPanel from "@/app/api/order-panel/OrderPanel";
import Customer from "@/models/CustomerModel";

const clean = (v) => String(v ?? "").trim();
const norm = (v) => clean(v).toLowerCase();
// Joins address parts, skipping blanks and repeats.
const joinText = (parts) => [...new Map(parts.map(clean).filter(Boolean).map((p) => [p.toLowerCase(), p])).values()].join(", ");

// Match on the town only. The row's pin code is the order's pin, so it cannot tell towns apart.
function matchShippingAddress(row, addresses) {
    const town = norm(row.toName || row.to);
    if (!town) return null;
    const byCity = addresses.filter((a) => norm(a.city) === town);
    if (byCity.length === 1) return { address: byCity[0], matchedBy: "city" };
    if (byCity.length > 1) {
        const byPin = byCity.filter((a) => clean(a.pin) && clean(a.pin) === clean(row.pinCode));
        if (byPin.length === 1) return { address: byPin[0], matchedBy: "city+pin" };
        return { ambiguous: byCity.length };
    }
    return null;
}

export const GET = withAuth(async (req, context, user) => {
    await connectDb();
    try {
        const loadingId = new URL(req.url).searchParams.get("loadingId");
        if (!loadingId || !mongoose.Types.ObjectId.isValid(loadingId)) {
            return NextResponse.json({ success: false, message: "Valid loadingId is required" }, { status: 400 });
        }

        const loading = await LoadingPanel.findOne(companyScopeFilter(user, { _id: loadingId }))
            .select("vehicleArrivalNo orderRows").lean();
        if (!loading) return NextResponse.json({ success: false, message: "Loading Info not found" }, { status: 404 });

        const rows = loading.orderRows || [];
        const orderNos = [...new Set(rows.map((r) => clean(r.orderNo)).filter(Boolean))];
        const orders = orderNos.length
            ? await OrderPanel.find(companyScopeFilter(user, { orderPanelNo: { $in: orderNos } })).select("orderPanelNo customerId").lean()
            : [];
        const orderByNo = new Map(orders.map((o) => [clean(o.orderPanelNo), o]));

        const customerIds = [...new Set(orders.map((o) => String(o.customerId || "")).filter((id) => mongoose.Types.ObjectId.isValid(id)))];
        const customers = customerIds.length
            ? await Customer.find({ _id: { $in: customerIds }, companyId: user.companyId }).select("customerName shippingAddresses").lean()
            : [];
        const customerById = new Map(customers.map((c) => [String(c._id), c]));

        const matches = {};   // rowId -> resolved customer-master address
        const unmatched = {}; // rowId -> why nothing was resolved
        for (const row of rows) {
            const rowId = String(row._id);
            const town = clean(row.toName || row.to) || "this town";
            const order = orderByNo.get(clean(row.orderNo));
            if (!order) { unmatched[rowId] = `Order ${clean(row.orderNo) || ""} was not found`.replace("  ", " "); continue; }
            const customer = order.customerId ? customerById.get(String(order.customerId)) : null;
            if (!customer) { unmatched[rowId] = "The order has no customer in the customer master"; continue; }

            const found = matchShippingAddress(row, customer.shippingAddresses || []);
            if (!found) unmatched[rowId] = `No shipping address for ${town} in the customer master`;
            else if (found.ambiguous) unmatched[rowId] = `${found.ambiguous} shipping addresses match ${town}; pick one on the LR`;
            else {
                const a = found.address;
                matches[rowId] = {
                    source: "customer-master", matchedBy: found.matchedBy, customerName: clean(customer.customerName),
                    title: clean(a.title), city: clean(a.city), state: clean(a.state), pin: clean(a.pin),
                    text: joinText([a.address1, a.address2, a.city, a.state, a.pin]),
                };
            }
        }

        return NextResponse.json({ success: true, data: { loadingInfoNo: loading.vehicleArrivalNo, matches, unmatched } });
    } catch (err) {
        console.error("tracking/stops error:", err);
        return NextResponse.json({ success: false, message: "Unable to resolve customer addresses" }, { status: 500 });
    }
}, { module: "Tracking Plan", action: "view" });