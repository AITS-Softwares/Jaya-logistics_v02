// import { NextResponse } from "next/server";
// import connectDb from "@/lib/db";
// import ConsignmentNote from "../../consignment-note/ConsignmentNote";
// import Branch from "../../branches/schema";
// import Customer from "@/models/CustomerModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// // Role-based access check
// function isAuthorized(user) {
//   return (
//     user?.type === "company" ||
//     user?.role === "Admin" ||
//     user?.permissions?.includes("billing")
//   );
// }

// async function validateUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };

//   try {
//     const user = await verifyJWT(token);
//     if (!user) return { error: "Invalid token", status: 401 };
//     if (!isAuthorized(user)) return { error: "Unauthorized", status: 403 };
//     return { user, error: null, status: 200 };
//   } catch (err) {
//     console.error("JWT Verification Failed:", err?.message || err);
//     return { error: "Invalid token", status: 401 };
//   }
// }

// // Helper to extract products from consignment note
// function extractProductsFromNote(note) {
//   const products = [];
//   let rate = 3050; // Default rate
  
//   // Extract from packData
//   if (note.packData) {
//     // Palletization
//     if (note.packData.PALLETIZATION && note.packData.PALLETIZATION.length > 0) {
//       note.packData.PALLETIZATION.forEach(row => {
//         if (row.productName || (row.actualWt && parseFloat(row.actualWt) > 0)) {
//           products.push({
//             productName: row.productName || 'Palletized Cargo',
//             actualWt: parseFloat(row.actualWt) || 0,
//             billedWt: parseFloat(row.chargedWt) || parseFloat(row.actualWt) || 0,
//             rate: rate
//           });
//         }
//       });
//     }
    
//     // Uniform
//     if (note.packData['UNIFORM - BAGS/BOXES'] && note.packData['UNIFORM - BAGS/BOXES'].length > 0) {
//       note.packData['UNIFORM - BAGS/BOXES'].forEach(row => {
//         if (row.productName || (row.actualWt && parseFloat(row.actualWt) > 0)) {
//           products.push({
//             productName: row.productName || 'Uniform Cargo',
//             actualWt: parseFloat(row.actualWt) || 0,
//             billedWt: parseFloat(row.chargedWt) || parseFloat(row.actualWt) || 0,
//             rate: rate
//           });
//         }
//       });
//     }
    
//     // Loose Cargo
//     if (note.packData['LOOSE - CARGO'] && note.packData['LOOSE - CARGO'].length > 0) {
//       note.packData['LOOSE - CARGO'].forEach(row => {
//         if (row.productName || (row.actualWt && parseFloat(row.actualWt) > 0)) {
//           products.push({
//             productName: row.productName || 'Loose Cargo',
//             actualWt: parseFloat(row.actualWt) || 0,
//             billedWt: parseFloat(row.chargedWt) || parseFloat(row.actualWt) || 0,
//             rate: rate
//           });
//         }
//       });
//     }
    
//     // Non-Uniform
//     if (note.packData['NON-UNIFORM - GENERAL CARGO'] && note.packData['NON-UNIFORM - GENERAL CARGO'].length > 0) {
//       note.packData['NON-UNIFORM - GENERAL CARGO'].forEach(row => {
//         if (row.productName || (row.actualWt && parseFloat(row.actualWt) > 0)) {
//           products.push({
//             productName: row.productName || 'General Cargo',
//             actualWt: parseFloat(row.actualWt) || 0,
//             billedWt: parseFloat(row.chargedWt) || parseFloat(row.actualWt) || 0,
//             rate: rate
//           });
//         }
//       });
//     }
//   }
  
//   // If no products found, add default
//   if (products.length === 0 && note.totalWeight) {
//     products.push({
//       productName: 'General Cargo',
//       actualWt: note.totalWeight || 0,
//       billedWt: note.totalWeight || 0,
//       rate: rate
//     });
//   }
  
//   return products;
// }

// export async function POST(req) {
//   try {
//     await connectDb();
//     const { user, error, status } = await validateUser(req);
//     if (error) {
//       return NextResponse.json({ success: false, message: error }, { status });
//     }

//     const body = await req.json();
//     const { 
//       branchId, 
//       branchName, 
//       clientId, 
//       clientName, 
//       status: statusFilter, 
//       startDate, 
//       endDate 
//     } = body;

//     console.log("📊 Generating General Bill with filters:", { branchId, clientId, statusFilter, startDate, endDate });

//     // Build query
//     let query = { companyId: user.companyId };

//     // Date filter
//     if (startDate && endDate) {
//       query.createdAt = {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate + 'T23:59:59')
//       };
//     }

//     // Status filter
//     if (statusFilter) {
//       query['header.status'] = statusFilter;
//     }

//     // Branch filter - need to join with branch table
//     let brandIds = [];
//     if (branchId) {
//       // If branch selected, we need to filter consignment notes by branch
//       // Since consignment notes don't have direct branchId, we need to get branch's plant codes? 
//       // For now, we'll fetch all and filter by branchName
//       const branch = await Branch.findOne({ _id: branchId, companyId: user.companyId });
//       if (branch) {
//         brandIds = [branchId];
//       }
//     }

//     // Fetch consignment notes
//     const consignmentNotes = await ConsignmentNote.find(query)
//       .sort({ createdAt: -1 })
//       .lean();

//     console.log(`📦 Found ${consignmentNotes.length} consignment notes`);

//     // Filter by branch if needed (based on header.from or header.to containing branch name)
//     let filteredNotes = consignmentNotes;
//     if (branchId && branchName) {
//       filteredNotes = consignmentNotes.filter(note => 
//         note.header?.from?.toLowerCase().includes(branchName.toLowerCase()) ||
//         note.header?.to?.toLowerCase().includes(branchName.toLowerCase())
//       );
//       console.log(`📦 After branch filter: ${filteredNotes.length} notes`);
//     }

//     // Filter by client if needed
//     if (clientId && clientName) {
//       filteredNotes = filteredNotes.filter(note => 
//         note.header?.partyName?.toLowerCase().includes(clientName.toLowerCase()) ||
//         note.consignor?.name?.toLowerCase().includes(clientName.toLowerCase())
//       );
//       console.log(`📦 After client filter: ${filteredNotes.length} notes`);
//     }

//     // Transform data for bill
//     const billData = [];
//     let totalWeight = 0;
//     let totalAmount = 0;

//     filteredNotes.forEach(note => {
//       const products = extractProductsFromNote(note);
//       products.forEach((product, idx) => {
//         const amount = (product.billedWt || 0) * (product.rate || 0);
//         billData.push({
//           _id: `${note._id}_${idx}`,
//           date: note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-GB').replace(/\//g, '.') : '',
//           lrNo: note.lrNo || 'N/A',
//           vehicleNo: note.header?.vehicleNo || 'N/A',
//           from: note.header?.from || 'N/A',
//           to: note.header?.to || 'N/A',
//           partyName: note.header?.partyName || note.consignor?.name || 'N/A',
//           productName: product.productName,
//           actualWt: product.actualWt,
//           billedWt: product.billedWt,
//           rate: product.rate,
//           amount: amount,
//           status: note.header?.status || 'Pending'
//         });
//         totalWeight += product.billedWt || 0;
//         totalAmount += amount;
//       });
//     });

//     console.log(`✅ Generated ${billData.length} bill entries`);

//     return NextResponse.json({ 
//       success: true, 
//       data: billData,
//       summary: {
//         totalRecords: billData.length,
//         totalWeight: totalWeight,
//         totalAmount: totalAmount
//       },
//       filters: { branchId, branchName, clientId, clientName, statusFilter, startDate, endDate }
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ POST /api/billing/general-bill error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to generate bill"
//     }, { status: 500 });
//   }
// }

import { NextResponse } from "next/server";
import connectDb from "@/lib/db";

// import SavedReport from "../../saved-reports"
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

// GET - Fetch saved reports (requires 'view' permission)
export async function GET(req) {
  try {
    await connectDb();
    
    const { user, error, status } = await validateUser(req, 'view');
    if (error) {
      return NextResponse.json({ success: false, message: error }, { status });
    }

    const reports = await SavedReport.find({ companyId: user.companyId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ 
      success: true, 
      data: reports 
    }, { status: 200 });

  } catch (error) {
    console.error("❌ GET /api/saved-reports error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to fetch reports"
    }, { status: 500 });
  }
}

// POST - Save a new report (requires 'create' permission)
export async function POST(req) {
  try {
    await connectDb();
    
    const { user, error, status } = await validateUser(req, 'create');
    if (error) {
      return NextResponse.json({ success: false, message: error }, { status });
    }

    const body = await req.json();
    
    const newReport = new SavedReport({
      ...body,
      companyId: user.companyId,
      createdBy: user.id
    });

    await newReport.save();

    return NextResponse.json({ 
      success: true, 
      message: "Report saved successfully",
      data: newReport
    }, { status: 201 });

  } catch (error) {
    console.error("❌ POST /api/saved-reports error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to save report"
    }, { status: 500 });
  }
}