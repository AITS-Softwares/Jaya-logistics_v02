import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import ConsignmentNote from "../../consignment-note/ConsignmentNote";
import OrderPanel from "../../order-panel/OrderPanel";
import PricingPanel from "../../pricing-panel/PricingPanel";
import Customer from "@/models/CustomerModel";
import { companyScopeFilter } from "@/lib/companyScope";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { getBilledLrNumbers } from "@/lib/billedLrs";

// ── PERMISSION FUNCTIONS ──
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.roles && user.roles.includes("Admin")) return true;

  const modules = user.modules || {};
  const moduleData = modules["Billing"];
  if (!moduleData || !moduleData.selected) return false;
  return true;
}

function hasPermission(user, action) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.roles && user.roles.includes("Admin")) return true;

  const modules = user.modules || {};
  const moduleData = modules["Billing"];
  if (!moduleData || !moduleData.selected) return false;

  const permissions = moduleData.permissions || {};
  return permissions[action] === true;
}

async function validateUser(req, requiredAction = null) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Authentication required", status: 401 };

  try {
    const user = verifyJWT(token);
    if (!user) return { error: "Invalid token", status: 401 };
    if (!isAuthorized(user)) {
      return { error: "Access denied. You don't have permission to access Billing.", status: 403 };
    }
    if (requiredAction && !hasPermission(user, requiredAction)) {
      return { error: `Permission denied: ${requiredAction} action not allowed for Billing.`, status: 403 };
    }
    return { user, error: null, status: 200 };
  } catch (err) {
    console.error("JWT Verification Failed:", err);
    return { error: "Authentication failed", status: 401 };
  }
}

// Helper to extract products from consignment note
function extractProductsFromNote(note) {
  const products = [];

  if (note.packData) {
    // Palletization
    if (note.packData.PALLETIZATION && note.packData.PALLETIZATION.length > 0) {
      note.packData.PALLETIZATION.forEach(row => {
        if (row.productName || (row.actualWt && parseFloat(row.actualWt) > 0)) {
          products.push({
            productName: row.productName || 'Palletized Cargo',
            actualWt: parseFloat(row.actualWt) || 0,
            billedWt: parseFloat(row.chargedWt) || parseFloat(row.actualWt) || 0,
            unit: row.wtUom || row.uom || note.header?.unit || 'MT'
          });
        }
      });
    }

    // Uniform
    if (note.packData['UNIFORM - BAGS/BOXES'] && note.packData['UNIFORM - BAGS/BOXES'].length > 0) {
      note.packData['UNIFORM - BAGS/BOXES'].forEach(row => {
        if (row.productName || (row.actualWt && parseFloat(row.actualWt) > 0)) {
          products.push({
            productName: row.productName || 'Uniform Cargo',
            actualWt: parseFloat(row.actualWt) || 0,
            billedWt: parseFloat(row.chargedWt) || parseFloat(row.actualWt) || 0,
            unit: row.wtUom || row.uom || note.header?.unit || 'MT'
          });
        }
      });
    }

    // Loose Cargo
    if (note.packData['LOOSE - CARGO'] && note.packData['LOOSE - CARGO'].length > 0) {
      note.packData['LOOSE - CARGO'].forEach(row => {
        if (row.productName || (row.actualWt && parseFloat(row.actualWt) > 0)) {
          products.push({
            productName: row.productName || 'Loose Cargo',
            actualWt: parseFloat(row.actualWt) || 0,
            billedWt: parseFloat(row.chargedWt) || parseFloat(row.actualWt) || 0,
            unit: row.wtUom || row.uom || note.header?.unit || 'MT'
          });
        }
      });
    }

    // Non-Uniform
    if (note.packData['NON-UNIFORM - GENERAL CARGO'] && note.packData['NON-UNIFORM - GENERAL CARGO'].length > 0) {
      note.packData['NON-UNIFORM - GENERAL CARGO'].forEach(row => {
        if (row.productName || (row.actualWt && parseFloat(row.actualWt) > 0)) {
          products.push({
            productName: row.productName || 'General Cargo',
            actualWt: parseFloat(row.actualWt) || 0,
            billedWt: parseFloat(row.chargedWt) || parseFloat(row.actualWt) || 0,
            unit: row.wtUom || row.uom || note.header?.unit || 'MT'
          });
        }
      });
    }
  }

  if (products.length === 0 && note.totalWeight) {
    products.push({
      productName: 'General Cargo',
      actualWt: note.totalWeight || 0,
      billedWt: note.totalWeight || 0,
      unit: note.header?.unit || 'MT'
    });
  }

  return products;
}

const normName = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
// LR created date as YYYY-MM-DD in India time
const istDate = (d) => (d ? new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '');

export async function POST(req) {
  try {
    await connectDb();

    const { user, error, status } = await validateUser(req, 'view');
    if (error) {
      return NextResponse.json({ success: false, message: error }, { status });
    }

    const body = await req.json();
    const { branchId, clientId, clientName, orderType, startDate, endDate, excludeLRs = [] } = body;

    const query = { companyId: user.companyId };
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(`${startDate}T00:00:00.000+05:30`),
        $lte: new Date(`${endDate}T23:59:59.999+05:30`),
      };
    }

    const consignmentNotes = await ConsignmentNote.find(companyScopeFilter(user, query))
      .sort({ createdAt: 1 })
      .lean();

    // Client filter: only this customer's LRs
    let clientNotes = consignmentNotes;
    if (clientId || clientName) {
      const customer = clientId
        ? await Customer.findOne({ _id: clientId, companyId: user.companyId }).select('customerName').lean()
        : null;
      const wantedName = normName(customer?.customerName || clientName);
      clientNotes = consignmentNotes.filter(note =>
        (clientId && String(note.customerId || '') === String(clientId)) ||
        (wantedName && (normName(note.header?.partyName) === wantedName || normName(note.consignor?.name) === wantedName))
      );
    }

    // LRs already billed in a General bill (Yara bills are tracked separately)
    const billedLrs = await getBilledLrNumbers(user.companyId, 'general');
    excludeLRs.forEach(lr => billedLrs.add(lr));

    const requestedOrderType = String(orderType || '').trim();
    const shouldFilterOrderType = requestedOrderType &&
      !['na', 'all types', 'all order types'].includes(normName(requestedOrderType));

    // Rates: approved Pricing Panel first, then the Order Panel row
    const orderNumbers = [...new Set(clientNotes.map(note => note.header?.orderNo).filter(Boolean))];
    const orderRowIds = clientNotes.map(note => note.orderRowId).filter(Boolean);
    const pricingPanels = orderNumbers.length
      ? await PricingPanel.find(companyScopeFilter(user, {
        'orders.orderNo': { $in: orderNumbers },
        $or: [
          { panelStatus: { $in: ['Approved', 'Completed'] } },
          { 'rateApproval.approvalStatus': { $in: ['Approved', 'Completed'] } },
          { 'rateApproval.workflowPhase': { $in: ['approved', 'locked'] } },
        ],
      }))
        .select('orders.orderNo orders.rate orders.totalAmount createdAt')
        .sort({ createdAt: -1 })
        .lean()
      : [];
    const pricingRatesByOrderNo = new Map();
    pricingPanels.forEach(panel => (panel.orders || []).forEach(order => {
      const orderNo = String(order.orderNo || '').trim();
      const rate = Number(order.rate);
      if (orderNo && Number.isFinite(rate) && rate > 0 && !pricingRatesByOrderNo.has(orderNo)) {
        pricingRatesByOrderNo.set(orderNo, rate);
      }
    }));

    const orderPanelQuery = {
      $or: [
        ...(orderNumbers.length ? [{ orderPanelNo: { $in: orderNumbers } }] : []),
        ...(orderRowIds.length ? [{ 'plantRows._id': { $in: orderRowIds } }] : []),
      ],
    };
    if (branchId) orderPanelQuery.branch = branchId;
    const orderPanels = orderNumbers.length || orderRowIds.length
      ? await OrderPanel.find(companyScopeFilter(user, orderPanelQuery)).select('orderPanelNo plantRows').lean()
      : [];
    const orderRowsById = new Map();
    const orderRowsByOrderAndTo = new Map();
    orderPanels.forEach(panel => (panel.plantRows || []).forEach(row => {
      orderRowsById.set(String(row._id), row);
      orderRowsByOrderAndTo.set(`${panel.orderPanelNo}|${String(row.toName || row.to || '').trim().toLowerCase()}`, row);
    }));

    const billData = [];
    let totalWeight = 0;
    let totalAmount = 0;
    let missingRateCount = 0;

    clientNotes.forEach(note => {
      if (billedLrs.has(note.lrNo)) return;

      const orderRow = orderRowsById.get(String(note.orderRowId))
        || orderRowsByOrderAndTo.get(`${note.header?.orderNo}|${String(note.header?.to || '').trim().toLowerCase()}`);
      if (branchId && !orderRow) return;

      const effectiveOrderType = orderRow?.orderType || note.header?.orderType || '';
      if (shouldFilterOrderType && normName(effectiveOrderType) !== normName(requestedOrderType)) return;

      const pricingPanelRate = pricingRatesByOrderNo.get(String(note.header?.orderNo || '').trim());
      const rowRate = Number(pricingPanelRate ?? orderRow?.rate ?? orderRow?.locationRate ?? 0);

      extractProductsFromNote(note).forEach((product, idx) => {
        const amount = (product.billedWt || 0) * rowRate;
        billData.push({
          _id: `${note._id}_${idx}`,
          date: istDate(note.createdAt),
          lrCreatedAt: note.createdAt || null,
          invoiceNo: note.invoice?.boeInvoiceNo || '',
          lrNo: note.lrNo || 'N/A',
          vehicleNo: note.header?.vehicleNo || 'N/A',
          from: note.header?.from || 'N/A',
          to: note.header?.to || 'N/A',
          partyName: note.header?.partyName || note.consignor?.name || 'N/A',
          productName: product.productName || 'General Cargo',
          weight: product.billedWt || 0,
          quantity: product.actualWt || 0,
          unit: product.unit || note.header?.unit || 'MT',
          rate: rowRate,
          rateMissing: !(rowRate > 0),
          amount,
          orderType: effectiveOrderType || 'N/A',
          plantCode: note.header?.plantCode || orderRow?.plantCodeValue || '',
        });
        if (!(rowRate > 0)) missingRateCount += 1;
        totalWeight += product.billedWt || 0;
        totalAmount += amount;
      });
    });

    return NextResponse.json({
      success: true,
      data: billData,
      summary: { totalRecords: billData.length, totalWeight, totalAmount, missingRateCount },
    }, { status: 200 });
  } catch (error) {
    console.error('POST /api/billing/general error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to generate bill',
    }, { status: 500 });
  }
}