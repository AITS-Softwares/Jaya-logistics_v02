

// import { NextResponse } from "next/server";
// import connectDb from "@/lib/db";
// import VehicleNegotiation from "./VehicleNegotiation";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { getNextVehicleNegotiationNumber } from "./VehicleNegotiationCounter";
// import mongoose from 'mongoose';

// // Helper function to format date as DD/MM/YYYY
// function formatDateDDMMYYYY(date) {
//   if (!date) return '';
//   const d = new Date(date);
//   if (isNaN(d.getTime())) return '';
  
//   const day = String(d.getDate()).padStart(2, '0');
//   const month = String(d.getMonth() + 1).padStart(2, '0');
//   const year = d.getFullYear();
  
//   return `${day}/${month}/${year}`;
// }

// // Helper function to validate ObjectId
// function isValidObjectId(id) {
//   return id && mongoose.Types.ObjectId.isValid(id);
// }

// // ── PERMISSION FUNCTIONS ──

// function isAuthorized(user) {
//   if (!user) return false;
  
//   // Company admins have full access
//   if (user.type === "company") return true;
  
//   // Admin role has full access
//   if (user.roles && user.roles.includes("Admin")) return true;
  
//   // Check module-based permissions for "Vehicle Negotiation"
//   const modules = user.modules || {};
//   const moduleData = modules["Vehicle Negotiation"];
  
//   if (!moduleData || !moduleData.selected) return false;
  
//   return true;
// }

// function hasPermission(user, action) {
//   if (!user) return false;
//   if (user.type === "company") return true;
//   if (user.roles && user.roles.includes("Admin")) return true;
  
//   const modules = user.modules || {};
//   const moduleData = modules["Vehicle Negotiation"];
  
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
    
//     // Check if user is authorized at all
//     if (!isAuthorized(user)) {
//       return { 
//         error: "Access denied. You don't have permission to access Vehicle Negotiation.", 
//         status: 403 
//       };
//     }
    
//     // If specific action is required, check it
//     if (requiredAction && !hasPermission(user, requiredAction)) {
//       return { 
//         error: `Permission denied: ${requiredAction} action not allowed for Vehicle Negotiation.`, 
//         status: 403 
//       };
//     }
    
//     return { user, error: null, status: 200 };
//   } catch (err) {
//     console.error("JWT Verification Failed:", err?.message || err);
//     return { error: "Authentication failed. Please login again.", status: 401 };
//   }
// }

// /* ========================================
//    GET /api/vehicle-negotiation - Requires 'view' permission
// ======================================== */
// export async function GET(req) {
//   try {
//     await connectDb();
//     const { user, error, status } = await validateUser(req, 'view');
//     if (error) {
//       return NextResponse.json({ success: false, message: error, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' }, { status });
//     }

//     const url = new URL(req.url);
//     const id = url.searchParams.get("id");
//     const vnnNo = url.searchParams.get("vnnNo");
//     const format = url.searchParams.get("format");
//     const search = url.searchParams.get("search");
//     const approvalStatus = url.searchParams.get("approvalStatus");
//     const memoStatus = url.searchParams.get("memoStatus");
//     const fromDate = url.searchParams.get("fromDate");
//     const toDate = url.searchParams.get("toDate");
    
//     // CASE 1: GET BY VNN NUMBER
//     if (vnnNo) {
//       console.log(`📄 GET vehicle negotiation by VNN: ${vnnNo}`);
      
//       const vehicleNegotiation = await VehicleNegotiation.findOne({
//         vnnNo: vnnNo,
//         companyId: user.companyId
//       }).lean();

//       if (!vehicleNegotiation) {
//         return NextResponse.json({ 
//           success: false, 
//           message: "Vehicle negotiation not found" 
//         }, { status: 404 });
//       }

//       return NextResponse.json({ 
//         success: true, 
//         data: vehicleNegotiation 
//       }, { status: 200 });
//     }
    
//     // CASE 2: GET BY ID
//     if (id) {
//       console.log(`📄 GET single vehicle negotiation: ${id}`);
      
//       if (!mongoose.Types.ObjectId.isValid(id)) {
//         return NextResponse.json({ 
//           success: false, 
//           message: "Invalid vehicle negotiation ID format" 
//         }, { status: 400 });
//       }
      
//       const vehicleNegotiation = await VehicleNegotiation.findOne({
//         _id: id,
//         companyId: user.companyId
//       }).lean();

//       if (!vehicleNegotiation) {
//         return NextResponse.json({ 
//           success: false, 
//           message: "Vehicle negotiation not found" 
//         }, { status: 404 });
//       }

//       return NextResponse.json({ 
//         success: true, 
//         data: vehicleNegotiation 
//       }, { status: 200 });
//     }
    
//     // CASE 3: TABLE FORMAT with filters
//     if (format === 'table') {
//       console.log("📋 Fetching table format data");
      
//       // Build query
//       let query = { companyId: user.companyId };
      
//       // Apply search filter
//       if (search) {
//         query.$or = [
//           { vnnNo: { $regex: search, $options: 'i' } },
//           { customerName: { $regex: search, $options: 'i' } },
//           { 'approval.vendorName': { $regex: search, $options: 'i' } },
//           { branchName: { $regex: search, $options: 'i' } }
//         ];
//       }
      
//       // Apply approval status filter
//       if (approvalStatus) {
//         query['approval.approvalStatus'] = approvalStatus;
//       }
      
//       // Apply memo status filter
//       if (memoStatus) {
//         query['approval.memoStatus'] = memoStatus;
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
      
//       const vehicleNegotiations = await VehicleNegotiation.find(query)
//         .sort({ date: -1, createdAt: -1 })
//         .lean();

//       const tableData = [];
      
//       vehicleNegotiations.forEach(vn => {
//         const formattedDate = vn.date ? formatDateDDMMYYYY(vn.date) : '';
        
//         if (vn.orders && vn.orders.length > 0) {
//           vn.orders.forEach(order => {
//             tableData.push({
//               date: formattedDate,
//               vnn: vn.vnnNo || '',
//               order: order.orderNo || '',
//               partyName: order.partyName || vn.customerName || '',
//               vendorName: vn.approval?.vendorName || '',
//               vendorCode: vn.approval?.vendorCode || '',
//               plantCode: order.plantName || order.plantCodeValue || '',
//               orderType: order.orderType || '',
//               pinCode: order.pinCode || '',
//               from: order.fromName || '',
//               to: order.toName || '',
//               taluka: order.talukaName || order.taluka || '',
//               district: order.districtName || '',
//               state: order.stateName || '',
//               country: order.countryName || '',
//               weight: order.weight || 0,
//               orderStatus: order.status || '',
//               approval: vn.approval?.approvalStatus || 'Pending',
//               memo: vn.approval?.memoStatus || 'Pending',
//               vnId: vn._id.toString(),
//               orderId: order._id ? order._id.toString() : null,
//               branchName: vn.branchName || ''
//             });
//           });
//         } else {
//           tableData.push({
//             date: formattedDate,
//             vnn: vn.vnnNo || '',
//             order: '',
//             partyName: vn.customerName || '',
//             vendorCode: vn.approval?.vendorCode || '',
//             vendorName: vn.approval?.vendorName || '',
//             plantCode: '',
//             orderType: '',
//             pinCode: '',
//             from: '',
//             to: '',
//             taluka: '',
//             district: '',
//             state: '',
//             country: '',
//             weight: 0,
//             orderStatus: '',
//             approval: vn.approval?.approvalStatus || 'Pending',
//             memo: vn.approval?.memoStatus || 'Pending',
//             vnId: vn._id.toString(),
//             orderId: null,
//             branchName: vn.branchName || ''
//           });
//         }
//       });

//       return NextResponse.json({
//         success: true,
//         data: tableData,
//         total: tableData.length,
//         message: `Found ${tableData.length} order records`
//       }, { status: 200 });
//     }

//     // CASE 4: REGULAR LIST
//     const vehicleNegotiations = await VehicleNegotiation.find({
//       companyId: user.companyId
//     })
//       .sort({ createdAt: -1 })
//       .lean();

//     return NextResponse.json({
//       success: true,
//       data: vehicleNegotiations,
//       total: vehicleNegotiations.length
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ GET /vehicle-negotiation error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: "Failed to fetch vehicle negotiations",
//       error: error.message 
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    POST /api/vehicle-negotiation - Requires 'create' permission
// ======================================== */
// export async function POST(req) {
//   try {
//     await connectDb();
//     const { user, error, status } = await validateUser(req, 'create');
//     if (error) {
//       return NextResponse.json({ success: false, message: error, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' }, { status });
//     }

//     const body = await req.json();
    
//     console.log("📝 Creating new vehicle negotiation");
    
//     // Generate vehicle negotiation number
//     let vnnNo = await getNextVehicleNegotiationNumber(user.companyId);
    
//     // Check if VNN number already exists
//     const existing = await VehicleNegotiation.findOne({ vnnNo, companyId: user.companyId });
//     if (existing) {
//       vnnNo = await getNextVehicleNegotiationNumber(user.companyId);
//     }

//     // Process orders with proper null handling for ObjectId fields
//     const processedOrders = (body.orders || []).map(order => ({
//       orderNo: order.orderNo || '',
//       orderPanelId: order.orderPanelId || '',
//       partyName: order.partyName || '',
//       customerId: order.customerId && isValidObjectId(order.customerId) ? order.customerId : null,
//       customerCode: order.customerCode || '',
//       contactPerson: order.contactPerson || '',
//       plantCode: order.plantCode && isValidObjectId(order.plantCode) ? order.plantCode : null,
//       plantName: order.plantName || '',
//       plantCodeValue: order.plantCodeValue || '',
//       orderType: order.orderType || 'Sales',
//       pinCode: order.pinCode || '',
//       from: order.from && isValidObjectId(order.from) ? order.from : null,
//       fromName: order.fromName || '',
//       to: order.to && isValidObjectId(order.to) ? order.to : null,
//       toName: order.toName || '',
//       taluka: order.taluka || '',
//       talukaName: order.talukaName || '',
//       country: order.country || '',
//       countryName: order.countryName || '',
//       state: order.state || '',
//       stateName: order.stateName || '',
//       district: order.district || '',
//       districtName: order.districtName || '',
//       weight: Number(order.weight) || 0,
//       status: order.status || 'Open',
//       collectionCharges: Number(order.collectionCharges) || 0,
//       cancellationCharges: order.cancellationCharges || 'Nil',
//       loadingCharges: order.loadingCharges || 'Nil',
//       otherCharges: Number(order.otherCharges) || 0
//     }));

//     // Calculate total weight
//     const totalWeight = processedOrders.reduce((sum, order) => sum + (order.weight || 0), 0);

//     // Validate delivery value
//     const validDeliveryValues = ['Urgent', 'Normal', 'Express', 'Scheduled'];
//     let delivery = body.header?.delivery || 'Normal';
//     if (!validDeliveryValues.includes(delivery)) {
//       delivery = 'Normal';
//     }

//     // Process selected order panels
//     const selectedOrderPanels = (body.selectedOrderPanels || []).map(panel => ({
//       _id: panel._id || '',
//       orderPanelNo: panel.orderPanelNo || ''
//     }));

//     // Process vendors with purchase type
//     const processedVendors = (body.vendors || []).map(v => ({
//       vendorName: v.vendorName || '',
//       vendorCode: v.vendorCode || '',
//       purchaseType: v.purchaseType || '',
//       marketRate: Number(v.marketRate) || 0
//     }));

//     // Create new vehicle negotiation
//     const newVehicleNegotiation = new VehicleNegotiation({
//       vnnNo,
//       branch: body.header?.branch && isValidObjectId(body.header?.branch) ? body.header?.branch : null,
//       branchName: body.header?.branchName || '',
//       branchCode: body.header?.branchCode || '',
//       delivery: delivery,
//       date: body.header?.date ? new Date(body.header.date) : new Date(),
//       customerId: body.header?.customerId && isValidObjectId(body.header?.customerId) ? body.header?.customerId : null,
//       customerName: body.header?.customerName || '',
//       customerCode: body.header?.customerCode || '',
//       contactPerson: body.header?.contactPerson || '',
//       billingType: body.header?.billingType || 'Multi - Order',
//       loadingPoints: Number(body.header?.loadingPoints) || 1,
//       dropPoints: Number(body.header?.dropPoints) || 1,
//       collectionCharges: Number(body.header?.collectionCharges) || 0,
//       cancellationCharges: body.header?.cancellationCharges || 'Nil',
//       loadingCharges: body.header?.loadingCharges || 'Nil',
//       otherCharges: body.header?.otherCharges || 'Nil',
//       selectedOrderPanels: selectedOrderPanels,
//       orders: processedOrders,
//       totalWeight,
//       negotiation: {
//         maxRate: Number(body.negotiation?.maxRate) || 0,
//         targetRate: Number(body.negotiation?.targetRate) || 0,
//         purchaseType: body.negotiation?.purchaseType || 'Loading & Unloading',
//         oldRatePercent: body.negotiation?.oldRatePercent || '',
//         remarks1: body.negotiation?.remarks1 || '',
//         remarks2: body.negotiation?.remarks2 || ''
//       },
//       vendors: processedVendors,
//       voiceNote: body.voiceUrl || '',
//       voiceNoteFile: body.voiceFileInfo || null,
      
//       // Complete APPROVAL SECTION with ALL fields from frontend
//       approval: {
//         vendorName: body.approval?.vendorName || '',
//         vendorCode: body.approval?.vendorCode || '',
//         vendorId: body.approval?.vendorId || null,
//         vendorStatus: body.approval?.vendorStatus || 'Active',
//         rateType: body.approval?.rateType || 'Per MT',
//         finalPerMT: Number(body.approval?.finalPerMT) || 0,
//         finalFix: Number(body.approval?.finalFix) || 0,
//         vehicleNo: body.approval?.vehicleNo || '',
//         vehicleId: body.approval?.vehicleId || '',
//         vehicleData: body.approval?.vehicleData || null,
//         mobile: body.approval?.mobile || '',
//         purchaseType: body.approval?.purchaseType || 'Loading & Unloading',
//         paymentTerms: body.approval?.paymentTerms || '80 % Advance',
//         approvalStatus: body.approval?.approvalStatus || 'Pending',
//         remarks: body.approval?.remarks || '',
//         memoStatus: body.approval?.memoStatus || 'Pending',
//         memoFile: body.approval?.memoFile || null
//       },
//       companyId: user.companyId,
//       createdBy: user.id,
//       panelStatus: 'Draft'
//     });

//     await newVehicleNegotiation.save();

//     return NextResponse.json({ 
//       success: true, 
//       message: "Vehicle negotiation created successfully",
//       data: {
//         _id: newVehicleNegotiation._id,
//         vnnNo: newVehicleNegotiation.vnnNo
//       }
//     }, { status: 201 });

//   } catch (error) {
//     console.error("❌ POST /vehicle-negotiation error:", error);
    
//     if (error.name === 'ValidationError') {
//       const messages = Object.values(error.errors).map(err => err.message);
//       return NextResponse.json({ 
//         success: false, 
//         message: messages.join(', ') 
//       }, { status: 400 });
//     }
    
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to create vehicle negotiation"
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    PUT /api/vehicle-negotiation - Requires 'edit' permission
// ======================================== */
// export async function PUT(req) {
//   try {
//     await connectDb();
//     const { user, error, status } = await validateUser(req, 'edit');
//     if (error) {
//       return NextResponse.json({ success: false, message: error, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' }, { status });
//     }

//     const body = await req.json();
//     const { id } = body;
    
//     if (!id) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Vehicle negotiation ID is required" 
//       }, { status: 400 });
//     }

//     console.log(`📝 Updating vehicle negotiation: ${id}`);
    
//     // Validate ID format
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Invalid vehicle negotiation ID format" 
//       }, { status: 400 });
//     }
    
//     // Find the vehicle negotiation
//     const vehicleNegotiation = await VehicleNegotiation.findOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (!vehicleNegotiation) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Vehicle negotiation not found" 
//       }, { status: 404 });
//     }

//     // Update header fields
//     if (body.header) {
//       vehicleNegotiation.branch = body.header.branch && isValidObjectId(body.header.branch) 
//         ? body.header.branch 
//         : (vehicleNegotiation.branch || null);
//       vehicleNegotiation.branchName = body.header.branchName || vehicleNegotiation.branchName || '';
//       vehicleNegotiation.branchCode = body.header.branchCode || vehicleNegotiation.branchCode || '';
      
//       const validDeliveryValues = ['Urgent', 'Normal', 'Express', 'Scheduled'];
//       let delivery = body.header.delivery || vehicleNegotiation.delivery || 'Normal';
//       if (!validDeliveryValues.includes(delivery)) {
//         delivery = 'Normal';
//       }
//       vehicleNegotiation.delivery = delivery;
      
//       vehicleNegotiation.date = body.header.date ? new Date(body.header.date) : vehicleNegotiation.date;
//       vehicleNegotiation.customerId = body.header.customerId && isValidObjectId(body.header.customerId) 
//         ? body.header.customerId 
//         : (vehicleNegotiation.customerId || null);
//       vehicleNegotiation.customerName = body.header.customerName || vehicleNegotiation.customerName || '';
//       vehicleNegotiation.customerCode = body.header.customerCode || vehicleNegotiation.customerCode || '';
//       vehicleNegotiation.contactPerson = body.header.contactPerson || vehicleNegotiation.contactPerson || '';
//       vehicleNegotiation.billingType = body.header.billingType || vehicleNegotiation.billingType || 'Multi - Order';
//       vehicleNegotiation.loadingPoints = Number(body.header.loadingPoints) || vehicleNegotiation.loadingPoints || 1;
//       vehicleNegotiation.dropPoints = Number(body.header.dropPoints) || vehicleNegotiation.dropPoints || 1;
//       vehicleNegotiation.collectionCharges = Number(body.header.collectionCharges) || vehicleNegotiation.collectionCharges || 0;
//       vehicleNegotiation.cancellationCharges = body.header.cancellationCharges || vehicleNegotiation.cancellationCharges || 'Nil';
//       vehicleNegotiation.loadingCharges = body.header.loadingCharges || vehicleNegotiation.loadingCharges || 'Nil';
//       vehicleNegotiation.otherCharges = body.header.otherCharges || vehicleNegotiation.otherCharges || 'Nil';
//     }

//     // Update selected order panels
//     if (body.selectedOrderPanels) {
//       vehicleNegotiation.selectedOrderPanels = body.selectedOrderPanels.map(panel => ({
//         _id: panel._id || '',
//         orderPanelNo: panel.orderPanelNo || ''
//       }));
//     }

//     // Update orders
//     if (body.orders) {
//       const processedOrders = body.orders.map(order => ({
//         _id: order._id && isValidObjectId(order._id) 
//           ? new mongoose.Types.ObjectId(order._id) 
//           : new mongoose.Types.ObjectId(),
//         orderNo: order.orderNo || '',
//         orderPanelId: order.orderPanelId || '',
//         partyName: order.partyName || '',
//         customerId: order.customerId && isValidObjectId(order.customerId) ? order.customerId : null,
//         customerCode: order.customerCode || '',
//         contactPerson: order.contactPerson || '',
//         plantCode: order.plantCode && isValidObjectId(order.plantCode) ? order.plantCode : null,
//         plantName: order.plantName || '',
//         plantCodeValue: order.plantCodeValue || '',
//         orderType: order.orderType || 'Sales',
//         pinCode: order.pinCode || '',
//         from: order.from && isValidObjectId(order.from) ? order.from : null,
//         fromName: order.fromName || '',
//         to: order.to && isValidObjectId(order.to) ? order.to : null,
//         toName: order.toName || '',
//         taluka: order.taluka || '',
//         talukaName: order.talukaName || '',
//         country: order.country || '',
//         countryName: order.countryName || '',
//         state: order.state || '',
//         stateName: order.stateName || '',
//         district: order.district || '',
//         districtName: order.districtName || '',
//         weight: Number(order.weight) || 0,
//         status: order.status || 'Open',
//         collectionCharges: Number(order.collectionCharges) || 0,
//         cancellationCharges: order.cancellationCharges || 'Nil',
//         loadingCharges: order.loadingCharges || 'Nil',
//         otherCharges: Number(order.otherCharges) || 0
//       }));
      
//       vehicleNegotiation.orders = processedOrders;
//       vehicleNegotiation.totalWeight = processedOrders.reduce((sum, order) => sum + (order.weight || 0), 0);
//     }

//     // Update negotiation
//     if (body.negotiation) {
//       vehicleNegotiation.negotiation = {
//         maxRate: Number(body.negotiation.maxRate) || vehicleNegotiation.negotiation?.maxRate || 0,
//         targetRate: Number(body.negotiation.targetRate) || vehicleNegotiation.negotiation?.targetRate || 0,
//         purchaseType: body.negotiation.purchaseType || vehicleNegotiation.negotiation?.purchaseType || 'Loading & Unloading',
//         oldRatePercent: body.negotiation.oldRatePercent || vehicleNegotiation.negotiation?.oldRatePercent || '',
//         remarks1: body.negotiation.remarks1 || vehicleNegotiation.negotiation?.remarks1 || '',
//         remarks2: body.negotiation.remarks2 || vehicleNegotiation.negotiation?.remarks2 || ''
//       };
//     }

//     // Update vendors with purchase type
//     if (body.vendors) {
//       vehicleNegotiation.vendors = body.vendors.map(v => ({
//         _id: v._id && isValidObjectId(v._id) 
//           ? new mongoose.Types.ObjectId(v._id) 
//           : new mongoose.Types.ObjectId(),
//         vendorName: v.vendorName || '',
//         vendorCode: v.vendorCode || '',
//         purchaseType: v.purchaseType || '',
//         marketRate: Number(v.marketRate) || 0
//       }));
//     }

//     // Update voice note
//     if (body.voiceUrl !== undefined) vehicleNegotiation.voiceNote = body.voiceUrl;
//     if (body.voiceFileInfo) vehicleNegotiation.voiceNoteFile = body.voiceFileInfo;

//     // Update approval with ALL fields
//     if (body.approval) {
//       const currentApproval = vehicleNegotiation.approval || {};
      
//       const updatedApproval = {
//         vendorName: body.approval.vendorName !== undefined ? body.approval.vendorName : (currentApproval.vendorName || ''),
//         vendorCode: body.approval.vendorCode !== undefined ? body.approval.vendorCode : (currentApproval.vendorCode || ''),
//         vendorId: body.approval.vendorId !== undefined ? body.approval.vendorId : (currentApproval.vendorId || null),
//         vendorStatus: body.approval.vendorStatus !== undefined ? body.approval.vendorStatus : (currentApproval.vendorStatus || 'Active'),
//         rateType: body.approval.rateType !== undefined ? body.approval.rateType : (currentApproval.rateType || 'Per MT'),
//         finalPerMT: body.approval.finalPerMT !== undefined ? Number(body.approval.finalPerMT) : (currentApproval.finalPerMT || 0),
//         finalFix: body.approval.finalFix !== undefined ? Number(body.approval.finalFix) : (currentApproval.finalFix || 0),
//         vehicleNo: body.approval.vehicleNo !== undefined ? body.approval.vehicleNo : (currentApproval.vehicleNo || ''),
//         vehicleId: body.approval.vehicleId !== undefined ? body.approval.vehicleId : (currentApproval.vehicleId || ''),
//         vehicleData: body.approval.vehicleData !== undefined ? body.approval.vehicleData : (currentApproval.vehicleData || null),
//         mobile: body.approval.mobile !== undefined ? body.approval.mobile : (currentApproval.mobile || ''),
//         purchaseType: body.approval.purchaseType !== undefined ? body.approval.purchaseType : (currentApproval.purchaseType || 'Loading & Unloading'),
//         paymentTerms: body.approval.paymentTerms !== undefined ? body.approval.paymentTerms : (currentApproval.paymentTerms || '80 % Advance'),
//         approvalStatus: body.approval.approvalStatus !== undefined ? body.approval.approvalStatus : (currentApproval.approvalStatus || 'Pending'),
//         remarks: body.approval.remarks !== undefined ? body.approval.remarks : (currentApproval.remarks || ''),
//         memoStatus: body.approval.memoStatus !== undefined ? body.approval.memoStatus : (currentApproval.memoStatus || 'Pending'),
//       };

//       // Handle memoFile
//       if (body.approval.memoFile !== undefined) {
//         if (body.approval.memoFile && typeof body.approval.memoFile === 'object') {
//           const hasFileData = body.approval.memoFile.filePath || 
//                              body.approval.memoFile.filename || 
//                              body.approval.memoFile.originalName;
          
//           if (hasFileData) {
//             updatedApproval.memoFile = {
//               filePath: body.approval.memoFile.filePath || '',
//               fullPath: body.approval.memoFile.fullPath || '',
//               filename: body.approval.memoFile.filename || '',
//               originalName: body.approval.memoFile.originalName || '',
//               size: Number(body.approval.memoFile.size) || 0,
//               mimeType: body.approval.memoFile.mimeType || '',
//               uploadedAt: body.approval.memoFile.uploadedAt || new Date()
//             };
//           } else {
//             updatedApproval.memoFile = null;
//           }
//         } else if (body.approval.memoFile === null) {
//           updatedApproval.memoFile = null;
//         } else if (currentApproval.memoFile) {
//           updatedApproval.memoFile = currentApproval.memoFile;
//         }
//       } else if (currentApproval.memoFile) {
//         updatedApproval.memoFile = currentApproval.memoFile;
//       }

//       vehicleNegotiation.approval = updatedApproval;
//     }

//     // Save the updated vehicle negotiation
//     await vehicleNegotiation.save();

//     return NextResponse.json({ 
//       success: true, 
//       message: "Vehicle negotiation updated successfully",
//       data: {
//         _id: vehicleNegotiation._id,
//         vnnNo: vehicleNegotiation.vnnNo
//       }
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ PUT /vehicle-negotiation error:", error);
    
//     if (error.name === 'ValidationError') {
//       const messages = Object.values(error.errors).map(err => err.message);
//       return NextResponse.json({ 
//         success: false, 
//         message: messages.join(', ') 
//       }, { status: 400 });
//     }
    
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to update vehicle negotiation"
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    DELETE /api/vehicle-negotiation - Requires 'delete' permission
// ======================================== */
// export async function DELETE(req) {
//   try {
//     await connectDb();
//     const { user, error, status } = await validateUser(req, 'delete');
//     if (error) {
//       return NextResponse.json({ success: false, message: error, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' }, { status });
//     }

//     const url = new URL(req.url);
//     const id = url.searchParams.get("id");
    
//     if (!id) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Vehicle negotiation ID is required" 
//       }, { status: 400 });
//     }

//     console.log(`🗑️ Deleting vehicle negotiation: ${id}`);
    
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Invalid vehicle negotiation ID format" 
//       }, { status: 400 });
//     }
    
//     const result = await VehicleNegotiation.deleteOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (result.deletedCount === 0) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Vehicle negotiation not found" 
//       }, { status: 404 });
//     }

//     return NextResponse.json({ 
//       success: true, 
//       message: "Vehicle negotiation deleted successfully" 
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ DELETE /vehicle-negotiation error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to delete vehicle negotiation"
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    PATCH /api/vehicle-negotiation - Requires 'approve' permission
// ======================================== */
// export async function PATCH(req) {
//   try {
//     await connectDb();
//     const { user, error, status } = await validateUser(req, 'approve');
//     if (error) {
//       return NextResponse.json({ success: false, message: error, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' }, { status });
//     }

//     const body = await req.json();
//     const { id, action } = body;
    
//     if (!id) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Vehicle negotiation ID is required" 
//       }, { status: 400 });
//     }

//     console.log(`📝 Updating vehicle negotiation status: ${id} - Action: ${action}`);
    
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Invalid vehicle negotiation ID format" 
//       }, { status: 400 });
//     }
    
//     const vehicleNegotiation = await VehicleNegotiation.findOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (!vehicleNegotiation) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Vehicle negotiation not found" 
//       }, { status: 404 });
//     }

//     // Handle approve action
//     if (action === 'approve') {
//       // Update approval status
//       vehicleNegotiation.approval.approvalStatus = 'Approved';
//       vehicleNegotiation.panelStatus = 'Approved';
      
//       // You can also update other fields if needed
//       // For example, if you want to allow updating vendor details during approval:
//       if (body.vendorName) vehicleNegotiation.approval.vendorName = body.vendorName;
//       if (body.vendorCode) vehicleNegotiation.approval.vendorCode = body.vendorCode;
//       if (body.finalPerMT !== undefined) vehicleNegotiation.approval.finalPerMT = Number(body.finalPerMT);
//       if (body.finalFix !== undefined) vehicleNegotiation.approval.finalFix = Number(body.finalFix);
//       if (body.vehicleNo) vehicleNegotiation.approval.vehicleNo = body.vehicleNo;
//       if (body.mobile) vehicleNegotiation.approval.mobile = body.mobile;
//       if (body.purchaseType) vehicleNegotiation.approval.purchaseType = body.purchaseType;
//       if (body.paymentTerms) vehicleNegotiation.approval.paymentTerms = body.paymentTerms;
//       if (body.remarks) vehicleNegotiation.approval.remarks = body.remarks;
//       if (body.memoStatus) vehicleNegotiation.approval.memoStatus = body.memoStatus;
      
//       await vehicleNegotiation.save();

//       return NextResponse.json({ 
//         success: true, 
//         message: "Vehicle negotiation approved successfully",
//         data: {
//           _id: vehicleNegotiation._id,
//           vnnNo: vehicleNegotiation.vnnNo,
//           approvalStatus: vehicleNegotiation.approval.approvalStatus,
//           panelStatus: vehicleNegotiation.panelStatus
//         }
//       }, { status: 200 });
//     }
    
//     // Handle reject action
//     else if (action === 'reject') {
//       vehicleNegotiation.approval.approvalStatus = 'Reject';
//       vehicleNegotiation.panelStatus = 'Rejected';
      
//       if (body.remarks) vehicleNegotiation.approval.remarks = body.remarks;
      
//       await vehicleNegotiation.save();

//       return NextResponse.json({ 
//         success: true, 
//         message: "Vehicle negotiation rejected successfully",
//         data: {
//           _id: vehicleNegotiation._id,
//           vnnNo: vehicleNegotiation.vnnNo,
//           approvalStatus: vehicleNegotiation.approval.approvalStatus,
//           panelStatus: vehicleNegotiation.panelStatus
//         }
//       }, { status: 200 });
//     }
    
//     // Handle update-approval action (for editing approval details without changing status)
//     else if (action === 'update-approval') {
//       const currentApproval = vehicleNegotiation.approval || {};
      
//       // Update only the fields that are provided
//       if (body.vendorName !== undefined) vehicleNegotiation.approval.vendorName = body.vendorName;
//       if (body.vendorCode !== undefined) vehicleNegotiation.approval.vendorCode = body.vendorCode;
//       if (body.vendorStatus !== undefined) vehicleNegotiation.approval.vendorStatus = body.vendorStatus;
//       if (body.rateType !== undefined) vehicleNegotiation.approval.rateType = body.rateType;
//       if (body.finalPerMT !== undefined) vehicleNegotiation.approval.finalPerMT = Number(body.finalPerMT);
//       if (body.finalFix !== undefined) vehicleNegotiation.approval.finalFix = Number(body.finalFix);
//       if (body.vehicleNo !== undefined) vehicleNegotiation.approval.vehicleNo = body.vehicleNo;
//       if (body.vehicleId !== undefined) vehicleNegotiation.approval.vehicleId = body.vehicleId;
//       if (body.vehicleData !== undefined) vehicleNegotiation.approval.vehicleData = body.vehicleData;
//       if (body.mobile !== undefined) vehicleNegotiation.approval.mobile = body.mobile;
//       if (body.purchaseType !== undefined) vehicleNegotiation.approval.purchaseType = body.purchaseType;
//       if (body.paymentTerms !== undefined) vehicleNegotiation.approval.paymentTerms = body.paymentTerms;
//       if (body.remarks !== undefined) vehicleNegotiation.approval.remarks = body.remarks;
//       if (body.memoStatus !== undefined) vehicleNegotiation.approval.memoStatus = body.memoStatus;
//       if (body.memoFile !== undefined) vehicleNegotiation.approval.memoFile = body.memoFile;
      
//       // Keep existing approval status
//       if (body.approvalStatus === undefined) {
//         vehicleNegotiation.approval.approvalStatus = currentApproval.approvalStatus || 'Pending';
//       } else {
//         vehicleNegotiation.approval.approvalStatus = body.approvalStatus;
//       }
      
//       await vehicleNegotiation.save();

//       return NextResponse.json({ 
//         success: true, 
//         message: "Approval details updated successfully",
//         data: {
//           _id: vehicleNegotiation._id,
//           vnnNo: vehicleNegotiation.vnnNo,
//           approvalStatus: vehicleNegotiation.approval.approvalStatus
//         }
//       }, { status: 200 });
//     }
    
//     // Handle approve-with-update action (approve and update details)
//     else if (action === 'approve-with-update') {
//       // Update all fields
//       if (body.vendorName !== undefined) vehicleNegotiation.approval.vendorName = body.vendorName;
//       if (body.vendorCode !== undefined) vehicleNegotiation.approval.vendorCode = body.vendorCode;
//       if (body.vendorStatus !== undefined) vehicleNegotiation.approval.vendorStatus = body.vendorStatus;
//       if (body.rateType !== undefined) vehicleNegotiation.approval.rateType = body.rateType;
//       if (body.finalPerMT !== undefined) vehicleNegotiation.approval.finalPerMT = Number(body.finalPerMT);
//       if (body.finalFix !== undefined) vehicleNegotiation.approval.finalFix = Number(body.finalFix);
//       if (body.vehicleNo !== undefined) vehicleNegotiation.approval.vehicleNo = body.vehicleNo;
//       if (body.mobile !== undefined) vehicleNegotiation.approval.mobile = body.mobile;
//       if (body.purchaseType !== undefined) vehicleNegotiation.approval.purchaseType = body.purchaseType;
//       if (body.paymentTerms !== undefined) vehicleNegotiation.approval.paymentTerms = body.paymentTerms;
//       if (body.remarks !== undefined) vehicleNegotiation.approval.remarks = body.remarks;
//       if (body.memoStatus !== undefined) vehicleNegotiation.approval.memoStatus = body.memoStatus;
//       if (body.memoFile !== undefined) vehicleNegotiation.approval.memoFile = body.memoFile;
      
//       // Set status to Approved
//       vehicleNegotiation.approval.approvalStatus = 'Approved';
//       vehicleNegotiation.panelStatus = 'Approved';
      
//       await vehicleNegotiation.save();

//       return NextResponse.json({ 
//         success: true, 
//         message: "Vehicle negotiation approved with updates",
//         data: {
//           _id: vehicleNegotiation._id,
//           vnnNo: vehicleNegotiation.vnnNo,
//           approvalStatus: vehicleNegotiation.approval.approvalStatus
//         }
//       }, { status: 200 });
//     }
    
//     else {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Invalid action. Allowed: approve, reject, update-approval, approve-with-update" 
//       }, { status: 400 });
//     }

//   } catch (error) {
//     console.error("❌ PATCH /vehicle-negotiation error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to update vehicle negotiation status"
//     }, { status: 500 });
//   }
// }




import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import VehicleNegotiation from "./VehicleNegotiation";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { getNextVehicleNegotiationNumber } from "./VehicleNegotiationCounter";
import mongoose from 'mongoose';

// Helper function to format date as DD/MM/YYYY
function formatDateDDMMYYYY(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

// Helper function to validate ObjectId
function isValidObjectId(id) {
  return id && mongoose.Types.ObjectId.isValid(id);
}

// ── PERMISSION FUNCTIONS ──

function isAuthorized(user) {
  if (!user) return false;
  
  // Company admins have full access
  if (user.type === "company") return true;
  
  // Admin role has full access
  if (user.roles && user.roles.includes("Admin")) return true;
  
  // Check module-based permissions for "Vehicle Negotiation"
  const modules = user.modules || {};
  const moduleData = modules["Vehicle Negotiation"];
  
  if (!moduleData || !moduleData.selected) return false;
  
  return true;
}

function hasPermission(user, action) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.roles && user.roles.includes("Admin")) return true;
  
  const modules = user.modules || {};
  const moduleData = modules["Vehicle Negotiation"];
  
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
    
    // Check if user is authorized at all
    if (!isAuthorized(user)) {
      return { 
        error: "Access denied. You don't have permission to access Vehicle Negotiation.", 
        status: 403 
      };
    }
    
    // If specific action is required, check it
    if (requiredAction && !hasPermission(user, requiredAction)) {
      return { 
        error: `Permission denied: ${requiredAction} action not allowed for Vehicle Negotiation.`, 
        status: 403 
      };
    }
    
    return { user, error: null, status: 200 };
  } catch (err) {
    console.error("JWT Verification Failed:", err?.message || err);
    return { error: "Authentication failed. Please login again.", status: 401 };
  }
}

/* ========================================
   GET /api/vehicle-negotiation - Requires 'view' permission
======================================== */
export async function GET(req) {
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req, 'view');
    if (error) {
      return NextResponse.json({ success: false, message: error, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' }, { status });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const vnnNo = url.searchParams.get("vnnNo");
    const format = url.searchParams.get("format");
    const search = url.searchParams.get("search");
    const approvalStatus = url.searchParams.get("approvalStatus");
    const memoStatus = url.searchParams.get("memoStatus");
    const fromDate = url.searchParams.get("fromDate");
    const toDate = url.searchParams.get("toDate");
    
    // CASE 1: GET BY VNN NUMBER
    if (vnnNo) {
      console.log(`📄 GET vehicle negotiation by VNN: ${vnnNo}`);
      
      const vehicleNegotiation = await VehicleNegotiation.findOne({
        vnnNo: vnnNo,
        companyId: user.companyId
      }).lean();

      if (!vehicleNegotiation) {
        return NextResponse.json({ 
          success: false, 
          message: "Vehicle negotiation not found" 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        data: vehicleNegotiation 
      }, { status: 200 });
    }
    
    // CASE 2: GET BY ID
    if (id) {
      console.log(`📄 GET single vehicle negotiation: ${id}`);
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ 
          success: false, 
          message: "Invalid vehicle negotiation ID format" 
        }, { status: 400 });
      }
      
      const vehicleNegotiation = await VehicleNegotiation.findOne({
        _id: id,
        companyId: user.companyId
      }).lean();

      if (!vehicleNegotiation) {
        return NextResponse.json({ 
          success: false, 
          message: "Vehicle negotiation not found" 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        data: vehicleNegotiation 
      }, { status: 200 });
    }
    
    // CASE 3: TABLE FORMAT with filters
    if (format === 'table') {
      console.log("📋 Fetching table format data");
      
      // Build query
      let query = { companyId: user.companyId };
      
      // Apply search filter
      if (search) {
        query.$or = [
          { vnnNo: { $regex: search, $options: 'i' } },
          { customerName: { $regex: search, $options: 'i' } },
          { 'approval.vendorName': { $regex: search, $options: 'i' } },
          { branchName: { $regex: search, $options: 'i' } },
          { subCompanyName: { $regex: search, $options: 'i' } },
          { subCompanyCode: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Apply approval status filter
      if (approvalStatus) {
        query['approval.approvalStatus'] = approvalStatus;
      }
      
      // Apply memo status filter
      if (memoStatus) {
        query['approval.memoStatus'] = memoStatus;
      }
      
      // Apply date range filters
      if (fromDate) {
        query.date = { $gte: new Date(fromDate) };
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        query.date = { ...query.date, $lte: endDate };
      }
      
      const vehicleNegotiations = await VehicleNegotiation.find(query)
        .sort({ date: -1, createdAt: -1 })
        .lean();

      const tableData = [];
      
      vehicleNegotiations.forEach(vn => {
        const formattedDate = vn.date ? formatDateDDMMYYYY(vn.date) : '';
        
        if (vn.orders && vn.orders.length > 0) {
          vn.orders.forEach(order => {
            tableData.push({
              date: formattedDate,
              vnn: vn.vnnNo || '',
              order: order.orderNo || '',
              partyName: order.partyName || vn.customerName || '',
              vendorName: vn.approval?.vendorName || '',
              vendorCode: vn.approval?.vendorCode || '',
              plantCode: order.plantName || order.plantCodeValue || '',
              orderType: order.orderType || '',
              pinCode: order.pinCode || '',
              from: order.fromName || '',
              to: order.toName || '',
              taluka: order.talukaName || order.taluka || '',
              district: order.districtName || '',
              state: order.stateName || '',
              country: order.countryName || '',
              weight: order.weight || 0,
              orderStatus: order.status || '',
              approval: vn.approval?.approvalStatus || 'Pending',
              memo: vn.approval?.memoStatus || 'Pending',
              vnId: vn._id.toString(),
              orderId: order._id ? order._id.toString() : null,
              branchName: vn.branchName || '',
              subCompanyName: order.subCompanyName || vn.subCompanyName || '',
              subCompanyCode: order.subCompanyCode || vn.subCompanyCode || ''
            });
          });
        } else {
          tableData.push({
            date: formattedDate,
            vnn: vn.vnnNo || '',
            order: '',
            partyName: vn.customerName || '',
            vendorCode: vn.approval?.vendorCode || '',
            vendorName: vn.approval?.vendorName || '',
            plantCode: '',
            orderType: '',
            pinCode: '',
            from: '',
            to: '',
            taluka: '',
            district: '',
            state: '',
            country: '',
            weight: 0,
            orderStatus: '',
            approval: vn.approval?.approvalStatus || 'Pending',
            memo: vn.approval?.memoStatus || 'Pending',
            vnId: vn._id.toString(),
            orderId: null,
            branchName: vn.branchName || '',
            subCompanyName: vn.subCompanyName || '',
            subCompanyCode: vn.subCompanyCode || ''
          });
        }
      });

      return NextResponse.json({
        success: true,
        data: tableData,
        total: tableData.length,
        message: `Found ${tableData.length} order records`
      }, { status: 200 });
    }

    // CASE 4: REGULAR LIST
    const vehicleNegotiations = await VehicleNegotiation.find({
      companyId: user.companyId
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: vehicleNegotiations,
      total: vehicleNegotiations.length
    }, { status: 200 });

  } catch (error) {
    console.error("❌ GET /vehicle-negotiation error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to fetch vehicle negotiations",
      error: error.message 
    }, { status: 500 });
  }
}

/* ========================================
   POST /api/vehicle-negotiation - Requires 'create' permission
======================================== */
export async function POST(req) {
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req, 'create');
    if (error) {
      return NextResponse.json({ success: false, message: error, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' }, { status });
    }

    const body = await req.json();
    
    console.log("📝 Creating new vehicle negotiation");
    
    // Generate vehicle negotiation number
    let vnnNo = await getNextVehicleNegotiationNumber(user.companyId);
    
    // Check if VNN number already exists
    const existing = await VehicleNegotiation.findOne({ vnnNo, companyId: user.companyId });
    if (existing) {
      vnnNo = await getNextVehicleNegotiationNumber(user.companyId);
    }

    // Process orders with proper null handling for ObjectId fields and sub-company
    const processedOrders = (body.orders || []).map(order => ({
      orderNo: order.orderNo || '',
      orderPanelId: order.orderPanelId || '',
      partyName: order.partyName || '',
      customerId: order.customerId && isValidObjectId(order.customerId) ? order.customerId : null,
      customerCode: order.customerCode || '',
      contactPerson: order.contactPerson || '',
      plantCode: order.plantCode && isValidObjectId(order.plantCode) ? order.plantCode : null,
      plantName: order.plantName || '',
      plantCodeValue: order.plantCodeValue || '',
      orderType: order.orderType || 'Sales',
      pinCode: order.pinCode || '',
      from: order.from && isValidObjectId(order.from) ? order.from : null,
      fromName: order.fromName || '',
      fromState: order.fromState || '',
      to: order.to && isValidObjectId(order.to) ? order.to : null,
      toName: order.toName || '',
      taluka: order.taluka || '',
      talukaName: order.talukaName || '',
      country: order.country || '',
      countryName: order.countryName || '',
      state: order.state || '',
      stateName: order.stateName || '',
      district: order.district || '',
      districtName: order.districtName || '',
      weight: Number(order.weight) || 0,
      status: order.status || 'Open',
      collectionCharges: Number(order.collectionCharges) || 0,
      cancellationCharges: order.cancellationCharges || 'Nil',
      loadingCharges: order.loadingCharges || 'Nil',
      otherCharges: Number(order.otherCharges) || 0,
      localStatus: order.localStatus || 'unknown',
      localStatusLabel: order.localStatusLabel || 'Unknown',
      // Sub-company fields for each order
      subCompanyId: order.subCompanyId && isValidObjectId(order.subCompanyId) ? order.subCompanyId : null,
      subCompanyName: order.subCompanyName || '',
      subCompanyCode: order.subCompanyCode || ''
    }));

    // Calculate total weight
    const totalWeight = processedOrders.reduce((sum, order) => sum + (order.weight || 0), 0);

    // Validate delivery value
    const validDeliveryValues = ['Urgent', 'Normal', 'Express', 'Scheduled'];
    let delivery = body.header?.delivery || 'Normal';
    if (!validDeliveryValues.includes(delivery)) {
      delivery = 'Normal';
    }

    // Process selected order panels with sub-company
    const selectedOrderPanels = (body.selectedOrderPanels || []).map(panel => ({
      _id: panel._id || '',
      orderPanelNo: panel.orderPanelNo || '',
      subCompanyId: panel.subCompanyId || null,
      subCompanyName: panel.subCompanyName || '',
      subCompanyCode: panel.subCompanyCode || ''
    }));

    // Process vendors with purchase type
    const processedVendors = (body.vendors || []).map(v => ({
      vendorName: v.vendorName || '',
      vendorCode: v.vendorCode || '',
      purchaseType: v.purchaseType || '',
      marketRate: Number(v.marketRate) || 0
    }));

    // Create new vehicle negotiation with sub-company
    const newVehicleNegotiation = new VehicleNegotiation({
      vnnNo,
      branch: body.header?.branch && isValidObjectId(body.header?.branch) ? body.header?.branch : null,
      branchName: body.header?.branchName || '',
      branchCode: body.header?.branchCode || '',
      // Sub-company header fields
      subCompanyId: body.header?.subCompanyId && isValidObjectId(body.header?.subCompanyId) ? body.header?.subCompanyId : null,
      subCompanyName: body.header?.subCompanyName || '',
      subCompanyCode: body.header?.subCompanyCode || '',
      delivery: delivery,
      date: body.header?.date ? new Date(body.header.date) : new Date(),
      customerId: body.header?.customerId && isValidObjectId(body.header?.customerId) ? body.header?.customerId : null,
      customerName: body.header?.customerName || '',
      customerCode: body.header?.customerCode || '',
      contactPerson: body.header?.contactPerson || '',
      billingType: body.header?.billingType || 'Multi - Order',
      loadingPoints: Number(body.header?.loadingPoints) || 1,
      dropPoints: Number(body.header?.dropPoints) || 1,
      collectionCharges: Number(body.header?.collectionCharges) || 0,
      cancellationCharges: body.header?.cancellationCharges || 'Nil',
      loadingCharges: body.header?.loadingCharges || 'Nil',
      otherCharges: body.header?.otherCharges || 'Nil',
      selectedOrderPanels: selectedOrderPanels,
      orders: processedOrders,
      totalWeight,
      negotiation: {
        maxRate: Number(body.negotiation?.maxRate) || 0,
        targetRate: Number(body.negotiation?.targetRate) || 0,
        purchaseType: body.negotiation?.purchaseType || 'Loading & Unloading',
        oldRatePercent: body.negotiation?.oldRatePercent || '',
        remarks1: body.negotiation?.remarks1 || '',
        remarks2: body.negotiation?.remarks2 || ''
      },
      vendors: processedVendors,
      voiceNote: body.voiceUrl || '',
      voiceNoteFile: body.voiceFileInfo || null,
      
      // Complete APPROVAL SECTION with ALL fields from frontend
      approval: {
        vendorName: body.approval?.vendorName || '',
        vendorCode: body.approval?.vendorCode || '',
        vendorId: body.approval?.vendorId || null,
        vendorStatus: body.approval?.vendorStatus || 'Active',
        rateType: body.approval?.rateType || 'Per MT',
        finalPerMT: Number(body.approval?.finalPerMT) || 0,
        finalFix: Number(body.approval?.finalFix) || 0,
        vehicleNo: body.approval?.vehicleNo || '',
        vehicleId: body.approval?.vehicleId || '',
        vehicleData: body.approval?.vehicleData || null,
        mobile: body.approval?.mobile || '',
        purchaseType: body.approval?.purchaseType || 'Loading & Unloading',
        paymentTerms: body.approval?.paymentTerms || '80 % Advance',
        approvalStatus: body.approval?.approvalStatus || 'Pending',
        remarks: body.approval?.remarks || '',
        memoStatus: body.approval?.memoStatus || 'Pending',
        memoFile: body.approval?.memoFile || null
      },
      companyId: user.companyId,
      createdBy: user.id,
      panelStatus: 'Draft'
    });

    await newVehicleNegotiation.save();

    return NextResponse.json({ 
      success: true, 
      message: "Vehicle negotiation created successfully",
      data: {
        _id: newVehicleNegotiation._id,
        vnnNo: newVehicleNegotiation.vnnNo
      }
    }, { status: 201 });

  } catch (error) {
    console.error("❌ POST /vehicle-negotiation error:", error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json({ 
        success: false, 
        message: messages.join(', ') 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to create vehicle negotiation"
    }, { status: 500 });
  }
}

/* ========================================
   PUT /api/vehicle-negotiation - Requires 'edit' permission
======================================== */
export async function PUT(req) {
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req, 'edit');
    if (error) {
      return NextResponse.json({ success: false, message: error, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' }, { status });
    }

    const body = await req.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: "Vehicle negotiation ID is required" 
      }, { status: 400 });
    }

    console.log(`📝 Updating vehicle negotiation: ${id}`);
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid vehicle negotiation ID format" 
      }, { status: 400 });
    }
    
    // Find the vehicle negotiation
    const vehicleNegotiation = await VehicleNegotiation.findOne({
      _id: id,
      companyId: user.companyId
    });

    if (!vehicleNegotiation) {
      return NextResponse.json({ 
        success: false, 
        message: "Vehicle negotiation not found" 
      }, { status: 404 });
    }

    // Update header fields including sub-company
    if (body.header) {
      vehicleNegotiation.branch = body.header.branch && isValidObjectId(body.header.branch) 
        ? body.header.branch 
        : (vehicleNegotiation.branch || null);
      vehicleNegotiation.branchName = body.header.branchName || vehicleNegotiation.branchName || '';
      vehicleNegotiation.branchCode = body.header.branchCode || vehicleNegotiation.branchCode || '';
      
      // Update sub-company fields
      vehicleNegotiation.subCompanyId = body.header.subCompanyId && isValidObjectId(body.header.subCompanyId) 
        ? body.header.subCompanyId 
        : (vehicleNegotiation.subCompanyId || null);
      vehicleNegotiation.subCompanyName = body.header.subCompanyName || vehicleNegotiation.subCompanyName || '';
      vehicleNegotiation.subCompanyCode = body.header.subCompanyCode || vehicleNegotiation.subCompanyCode || '';
      
      const validDeliveryValues = ['Urgent', 'Normal', 'Express', 'Scheduled'];
      let delivery = body.header.delivery || vehicleNegotiation.delivery || 'Normal';
      if (!validDeliveryValues.includes(delivery)) {
        delivery = 'Normal';
      }
      vehicleNegotiation.delivery = delivery;
      
      vehicleNegotiation.date = body.header.date ? new Date(body.header.date) : vehicleNegotiation.date;
      vehicleNegotiation.customerId = body.header.customerId && isValidObjectId(body.header.customerId) 
        ? body.header.customerId 
        : (vehicleNegotiation.customerId || null);
      vehicleNegotiation.customerName = body.header.customerName || vehicleNegotiation.customerName || '';
      vehicleNegotiation.customerCode = body.header.customerCode || vehicleNegotiation.customerCode || '';
      vehicleNegotiation.contactPerson = body.header.contactPerson || vehicleNegotiation.contactPerson || '';
      vehicleNegotiation.billingType = body.header.billingType || vehicleNegotiation.billingType || 'Multi - Order';
      vehicleNegotiation.loadingPoints = Number(body.header.loadingPoints) || vehicleNegotiation.loadingPoints || 1;
      vehicleNegotiation.dropPoints = Number(body.header.dropPoints) || vehicleNegotiation.dropPoints || 1;
      vehicleNegotiation.collectionCharges = Number(body.header.collectionCharges) || vehicleNegotiation.collectionCharges || 0;
      vehicleNegotiation.cancellationCharges = body.header.cancellationCharges || vehicleNegotiation.cancellationCharges || 'Nil';
      vehicleNegotiation.loadingCharges = body.header.loadingCharges || vehicleNegotiation.loadingCharges || 'Nil';
      vehicleNegotiation.otherCharges = body.header.otherCharges || vehicleNegotiation.otherCharges || 'Nil';
    }

    // Update selected order panels with sub-company
    if (body.selectedOrderPanels) {
      vehicleNegotiation.selectedOrderPanels = body.selectedOrderPanels.map(panel => ({
        _id: panel._id || '',
        orderPanelNo: panel.orderPanelNo || '',
        subCompanyId: panel.subCompanyId || null,
        subCompanyName: panel.subCompanyName || '',
        subCompanyCode: panel.subCompanyCode || ''
      }));
    }

    // Update orders with sub-company
    if (body.orders) {
      const processedOrders = body.orders.map(order => ({
        _id: order._id && isValidObjectId(order._id) 
          ? new mongoose.Types.ObjectId(order._id) 
          : new mongoose.Types.ObjectId(),
        orderNo: order.orderNo || '',
        orderPanelId: order.orderPanelId || '',
        partyName: order.partyName || '',
        customerId: order.customerId && isValidObjectId(order.customerId) ? order.customerId : null,
        customerCode: order.customerCode || '',
        contactPerson: order.contactPerson || '',
        plantCode: order.plantCode && isValidObjectId(order.plantCode) ? order.plantCode : null,
        plantName: order.plantName || '',
        plantCodeValue: order.plantCodeValue || '',
        orderType: order.orderType || 'Sales',
        pinCode: order.pinCode || '',
        from: order.from && isValidObjectId(order.from) ? order.from : null,
        fromName: order.fromName || '',
        fromState: order.fromState || '',
        to: order.to && isValidObjectId(order.to) ? order.to : null,
        toName: order.toName || '',
        taluka: order.taluka || '',
        talukaName: order.talukaName || '',
        country: order.country || '',
        countryName: order.countryName || '',
        state: order.state || '',
        stateName: order.stateName || '',
        district: order.district || '',
        districtName: order.districtName || '',
        weight: Number(order.weight) || 0,
        status: order.status || 'Open',
        collectionCharges: Number(order.collectionCharges) || 0,
        cancellationCharges: order.cancellationCharges || 'Nil',
        loadingCharges: order.loadingCharges || 'Nil',
        otherCharges: Number(order.otherCharges) || 0,
        localStatus: order.localStatus || 'unknown',
        localStatusLabel: order.localStatusLabel || 'Unknown',
        // Sub-company fields for each order
        subCompanyId: order.subCompanyId && isValidObjectId(order.subCompanyId) ? order.subCompanyId : null,
        subCompanyName: order.subCompanyName || '',
        subCompanyCode: order.subCompanyCode || ''
      }));
      
      vehicleNegotiation.orders = processedOrders;
      vehicleNegotiation.totalWeight = processedOrders.reduce((sum, order) => sum + (order.weight || 0), 0);
    }

    // Update negotiation
    if (body.negotiation) {
      vehicleNegotiation.negotiation = {
        maxRate: Number(body.negotiation.maxRate) || vehicleNegotiation.negotiation?.maxRate || 0,
        targetRate: Number(body.negotiation.targetRate) || vehicleNegotiation.negotiation?.targetRate || 0,
        purchaseType: body.negotiation.purchaseType || vehicleNegotiation.negotiation?.purchaseType || 'Loading & Unloading',
        oldRatePercent: body.negotiation.oldRatePercent || vehicleNegotiation.negotiation?.oldRatePercent || '',
        remarks1: body.negotiation.remarks1 || vehicleNegotiation.negotiation?.remarks1 || '',
        remarks2: body.negotiation.remarks2 || vehicleNegotiation.negotiation?.remarks2 || ''
      };
    }

    // Update vendors with purchase type
    if (body.vendors) {
      vehicleNegotiation.vendors = body.vendors.map(v => ({
        _id: v._id && isValidObjectId(v._id) 
          ? new mongoose.Types.ObjectId(v._id) 
          : new mongoose.Types.ObjectId(),
        vendorName: v.vendorName || '',
        vendorCode: v.vendorCode || '',
        purchaseType: v.purchaseType || '',
        marketRate: Number(v.marketRate) || 0
      }));
    }

    // Update voice note
    if (body.voiceUrl !== undefined) vehicleNegotiation.voiceNote = body.voiceUrl;
    if (body.voiceFileInfo) vehicleNegotiation.voiceNoteFile = body.voiceFileInfo;

    // Update approval with ALL fields
    if (body.approval) {
      const currentApproval = vehicleNegotiation.approval || {};
      
      const updatedApproval = {
        vendorName: body.approval.vendorName !== undefined ? body.approval.vendorName : (currentApproval.vendorName || ''),
        vendorCode: body.approval.vendorCode !== undefined ? body.approval.vendorCode : (currentApproval.vendorCode || ''),
        vendorId: body.approval.vendorId !== undefined ? body.approval.vendorId : (currentApproval.vendorId || null),
        vendorStatus: body.approval.vendorStatus !== undefined ? body.approval.vendorStatus : (currentApproval.vendorStatus || 'Active'),
        rateType: body.approval.rateType !== undefined ? body.approval.rateType : (currentApproval.rateType || 'Per MT'),
        finalPerMT: body.approval.finalPerMT !== undefined ? Number(body.approval.finalPerMT) : (currentApproval.finalPerMT || 0),
        finalFix: body.approval.finalFix !== undefined ? Number(body.approval.finalFix) : (currentApproval.finalFix || 0),
        vehicleNo: body.approval.vehicleNo !== undefined ? body.approval.vehicleNo : (currentApproval.vehicleNo || ''),
        vehicleId: body.approval.vehicleId !== undefined ? body.approval.vehicleId : (currentApproval.vehicleId || ''),
        vehicleData: body.approval.vehicleData !== undefined ? body.approval.vehicleData : (currentApproval.vehicleData || null),
        mobile: body.approval.mobile !== undefined ? body.approval.mobile : (currentApproval.mobile || ''),
        purchaseType: body.approval.purchaseType !== undefined ? body.approval.purchaseType : (currentApproval.purchaseType || 'Loading & Unloading'),
        paymentTerms: body.approval.paymentTerms !== undefined ? body.approval.paymentTerms : (currentApproval.paymentTerms || '80 % Advance'),
        approvalStatus: body.approval.approvalStatus !== undefined ? body.approval.approvalStatus : (currentApproval.approvalStatus || 'Pending'),
        remarks: body.approval.remarks !== undefined ? body.approval.remarks : (currentApproval.remarks || ''),
        memoStatus: body.approval.memoStatus !== undefined ? body.approval.memoStatus : (currentApproval.memoStatus || 'Pending'),
      };

      // Handle memoFile
      if (body.approval.memoFile !== undefined) {
        if (body.approval.memoFile && typeof body.approval.memoFile === 'object') {
          const hasFileData = body.approval.memoFile.filePath || 
                             body.approval.memoFile.filename || 
                             body.approval.memoFile.originalName;
          
          if (hasFileData) {
            updatedApproval.memoFile = {
              filePath: body.approval.memoFile.filePath || '',
              fullPath: body.approval.memoFile.fullPath || '',
              filename: body.approval.memoFile.filename || '',
              originalName: body.approval.memoFile.originalName || '',
              size: Number(body.approval.memoFile.size) || 0,
              mimeType: body.approval.memoFile.mimeType || '',
              uploadedAt: body.approval.memoFile.uploadedAt || new Date()
            };
          } else {
            updatedApproval.memoFile = null;
          }
        } else if (body.approval.memoFile === null) {
          updatedApproval.memoFile = null;
        } else if (currentApproval.memoFile) {
          updatedApproval.memoFile = currentApproval.memoFile;
        }
      } else if (currentApproval.memoFile) {
        updatedApproval.memoFile = currentApproval.memoFile;
      }

      vehicleNegotiation.approval = updatedApproval;
    }

    // Save the updated vehicle negotiation
    await vehicleNegotiation.save();

    return NextResponse.json({ 
      success: true, 
      message: "Vehicle negotiation updated successfully",
      data: {
        _id: vehicleNegotiation._id,
        vnnNo: vehicleNegotiation.vnnNo
      }
    }, { status: 200 });

  } catch (error) {
    console.error("❌ PUT /vehicle-negotiation error:", error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json({ 
        success: false, 
        message: messages.join(', ') 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to update vehicle negotiation"
    }, { status: 500 });
  }
}

/* ========================================
   DELETE /api/vehicle-negotiation - Requires 'delete' permission
======================================== */
export async function DELETE(req) {
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req, 'delete');
    if (error) {
      return NextResponse.json({ success: false, message: error, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' }, { status });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: "Vehicle negotiation ID is required" 
      }, { status: 400 });
    }

    console.log(`🗑️ Deleting vehicle negotiation: ${id}`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid vehicle negotiation ID format" 
      }, { status: 400 });
    }
    
    const result = await VehicleNegotiation.deleteOne({
      _id: id,
      companyId: user.companyId
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "Vehicle negotiation not found" 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Vehicle negotiation deleted successfully" 
    }, { status: 200 });

  } catch (error) {
    console.error("❌ DELETE /vehicle-negotiation error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to delete vehicle negotiation"
    }, { status: 500 });
  }
}

/* ========================================
   PATCH /api/vehicle-negotiation - Requires 'approve' permission
======================================== */
export async function PATCH(req) {
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req, 'approve');
    if (error) {
      return NextResponse.json({ success: false, message: error, code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' }, { status });
    }

    const body = await req.json();
    const { id, action } = body;
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: "Vehicle negotiation ID is required" 
      }, { status: 400 });
    }

    console.log(`📝 Updating vehicle negotiation status: ${id} - Action: ${action}`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid vehicle negotiation ID format" 
      }, { status: 400 });
    }
    
    const vehicleNegotiation = await VehicleNegotiation.findOne({
      _id: id,
      companyId: user.companyId
    });

    if (!vehicleNegotiation) {
      return NextResponse.json({ 
        success: false, 
        message: "Vehicle negotiation not found" 
      }, { status: 404 });
    }

    // Handle approve action
    if (action === 'approve') {
      // Update approval status
      vehicleNegotiation.approval.approvalStatus = 'Approved';
      vehicleNegotiation.panelStatus = 'Approved';
      
      // You can also update other fields if needed
      // For example, if you want to allow updating vendor details during approval:
      if (body.vendorName) vehicleNegotiation.approval.vendorName = body.vendorName;
      if (body.vendorCode) vehicleNegotiation.approval.vendorCode = body.vendorCode;
      if (body.finalPerMT !== undefined) vehicleNegotiation.approval.finalPerMT = Number(body.finalPerMT);
      if (body.finalFix !== undefined) vehicleNegotiation.approval.finalFix = Number(body.finalFix);
      if (body.vehicleNo) vehicleNegotiation.approval.vehicleNo = body.vehicleNo;
      if (body.mobile) vehicleNegotiation.approval.mobile = body.mobile;
      if (body.purchaseType) vehicleNegotiation.approval.purchaseType = body.purchaseType;
      if (body.paymentTerms) vehicleNegotiation.approval.paymentTerms = body.paymentTerms;
      if (body.remarks) vehicleNegotiation.approval.remarks = body.remarks;
      if (body.memoStatus) vehicleNegotiation.approval.memoStatus = body.memoStatus;
      
      await vehicleNegotiation.save();

      return NextResponse.json({ 
        success: true, 
        message: "Vehicle negotiation approved successfully",
        data: {
          _id: vehicleNegotiation._id,
          vnnNo: vehicleNegotiation.vnnNo,
          approvalStatus: vehicleNegotiation.approval.approvalStatus,
          panelStatus: vehicleNegotiation.panelStatus
        }
      }, { status: 200 });
    }
    
    // Handle reject action
    else if (action === 'reject') {
      vehicleNegotiation.approval.approvalStatus = 'Reject';
      vehicleNegotiation.panelStatus = 'Rejected';
      
      if (body.remarks) vehicleNegotiation.approval.remarks = body.remarks;
      
      await vehicleNegotiation.save();

      return NextResponse.json({ 
        success: true, 
        message: "Vehicle negotiation rejected successfully",
        data: {
          _id: vehicleNegotiation._id,
          vnnNo: vehicleNegotiation.vnnNo,
          approvalStatus: vehicleNegotiation.approval.approvalStatus,
          panelStatus: vehicleNegotiation.panelStatus
        }
      }, { status: 200 });
    }
    
    // Handle update-approval action (for editing approval details without changing status)
    else if (action === 'update-approval') {
      const currentApproval = vehicleNegotiation.approval || {};
      
      // Update only the fields that are provided
      if (body.vendorName !== undefined) vehicleNegotiation.approval.vendorName = body.vendorName;
      if (body.vendorCode !== undefined) vehicleNegotiation.approval.vendorCode = body.vendorCode;
      if (body.vendorStatus !== undefined) vehicleNegotiation.approval.vendorStatus = body.vendorStatus;
      if (body.rateType !== undefined) vehicleNegotiation.approval.rateType = body.rateType;
      if (body.finalPerMT !== undefined) vehicleNegotiation.approval.finalPerMT = Number(body.finalPerMT);
      if (body.finalFix !== undefined) vehicleNegotiation.approval.finalFix = Number(body.finalFix);
      if (body.vehicleNo !== undefined) vehicleNegotiation.approval.vehicleNo = body.vehicleNo;
      if (body.vehicleId !== undefined) vehicleNegotiation.approval.vehicleId = body.vehicleId;
      if (body.vehicleData !== undefined) vehicleNegotiation.approval.vehicleData = body.vehicleData;
      if (body.mobile !== undefined) vehicleNegotiation.approval.mobile = body.mobile;
      if (body.purchaseType !== undefined) vehicleNegotiation.approval.purchaseType = body.purchaseType;
      if (body.paymentTerms !== undefined) vehicleNegotiation.approval.paymentTerms = body.paymentTerms;
      if (body.remarks !== undefined) vehicleNegotiation.approval.remarks = body.remarks;
      if (body.memoStatus !== undefined) vehicleNegotiation.approval.memoStatus = body.memoStatus;
      if (body.memoFile !== undefined) vehicleNegotiation.approval.memoFile = body.memoFile;
      
      // Keep existing approval status
      if (body.approvalStatus === undefined) {
        vehicleNegotiation.approval.approvalStatus = currentApproval.approvalStatus || 'Pending';
      } else {
        vehicleNegotiation.approval.approvalStatus = body.approvalStatus;
      }
      
      await vehicleNegotiation.save();

      return NextResponse.json({ 
        success: true, 
        message: "Approval details updated successfully",
        data: {
          _id: vehicleNegotiation._id,
          vnnNo: vehicleNegotiation.vnnNo,
          approvalStatus: vehicleNegotiation.approval.approvalStatus
        }
      }, { status: 200 });
    }
    
    // Handle approve-with-update action (approve and update details)
    else if (action === 'approve-with-update') {
      // Update all fields
      if (body.vendorName !== undefined) vehicleNegotiation.approval.vendorName = body.vendorName;
      if (body.vendorCode !== undefined) vehicleNegotiation.approval.vendorCode = body.vendorCode;
      if (body.vendorStatus !== undefined) vehicleNegotiation.approval.vendorStatus = body.vendorStatus;
      if (body.rateType !== undefined) vehicleNegotiation.approval.rateType = body.rateType;
      if (body.finalPerMT !== undefined) vehicleNegotiation.approval.finalPerMT = Number(body.finalPerMT);
      if (body.finalFix !== undefined) vehicleNegotiation.approval.finalFix = Number(body.finalFix);
      if (body.vehicleNo !== undefined) vehicleNegotiation.approval.vehicleNo = body.vehicleNo;
      if (body.mobile !== undefined) vehicleNegotiation.approval.mobile = body.mobile;
      if (body.purchaseType !== undefined) vehicleNegotiation.approval.purchaseType = body.purchaseType;
      if (body.paymentTerms !== undefined) vehicleNegotiation.approval.paymentTerms = body.paymentTerms;
      if (body.remarks !== undefined) vehicleNegotiation.approval.remarks = body.remarks;
      if (body.memoStatus !== undefined) vehicleNegotiation.approval.memoStatus = body.memoStatus;
      if (body.memoFile !== undefined) vehicleNegotiation.approval.memoFile = body.memoFile;
      
      // Set status to Approved
      vehicleNegotiation.approval.approvalStatus = 'Approved';
      vehicleNegotiation.panelStatus = 'Approved';
      
      await vehicleNegotiation.save();

      return NextResponse.json({ 
        success: true, 
        message: "Vehicle negotiation approved with updates",
        data: {
          _id: vehicleNegotiation._id,
          vnnNo: vehicleNegotiation.vnnNo,
          approvalStatus: vehicleNegotiation.approval.approvalStatus
        }
      }, { status: 200 });
    }
    
    else {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid action. Allowed: approve, reject, update-approval, approve-with-update" 
      }, { status: 400 });
    }

  } catch (error) {
    console.error("❌ PATCH /vehicle-negotiation error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to update vehicle negotiation status"
    }, { status: 500 });
  }
}