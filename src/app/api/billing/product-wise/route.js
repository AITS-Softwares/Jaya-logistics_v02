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
//     const { clientId, clientName, productCategories, plantId, plantCode, orderType, startDate, endDate, branchId, branchName } = body;
    
//     // Build query
//     let query = { companyId: user.companyId };
    
//     // Date filter
//     if (startDate && endDate) {
//       query.createdAt = {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate + 'T23:59:59')
//       };
//     }
    
//     // Client filter by party name
//     if (clientName) {
//       query['header.partyName'] = { $regex: clientName, $options: 'i' };
//     }
    
//     // Order type filter
//     if (orderType && orderType !== "All Order Types") {
//       query['header.orderType'] = orderType;
//     }
    
//     const consignmentNotes = await ConsignmentNote.find(query).lean();
    
//     // Process data to extract product-wise billing
//     const billingData = [];
    
//     for (const note of consignmentNotes) {
//       const rate = 3050; // Default rate, can be customized
//       let products = [];
      
//       // Extract products from packData
//       if (note.packData) {
//         if (note.packData.PALLETIZATION) {
//           products.push(...note.packData.PALLETIZATION);
//         }
//         if (note.packData['UNIFORM - BAGS/BOXES']) {
//           products.push(...note.packData['UNIFORM - BAGS/BOXES']);
//         }
//         if (note.packData['LOOSE - CARGO']) {
//           products.push(...note.packData['LOOSE - CARGO']);
//         }
//         if (note.packData['NON-UNIFORM - GENERAL CARGO']) {
//           products.push(...note.packData['NON-UNIFORM - GENERAL CARGO']);
//         }
//       }
      
//       // Apply product category filter if needed
//       let filteredProducts = products;
//       if (productCategories) {
//         filteredProducts = products.filter(p => 
//           p.productCategory === productCategories || 
//           p.productName?.toLowerCase().includes(productCategories.toLowerCase())
//         );
//       }
      
//       for (const product of filteredProducts) {
//         const weight = parseFloat(product.actualWt || product.weight || 0);
//         billingData.push({
//           date: note.createdAt,
//           lrNo: note.lrNo,
//           vehicleNo: note.header?.vehicleNo,
//           orderNo: note.header?.orderNo,
//           orderType: note.header?.orderType,
//           fromLocation: note.header?.from,
//           toLocation: note.header?.to,
//           partyName: note.header?.partyName,
//           productName: product.productName || product.productName || 'General Cargo',
//           productCategory: productCategories || 'General',
//           invoiceNo: note.invoice?.boeInvoiceNo,
//           invoiceDate: note.invoice?.boeInvoiceDate,
//           ewaybillNo: note.ewaybill?.ewaybillNo,
//           containerNo: note.ewaybill?.containerNo,
//           weight: weight,
//           rate: rate,
//           amount: weight * rate,
//           plantCode: plantCode,
//           plantId: plantId
//         });
//       }
//     }
    
//     const totalWeight = billingData.reduce((sum, item) => sum + item.weight, 0);
//     const totalAmount = billingData.reduce((sum, item) => sum + item.amount, 0);
    
//     return NextResponse.json({
//       success: true,
//       data: billingData,
//       summary: {
//         totalWeight: totalWeight,
//         totalAmount: totalAmount,
//         totalRecords: billingData.length
//       }
//     }, { status: 200 });
    
//   } catch (error) {
//     console.error('Product-wise billing error:', error);
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to generate product-wise billing" 
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
            billedWt: parseFloat(row.chargedWt) || parseFloat(row.actualWt) || 0
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
            billedWt: parseFloat(row.chargedWt) || parseFloat(row.actualWt) || 0
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
            billedWt: parseFloat(row.chargedWt) || parseFloat(row.actualWt) || 0
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
            billedWt: parseFloat(row.chargedWt) || parseFloat(row.actualWt) || 0
          });
        }
      });
    }
  }
  
  if (products.length === 0 && note.totalWeight) {
    products.push({
      productName: 'General Cargo',
      actualWt: note.totalWeight || 0,
      billedWt: note.totalWeight || 0
    });
  }
  
  return products;
}

export async function POST(req) {
  try {
    await connectDb();
    
    const { user, error, status } = await validateUser(req, 'view');
    if (error) {
      return NextResponse.json({ success: false, message: error }, { status });
    }

    const body = await req.json();
    console.log("📊 Product Wise Bill Request Body:", body);
    
    const { 
      branchId, 
      clientId, 
      clientName,
      productCategories,
      plantId,
      plantCode,
      orderType, 
      startDate, 
      endDate,
      excludeLRs = []
    } = body;

    // Build query
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

    if (orderType && orderType !== "") {
      query['header.orderType'] = orderType;
    }

    if (plantCode) {
      query['header.plantCode'] = plantCode;
    }

    // Fetch consignment notes
    const consignmentNotes = await ConsignmentNote.find(query)
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📦 Found ${consignmentNotes.length} consignment notes`);

    // Transform data for bill
    const billData = [];
    let totalWeight = 0;
    let totalAmount = 0;
    const rate = 3050; // Default rate

    consignmentNotes.forEach(note => {
      // Skip if LR already billed
      if (excludeLRs.includes(note.lrNo)) return;

      const products = extractProductsFromNote(note);
      products.forEach((product, idx) => {
        const amount = (product.billedWt || 0) * rate;
        billData.push({
          _id: `${note._id}_${idx}`,
          date: note.createdAt ? new Date(note.createdAt).toISOString().split('T')[0] : '',
          lrNo: note.lrNo || 'N/A',
          vehicleNo: note.header?.vehicleNo || 'N/A',
          from: note.header?.from || 'N/A',
          to: note.header?.to || 'N/A',
          partyName: note.header?.partyName || note.consignor?.name || 'N/A',
          productName: product.productName || 'General Cargo',
          weight: product.billedWt || 0,
          rate: rate,
          amount: amount,
          status: note.header?.status || 'Pending',
          orderType: note.header?.orderType || 'N/A'
        });
        totalWeight += product.billedWt || 0;
        totalAmount += amount;
      });
    });

    return NextResponse.json({ 
      success: true, 
      data: billData,
      summary: {
        totalRecords: billData.length,
        totalWeight: totalWeight,
        totalAmount: totalAmount
      }
    }, { status: 200 });

  } catch (error) {
    console.error("❌ POST /api/billing/product-wise error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to generate bill"
    }, { status: 500 });
  }
}