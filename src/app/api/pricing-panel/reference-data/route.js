import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import connectDb from "@/lib/db";
import { companyScopeFilter } from "@/lib/companyScope";
import { isVnnReadyForDownstream } from "@/lib/vehicleNegotiationWorkflow";
import VehicleNegotiation from "@/app/api/vehicle-negotiation/VehicleNegotiation";
import PricingPanel from "../PricingPanel";
import Branch from "@/app/api/branches/schema";
import Plant from "@/app/api/plants/schema";
import SubCompany from "@/models/SubCompany";
import Location from "@/app/api/locations/schema";
import Country from "@/app/api/countries/schema";
import RateMaster from "@/app/api/rate-master/schema";
import Customer from "@/models/CustomerModel";

const orderFields = [
  "orderNo", "partyName", "customerId", "customerCode", "contactPerson", "plantCode",
  "plantCodeValue", "plantName", "orderType", "pinCode", "from", "fromName", "fromState",
  "to", "toName", "taluka", "talukaName", "talukaId", "district", "districtName", "districtId", "state", "stateName", "stateId", "locationId",
  "country", "countryName", "weight", "collectionCharges", "cancellationCharges", "loadingCharges",
  "otherCharges", "localStatus", "localStatusLabel",
];

function pricingOrderReference(order = {}) {
  return orderFields.reduce((reference, field) => {
    reference[field] = order[field] ?? "";
    return reference;
  }, {});
}

function pricingVnnReference(vnn) {
  return {
    _id: vnn._id,
    vnnNo: vnn.vnnNo,
    date: vnn.date || null,
    customerId: vnn.customerId || "",
    customerName: vnn.customerName || "",
    customerCode: vnn.customerCode || "",
    contactPerson: vnn.contactPerson || "",
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
    orders: (vnn.orders || []).map(pricingOrderReference),
  };
}

/**
 * Restricted Pricing Panel create-form data. This avoids granting broad read
 * permissions to the Vehicle Negotiation, Order Panel, Branch, Plant, and
 * Sub-company modules merely to create a pricing record.
 */
export const GET = withAuth(async (req, context, user) => {
  try {
    await connectDb();

    const [vehicleNegotiations, pricingPanels, branches, plants, subCompanies, locations, countries, rawRateMasters] = await Promise.all([
      VehicleNegotiation.find(
        companyScopeFilter(user),
        {
          vnnNo: 1,
          date: 1,
          customerId: 1,
          customerName: 1,
          customerCode: 1,
          contactPerson: 1,
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
      PricingPanel.find(companyScopeFilter(user), { "orders.vehicleNegotiationId": 1 }).lean(),
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
      Location.find(
        { companyId: user.companyId, isActive: { $ne: false } },
        { name: 1, state: 1 },
      ).sort({ name: 1 }).lean(),
      Country.find({ companyId: user.companyId }, { name: 1, code: 1 }).sort({ name: 1 }).lean(),
      RateMaster.find(
        { companyId: user.companyId, isActive: { $ne: false } },
        { title: 1, customerId: 1, branchId: 1, usageMode: 1, locationRates: 1 },
      ).sort({ createdAt: -1 }).lean(),
    ]);

    const usedVnnIds = new Set(
      pricingPanels.flatMap((panel) => (panel.orders || []).map((order) => order.vehicleNegotiationId))
        .filter(Boolean)
        .map(String),
    );

    const vehicleNegotiationsForPricing = vehicleNegotiations
      .filter((vnn) => isVnnReadyForDownstream(vnn) && !usedVnnIds.has(String(vnn._id)))
      .map(pricingVnnReference);

    const customerIds = [...new Set(
      rawRateMasters
        .map((rateMaster) => rateMaster.customerId ? String(rateMaster.customerId) : null)
        .filter(Boolean),
    )];
    const customers = customerIds.length
      ? await Customer.find(
        { companyId: user.companyId, _id: { $in: customerIds } },
        { customerName: 1, customerCode: 1 },
      ).lean()
      : [];
    const branchById = new Map(branches.map((branch) => [String(branch._id), branch]));
    const customerById = new Map(customers.map((customer) => [String(customer._id), customer]));
    const locationById = new Map(locations.map((location) => [String(location._id), location]));
    const rateMasters = rawRateMasters.map((rateMaster) => {
      const branch = branchById.get(String(rateMaster.branchId));
      const customer = customerById.get(String(rateMaster.customerId));
      return {
        _id: rateMaster._id,
        title: rateMaster.title,
        customerId: rateMaster.customerId,
        branchId: rateMaster.branchId,
        usageMode: rateMaster.usageMode || 'standard',
        branchName: branch?.name || "",
        branchCode: branch?.code || "",
        customerName: customer?.customerName || "",
        customerCode: customer?.customerCode || "",
        locationRates: (rateMaster.locationRates || []).map((locationRate) => ({
          _id: locationRate._id,
          locationId: locationRate.locationId,
          locationName: locationById.get(String(locationRate.locationId))?.name || "",
          fromQty: locationRate.fromQty,
          toQty: locationRate.toQty,
          rate: locationRate.rate,
          isActive: locationRate.isActive,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        vehicleNegotiations: vehicleNegotiationsForPricing,
        branches,
        plants,
        subCompanies,
        locations,
        countries,
        rateMasters,
      },
    });
  } catch (error) {
    console.error("GET /api/pricing-panel/reference-data error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch Pricing Panel reference data" },
      { status: 500 },
    );
  }
}, { module: "Pricing Panel", actions: ["create", "edit"] });
