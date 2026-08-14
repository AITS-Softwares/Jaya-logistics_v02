


// import { NextResponse } from "next/server";
// import connectDb from "@/lib/db";
// import PricingPanel from "./PricingPanel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { getNextPricingSerialNumber } from "./PricingCounter";
// import mongoose from 'mongoose';

// // ── PERMISSION FUNCTIONS ──

// function isAuthorized(user) {
//   if (!user) return false;
  
//   // Company admins have full access
//   if (user.type === "company") return true;
  
//   // Admin role has full access
//   if (user.roles && user.roles.includes("Admin")) return true;
  
//   // Check module-based permissions for "Pricing Panel"
//   const modules = user.modules || {};
//   const moduleData = modules["Pricing Panel"];
  
//   if (!moduleData || !moduleData.selected) return false;
  
//   return true;
// }

// function hasPermission(user, action) {
//   if (!user) return false;
//   if (user.type === "company") return true;
//   if (user.roles && user.roles.includes("Admin")) return true;
  
//   const modules = user.modules || {};
//   const moduleData = modules["Pricing Panel"];
  
//   if (!moduleData || !moduleData.selected) return false;
  
//   const permissions = moduleData.permissions || {};
//   return permissions[action] === true;
// }

// async function validateUser(req, requiredAction = null) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Authentication required. Please login.", status: 401 };

//   try {
//     const user = verifyJWT(token);
//     if (!user) return { error: "Invalid or expired token. Please login again.", status: 401 };
    
//     if (!isAuthorized(user)) {
//       return { 
//         error: "Access denied. You don't have permission to access Pricing Panel.", 
//         status: 403 
//       };
//     }
    
//     if (requiredAction && !hasPermission(user, requiredAction)) {
//       return { 
//         error: `Permission denied: ${requiredAction} action not allowed for Pricing Panel.`, 
//         status: 403 
//       };
//     }
    
//     return { user, error: null, status: 200 };
//   } catch (err) {
//     console.error("JWT Verification Failed:", err?.message || err);
//     return { error: "Authentication failed. Please login again.", status: 401 };
//   }
// }

// // ── HELPER FUNCTIONS ──

// function isValidObjectId(id) {
//   return id && mongoose.Types.ObjectId.isValid(id);
// }

// function formatDateDDMMYYYY(date) {
//   if (!date) return '';
//   const d = new Date(date);
//   if (isNaN(d.getTime())) return '';
  
//   const day = String(d.getDate()).padStart(2, '0');
//   const month = String(d.getMonth() + 1).padStart(2, '0');
//   const year = d.getFullYear();
  
//   return `${day}/${month}/${year}`;
// }

// /* ========================================
//    GET /api/pricing-panel - Requires 'view' permission
// ======================================== */
// export async function GET(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req, 'view');
//   if (error) {
//     return NextResponse.json({ 
//       success: false, 
//       message: error,
//       code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
//     }, { status });
//   }

//   try {
//     const url = new URL(req.url);
//     const id = url.searchParams.get("id");
//     const format = url.searchParams.get("format");
//     const search = url.searchParams.get("search");
//     const pricingStatus = url.searchParams.get("pricingStatus");
//     const approvalStatus = url.searchParams.get("approvalStatus");
//     const fromDate = url.searchParams.get("fromDate");
//     const toDate = url.searchParams.get("toDate");
    
//     // ============ CASE 1: GET SINGLE PRICING PANEL BY ID ============
//     if (id) {
//       console.log(`📄 Fetching pricing panel by ID: ${id}`);
      
//       if (!isValidObjectId(id)) {
//         return NextResponse.json({ 
//           success: false, 
//           message: "Invalid pricing panel ID format" 
//         }, { status: 400 });
//       }
      
//       const pricingPanel = await PricingPanel.findOne({
//         _id: id,
//         companyId: user.companyId
//       }).lean();

//       if (!pricingPanel) {
//         return NextResponse.json({ 
//           success: false, 
//           message: "Pricing panel not found" 
//         }, { status: 404 });
//       }

//       return NextResponse.json({ 
//         success: true, 
//         data: pricingPanel 
//       }, { status: 200 });
//     }
    
//     // ============ CASE 2: TABLE FORMAT FOR REPORT ============
//     if (format === 'table') {
//       console.log("📋 Fetching pricing panels for table report");
      
//       let query = { 
//         companyId: user.companyId,
//         status: 'Active'
//       };

//       // Apply search filter
//       if (search) {
//         query.$or = [
//           { pricingSerialNo: { $regex: search, $options: 'i' } },
//           { partyName: { $regex: search, $options: 'i' } },
//           { branchName: { $regex: search, $options: 'i' } }
//         ];
//       }
      
//       // Apply approval status filter
//       if (approvalStatus) {
//         query['rateApproval.approvalStatus'] = approvalStatus;
//       }
      
//       // Apply date range filters
//       if (fromDate) {
//         query.date = { $gte: new Date(fromDate) };
//       }
//       if (toDate) {
//         const endDate = new Date(toDate);
//         endDate.setHours(23, 59, 59, 999);
//         query.date = { ...query.date, $lte: endDate };
//       }

//       const pricingPanels = await PricingPanel.find(query)
//         .sort({ date: -1, createdAt: -1 })
//         .lean();

//       console.log(`Found ${pricingPanels.length} pricing panels`);

//       const tableData = [];
      
//       for (const panel of pricingPanels) {
//         const formattedDate = panel.date ? formatDateDDMMYYYY(panel.date) : '';
        
//         if (panel.orders && panel.orders.length > 0) {
//           for (const order of panel.orders) {
//             const reportRow = panel.reportRows?.find(r => r.order === order.orderNo);
            
//             let vnnNumber = '-';
//             if (order.vehicleNegotiationId) {
//               try {
//                 const VehicleNegotiation = mongoose.models.VehicleNegotiation;
//                 if (VehicleNegotiation) {
//                   const vn = await VehicleNegotiation.findById(order.vehicleNegotiationId).select('vnnNo').lean();
//                   vnnNumber = vn?.vnnNo || '-';
//                 }
//               } catch (err) {
//                 console.error('Error fetching VNN:', err);
//               }
//             }
            
//             tableData.push({
//               panelId: panel._id.toString(),
//               date: formattedDate,
//               pricingSerialNo: panel.pricingSerialNo || '',
//               vnn: vnnNumber,
//               orderNo: order.orderNo || '',
//               partyName: order.partyName || panel.partyName || '',
//               plantCode: order.plantName || '',
//               orderType: order.orderType || '',
//               pinCode: order.pinCode || '',
//               taluka: order.talukaName || order.taluka || '-',
//               state: order.stateName || '',
//               district: order.districtName || '',
//               from: order.fromName || '',
//               to: order.toName || '',
//               weight: order.weight || 0,
//               pricing: reportRow?.pricing || panel.reportRows?.[0]?.pricing || 'Pending',
//               approval: panel.rateApproval?.approvalStatus || 'Pending',
//               branchName: panel.branchName || ''
//             });
//           }
//         } else {
//           tableData.push({
//             panelId: panel._id.toString(),
//             date: formattedDate,
//             pricingSerialNo: panel.pricingSerialNo || '',
//             vnn: '-',
//             orderNo: '',
//             partyName: panel.partyName || '',
//             plantCode: '',
//             orderType: '',
//             pinCode: '',
//             taluka: '-',
//             state: '',
//             district: '',
//             from: '',
//             to: '',
//             weight: 0,
//             pricing: panel.reportRows?.[0]?.pricing || 'Pending',
//             approval: panel.rateApproval?.approvalStatus || 'Pending',
//             branchName: panel.branchName || ''
//           });
//         }
//       }

//       return NextResponse.json({
//         success: true,
//         data: tableData,
//         total: tableData.length,
//         message: `Found ${tableData.length} order records`
//       }, { status: 200 });
//     }
    
//     // ============ CASE 3: GET LIST OF PRICING PANELS ============
//     console.log("📋 Fetching pricing panel list");
    
//     const pricingPanels = await PricingPanel.find({ 
//       companyId: user.companyId,
//       status: 'Active'
//     })
//     .select('pricingSerialNo date branchName partyName totalWeight totalAmount rateApproval.approvalStatus orders')
//     .sort({ createdAt: -1 })
//     .lean();

//     const formattedPanels = pricingPanels.map(panel => {
//       const vnns = new Set();
//       if (panel.orders && panel.orders.length > 0) {
//         panel.orders.forEach(order => {
//           if (order.vehicleNegotiationId) {
//             vnns.add(order.vehicleNegotiationId.toString().slice(-6));
//           }
//         });
//       }

//       return {
//         _id: panel._id,
//         pricingSerialNo: panel.pricingSerialNo,
//         date: panel.date ? new Date(panel.date).toISOString().split('T')[0] : '',
//         branchName: panel.branchName || 'N/A',
//         partyName: panel.partyName || 'N/A',
//         totalWeight: panel.totalWeight || 0,
//         totalAmount: panel.totalAmount || 0,
//         approvalStatus: panel.rateApproval?.approvalStatus || 'Pending',
//         vnnCount: vnns.size,
//         vnnList: Array.from(vnns)
//       };
//     });

//     return NextResponse.json({
//       success: true,
//       data: formattedPanels,
//       total: formattedPanels.length
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ GET /pricing-panel error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: "Failed to fetch pricing panels",
//       error: error.message 
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    POST /api/pricing-panel - Requires 'create' permission
// ======================================== */
// export async function POST(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req, 'create');
//   if (error) {
//     return NextResponse.json({ 
//       success: false, 
//       message: error,
//       code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
//     }, { status });
//   }

//   try {
//     const body = await req.json();
    
//     console.log("📝 Creating new pricing panel");
    
//     // Generate Pricing Serial Number
//     let pricingSerialNo = await getNextPricingSerialNumber(user.companyId);
    
//     // Check if Pricing Serial Number already exists
//     const existing = await PricingPanel.findOne({ pricingSerialNo, companyId: user.companyId });
//     if (existing) {
//       pricingSerialNo = await getNextPricingSerialNumber(user.companyId);
//     }

//     // Handle branch - it could be an ID string or an object from frontend
//     let branchId = null;
//     let branchName = '';
//     let branchCode = '';
    
//     if (body.header?.branch) {
//       if (typeof body.header.branch === 'object' && body.header.branch !== null) {
//         branchId = body.header.branch._id || null;
//         branchName = body.header.branch.name || body.header.branchName || '';
//         branchCode = body.header.branch.code || body.header.branchCode || '';
//       } else {
//         branchId = body.header.branch;
//         if (body.branches && Array.isArray(body.branches)) {
//           const branchFromArray = body.branches.find(b => b._id === branchId);
//           if (branchFromArray) {
//             branchName = branchFromArray.name || '';
//             branchCode = branchFromArray.code || '';
//           }
//         }
//       }
//     }

//     // Validate and process orders from the 'orders' array
//     const orders = [];
    
//     if (body.orders && Array.isArray(body.orders)) {
//       console.log(`Processing ${body.orders.length} orders from frontend`);
      
//       for (const order of body.orders) {
//         if (!order.orderNo || order.orderNo.trim() === "") {
//           console.log("Skipping empty order row");
//           continue;
//         }
        
//         // Handle vehicleNegotiationId properly
//         let vehicleNegotiationId = null;
//         if (order.vehicleNegotiationId) {
//           if (typeof order.vehicleNegotiationId === 'object' && order.vehicleNegotiationId !== null) {
//             vehicleNegotiationId = order.vehicleNegotiationId._id || null;
//           } else if (typeof order.vehicleNegotiationId === 'string') {
//             if (isValidObjectId(order.vehicleNegotiationId)) {
//               vehicleNegotiationId = new mongoose.Types.ObjectId(order.vehicleNegotiationId);
//             } else {
//               vehicleNegotiationId = order.vehicleNegotiationId;
//             }
//           }
//         }
        
//         // Find related data from reference arrays
//         const fromBranch = body.branches?.find(b => b._id === order.from);
//         const toBranch = body.branches?.find(b => b._id === order.to);
//         const plant = body.plants?.find(p => p._id === order.plantCode);
//         const country = body.countries?.find(c => c.code === order.country);
//         const state = body.states?.find(s => s._id === order.stateId);
//         const district = body.districts?.find(d => d._id === order.districtId);
//         const taluka = body.talukas?.find(t => t._id === order.talukaId);
        
//         orders.push({
//           orderNo: order.orderNo,
//           vehicleNegotiationId: vehicleNegotiationId,
//           partyName: order.partyName || body.header?.partyName || '',
//           customerId: order.customerId || body.header?.customerId || null,
//           customerCode: order.customerCode || '',
//           contactPerson: order.contactPerson || '',
//           plantCode: order.plantCode || null,
//           plantName: order.plantName || (plant ? `${plant.name} (${plant.code})` : ''),
//           plantCodeValue: order.plantCodeValue || '',
//           orderType: order.orderType || 'Sales',
//           pinCode: order.pinCode || '',
//           country: order.country || '',
//           countryName: country?.name || order.countryName || '',
//           state: order.state || '',
//           stateName: state ? state.name : order.stateName || '',
//           stateId: order.stateId || null,
//           district: order.district || '',
//           districtName: district ? district.name : order.districtName || '',
//           districtId: order.districtId || null,
//           taluka: order.taluka || '',
//           talukaName: taluka ? taluka.name : (order.talukaName || order.taluka || ''),
//           talukaId: order.talukaId || null,
//           from: order.from || null,
//           fromName: fromBranch ? fromBranch.name : order.fromName || '',
//           to: order.to || null,
//           toName: toBranch ? toBranch.name : order.toName || '',
//           locationRate: order.locationRate || '',
//           priceList: order.priceList || '',
//           weight: parseFloat(order.weight) || 0,
//           rate: parseFloat(order.rate) || 0,
//           totalAmount: (parseFloat(order.weight) || 0) * (parseFloat(order.rate) || 0)
//         });
//       }
//     }
    
//     // Check if we have at least one valid order
//     if (orders.length === 0) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "At least one valid order is required" 
//       }, { status: 400 });
//     }

//     // Calculate totals
//     const totalAmount = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
//     const totalWeight = orders.reduce((sum, order) => sum + (order.weight || 0), 0);

//     // Handle customerId
//     let customerId = null;
//     if (body.header?.customerId) {
//       if (typeof body.header.customerId === 'object' && body.header.customerId !== null && body.header.customerId._id) {
//         customerId = new mongoose.Types.ObjectId(body.header.customerId._id);
//       } else if (typeof body.header.customerId === 'string' && 
//                  body.header.customerId.trim() !== '' && 
//                  mongoose.Types.ObjectId.isValid(body.header.customerId)) {
//         customerId = new mongoose.Types.ObjectId(body.header.customerId);
//       }
//     }

//     // Create pricing report rows
//     const reportRows = orders.map(order => ({
//       date: body.header?.date ? new Date(body.header.date) : new Date(),
//       pricingSerialNo: pricingSerialNo,
//       order: order.orderNo,
//       partyName: order.partyName || '-',
//       plantCode: order.plantName || '-',
//       orderType: order.orderType || 'Sales',
//       pinCode: order.pinCode || '-',
//       taluka: order.talukaName || order.taluka || '-',
//       state: order.stateName || '-',
//       district: order.districtName || '-',
//       from: order.fromName || '-',
//       to: order.toName || '-',
//       weight: order.weight || 0,
//       pricing: 'Pending',
//       approval: body.rateApproval?.approvalStatus || 'Pending'
//     }));

//     // Handle billing charges - convert to appropriate types
//     const cancellationCharges = typeof body.billing?.cancellationCharges === 'number' 
//       ? body.billing.cancellationCharges.toString() 
//       : (body.billing?.cancellationCharges || 'Nil');
      
//     const loadingCharges = typeof body.billing?.loadingCharges === 'number'
//       ? body.billing.loadingCharges.toString()
//       : (body.billing?.loadingCharges || 'Nil');
      
//     const otherCharges = typeof body.billing?.otherCharges === 'number'
//       ? body.billing.otherCharges.toString()
//       : (body.billing?.otherCharges || 'Nil');

//     // Create new pricing panel document
//     const newPricingPanel = new PricingPanel({
//       pricingSerialNo,
//       branch: branchId,
//       branchName: branchName || body.header?.branchName || '',
//       branchCode: branchCode || body.header?.branchCode || '',
//       delivery: body.header?.delivery || 'Normal',
//       date: body.header?.date ? new Date(body.header.date) : new Date(),
//       customerId,
//       partyName: body.header?.partyName || '',
      
//       // Billing Information
//       billingType: body.billing?.billingType || 'Multi - Order',
//       loadingPoints: parseInt(body.billing?.loadingPoints) || 1,
//       dropPoints: parseInt(body.billing?.dropPoints) || 1,
//       collectionCharges: parseFloat(body.billing?.collectionCharges) || 0,
//       cancellationCharges: cancellationCharges,
//       loadingCharges: loadingCharges,
//       otherCharges: otherCharges,
      
//       // Orders
//       orders: orders,
//       totalWeight,
//       totalAmount,
      
//       // Rate Approval
//       rateApproval: {
//         approvalType: body.rateApproval?.approvalType || 'Contract Rates',
//         uploadFile: body.rateApproval?.uploadFileName || '',
//         approvalStatus: body.rateApproval?.approvalStatus || 'Pending'
//       },
      
//       // Report Data
//       reportRows,
      
//       // Company & User Tracking
//       companyId: user.companyId,
//       createdBy: user.id,
//       panelStatus: 'Draft',
//       status: 'Active'
//     });

//     await newPricingPanel.save();

//     return NextResponse.json({ 
//       success: true, 
//       message: "Pricing panel created successfully",
//       data: {
//         _id: newPricingPanel._id,
//         pricingSerialNo: newPricingPanel.pricingSerialNo
//       }
//     }, { status: 201 });

//   } catch (error) {
//     console.error("❌ POST /pricing-panel error:", error);
    
//     if (error.code === 11000) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Pricing serial number already exists" 
//       }, { status: 400 });
//     }
    
//     if (error.name === 'ValidationError') {
//       const messages = Object.values(error.errors).map(err => err.message);
//       return NextResponse.json({ 
//         success: false, 
//         message: messages.join(', ') 
//       }, { status: 400 });
//     }
    
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to create pricing panel"
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    PUT /api/pricing-panel - Requires 'edit' permission
// ======================================== */
// export async function PUT(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req, 'edit');
//   if (error) {
//     return NextResponse.json({ 
//       success: false, 
//       message: error,
//       code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
//     }, { status });
//   }

//   try {
//     const body = await req.json();
//     const { id } = body;
    
//     if (!id) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Pricing panel ID is required" 
//       }, { status: 400 });
//     }

//     console.log(`📝 Updating pricing panel: ${id}`);
    
//     // Validate ID format
//     if (!isValidObjectId(id)) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Invalid pricing panel ID format" 
//       }, { status: 400 });
//     }
    
//     // Find the pricing panel
//     const pricingPanel = await PricingPanel.findOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (!pricingPanel) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Pricing panel not found" 
//       }, { status: 404 });
//     }

//     // Update header
//     if (body.header) {
//       pricingPanel.branch = body.header.branch || pricingPanel.branch;
//       pricingPanel.branchName = body.header.branchName || pricingPanel.branchName;
//       pricingPanel.branchCode = body.header.branchCode || pricingPanel.branchCode;
//       pricingPanel.delivery = body.header.delivery || pricingPanel.delivery;
//       pricingPanel.date = body.header.date ? new Date(body.header.date) : pricingPanel.date;
//       pricingPanel.customerId = body.header.customerId || pricingPanel.customerId;
//       pricingPanel.partyName = body.header.partyName || pricingPanel.partyName;
//     }

//     // Update billing
//     if (body.billing) {
//       pricingPanel.billingType = body.billing.billingType || pricingPanel.billingType;
//       pricingPanel.loadingPoints = parseInt(body.billing.loadingPoints) || pricingPanel.loadingPoints;
//       pricingPanel.dropPoints = parseInt(body.billing.dropPoints) || pricingPanel.dropPoints;
//       pricingPanel.collectionCharges = parseFloat(body.billing.collectionCharges) || pricingPanel.collectionCharges;
      
//       if (body.billing.cancellationCharges !== undefined) {
//         pricingPanel.cancellationCharges = typeof body.billing.cancellationCharges === 'number' 
//           ? body.billing.cancellationCharges.toString() 
//           : body.billing.cancellationCharges;
//       }
      
//       if (body.billing.loadingCharges !== undefined) {
//         pricingPanel.loadingCharges = typeof body.billing.loadingCharges === 'number' 
//           ? body.billing.loadingCharges.toString() 
//           : body.billing.loadingCharges;
//       }
      
//       if (body.billing.otherCharges !== undefined) {
//         pricingPanel.otherCharges = typeof body.billing.otherCharges === 'number' 
//           ? body.billing.otherCharges.toString() 
//           : body.billing.otherCharges;
//       }
//     }

//     // Update orders with complete fields
//     if (body.orders) {
//       const processedOrders = body.orders.map(order => ({
//         _id: order._id && isValidObjectId(order._id) 
//           ? new mongoose.Types.ObjectId(order._id) 
//           : new mongoose.Types.ObjectId(),
//         orderNo: order.orderNo || '',
//         vehicleNegotiationId: order.vehicleNegotiationId || null,
//         partyName: order.partyName || '',
//         customerId: order.customerId || null,
//         customerCode: order.customerCode || '',
//         contactPerson: order.contactPerson || '',
//         plantCode: order.plantCode || null,
//         plantName: order.plantName || '',
//         plantCodeValue: order.plantCodeValue || '',
//         orderType: order.orderType || 'Sales',
//         pinCode: order.pinCode || '',
//         country: order.country || '',
//         countryName: order.countryName || '',
//         state: order.state || '',
//         stateName: order.stateName || '',
//         stateId: order.stateId || null,
//         district: order.district || '',
//         districtName: order.districtName || '',
//         districtId: order.districtId || null,
//         taluka: order.taluka || '',
//         talukaName: order.talukaName || order.taluka || '',
//         talukaId: order.talukaId || null,
//         from: order.from || null,
//         fromName: order.fromName || '',
//         to: order.to || null,
//         toName: order.toName || '',
//         locationRate: order.locationRate || '',
//         priceList: order.priceList || '',
//         weight: parseFloat(order.weight) || 0,
//         rate: parseFloat(order.rate) || 0,
//         totalAmount: (parseFloat(order.weight) || 0) * (parseFloat(order.rate) || 0)
//       }));
      
//       pricingPanel.orders = processedOrders;
//       pricingPanel.totalWeight = processedOrders.reduce((sum, order) => sum + (order.weight || 0), 0);
//       pricingPanel.totalAmount = processedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
//     }

//     // Update rate approval
//     if (body.rateApproval) {
//       pricingPanel.rateApproval = {
//         approvalType: body.rateApproval.approvalType || pricingPanel.rateApproval?.approvalType || 'Contract Rates',
//         uploadFile: body.rateApproval.uploadFile || pricingPanel.rateApproval?.uploadFile || '',
//         approvalStatus: body.rateApproval.approvalStatus || pricingPanel.rateApproval?.approvalStatus || 'Pending'
//       };
//     }

//     // Save the updated pricing panel (this will trigger pre-save hooks)
//     await pricingPanel.save();

//     console.log(`✅ Pricing panel updated successfully: ${id}`);

//     return NextResponse.json({ 
//       success: true, 
//       message: "Pricing panel updated successfully",
//       data: {
//         _id: pricingPanel._id,
//         pricingSerialNo: pricingPanel.pricingSerialNo
//       }
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ PUT /pricing-panel error:", error);
    
//     if (error.name === 'ValidationError') {
//       const messages = Object.values(error.errors).map(err => err.message);
//       return NextResponse.json({ 
//         success: false, 
//         message: messages.join(', ') 
//       }, { status: 400 });
//     }
    
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to update pricing panel"
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    DELETE /api/pricing-panel - Requires 'delete' permission
// ======================================== */
// export async function DELETE(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req, 'delete');
//   if (error) {
//     return NextResponse.json({ 
//       success: false, 
//       message: error,
//       code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
//     }, { status });
//   }

//   try {
//     const url = new URL(req.url);
//     const id = url.searchParams.get("id");
    
//     if (!id) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Pricing panel ID is required" 
//       }, { status: 400 });
//     }

//     console.log(`🗑️ Deleting pricing panel: ${id}`);
    
//     if (!isValidObjectId(id)) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Invalid pricing panel ID format" 
//       }, { status: 400 });
//     }
    
//     const pricingPanel = await PricingPanel.findOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (!pricingPanel) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Pricing panel not found" 
//       }, { status: 404 });
//     }

//     const result = await PricingPanel.deleteOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (result.deletedCount === 0) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Failed to delete pricing panel" 
//       }, { status: 500 });
//     }

//     console.log(`✅ Pricing panel deleted successfully: ${id}`);

//     return NextResponse.json({ 
//       success: true, 
//       message: "Pricing panel deleted successfully" 
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ DELETE /pricing-panel error:", error);
    
//     if (error.name === 'CastError') {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Invalid pricing panel ID format" 
//       }, { status: 400 });
//     }
    
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to delete pricing panel"
//     }, { status: 500 });
//   }
// }
// /* ========================================
//    PATCH /api/pricing-panel - Requires 'approve' permission
//    Handles: approve, reject, complete, update-approval, approve-with-update
// ======================================== */
// export async function PATCH(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req, 'approve');
//   if (error) {
//     return NextResponse.json({ 
//       success: false, 
//       message: error,
//       code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
//     }, { status });
//   }

//   try {
//     const body = await req.json();
//     const { id, action, approvalData } = body;
    
//     if (!id) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Pricing panel ID is required" 
//       }, { status: 400 });
//     }

//     console.log(`📝 Updating pricing panel: ${id} - Action: ${action}`);
    
//     if (!isValidObjectId(id)) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Invalid pricing panel ID format" 
//       }, { status: 400 });
//     }
    
//     const pricingPanel = await PricingPanel.findOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (!pricingPanel) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Pricing panel not found" 
//       }, { status: 404 });
//     }

//     // Handle different actions
//     switch(action) {
//       case 'approve':
//         // Simple approve - only update status
//         pricingPanel.rateApproval.approvalStatus = 'Approved';
//         pricingPanel.panelStatus = 'Approved';
//         break;
        
//       case 'reject':
//         // Simple reject - only update status
//         pricingPanel.rateApproval.approvalStatus = 'Rejected';
//         pricingPanel.panelStatus = 'Rejected';
//         break;
        
//       case 'complete':
//         // Complete - update status and report rows
//         pricingPanel.rateApproval.approvalStatus = 'Completed';
//         pricingPanel.panelStatus = 'Completed';
//         // Update report rows pricing status
//         if (pricingPanel.reportRows) {
//           pricingPanel.reportRows.forEach(row => {
//             row.pricing = 'Completed';
//           });
//         }
//         break;
        
//       case 'update-approval':
//         // Update approval details without changing status
//         if (approvalData) {
//           const currentApproval = pricingPanel.rateApproval || {};
          
//           // Update only the fields that are provided
//           if (approvalData.approvalType !== undefined) {
//             pricingPanel.rateApproval.approvalType = approvalData.approvalType;
//           }
//           if (approvalData.uploadFile !== undefined) {
//             pricingPanel.rateApproval.uploadFile = approvalData.uploadFile;
//           }
//           if (approvalData.remarks !== undefined) {
//             pricingPanel.rateApproval.remarks = approvalData.remarks;
//           }
//           // Keep existing approvalStatus if not changing
//           if (approvalData.approvalStatus !== undefined) {
//             pricingPanel.rateApproval.approvalStatus = approvalData.approvalStatus;
//           }
//         }
//         break;
        
//       case 'approve-with-update':
//         // Approve AND update approval details
//         if (approvalData) {
//           if (approvalData.approvalType !== undefined) {
//             pricingPanel.rateApproval.approvalType = approvalData.approvalType;
//           }
//           if (approvalData.uploadFile !== undefined) {
//             pricingPanel.rateApproval.uploadFile = approvalData.uploadFile;
//           }
//           if (approvalData.remarks !== undefined) {
//             pricingPanel.rateApproval.remarks = approvalData.remarks;
//           }
//         }
//         // Set status to Approved
//         pricingPanel.rateApproval.approvalStatus = 'Approved';
//         pricingPanel.panelStatus = 'Approved';
//         break;
        
//       default:
//         return NextResponse.json({ 
//           success: false, 
//           message: "Invalid action. Allowed: approve, reject, complete, update-approval, approve-with-update" 
//         }, { status: 400 });
//     }

//     await pricingPanel.save();

//     // Return appropriate success message
//     let successMessage = `Pricing panel ${action}d successfully`;
//     if (action === 'update-approval') {
//       successMessage = 'Approval details updated successfully';
//     } else if (action === 'approve-with-update') {
//       successMessage = 'Pricing panel approved with updates';
//     }

//     return NextResponse.json({ 
//       success: true, 
//       message: successMessage,
//       data: {
//         _id: pricingPanel._id,
//         pricingSerialNo: pricingPanel.pricingSerialNo,
//         approvalStatus: pricingPanel.rateApproval.approvalStatus,
//         panelStatus: pricingPanel.panelStatus
//       }
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ PATCH /pricing-panel error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to update pricing panel"
//     }, { status: 500 });
//   }
// }

// app/api/pricing-panel/route.js
import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import PricingPanel from "./PricingPanel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { getNextPricingSerialNumber } from "./PricingCounter";
import mongoose from 'mongoose';
import { activeOperatingCompanyId, companyScopeFilter } from "@/lib/companyScope";
import VehicleNegotiation from '@/app/api/vehicle-negotiation/VehicleNegotiation';

// ── PERMISSION FUNCTIONS ──

function isAuthorized(user) {
  if (!user) return false;
  
  if (user.type === "company") return true;
  if (user.roles && user.roles.includes("Admin")) return true;
  
  const modules = user.modules || {};
  const moduleData = modules["Pricing Panel"];
  
  if (!moduleData || !moduleData.selected) return false;
  
  return true;
}

function hasPermission(user, action) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.roles && user.roles.includes("Admin")) return true;
  
  const modules = user.modules || {};
  const moduleData = modules["Pricing Panel"];
  
  if (!moduleData || !moduleData.selected) return false;
  
  const permissions = moduleData.permissions || {};
  return permissions[action] === true;
}

async function validateUser(req, requiredAction = null) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Authentication required. Please login.", status: 401 };

  try {
    const user = verifyJWT(token);
    if (!user) return { error: "Invalid or expired token. Please login again.", status: 401 };
    try { activeOperatingCompanyId(user); } catch (error) { return { error: error.message, status: 401 }; }
    
    if (!isAuthorized(user)) {
      return { 
        error: "Access denied. You don't have permission to access Pricing Panel.", 
        status: 403 
      };
    }
    
    if (requiredAction && !hasPermission(user, requiredAction)) {
      return { 
        error: `Permission denied: ${requiredAction} action not allowed for Pricing Panel.`, 
        status: 403 
      };
    }
    
    return { user, error: null, status: 200 };
  } catch (err) {
    console.error("JWT Verification Failed:", err?.message || err);
    return { error: "Authentication failed. Please login again.", status: 401 };
  }
}

// ── HELPER FUNCTIONS ──

function isValidObjectId(id) {
  return id && mongoose.Types.ObjectId.isValid(id);
}

function formatDateDDMMYYYY(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/* ========================================
   GET /api/pricing-panel - Requires 'view' permission
======================================== */
export async function GET(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req, 'view');
  if (error) {
    return NextResponse.json({ 
      success: false, 
      message: error,
      code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
    }, { status });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const format = url.searchParams.get("format");
    const search = url.searchParams.get("search");
    const pricingStatus = url.searchParams.get("pricingStatus");
    const approvalStatus = url.searchParams.get("approvalStatus");
    const fromDate = url.searchParams.get("fromDate");
    const toDate = url.searchParams.get("toDate");
    
    if (id) {
      console.log(`📄 Fetching pricing panel by ID: ${id}`);
      
      if (!isValidObjectId(id)) {
        return NextResponse.json({ 
          success: false, 
          message: "Invalid pricing panel ID format" 
        }, { status: 400 });
      }
      
      const pricingPanel = await PricingPanel.findOne(companyScopeFilter(user, { _id: id })).lean();

      if (!pricingPanel) {
        return NextResponse.json({ 
          success: false, 
          message: "Pricing panel not found" 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        data: pricingPanel 
      }, { status: 200 });
    }
    
    if (format === 'table') {
      console.log("📋 Fetching pricing panels for table report");
      
      let query = { status: 'Active' };

      if (search) {
        query.$or = [
          { pricingSerialNo: { $regex: search, $options: 'i' } },
          { partyName: { $regex: search, $options: 'i' } },
          { branchName: { $regex: search, $options: 'i' } },
          { subCompanyName: { $regex: search, $options: 'i' } },
          { subCompanyCode: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (approvalStatus) {
        query['rateApproval.approvalStatus'] = approvalStatus;
      }
      
      if (fromDate) {
        query.date = { $gte: new Date(fromDate) };
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        query.date = { ...query.date, $lte: endDate };
      }

      const pricingPanels = await PricingPanel.find(companyScopeFilter(user, query))
        .sort({ date: -1, createdAt: -1 })
        .lean();

      console.log(`Found ${pricingPanels.length} pricing panels`);

      const tableData = [];
      
      for (const panel of pricingPanels) {
        const formattedDate = panel.date ? formatDateDDMMYYYY(panel.date) : '';
        
        if (panel.orders && panel.orders.length > 0) {
          for (const order of panel.orders) {
            const reportRow = panel.reportRows?.find(r => r.order === order.orderNo);
            
            let vnnNumber = '-';
            if (order.vehicleNegotiationId) {
              try {
                const VehicleNegotiation = mongoose.models.VehicleNegotiation;
                if (VehicleNegotiation) {
                  const vn = await VehicleNegotiation.findById(order.vehicleNegotiationId).select('vnnNo').lean();
                  vnnNumber = vn?.vnnNo || '-';
                }
              } catch (err) {
                console.error('Error fetching VNN:', err);
              }
            }
            
            tableData.push({
              panelId: panel._id.toString(),
              date: formattedDate,
              pricingSerialNo: panel.pricingSerialNo || '',
              vnn: vnnNumber,
              orderNo: order.orderNo || '',
              partyName: order.partyName || panel.partyName || '',
              plantCode: order.plantName || '',
              orderType: order.orderType || '',
              pinCode: order.pinCode || '',
              taluka: order.talukaName || order.taluka || '-',
              state: order.stateName || '',
              district: order.districtName || '',
              from: order.fromName || '',
              to: order.toName || '',
              weight: order.weight || 0,
              pricing: reportRow?.pricing || panel.reportRows?.[0]?.pricing || 'Pending',
              approval: panel.rateApproval?.approvalStatus || 'Pending',
              branchName: panel.branchName || '',
              subCompanyName: order.subCompanyName || panel.subCompanyName || '',
              subCompanyCode: order.subCompanyCode || panel.subCompanyCode || ''
            });
          }
        } else {
          tableData.push({
            panelId: panel._id.toString(),
            date: formattedDate,
            pricingSerialNo: panel.pricingSerialNo || '',
            vnn: '-',
            orderNo: '',
            partyName: panel.partyName || '',
            plantCode: '',
            orderType: '',
            pinCode: '',
            taluka: '-',
            state: '',
            district: '',
            from: '',
            to: '',
            weight: 0,
            pricing: panel.reportRows?.[0]?.pricing || 'Pending',
            approval: panel.rateApproval?.approvalStatus || 'Pending',
            branchName: panel.branchName || '',
            subCompanyName: panel.subCompanyName || '',
            subCompanyCode: panel.subCompanyCode || ''
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: tableData,
        total: tableData.length,
        message: `Found ${tableData.length} order records`
      }, { status: 200 });
    }
    
    console.log("📋 Fetching pricing panel list");
    
    const pricingPanels = await PricingPanel.find(companyScopeFilter(user, { status: 'Active' }))
    .select('pricingSerialNo date branchName partyName subCompanyName subCompanyCode totalWeight totalAmount rateApproval.approvalStatus orders')
    .sort({ createdAt: -1 })
    .lean();

    const formattedPanels = pricingPanels.map(panel => {
      const vnns = new Set();
      if (panel.orders && panel.orders.length > 0) {
        panel.orders.forEach(order => {
          if (order.vehicleNegotiationId) {
            vnns.add(order.vehicleNegotiationId.toString().slice(-6));
          }
        });
      }

      return {
        _id: panel._id,
        pricingSerialNo: panel.pricingSerialNo,
        date: panel.date ? new Date(panel.date).toISOString().split('T')[0] : '',
        branchName: panel.branchName || 'N/A',
        partyName: panel.partyName || 'N/A',
        subCompanyName: panel.subCompanyName || '',
        subCompanyCode: panel.subCompanyCode || '',
        totalWeight: panel.totalWeight || 0,
        totalAmount: panel.totalAmount || 0,
        approvalStatus: panel.rateApproval?.approvalStatus || 'Pending',
        vnnCount: vnns.size,
        vnnList: Array.from(vnns)
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedPanels,
      total: formattedPanels.length
    }, { status: 200 });

  } catch (error) {
    console.error("❌ GET /pricing-panel error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to fetch pricing panels",
      error: error.message 
    }, { status: 500 });
  }
}

/* ========================================
   POST /api/pricing-panel - Requires 'create' permission
======================================== */
export async function POST(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req, 'create');
  if (error) {
    return NextResponse.json({ 
      success: false, 
      message: error,
      code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
    }, { status });
  }

  try {
    const body = await req.json();

    const vnnIds = [...new Set((body.orders || []).map((order) => {
      const value = order?.vehicleNegotiationId;
      return typeof value === 'object' ? value?._id?.toString() : value?.toString();
    }).filter((id) => isValidObjectId(id)))];
    if (vnnIds.length) {
      const approvedCount = await VehicleNegotiation.countDocuments(companyScopeFilter(user, {
        _id: { $in: vnnIds }, 'approval.part3Status': 'Approved'
      }));
      if (approvedCount !== vnnIds.length) {
        return NextResponse.json({ success: false, message: 'Only Part 3 approved Vehicle Negotiations can be used for Pricing.' }, { status: 409 });
      }
    }
    
    console.log("📝 Creating new pricing panel");
    
    let pricingSerialNo = await getNextPricingSerialNumber(user.companyId);
    
    const existing = await PricingPanel.findOne(companyScopeFilter(user, { pricingSerialNo }));
    if (existing) {
      pricingSerialNo = await getNextPricingSerialNumber(user.companyId);
    }

    // Handle branch
    let branchId = null;
    let branchName = '';
    let branchCode = '';
    
    if (body.header?.branch) {
      if (typeof body.header.branch === 'object' && body.header.branch !== null) {
        branchId = body.header.branch._id || null;
        branchName = body.header.branch.name || body.header.branchName || '';
        branchCode = body.header.branch.code || body.header.branchCode || '';
      } else {
        branchId = body.header.branch;
        if (body.branches && Array.isArray(body.branches)) {
          const branchFromArray = body.branches.find(b => b._id === branchId);
          if (branchFromArray) {
            branchName = branchFromArray.name || '';
            branchCode = branchFromArray.code || '';
          }
        }
      }
    }

    const subCompanyId = user.activeOperatingCompanyId;
    const subCompanyName = user.activeOperatingCompanyName || '';
    const subCompanyCode = user.activeOperatingCompanyCode || '';

    // Process orders
    const orders = [];
    
    if (body.orders && Array.isArray(body.orders)) {
      console.log(`Processing ${body.orders.length} orders from frontend`);
      
      for (const order of body.orders) {
        if (!order.orderNo || order.orderNo.trim() === "") {
          console.log("Skipping empty order row");
          continue;
        }
        
        let vehicleNegotiationId = null;
        if (order.vehicleNegotiationId) {
          if (typeof order.vehicleNegotiationId === 'object' && order.vehicleNegotiationId !== null) {
            vehicleNegotiationId = order.vehicleNegotiationId._id || null;
          } else if (typeof order.vehicleNegotiationId === 'string') {
            if (isValidObjectId(order.vehicleNegotiationId)) {
              vehicleNegotiationId = new mongoose.Types.ObjectId(order.vehicleNegotiationId);
            } else {
              vehicleNegotiationId = order.vehicleNegotiationId;
            }
          }
        }
        
        const fromBranch = body.branches?.find(b => b._id === order.from);
        const toBranch = body.branches?.find(b => b._id === order.to);
        const plant = body.plants?.find(p => p._id === order.plantCode);
        const country = body.countries?.find(c => c.code === order.country);
        const state = body.states?.find(s => s._id === order.stateId);
        const district = body.districts?.find(d => d._id === order.districtId);
        const taluka = body.talukas?.find(t => t._id === order.talukaId);
        
        // Get sub-company from order or fallback to header
        let orderSubCompanyId = null;
        let orderSubCompanyName = '';
        let orderSubCompanyCode = '';
        
        orderSubCompanyId = subCompanyId;
        orderSubCompanyName = subCompanyName;
        orderSubCompanyCode = subCompanyCode;
        
        orders.push({
          orderNo: order.orderNo,
          vehicleNegotiationId: vehicleNegotiationId,
          partyName: order.partyName || body.header?.partyName || '',
          customerId: order.customerId || body.header?.customerId || null,
          customerCode: order.customerCode || '',
          contactPerson: order.contactPerson || '',
          plantCode: order.plantCode || null,
          plantName: order.plantName || (plant ? `${plant.name} (${plant.code})` : ''),
          plantCodeValue: order.plantCodeValue || '',
          orderType: order.orderType || 'Sales',
          pinCode: order.pinCode || '',
          country: order.country || '',
          countryName: country?.name || order.countryName || '',
          state: order.state || '',
          stateName: state ? state.name : order.stateName || '',
          stateId: order.stateId || null,
          district: order.district || '',
          districtName: district ? district.name : order.districtName || '',
          districtId: order.districtId || null,
          taluka: order.taluka || '',
          talukaName: taluka ? taluka.name : (order.talukaName || order.taluka || ''),
          talukaId: order.talukaId || null,
          from: order.from || null,
          fromName: fromBranch ? fromBranch.name : order.fromName || '',
          fromState: order.fromState || '',
          to: order.to || null,
          toName: toBranch ? toBranch.name : order.toName || '',
          locationRate: order.locationRate || '',
          priceList: order.priceList || '',
          weight: parseFloat(order.weight) || 0,
          rate: parseFloat(order.rate) || 0,
          totalAmount: (parseFloat(order.weight) || 0) * (parseFloat(order.rate) || 0),
          subCompanyId: orderSubCompanyId,
          subCompanyName: orderSubCompanyName,
          subCompanyCode: orderSubCompanyCode,
          localStatus: order.localStatus || 'unknown',
          localStatusLabel: order.localStatusLabel || 'Unknown'
        });
      }
    }
    
    if (orders.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "At least one valid order is required" 
      }, { status: 400 });
    }

    const totalAmount = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalWeight = orders.reduce((sum, order) => sum + (order.weight || 0), 0);

    let customerId = null;
    if (body.header?.customerId) {
      if (typeof body.header.customerId === 'object' && body.header.customerId !== null && body.header.customerId._id) {
        customerId = new mongoose.Types.ObjectId(body.header.customerId._id);
      } else if (typeof body.header.customerId === 'string' && 
                 body.header.customerId.trim() !== '' && 
                 mongoose.Types.ObjectId.isValid(body.header.customerId)) {
        customerId = new mongoose.Types.ObjectId(body.header.customerId);
      }
    }

    const reportRows = orders.map(order => ({
      date: body.header?.date ? new Date(body.header.date) : new Date(),
      pricingSerialNo: pricingSerialNo,
      order: order.orderNo,
      partyName: order.partyName || '-',
      plantCode: order.plantName || '-',
      orderType: order.orderType || 'Sales',
      pinCode: order.pinCode || '-',
      taluka: order.talukaName || order.taluka || '-',
      state: order.stateName || '-',
      district: order.districtName || '-',
      from: order.fromName || '-',
      to: order.toName || '-',
      weight: order.weight || 0,
      pricing: 'Pending',
      approval: body.rateApproval?.approvalStatus || 'Pending',
      subCompanyName: order.subCompanyName || subCompanyName || '',
      subCompanyCode: order.subCompanyCode || subCompanyCode || ''
    }));

    const cancellationCharges = typeof body.billing?.cancellationCharges === 'number' 
      ? body.billing.cancellationCharges.toString() 
      : (body.billing?.cancellationCharges || 'Nil');
      
    const loadingCharges = typeof body.billing?.loadingCharges === 'number'
      ? body.billing.loadingCharges.toString()
      : (body.billing?.loadingCharges || 'Nil');
      
    const otherCharges = typeof body.billing?.otherCharges === 'number'
      ? body.billing.otherCharges.toString()
      : (body.billing?.otherCharges || 'Nil');

    const newPricingPanel = new PricingPanel({
  pricingSerialNo,
  branch: branchId,
  branchName: branchName || body.header?.branchName || '',
  branchCode: branchCode || body.header?.branchCode || '',
  // ✅ ADD SUB-COMPANY TO HEADER
  subCompanyId: subCompanyId,
  subCompanyName: subCompanyName || body.header?.subCompanyName || '',
  subCompanyCode: subCompanyCode || body.header?.subCompanyCode || '',
  delivery: body.header?.delivery || 'Normal',
      date: body.header?.date ? new Date(body.header.date) : new Date(),
      customerId,
      partyName: body.header?.partyName || '',
      
      billingType: body.billing?.billingType || 'Multi - Order',
      loadingPoints: parseInt(body.billing?.loadingPoints) || 1,
      dropPoints: parseInt(body.billing?.dropPoints) || 1,
      collectionCharges: parseFloat(body.billing?.collectionCharges) || 0,
      cancellationCharges: cancellationCharges,
      loadingCharges: loadingCharges,
      otherCharges: otherCharges,
      
      orders: orders,
      totalWeight,
      totalAmount,
      
      rateApproval: {
        approvalType: body.rateApproval?.approvalType || 'Contract Rates',
        uploadFile: body.rateApproval?.uploadFileName || '',
        approvalStatus: body.rateApproval?.approvalStatus || 'Pending'
      },
      
      reportRows,
      
      companyId: user.companyId,
      createdBy: user.id,
      panelStatus: 'Draft',
      status: 'Active'
    });

    await newPricingPanel.save();

    return NextResponse.json({ 
      success: true, 
      message: "Pricing panel created successfully",
      data: {
        _id: newPricingPanel._id,
        pricingSerialNo: newPricingPanel.pricingSerialNo
      }
    }, { status: 201 });

  } catch (error) {
    console.error("❌ POST /pricing-panel error:", error);
    
    if (error.code === 11000) {
      return NextResponse.json({ 
        success: false, 
        message: "Pricing serial number already exists" 
      }, { status: 400 });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json({ 
        success: false, 
        message: messages.join(', ') 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to create pricing panel"
    }, { status: 500 });
  }
}

/* ========================================
   PUT /api/pricing-panel - Requires 'edit' permission
======================================== */
export async function PUT(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req, 'edit');
  if (error) {
    return NextResponse.json({ 
      success: false, 
      message: error,
      code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
    }, { status });
  }

  try {
    const body = await req.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: "Pricing panel ID is required" 
      }, { status: 400 });
    }

    console.log(`📝 Updating pricing panel: ${id}`);
    
    if (!isValidObjectId(id)) {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid pricing panel ID format" 
      }, { status: 400 });
    }
    
    const pricingPanel = await PricingPanel.findOne(companyScopeFilter(user, { _id: id }));

    if (!pricingPanel) {
      return NextResponse.json({ 
        success: false, 
        message: "Pricing panel not found" 
      }, { status: 404 });
    }

    // Update header
    if (body.header) {
      pricingPanel.branch = body.header.branch || pricingPanel.branch;
      pricingPanel.branchName = body.header.branchName || pricingPanel.branchName;
      pricingPanel.branchCode = body.header.branchCode || pricingPanel.branchCode;
      
      pricingPanel.subCompanyId = user.activeOperatingCompanyId;
      pricingPanel.subCompanyName = user.activeOperatingCompanyName || '';
      pricingPanel.subCompanyCode = user.activeOperatingCompanyCode || '';
      
      pricingPanel.delivery = body.header.delivery || pricingPanel.delivery;
      pricingPanel.date = body.header.date ? new Date(body.header.date) : pricingPanel.date;
      pricingPanel.customerId = body.header.customerId || pricingPanel.customerId;
      pricingPanel.partyName = body.header.partyName || pricingPanel.partyName;
    }

    // Update billing
    if (body.billing) {
      pricingPanel.billingType = body.billing.billingType || pricingPanel.billingType;
      pricingPanel.loadingPoints = parseInt(body.billing.loadingPoints) || pricingPanel.loadingPoints;
      pricingPanel.dropPoints = parseInt(body.billing.dropPoints) || pricingPanel.dropPoints;
      pricingPanel.collectionCharges = parseFloat(body.billing.collectionCharges) || pricingPanel.collectionCharges;
      
      if (body.billing.cancellationCharges !== undefined) {
        pricingPanel.cancellationCharges = typeof body.billing.cancellationCharges === 'number' 
          ? body.billing.cancellationCharges.toString() 
          : body.billing.cancellationCharges;
      }
      
      if (body.billing.loadingCharges !== undefined) {
        pricingPanel.loadingCharges = typeof body.billing.loadingCharges === 'number' 
          ? body.billing.loadingCharges.toString() 
          : body.billing.loadingCharges;
      }
      
      if (body.billing.otherCharges !== undefined) {
        pricingPanel.otherCharges = typeof body.billing.otherCharges === 'number' 
          ? body.billing.otherCharges.toString() 
          : body.billing.otherCharges;
      }
    }

    // Update orders
    if (body.orders) {
      const processedOrders = body.orders.map(order => ({
        _id: order._id && isValidObjectId(order._id) 
          ? new mongoose.Types.ObjectId(order._id) 
          : new mongoose.Types.ObjectId(),
        orderNo: order.orderNo || '',
        vehicleNegotiationId: order.vehicleNegotiationId || null,
        partyName: order.partyName || '',
        customerId: order.customerId || null,
        customerCode: order.customerCode || '',
        contactPerson: order.contactPerson || '',
        plantCode: order.plantCode || null,
        plantName: order.plantName || '',
        plantCodeValue: order.plantCodeValue || '',
        orderType: order.orderType || 'Sales',
        pinCode: order.pinCode || '',
        country: order.country || '',
        countryName: order.countryName || '',
        state: order.state || '',
        stateName: order.stateName || '',
        stateId: order.stateId || null,
        district: order.district || '',
        districtName: order.districtName || '',
        districtId: order.districtId || null,
        taluka: order.taluka || '',
        talukaName: order.talukaName || order.taluka || '',
        talukaId: order.talukaId || null,
        from: order.from || null,
        fromName: order.fromName || '',
        fromState: order.fromState || '',
        to: order.to || null,
        toName: order.toName || '',
        locationRate: order.locationRate || '',
        priceList: order.priceList || '',
        weight: parseFloat(order.weight) || 0,
        rate: parseFloat(order.rate) || 0,
        totalAmount: (parseFloat(order.weight) || 0) * (parseFloat(order.rate) || 0),
        subCompanyId: user.activeOperatingCompanyId,
        subCompanyName: user.activeOperatingCompanyName || '',
        subCompanyCode: user.activeOperatingCompanyCode || '',
        localStatus: order.localStatus || 'unknown',
        localStatusLabel: order.localStatusLabel || 'Unknown'
      }));
      
      pricingPanel.orders = processedOrders;
      pricingPanel.totalWeight = processedOrders.reduce((sum, order) => sum + (order.weight || 0), 0);
      pricingPanel.totalAmount = processedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    }

    // Update rate approval
    if (body.rateApproval) {
      pricingPanel.rateApproval = {
        approvalType: body.rateApproval.approvalType || pricingPanel.rateApproval?.approvalType || 'Contract Rates',
        uploadFile: body.rateApproval.uploadFile || pricingPanel.rateApproval?.uploadFile || '',
        approvalStatus: body.rateApproval.approvalStatus || pricingPanel.rateApproval?.approvalStatus || 'Pending'
      };
    }

    await pricingPanel.save();

    console.log(`✅ Pricing panel updated successfully: ${id}`);

    return NextResponse.json({ 
      success: true, 
      message: "Pricing panel updated successfully",
      data: {
        _id: pricingPanel._id,
        pricingSerialNo: pricingPanel.pricingSerialNo
      }
    }, { status: 200 });

  } catch (error) {
    console.error("❌ PUT /pricing-panel error:", error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json({ 
        success: false, 
        message: messages.join(', ') 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to update pricing panel"
    }, { status: 500 });
  }
}

/* ========================================
   DELETE /api/pricing-panel - Requires 'delete' permission
======================================== */
export async function DELETE(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req, 'delete');
  if (error) {
    return NextResponse.json({ 
      success: false, 
      message: error,
      code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
    }, { status });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: "Pricing panel ID is required" 
      }, { status: 400 });
    }

    console.log(`🗑️ Deleting pricing panel: ${id}`);
    
    if (!isValidObjectId(id)) {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid pricing panel ID format" 
      }, { status: 400 });
    }
    
    const pricingPanel = await PricingPanel.findOne(companyScopeFilter(user, { _id: id }));

    if (!pricingPanel) {
      return NextResponse.json({ 
        success: false, 
        message: "Pricing panel not found" 
      }, { status: 404 });
    }

    const result = await PricingPanel.deleteOne(companyScopeFilter(user, { _id: id }));

    if (result.deletedCount === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "Failed to delete pricing panel" 
      }, { status: 500 });
    }

    console.log(`✅ Pricing panel deleted successfully: ${id}`);

    return NextResponse.json({ 
      success: true, 
      message: "Pricing panel deleted successfully" 
    }, { status: 200 });

  } catch (error) {
    console.error("❌ DELETE /pricing-panel error:", error);
    
    if (error.name === 'CastError') {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid pricing panel ID format" 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to delete pricing panel"
    }, { status: 500 });
  }
}

/* ========================================
   PATCH /api/pricing-panel - Requires 'approve' permission
======================================== */
export async function PATCH(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req, 'approve');
  if (error) {
    return NextResponse.json({ 
      success: false, 
      message: error,
      code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
    }, { status });
  }

  try {
    const body = await req.json();
    const { id, action, approvalData } = body;
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: "Pricing panel ID is required" 
      }, { status: 400 });
    }

    console.log(`📝 Updating pricing panel: ${id} - Action: ${action}`);
    
    if (!isValidObjectId(id)) {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid pricing panel ID format" 
      }, { status: 400 });
    }
    
    const pricingPanel = await PricingPanel.findOne(companyScopeFilter(user, { _id: id }));

    if (!pricingPanel) {
      return NextResponse.json({ 
        success: false, 
        message: "Pricing panel not found" 
      }, { status: 404 });
    }

    switch(action) {
      case 'approve':
        pricingPanel.rateApproval.approvalStatus = 'Approved';
        pricingPanel.panelStatus = 'Approved';
        break;
        
      case 'reject':
        pricingPanel.rateApproval.approvalStatus = 'Rejected';
        pricingPanel.panelStatus = 'Rejected';
        break;
        
      case 'complete':
        pricingPanel.rateApproval.approvalStatus = 'Completed';
        pricingPanel.panelStatus = 'Completed';
        if (pricingPanel.reportRows) {
          pricingPanel.reportRows.forEach(row => {
            row.pricing = 'Completed';
          });
        }
        break;
        
      case 'update-approval':
        if (approvalData) {
          const currentApproval = pricingPanel.rateApproval || {};
          
          if (approvalData.approvalType !== undefined) {
            pricingPanel.rateApproval.approvalType = approvalData.approvalType;
          }
          if (approvalData.uploadFile !== undefined) {
            pricingPanel.rateApproval.uploadFile = approvalData.uploadFile;
          }
          if (approvalData.remarks !== undefined) {
            pricingPanel.rateApproval.remarks = approvalData.remarks;
          }
          if (approvalData.approvalStatus !== undefined) {
            pricingPanel.rateApproval.approvalStatus = approvalData.approvalStatus;
          }
        }
        break;
        
      case 'approve-with-update':
        if (approvalData) {
          if (approvalData.approvalType !== undefined) {
            pricingPanel.rateApproval.approvalType = approvalData.approvalType;
          }
          if (approvalData.uploadFile !== undefined) {
            pricingPanel.rateApproval.uploadFile = approvalData.uploadFile;
          }
          if (approvalData.remarks !== undefined) {
            pricingPanel.rateApproval.remarks = approvalData.remarks;
          }
        }
        pricingPanel.rateApproval.approvalStatus = 'Approved';
        pricingPanel.panelStatus = 'Approved';
        break;
        
      default:
        return NextResponse.json({ 
          success: false, 
          message: "Invalid action. Allowed: approve, reject, complete, update-approval, approve-with-update" 
        }, { status: 400 });
    }

    await pricingPanel.save();

    let successMessage = `Pricing panel ${action}d successfully`;
    if (action === 'update-approval') {
      successMessage = 'Approval details updated successfully';
    } else if (action === 'approve-with-update') {
      successMessage = 'Pricing panel approved with updates';
    }

    return NextResponse.json({ 
      success: true, 
      message: successMessage,
      data: {
        _id: pricingPanel._id,
        pricingSerialNo: pricingPanel.pricingSerialNo,
        approvalStatus: pricingPanel.rateApproval.approvalStatus,
        panelStatus: pricingPanel.panelStatus
      }
    }, { status: 200 });

  } catch (error) {
    console.error("❌ PATCH /pricing-panel error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to update pricing panel"
    }, { status: 500 });
  }
}
