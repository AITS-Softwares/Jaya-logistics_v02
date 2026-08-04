

// // app/api/order-panel/route.js
// import { NextResponse } from "next/server";
// import connectDb from "@/lib/db";
// import OrderPanel from "./OrderPanel";
// import mongoose from 'mongoose';
// import { withAuth, hasPermission } from "@/lib/auth";
// import { getNextOrderPanelNumber } from "./OrderCounter";

// // ── HELPER FUNCTIONS ──

// function num(value) {
//   if (value === null || value === undefined || value === '') return 0;
//   const n = Number(value);
//   return Number.isFinite(n) ? n : 0;
// }

// function calculatePendingDays(orderDate, status) {
//   if (!orderDate || status === 'Completed' || status === 'Cancelled' || status === 'Draft') return '0 Days';
  
//   const created = new Date(orderDate);
//   const now = new Date();
//   const diffTime = Math.abs(now - created);
//   const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
//   return `${diffDays} Days`;
// }

// // ── GET: Requires 'view' permission ──
// export const GET = withAuth(async (req, context, user) => {
//   await connectDb();

//   try {
//     const url = new URL(req.url);
//     const id = url.searchParams.get("id");
//     const isTable = url.searchParams.get("table") === "true";
    
//     // CASE 1: Get single order with full details
//     if (id) {
//       if (!mongoose.Types.ObjectId.isValid(id)) {
//         return NextResponse.json({ 
//           success: false, 
//           message: "Invalid order panel ID format" 
//         }, { status: 400 });
//       }
      
//       const orderPanel = await OrderPanel.findOne({
//         _id: id,
//         companyId: user.companyId
//       }).lean();

//       if (!orderPanel) {
//         return NextResponse.json({ 
//           success: false, 
//           message: "Order panel not found" 
//         }, { status: 404 });
//       }

//       const formattedOrder = {
//         _id: orderPanel._id,
//         orderPanelNo: orderPanel.orderPanelNo || 'N/A',
//         date: orderPanel.date ? new Date(orderPanel.date).toISOString() : '',
//         branchName: orderPanel.branchName || 'N/A',
//         branchCode: orderPanel.branchCode || '',
//         customerName: orderPanel.customerName || 'N/A',
//         partyName: orderPanel.partyName || orderPanel.customerName || 'N/A',
//         totalWeight: orderPanel.totalWeight || 0,
//         panelStatus: orderPanel.panelStatus || 'Draft',
//         delivery: orderPanel.delivery || 'Normal',
//         plantRows: orderPanel.plantRows || [],
//         collectionCharges: orderPanel.collectionCharges || 0,
//         cancellationCharges: orderPanel.cancellationCharges || 'Nil',
//         loadingCharges: orderPanel.loadingCharges || 'Nil',
//         otherCharges: orderPanel.otherCharges || 0,
//         customerId: orderPanel.customerId,
//         customerCode: orderPanel.customerCode || '',
//         contactPerson: orderPanel.contactPerson || '',
//         branch: orderPanel.branch,
//         packData: orderPanel.packData || {}
//       };

//       return NextResponse.json({ 
//         success: true, 
//         data: formattedOrder 
//       }, { status: 200 });
//     }
    
//     // CASE 2: Get flattened data for table view
//     if (isTable) {
//       let query = { companyId: user.companyId };
      
//       const orderPanels = await OrderPanel.find(query)
//         .sort({ createdAt: -1 })
//         .select('orderPanelNo date branchName branchCode customerName partyName totalWeight panelStatus createdAt plantRows delivery collectionCharges cancellationCharges loadingCharges otherCharges')
//         .lean();

//       const flattenedRows = [];
      
//       orderPanels.forEach(order => {
//         if (order.plantRows && order.plantRows.length > 0) {
//           order.plantRows.forEach((row, index) => {
//             flattenedRows.push({
//               _id: `${order._id}-${index}`,
//               originalOrderId: order._id,
//               originalRowId: row._id,
//               date: order.date ? new Date(order.date).toISOString().split('T')[0] : '',
//               orderNo: order.orderPanelNo || 'N/A',
//               branchName: order.branchName || 'N/A',
//               branchCode: order.branchCode || '',
//               partyName: order.partyName || order.customerName || 'N/A',
//               customerName: order.customerName || 'N/A',
//               plantCode: row.plantCodeValue || row.plantCode || 'N/A',
//               plantName: row.plantName || '',
//               orderType: row.orderType || 'Sales',
//               pinCode: row.pinCode || '',
//               from: row.fromName || row.from || '',
//               to: row.toName || row.to || '',
//               taluka: row.talukaName || row.taluka || '',
//               district: row.districtName || row.district || '',
//               state: row.stateName || row.state || '',
//               country: row.countryName || row.country || '',
//               weight: row.weight || 0,
//               status: row.status || 'Open',
//               delivery: order.delivery || 'Normal',
//               panelStatus: order.panelStatus || 'Draft',
//               collectionCharges: order.collectionCharges || 0,
//               cancellationCharges: order.cancellationCharges || 'Nil',
//               loadingCharges: order.loadingCharges || 'Nil',
//               otherCharges: order.otherCharges || 0,
//               pendingSince: calculatePendingDays(order.date, row.status),
//               placement: 'Pending'
//             });
//           });
//         } else {
//           flattenedRows.push({
//             _id: order._id,
//             originalOrderId: order._id,
//             date: order.date ? new Date(order.date).toISOString().split('T')[0] : '',
//             orderNo: order.orderPanelNo || 'N/A',
//             branchName: order.branchName || 'N/A',
//             branchCode: order.branchCode || '',
//             partyName: order.partyName || order.customerName || 'N/A',
//             customerName: order.customerName || 'N/A',
//             plantCode: 'N/A',
//             plantName: 'N/A',
//             orderType: 'Sales',
//             pinCode: 'N/A',
//             from: 'N/A',
//             to: 'N/A',
//             district: 'N/A',
//             state: 'N/A',
//             country: 'N/A',
//             weight: order.totalWeight || 0,
//             status: order.panelStatus || 'Draft',
//             delivery: order.delivery || 'Normal',
//             panelStatus: order.panelStatus || 'Draft',
//             collectionCharges: order.collectionCharges || 0,
//             cancellationCharges: order.cancellationCharges || 'Nil',
//             loadingCharges: order.loadingCharges || 'Nil',
//             otherCharges: order.otherCharges || 0,
//             pendingSince: calculatePendingDays(order.date, order.panelStatus),
//             placement: 'Pending'
//           });
//         }
//       });

//       return NextResponse.json({
//         success: true,
//         data: flattenedRows
//       }, { status: 200 });
//     }
    
//     // CASE 3: Get list of orders (summary only)
//     let query = { companyId: user.companyId };
    
//     const orderPanels = await OrderPanel.find(query)
//       .sort({ createdAt: -1 })
//       .select('orderPanelNo date branchName branchCode customerName partyName totalWeight panelStatus createdAt plantRows delivery')
//       .lean();

//     const formattedOrders = orderPanels.map(order => ({
//       _id: order._id,
//       orderPanelNo: order.orderPanelNo || 'N/A',
//       date: order.date ? new Date(order.date).toISOString().split('T')[0] : '',
//       branch: order.branchName || 'N/A',
//       branchCode: order.branchCode || '',
//       customerName: order.customerName || 'N/A',
//       partyName: order.partyName || order.customerName || 'N/A',
//       totalWeight: order.totalWeight || 0,
//       panelStatus: order.panelStatus || 'Draft',
//       createdAt: order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : ''
//     }));

//     return NextResponse.json({
//       success: true,
//       data: formattedOrders
//     }, { status: 200 });

//   } catch (error) {
//     console.error("GET /order-panel error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: "Failed to fetch order panels",
//       error: error.message 
//     }, { status: 500 });
//   }
// }, { module: 'Order Panel', action: 'view' });

// // ── POST: Requires 'create' permission ──
// export const POST = withAuth(async (req, context, user) => {
//   await connectDb();

//   try {
//     const body = await req.json();
    
//     let orderPanelNo = await getNextOrderPanelNumber(user.companyId);
    
//     const existingOrderPanel = await OrderPanel.findOne({ 
//       orderPanelNo, 
//       companyId: user.companyId 
//     });
    
//     if (existingOrderPanel) {
//       orderPanelNo = `OP-${Date.now().toString().slice(-6)}`;
//     }

//     let branchName = '';
//     let branchCode = '';
//     if (body.branchName) {
//       branchName = body.branchName;
//       branchCode = body.branchCode || '';
//     }

//     const processedPlantRows = (body.plantRows || []).map((row) => {
//       const weight = num(row.weight);
//       const rate = num(row.rate);
      
//       let fromField = null;
//       if (row.from && mongoose.Types.ObjectId.isValid(row.from)) {
//         fromField = new mongoose.Types.ObjectId(row.from);
//       }
      
//       let toField = null;
//       if (row.to && mongoose.Types.ObjectId.isValid(row.to)) {
//         toField = new mongoose.Types.ObjectId(row.to);
//       }
      
//       return {
//         _id: new mongoose.Types.ObjectId(),
//         plantCode: row.plantCode || '',
//         plantName: row.plantName || '',
//         plantCodeValue: row.plantCodeValue || '',
//         orderType: row.orderType || "Sales",
//         pinCode: row.pinCode || "",
//         from: fromField,
//         fromName: row.fromName || '',
//         to: toField,
//         toName: row.toName || '',
//         taluka: row.taluka || "",
//         talukaName: row.talukaName || row.taluka || '',
//         district: row.district || "",
//         districtName: row.districtName || row.district || '',
//         state: row.state || "",
//         stateName: row.stateName || row.state || '',
//         country: row.country || "",
//         countryName: row.countryName || row.country || '',
//         weight,
//         status: row.status || "Open",
//         rate: rate,
//         locationRate: num(row.locationRate),
//         totalAmount: weight * rate,
//         collectionCharges: num(row.collectionCharges) || 0,
//         cancellationCharges: row.cancellationCharges || 'Nil',
//         loadingCharges: row.loadingCharges || 'Nil',
//         otherCharges: num(row.otherCharges) || 0
//       };
//     });
    
//     const totalWeight = processedPlantRows.reduce((sum, row) => sum + row.weight, 0);
//     const totalAmount = processedPlantRows.reduce((sum, row) => sum + row.totalAmount, 0);

//     let customerId = null;
//     if (body.customerId && body.customerId.trim() !== '') {
//       if (mongoose.Types.ObjectId.isValid(body.customerId)) {
//         customerId = new mongoose.Types.ObjectId(body.customerId);
//       } else {
//         customerId = body.customerId;
//       }
//     }

//     // Process packData
//     const processPackData = (packData) => {
//       const result = {
//         PALLETIZATION: [],
//         'UNIFORM - BAGS/BOXES': [],
//         'LOOSE - CARGO': [],
//         'NON-UNIFORM - GENERAL CARGO': []
//       };

//       if (!packData) return result;

//       if (packData.PALLETIZATION && Array.isArray(packData.PALLETIZATION)) {
//         result.PALLETIZATION = packData.PALLETIZATION.map(item => ({
//           _id: new mongoose.Types.ObjectId(),
//           noOfPallets: num(item.noOfPallets),
//           unitPerPallets: num(item.unitPerPallets),
//           totalPkgs: num(item.totalPkgs),
//           pkgsType: item.pkgsType || '',
//           uom: item.uom || '',
//           skuSize: item.skuSize || '',
//           packWeight: num(item.packWeight),
//           productName: item.productName || '',
//           wtLtr: num(item.wtLtr),
//           actualWt: num(item.actualWt),
//           chargedWt: num(item.chargedWt),
//           wtUom: item.wtUom || ''
//         }));
//       }

//       if (packData['UNIFORM - BAGS/BOXES'] && Array.isArray(packData['UNIFORM - BAGS/BOXES'])) {
//         result['UNIFORM - BAGS/BOXES'] = packData['UNIFORM - BAGS/BOXES'].map(item => ({
//           _id: new mongoose.Types.ObjectId(),
//           totalPkgs: num(item.totalPkgs),
//           pkgsType: item.pkgsType || '',
//           uom: item.uom || '',
//           skuSize: item.skuSize || '',
//           packWeight: num(item.packWeight),
//           productName: item.productName || '',
//           wtLtr: num(item.wtLtr),
//           actualWt: num(item.actualWt),
//           chargedWt: num(item.chargedWt),
//           wtUom: item.wtUom || ''
//         }));
//       }

//       if (packData['LOOSE - CARGO'] && Array.isArray(packData['LOOSE - CARGO'])) {
//         result['LOOSE - CARGO'] = packData['LOOSE - CARGO'].map(item => ({
//           _id: new mongoose.Types.ObjectId(),
//           uom: item.uom || '',
//           productName: item.productName || '',
//           actualWt: num(item.actualWt),
//           chargedWt: num(item.chargedWt)
//         }));
//       }

//       if (packData['NON-UNIFORM - GENERAL CARGO'] && Array.isArray(packData['NON-UNIFORM - GENERAL CARGO'])) {
//         result['NON-UNIFORM - GENERAL CARGO'] = packData['NON-UNIFORM - GENERAL CARGO'].map(item => ({
//           _id: new mongoose.Types.ObjectId(),
//           nos: num(item.nos),
//           productName: item.productName || '',
//           uom: item.uom || 'MT',
//           length: num(item.length),
//           width: num(item.width),
//           height: num(item.height),
//           actualWt: num(item.actualWt),
//           chargedWt: num(item.chargedWt)
//         }));
//       }

//       return result;
//     };

//     const orderPanelData = {
//       orderPanelNo,
//       branch: body.branch || null,
//       branchName: branchName || body.branchName || '',
//       branchCode: branchCode || body.branchCode || '',
//       delivery: body.delivery || 'Normal',
//       date: body.date ? new Date(body.date) : new Date(),
//       customerId,
//       customerCode: body.customerCode || '',
//       customerName: body.customerName || '',
//       contactPerson: body.contactPerson || '',
//       partyName: body.partyName || '',
//       collectionCharges: num(body.collectionCharges),
//       cancellationCharges: body.cancellationCharges || 'Nil',
//       loadingCharges: body.loadingCharges || 'Nil',
//       otherCharges: num(body.otherCharges),
//       plantRows: processedPlantRows,
//       packData: processPackData(body.packData),
//       totalWeight,
//       totalAmount,
//       companyId: new mongoose.Types.ObjectId(user.companyId),
//       createdBy: new mongoose.Types.ObjectId(user.id),
//       panelStatus: 'Draft'
//     };

//     const newOrderPanel = new OrderPanel(orderPanelData);
//     const savedOrderPanel = await newOrderPanel.save();

//     return NextResponse.json({ 
//       success: true, 
//       message: "Order panel created successfully",
//       data: {
//         _id: savedOrderPanel._id,
//         orderPanelNo: savedOrderPanel.orderPanelNo
//       }
//     }, { status: 201 });

//   } catch (error) {
//     console.error("POST /order-panel error:", error);
    
//     if (error.code === 11000) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Order panel number already exists. Please try again." 
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
//       message: `Failed to create order panel: ${error.message}` 
//     }, { status: 500 });
//   }
// }, { module: 'Order Panel', action: 'create' });

// // ── PUT: Requires 'edit' permission ──
// export const PUT = withAuth(async (req, context, user) => {
//   await connectDb();

//   try {
//     const body = await req.json();
//     const { id } = body;
    
//     if (!id) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Order panel ID is required" 
//       }, { status: 400 });
//     }

//     const orderPanel = await OrderPanel.findOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (!orderPanel) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Order panel not found" 
//       }, { status: 404 });
//     }

//     // Update fields
//     if (body.branchName) orderPanel.branchName = body.branchName;
//     if (body.branchCode) orderPanel.branchCode = body.branchCode;
//     if (body.delivery) orderPanel.delivery = body.delivery;
//     if (body.date) orderPanel.date = new Date(body.date);
//     if (body.customerName) orderPanel.customerName = body.customerName;
//     if (body.partyName) orderPanel.partyName = body.partyName;
//     if (body.collectionCharges !== undefined) orderPanel.collectionCharges = num(body.collectionCharges);
//     if (body.cancellationCharges !== undefined) orderPanel.cancellationCharges = body.cancellationCharges;
//     if (body.loadingCharges !== undefined) orderPanel.loadingCharges = body.loadingCharges;
//     if (body.otherCharges !== undefined) orderPanel.otherCharges = num(body.otherCharges);
//     if (body.panelStatus) orderPanel.panelStatus = body.panelStatus;

//     if (body.plantRows && Array.isArray(body.plantRows)) {
//       const processedPlantRows = body.plantRows.map((row) => {
//         const weight = num(row.weight);
//         const rate = num(row.rate);
        
//         let fromField = null;
//         if (row.from && mongoose.Types.ObjectId.isValid(row.from)) {
//           fromField = new mongoose.Types.ObjectId(row.from);
//         }
        
//         let toField = null;
//         if (row.to && mongoose.Types.ObjectId.isValid(row.to)) {
//           toField = new mongoose.Types.ObjectId(row.to);
//         }
        
//         return {
//           _id: row._id && mongoose.Types.ObjectId.isValid(row._id) ? new mongoose.Types.ObjectId(row._id) : new mongoose.Types.ObjectId(),
//           plantCode: row.plantCode || '',
//           plantName: row.plantName || '',
//           plantCodeValue: row.plantCodeValue || '',
//           orderType: row.orderType || "Sales",
//           pinCode: row.pinCode || "",
//           from: fromField,
//           fromName: row.fromName || '',
//           to: toField,
//           toName: row.toName || '',
//           taluka: row.taluka || "",
//           talukaName: row.talukaName || row.taluka || '',
//           district: row.district || "",
//           districtName: row.districtName || row.district || '',
//           state: row.state || "",
//           stateName: row.stateName || row.state || '',
//           country: row.country || "",
//           countryName: row.countryName || row.country || '',
//           weight,
//           status: row.status || "Open",
//           rate: rate,
//           locationRate: num(row.locationRate),
//           totalAmount: weight * rate,
//           collectionCharges: num(row.collectionCharges) || 0,
//           cancellationCharges: row.cancellationCharges || 'Nil',
//           loadingCharges: row.loadingCharges || 'Nil',
//           otherCharges: num(row.otherCharges) || 0
//         };
//       });
      
//       orderPanel.plantRows = processedPlantRows;
//       orderPanel.totalWeight = processedPlantRows.reduce((sum, row) => sum + row.weight, 0);
//       orderPanel.totalAmount = processedPlantRows.reduce((sum, row) => sum + row.totalAmount, 0);
//     }

//     // Update packData
//     if (body.packData) {
//       orderPanel.packData = {
//         PALLETIZATION: (body.packData.PALLETIZATION || []).map(item => ({
//           _id: item._id && mongoose.Types.ObjectId.isValid(item._id) ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId(),
//           noOfPallets: num(item.noOfPallets),
//           unitPerPallets: num(item.unitPerPallets),
//           totalPkgs: num(item.totalPkgs),
//           pkgsType: item.pkgsType || '',
//           uom: item.uom || '',
//           skuSize: item.skuSize || '',
//           packWeight: num(item.packWeight),
//           productName: item.productName || '',
//           wtLtr: num(item.wtLtr),
//           actualWt: num(item.actualWt),
//           chargedWt: num(item.chargedWt),
//           wtUom: item.wtUom || ''
//         })),
//         'UNIFORM - BAGS/BOXES': (body.packData['UNIFORM - BAGS/BOXES'] || []).map(item => ({
//           _id: item._id && mongoose.Types.ObjectId.isValid(item._id) ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId(),
//           totalPkgs: num(item.totalPkgs),
//           pkgsType: item.pkgsType || '',
//           uom: item.uom || '',
//           skuSize: item.skuSize || '',
//           packWeight: num(item.packWeight),
//           productName: item.productName || '',
//           wtLtr: num(item.wtLtr),
//           actualWt: num(item.actualWt),
//           chargedWt: num(item.chargedWt),
//           wtUom: item.wtUom || ''
//         })),
//         'LOOSE - CARGO': (body.packData['LOOSE - CARGO'] || []).map(item => ({
//           _id: item._id && mongoose.Types.ObjectId.isValid(item._id) ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId(),
//           uom: item.uom || '',
//           productName: item.productName || '',
//           actualWt: num(item.actualWt),
//           chargedWt: num(item.chargedWt)
//         })),
//         'NON-UNIFORM - GENERAL CARGO': (body.packData['NON-UNIFORM - GENERAL CARGO'] || []).map(item => ({
//           _id: item._id && mongoose.Types.ObjectId.isValid(item._id) ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId(),
//           nos: num(item.nos),
//           productName: item.productName || '',
//           uom: item.uom || 'MT',
//           length: num(item.length),
//           width: num(item.width),
//           height: num(item.height),
//           actualWt: num(item.actualWt),
//           chargedWt: num(item.chargedWt)
//         }))
//       };
//     }

//     await orderPanel.save();

//     return NextResponse.json({ 
//       success: true, 
//       message: "Order panel updated successfully",
//       data: {
//         _id: orderPanel._id,
//         orderPanelNo: orderPanel.orderPanelNo
//       }
//     }, { status: 200 });

//   } catch (error) {
//     console.error("PUT /order-panel error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: `Failed to update order panel: ${error.message}` 
//     }, { status: 500 });
//   }
// }, { module: 'Order Panel', action: 'edit' });

// // ── DELETE: Requires 'delete' permission ──
// export const DELETE = withAuth(async (req, context, user) => {
//   await connectDb();

//   try {
//     const url = new URL(req.url);
//     const id = url.searchParams.get("id");
    
//     if (!id) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Order panel ID is required" 
//       }, { status: 400 });
//     }

//     const result = await OrderPanel.deleteOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (result.deletedCount === 0) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Order panel not found" 
//       }, { status: 404 });
//     }

//     return NextResponse.json({ 
//       success: true, 
//       message: "Order panel deleted successfully" 
//     }, { status: 200 });

//   } catch (error) {
//     console.error("DELETE /order-panel error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: `Failed to delete order panel: ${error.message}` 
//     }, { status: 500 });
//   }
// }, { module: 'Order Panel', action: 'delete' });

// // ── PATCH: Requires 'approve' permission ──
// export const PATCH = withAuth(async (req, context, user) => {
//   await connectDb();

//   try {
//     const body = await req.json();
//     const { id, action } = body;
    
//     if (!id) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Order panel ID is required" 
//       }, { status: 400 });
//     }

//     const orderPanel = await OrderPanel.findOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (!orderPanel) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Order panel not found" 
//       }, { status: 404 });
//     }

//     // Check if action is allowed
//     if (action === 'approve') {
//       orderPanel.panelStatus = 'Approved';
//       orderPanel.approvedBy = user.id;
//       orderPanel.approvedAt = new Date();
//       orderPanel.approvalRemarks = body.remarks || 'Approved via quick action';
//     } else if (action === 'reject') {
//       orderPanel.panelStatus = 'Rejected';
//       orderPanel.approvedBy = user.id;
//       orderPanel.approvedAt = new Date();
//       orderPanel.approvalRemarks = body.remarks || 'Rejected via quick action';
//     } else if (action === 'complete') {
//       orderPanel.panelStatus = 'Completed';
//     } else {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Invalid action. Allowed: approve, reject, complete" 
//       }, { status: 400 });
//     }

//     await orderPanel.save();

//     return NextResponse.json({ 
//       success: true, 
//       message: `Order ${action}d successfully`,
//       data: {
//         _id: orderPanel._id,
//         orderPanelNo: orderPanel.orderPanelNo,
//         panelStatus: orderPanel.panelStatus
//       }
//     }, { status: 200 });

//   } catch (error) {
//     console.error("PATCH /order-panel error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: `Failed to update order status: ${error.message}` 
//     }, { status: 500 });
//   }
// }, { module: 'Order Panel', action: 'approve' });


// app/api/order-panel/route.js
import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import OrderPanel from "./OrderPanel";

import SubCompany from "../subcompanies/SubCompany";
import mongoose from 'mongoose';
import { withAuth, hasPermission } from "@/lib/auth";
import { getNextOrderPanelNumber } from "./OrderCounter";

// ── HELPER FUNCTIONS ──

function num(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function calculatePendingDays(orderDate, status) {
  if (!orderDate || status === 'Completed' || status === 'Cancelled' || status === 'Draft') return '0 Days';
  
  const created = new Date(orderDate);
  const now = new Date();
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return `${diffDays} Days`;
}

// ── GET: Requires 'view' permission ──
export const GET = withAuth(async (req, context, user) => {
  await connectDb();

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const isTable = url.searchParams.get("table") === "true";
    
    // CASE 1: Get single order with full details
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ 
          success: false, 
          message: "Invalid order panel ID format" 
        }, { status: 400 });
      }
      
      const orderPanel = await OrderPanel.findOne({
        _id: id,
        companyId: user.companyId
      }).lean();

      if (!orderPanel) {
        return NextResponse.json({ 
          success: false, 
          message: "Order panel not found" 
        }, { status: 404 });
      }

      const formattedOrder = {
        _id: orderPanel._id,
        orderPanelNo: orderPanel.orderPanelNo || 'N/A',
        date: orderPanel.date ? new Date(orderPanel.date).toISOString() : '',
        branchName: orderPanel.branchName || 'N/A',
        branchCode: orderPanel.branchCode || '',
        subCompanyName: orderPanel.subCompanyName || '',
        subCompanyCode: orderPanel.subCompanyCode || '',
        customerName: orderPanel.customerName || 'N/A',
        partyName: orderPanel.partyName || orderPanel.customerName || 'N/A',
        totalWeight: orderPanel.totalWeight || 0,
        panelStatus: orderPanel.panelStatus || 'Draft',
        delivery: orderPanel.delivery || 'Normal',
        plantRows: orderPanel.plantRows || [],
        collectionCharges: orderPanel.collectionCharges || 0,
        cancellationCharges: orderPanel.cancellationCharges || 'Nil',
        loadingCharges: orderPanel.loadingCharges || 'Nil',
        otherCharges: orderPanel.otherCharges || 0,
        customerId: orderPanel.customerId,
        customerCode: orderPanel.customerCode || '',
        contactPerson: orderPanel.contactPerson || '',
        branch: orderPanel.branch,
        packData: orderPanel.packData || {}
      };

      return NextResponse.json({ 
        success: true, 
        data: formattedOrder 
      }, { status: 200 });
    }
    
    // CASE 2: Get flattened data for table view
    if (isTable) {
      let query = { companyId: user.companyId };
      
      const orderPanels = await OrderPanel.find(query)
        .sort({ createdAt: -1 })
        .select('orderPanelNo date branchName branchCode subCompanyName subCompanyCode customerName partyName totalWeight panelStatus createdAt plantRows delivery collectionCharges cancellationCharges loadingCharges otherCharges')
        .lean();

      const flattenedRows = [];
      
      orderPanels.forEach(order => {
        if (order.plantRows && order.plantRows.length > 0) {
          order.plantRows.forEach((row, index) => {
            flattenedRows.push({
              _id: `${order._id}-${index}`,
              originalOrderId: order._id,
              originalRowId: row._id,
              date: order.date ? new Date(order.date).toISOString().split('T')[0] : '',
              orderNo: order.orderPanelNo || 'N/A',
              branchName: order.branchName || 'N/A',
              branchCode: order.branchCode || '',
              subCompanyName: order.subCompanyName || '',
              subCompanyCode: order.subCompanyCode || '',
              partyName: order.partyName || order.customerName || 'N/A',
              customerName: order.customerName || 'N/A',
              plantCode: row.plantCodeValue || row.plantCode || 'N/A',
              plantName: row.plantName || '',
              orderType: row.orderType || 'Sales',
              pinCode: row.pinCode || '',
              from: row.fromName || row.from || '',
              to: row.toName || row.to || '',
              taluka: row.talukaName || row.taluka || '',
              district: row.districtName || row.district || '',
              state: row.stateName || row.state || '',
              country: row.countryName || row.country || '',
              weight: row.weight || 0,
              status: row.status || 'Open',
              delivery: order.delivery || 'Normal',
              panelStatus: order.panelStatus || 'Draft',
              collectionCharges: order.collectionCharges || 0,
              cancellationCharges: order.cancellationCharges || 'Nil',
              loadingCharges: order.loadingCharges || 'Nil',
              otherCharges: order.otherCharges || 0,
              pendingSince: calculatePendingDays(order.date, row.status),
              placement: 'Pending'
            });
          });
        } else {
          flattenedRows.push({
            _id: order._id,
            originalOrderId: order._id,
            date: order.date ? new Date(order.date).toISOString().split('T')[0] : '',
            orderNo: order.orderPanelNo || 'N/A',
            branchName: order.branchName || 'N/A',
            branchCode: order.branchCode || '',
            subCompanyName: order.subCompanyName || '',
            subCompanyCode: order.subCompanyCode || '',
            partyName: order.partyName || order.customerName || 'N/A',
            customerName: order.customerName || 'N/A',
            plantCode: 'N/A',
            plantName: 'N/A',
            orderType: 'Sales',
            pinCode: 'N/A',
            from: 'N/A',
            to: 'N/A',
            district: 'N/A',
            state: 'N/A',
            country: 'N/A',
            weight: order.totalWeight || 0,
            status: order.panelStatus || 'Draft',
            delivery: order.delivery || 'Normal',
            panelStatus: order.panelStatus || 'Draft',
            collectionCharges: order.collectionCharges || 0,
            cancellationCharges: order.cancellationCharges || 'Nil',
            loadingCharges: order.loadingCharges || 'Nil',
            otherCharges: order.otherCharges || 0,
            pendingSince: calculatePendingDays(order.date, order.panelStatus),
            placement: 'Pending'
          });
        }
      });

      return NextResponse.json({
        success: true,
        data: flattenedRows
      }, { status: 200 });
    }
    
    // CASE 3: Get list of orders (summary only)
    let query = { companyId: user.companyId };
    
    const orderPanels = await OrderPanel.find(query)
      .sort({ createdAt: -1 })
      .select('orderPanelNo date branchName branchCode subCompanyName subCompanyCode customerName partyName totalWeight panelStatus createdAt plantRows delivery')
      .lean();

    const formattedOrders = orderPanels.map(order => ({
      _id: order._id,
      orderPanelNo: order.orderPanelNo || 'N/A',
      date: order.date ? new Date(order.date).toISOString().split('T')[0] : '',
      branch: order.branchName || 'N/A',
      branchCode: order.branchCode || '',
      subCompanyName: order.subCompanyName || '',
      subCompanyCode: order.subCompanyCode || '',
      customerName: order.customerName || 'N/A',
      partyName: order.partyName || order.customerName || 'N/A',
      totalWeight: order.totalWeight || 0,
      panelStatus: order.panelStatus || 'Draft',
      createdAt: order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : ''
    }));

    return NextResponse.json({
      success: true,
      data: formattedOrders
    }, { status: 200 });

  } catch (error) {
    console.error("GET /order-panel error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to fetch order panels",
      error: error.message 
    }, { status: 500 });
  }
}, { module: 'Order Panel', action: 'view' });

// ── POST: Requires 'create' permission ──
export const POST = withAuth(async (req, context, user) => {
  await connectDb();

  try {
    const body = await req.json();
    
    let orderPanelNo = await getNextOrderPanelNumber(user.companyId);
    
    const existingOrderPanel = await OrderPanel.findOne({ 
      orderPanelNo, 
      companyId: user.companyId 
    });
    
    if (existingOrderPanel) {
      orderPanelNo = `OP-${Date.now().toString().slice(-6)}`;
    }

    let branchName = '';
    let branchCode = '';
    if (body.branchName) {
      branchName = body.branchName;
      branchCode = body.branchCode || '';
    }

    // Get sub-company details if provided
    let subCompanyId = null;
    let subCompanyName = '';
    let subCompanyCode = '';
    
    if (body.subCompanyId) {
      const subCompany = await SubCompany.findOne({
        _id: body.subCompanyId,
        companyId: user.companyId
      });
      if (subCompany) {
        subCompanyId = subCompany._id;
        subCompanyName = subCompany.name;
        subCompanyCode = subCompany.code;
      }
    }

    const processedPlantRows = (body.plantRows || []).map((row) => {
      const weight = num(row.weight);
      const rate = num(row.rate);
      
      let fromField = null;
      if (row.from && mongoose.Types.ObjectId.isValid(row.from)) {
        fromField = new mongoose.Types.ObjectId(row.from);
      }
      
      let toField = null;
      if (row.to && mongoose.Types.ObjectId.isValid(row.to)) {
        toField = new mongoose.Types.ObjectId(row.to);
      }
      
      return {
        _id: new mongoose.Types.ObjectId(),
        plantCode: row.plantCode || '',
        plantName: row.plantName || '',
        plantCodeValue: row.plantCodeValue || '',
        orderType: row.orderType || "Sales",
        pinCode: row.pinCode || "",
        from: fromField,
        fromName: row.fromName || '',
        to: toField,
        toName: row.toName || '',
        taluka: row.taluka || "",
        talukaName: row.talukaName || row.taluka || '',
        district: row.district || "",
        districtName: row.districtName || row.district || '',
        state: row.state || "",
        stateName: row.stateName || row.state || '',
        country: row.country || "",
        countryName: row.countryName || row.country || '',
        weight,
        status: row.status || "Open",
        rate: rate,
        locationRate: num(row.locationRate),
        totalAmount: weight * rate,
        collectionCharges: num(row.collectionCharges) || 0,
        cancellationCharges: row.cancellationCharges || 'Nil',
        loadingCharges: row.loadingCharges || 'Nil',
        otherCharges: num(row.otherCharges) || 0
      };
    });
    
    const totalWeight = processedPlantRows.reduce((sum, row) => sum + row.weight, 0);
    const totalAmount = processedPlantRows.reduce((sum, row) => sum + row.totalAmount, 0);

    let customerId = null;
    if (body.customerId && body.customerId.trim() !== '') {
      if (mongoose.Types.ObjectId.isValid(body.customerId)) {
        customerId = new mongoose.Types.ObjectId(body.customerId);
      } else {
        customerId = body.customerId;
      }
    }

    // Process packData
    const processPackData = (packData) => {
      const result = {
        PALLETIZATION: [],
        'UNIFORM - BAGS/BOXES': [],
        'LOOSE - CARGO': [],
        'NON-UNIFORM - GENERAL CARGO': []
      };

      if (!packData) return result;

      if (packData.PALLETIZATION && Array.isArray(packData.PALLETIZATION)) {
        result.PALLETIZATION = packData.PALLETIZATION.map(item => ({
          _id: new mongoose.Types.ObjectId(),
          noOfPallets: num(item.noOfPallets),
          unitPerPallets: num(item.unitPerPallets),
          totalPkgs: num(item.totalPkgs),
          pkgsType: item.pkgsType || '',
          uom: item.uom || '',
          skuSize: item.skuSize || '',
          packWeight: num(item.packWeight),
          productName: item.productName || '',
          wtLtr: num(item.wtLtr),
          actualWt: num(item.actualWt),
          chargedWt: num(item.chargedWt),
          wtUom: item.wtUom || ''
        }));
      }

      if (packData['UNIFORM - BAGS/BOXES'] && Array.isArray(packData['UNIFORM - BAGS/BOXES'])) {
        result['UNIFORM - BAGS/BOXES'] = packData['UNIFORM - BAGS/BOXES'].map(item => ({
          _id: new mongoose.Types.ObjectId(),
          totalPkgs: num(item.totalPkgs),
          pkgsType: item.pkgsType || '',
          uom: item.uom || '',
          skuSize: item.skuSize || '',
          packWeight: num(item.packWeight),
          productName: item.productName || '',
          wtLtr: num(item.wtLtr),
          actualWt: num(item.actualWt),
          chargedWt: num(item.chargedWt),
          wtUom: item.wtUom || ''
        }));
      }

      if (packData['LOOSE - CARGO'] && Array.isArray(packData['LOOSE - CARGO'])) {
        result['LOOSE - CARGO'] = packData['LOOSE - CARGO'].map(item => ({
          _id: new mongoose.Types.ObjectId(),
          uom: item.uom || '',
          productName: item.productName || '',
          actualWt: num(item.actualWt),
          chargedWt: num(item.chargedWt)
        }));
      }

      if (packData['NON-UNIFORM - GENERAL CARGO'] && Array.isArray(packData['NON-UNIFORM - GENERAL CARGO'])) {
        result['NON-UNIFORM - GENERAL CARGO'] = packData['NON-UNIFORM - GENERAL CARGO'].map(item => ({
          _id: new mongoose.Types.ObjectId(),
          nos: num(item.nos),
          productName: item.productName || '',
          uom: item.uom || 'MT',
          length: num(item.length),
          width: num(item.width),
          height: num(item.height),
          actualWt: num(item.actualWt),
          chargedWt: num(item.chargedWt)
        }));
      }

      return result;
    };

    const orderPanelData = {
      orderPanelNo,
      branch: body.branch || null,
      branchName: branchName || body.branchName || '',
      branchCode: branchCode || body.branchCode || '',
      subCompanyId,
      subCompanyName: subCompanyName || body.subCompanyName || '',
      subCompanyCode: subCompanyCode || body.subCompanyCode || '',
      delivery: body.delivery || 'Normal',
      date: body.date ? new Date(body.date) : new Date(),
      customerId,
      customerCode: body.customerCode || '',
      customerName: body.customerName || '',
      contactPerson: body.contactPerson || '',
      partyName: body.partyName || '',
      collectionCharges: num(body.collectionCharges),
      cancellationCharges: body.cancellationCharges || 'Nil',
      loadingCharges: body.loadingCharges || 'Nil',
      otherCharges: num(body.otherCharges),
      plantRows: processedPlantRows,
      packData: processPackData(body.packData),
      totalWeight,
      totalAmount,
      companyId: new mongoose.Types.ObjectId(user.companyId),
      createdBy: new mongoose.Types.ObjectId(user.id),
      panelStatus: 'Draft'
    };

    const newOrderPanel = new OrderPanel(orderPanelData);
    const savedOrderPanel = await newOrderPanel.save();

    return NextResponse.json({ 
      success: true, 
      message: "Order panel created successfully",
      data: {
        _id: savedOrderPanel._id,
        orderPanelNo: savedOrderPanel.orderPanelNo
      }
    }, { status: 201 });

  } catch (error) {
    console.error("POST /order-panel error:", error);
    
    if (error.code === 11000) {
      return NextResponse.json({ 
        success: false, 
        message: "Order panel number already exists. Please try again." 
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
      message: `Failed to create order panel: ${error.message}` 
    }, { status: 500 });
  }
}, { module: 'Order Panel', action: 'create' });

// ── PUT: Requires 'edit' permission ──
export const PUT = withAuth(async (req, context, user) => {
  await connectDb();

  try {
    const body = await req.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: "Order panel ID is required" 
      }, { status: 400 });
    }

    const orderPanel = await OrderPanel.findOne({
      _id: id,
      companyId: user.companyId
    });

    if (!orderPanel) {
      return NextResponse.json({ 
        success: false, 
        message: "Order panel not found" 
      }, { status: 404 });
    }

    // Update sub-company fields
    if (body.subCompanyId) {
      const subCompany = await SubCompany.findOne({
        _id: body.subCompanyId,
        companyId: user.companyId
      });
      if (subCompany) {
        orderPanel.subCompanyId = subCompany._id;
        orderPanel.subCompanyName = subCompany.name;
        orderPanel.subCompanyCode = subCompany.code;
      }
    } else {
      orderPanel.subCompanyId = null;
      orderPanel.subCompanyName = '';
      orderPanel.subCompanyCode = '';
    }

    // Update other fields
    if (body.branchName) orderPanel.branchName = body.branchName;
    if (body.branchCode) orderPanel.branchCode = body.branchCode;
    if (body.delivery) orderPanel.delivery = body.delivery;
    if (body.date) orderPanel.date = new Date(body.date);
    if (body.customerName) orderPanel.customerName = body.customerName;
    if (body.partyName) orderPanel.partyName = body.partyName;
    if (body.collectionCharges !== undefined) orderPanel.collectionCharges = num(body.collectionCharges);
    if (body.cancellationCharges !== undefined) orderPanel.cancellationCharges = body.cancellationCharges;
    if (body.loadingCharges !== undefined) orderPanel.loadingCharges = body.loadingCharges;
    if (body.otherCharges !== undefined) orderPanel.otherCharges = num(body.otherCharges);
    if (body.panelStatus) orderPanel.panelStatus = body.panelStatus;

    if (body.plantRows && Array.isArray(body.plantRows)) {
      const processedPlantRows = body.plantRows.map((row) => {
        const weight = num(row.weight);
        const rate = num(row.rate);
        
        let fromField = null;
        if (row.from && mongoose.Types.ObjectId.isValid(row.from)) {
          fromField = new mongoose.Types.ObjectId(row.from);
        }
        
        let toField = null;
        if (row.to && mongoose.Types.ObjectId.isValid(row.to)) {
          toField = new mongoose.Types.ObjectId(row.to);
        }
        
        return {
          _id: row._id && mongoose.Types.ObjectId.isValid(row._id) ? new mongoose.Types.ObjectId(row._id) : new mongoose.Types.ObjectId(),
          plantCode: row.plantCode || '',
          plantName: row.plantName || '',
          plantCodeValue: row.plantCodeValue || '',
          orderType: row.orderType || "Sales",
          pinCode: row.pinCode || "",
          from: fromField,
          fromName: row.fromName || '',
          to: toField,
          toName: row.toName || '',
          taluka: row.taluka || "",
          talukaName: row.talukaName || row.taluka || '',
          district: row.district || "",
          districtName: row.districtName || row.district || '',
          state: row.state || "",
          stateName: row.stateName || row.state || '',
          country: row.country || "",
          countryName: row.countryName || row.country || '',
          weight,
          status: row.status || "Open",
          rate: rate,
          locationRate: num(row.locationRate),
          totalAmount: weight * rate,
          collectionCharges: num(row.collectionCharges) || 0,
          cancellationCharges: row.cancellationCharges || 'Nil',
          loadingCharges: row.loadingCharges || 'Nil',
          otherCharges: num(row.otherCharges) || 0
        };
      });
      
      orderPanel.plantRows = processedPlantRows;
      orderPanel.totalWeight = processedPlantRows.reduce((sum, row) => sum + row.weight, 0);
      orderPanel.totalAmount = processedPlantRows.reduce((sum, row) => sum + row.totalAmount, 0);
    }

    // Update packData
    if (body.packData) {
      orderPanel.packData = {
        PALLETIZATION: (body.packData.PALLETIZATION || []).map(item => ({
          _id: item._id && mongoose.Types.ObjectId.isValid(item._id) ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId(),
          noOfPallets: num(item.noOfPallets),
          unitPerPallets: num(item.unitPerPallets),
          totalPkgs: num(item.totalPkgs),
          pkgsType: item.pkgsType || '',
          uom: item.uom || '',
          skuSize: item.skuSize || '',
          packWeight: num(item.packWeight),
          productName: item.productName || '',
          wtLtr: num(item.wtLtr),
          actualWt: num(item.actualWt),
          chargedWt: num(item.chargedWt),
          wtUom: item.wtUom || ''
        })),
        'UNIFORM - BAGS/BOXES': (body.packData['UNIFORM - BAGS/BOXES'] || []).map(item => ({
          _id: item._id && mongoose.Types.ObjectId.isValid(item._id) ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId(),
          totalPkgs: num(item.totalPkgs),
          pkgsType: item.pkgsType || '',
          uom: item.uom || '',
          skuSize: item.skuSize || '',
          packWeight: num(item.packWeight),
          productName: item.productName || '',
          wtLtr: num(item.wtLtr),
          actualWt: num(item.actualWt),
          chargedWt: num(item.chargedWt),
          wtUom: item.wtUom || ''
        })),
        'LOOSE - CARGO': (body.packData['LOOSE - CARGO'] || []).map(item => ({
          _id: item._id && mongoose.Types.ObjectId.isValid(item._id) ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId(),
          uom: item.uom || '',
          productName: item.productName || '',
          actualWt: num(item.actualWt),
          chargedWt: num(item.chargedWt)
        })),
        'NON-UNIFORM - GENERAL CARGO': (body.packData['NON-UNIFORM - GENERAL CARGO'] || []).map(item => ({
          _id: item._id && mongoose.Types.ObjectId.isValid(item._id) ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId(),
          nos: num(item.nos),
          productName: item.productName || '',
          uom: item.uom || 'MT',
          length: num(item.length),
          width: num(item.width),
          height: num(item.height),
          actualWt: num(item.actualWt),
          chargedWt: num(item.chargedWt)
        }))
      };
    }

    await orderPanel.save();

    return NextResponse.json({ 
      success: true, 
      message: "Order panel updated successfully",
      data: {
        _id: orderPanel._id,
        orderPanelNo: orderPanel.orderPanelNo
      }
    }, { status: 200 });

  } catch (error) {
    console.error("PUT /order-panel error:", error);
    return NextResponse.json({ 
      success: false, 
      message: `Failed to update order panel: ${error.message}` 
    }, { status: 500 });
  }
}, { module: 'Order Panel', action: 'edit' });

// ── DELETE: Requires 'delete' permission ──
export const DELETE = withAuth(async (req, context, user) => {
  await connectDb();

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: "Order panel ID is required" 
      }, { status: 400 });
    }

    const result = await OrderPanel.deleteOne({
      _id: id,
      companyId: user.companyId
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "Order panel not found" 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Order panel deleted successfully" 
    }, { status: 200 });

  } catch (error) {
    console.error("DELETE /order-panel error:", error);
    return NextResponse.json({ 
      success: false, 
      message: `Failed to delete order panel: ${error.message}` 
    }, { status: 500 });
  }
}, { module: 'Order Panel', action: 'delete' });

// ── PATCH: Requires 'approve' permission ──
export const PATCH = withAuth(async (req, context, user) => {
  await connectDb();

  try {
    const body = await req.json();
    const { id, action } = body;
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: "Order panel ID is required" 
      }, { status: 400 });
    }

    const orderPanel = await OrderPanel.findOne({
      _id: id,
      companyId: user.companyId
    });

    if (!orderPanel) {
      return NextResponse.json({ 
        success: false, 
        message: "Order panel not found" 
      }, { status: 404 });
    }

    // Check if action is allowed
    if (action === 'approve') {
      orderPanel.panelStatus = 'Approved';
      orderPanel.approvedBy = user.id;
      orderPanel.approvedAt = new Date();
      orderPanel.approvalRemarks = body.remarks || 'Approved via quick action';
    } else if (action === 'reject') {
      orderPanel.panelStatus = 'Rejected';
      orderPanel.approvedBy = user.id;
      orderPanel.approvedAt = new Date();
      orderPanel.approvalRemarks = body.remarks || 'Rejected via quick action';
    } else if (action === 'complete') {
      orderPanel.panelStatus = 'Completed';
    } else {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid action. Allowed: approve, reject, complete" 
      }, { status: 400 });
    }

    await orderPanel.save();

    return NextResponse.json({ 
      success: true, 
      message: `Order ${action}d successfully`,
      data: {
        _id: orderPanel._id,
        orderPanelNo: orderPanel.orderPanelNo,
        panelStatus: orderPanel.panelStatus
      }
    }, { status: 200 });

  } catch (error) {
    console.error("PATCH /order-panel error:", error);
    return NextResponse.json({ 
      success: false, 
      message: `Failed to update order status: ${error.message}` 
    }, { status: 500 });
  }
}, { module: 'Order Panel', action: 'approve' });