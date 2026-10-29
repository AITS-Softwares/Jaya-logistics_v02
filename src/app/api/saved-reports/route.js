import { withBranchAccess } from '@/lib/branchAccess';
import branchScopePlugin from '@/lib/branchScopePlugin';
import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import mongoose from "mongoose";
import Counter from "@/models/Counter";
import Company from "@/models/Company";
import SubCompany from "@/models/SubCompany";
import Customer from "@/models/CustomerModel";
import Branch from "@/app/api/branches/schema";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { getBilledLrNumbers } from "@/lib/billedLrs";

// Saved Report Schema
const savedReportSchema = new mongoose.Schema({
  reportId: { type: String, required: true, unique: true },
  type: { type: String, required: true }, // product-wise, general, mosaic, detention, cancellation, other
  billNumber: { type: String, default: "" },
  subCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: "SubCompany", default: null },
  subCompanyCode: { type: String, default: "" },
  issuer: { type: Object, default: {} },
  clientSnapshot: { type: Object, default: {} },
  filters: { type: Object, required: true },
  data: { type: Array, required: true },
  summary: { type: Object, required: true },
  totalRecords: { type: Number, default: 0 },
  selectedRecords: { type: Number, default: 0 },
  generatedAt: { type: Date, default: Date.now },
  generatedBy: { type: String, default: "" },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" }
});

savedReportSchema.plugin(branchScopePlugin, { model: 'SavedReport' });

const SavedReport = mongoose.models.SavedReport || mongoose.model("SavedReport", savedReportSchema);

// GET - Fetch saved reports
async function branchHandlerGET(req) {
  try {
    await connectDb();

    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type");

    let query = { companyId: user.companyId };
    if (user.activeOperatingCompanyId) {
      const companyFilter = user.activeOperatingCompanyCode === "JGL"
        ? [{ subCompanyId: user.activeOperatingCompanyId }, { subCompanyId: null }, { subCompanyId: { $exists: false } }]
        : [{ subCompanyId: user.activeOperatingCompanyId }];
      query.$or = companyFilter;
    }
    if (type) query.type = type;

    const reports = await SavedReport.find(query).sort({ generatedAt: -1 }).lean();

    return NextResponse.json({ success: true, data: reports }, { status: 200 });

  } catch (error) {
    console.error("Error fetching saved reports:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST - Save a new report
async function branchHandlerPOST(req) {
  try {
    await connectDb();

    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const { reportId, type, billNumber, filters, data, summary, totalRecords, selectedRecords } = body;

    if (type === "product-wise" || type === "general" || type === "mosaic") {
      const rows = Array.isArray(data) ? data : [];
      const zeroRate = rows.filter((r) => !(Number(r.rate) > 0)).map((r) => r.lrNo);
      if (zeroRate.length) {
        return NextResponse.json({ success: false, message: `Rate is missing for LR: ${[...new Set(zeroRate)].join(", ")}. Set the rate before billing.` }, { status: 400 });
      }
      if (type === "general" && filters?.applySac && !filters?.sacCode) {
        return NextResponse.json({ success: false, message: "Select a SAC code, or turn off 'Apply SAC code'." }, { status: 400 });
      }
      // each billing type is checked against its own saved bills only
      const billed = await getBilledLrNumbers(user.companyId, type);
      const dup = [...new Set(rows.map((r) => r.lrNo).filter((lr) => lr && billed.has(lr)))];
      if (dup.length) {
        return NextResponse.json({ success: false, message: `Already billed: ${dup.join(", ")}. Refresh and select again.` }, { status: 409 });
      }
    }

    const subCompanyId = user.activeOperatingCompanyId;
    if (!subCompanyId) {
      return NextResponse.json({ success: false, message: "Select an operating company before generating a bill." }, { status: 400 });
    }
    const [subCompany, company, customer, branch] = await Promise.all([
      SubCompany.findOne({ _id: subCompanyId, companyId: user.companyId, isActive: true }).lean(),
      Company.findById(user.companyId).select("companyName email phone address country pinCode gstNumber").lean(),
      filters?.clientId ? Customer.findOne({ _id: filters.clientId, companyId: user.companyId }).lean() : null,
      filters?.branchId ? Branch.findOne({ _id: filters.branchId, companyId: user.companyId }).lean() : null,
    ]);
    if (!subCompany) {
      return NextResponse.json({ success: false, message: "The selected operating company could not be found." }, { status: 404 });
    }

    const now = new Date();
    const indiaParts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "numeric" }).formatToParts(now);
    const part = (key) => Number(indiaParts.find((entry) => entry.type === key)?.value || 0);
    const year = part("year");
    const fyStart = part("month") >= 4 ? year : year - 1;
    const financialYear = `${String(fyStart).slice(-2)}${String(fyStart + 1).slice(-2)}`;
    let generatedBillNumber = billNumber || `BILL/${Date.now()}`;
    if (type === "product-wise" || type === "general" || type === "mosaic") {
      const counterId = `Billing-${subCompanyId}-${financialYear}`;
      let counter;
      try {
        counter = await Counter.findOneAndUpdate(
          { companyId: user.companyId, id: counterId },
          { $inc: { seq: 1 } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
      } catch (error) {
        if (error.code !== 11000) throw error;
        counter = await Counter.findOneAndUpdate(
          { companyId: user.companyId, id: counterId },
          { $inc: { seq: 1 } },
          { new: true }
        );
      }
      const branchCode = branch?.code || filters?.branchCode || "BRANCH";
      const partyCode = customer?.customerCodeValue || customer?.customerCode || "PARTY";
      generatedBillNumber = `${branchCode}/${partyCode}/${financialYear}/${String(counter.seq).padStart(3, "0")}`;
    }

    const knownProfiles = {
      JGL: {
        name: "Jaya Global Logistics",
        address: "Office - 404, A - Wing 4th Floor, Shelton Sapphire, Sector - 15, Belapur Navi Mumbai - 400614",
        gstNumber: "27HEVPS8463H1ZC",
        state: "Maharashtra",
        pan: "HEVPS8463H",
        email: "jayagloballogistics@gmail.com",
      },
      JL: {
        name: "Jaya Logistics",
        address: "Office - 404, A - Wing 4th Floor, Shelton Sapphire, Sector - 15, Belapur Navi Mumbai - 400614",
        gstNumber: "27CDHPS2205M12A",
        state: "Maharashtra",
        pan: "CDHPS2205M",
        phone: "022 27578844",
      },
      NK: { name: "Neelkanth Express" },
    };
    const profileDefaults = knownProfiles[subCompany.code] || {};
    const issuerGST = subCompany.legalProfile?.gstNumber || profileDefaults.gstNumber || (profileDefaults.name ? "" : company?.gstNumber) || "";
    const issuer = {
      ...profileDefaults,
      name: subCompany.legalProfile?.legalName || profileDefaults.name || subCompany.name,
      address: subCompany.legalProfile?.address || profileDefaults.address || company?.address || "",
      state: subCompany.legalProfile?.state || profileDefaults.state || "",
      pinCode: subCompany.legalProfile?.pinCode || company?.pinCode || "",
      gstNumber: issuerGST,
      pan: subCompany.legalProfile?.pan || profileDefaults.pan || (issuerGST.length >= 12 ? issuerGST.slice(2, 12) : ""),
      email: subCompany.legalProfile?.email || profileDefaults.email || company?.email || "",
      phone: subCompany.legalProfile?.phone || profileDefaults.phone || company?.phone || "",
      companyName: company?.companyName || "",
      subCompanyName: subCompany.name,
      subCompanyCode: subCompany.code,
    };
    const billAddress = customer?.billingAddresses?.[0] || {};
    const clientGST = billAddress.gstNumber || customer?.gstNumber || "";
    const clientSnapshot = customer ? {
      name: customer.customerName,
      customerCodeValue: customer.customerCodeValue || "",
      gstNumber: clientGST,
      pan: customer.pan || "",
      address: [billAddress.address1, billAddress.address2].filter(Boolean).join(", "),
      city: billAddress.city || "",
      state: billAddress.state || "",
      pinCode: billAddress.pin || "",
      country: billAddress.country || "",
      paymentTerms: customer.paymentTerms || "",
    } : {};
    const branchCode = branch?.code || filters?.branchCode || "BRANCH";
    const savedFilters = {
      ...filters,
      branchName: branch?.name || filters?.branchName || "",
      branchCode,
      productCode: filters?.productCategories || "",
      plantCode: filters?.plantCode || "",
    };

    const savedReport = new SavedReport({
      reportId: reportId || `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      billNumber: generatedBillNumber,
      subCompanyId,
      subCompanyCode: subCompany.code,
      issuer,
      clientSnapshot,
      filters: savedFilters,
      data,
      summary,
      totalRecords,
      selectedRecords,
      generatedBy: user.email || user.name || "Admin",
      companyId: user.companyId,
      createdBy: user.id
    });

    await savedReport.save();
    // Keep metadata fields available if this development process had compiled
    // the SavedReport model before the billing schema was extended.
    await SavedReport.collection.updateOne({ _id: savedReport._id }, {
      $set: {
        billNumber: savedReport.billNumber,
        subCompanyId,
        subCompanyCode: subCompany.code,
        issuer,
        clientSnapshot,
        filters: savedFilters,
      }
    });
    const persistedReport = await SavedReport.findById(savedReport._id).lean();

    return NextResponse.json({
      success: true,
      message: "Report saved successfully",
      data: persistedReport || savedReport
    }, { status: 201 });

  } catch (error) {
    console.error("Error saving report:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE - Delete a saved report
async function branchHandlerDELETE(req) {
  try {
    await connectDb();

    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }

    const url = new URL(req.url);
    const reportId = url.searchParams.get("reportId");

    if (!reportId) {
      return NextResponse.json({ success: false, message: "Report ID required" }, { status: 400 });
    }

    const query = { reportId, companyId: user.companyId };
    if (user.activeOperatingCompanyId) query.subCompanyId = user.activeOperatingCompanyId;
    await SavedReport.deleteOne(query);

    return NextResponse.json({ success: true, message: "Report deleted successfully" }, { status: 200 });

  } catch (error) {
    console.error("Error deleting report:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export const GET = withBranchAccess(branchHandlerGET);
export const POST = withBranchAccess(branchHandlerPOST);
export const DELETE = withBranchAccess(branchHandlerDELETE);
