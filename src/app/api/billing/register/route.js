import { branchContext } from '@/lib/branchContext';
import { withBranchAccess } from '@/lib/branchAccess';
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDb from "@/lib/db";
import ConsignmentNote from "@/app/api/consignment-note/ConsignmentNote";
import { companyScopeFilter } from "@/lib/companyScope";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const BILLING_TYPES = new Set(["product-wise", "general", "mosaic", "detention", "cancellation", "other"]);
const QUANTITY_TYPES = new Set(["product-wise", "general", "mosaic"]);

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function billedQuantity(row) {
  return number(row?.billQuantity ?? row?.billedWt ?? row?.weight ?? row?.quantity);
}

function getStatus(totalQty, billedQty, hasBill, tracksQuantity) {
  if (!hasBill) return "unbilled";
  if (!tracksQuantity || totalQty <= 0) return "billed";
  if (billedQty <= 0) return "unbilled";
  return billedQty + 0.000001 >= totalQty ? "billed" : "partially-billed";
}

async function branchHandlerGET(req) {
  try {
    await connectDb();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 });

    const user = verifyJWT(token);
    if (!user) return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    const billingPermission = user.modules?.Billing;
    const isAdmin = (user.roles || []).some((role) => String(role).trim().toLowerCase() === "admin");
    const hasBillingView = billingPermission?.selected === true && billingPermission?.permissions?.view !== false;
    if (user.type !== "company" && !isAdmin && !hasBillingView) {
      return NextResponse.json({ success: false, message: "Billing view permission is required" }, { status: 403 });
    }
    if (!user.activeOperatingCompanyId) {
      return NextResponse.json({ success: false, message: "Select an operating company first" }, { status: 400 });
    }

    const url = new URL(req.url);
    const billingType = url.searchParams.get("billingType") || "general";
    if (!BILLING_TYPES.has(billingType)) {
      return NextResponse.json({ success: false, message: "Invalid billing type" }, { status: 400 });
    }

    const companyId = new mongoose.Types.ObjectId(String(user.companyId));
    const operatingCompanyId = new mongoose.Types.ObjectId(String(user.activeOperatingCompanyId));
    const reportQuery = { companyId, type: billingType };
    if (user.activeOperatingCompanyCode === "JGL") {
      reportQuery.$or = [
        { subCompanyId: operatingCompanyId },
        { subCompanyId: null },
        { subCompanyId: { $exists: false } },
      ];
    } else {
      reportQuery.subCompanyId = operatingCompanyId;
    }

    const [notes, reports] = await Promise.all([
      ConsignmentNote.find(companyScopeFilter(user, { companyId: user.companyId }))
        .select("lrNo createdAt header totalWeight consignee consignor customerId")
        .sort({ createdAt: -1 })
        .lean(),
      mongoose.connection.collection("savedreports").find(reportQuery, {
        projection: { billNumber: 1, generatedAt: 1, data: 1, filters: 1 },
      }).toArray(),
    ]);

    const billedByLr = new Map();
    const visibleLrNumbers = new Set(notes.map(note => String(note.lrNo || "")));
    for (const report of reports) {
      if (branchContext.getStore()?.access.accessAllBranches === false &&
          (!report.data?.length || report.data.some(line => !visibleLrNumbers.has(String(line.lrNo || ""))))) continue;
      for (const line of Array.isArray(report.data) ? report.data : []) {
        const lrNo = String(line?.lrNo || "").trim();
        if (!lrNo) continue;
        const aggregate = billedByLr.get(lrNo) || { quantity: 0, hasBill: false, billNumbers: [], latestBillDate: null, amount: 0 };
        aggregate.hasBill = true;
        if (QUANTITY_TYPES.has(billingType)) aggregate.quantity += billedQuantity(line);
        aggregate.amount += number(line?.amount);
        if (report.billNumber && !aggregate.billNumbers.includes(report.billNumber)) aggregate.billNumbers.push(report.billNumber);
        const reportDate = report.generatedAt ? new Date(report.generatedAt) : null;
        if (reportDate && (!aggregate.latestBillDate || reportDate > aggregate.latestBillDate)) aggregate.latestBillDate = reportDate;
        billedByLr.set(lrNo, aggregate);
      }
    }

    const search = (url.searchParams.get("search") || "").trim().toLowerCase();
    const clientId = url.searchParams.get('clientId') || '';
    const statusFilter = url.searchParams.get("status") || "all";
    const fromDate = url.searchParams.get("fromDate");
    const toDate = url.searchParams.get("toDate");
    const rows = notes.map((note) => {
      const lrNo = String(note.lrNo || "").trim();
      const billing = billedByLr.get(lrNo) || { quantity: 0, hasBill: false, billNumbers: [], latestBillDate: null, amount: 0 };
      const totalQty = number(note.totalWeight);
      const billedQty = QUANTITY_TYPES.has(billingType) ? billing.quantity : 0;
      return {
        id: String(note._id),
        lrNo,
        date: note.createdAt || null,
        displayDate: note.header?.lrDate || note.createdAt || null,
        partyName: note.header?.partyName || note.consignor?.name || note.consignee?.name || "",
        customerId: String(note.customerId || note.consignor?.customerId || ''),
        orderNo: note.header?.orderNo || "",
        from: note.header?.from || "",
        to: note.header?.to || "",
        vehicleNo: note.header?.vehicleNo || "",
        unit: note.header?.unit || "MT",
        totalQty,
        billedQty,
        remainingQty: Math.max(totalQty - billedQty, 0),
        status: getStatus(totalQty, billedQty, billing.hasBill, QUANTITY_TYPES.has(billingType)),
        billNumbers: billing.billNumbers,
        latestBillDate: billing.latestBillDate,
        amount: billing.amount,
        lrStatus: note.header?.status || "",
      };
    }).filter((row) => {
      const normalizedName = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (clientId && (row.customerId ? row.customerId !== clientId : normalizedName(row.partyName) !== normalizedName(search))) return false;
      if (!clientId && search && ![row.lrNo, row.partyName, row.orderNo, row.vehicleNo, row.from, row.to].some((value) => String(value).toLowerCase().includes(search))) return false;
      if (statusFilter === 'outstanding' && row.status === 'billed') return false;
      if (!['all', 'outstanding'].includes(statusFilter) && row.status !== statusFilter) return false;
      const rowDate = row.date ? new Date(row.date) : null;
      if (fromDate && rowDate && rowDate < new Date(`${fromDate}T00:00:00`)) return false;
      if (toDate && rowDate && rowDate > new Date(`${toDate}T23:59:59.999`)) return false;
      return true;
    });

    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize")) || 25));
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      success: true,
      data: paginatedRows,
      pagination: { page, pageSize, total: rows.length, pageCount },
      summary: {
        total: rows.length,
        billed: rows.filter((row) => row.status === "billed").length,
        partiallyBilled: rows.filter((row) => row.status === "partially-billed").length,
        unbilled: rows.filter((row) => row.status === "unbilled").length,
        billingType,
        tracksQuantity: QUANTITY_TYPES.has(billingType),
      },
    });
  } catch (error) {
    console.error("Billing register error:", error);
    return NextResponse.json({ success: false, message: "Could not load billing register" }, { status: 500 });
  }
}

export const GET = withBranchAccess(branchHandlerGET);
