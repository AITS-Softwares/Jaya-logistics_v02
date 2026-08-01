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

import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import ConsignmentNote from "../../consignment-note/ConsignmentNote";
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

export async function POST(req) {
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