import { NextResponse } from "next/server";
import path from "path";
import { unlink } from "fs/promises";
import mongoose from "mongoose";
import connectDb from "@/lib/db";
import POD from "./POD";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { getNextPODNumber } from "./PODCounter";
import { activeOperatingCompanyId, companyScopeFilter } from "@/lib/companyScope";
import Plant from "@/app/api/plants/schema";
import Company from "@/models/Company";
import AdvancePayment from "../Advance-Payment/AdvancePayment";

export const runtime = "nodejs";

// Register the Plant model (used to turn stored plant ids into the real plant code)
void Plant;

/* ========================================
   CONFIG
======================================== */

// Set to true if one purchase may legitimately have several PODs.
const ALLOW_MULTIPLE_PODS_PER_PURCHASE = false;

// Dates typed in the UI are Indian local dates.
const DATE_TZ_OFFSET = "+05:30";

const MAX_TABLE_ROWS = 5000;

const POD_STATUSES = ["Pending", "Received", "Partial", "Rejected", "Completed"];
const SECTION_STATUSES = ["Clear & Ok", "Deductions", "Pending", "Received", "Partial", "Rejected", "Completed"];
// "Clear & Ok" / "Deductions" are section-level values; at POD level they mean "Received".
const SECTION_ONLY_TO_POD = { "Clear & Ok": "Received", "Deductions": "Received" };

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/* ========================================
   HELPERS
======================================== */

function json(payload, status = 200) {
  return NextResponse.json(payload, { status });
}

function fail(message, status = 400, extra = {}) {
  return json({ success: false, message, ...extra }, status);
}

function num(value) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function str(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function isValidObjectId(id) {
  return typeof id === "string" && OBJECT_ID_RE.test(id) && mongoose.Types.ObjectId.isValid(id);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Returns a Date, null (param missing) or undefined (param present but invalid)
function parseDateParam(value, { endOfDay = false } = {}) {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? `${s}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}${DATE_TZ_OFFSET}`
    : s;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// Returns the parsed body, or null when the body is empty / not valid JSON
async function readJson(req) {
  try {
    const text = await req.text();
    if (!text || !text.trim()) return {};
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function normPath(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\\/g, "/").replace(/^\/+/, "");
}

function errorResponse(error, fallbackMessage) {
  if (error?.code === 11000) return fail("POD number already exists", 409);
  if (error?.name === "ValidationError") {
    return fail(Object.values(error.errors).map((e) => e.message).join(", "), 400);
  }
  if (error?.name === "CastError") return fail(`Invalid value for ${error.path}`, 400);
  return fail(error?.message || fallbackMessage, 500);
}

// Only keep a POD file reference that is safe AND belongs to this tenant.
// Accepted paths: ones already stored on this POD (legacy files), or new uploads
// inside uploads/pod/<companyId>/ (see /api/upload/excel).
function cleanPodFile(f, user, existingPaths) {
  if (!f || typeof f !== "object" || !f.filePath) return undefined;
  const rel = normPath(String(f.filePath));
  if (!rel || rel.includes("..")) return undefined;
  const alreadyStored = existingPaths.has(rel); // legacy / previously accepted file on this POD
  const ownFolder = `uploads/pod/${String(user.companyId)}/`;
  const ownUpload = rel.startsWith(ownFolder) && /^uploads\/pod\/[\w.\-/]+$/.test(rel);
  if (!alreadyStored && !ownUpload) return undefined;
  return {
    filePath: `/${rel}`,
    filename: f.filename ? String(f.filename) : "",
    originalName: f.originalName ? String(f.originalName) : "",
    size: Number(f.size) || 0,
    mimeType: f.mimeType ? String(f.mimeType) : "",
  };
}

async function removeStoredFile(filePath) {
  const rel = normPath(filePath);
  if (!rel.startsWith("uploads/pod/") || rel.includes("..")) return;
  for (const base of [path.join(process.cwd(), "public"), process.cwd()]) {
    try {
      await unlink(path.join(base, rel));
      return;
    } catch (e) {
      if (e?.code !== "ENOENT") console.warn("Could not remove POD file:", rel, e?.message);
    }
  }
}

// Company name always comes from the server, never from the browser.
async function resolveCompany(user, existing = {}) {
  let companyName = existing.companyName || "";
  if (!companyName) {
    try {
      const company = await Company.findById(user.companyId).select("companyName").lean();
      companyName = company?.companyName || "";
    } catch {
      companyName = "";
    }
  }
  return { companyName, companyCode: existing.companyCode || "" };
}

// The advance is NEVER taken from the browser or from the Purchase Panel's planned figure.
// It is the advance of the Advance Payment record(s) actually created for this purchase
// (rejected ones are ignored). No payment => 0.
async function getAdvanceForPurchase(user, purchaseNo) {
  const no = str(purchaseNo).trim();
  if (!no) return { advance: 0, found: false, payments: [] };
  const payments = await AdvancePayment.find(
    companyScopeFilter(user, {
      purchaseNo: no,
      status: { $ne: "Rejected" },
      "paymentDetails.paymentStatus": { $ne: "Rejected" },
    })
  )
    .select("paymentNo status paymentDetails.paymentStatus vendorDetails.advance")
    .lean();
  const advance = payments.reduce((sum, p) => sum + num(p.vendorDetails?.advance), 0);
  return {
    advance,
    found: payments.length > 0,
    payments: payments.map((p) => ({
      paymentNo: p.paymentNo,
      status: p.paymentDetails?.paymentStatus || p.status || "",
      advance: num(p.vendorDetails?.advance),
    })),
  };
}

/* ── permissions ── */

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.roles && user.roles.includes("Admin")) return true;
  const moduleData = (user.modules || {})["Proof Of Delivery"];
  return !!(moduleData && moduleData.selected);
}

function hasPermission(user, action) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.roles && user.roles.includes("Admin")) return true;
  const moduleData = (user.modules || {})["Proof Of Delivery"];
  if (!moduleData || !moduleData.selected) return false;
  return (moduleData.permissions || {})[action] === true;
}

async function validateUser(req, requiredAction = null) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Authentication required. Please login.", status: 401 };

  const user = verifyJWT(token);
  if (!user) return { error: "Invalid or expired token. Please login again.", status: 401 };

  try {
    activeOperatingCompanyId(user);
  } catch (err) {
    return { error: err.message || "An operating company must be selected.", status: 403 };
  }

  if (!isAuthorized(user)) {
    return { error: "Access denied. You don't have permission to access Proof of Delivery.", status: 403 };
  }
  if (requiredAction && !hasPermission(user, requiredAction)) {
    return { error: `Permission denied: ${requiredAction} action not allowed for Proof of Delivery.`, status: 403 };
  }
  return { user, error: null, status: 200 };
}

function authFail(error, status) {
  return fail(error, status, { code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN" });
}

/* ── mappers (shared by POST and PUT) ── */

function mapOrders(list) {
  return (Array.isArray(list) ? list : []).map((order) => ({
    orderNo: str(order.orderNo),
    partyName: str(order.partyName),
    branch: str(order.branch),
    plantCode: str(order.plantCode),
    orderType: str(order.orderType),
    vehicleNo: str(order.vehicleNo),
    pinCode: str(order.pinCode),
    state: str(order.state),
    stateName: str(order.stateName || order.state),
    fromState: str(order.fromState),
    district: str(order.district),
    from: str(order.from),
    fromName: str(order.fromName || order.from),
    to: str(order.to),
    toName: str(order.toName || order.to),
    locationRate: str(order.locationRate),
    weight: num(order.weight),
    localStatus: order.localStatus || "unknown",
    localStatusLabel: order.localStatusLabel || "Unknown",
  }));
}

function mapProducts(list) {
  return (Array.isArray(list) ? list : []).map((product) => ({
    _id: product._id ? String(product._id) : new mongoose.Types.ObjectId().toString(),
    lrRefId: str(product.lrRefId),
    productName: str(product.productName),
    totalPkgs: str(product.totalPkgs),
    pkgsType: str(product.pkgsType),
    uom: str(product.uom),
    packSize: str(product.packSize),
    skuSize: str(product.skuSize),
    wtLtr: str(product.wtLtr),
    actualWt: str(product.actualWt),
    deliveryStatus: str(product.deliveryStatus),
    deduction: str(product.deduction),
    value: str(product.value),
  }));
}

// existingLr: Map(_id -> previous LR entry) – empty on create
function mapLrEntries(list, { user, canApprove, existingLr, existingPaths }) {
  return (Array.isArray(list) ? list : []).map((lr) => {
    const id = lr._id ? String(lr._id) : new mongoose.Types.ObjectId().toString();
    const prev = existingLr.get(id);

    // podFile: undefined => keep what is stored, null => user removed it, object => new file
    let podFile;
    if (lr.podFile === undefined) {
      podFile = prev?.podFile?.filePath ? prev.podFile : undefined;
    } else {
      podFile = cleanPodFile(lr.podFile, user, existingPaths);
    }

    return {
      _id: id,
      lrNo: str(lr.lrNo),
      lrDate: str(lr.lrDate),
      orderNo: str(lr.orderNo),
      delivery: lr.delivery || "COURIER",
      inPersonParsal: str(lr.inPersonParsal),
      docketNo: str(lr.docketNo),
      podDate: str(lr.podDate),
      podUpload: str(lr.podUpload),
      podFile,
      // Only approvers may change the "received" state of an LR row.
      podReceived: canApprove ? (lr.podReceived || "Pending") : (prev?.podReceived || "Pending"),
    };
  });
}

function buildVendorFinancial(input = {}, previous = {}, { advance } = {}) {
  const pick = (key, fallback = 0) => (input[key] !== undefined ? num(input[key]) : num(previous[key] ?? fallback));
  return {
    vendorName: str(input.vendorName ?? previous.vendorName),
    vendorCode: str(input.vendorCode ?? previous.vendorCode),
    total: pick("total"),
    // advance is server-controlled (see getAdvanceForPurchase); PO deduction is settled in Advance Payment
    advance: advance !== undefined ? num(advance) : num(previous.advance),
    poDeduction: 0,
    podDeduction: pick("podDeduction"),
    dueDays: pick("dueDays"),
    // balance / finalBalance are recalculated in the model's pre-save hook
  };
}

function buildStatusSection(input = {}, previous = {}, { canApprove }) {
  const pick = (key, fallback = "") => (input[key] !== undefined ? str(input[key]) : str(previous[key], fallback));
  let podStatus = previous.podStatus || "Pending";
  if (canApprove && input.podStatus !== undefined) {
    podStatus = SECTION_STATUSES.includes(input.podStatus) || input.podStatus === "" ? input.podStatus : podStatus;
  }
  return {
    lastPodDate: pick("lastPodDate"),
    podStatus,
    dueDate: pick("dueDate"),
    paymentDate: pick("paymentDate"),
    acknowledgementMail:
      input.acknowledgementMail !== undefined ? !!input.acknowledgementMail : !!previous.acknowledgementMail,
    note: pick("note"),
  };
}

// Map any status the client sends to a valid { pod, section } pair
function resolveStatuses(raw, fallbackPod) {
  const value = raw === undefined || raw === null || raw === "" ? fallbackPod : raw;
  if (POD_STATUSES.includes(value)) return { pod: value, section: value };
  if (SECTION_ONLY_TO_POD[value]) return { pod: SECTION_ONLY_TO_POD[value], section: value };
  return null;
}

function unique(values) {
  return [...new Set(values.map((v) => String(v || "").trim()).filter(Boolean))];
}

/* ========================================
   GET /api/pod-panel - Requires 'view' permission
======================================== */
export async function GET(req) {
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req, "view");
    if (error) return authFail(error, status);

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const podNo = url.searchParams.get("podNo");
    const format = url.searchParams.get("format");
    const search = (url.searchParams.get("search") || "").trim().slice(0, 100);
    const podStatus = (url.searchParams.get("podStatus") || "").trim();

    // CASE 0: advance that was really created in Advance Payment for a purchase
    const advanceFor = url.searchParams.get("advanceFor");
    if (advanceFor) {
      return json({ success: true, data: await getAdvanceForPurchase(user, advanceFor) });
    }

    // CASE 1: single POD by id
    if (id) {
      if (!isValidObjectId(id)) return fail("Invalid POD ID format", 400);
      const pod = await POD.findOne(companyScopeFilter(user, { _id: id })).lean();
      if (!pod) return fail("POD not found", 404);
      return json({ success: true, data: pod });
    }

    // CASE 2: single POD by POD number
    if (podNo) {
      const pod = await POD.findOne(companyScopeFilter(user, { podNo: String(podNo) })).lean();
      if (!pod) return fail("POD not found", 404);
      return json({ success: true, data: pod });
    }

    // CASE 3: table format for list view
    if (format === "table") {
      const from = parseDateParam(url.searchParams.get("fromDate"));
      const to = parseDateParam(url.searchParams.get("toDate"), { endOfDay: true });
      if (from === undefined || to === undefined) return fail("Invalid date filter", 400);

      const clauses = [companyScopeFilter(user)];

      if (search) {
        const rx = { $regex: escapeRegex(search), $options: "i" };
        clauses.push({
          $or: [
            { podNo: rx },
            { purchaseNo: rx },
            { companyName: rx },
            { subCompanyName: rx },
            { "vendorFinancial.vendorName": rx },
            { "purchaseOrders.orderNo": rx },
          ],
        });
      }

      // The status filter matches the POD status OR the approval-section status
      // ("Clear & Ok" / "Deductions" only ever live in the section).
      if (podStatus) {
        clauses.push({ $or: [{ podStatus }, { "podStatusSection.podStatus": podStatus }] });
      }

      if (from || to) {
        const range = {};
        if (from) range.$gte = from;
        if (to) range.$lte = to;
        clauses.push({ createdAt: range });
      }

      const query = { $and: clauses };

      // Optional pagination (?page=1&limit=50). Without it we return up to MAX_TABLE_ROWS.
      const limitParam = parseInt(url.searchParams.get("limit"), 10);
      const pageParam = Math.max(parseInt(url.searchParams.get("page"), 10) || 1, 1);
      const paginated = Number.isFinite(limitParam) && limitParam > 0;
      const limit = paginated ? Math.min(limitParam, 500) : MAX_TABLE_ROWS;

      const total = await POD.countDocuments(query);
      const pods = await POD.find(query)
        .sort({ createdAt: -1 })
        .skip(paginated ? (pageParam - 1) * limit : 0)
        .limit(limit)
        .lean();

      // plant id -> "CODE - Name"
      const plantIds = [
        ...new Set(
          pods
            .map((p) => p.purchaseOrders?.[0]?.plantCode)
            .filter((pid) => pid && OBJECT_ID_RE.test(String(pid)))
        ),
      ];
      const plantDocs = plantIds.length
        ? await Plant.find({ _id: { $in: plantIds }, companyId: user.companyId }).select("name code").lean()
        : [];
      const plantMap = {};
      plantDocs.forEach((pl) => {
        plantMap[String(pl._id)] = [pl.code, pl.name].filter(Boolean).join(" - ");
      });
      const plantLabel = (order) => {
        const raw = String(order?.plantCode || "");
        if (!raw) return order?.branch || "";
        if (plantMap[raw]) return plantMap[raw];
        return OBJECT_ID_RE.test(raw) ? order?.branch || "" : raw;
      };

      // Summarise ALL LR rows of a POD (not just the first one)
      const lrSummary = (pod) => {
        const lrs = pod.lrEntries || [];
        const n = lrs.length;
        const count = (fn) => lrs.filter(fn).length;
        const approved = pod.podStatusSection?.podStatus;
        const received = count((l) => ["Received", "Clear & Ok", "Deductions", "Completed"].includes(l.podReceived));
        let podReceived = "Pending";
        if (pod.podStatus === "Rejected") podReceived = "Rejected";
        else if (approved && approved !== "Pending") podReceived = approved;
        else if (n && received === n) podReceived = "Received";
        else if (received > 0) podReceived = "Partial";
        return {
          unloading: pod.vehicleUnloadedDate ? "Completed" : "Pending",
          podUpload: n && count((l) => l.podUpload === "UPLOADED") === n ? "Completed" : "Pending",
          podReceived,
        };
      };

      const tableData = pods.map((pod) => {
        const orders = pod.purchaseOrders || [];
        const first = orders[0];
        const summary = lrSummary(pod);
        return {
          _id: pod._id,
          podNo: pod.podNo,
          date: pod.createdAt ? new Date(pod.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "",
          purchaseNo: pod.purchaseNo,
          companyName: pod.companyName || "",
          subCompanyName: pod.subCompanyName || "",
          orderNo: unique(orders.map((o) => o.orderNo)).join(", "),
          partyName: unique(orders.map((o) => o.partyName)).join(", "),
          plantCode: plantLabel(first),
          orderType: first?.orderType || "",
          pinCode: first?.pinCode || "",
          state: first?.state || "",
          district: first?.district || "",
          from: first?.from || "",
          to: first?.to || "",
          weight: Math.round(orders.reduce((sum, o) => sum + num(o.weight), 0) * 1000) / 1000,
          unloading: summary.unloading,
          podUpload: summary.podUpload,
          podReceived: summary.podReceived,
          inPersonParsal: unique((pod.lrEntries || []).map((l) => l.inPersonParsal)).join(", "),
          vendorName: pod.vendorFinancial?.vendorName || "",
          vendorCode: pod.vendorFinancial?.vendorCode || "",
          vehicleNo: first?.vehicleNo || "",
          totalAmount: pod.vendorFinancial?.total || 0,
          paymentStatus: pod.paymentStatus || "Pending",
        };
      });

      return json({
        success: true,
        data: tableData,
        count: tableData.length,
        total,
        truncated: !paginated && total > tableData.length,
        ...(paginated ? { page: pageParam, limit } : {}),
      });
    }

    // CASE 4: list for dropdowns
    const pods = await POD.find(companyScopeFilter(user))
      .select("podNo purchaseNo podStatus companyName subCompanyName")
      .sort({ createdAt: -1 })
      .limit(MAX_TABLE_ROWS)
      .lean();

    return json({ success: true, data: pods });
  } catch (error) {
    console.error("❌ GET /pod-panel error:", error);
    return errorResponse(error, "Failed to fetch PODs");
  }
}

/* ========================================
   POST /api/pod-panel - Requires 'create' permission
======================================== */
export async function POST(req) {
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req, "create");
    if (error) return authFail(error, status);

    const body = await readJson(req);
    if (body === null) return fail("Request body must be valid JSON", 400);

    const purchaseNo = str(body.purchaseNo || body.header?.purchaseNo).trim();
    if (!purchaseNo) return fail("Purchase No is required", 400);

    if (!ALLOW_MULTIPLE_PODS_PER_PURCHASE) {
      const duplicate = await POD.findOne(
        companyScopeFilter(user, { purchaseNo, podStatus: { $ne: "Rejected" } })
      )
        .select("podNo")
        .lean();
      if (duplicate) {
        return fail(`A POD (${duplicate.podNo}) already exists for purchase ${purchaseNo}.`, 409);
      }
    }

    const canApprove = hasPermission(user, "approve");

    // Generate the number only after all cheap validation has passed
    const podNo = await getNextPODNumber(
      user.companyId,
      user.activeOperatingCompanyId,
      user.activeOperatingCompanyCode
    );

    const { companyName, companyCode } = await resolveCompany(user);
    const subCompanyId = user.activeOperatingCompanyId;
    const subCompanyName = user.activeOperatingCompanyName || "";
    const subCompanyCode = user.activeOperatingCompanyCode || "";

    let headerDate = new Date();
    if (body.header?.date) {
      headerDate = new Date(body.header.date);
      if (Number.isNaN(headerDate.getTime())) return fail("Invalid header date", 400);
    }

    const purchaseOrders = mapOrders(body.purchaseOrders);
    const lrEntries = mapLrEntries(body.lrEntries, {
      user,
      canApprove,
      existingLr: new Map(),
      existingPaths: new Set(),
    });
    const products = mapProducts(body.products);
    const advanceInfo = await getAdvanceForPurchase(user, purchaseNo);
    const vendorFinancial = buildVendorFinancial(body.vendorFinancial, {}, { advance: advanceInfo.advance });

    // Creators without approve permission cannot create an already-approved POD
    const requestedPodStatus = canApprove && POD_STATUSES.includes(body.podStatus) ? body.podStatus : "Pending";
    const requestedPaymentStatus =
      canApprove && ["Pending", "Approved", "Rejected", "Partially Paid", "Paid"].includes(body.paymentStatus)
        ? body.paymentStatus
        : "Pending";

    const pod = new POD({
      podNo,
      purchaseNo,
      pricingSerialNo: str(body.pricingSerialNo || body.header?.pricingSerialNo),

      companyId: user.companyId,
      companyName,
      companyCode,
      subCompanyId,
      subCompanyName,
      subCompanyCode,

      header: {
        podNo,
        purchaseNo,
        pricingSerialNo: str(body.pricingSerialNo || body.header?.pricingSerialNo),
        branch: str(body.header?.branch),
        branchCode: str(body.header?.branchCode),
        date: headerDate,
        delivery: body.header?.delivery || "Normal",
        companyName,
        companyCode,
        subCompanyName,
        subCompanyCode,
      },

      billing: {
        billingType: body.billing?.billingType || "Multi - Order",
        noOfLoadingPoints: str(body.billing?.noOfLoadingPoints),
        noOfDroppingPoint: str(body.billing?.noOfDroppingPoint),
      },

      purchaseOrders,
      lrEntries,
      products,
      vendorFinancial,

      podStatusSection: buildStatusSection(
        body.podStatusSection,
        {},
        { canApprove }
      ),

      remarks: str(body.remarks),
      vehicleUnloadedDate: str(body.vehicleUnloadedDate),
      unloadRemarks: str(body.unloadRemarks),

      podStatus: requestedPodStatus,
      paymentStatus: requestedPaymentStatus,

      createdBy: user.id,
    });

    await pod.save(); // totals + final balance are computed in the pre-save hook

    return json(
      {
        success: true,
        message: "POD created successfully",
        data: {
          _id: pod._id,
          podNo: pod.podNo,
          purchaseNo: pod.purchaseNo,
          companyName: pod.companyName,
          subCompanyName: pod.subCompanyName,
        },
      },
      201
    );
  } catch (error) {
    console.error("❌ POST /pod-panel error:", error);
    return errorResponse(error, "Failed to create POD");
  }
}

/* ========================================
   PUT /api/pod-panel - Requires 'edit' or 'approve' permission
======================================== */
export async function PUT(req) {
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req);
    if (error) return authFail(error, status);

    const canEdit = hasPermission(user, "edit");
    const canApprove = hasPermission(user, "approve");
    if (!canEdit && !canApprove) {
      return fail("Permission denied: edit or approve action required for Proof of Delivery.", 403, {
        code: "FORBIDDEN",
      });
    }

    const body = await readJson(req);
    if (body === null) return fail("Request body must be valid JSON", 400);
    const { id } = body;

    // Approve-only users may send nothing except the approval fields.
    if (!canEdit) {
      const APPROVE_ONLY_KEYS = [
        "id", "podStatus", "paymentStatus", "podStatusSection",
        "remarks", "approvalStatus", "approvedBy", "approvedAt",
      ];
      const extra = Object.keys(body).filter((k) => !APPROVE_ONLY_KEYS.includes(k));
      if (extra.length) {
        return fail("Permission denied: edit action not allowed for Proof of Delivery.", 403, { code: "FORBIDDEN" });
      }
    }

    if (!id) return fail("POD ID is required", 400);
    if (!isValidObjectId(id)) return fail("Invalid POD ID format", 400);

    const pod = await POD.findOne(companyScopeFilter(user, { _id: id }));
    if (!pod) return fail("POD not found", 404);

    // Only users with approve permission may change podStatus / paymentStatus.
    if (!canApprove) {
      const podStatusChanged = body.podStatus && body.podStatus !== (pod.podStatus || "Pending");
      const paymentStatusChanged = body.paymentStatus && body.paymentStatus !== (pod.paymentStatus || "Pending");
      if (podStatusChanged || paymentStatusChanged) {
        return fail("Permission denied: approve action not allowed for Proof of Delivery.", 403, {
          code: "FORBIDDEN",
        });
      }
    }

    const snapshot = pod.toObject();
    const existingLr = new Map((snapshot.lrEntries || []).map((l) => [String(l._id), l]));
    const existingPaths = new Set(
      (snapshot.lrEntries || []).map((l) => normPath(l?.podFile?.filePath)).filter(Boolean)
    );
    const prevFiles = [...existingPaths];

    // Company identity comes from the server. Existing values are kept / back-filled.
    const company = await resolveCompany(user, snapshot);
    pod.companyName = company.companyName;
    pod.companyCode = company.companyCode;
    if (!pod.subCompanyId) {
      // legacy record: adopt the active operating company once, never re-assign afterwards
      pod.subCompanyId = user.activeOperatingCompanyId;
      pod.subCompanyName = user.activeOperatingCompanyName || "";
      pod.subCompanyCode = user.activeOperatingCompanyCode || "";
    }

    // Purchase reference (kept in sync between root and header)
    const newPurchaseNo = str(body.purchaseNo || body.header?.purchaseNo).trim();
    if (newPurchaseNo && newPurchaseNo !== pod.purchaseNo) {
      if (!ALLOW_MULTIPLE_PODS_PER_PURCHASE) {
        const duplicate = await POD.findOne(
          companyScopeFilter(user, { purchaseNo: newPurchaseNo, _id: { $ne: pod._id }, podStatus: { $ne: "Rejected" } })
        )
          .select("podNo")
          .lean();
        if (duplicate) {
          return fail(`A POD (${duplicate.podNo}) already exists for purchase ${newPurchaseNo}.`, 409);
        }
      }
      pod.purchaseNo = newPurchaseNo;
    }
    if (body.pricingSerialNo !== undefined) pod.pricingSerialNo = str(body.pricingSerialNo);

    // Header (whitelisted fields only)
    if (body.header) {
      const h = snapshot.header || {};
      let date = h.date;
      if (body.header.date) {
        const d = new Date(body.header.date);
        if (Number.isNaN(d.getTime())) return fail("Invalid header date", 400);
        date = d;
      }
      pod.header = {
        podNo: pod.podNo,
        purchaseNo: pod.purchaseNo,
        pricingSerialNo: pod.pricingSerialNo,
        branch: str(body.header.branch ?? h.branch),
        branchCode: str(body.header.branchCode ?? h.branchCode),
        date,
        delivery: body.header.delivery || h.delivery || "Normal",
        companyName: pod.companyName,
        companyCode: pod.companyCode,
        subCompanyName: pod.subCompanyName,
        subCompanyCode: pod.subCompanyCode,
      };
    } else {
      pod.header = { ...(snapshot.header || {}), purchaseNo: pod.purchaseNo, pricingSerialNo: pod.pricingSerialNo };
    }

    if (body.billing) {
      const b = snapshot.billing || {};
      pod.billing = {
        billingType: body.billing.billingType || b.billingType || "Multi - Order",
        noOfLoadingPoints: str(body.billing.noOfLoadingPoints ?? b.noOfLoadingPoints),
        noOfDroppingPoint: str(body.billing.noOfDroppingPoint ?? b.noOfDroppingPoint),
      };
    }

    if (body.purchaseOrders) pod.purchaseOrders = mapOrders(body.purchaseOrders);

    if (body.lrEntries) {
      pod.lrEntries = mapLrEntries(body.lrEntries, { user, canApprove, existingLr, existingPaths });
    }

    if (body.products) pod.products = mapProducts(body.products);

    // Advance always follows the real Advance Payment (re-read on every save that touches money or purchase)
    if (body.vendorFinancial || (newPurchaseNo && newPurchaseNo !== snapshot.purchaseNo)) {
      const advanceInfo = await getAdvanceForPurchase(user, pod.purchaseNo);
      pod.vendorFinancial = buildVendorFinancial(body.vendorFinancial || {}, snapshot.vendorFinancial || {}, {
        advance: advanceInfo.advance,
      });
    }

    // Edit-only users cannot flip the approval status held in podStatusSection
    if (body.podStatusSection) {
      pod.podStatusSection = buildStatusSection(body.podStatusSection, snapshot.podStatusSection || {}, { canApprove });
    }

    if (body.remarks !== undefined) pod.remarks = str(body.remarks);
    if (body.vehicleUnloadedDate !== undefined) pod.vehicleUnloadedDate = str(body.vehicleUnloadedDate);
    if (body.unloadRemarks !== undefined) pod.unloadRemarks = str(body.unloadRemarks);

    if (canApprove) {
      if (body.podStatus) {
        if (!POD_STATUSES.includes(body.podStatus)) return fail(`Invalid podStatus. Allowed: ${POD_STATUSES.join(", ")}`, 400);
        pod.podStatus = body.podStatus;
      }
      if (body.paymentStatus) {
        const allowed = ["Pending", "Approved", "Rejected", "Partially Paid", "Paid"];
        if (!allowed.includes(body.paymentStatus)) return fail(`Invalid paymentStatus. Allowed: ${allowed.join(", ")}`, 400);
        pod.paymentStatus = body.paymentStatus;
      }

      // Audit trail is written by the server – approvedBy / approvedAt from the client are ignored.
      const sectionStatus = pod.podStatusSection?.podStatus;
      if (body.approvalStatus === "Approved" && sectionStatus && sectionStatus !== "Pending") {
        pod.approvalStatus = "Approved";
        pod.approvedBy = isValidObjectId(String(user.id)) ? user.id : null;
        pod.approvedByName = user.name || "";
        pod.approvedAt = new Date();
      }
    }

    // Delete files that are no longer referenced (removed / replaced uploads)
    const keptFiles = new Set((pod.lrEntries || []).map((l) => normPath(l?.podFile?.filePath)).filter(Boolean));

    await pod.save(); // totals + final balance are computed in the pre-save hook

    for (const f of prevFiles) {
      if (!keptFiles.has(f)) await removeStoredFile(f);
    }

    return json({
      success: true,
      message: "POD updated successfully",
      data: {
        _id: pod._id,
        podNo: pod.podNo,
        purchaseNo: pod.purchaseNo,
        companyName: pod.companyName,
        subCompanyName: pod.subCompanyName,
      },
    });
  } catch (error) {
    console.error("❌ PUT /pod-panel error:", error);
    return errorResponse(error, "Failed to update POD");
  }
}

/* ========================================
   DELETE /api/pod-panel - Requires 'delete' permission
======================================== */
export async function DELETE(req) {
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req, "delete");
    if (error) return authFail(error, status);

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return fail("POD ID is required", 400);
    if (!isValidObjectId(id)) return fail("Invalid POD ID format", 400);

    const pod = await POD.findOne(companyScopeFilter(user, { _id: id }));
    if (!pod) return fail("POD not found", 404);

    // Approved / paid PODs feed payments – they must not be deleted silently.
    if (["Approved", "Partially Paid", "Paid"].includes(pod.paymentStatus)) {
      return fail(
        `POD ${pod.podNo} is ${pod.paymentStatus} and cannot be deleted. Reject it first if it was approved by mistake.`,
        409
      );
    }

    const files = (pod.lrEntries || []).map((l) => l?.podFile?.filePath).filter(Boolean);

    await POD.deleteOne({ _id: pod._id, companyId: user.companyId });
    for (const f of files) await removeStoredFile(f);

    console.log(`✅ POD deleted: ${pod.podNo}`);

    return json({
      success: true,
      message: "POD deleted successfully",
      data: { podNo: pod.podNo, purchaseNo: pod.purchaseNo },
    });
  } catch (error) {
    console.error("❌ DELETE /pod-panel error:", error);
    return errorResponse(error, "Failed to delete POD");
  }
}

/* ========================================
   PATCH /api/pod-panel?id=...&action=approve|reject|complete|update-status
   Requires 'approve' permission. Body is optional (quick approve sends none).
======================================== */
export async function PATCH(req) {
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req, "approve");
    if (error) return authFail(error, status);

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const action = url.searchParams.get("action");

    if (!id || !isValidObjectId(id)) return fail("Valid ID is required", 400);
    if (!["approve", "reject", "complete", "update-status"].includes(action)) {
      return fail("Invalid action. Allowed: approve, reject, complete, update-status", 400);
    }

    const body = await readJson(req); // empty body => {}
    if (body === null) return fail("Request body must be valid JSON", 400);

    const pod = await POD.findOne(companyScopeFilter(user, { _id: id }));
    if (!pod) return fail("POD not found", 404);

    // State rules
    if (pod.paymentStatus === "Paid") {
      return fail(`POD ${pod.podNo} is already Paid and can no longer be changed.`, 409);
    }
    if (action === "complete" && pod.paymentStatus !== "Approved" && pod.paymentStatus !== "Partially Paid") {
      return fail("Only an approved POD can be completed. Approve it first.", 409);
    }

    const defaults = { approve: "Received", reject: "Rejected", complete: "Completed", "update-status": pod.podStatus };
    const resolved = resolveStatuses(body.podStatus, defaults[action]);
    if (!resolved) {
      return fail(`Invalid podStatus. Allowed: ${[...POD_STATUSES, ...Object.keys(SECTION_ONLY_TO_POD)].join(", ")}`, 400);
    }
    if (action === "approve" && ["Rejected", "Pending"].includes(resolved.pod)) {
      return fail("Approve requires a status of Received, Partial or Completed.", 400);
    }

    const audit = (approvalStatus) => {
      pod.approvalStatus = approvalStatus;
      pod.approvedBy = isValidObjectId(String(user.id)) ? user.id : null;
      pod.approvedByName = user.name || "";
      pod.approvedAt = new Date();
    };
    const setLrReceived = (value) => {
      (pod.lrEntries || []).forEach((lr) => { lr.podReceived = value; });
    };

    let message;

    if (action === "approve") {
      pod.podStatus = resolved.pod;
      if (pod.paymentStatus !== "Partially Paid") pod.paymentStatus = "Approved";
      pod.podStatusSection.podStatus = resolved.section;
      setLrReceived(resolved.pod);
      audit("Approved");
      message = "POD approved successfully";
    } else if (action === "reject") {
      pod.podStatus = "Rejected";
      pod.paymentStatus = "Rejected";
      pod.podStatusSection.podStatus = "Rejected";
      setLrReceived("Rejected");
      audit("Rejected");
      message = "POD rejected successfully";
    } else if (action === "complete") {
      pod.podStatus = "Completed";
      pod.paymentStatus = "Paid";
      pod.podStatusSection.podStatus = "Completed";
      pod.podStatusSection.paymentDate = new Date().toISOString();
      setLrReceived("Completed");
      message = "POD completed successfully";
    } else {
      // update-status
      if (body.podStatus) {
        pod.podStatus = resolved.pod;
        pod.podStatusSection.podStatus = resolved.section;
      }
      if (body.podStatusSection && typeof body.podStatusSection === "object") {
        const prev = pod.podStatusSection.toObject ? pod.podStatusSection.toObject() : pod.podStatusSection;
        pod.podStatusSection = buildStatusSection(body.podStatusSection, prev, { canApprove: true });
      }
    }

    if (body.remarks !== undefined) pod.remarks = str(body.remarks);

    await pod.save();

    return json({
      success: true,
      message: action === "update-status" ? `POD status updated to ${pod.podStatus}` : message,
      data: {
        _id: pod._id,
        podNo: pod.podNo,
        podStatus: pod.podStatus,
        paymentStatus: pod.paymentStatus,
      },
    });
  } catch (error) {
    console.error("❌ PATCH /pod-panel error:", error);
    return errorResponse(error, "Failed to update POD status");
  }
}