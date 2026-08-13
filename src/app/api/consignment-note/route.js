
// // import { NextResponse } from "next/server";
// // import connectDb from "@/lib/db";
// // import ConsignmentNote from "./ConsignmentNote";
// // import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// // import { getNextLRNumber } from "./ConsignmentCounter";
// // import mongoose from 'mongoose';

// // // Helper function to convert to number
// // function num(value) {
// //   if (value === null || value === undefined || value === '') return 0;
// //   const n = Number(value);
// //   return Number.isFinite(n) ? n : 0;
// // }

// // // ✅ Role-based access check
// // function isAuthorized(user) {
// //   return (
// //     user?.type === "company" ||
// //     user?.role === "Admin" ||
// //     user?.permissions?.includes("consignment_note")
// //   );
// // }

// // async function validateUser(req) {
// //   const token = getTokenFromHeader(req);
// //   if (!token) return { error: "Token missing", status: 401 };

// //   try {
// //     const user = await verifyJWT(token);
// //     if (!user) return { error: "Invalid token", status: 401 };
// //     if (!isAuthorized(user)) return { error: "Unauthorized", status: 403 };
// //     return { user, error: null, status: 200 };
// //   } catch (err) {
// //     console.error("JWT Verification Failed:", err?.message || err);
// //     return { error: "Invalid token", status: 401 };
// //   }
// // }

// // /* ========================================
// //    GET /api/consignment-note
// // ======================================== */
// // export async function GET(req) {
// //   try {
// //     await connectDb();
// //     const { user, error, status } = await validateUser(req);
// //     if (error) {
// //       return NextResponse.json({ success: false, message: error }, { status });
// //     }

// //     const url = new URL(req.url);
// //     const id = url.searchParams.get("id");
// //     const lrNo = url.searchParams.get("lrNo");
// //     const format = url.searchParams.get("format");
// //     const search = url.searchParams.get("search");
// //     const fromDate = url.searchParams.get("fromDate");
// //     const toDate = url.searchParams.get("toDate");
// //     const statusFilter = url.searchParams.get("status");

// //     // ============ CASE 1: GET SINGLE BY ID ============
// //     if (id) {
// //       if (!mongoose.Types.ObjectId.isValid(id)) {
// //         return NextResponse.json({ 
// //           success: false, 
// //           message: "Invalid consignment note ID format" 
// //         }, { status: 400 });
// //       }

// //       const note = await ConsignmentNote.findOne({
// //         _id: id,
// //         companyId: user.companyId
// //       }).lean();

// //       if (!note) {
// //         return NextResponse.json({ 
// //           success: false, 
// //           message: "Consignment note not found" 
// //         }, { status: 404 });
// //       }

// //       return NextResponse.json({ 
// //         success: true, 
// //         data: note 
// //       }, { status: 200 });
// //     }

// //     // ============ CASE 2: GET SINGLE BY LR NUMBER ============
// //     if (lrNo) {
// //       const note = await ConsignmentNote.findOne({
// //         lrNo: lrNo,
// //         companyId: user.companyId
// //       }).lean();

// //       if (!note) {
// //         return NextResponse.json({ 
// //           success: false, 
// //           message: "Consignment note not found" 
// //         }, { status: 404 });
// //       }

// //       return NextResponse.json({ 
// //         success: true, 
// //         data: note 
// //       }, { status: 200 });
// //     }

// //     // ============ CASE 3: TABLE FORMAT FOR LIST VIEW ============
// //     if (format === 'table') {
// //       let query = { companyId: user.companyId };

// //       // Search filter
// //       if (search) {
// //         query.$or = [
// //           { lrNo: { $regex: search, $options: 'i' } },
// //           { loadingInfoNo: { $regex: search, $options: 'i' } },
// //           { vnnNo: { $regex: search, $options: 'i' } },
// //           { 'header.partyName': { $regex: search, $options: 'i' } },
// //           { 'header.orderNo': { $regex: search, $options: 'i' } },
// //           { 'header.vendorName': { $regex: search, $options: 'i' } },
// //           { 'header.vehicleNo': { $regex: search, $options: 'i' } }
// //         ];
// //       }

// //       // Status filter
// //       if (statusFilter) {
// //         query['header.status'] = statusFilter;
// //       }

// //       // Date range filter
// //       if (fromDate || toDate) {
// //         query.createdAt = {};
// //         if (fromDate) {
// //           query.createdAt.$gte = new Date(fromDate);
// //         }
// //         if (toDate) {
// //           query.createdAt.$lte = new Date(toDate + 'T23:59:59');
// //         }
// //       }

// //       const notes = await ConsignmentNote.find(query)
// //         .sort({ createdAt: -1 })
// //         .lean();

// //       const tableData = notes.map(note => ({
// //         _id: note._id,
// //         date: note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-GB').replace(/\//g, '.') : '',
// //         lrNo: note.lrNo || 'N/A',
// //         loadingInfoNo: note.loadingInfoNo || '',
// //         vnnNo: note.vnnNo || '',
// //         partyName: note.header?.partyName || 'N/A',
// //         orderNo: note.header?.orderNo || 'N/A',
// //         vendorName: note.header?.vendorName || 'N/A',
// //         vendorCode: note.header?.vendorCode || 'N/A',
// //         from: note.header?.from || 'N/A',
// //         to: note.header?.to || 'N/A',
// //         vehicleNo: note.header?.vehicleNo || 'N/A',
// //         totalWeight: note.totalWeight || 0,
// //         unit: note.header?.unit || 'MT',
// //         status: note.header?.status || 'Pending'
// //       }));

// //       return NextResponse.json({
// //         success: true,
// //         data: tableData,
// //         count: tableData.length
// //       }, { status: 200 });
// //     }

// //     // ============ CASE 4: LIST FOR DROPDOWNS ============
// //     const notes = await ConsignmentNote.find({ 
// //       companyId: user.companyId 
// //     })
// //     .select('lrNo loadingInfoNo vnnNo header.partyName header.orderNo header.status')
// //     .sort({ createdAt: -1 })
// //     .lean();

// //     return NextResponse.json({
// //       success: true,
// //       data: notes
// //     }, { status: 200 });

// //   } catch (error) {
// //     console.error("❌ GET /consignment-note error:", error);
// //     return NextResponse.json({ 
// //       success: false, 
// //       message: error.message || "Failed to fetch consignment notes"
// //     }, { status: 500 });
// //   }
// // }

// // /* ========================================
// //    POST /api/consignment-note - Create New
// // ======================================== */
// // export async function POST(req) {
// //   try {
// //     await connectDb();
// //     const { user, error, status } = await validateUser(req);
// //     if (error) {
// //       return NextResponse.json({ success: false, message: error }, { status });
// //     }

// //     const body = await req.json();
    
// //     console.log("📝 Creating new consignment note");

// //     // Generate LR number if not provided
// //     let lrNo = body.header?.lrNo || await getNextLRNumber(user.companyId);

// //     // Check if loadingInfoNo is already used (if provided)
// //     if (body.loadingInfoNo) {
// //       const existing = await ConsignmentNote.findOne({
// //         loadingInfoNo: body.loadingInfoNo,
// //         companyId: user.companyId
// //       });
      
// //       if (existing) {
// //         return NextResponse.json({ 
// //           success: false, 
// //           message: `Loading Info ${body.loadingInfoNo} is already used in consignment note ${existing.lrNo}` 
// //         }, { status: 400 });
// //       }
// //     }

// //     // Process pack data from frontend structure
// //     const packData = {
// //       PALLETIZATION: (body.packData?.PALLETIZATION || []).map(row => ({
// //         _id: row._id,
// //         packType: "PALLETIZATION",
// //         noOfPallets: row.noOfPallets || '',
// //         unitPerPallets: row.unitPerPallets || '',
// //         totalPkgs: row.totalPkgs || '',
// //         pkgsType: row.pkgsType || '',
// //         uom: row.uom || 'MT',
// //         skuSize: row.skuSize || '',
// //         packWeight: row.packWeight || '',
// //         productName: row.productName || '',
// //         wtLtr: row.wtLtr || '',
// //         actualWt: row.actualWt || '',
// //         chargedWt: row.chargedWt || '',
// //         wtUom: row.wtUom || 'MT'
// //       })),
// //       'UNIFORM - BAGS/BOXES': (body.packData?.['UNIFORM - BAGS/BOXES'] || []).map(row => ({
// //         _id: row._id,
// //         packType: "UNIFORM - BAGS/BOXES",
// //         totalPkgs: row.totalPkgs || '',
// //         pkgsType: row.pkgsType || '',
// //         uom: row.uom || '',
// //         skuSize: row.skuSize || '',
// //         packWeight: row.packWeight || '',
// //         productName: row.productName || '',
// //         wtLtr: row.wtLtr || '',
// //         actualWt: row.actualWt || '',
// //         chargedWt: row.chargedWt || '',
// //         wtUom: row.wtUom || 'MT'
// //       })),
// //       'LOOSE - CARGO': (body.packData?.['LOOSE - CARGO'] || []).map(row => ({
// //         _id: row._id,
// //         packType: "LOOSE - CARGO",
// //         uom: row.uom || 'MT',
// //         productName: row.productName || '',
// //         actualWt: row.actualWt || '',
// //         chargedWt: row.chargedWt || ''
// //       })),
// //       'NON-UNIFORM - GENERAL CARGO': (body.packData?.['NON-UNIFORM - GENERAL CARGO'] || []).map(row => ({
// //         _id: row._id,
// //         packType: "NON-UNIFORM - GENERAL CARGO",
// //         nos: row.nos || '',
// //         productName: row.productName || '',
// //         uom: row.uom || 'MT',
// //         length: row.length || '',
// //         width: row.width || '',
// //         height: row.height || '',
// //         actualWt: row.actualWt || '',
// //         chargedWt: row.chargedWt || ''
// //       }))
// //     };

// //     // Create consignment note
// //     const consignmentNote = new ConsignmentNote({
// //       lrNo,
// //       vnnNo: body.vnnNo || '',
// //       vehicleNegotiationRef: body.vehicleNegotiationRef || null,
// //       loadingInfoNo: body.loadingInfoNo || '',
// //       header: {
// //         orderNo: body.header?.orderNo || '',
// //         partyName: body.header?.partyName || '',
// //         orderType: body.header?.orderType || 'Sales',
// //         plantCode: body.header?.plantCode || '',
// //         plantName: body.header?.plantName || '',
// //         hiredOwned: body.header?.hiredOwned || 'Hired',
// //         vendorCode: body.header?.vendorCode || '',
// //         vendorName: body.header?.vendorName || '',
// //         from: body.header?.from || '',
// //         to: body.header?.to || '',
// //         taluka: body.header?.taluka || '',
// //         district: body.header?.district || '',
// //         state: body.header?.state || '',
// //         vehicleNo: body.header?.vehicleNo || '',
// //         partyNo: body.header?.partyNo || '',
// //         lrNo: body.header?.lrNo || lrNo,
// //         lrDate: body.header?.lrDate || '',
// //         unit: body.header?.unit || 'MT',
// //         status: body.header?.status || 'Pending'
// //       },
// //       consignor: {
// //         name: body.consignor?.name || '',
// //         address: body.consignor?.address || '',
// //         customerId: body.consignor?.customerId || '',
// //         selectedAddressTitle: body.consignor?.selectedAddressTitle || ''
// //       },
// //       consignee: {
// //         name: body.consignee?.name || '',
// //         address: body.consignee?.address || '',
// //         customerId: body.consignee?.customerId || '',
// //         selectedAddressTitle: body.consignee?.selectedAddressTitle || ''
// //       },
// //       invoice: {
// //         boeInvoice: body.invoice?.boeInvoice || 'As Per Invoice',
// //         boeInvoiceNo: body.invoice?.boeInvoiceNo || '',
// //         boeInvoiceDate: body.invoice?.boeInvoiceDate || '',
// //         invoiceValue: body.invoice?.invoiceValue || ''
// //       },
// //       ewaybill: {
// //         ewaybillNo: body.ewaybill?.ewaybillNo || '',
// //         expiryDate: body.ewaybill?.expiryDate || '',
// //         containerNo: body.ewaybill?.containerNo || ''
// //       },
// //       packData: packData,
// //       companyId: user.companyId,
// //       createdBy: user.id
// //     });

// //     await consignmentNote.save();

// //     return NextResponse.json({ 
// //       success: true, 
// //       message: "Consignment note created successfully",
// //       data: {
// //         _id: consignmentNote._id,
// //         lrNo: consignmentNote.lrNo,
// //         loadingInfoNo: consignmentNote.loadingInfoNo
// //       }
// //     }, { status: 201 });

// //   } catch (error) {
// //     console.error("❌ POST /consignment-note error:", error);

// //     if (error.code === 11000) {
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: "LR number already exists" 
// //       }, { status: 400 });
// //     }

// //     if (error.name === 'ValidationError') {
// //       const messages = Object.values(error.errors).map(err => err.message);
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: messages.join(', ') 
// //       }, { status: 400 });
// //     }

// //     return NextResponse.json({ 
// //       success: false, 
// //       message: error.message || "Failed to create consignment note"
// //     }, { status: 500 });
// //   }
// // }

// // /* ========================================
// //    PUT /api/consignment-note - Update
// // ======================================== */
// // export async function PUT(req) {
// //   try {
// //     await connectDb();
// //     const { user, error, status } = await validateUser(req);
// //     if (error) {
// //       return NextResponse.json({ success: false, message: error }, { status });
// //     }

// //     const body = await req.json();
// //     const { id } = body;
    
// //     if (!id) {
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: "Consignment note ID is required" 
// //       }, { status: 400 });
// //     }

// //     if (!mongoose.Types.ObjectId.isValid(id)) {
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: "Invalid consignment note ID format" 
// //       }, { status: 400 });
// //     }

// //     const note = await ConsignmentNote.findOne({
// //       _id: id,
// //       companyId: user.companyId
// //     });

// //     if (!note) {
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: "Consignment note not found" 
// //       }, { status: 404 });
// //     }

// //     // Check if loadingInfoNo is being changed and if new one is already used
// //     if (body.loadingInfoNo && body.loadingInfoNo !== note.loadingInfoNo) {
// //       const existing = await ConsignmentNote.findOne({
// //         loadingInfoNo: body.loadingInfoNo,
// //         companyId: user.companyId,
// //         _id: { $ne: id }
// //       });
      
// //       if (existing) {
// //         return NextResponse.json({ 
// //           success: false, 
// //           message: `Loading Info ${body.loadingInfoNo} is already used in consignment note ${existing.lrNo}` 
// //         }, { status: 400 });
// //       }
// //     }

// //     // Update reference fields
// //     if (body.vnnNo !== undefined) note.vnnNo = body.vnnNo;
// //     if (body.vehicleNegotiationRef !== undefined) note.vehicleNegotiationRef = body.vehicleNegotiationRef;
// //     if (body.loadingInfoNo !== undefined) note.loadingInfoNo = body.loadingInfoNo;

// //     // Update header
// //     if (body.header) {
// //       note.header = {
// //         ...note.header,
// //         ...body.header
// //       };
// //     }

// //     // Update consignor
// //     if (body.consignor) {
// //       note.consignor = {
// //         ...note.consignor,
// //         ...body.consignor
// //       };
// //     }

// //     // Update consignee
// //     if (body.consignee) {
// //       note.consignee = {
// //         ...note.consignee,
// //         ...body.consignee
// //       };
// //     }

// //     // Update invoice
// //     if (body.invoice) {
// //       note.invoice = {
// //         ...note.invoice,
// //         ...body.invoice
// //       };
// //     }

// //     // Update ewaybill
// //     if (body.ewaybill) {
// //       note.ewaybill = {
// //         ...note.ewaybill,
// //         ...body.ewaybill
// //       };
// //     }

// //     // Update pack data
// //     if (body.packData) {
// //       note.packData = {
// //         PALLETIZATION: (body.packData.PALLETIZATION || []).map(row => ({
// //           _id: row._id,
// //           packType: "PALLETIZATION",
// //           noOfPallets: row.noOfPallets || '',
// //           unitPerPallets: row.unitPerPallets || '',
// //           totalPkgs: row.totalPkgs || '',
// //           pkgsType: row.pkgsType || '',
// //           uom: row.uom || 'MT',
// //           skuSize: row.skuSize || '',
// //           packWeight: row.packWeight || '',
// //           productName: row.productName || '',
// //           wtLtr: row.wtLtr || '',
// //           actualWt: row.actualWt || '',
// //           chargedWt: row.chargedWt || '',
// //           wtUom: row.wtUom || 'MT'
// //         })),
// //         'UNIFORM - BAGS/BOXES': (body.packData['UNIFORM - BAGS/BOXES'] || []).map(row => ({
// //           _id: row._id,
// //           packType: "UNIFORM - BAGS/BOXES",
// //           totalPkgs: row.totalPkgs || '',
// //           pkgsType: row.pkgsType || '',
// //           uom: row.uom || '',
// //           skuSize: row.skuSize || '',
// //           packWeight: row.packWeight || '',
// //           productName: row.productName || '',
// //           wtLtr: row.wtLtr || '',
// //           actualWt: row.actualWt || '',
// //           chargedWt: row.chargedWt || '',
// //           wtUom: row.wtUom || 'MT'
// //         })),
// //         'LOOSE - CARGO': (body.packData['LOOSE - CARGO'] || []).map(row => ({
// //           _id: row._id,
// //           packType: "LOOSE - CARGO",
// //           uom: row.uom || 'MT',
// //           productName: row.productName || '',
// //           actualWt: row.actualWt || '',
// //           chargedWt: row.chargedWt || ''
// //         })),
// //         'NON-UNIFORM - GENERAL CARGO': (body.packData['NON-UNIFORM - GENERAL CARGO'] || []).map(row => ({
// //           _id: row._id,
// //           packType: "NON-UNIFORM - GENERAL CARGO",
// //           nos: row.nos || '',
// //           productName: row.productName || '',
// //           uom: row.uom || 'MT',
// //           length: row.length || '',
// //           width: row.width || '',
// //           height: row.height || '',
// //           actualWt: row.actualWt || '',
// //           chargedWt: row.chargedWt || ''
// //         }))
// //       };
// //     }

// //     note.updatedAt = Date.now();
// //     await note.save();

// //     return NextResponse.json({ 
// //       success: true, 
// //       message: "Consignment note updated successfully",
// //       data: {
// //         _id: note._id,
// //         lrNo: note.lrNo,
// //         loadingInfoNo: note.loadingInfoNo
// //       }
// //     }, { status: 200 });

// //   } catch (error) {
// //     console.error("❌ PUT /consignment-note error:", error);
    
// //     if (error.name === 'ValidationError') {
// //       const messages = Object.values(error.errors).map(err => err.message);
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: messages.join(', ') 
// //       }, { status: 400 });
// //     }

// //     return NextResponse.json({ 
// //       success: false, 
// //       message: error.message || "Failed to update consignment note"
// //     }, { status: 500 });
// //   }
// // }

// // /* ========================================
// //    DELETE /api/consignment-note - Delete
// // ======================================== */
// // export async function DELETE(req) {
// //   try {
// //     await connectDb();
// //     const { user, error, status } = await validateUser(req);
// //     if (error) {
// //       return NextResponse.json({ success: false, message: error }, { status });
// //     }

// //     const url = new URL(req.url);
// //     const id = url.searchParams.get("id");
    
// //     if (!id) {
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: "Consignment note ID is required" 
// //       }, { status: 400 });
// //     }

// //     if (!mongoose.Types.ObjectId.isValid(id)) {
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: "Invalid consignment note ID format" 
// //       }, { status: 400 });
// //     }

// //     // Find the note first to check if it exists
// //     const note = await ConsignmentNote.findOne({
// //       _id: id,
// //       companyId: user.companyId
// //     });

// //     if (!note) {
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: "Consignment note not found" 
// //       }, { status: 404 });
// //     }

// //     // Don't delete approved/completed notes
// //     if (note.header?.status === 'Approved' || note.header?.status === 'Completed') {
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: `Cannot delete ${note.header.status} consignment note` 
// //       }, { status: 400 });
// //     }

// //     // Delete the note
// //     await ConsignmentNote.deleteOne({
// //       _id: id,
// //       companyId: user.companyId
// //     });

// //     console.log(`✅ Consignment note deleted: ${note.lrNo}`);

// //     return NextResponse.json({ 
// //       success: true, 
// //       message: "Consignment note deleted successfully",
// //       data: {
// //         lrNo: note.lrNo,
// //         loadingInfoNo: note.loadingInfoNo
// //       }
// //     }, { status: 200 });

// //   } catch (error) {
// //     console.error("❌ DELETE /consignment-note error:", error);
// //     return NextResponse.json({ 
// //       success: false, 
// //       message: error.message || "Failed to delete consignment note"
// //     }, { status: 500 });
// //   }
// // }

// import { NextResponse } from "next/server";
// import connectDb from "@/lib/db";
// import ConsignmentNote from "./ConsignmentNote";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { getNextLRNumber } from "./ConsignmentCounter";
// import mongoose from 'mongoose';

// // ── PERMISSION FUNCTIONS ──

// function isAuthorized(user) {
//   if (!user) return false;
  
//   // Company admins have full access
//   if (user.type === "company") return true;
  
//   // Admin role has full access
//   if (user.roles && user.roles.includes("Admin")) return true;
  
//   // Check module-based permissions for "Consignment Note"
//   const modules = user.modules || {};
//   const moduleData = modules["Consignment Note"];
  
//   if (!moduleData || !moduleData.selected) return false;
  
//   return true;
// }

// function hasPermission(user, action) {
//   if (!user) return false;
//   if (user.type === "company") return true;
//   if (user.roles && user.roles.includes("Admin")) return true;
  
//   const modules = user.modules || {};
//   const moduleData = modules["Consignment Note"];
  
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
//         error: "Access denied. You don't have permission to access Consignment Notes.", 
//         status: 403 
//       };
//     }
    
//     if (requiredAction && !hasPermission(user, requiredAction)) {
//       return { 
//         error: `Permission denied: ${requiredAction} action not allowed for Consignment Notes.`, 
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

// function num(value) {
//   if (value === null || value === undefined || value === '') return 0;
//   const n = Number(value);
//   return Number.isFinite(n) ? n : 0;
// }

// function isValidObjectId(id) {
//   return id && mongoose.Types.ObjectId.isValid(id);
// }

// /* ========================================
//    GET /api/consignment-note - Requires 'view' permission
// ======================================== */
// export async function GET(req) {
//   try {
//     await connectDb();
//     const { user, error, status } = await validateUser(req, 'view');
//     if (error) {
//       return NextResponse.json({ 
//         success: false, 
//         message: error,
//         code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
//       }, { status });
//     }

//     const url = new URL(req.url);
//     const id = url.searchParams.get("id");
//     const lrNo = url.searchParams.get("lrNo");
//     const format = url.searchParams.get("format");
//     const search = url.searchParams.get("search");
//     const fromDate = url.searchParams.get("fromDate");
//     const toDate = url.searchParams.get("toDate");
//     const statusFilter = url.searchParams.get("status");

//     // ============ CASE 1: GET SINGLE BY ID ============
//     if (id) {
//       if (!isValidObjectId(id)) {
//         return NextResponse.json({ 
//           success: false, 
//           message: "Invalid consignment note ID format" 
//         }, { status: 400 });
//       }

//       const note = await ConsignmentNote.findOne({
//         _id: id,
//         companyId: user.companyId
//       }).lean();

//       if (!note) {
//         return NextResponse.json({ 
//           success: false, 
//           message: "Consignment note not found" 
//         }, { status: 404 });
//       }

//       return NextResponse.json({ 
//         success: true, 
//         data: note 
//       }, { status: 200 });
//     }

//     // ============ CASE 2: GET SINGLE BY LR NUMBER ============
//     if (lrNo) {
//       const note = await ConsignmentNote.findOne({
//         lrNo: lrNo,
//         companyId: user.companyId
//       }).lean();

//       if (!note) {
//         return NextResponse.json({ 
//           success: false, 
//           message: "Consignment note not found" 
//         }, { status: 404 });
//       }

//       return NextResponse.json({ 
//         success: true, 
//         data: note 
//       }, { status: 200 });
//     }

//     // ============ CASE 3: TABLE FORMAT FOR LIST VIEW ============
//     if (format === 'table') {
//       let query = { companyId: user.companyId };

//       // Search filter
//       if (search) {
//         query.$or = [
//           { lrNo: { $regex: search, $options: 'i' } },
//           { loadingInfoNo: { $regex: search, $options: 'i' } },
//           { vnnNo: { $regex: search, $options: 'i' } },
//           { 'header.partyName': { $regex: search, $options: 'i' } },
//           { 'header.orderNo': { $regex: search, $options: 'i' } },
//           { 'header.vendorName': { $regex: search, $options: 'i' } },
//           { 'header.vehicleNo': { $regex: search, $options: 'i' } }
//         ];
//       }

//       // Status filter
//       if (statusFilter) {
//         query['header.status'] = statusFilter;
//       }

//       // Date range filter
//       if (fromDate || toDate) {
//         query.createdAt = {};
//         if (fromDate) {
//           query.createdAt.$gte = new Date(fromDate);
//         }
//         if (toDate) {
//           query.createdAt.$lte = new Date(toDate + 'T23:59:59');
//         }
//       }

//       const notes = await ConsignmentNote.find(query)
//         .sort({ createdAt: -1 })
//         .lean();

//       const tableData = notes.map(note => ({
//         _id: note._id,
//         date: note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-GB').replace(/\//g, '.') : '',
//         lrNo: note.lrNo || 'N/A',
//         loadingInfoNo: note.loadingInfoNo || '',
//         vnnNo: note.vnnNo || '',
//         partyName: note.header?.partyName || 'N/A',
//         orderNo: note.header?.orderNo || 'N/A',
//         vendorName: note.header?.vendorName || 'N/A',
//         vendorCode: note.header?.vendorCode || 'N/A',
//         from: note.header?.from || 'N/A',
//         to: note.header?.to || 'N/A',
//         vehicleNo: note.header?.vehicleNo || 'N/A',
//         totalWeight: note.totalWeight || 0,
//         unit: note.header?.unit || 'MT',
//         status: note.header?.status || 'Pending'
//       }));

//       return NextResponse.json({
//         success: true,
//         data: tableData,
//         count: tableData.length
//       }, { status: 200 });
//     }

//     // ============ CASE 4: LIST FOR DROPDOWNS ============
//     const notes = await ConsignmentNote.find({ 
//       companyId: user.companyId 
//     })
//     .select('lrNo loadingInfoNo vnnNo header.partyName header.orderNo header.status')
//     .sort({ createdAt: -1 })
//     .lean();

//     return NextResponse.json({
//       success: true,
//       data: notes
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ GET /consignment-note error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to fetch consignment notes"
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    POST /api/consignment-note - Requires 'create' permission
// ======================================== */
// export async function POST(req) {
//   try {
//     await connectDb();
//     const { user, error, status } = await validateUser(req, 'create');
//     if (error) {
//       return NextResponse.json({ 
//         success: false, 
//         message: error,
//         code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
//       }, { status });
//     }

//     const body = await req.json();
    
//     console.log("📝 Creating new consignment note");

//     // Generate LR number if not provided
//     let lrNo = body.header?.lrNo || await getNextLRNumber(user.companyId);

//     // Check if loadingInfoNo is already used (if provided)
//     if (body.loadingInfoNo) {
//       const existing = await ConsignmentNote.findOne({
//         loadingInfoNo: body.loadingInfoNo,
//         companyId: user.companyId
//       });
      
//       if (existing) {
//         return NextResponse.json({ 
//           success: false, 
//           message: `Loading Info ${body.loadingInfoNo} is already used in consignment note ${existing.lrNo}` 
//         }, { status: 400 });
//       }
//     }

//     // Process pack data from frontend structure
//     const packData = {
//       PALLETIZATION: (body.packData?.PALLETIZATION || []).map(row => ({
//         _id: row._id,
//         packType: "PALLETIZATION",
//         noOfPallets: row.noOfPallets || '',
//         unitPerPallets: row.unitPerPallets || '',
//         totalPkgs: row.totalPkgs || '',
//         pkgsType: row.pkgsType || '',
//         uom: row.uom || 'MT',
//         skuSize: row.skuSize || '',
//         packWeight: row.packWeight || '',
//         productName: row.productName || '',
//         wtLtr: row.wtLtr || '',
//         actualWt: row.actualWt || '',
//         chargedWt: row.chargedWt || '',
//         wtUom: row.wtUom || 'MT'
//       })),
//       'UNIFORM - BAGS/BOXES': (body.packData?.['UNIFORM - BAGS/BOXES'] || []).map(row => ({
//         _id: row._id,
//         packType: "UNIFORM - BAGS/BOXES",
//         totalPkgs: row.totalPkgs || '',
//         pkgsType: row.pkgsType || '',
//         uom: row.uom || '',
//         skuSize: row.skuSize || '',
//         packWeight: row.packWeight || '',
//         productName: row.productName || '',
//         wtLtr: row.wtLtr || '',
//         actualWt: row.actualWt || '',
//         chargedWt: row.chargedWt || '',
//         wtUom: row.wtUom || 'MT'
//       })),
//       'LOOSE - CARGO': (body.packData?.['LOOSE - CARGO'] || []).map(row => ({
//         _id: row._id,
//         packType: "LOOSE - CARGO",
//         uom: row.uom || 'MT',
//         productName: row.productName || '',
//         actualWt: row.actualWt || '',
//         chargedWt: row.chargedWt || ''
//       })),
//       'NON-UNIFORM - GENERAL CARGO': (body.packData?.['NON-UNIFORM - GENERAL CARGO'] || []).map(row => ({
//         _id: row._id,
//         packType: "NON-UNIFORM - GENERAL CARGO",
//         nos: row.nos || '',
//         productName: row.productName || '',
//         uom: row.uom || 'MT',
//         length: row.length || '',
//         width: row.width || '',
//         height: row.height || '',
//         actualWt: row.actualWt || '',
//         chargedWt: row.chargedWt || ''
//       }))
//     };

//     // Create consignment note
//     const consignmentNote = new ConsignmentNote({
//       lrNo,
//       vnnNo: body.vnnNo || '',
//       vehicleNegotiationRef: body.vehicleNegotiationRef || null,
//       loadingInfoNo: body.loadingInfoNo || '',
//       header: {
//         orderNo: body.header?.orderNo || '',
//         partyName: body.header?.partyName || '',
//         orderType: body.header?.orderType || 'Sales',
//         plantCode: body.header?.plantCode || '',
//         plantName: body.header?.plantName || '',
//         hiredOwned: body.header?.hiredOwned || 'Hired',
//         vendorCode: body.header?.vendorCode || '',
//         vendorName: body.header?.vendorName || '',
//         from: body.header?.from || '',
//         to: body.header?.to || '',
//         taluka: body.header?.taluka || '',
//         district: body.header?.district || '',
//         state: body.header?.state || '',
//         vehicleNo: body.header?.vehicleNo || '',
//         partyNo: body.header?.partyNo || '',
//         lrNo: body.header?.lrNo || lrNo,
//         lrDate: body.header?.lrDate || '',
//         unit: body.header?.unit || 'MT',
//         status: body.header?.status || 'Pending'
//       },
//       consignor: {
//         name: body.consignor?.name || '',
//         address: body.consignor?.address || '',
//         customerId: body.consignor?.customerId || '',
//         selectedAddressTitle: body.consignor?.selectedAddressTitle || ''
//       },
//       consignee: {
//         name: body.consignee?.name || '',
//         address: body.consignee?.address || '',
//         customerId: body.consignee?.customerId || '',
//         selectedAddressTitle: body.consignee?.selectedAddressTitle || ''
//       },
//       invoice: {
//         boeInvoice: body.invoice?.boeInvoice || 'As Per Invoice',
//         boeInvoiceNo: body.invoice?.boeInvoiceNo || '',
//         boeInvoiceDate: body.invoice?.boeInvoiceDate || '',
//         invoiceValue: body.invoice?.invoiceValue || ''
//       },
//       ewaybill: {
//         ewaybillNo: body.ewaybill?.ewaybillNo || '',
//         expiryDate: body.ewaybill?.expiryDate || '',
//         containerNo: body.ewaybill?.containerNo || ''
//       },
//       packData: packData,
//       companyId: user.companyId,
//       createdBy: user.id
//     });

//     await consignmentNote.save();

//     return NextResponse.json({ 
//       success: true, 
//       message: "Consignment note created successfully",
//       data: {
//         _id: consignmentNote._id,
//         lrNo: consignmentNote.lrNo,
//         loadingInfoNo: consignmentNote.loadingInfoNo
//       }
//     }, { status: 201 });

//   } catch (error) {
//     console.error("❌ POST /consignment-note error:", error);

//     if (error.code === 11000) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "LR number already exists" 
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
//       message: error.message || "Failed to create consignment note"
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    PUT /api/consignment-note - Requires 'edit' permission
// ======================================== */
// export async function PUT(req) {
//   try {
//     await connectDb();
//     const { user, error, status } = await validateUser(req, 'edit');
//     if (error) {
//       return NextResponse.json({ 
//         success: false, 
//         message: error,
//         code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
//       }, { status });
//     }

//     const body = await req.json();
//     const { id } = body;
    
//     if (!id) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Consignment note ID is required" 
//       }, { status: 400 });
//     }

//     if (!isValidObjectId(id)) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Invalid consignment note ID format" 
//       }, { status: 400 });
//     }

//     const note = await ConsignmentNote.findOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (!note) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Consignment note not found" 
//       }, { status: 404 });
//     }

//     // Check if loadingInfoNo is being changed and if new one is already used
//     if (body.loadingInfoNo && body.loadingInfoNo !== note.loadingInfoNo) {
//       const existing = await ConsignmentNote.findOne({
//         loadingInfoNo: body.loadingInfoNo,
//         companyId: user.companyId,
//         _id: { $ne: id }
//       });
      
//       if (existing) {
//         return NextResponse.json({ 
//           success: false, 
//           message: `Loading Info ${body.loadingInfoNo} is already used in consignment note ${existing.lrNo}` 
//         }, { status: 400 });
//       }
//     }

//     // Update reference fields
//     if (body.vnnNo !== undefined) note.vnnNo = body.vnnNo;
//     if (body.vehicleNegotiationRef !== undefined) note.vehicleNegotiationRef = body.vehicleNegotiationRef;
//     if (body.loadingInfoNo !== undefined) note.loadingInfoNo = body.loadingInfoNo;

//     // Update header
//     if (body.header) {
//       note.header = {
//         ...note.header,
//         ...body.header
//       };
//     }

//     // Update consignor
//     if (body.consignor) {
//       note.consignor = {
//         ...note.consignor,
//         ...body.consignor
//       };
//     }

//     // Update consignee
//     if (body.consignee) {
//       note.consignee = {
//         ...note.consignee,
//         ...body.consignee
//       };
//     }

//     // Update invoice
//     if (body.invoice) {
//       note.invoice = {
//         ...note.invoice,
//         ...body.invoice
//       };
//     }

//     // Update ewaybill
//     if (body.ewaybill) {
//       note.ewaybill = {
//         ...note.ewaybill,
//         ...body.ewaybill
//       };
//     }

//     // Update pack data
//     if (body.packData) {
//       note.packData = {
//         PALLETIZATION: (body.packData.PALLETIZATION || []).map(row => ({
//           _id: row._id,
//           packType: "PALLETIZATION",
//           noOfPallets: row.noOfPallets || '',
//           unitPerPallets: row.unitPerPallets || '',
//           totalPkgs: row.totalPkgs || '',
//           pkgsType: row.pkgsType || '',
//           uom: row.uom || 'MT',
//           skuSize: row.skuSize || '',
//           packWeight: row.packWeight || '',
//           productName: row.productName || '',
//           wtLtr: row.wtLtr || '',
//           actualWt: row.actualWt || '',
//           chargedWt: row.chargedWt || '',
//           wtUom: row.wtUom || 'MT'
//         })),
//         'UNIFORM - BAGS/BOXES': (body.packData['UNIFORM - BAGS/BOXES'] || []).map(row => ({
//           _id: row._id,
//           packType: "UNIFORM - BAGS/BOXES",
//           totalPkgs: row.totalPkgs || '',
//           pkgsType: row.pkgsType || '',
//           uom: row.uom || '',
//           skuSize: row.skuSize || '',
//           packWeight: row.packWeight || '',
//           productName: row.productName || '',
//           wtLtr: row.wtLtr || '',
//           actualWt: row.actualWt || '',
//           chargedWt: row.chargedWt || '',
//           wtUom: row.wtUom || 'MT'
//         })),
//         'LOOSE - CARGO': (body.packData['LOOSE - CARGO'] || []).map(row => ({
//           _id: row._id,
//           packType: "LOOSE - CARGO",
//           uom: row.uom || 'MT',
//           productName: row.productName || '',
//           actualWt: row.actualWt || '',
//           chargedWt: row.chargedWt || ''
//         })),
//         'NON-UNIFORM - GENERAL CARGO': (body.packData['NON-UNIFORM - GENERAL CARGO'] || []).map(row => ({
//           _id: row._id,
//           packType: "NON-UNIFORM - GENERAL CARGO",
//           nos: row.nos || '',
//           productName: row.productName || '',
//           uom: row.uom || 'MT',
//           length: row.length || '',
//           width: row.width || '',
//           height: row.height || '',
//           actualWt: row.actualWt || '',
//           chargedWt: row.chargedWt || ''
//         }))
//       };
//     }

//     note.updatedAt = Date.now();
//     await note.save();

//     return NextResponse.json({ 
//       success: true, 
//       message: "Consignment note updated successfully",
//       data: {
//         _id: note._id,
//         lrNo: note.lrNo,
//         loadingInfoNo: note.loadingInfoNo
//       }
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ PUT /consignment-note error:", error);
    
//     if (error.name === 'ValidationError') {
//       const messages = Object.values(error.errors).map(err => err.message);
//       return NextResponse.json({ 
//         success: false, 
//         message: messages.join(', ') 
//       }, { status: 400 });
//     }

//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to update consignment note"
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    DELETE /api/consignment-note - Requires 'delete' permission
// ======================================== */
// export async function DELETE(req) {
//   try {
//     await connectDb();
//     const { user, error, status } = await validateUser(req, 'delete');
//     if (error) {
//       return NextResponse.json({ 
//         success: false, 
//         message: error,
//         code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
//       }, { status });
//     }

//     const url = new URL(req.url);
//     const id = url.searchParams.get("id");
    
//     if (!id) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Consignment note ID is required" 
//       }, { status: 400 });
//     }

//     if (!isValidObjectId(id)) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Invalid consignment note ID format" 
//       }, { status: 400 });
//     }

//     // Find the note first to check if it exists
//     const note = await ConsignmentNote.findOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (!note) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Consignment note not found" 
//       }, { status: 404 });
//     }

//     // Don't delete approved/completed notes
//     if (note.header?.status === 'Approved' || note.header?.status === 'Completed') {
//       return NextResponse.json({ 
//         success: false, 
//         message: `Cannot delete ${note.header.status} consignment note` 
//       }, { status: 400 });
//     }

//     // Delete the note
//     await ConsignmentNote.deleteOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     console.log(`✅ Consignment note deleted: ${note.lrNo}`);

//     return NextResponse.json({ 
//       success: true, 
//       message: "Consignment note deleted successfully",
//       data: {
//         lrNo: note.lrNo,
//         loadingInfoNo: note.loadingInfoNo
//       }
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ DELETE /consignment-note error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to delete consignment note"
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    PATCH /api/consignment-note - Requires 'approve' permission
//    Handles: approve, reject, complete
// ======================================== */
// export async function PATCH(req) {
//   try {
//     await connectDb();
//     const { user, error, status } = await validateUser(req, 'approve');
//     if (error) {
//       return NextResponse.json({ 
//         success: false, 
//         message: error,
//         code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
//       }, { status });
//     }

//     const body = await req.json();
//     const { id, action } = body;
    
//     if (!id || !isValidObjectId(id)) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Valid ID is required" 
//       }, { status: 400 });
//     }

//     console.log(`📝 Updating consignment note status: ${id} - ${action}`);
    
//     const note = await ConsignmentNote.findOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (!note) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Consignment note not found" 
//       }, { status: 404 });
//     }

//     const allowedActions = ['approve', 'reject', 'complete'];
//     if (!allowedActions.includes(action)) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Invalid action. Allowed: approve, reject, complete" 
//       }, { status: 400 });
//     }

//     const statusMap = {
//       'approve': 'Approved',
//       'reject': 'Rejected',
//       'complete': 'Completed'
//     };

//     // Update status
//     note.header.status = statusMap[action];
//     note.updatedAt = Date.now();
    
//     // Also update the overall status if you have a top-level status field
//     if (note.status) {
//       note.status = statusMap[action];
//     }
    
//     await note.save();

//     return NextResponse.json({ 
//       success: true, 
//       message: `Consignment note ${action}d successfully`,
//       data: {
//         _id: note._id,
//         lrNo: note.lrNo,
//         status: note.header.status
//       }
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ PATCH /consignment-note error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to update consignment note status"
//     }, { status: 500 });
//   }
// }

import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import ConsignmentNote from "./ConsignmentNote";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { getNextLRNumber } from "./ConsignmentCounter";
import mongoose from 'mongoose';
import { activeOperatingCompanyId, companyScopeFilter } from "@/lib/companyScope";

// ── PERMISSION FUNCTIONS ──

function isAuthorized(user) {
  if (!user) return false;
  
  // Company admins have full access
  if (user.type === "company") return true;
  
  // Admin role has full access
  if (user.roles && user.roles.includes("Admin")) return true;
  
  // Check module-based permissions for "Consignment Note"
  const modules = user.modules || {};
  const moduleData = modules["Consignment Note"];
  
  if (!moduleData || !moduleData.selected) return false;
  
  return true;
}

function hasPermission(user, action) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.roles && user.roles.includes("Admin")) return true;
  
  const modules = user.modules || {};
  const moduleData = modules["Consignment Note"];
  
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
        error: "Access denied. You don't have permission to access Consignment Notes.", 
        status: 403 
      };
    }
    
    if (requiredAction && !hasPermission(user, requiredAction)) {
      return { 
        error: `Permission denied: ${requiredAction} action not allowed for Consignment Notes.`, 
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

function num(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isValidObjectId(id) {
  return id && mongoose.Types.ObjectId.isValid(id);
}

/* ========================================
   GET /api/consignment-note - Requires 'view' permission
======================================== */
export async function GET(req) {
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req, 'view');
    if (error) {
      return NextResponse.json({ 
        success: false, 
        message: error,
        code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
      }, { status });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const lrNo = url.searchParams.get("lrNo");
    const format = url.searchParams.get("format");
    const search = url.searchParams.get("search");
    const fromDate = url.searchParams.get("fromDate");
    const toDate = url.searchParams.get("toDate");
    const statusFilter = url.searchParams.get("status");

    // ============ CASE 1: GET SINGLE BY ID ============
    if (id) {
      if (!isValidObjectId(id)) {
        return NextResponse.json({ 
          success: false, 
          message: "Invalid consignment note ID format" 
        }, { status: 400 });
      }

      const note = await ConsignmentNote.findOne(companyScopeFilter(user, { _id: id })).lean();

      if (!note) {
        return NextResponse.json({ 
          success: false, 
          message: "Consignment note not found" 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        data: note 
      }, { status: 200 });
    }

    // ============ CASE 2: GET SINGLE BY LR NUMBER ============
    if (lrNo) {
      const note = await ConsignmentNote.findOne(companyScopeFilter(user, { lrNo })).lean();

      if (!note) {
        return NextResponse.json({ 
          success: false, 
          message: "Consignment note not found" 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        data: note 
      }, { status: 200 });
    }

    // ============ CASE 3: TABLE FORMAT FOR LIST VIEW ============
    if (format === 'table') {
      let query = {};

      // Search filter
      if (search) {
        query.$or = [
          { lrNo: { $regex: search, $options: 'i' } },
          { loadingInfoNo: { $regex: search, $options: 'i' } },
          { vnnNo: { $regex: search, $options: 'i' } },
          { subCompanyName: { $regex: search, $options: 'i' } },
          { subCompanyCode: { $regex: search, $options: 'i' } },
          { 'header.partyName': { $regex: search, $options: 'i' } },
          { 'header.orderNo': { $regex: search, $options: 'i' } },
          { 'header.vendorName': { $regex: search, $options: 'i' } },
          { 'header.vehicleNo': { $regex: search, $options: 'i' } }
        ];
      }

      // Status filter
      if (statusFilter) {
        query['header.status'] = statusFilter;
      }

      // Date range filter
      if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) {
          query.createdAt.$gte = new Date(fromDate);
        }
        if (toDate) {
          query.createdAt.$lte = new Date(toDate + 'T23:59:59');
        }
      }

      const notes = await ConsignmentNote.find(companyScopeFilter(user, query))
        .sort({ createdAt: -1 })
        .lean();

      const tableData = notes.map(note => ({
        _id: note._id,
        date: note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-GB').replace(/\//g, '.') : '',
        lrNo: note.lrNo || 'N/A',
        loadingInfoNo: note.loadingInfoNo || '',
        vnnNo: note.vnnNo || '',
        subCompanyName: note.subCompanyName || '',
        subCompanyCode: note.subCompanyCode || '',
        partyName: note.header?.partyName || 'N/A',
        orderNo: note.header?.orderNo || 'N/A',
        vendorName: note.header?.vendorName || 'N/A',
        vendorCode: note.header?.vendorCode || 'N/A',
        from: note.header?.from || 'N/A',
        to: note.header?.to || 'N/A',
        vehicleNo: note.header?.vehicleNo || 'N/A',
        totalWeight: note.totalWeight || 0,
        unit: note.header?.unit || 'MT',
        status: note.header?.status || 'Pending'
      }));

      return NextResponse.json({
        success: true,
        data: tableData,
        count: tableData.length
      }, { status: 200 });
    }

    // ============ CASE 4: LIST FOR DROPDOWNS ============
    const notes = await ConsignmentNote.find(companyScopeFilter(user))
    .select('lrNo loadingInfoNo vnnNo subCompanyName subCompanyCode header.partyName header.orderNo header.status')
    .sort({ createdAt: -1 })
    .lean();

    return NextResponse.json({
      success: true,
      data: notes
    }, { status: 200 });

  } catch (error) {
    console.error("❌ GET /consignment-note error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to fetch consignment notes"
    }, { status: 500 });
  }
}

/* ========================================
   POST /api/consignment-note - Requires 'create' permission
======================================== */
export async function POST(req) {
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req, 'create');
    if (error) {
      return NextResponse.json({ 
        success: false, 
        message: error,
        code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
      }, { status });
    }

    const body = await req.json();
    
    console.log("📝 Creating new consignment note");

    // Generate LR number if not provided
    let lrNo = body.header?.lrNo || await getNextLRNumber(user.companyId);

    // Check if loadingInfoNo is already used (if provided)
    if (body.loadingInfoNo) {
      const existing = await ConsignmentNote.findOne(companyScopeFilter(user, { loadingInfoNo: body.loadingInfoNo }));
      
      if (existing) {
        return NextResponse.json({ 
          success: false, 
          message: `Loading Info ${body.loadingInfoNo} is already used in consignment note ${existing.lrNo}` 
        }, { status: 400 });
      }
    }

    // ✅ Get sub-company from body
    const subCompanyId = user.activeOperatingCompanyId;
    const subCompanyName = user.activeOperatingCompanyName || '';
    const subCompanyCode = user.activeOperatingCompanyCode || '';

    // Process pack data from frontend structure
    const packData = {
      PALLETIZATION: (body.packData?.PALLETIZATION || []).map(row => ({
        _id: row._id,
        packType: "PALLETIZATION",
        noOfPallets: row.noOfPallets || '',
        unitPerPallets: row.unitPerPallets || '',
        totalPkgs: row.totalPkgs || '',
        pkgsType: row.pkgsType || '',
        uom: row.uom || 'MT',
        skuSize: row.skuSize || '',
        packWeight: row.packWeight || '',
        productName: row.productName || '',
        wtLtr: row.wtLtr || '',
        actualWt: row.actualWt || '',
        chargedWt: row.chargedWt || '',
        wtUom: row.wtUom || 'MT'
      })),
      'UNIFORM - BAGS/BOXES': (body.packData?.['UNIFORM - BAGS/BOXES'] || []).map(row => ({
        _id: row._id,
        packType: "UNIFORM - BAGS/BOXES",
        totalPkgs: row.totalPkgs || '',
        pkgsType: row.pkgsType || '',
        uom: row.uom || '',
        skuSize: row.skuSize || '',
        packWeight: row.packWeight || '',
        productName: row.productName || '',
        wtLtr: row.wtLtr || '',
        actualWt: row.actualWt || '',
        chargedWt: row.chargedWt || '',
        wtUom: row.wtUom || 'MT'
      })),
      'LOOSE - CARGO': (body.packData?.['LOOSE - CARGO'] || []).map(row => ({
        _id: row._id,
        packType: "LOOSE - CARGO",
        uom: row.uom || 'MT',
        productName: row.productName || '',
        actualWt: row.actualWt || '',
        chargedWt: row.chargedWt || ''
      })),
      'NON-UNIFORM - GENERAL CARGO': (body.packData?.['NON-UNIFORM - GENERAL CARGO'] || []).map(row => ({
        _id: row._id,
        packType: "NON-UNIFORM - GENERAL CARGO",
        nos: row.nos || '',
        productName: row.productName || '',
        uom: row.uom || 'MT',
        length: row.length || '',
        width: row.width || '',
        height: row.height || '',
        actualWt: row.actualWt || '',
        chargedWt: row.chargedWt || ''
      }))
    };

    // Create consignment note with sub-company
    const consignmentNote = new ConsignmentNote({
      lrNo,
      vnnNo: body.vnnNo || '',
      vehicleNegotiationRef: body.vehicleNegotiationRef || null,
      loadingInfoNo: body.loadingInfoNo || '',
      
      // ✅ Sub-Company at root level
      subCompanyId,
      subCompanyName,
      subCompanyCode,
      
      // LC Status
      lcStatus: body.lcStatus || body.header?.lcStatus || 'Not LC',
      lrType: body.lrType || body.header?.lrType || 'Normal',
      vehicleReach: body.vehicleReach || body.header?.vehicleReach || 'Not Reach',
      verification: body.verification || body.header?.verification || 'Not Verified',
      vehicleUnloadedDate: body.vehicleUnloadedDate || body.header?.vehicleUnloadedDate || '',
      remarks: body.remarks || body.header?.remarks || '',
      
      header: {
        orderNo: body.header?.orderNo || '',
        partyName: body.header?.partyName || '',
        orderType: body.header?.orderType || 'Sales',
        plantCode: body.header?.plantCode || '',
        plantName: body.header?.plantName || '',
        hiredOwned: body.header?.hiredOwned || 'Hired',
        vendorCode: body.header?.vendorCode || '',
        vendorName: body.header?.vendorName || '',
        from: body.header?.from || '',
        fromState: body.header?.fromState || '',
        to: body.header?.to || '',
        taluka: body.header?.taluka || '',
        district: body.header?.district || '',
        state: body.header?.state || '',
        vehicleNo: body.header?.vehicleNo || '',
        partyNo: body.header?.partyNo || '',
        lrNo: body.header?.lrNo || lrNo,
        lrDate: body.header?.lrDate || '',
        unit: body.header?.unit || 'MT',
        status: body.header?.status || 'Pending',
        lcStatus: body.lcStatus || body.header?.lcStatus || 'Not LC',
        lrType: body.lrType || body.header?.lrType || 'Normal',
        vehicleReach: body.vehicleReach || body.header?.vehicleReach || 'Not Reach',
        verification: body.verification || body.header?.verification || 'Not Verified',
        vehicleUnloadedDate: body.vehicleUnloadedDate || body.header?.vehicleUnloadedDate || '',
        remarks: body.remarks || body.header?.remarks || '',
        subCompanyId: subCompanyId,
        subCompanyName: subCompanyName,
        subCompanyCode: subCompanyCode
      },
      consignor: {
        name: body.consignor?.name || '',
        address: body.consignor?.address || '',
        customerId: body.consignor?.customerId || '',
        selectedAddressTitle: body.consignor?.selectedAddressTitle || ''
      },
      consignee: {
        name: body.consignee?.name || '',
        address: body.consignee?.address || '',
        customerId: body.consignee?.customerId || '',
        selectedAddressTitle: body.consignee?.selectedAddressTitle || ''
      },
      invoice: {
        boeInvoice: body.invoice?.boeInvoice || 'As Per Invoice',
        boeInvoiceNo: body.invoice?.boeInvoiceNo || '',
        boeInvoiceDate: body.invoice?.boeInvoiceDate || '',
        invoiceValue: body.invoice?.invoiceValue || ''
      },
      ewaybill: {
        ewaybillNo: body.ewaybill?.ewaybillNo || '',
        expiryDate: body.ewaybill?.expiryDate || '',
        containerNo: body.ewaybill?.containerNo || ''
      },
      packData: packData,
      companyId: user.companyId,
      createdBy: user.id
    });

    await consignmentNote.save();

    return NextResponse.json({ 
      success: true, 
      message: "Consignment note created successfully",
      data: {
        _id: consignmentNote._id,
        lrNo: consignmentNote.lrNo,
        loadingInfoNo: consignmentNote.loadingInfoNo,
        subCompanyName: consignmentNote.subCompanyName
      }
    }, { status: 201 });

  } catch (error) {
    console.error("❌ POST /consignment-note error:", error);

    if (error.code === 11000) {
      return NextResponse.json({ 
        success: false, 
        message: "LR number already exists" 
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
      message: error.message || "Failed to create consignment note"
    }, { status: 500 });
  }
}

/* ========================================
   PUT /api/consignment-note - Requires 'edit' permission
======================================== */
export async function PUT(req) {
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req, 'edit');
    if (error) {
      return NextResponse.json({ 
        success: false, 
        message: error,
        code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
      }, { status });
    }

    const body = await req.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: "Consignment note ID is required" 
      }, { status: 400 });
    }

    if (!isValidObjectId(id)) {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid consignment note ID format" 
      }, { status: 400 });
    }

    const note = await ConsignmentNote.findOne(companyScopeFilter(user, { _id: id }));

    if (!note) {
      return NextResponse.json({ 
        success: false, 
        message: "Consignment note not found" 
      }, { status: 404 });
    }

    // Check if loadingInfoNo is being changed and if new one is already used
    if (body.loadingInfoNo && body.loadingInfoNo !== note.loadingInfoNo) {
      const existing = await ConsignmentNote.findOne(companyScopeFilter(user, {
        loadingInfoNo: body.loadingInfoNo,
        _id: { $ne: id },
      }));
      
      if (existing) {
        return NextResponse.json({ 
          success: false, 
          message: `Loading Info ${body.loadingInfoNo} is already used in consignment note ${existing.lrNo}` 
        }, { status: 400 });
      }
    }

    // ✅ Update sub-company
    note.subCompanyId = user.activeOperatingCompanyId;
    note.subCompanyName = user.activeOperatingCompanyName || '';
    note.subCompanyCode = user.activeOperatingCompanyCode || '';

    // Update reference fields
    if (body.vnnNo !== undefined) note.vnnNo = body.vnnNo;
    if (body.vehicleNegotiationRef !== undefined) note.vehicleNegotiationRef = body.vehicleNegotiationRef;
    if (body.loadingInfoNo !== undefined) note.loadingInfoNo = body.loadingInfoNo;

    // Update LC/LR/Vehicle fields
    if (body.lcStatus !== undefined) note.lcStatus = body.lcStatus;
    if (body.lrType !== undefined) note.lrType = body.lrType;
    if (body.vehicleReach !== undefined) note.vehicleReach = body.vehicleReach;
    if (body.verification !== undefined) note.verification = body.verification;
    if (body.vehicleUnloadedDate !== undefined) note.vehicleUnloadedDate = body.vehicleUnloadedDate;
    if (body.remarks !== undefined) note.remarks = body.remarks;

    // Update header with sub-company
    if (body.header) {
      note.header = {
        ...note.header,
        ...body.header,
        subCompanyId: user.activeOperatingCompanyId,
        subCompanyName: user.activeOperatingCompanyName || '',
        subCompanyCode: user.activeOperatingCompanyCode || ''
      };
    }

    // Update consignor
    if (body.consignor) {
      note.consignor = {
        ...note.consignor,
        ...body.consignor
      };
    }

    // Update consignee
    if (body.consignee) {
      note.consignee = {
        ...note.consignee,
        ...body.consignee
      };
    }

    // Update invoice
    if (body.invoice) {
      note.invoice = {
        ...note.invoice,
        ...body.invoice
      };
    }

    // Update ewaybill
    if (body.ewaybill) {
      note.ewaybill = {
        ...note.ewaybill,
        ...body.ewaybill
      };
    }

    // Update pack data
    if (body.packData) {
      note.packData = {
        PALLETIZATION: (body.packData.PALLETIZATION || []).map(row => ({
          _id: row._id,
          packType: "PALLETIZATION",
          noOfPallets: row.noOfPallets || '',
          unitPerPallets: row.unitPerPallets || '',
          totalPkgs: row.totalPkgs || '',
          pkgsType: row.pkgsType || '',
          uom: row.uom || 'MT',
          skuSize: row.skuSize || '',
          packWeight: row.packWeight || '',
          productName: row.productName || '',
          wtLtr: row.wtLtr || '',
          actualWt: row.actualWt || '',
          chargedWt: row.chargedWt || '',
          wtUom: row.wtUom || 'MT'
        })),
        'UNIFORM - BAGS/BOXES': (body.packData['UNIFORM - BAGS/BOXES'] || []).map(row => ({
          _id: row._id,
          packType: "UNIFORM - BAGS/BOXES",
          totalPkgs: row.totalPkgs || '',
          pkgsType: row.pkgsType || '',
          uom: row.uom || '',
          skuSize: row.skuSize || '',
          packWeight: row.packWeight || '',
          productName: row.productName || '',
          wtLtr: row.wtLtr || '',
          actualWt: row.actualWt || '',
          chargedWt: row.chargedWt || '',
          wtUom: row.wtUom || 'MT'
        })),
        'LOOSE - CARGO': (body.packData['LOOSE - CARGO'] || []).map(row => ({
          _id: row._id,
          packType: "LOOSE - CARGO",
          uom: row.uom || 'MT',
          productName: row.productName || '',
          actualWt: row.actualWt || '',
          chargedWt: row.chargedWt || ''
        })),
        'NON-UNIFORM - GENERAL CARGO': (body.packData['NON-UNIFORM - GENERAL CARGO'] || []).map(row => ({
          _id: row._id,
          packType: "NON-UNIFORM - GENERAL CARGO",
          nos: row.nos || '',
          productName: row.productName || '',
          uom: row.uom || 'MT',
          length: row.length || '',
          width: row.width || '',
          height: row.height || '',
          actualWt: row.actualWt || '',
          chargedWt: row.chargedWt || ''
        }))
      };
    }

    note.updatedAt = Date.now();
    await note.save();

    return NextResponse.json({ 
      success: true, 
      message: "Consignment note updated successfully",
      data: {
        _id: note._id,
        lrNo: note.lrNo,
        loadingInfoNo: note.loadingInfoNo,
        subCompanyName: note.subCompanyName
      }
    }, { status: 200 });

  } catch (error) {
    console.error("❌ PUT /consignment-note error:", error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json({ 
        success: false, 
        message: messages.join(', ') 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to update consignment note"
    }, { status: 500 });
  }
}

/* ========================================
   DELETE /api/consignment-note - Requires 'delete' permission
======================================== */
export async function DELETE(req) {
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req, 'delete');
    if (error) {
      return NextResponse.json({ 
        success: false, 
        message: error,
        code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
      }, { status });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: "Consignment note ID is required" 
      }, { status: 400 });
    }

    if (!isValidObjectId(id)) {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid consignment note ID format" 
      }, { status: 400 });
    }

    // Find the note first to check if it exists
    const note = await ConsignmentNote.findOne(companyScopeFilter(user, { _id: id }));

    if (!note) {
      return NextResponse.json({ 
        success: false, 
        message: "Consignment note not found" 
      }, { status: 404 });
    }

    // Don't delete approved/completed notes
    if (note.header?.status === 'Approved' || note.header?.status === 'Completed') {
      return NextResponse.json({ 
        success: false, 
        message: `Cannot delete ${note.header.status} consignment note` 
      }, { status: 400 });
    }

    // Delete the note
    await ConsignmentNote.deleteOne(companyScopeFilter(user, { _id: id }));

    console.log(`✅ Consignment note deleted: ${note.lrNo}`);

    return NextResponse.json({ 
      success: true, 
      message: "Consignment note deleted successfully",
      data: {
        lrNo: note.lrNo,
        loadingInfoNo: note.loadingInfoNo
      }
    }, { status: 200 });

  } catch (error) {
    console.error("❌ DELETE /consignment-note error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to delete consignment note"
    }, { status: 500 });
  }
}

/* ========================================
   PATCH /api/consignment-note - Requires 'approve' permission
   Handles: approve, reject, complete
======================================== */
export async function PATCH(req) {
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req, 'approve');
    if (error) {
      return NextResponse.json({ 
        success: false, 
        message: error,
        code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
      }, { status });
    }

    const body = await req.json();
    const { id, action } = body;
    
    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ 
        success: false, 
        message: "Valid ID is required" 
      }, { status: 400 });
    }

    console.log(`📝 Updating consignment note status: ${id} - ${action}`);
    
    const note = await ConsignmentNote.findOne(companyScopeFilter(user, { _id: id }));

    if (!note) {
      return NextResponse.json({ 
        success: false, 
        message: "Consignment note not found" 
      }, { status: 404 });
    }

    const allowedActions = ['approve', 'reject', 'complete'];
    if (!allowedActions.includes(action)) {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid action. Allowed: approve, reject, complete" 
      }, { status: 400 });
    }

    const statusMap = {
      'approve': 'Approved',
      'reject': 'Rejected',
      'complete': 'Completed'
    };

    // Update status
    note.header.status = statusMap[action];
    note.updatedAt = Date.now();
    
    await note.save();

    return NextResponse.json({ 
      success: true, 
      message: `Consignment note ${action}d successfully`,
      data: {
        _id: note._id,
        lrNo: note.lrNo,
        status: note.header.status
      }
    }, { status: 200 });

  } catch (error) {
    console.error("❌ PATCH /consignment-note error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to update consignment note status"
    }, { status: 500 });
  }
}
