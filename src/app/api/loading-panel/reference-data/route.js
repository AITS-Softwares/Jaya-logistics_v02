import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import connectDb from "@/lib/db";
import { companyScopeFilter } from "@/lib/companyScope";
import { isVnnReadyForDownstream } from "@/lib/vehicleNegotiationWorkflow";
import VehicleNegotiation from "@/app/api/vehicle-negotiation/VehicleNegotiation";
import OrderPanel from "@/app/api/order-panel/OrderPanel";
import LoadingPanel from "../LoadingPanel";
import Branch from "@/app/api/branches/schema";
import Plant from "@/app/api/plants/schema";
import SubCompany from "@/models/SubCompany";

const orderFields = [
  "orderNo", "partyName", "plantCode", "plantCodeValue", "plantName", "orderType",
  "pinCode", "from", "fromName", "fromState", "to", "toName", "taluka", "talukaName",
  "district", "districtName", "state", "stateName", "weight", "collectionCharges",
  "cancellationCharges", "loadingCharges", "otherCharges", "localStatus", "localStatusLabel",
];

const packTypes = [
  "PALLETIZATION",
  "UNIFORM - BAGS/BOXES",
  "LOOSE - CARGO",
  "NON-UNIFORM - GENERAL CARGO",
];

const packFields = {
  PALLETIZATION: ["noOfPallets", "unitPerPallets", "totalPkgs", "pkgsType", "uom", "skuSize", "packWeight", "productName", "wtLtr", "actualWt", "chargedWt", "wtUom", "isUniform"],
  "UNIFORM - BAGS/BOXES": ["totalPkgs", "pkgsType", "uom", "skuSize", "packWeight", "productName", "wtLtr", "actualWt", "chargedWt", "wtUom"],
  "LOOSE - CARGO": ["uom", "productName", "actualWt", "chargedWt"],
  "NON-UNIFORM - GENERAL CARGO": ["nos", "productName", "uom", "length", "width", "height", "actualWt", "chargedWt"],
};

function loadingOrderReference(order = {}) {
  return orderFields.reduce((reference, field) => {
    reference[field] = order[field] ?? "";
    return reference;
  }, {});
}

function loadingPackRows(packData = {}) {
  return packTypes.reduce((result, packType) => {
    result[packType] = (packData[packType] || []).map((row) => (
      packFields[packType].reduce((reference, field) => {
        reference[field] = row[field] ?? "";
        return reference;
      }, {})
    ));
    return result;
  }, {});
}

async function packDataForVnn(vnn, user) {
  // Some existing VNNs have their source Order Panel only on the copied order
  // row. Use both references so all valid historical and newly-created VNNs
  // populate the same Loading Info pack tables.
  const orderedIds = [
    ...(vnn.selectedOrderPanels || []).map((panel) => panel?._id),
    ...(vnn.orders || []).map((order) => order?.orderPanelId),
  ]
    .map((id) => String(id || ""))
    .filter((id) => /^[a-f\d]{24}$/i.test(id));

  const uniqueOrderIds = [...new Set(orderedIds)];
  if (!uniqueOrderIds.length) return loadingPackRows();

  const orderPanels = await OrderPanel.find(
    companyScopeFilter(user, { _id: { $in: uniqueOrderIds } }),
    { packData: 1 },
  ).lean();
  const byId = new Map(orderPanels.map((panel) => [String(panel._id), panel.packData || {}]));

  return uniqueOrderIds.reduce((merged, id) => {
    const source = loadingPackRows(byId.get(id));
    packTypes.forEach((packType) => {
      merged[packType].push(...source[packType]);
    });
    return merged;
  }, loadingPackRows());
}

function loadingVnnReference(vnn) {
  return {
    _id: vnn._id,
    vnnNo: vnn.vnnNo,
    customerName: vnn.customerName || "",
    branch: vnn.branch || "",
    branchName: vnn.branchName || "",
    branchCode: vnn.branchCode || "",
    subCompanyId: vnn.subCompanyId || "",
    subCompanyName: vnn.subCompanyName || "",
    subCompanyCode: vnn.subCompanyCode || "",
    delivery: vnn.delivery || "",
    billingType: vnn.billingType || "",
    loadingPoints: vnn.loadingPoints ?? "",
    dropPoints: vnn.dropPoints ?? "",
    collectionCharges: vnn.collectionCharges ?? "",
    cancellationCharges: vnn.cancellationCharges || "",
    loadingCharges: vnn.loadingCharges || "",
    otherCharges: vnn.otherCharges || "",
    vehicleNo: vnn.approval?.vehicleNo || "",
    driverMobileNo: vnn.approval?.mobile || "",
    orders: (vnn.orders || []).map(loadingOrderReference),
  };
}

/**
 * Data required by the Loading Info create form.
 *
 * This deliberately does not proxy the broader VNN, Order Panel, Branch, or
 * Plant APIs. A user with Loading Info create access receives only eligible
 * VNNs and the minimal reference fields needed to create this transaction.
 */
export const GET = withAuth(async (req, context, user) => {
  try {
    await connectDb();
    const url = new URL(req.url);
    const vnnId = url.searchParams.get("vnnId");

    // The form requests pack rows only after the user selects one eligible VNN.
    // This avoids exposing complete Order Panel records or loading all pack rows
    // into the initial dropdown response.
    if (vnnId) {
      if (!/^[a-f\d]{24}$/i.test(vnnId)) {
        return NextResponse.json({ success: false, message: "Invalid VNN ID" }, { status: 400 });
      }

      const vnn = await VehicleNegotiation.findOne(
        companyScopeFilter(user, { _id: vnnId }),
        {
          selectedOrderPanels: 1,
          "orders.orderPanelId": 1,
          "approval.part3Status": 1,
          "approval.vehicleNo": 1,
          "approval.mobile": 1,
          "approval.purchaseType": 1,
          "approval.paymentTerms": 1,
          "workflow.placementCompletedAt": 1,
        },
      ).lean();

      if (!vnn || !isVnnReadyForDownstream(vnn)) {
        return NextResponse.json({ success: false, message: "This VNN is not available for Loading Info" }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: { packData: await packDataForVnn(vnn, user) } });
    }

    const [vehicleNegotiations, loadingPanels, branches, plants, subCompanies] = await Promise.all([
      VehicleNegotiation.find(
        companyScopeFilter(user),
        {
          vnnNo: 1,
          customerName: 1,
          branch: 1,
          branchName: 1,
          branchCode: 1,
          subCompanyId: 1,
          subCompanyName: 1,
          subCompanyCode: 1,
          delivery: 1,
          billingType: 1,
          loadingPoints: 1,
          dropPoints: 1,
          collectionCharges: 1,
          cancellationCharges: 1,
          loadingCharges: 1,
          otherCharges: 1,
          orders: 1,
          "approval.part3Status": 1,
          "approval.vehicleNo": 1,
          "approval.mobile": 1,
          "approval.purchaseType": 1,
          "approval.paymentTerms": 1,
          "workflow.placementCompletedAt": 1,
        },
      ).sort({ createdAt: -1 }).lean(),
      LoadingPanel.find(
        companyScopeFilter(user),
        { vehicleNegotiationNo: 1 },
      ).lean(),
      Branch.find({ companyId: user.companyId, isActive: { $ne: false } }, { name: 1, code: 1 })
        .sort({ name: 1 })
        .lean(),
      Plant.find({ companyId: user.companyId }, { name: 1, code: 1 })
        .sort({ name: 1 })
        .lean(),
      SubCompany.find(
        { companyId: user.companyId, isActive: { $ne: false } },
        { name: 1, code: 1 },
      ).sort({ name: 1 }).lean(),
    ]);

    const usedVnnNumbers = new Set(
      loadingPanels
        .map((panel) => panel.vehicleNegotiationNo)
        .filter((vnnNo) => vnnNo && vnnNo !== "N/A" && vnnNo !== "-"),
    );

    const negotiations = vehicleNegotiations
      .filter((vnn) => isVnnReadyForDownstream(vnn) && !usedVnnNumbers.has(vnn.vnnNo))
      .map(loadingVnnReference);

    return NextResponse.json({
      success: true,
      data: { negotiations, branches, plants, subCompanies },
    });
  } catch (error) {
    console.error("GET /api/loading-panel/reference-data error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch Loading Info reference data" },
      { status: 500 },
    );
  }
}, { module: "Loading Info", action: "create" });
