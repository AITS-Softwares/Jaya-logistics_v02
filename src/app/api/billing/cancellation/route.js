// import { NextResponse } from "next/server";
// import connectDb from "@/lib/db";
// import ConsignmentNote from "../../consignment-note/ConsignmentNote";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function POST(req) {
//   try {
//     await connectDb();
    
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
//     }
    
//     const user = await verifyJWT(token);
//     if (!user) {
//       return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
//     }
    
//     const body = await req.json();
//     const { clientId, clientName, cancellation, startDate, endDate, branchId } = body;
    
//     let query = { companyId: user.companyId };
    
//     if (startDate && endDate) {
//       query.createdAt = {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate + 'T23:59:59')
//       };
//     }
    
//     if (clientName) {
//       query['header.partyName'] = { $regex: clientName, $options: 'i' };
//     }
    
//     // Filter cancelled orders (you may have a status field for cancellation)
//     query['header.status'] = 'Cancelled';
    
//     const consignmentNotes = await ConsignmentNote.find(query).lean();
    
//     const billingData = consignmentNotes.map((note, idx) => ({
//       id: idx + 1,
//       date: note.createdAt,
//       lrNo: note.lrNo,
//       vehicleNo: note.header?.vehicleNo,
//       partyName: note.header?.partyName,
//       cancellationType: cancellation || "Order Cancellation",
//       amount: 500 // Fixed cancellation fee or calculate based on your logic
//     }));
    
//     const totalAmount = billingData.reduce((sum, item) => sum + item.amount, 0);
    
//     return NextResponse.json({
//       success: true,
//       data: billingData,
//       summary: {
//         totalAmount: totalAmount,
//         totalRecords: billingData.length
//       }
//     }, { status: 200 });
    
//   } catch (error) {
//     console.error('Cancellation billing error:', error);
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to generate cancellation billing" 
//     }, { status: 500 });
//   }
// }

import { withBranchAccess } from '@/lib/branchAccess';
import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import ConsignmentNote from "../../consignment-note/ConsignmentNote";
import OrderPanel from "../../order-panel/OrderPanel";
import LoadingPanel from "../../loading-panel/LoadingPanel";
import PricingPanel from "../../pricing-panel/PricingPanel";
import { companyScopeFilter } from "@/lib/companyScope";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

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

async function branchHandlerPOST(req) {
  try {
    await connectDb();
    
    const { user, error, status } = await validateUser(req, 'view');
    if (error) {
      return NextResponse.json({ success: false, message: error }, { status });
    }

    const body = await req.json();
    const { clientId, clientName, cancellation, startDate, endDate, branchId, excludeLRs = [] } = body;
    
    let query = { companyId: user.companyId };
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      };
    }
    
    if (clientName) {
      query['header.partyName'] = { $regex: clientName, $options: 'i' };
    }
    
    query['header.status'] = 'Cancelled';
    
    const consignmentNotes = await ConsignmentNote.find(query).lean();
    
    const billingData = [];
    let totalAmount = 0;
    
    consignmentNotes.forEach(note => {
      if (excludeLRs.includes(note.lrNo)) return;
      
      billingData.push({
        id: billingData.length + 1,
        date: note.createdAt,
        lrNo: note.lrNo,
        vehicleNo: note.header?.vehicleNo || 'N/A',
        from: note.header?.from || 'N/A',
        to: note.header?.to || 'N/A',
        partyName: note.header?.partyName || 'N/A',
        cancellationType: cancellation || "Order Cancellation",
        amount: 500 // Fixed cancellation fee
      });
      totalAmount += 500;
    });

    const orders = await OrderPanel.find(companyScopeFilter(user, { companyId: user.companyId }))
      .select('orderPanelNo partyName customerName branchName date plantRows')
      .lean();
    const cancelledOrderRows = orders.flatMap((order) => (order.plantRows || [])
      .filter((row) => row.status === 'Cancelled')
      .map((row) => ({ order, row })));
    const orderNos = [...new Set(cancelledOrderRows.map(({ order }) => order.orderPanelNo).filter(Boolean))];
    const [loadingPanels, pricingPanels] = orderNos.length
      ? await Promise.all([
        LoadingPanel.find(companyScopeFilter(user, { 'orderRows.orderNo': { $in: orderNos } }))
          .select('orderRows.orderNo orderRows.orderPanelId orderRows.orderRowId orderRows.plantName orderRows.plantCodeValue orderRows.fromName orderRows.toName')
          .lean(),
        PricingPanel.find(companyScopeFilter(user, { 'orders.orderNo': { $in: orderNos } }))
          .select('pricingSerialNo orders.orderNo orders.orderRowId orders.plantName orders.plantCodeValue orders.fromName orders.toName orders.cancellationCharges')
          .lean(),
      ])
      : [[], []];

    const sameOrderRow = (source, candidate, candidatesForOrder) => {
      if (candidate.orderRowId && String(candidate.orderRowId) === String(source.row._id)) return true;
      if (candidatesForOrder.length === 1) return true;
      const plantMatches = String(candidate.plantCodeValue || candidate.plantName || '').trim().toLowerCase() ===
        String(source.row.plantCodeValue || source.row.plantName || '').trim().toLowerCase();
      const fromMatches = !candidate.fromName || String(candidate.fromName).trim().toLowerCase() === String(source.row.fromName || '').trim().toLowerCase();
      const toMatches = !candidate.toName || String(candidate.toName).trim().toLowerCase() === String(source.row.toName || '').trim().toLowerCase();
      // Older Loading Info / Pricing Panel rows may carry a row id from a
      // different source record. Use the stable plant and route fields as a
      // fallback so those linked rows are not silently excluded.
      return plantMatches && fromMatches && toMatches;
    };

    for (const source of cancelledOrderRows) {
      const { order, row } = source;
      if (excludeLRs.includes(order.orderPanelNo)) continue;
      if (clientName && !String(order.partyName || order.customerName || '').toLowerCase().includes(String(clientName).toLowerCase())) continue;
      const rowsForOrder = cancelledOrderRows.filter((item) => item.order.orderPanelNo === order.orderPanelNo);
      const loadingExists = loadingPanels.some((panel) => (panel.orderRows || []).some((candidate) =>
        candidate.orderNo === order.orderPanelNo && sameOrderRow(source, candidate, rowsForOrder)
      ));
      if (!loadingExists) continue;

      const pricingOrderRows = pricingPanels.flatMap((panel) => (panel.orders || [])
        .filter((candidate) => candidate.orderNo === order.orderPanelNo && sameOrderRow(source, candidate, rowsForOrder)));
      const amount = pricingOrderRows.reduce((sum, pricingRow) => {
        const value = Number(pricingRow.cancellationCharges);
        return sum + (Number.isFinite(value) && value > 0 ? value : 0);
      }, 0);
      if (!amount) continue;

      const date = row.statusChangedAt || order.date || order.createdAt;
      if (startDate && new Date(date) < new Date(startDate)) continue;
      if (endDate && new Date(date) > new Date(`${endDate}T23:59:59`)) continue;
      billingData.push({
        id: `order-${order.orderPanelNo}-${row._id}`,
        date,
        lrNo: order.orderPanelNo,
        vehicleNo: 'N/A',
        from: row.fromName || 'N/A',
        to: row.toName || 'N/A',
        partyName: order.partyName || order.customerName || 'N/A',
        cancellationType: cancellation || 'Order Cancellation',
        amount,
      });
      totalAmount += amount;
    }
    
    return NextResponse.json({
      success: true,
      data: billingData,
      summary: {
        totalAmount: totalAmount,
        totalRecords: billingData.length
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Cancellation billing error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to generate cancellation billing" 
    }, { status: 500 });
  }
}

export const POST = withBranchAccess(branchHandlerPOST);
