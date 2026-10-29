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
// import { NextResponse } from "next/server";
// import connectDb from "@/lib/db";
// import OrderPanel from "./OrderPanel";
// import Plant from "@/app/api/plants/schema";

// import mongoose from 'mongoose';
// import { withAuth, hasPermission } from "@/lib/auth";
// import { getNextOrderPanelNumber } from "./OrderCounter";
// import { companyScopeFilter } from "@/lib/companyScope";

// // Register the referenced model before populating plantRows.plantCode below.
// void Plant;

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

//       const orderPanel = await OrderPanel.findOne(companyScopeFilter(user, { _id: id }))
//         .populate('plantRows.plantCode', 'name code')
//         .lean();

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
//         subCompanyName: orderPanel.subCompanyName || '',
//         subCompanyCode: orderPanel.subCompanyCode || '',
//         customerName: orderPanel.customerName || 'N/A',
//         partyName: orderPanel.partyName || orderPanel.customerName || 'N/A',
//         totalWeight: orderPanel.totalWeight || 0,
//         panelStatus: orderPanel.panelStatus || 'Draft',
//         approvalRemarks: orderPanel.approvalRemarks || '',
//         delivery: orderPanel.delivery || 'Normal',
//         plantRows: (orderPanel.plantRows || []).map(row => ({
//           ...row,
//           plantCode: row.plantCode?._id || row.plantCode || null,
//           plantName: row.plantName || row.plantCode?.name || '',
//           plantCodeValue: row.plantCodeValue || row.plantCode?.code || '',
//         })),
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
//       let query = companyScopeFilter(user);

//       const orderPanels = await OrderPanel.find(query)
//         .sort({ createdAt: -1 })
//         .select('orderPanelNo date branchName branchCode subCompanyName subCompanyCode customerName partyName totalWeight panelStatus createdAt plantRows delivery collectionCharges cancellationCharges loadingCharges otherCharges')
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
//               subCompanyName: order.subCompanyName || '',
//               subCompanyCode: order.subCompanyCode || '',
//               partyName: order.partyName || order.customerName || 'N/A',
//               customerName: order.customerName || 'N/A',
//               plantCode: row.plantCodeValue || row.plantCode || 'N/A',
//               plantName: row.plantName || '',
//               orderType: row.orderType || 'Sales',
//               pinCode: row.pinCode || '',
//               locationRemark: row.locationRemark || '',
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
//             subCompanyName: order.subCompanyName || '',
//             subCompanyCode: order.subCompanyCode || '',
//             partyName: order.partyName || order.customerName || 'N/A',
//             customerName: order.customerName || 'N/A',
//             plantCode: 'N/A',
//             plantName: 'N/A',
//             orderType: 'Sales',
//             pinCode: 'N/A',
//             locationRemark: '',
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
//     let query = companyScopeFilter(user);

//     const orderPanels = await OrderPanel.find(query)
//       .sort({ createdAt: -1 })
//       .select('orderPanelNo date branchName branchCode subCompanyName subCompanyCode customerName partyName totalWeight panelStatus createdAt plantRows delivery')
//       .lean();

//     const formattedOrders = orderPanels.map(order => ({
//       _id: order._id,
//       orderPanelNo: order.orderPanelNo || 'N/A',
//       date: order.date ? new Date(order.date).toISOString().split('T')[0] : '',
//       branch: order.branchName || 'N/A',
//       branchCode: order.branchCode || '',
//       subCompanyName: order.subCompanyName || '',
//       subCompanyCode: order.subCompanyCode || '',
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

//     let orderPanelNo = await getNextOrderPanelNumber(user.companyId, user.activeOperatingCompanyId, user.activeOperatingCompanyCode);

//     const existingOrderPanel = await OrderPanel.findOne(companyScopeFilter(user, { orderPanelNo }));

//     if (existingOrderPanel) {
//       orderPanelNo = `OP-${Date.now().toString().slice(-6)}`;
//     }

//     let branchName = '';
//     let branchCode = '';
//     if (body.branchName) {
//       branchName = body.branchName;
//       branchCode = body.branchCode || '';
//     }

//     // Never trust a form-supplied company id. The login selection is the only
//     // source of the company recorded on a transactional document.
//     const subCompanyId = user.activeOperatingCompanyId;
//     const subCompanyName = user.activeOperatingCompanyName || '';
//     const subCompanyCode = user.activeOperatingCompanyCode || '';

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
//         locationRemark: row.locationRemark || "",
//         from: fromField,
//         fromName: row.fromName || '',
//         fromState: row.fromState || '',
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
//           productId: mongoose.Types.ObjectId.isValid(item.productId) ? item.productId : null,
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
//           productId: mongoose.Types.ObjectId.isValid(item.productId) ? item.productId : null,
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
//           productId: mongoose.Types.ObjectId.isValid(item.productId) ? item.productId : null,
//           productName: item.productName || '',
//           actualWt: num(item.actualWt),
//           chargedWt: num(item.chargedWt)
//         }));
//       }

//       if (packData['NON-UNIFORM - GENERAL CARGO'] && Array.isArray(packData['NON-UNIFORM - GENERAL CARGO'])) {
//         result['NON-UNIFORM - GENERAL CARGO'] = packData['NON-UNIFORM - GENERAL CARGO'].map(item => ({
//           _id: new mongoose.Types.ObjectId(),
//           nos: num(item.nos),
//           productId: mongoose.Types.ObjectId.isValid(item.productId) ? item.productId : null,
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
//       subCompanyId,
//       subCompanyName: subCompanyName || body.subCompanyName || '',
//       subCompanyCode: subCompanyCode || body.subCompanyCode || '',
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

//     const orderPanel = await OrderPanel.findOne(companyScopeFilter(user, { _id: id }));

//     if (!orderPanel) {
//       return NextResponse.json({
//         success: false,
//         message: "Order panel not found"
//       }, { status: 404 });
//     }

//     orderPanel.subCompanyId = user.activeOperatingCompanyId;
//     orderPanel.subCompanyName = user.activeOperatingCompanyName || '';
//     orderPanel.subCompanyCode = user.activeOperatingCompanyCode || '';

//     // Update other fields
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
//     if (body.panelStatus && body.panelStatus !== orderPanel.panelStatus) {
//       if (!hasPermission(user, 'Order Panel', 'approve')) {
//         return NextResponse.json({
//           success: false,
//           message: "Permission denied: approve action not allowed for Order Panel."
//         }, { status: 403 });
//       }
//       orderPanel.panelStatus = body.panelStatus;
//     }

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
//           locationRemark: row.locationRemark || "",
//           from: fromField,
//           fromName: row.fromName || '',
//           fromState: row.fromState || '',
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

//     const result = await OrderPanel.deleteOne(companyScopeFilter(user, { _id: id }));

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

//     const orderPanel = await OrderPanel.findOne(companyScopeFilter(user, { _id: id }));

//     if (!orderPanel) {
//       return NextResponse.json({
//         success: false,
//         message: "Order panel not found"
//       }, { status: 404 });
//     }

//     // Check if action is allowed
//     const remarks = (body.remarks || '').trim();

//     if (action === 'approve') {
//       orderPanel.panelStatus = 'Approved';
//       orderPanel.approvedBy = user.id;
//       orderPanel.approvedAt = new Date();
//       orderPanel.approvalRemarks = remarks || 'Approved via quick action';
//     } else if (action === 'reject') {
//       orderPanel.panelStatus = 'Rejected';
//       orderPanel.approvedBy = user.id;
//       orderPanel.approvedAt = new Date();
//       orderPanel.approvalRemarks = remarks || 'Rejected via quick action';
//     } else if (action === 'complete') {
//       orderPanel.panelStatus = 'Completed';
//       if (remarks) orderPanel.approvalRemarks = remarks;
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
import { withBranchAccess } from '@/lib/branchAccess';
import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import OrderPanel from "./OrderPanel";
import Plant from "@/app/api/plants/schema";

import mongoose from 'mongoose';
import { withAuth, hasPermission } from "@/lib/auth";
import { getNextOrderPanelNumber } from "./OrderCounter";
import { recordApprovedRevision } from '@/lib/reapprovalService';
import { handleModuleDelete } from "@/lib/deletion/handler";
import { companyScopeFilter } from "@/lib/companyScope";
import { notifyModuleApprovers, notifyModuleCreateUsers, notifyModuleDecision } from "@/lib/workflowNotifications";

// Register the referenced model before populating plantRows.plantCode below.
void Plant;

// ── HELPER FUNCTIONS ──

function num(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function objectIdOrNull(value) {
  return value && mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;
}

function validatePackDropLocations(packData = {}, plantRows = [], required = false) {
  const routeIds = new Set(plantRows.map((row) => String(row._id)));
  const errors = [];
  for (const [packType, rows] of Object.entries(packData || {})) {
    (rows || []).forEach((row, index) => {
      if (!row.plantRowId && required) errors.push(`${packType} row ${index + 1} needs a drop location.`);
      else if (row.plantRowId && !routeIds.has(String(row.plantRowId))) errors.push(`${packType} row ${index + 1} refers to a route that is not on this order.`);
    });
  }
  return { ok: errors.length === 0, errors };
}

function missingOrderDropRows(plantRows = []) {
  return plantRows.filter((row) => !String(row.toName || row.cityName || row.city || row.to || '').trim());
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
const branchHandlerGET = withAuth(async (req, context, user) => {
  await connectDb();

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const isTable = url.searchParams.get("table") === "true";
    const openOnly = url.searchParams.get('openOnly') === 'true';

    // CASE 1: Get single order with full details
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({
          success: false,
          message: "Invalid order panel ID format"
        }, { status: 400 });
      }

      const orderPanel = await OrderPanel.findOne(companyScopeFilter(user, { _id: id }))
        .populate('plantRows.plantCode', 'name code')
        .lean();

      if (!orderPanel) {
        return NextResponse.json({
          success: false,
          message: "Order panel not found"
        }, { status: 404 });
      }

      if (openOnly && (orderPanel.isDraft || (orderPanel.panelStatus || 'Draft') === 'Draft')) {
        return NextResponse.json({
          success: false,
          message: "Draft order panels are not available for creating linked panels"
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
        canManageStatus: ['create', 'edit', 'approve'].some((action) => hasPermission(user, 'Order Panel', action)),
        isDraft: !!orderPanel.isDraft,
        approvalRemarks: orderPanel.approvalRemarks || '',
        delivery: orderPanel.delivery || 'Normal',
        loadingInfoPhotosOptional: !!orderPanel.loadingInfoPhotosOptional,
        plantRows: (openOnly ? (orderPanel.plantRows || []).filter((row) => (row.status || 'Open') === 'Open' && !row.statusRequest?.action) : (orderPanel.plantRows || [])).map(row => ({
          ...row,
          plantCode: row.plantCode?._id || row.plantCode || null,
          plantName: row.plantName || row.plantCode?.name || '',
          plantCodeValue: row.plantCodeValue || row.plantCode?.code || '',
        })),
        collectionCharges: orderPanel.collectionCharges || 0,
        cancellationCharges: orderPanel.cancellationCharges || 'Nil',
        loadingCharges: orderPanel.loadingCharges || 'Nil',
        otherCharges: orderPanel.otherCharges || 0,
        customerId: orderPanel.customerId,
        customerCode: orderPanel.customerCode || '',
        contactPerson: orderPanel.contactPerson || '',
        branch: orderPanel.branch,
        packData: orderPanel.packData || {},
        allocationEnabled: !!orderPanel.allocationEnabled
      };

      return NextResponse.json({
        success: true,
        data: formattedOrder
      }, { status: 200 });
    }

    // CASE 2: Get flattened data for table view
    if (isTable) {
      let query = companyScopeFilter(user);

      let orderPanels = await OrderPanel.find(query)
        .sort({ createdAt: -1 })
        .select('orderPanelNo date branchName branchCode subCompanyName subCompanyCode customerName partyName totalWeight panelStatus isDraft createdAt plantRows delivery collectionCharges cancellationCharges loadingCharges otherCharges')
        .lean();
      if (openOnly) orderPanels = orderPanels
        .filter((order) => !order.isDraft && (order.panelStatus || 'Draft') !== 'Draft')
        .map((order) => ({ ...order, plantRows: (order.plantRows || []).filter((row) => (row.status || 'Open') === 'Open' && !row.statusRequest?.action) }));

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
              locationRemark: row.locationRemark || '',
              from: row.fromName || row.from || '',
              to: row.toName || row.to || '',
              taluka: row.talukaName || row.taluka || '',
              district: row.districtName || row.district || '',
              state: row.stateName || row.state || '',
              country: row.countryName || row.country || '',
              weight: row.weight || 0,
              status: order.panelStatus === 'Cancelled' ? 'Cancelled' : (row.status || 'Open'),
              statusRequest: row.statusRequest?.action ? { action: row.statusRequest.action, reason: row.statusRequest.reason || '', by: row.statusRequest.by || null, at: row.statusRequest.at || null } : null,
              delivery: order.delivery || 'Normal',
              panelStatus: order.panelStatus || 'Draft',
              isDraft: !!order.isDraft,
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
            locationRemark: '',
            from: 'N/A',
            to: 'N/A',
            district: 'N/A',
            state: 'N/A',
            country: 'N/A',
            weight: order.totalWeight || 0,
            status: order.panelStatus || 'Draft',
            delivery: order.delivery || 'Normal',
            panelStatus: order.panelStatus || 'Draft',
            isDraft: !!order.isDraft,
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
    let query = companyScopeFilter(user);

    let orderPanels = await OrderPanel.find(query)
      .sort({ createdAt: -1 })
      .select('orderPanelNo date branchName branchCode subCompanyName subCompanyCode customerName partyName totalWeight panelStatus isDraft createdAt plantRows delivery')
      .lean();
    if (openOnly) orderPanels = orderPanels.filter((order) =>
      !order.isDraft && (order.panelStatus || 'Draft') !== 'Draft'
      && (order.plantRows || []).some((row) => (row.status || 'Open') === 'Open' && !row.statusRequest?.action));

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
      isDraft: !!order.isDraft,
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
}, { module: 'Order Panel', actions: ['view', 'create', 'edit', 'approve'] });

// ── POST: Requires 'create' permission ──
const branchHandlerPOST = withAuth(async (req, context, user) => {
  await connectDb();

  try {
    const body = await req.json();
    // saveMode: 'draft' = Save as Draft (partial record), 'submit' = Submit for Approval.
    // Callers that send no saveMode keep the old behaviour (plain 'Draft', approvable).
    const isDraftSave = body.saveMode === 'draft';
    const isSubmitSave = body.saveMode === 'submit';
    const missingDrops = missingOrderDropRows(body.plantRows || []);
    if (missingDrops.length) {
      return NextResponse.json({ success: false, message: `Select a drop location for every order row. Missing on row(s): ${missingDrops.map((row, index) => row.plantName || `Row ${index + 1}`).join(', ')}.` }, { status: 400 });
    }

    const orderPanelNo = await getNextOrderPanelNumber(user.companyId, user.activeOperatingCompanyId, user.activeOperatingCompanyCode);

    let branchName = '';
    let branchCode = '';
    if (body.branchName) {
      branchName = body.branchName;
      branchCode = body.branchCode || '';
    }

    // Never trust a form-supplied company id. The login selection is the only
    // source of the company recorded on a transactional document.
    const subCompanyId = user.activeOperatingCompanyId;
    const subCompanyName = user.activeOperatingCompanyName || '';
    const subCompanyCode = user.activeOperatingCompanyCode || '';

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
        _id: row._id && mongoose.Types.ObjectId.isValid(row._id) ? new mongoose.Types.ObjectId(row._id) : new mongoose.Types.ObjectId(),
        plantCode: row.plantCode || '',
        plantName: row.plantName || '',
        plantCodeValue: row.plantCodeValue || '',
        orderType: row.orderType || "Sales",
        pinCode: row.pinCode || "",
        locationRemark: row.locationRemark || "",
        from: fromField,
        fromName: row.fromName || '',
        fromState: row.fromState || '',
        to: toField,
        toName: row.toName || '',
        city: row.city || row.cityName || '',
        cityName: row.cityName || row.city || '',
        taluka: row.taluka || "",
        talukaName: row.talukaName || row.taluka || '',
        district: row.district || "",
        districtName: row.districtName || row.district || '',
        state: row.state || "",
        stateName: row.stateName || row.state || '',
        country: row.country || "",
        countryName: row.countryName || row.country || '',
        weight,
        status: "Open",
        rate: rate,
        locationRate: num(row.locationRate),
        totalAmount: weight * rate,
        collectionCharges: num(row.collectionCharges) || 0,
        cancellationCharges: num(row.cancellationCharges),
        cancellationChargeMode: ['flat', 'per MT'].includes(row.cancellationChargeMode) ? row.cancellationChargeMode : 'flat',
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
          _id: item._id && mongoose.Types.ObjectId.isValid(item._id) ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId(),
          noOfPallets: num(item.noOfPallets),
          unitPerPallets: num(item.unitPerPallets),
          totalPkgs: num(item.totalPkgs),
          pkgsType: item.pkgsType || '',
          uom: item.uom || '',
          skuSize: item.skuSize || '',
          packWeight: num(item.packWeight),
          productId: mongoose.Types.ObjectId.isValid(item.productId) ? item.productId : null,
          plantRowId: objectIdOrNull(item.plantRowId),
          productName: item.productName || '',
          wtLtr: num(item.wtLtr),
          actualWt: num(item.actualWt),
          chargedWt: num(item.chargedWt),
          wtUom: item.wtUom || ''
        }));
      }

      if (packData['UNIFORM - BAGS/BOXES'] && Array.isArray(packData['UNIFORM - BAGS/BOXES'])) {
        result['UNIFORM - BAGS/BOXES'] = packData['UNIFORM - BAGS/BOXES'].map(item => ({
          _id: item._id && mongoose.Types.ObjectId.isValid(item._id) ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId(),
          totalPkgs: num(item.totalPkgs),
          pkgsType: item.pkgsType || '',
          uom: item.uom || '',
          skuSize: item.skuSize || '',
          packWeight: num(item.packWeight),
          productId: mongoose.Types.ObjectId.isValid(item.productId) ? item.productId : null,
          plantRowId: objectIdOrNull(item.plantRowId),
          productName: item.productName || '',
          wtLtr: num(item.wtLtr),
          actualWt: num(item.actualWt),
          chargedWt: num(item.chargedWt),
          wtUom: item.wtUom || ''
        }));
      }

      if (packData['LOOSE - CARGO'] && Array.isArray(packData['LOOSE - CARGO'])) {
        result['LOOSE - CARGO'] = packData['LOOSE - CARGO'].map(item => ({
          _id: item._id && mongoose.Types.ObjectId.isValid(item._id) ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId(),
          uom: item.uom || '',
          productId: mongoose.Types.ObjectId.isValid(item.productId) ? item.productId : null,
          plantRowId: objectIdOrNull(item.plantRowId),
          productName: item.productName || '',
          actualWt: num(item.actualWt),
          chargedWt: num(item.chargedWt)
        }));
      }

      if (packData['NON-UNIFORM - GENERAL CARGO'] && Array.isArray(packData['NON-UNIFORM - GENERAL CARGO'])) {
        result['NON-UNIFORM - GENERAL CARGO'] = packData['NON-UNIFORM - GENERAL CARGO'].map(item => ({
          _id: item._id && mongoose.Types.ObjectId.isValid(item._id) ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId(),
          nos: num(item.nos),
          productId: mongoose.Types.ObjectId.isValid(item.productId) ? item.productId : null,
          plantRowId: objectIdOrNull(item.plantRowId),
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

    const processedPackData = processPackData(body.packData);
    const allocationEnabled = body.allocationEnabled !== false;
    const dropCheck = validatePackDropLocations(processedPackData, processedPlantRows, allocationEnabled && !isDraftSave);
    if (!dropCheck.ok) return NextResponse.json({ success: false, message: dropCheck.errors.join(' ') }, { status: 400 });

    const orderPanelData = {
      orderPanelNo,
      branch: body.branch || null,
      branchName: branchName || body.branchName || '',
      branchCode: branchCode || body.branchCode || '',
      subCompanyId,
      subCompanyName: subCompanyName || body.subCompanyName || '',
      subCompanyCode: subCompanyCode || body.subCompanyCode || '',
      delivery: body.delivery || 'Normal',
      loadingInfoPhotosOptional: body.loadingInfoPhotosOptional === true,
      date: body.date ? new Date(body.date) : new Date(),
      customerId,
      customerCode: body.customerCode || '',
      customerName: body.customerName || '',
      contactPerson: body.contactPerson || '',
      partyName: body.partyName || '',
      collectionCharges: num(body.collectionCharges),
      cancellationCharges: num(body.cancellationCharges),
      cancellationChargeMode: ['flat', 'per MT'].includes(body.cancellationChargeMode) ? body.cancellationChargeMode : 'flat',
      loadingCharges: body.loadingCharges || 'Nil',
      otherCharges: num(body.otherCharges),
      plantRows: processedPlantRows,
      packData: processedPackData,
      allocationEnabled,
      totalWeight,
      totalAmount,
      companyId: new mongoose.Types.ObjectId(user.companyId),
      createdBy: new mongoose.Types.ObjectId(user.id),
      panelStatus: isSubmitSave ? 'Submitted' : 'Draft',
      isDraft: isDraftSave
    };

    const newOrderPanel = new OrderPanel(orderPanelData);
    const savedOrderPanel = await newOrderPanel.save();

    if (isSubmitSave) {
      await notifyModuleApprovers({
        user, module: 'Order Panel', panelLabel: 'Order Panel',
        reference: savedOrderPanel.orderPanelNo, url: `/admin/order-panel/${savedOrderPanel._id}`,
      });
    }

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
const branchHandlerPUT = withAuth(async (req, context, user) => {
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

    const orderPanel = await OrderPanel.findOne(companyScopeFilter(user, { _id: id }));

    if (!orderPanel) {
      return NextResponse.json({
        success: false,
        message: "Order panel not found"
      }, { status: 404 });
    }

    if (orderPanel.panelStatus === 'Cancelled') {
      return NextResponse.json({
        success: false,
        message: 'Cancelled orders cannot be edited. Create a new order for replacement rows.'
      }, { status: 409 });
    }

    if (orderPanel.upstreamPending?.length || orderPanel.reapprovalState === 'blockedByUpstream') {
      return NextResponse.json({ success: false, message: 'This record is waiting for upstream corrections to be reviewed first.' }, { status: 409 });
    }
    if (orderPanel.reapprovalState === 'pendingApproval' || orderPanel.reapprovalState === 'syncFailed') return NextResponse.json({ success: false, message: 'This order is waiting for approval or admin sync recovery.' }, { status: 409 });
    const isApprovedLocked = ['Approved', 'Completed'].includes(orderPanel.panelStatus);
    const isReapprovalEdit = ['unlocked', 'pendingApproval', 'pendingReapproval'].includes(orderPanel.reapprovalState);
    if (isApprovedLocked && !isReapprovalEdit) {
      return NextResponse.json({ success: false, message: 'Approved orders are locked. Ask an admin to unlock this order before editing.' }, { status: 409 });
    }

    orderPanel.subCompanyId = user.activeOperatingCompanyId;
    orderPanel.subCompanyName = user.activeOperatingCompanyName || '';
    orderPanel.subCompanyCode = user.activeOperatingCompanyCode || '';

    // Draft handling: Save as Draft / Submit for Approval only apply to an order still in Draft
    const saveMode = body.saveMode;
    if (Array.isArray(body.plantRows)) {
      const missingDrops = missingOrderDropRows(body.plantRows);
      if (missingDrops.length) {
        return NextResponse.json({ success: false, message: `Select a drop location for every order row. Missing on row(s): ${missingDrops.map((row, index) => row.plantName || `Row ${index + 1}`).join(', ')}.` }, { status: 400 });
      }
    }
    if ((saveMode === 'draft' || saveMode === 'submit') && orderPanel.panelStatus !== 'Draft' && !(isReapprovalEdit && saveMode === 'submit')) {
      return NextResponse.json({
        success: false,
        message: `Only a draft can be saved as draft or submitted. This order is already ${orderPanel.panelStatus}.`
      }, { status: 400 });
    }

    // Update other fields
    if (body.branch) orderPanel.branch = body.branch;
    if (body.branchName) orderPanel.branchName = body.branchName;
    if (body.branchCode) orderPanel.branchCode = body.branchCode;
    if (body.delivery) orderPanel.delivery = body.delivery;
    if (body.loadingInfoPhotosOptional !== undefined) orderPanel.loadingInfoPhotosOptional = body.loadingInfoPhotosOptional === true;
    if (body.date) orderPanel.date = new Date(body.date);
    if (body.customerName) orderPanel.customerName = body.customerName;
    if (body.partyName) orderPanel.partyName = body.partyName;
    if (body.collectionCharges !== undefined) orderPanel.collectionCharges = num(body.collectionCharges);
    if (body.cancellationCharges !== undefined) orderPanel.cancellationCharges = num(body.cancellationCharges);
    if (body.loadingCharges !== undefined) orderPanel.loadingCharges = body.loadingCharges;
    if (body.otherCharges !== undefined) orderPanel.otherCharges = num(body.otherCharges);
    if (body.panelStatus && body.panelStatus !== orderPanel.panelStatus) {
      if (!hasPermission(user, 'Order Panel', 'approve')) {
        return NextResponse.json({
          success: false,
          message: "Permission denied: approve action not allowed for Order Panel."
        }, { status: 403 });
      }
      if (orderPanel.isDraft && saveMode !== 'submit') {
        return NextResponse.json({
          success: false,
          message: "This order is still a draft. Submit it for approval first."
        }, { status: 400 });
      }
      if (body.panelStatus !== 'Submitted' || orderPanel.panelStatus !== 'Draft' || saveMode !== 'submit') {
        return NextResponse.json({ success: false, message: 'Order status changes must use the submit, approve, reject, or complete action.' }, { status: 400 });
      }
    }

    if (body.plantRows && Array.isArray(body.plantRows)) {
      const processedPlantRows = body.plantRows.map((row) => {
        const weight = num(row.weight);
        const rate = num(row.rate);
        const savedRow = orderPanel.plantRows.id(row._id);

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
          locationRemark: row.locationRemark || "",
          from: fromField,
          fromName: row.fromName || '',
          fromState: row.fromState || '',
          to: toField,
          toName: row.toName || '',
          city: row.city || row.cityName || '',
          cityName: row.cityName || row.city || '',
          taluka: row.taluka || "",
          talukaName: row.talukaName || row.taluka || '',
          district: row.district || "",
          districtName: row.districtName || row.district || '',
          state: row.state || "",
          stateName: row.stateName || row.state || '',
          country: row.country || "",
          countryName: row.countryName || row.country || '',
          weight,
          status: savedRow?.status || 'Open',
          statusReason: savedRow?.statusReason || '',
          statusChangedBy: savedRow?.statusChangedBy || null,
          statusChangedAt: savedRow?.statusChangedAt || null,
          holdUntil: savedRow?.holdUntil || null,
          statusRequest: savedRow?.statusRequest || {},
          statusHistory: savedRow?.statusHistory || [],
          rate: rate,
          locationRate: num(row.locationRate),
          totalAmount: weight * rate,
          collectionCharges: num(row.collectionCharges) || 0,
          cancellationCharges: num(row.cancellationCharges),
          cancellationChargeMode: ['flat', 'per MT'].includes(row.cancellationChargeMode) ? row.cancellationChargeMode : 'flat',
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
          productId: mongoose.Types.ObjectId.isValid(item.productId) ? item.productId : null,
          plantRowId: objectIdOrNull(item.plantRowId),
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
          productId: mongoose.Types.ObjectId.isValid(item.productId) ? item.productId : null,
          plantRowId: objectIdOrNull(item.plantRowId),
          productName: item.productName || '',
          wtLtr: num(item.wtLtr),
          actualWt: num(item.actualWt),
          chargedWt: num(item.chargedWt),
          wtUom: item.wtUom || ''
        })),
        'LOOSE - CARGO': (body.packData['LOOSE - CARGO'] || []).map(item => ({
          _id: item._id && mongoose.Types.ObjectId.isValid(item._id) ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId(),
          uom: item.uom || '',
          productId: mongoose.Types.ObjectId.isValid(item.productId) ? item.productId : null,
          plantRowId: objectIdOrNull(item.plantRowId),
          productName: item.productName || '',
          actualWt: num(item.actualWt),
          chargedWt: num(item.chargedWt)
        })),
        'NON-UNIFORM - GENERAL CARGO': (body.packData['NON-UNIFORM - GENERAL CARGO'] || []).map(item => ({
          _id: item._id && mongoose.Types.ObjectId.isValid(item._id) ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId(),
          nos: num(item.nos),
          productId: mongoose.Types.ObjectId.isValid(item.productId) ? item.productId : null,
          plantRowId: objectIdOrNull(item.plantRowId),
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

    if (body.allocationEnabled !== undefined) orderPanel.allocationEnabled = body.allocationEnabled !== false;
    const dropCheck = validatePackDropLocations(orderPanel.packData, orderPanel.plantRows, !!orderPanel.allocationEnabled && saveMode !== 'draft');
    if (!dropCheck.ok) return NextResponse.json({ success: false, message: dropCheck.errors.join(' ') }, { status: 400 });

    if (saveMode === 'draft') {
      orderPanel.isDraft = true;
      orderPanel.panelStatus = 'Draft';
    } else if (saveMode === 'submit') {
      orderPanel.isDraft = false;
      orderPanel.panelStatus = 'Submitted';
    }
    if (isReapprovalEdit && saveMode !== 'draft') {
      orderPanel.isDraft = false;
      orderPanel.panelStatus = 'Submitted';
      orderPanel.reapprovalState = 'pendingApproval';
    }

    // Older order records may contain the display label "Nil" in numeric
    // charge fields. Normalize the hydrated document before validation/save.
    orderPanel.cancellationCharges = num(orderPanel.cancellationCharges);
    for (const row of orderPanel.plantRows || []) {
      row.cancellationCharges = num(row.cancellationCharges);
    }

    await orderPanel.save();

    if (saveMode === 'submit') {
      await notifyModuleApprovers({
        user, module: 'Order Panel', panelLabel: 'Order Panel',
        reference: orderPanel.orderPanelNo, url: `/admin/order-panel/${orderPanel._id}`,
      });
    }

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
const branchHandlerDELETE = withAuth(async (req, context, user) => {
  await connectDb();
  return handleModuleDelete(req, 'order', user);

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({
        success: false,
        message: "Order panel ID is required"
      }, { status: 400 });
    }

    const orderPanel = await OrderPanel.findOne(companyScopeFilter(user, { _id: id }));
    if (!orderPanel) {
      return NextResponse.json({ success: false, message: 'Order panel not found' }, { status: 404 });
    }
    const result = await OrderPanel.deleteOne(companyScopeFilter(user, { _id: id }));

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
const branchHandlerPATCH = withAuth(async (req, context, user) => {
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

    const orderPanel = await OrderPanel.findOne(companyScopeFilter(user, { _id: id }));

    if (!orderPanel) {
      return NextResponse.json({
        success: false,
        message: "Order panel not found"
      }, { status: 404 });
    }

    if (orderPanel.panelStatus === 'Cancelled') {
      return NextResponse.json({ success: false, message: 'Cancelled orders cannot be approved, rejected, or completed.' }, { status: 409 });
    }

    if (orderPanel.upstreamPending?.length || orderPanel.reapprovalState === 'blockedByUpstream') {
      return NextResponse.json({ success: false, message: 'This record cannot be approved until its upstream corrections are reviewed.' }, { status: 409 });
    }
    if (orderPanel.reapprovalState === 'unlocked') return NextResponse.json({ success: false, message: 'This record must be edited and resubmitted before approval.' }, { status: 409 });

    // A saved-as-draft order must be submitted before it can be approved / rejected / completed
    if (orderPanel.isDraft) {
      return NextResponse.json({
        success: false,
        message: "This order is still a draft. It must be submitted for approval first."
      }, { status: 400 });
    }

    // Check if action is allowed
    const remarks = (body.remarks || '').trim();

    if (action === 'approve') {
      if (orderPanel.panelStatus !== 'Submitted' && !(orderPanel.reapprovalState === 'pendingReapproval' && ['Approved', 'Completed'].includes(orderPanel.panelStatus))) return NextResponse.json({ success: false, message: 'Only a submitted order or a synced record pending reapproval can be approved.' }, { status: 400 });
      if (orderPanel.allocationEnabled) {
        const dropCheck = validatePackDropLocations(orderPanel.packData, orderPanel.plantRows, true);
        if (!dropCheck.ok) return NextResponse.json({ success: false, message: dropCheck.errors.join(' ') }, { status: 400 });
      }
      orderPanel.panelStatus = 'Approved';
      orderPanel.approvedBy = user.id;
      orderPanel.approvedAt = new Date();
      orderPanel.approvalRemarks = remarks || 'Approved via quick action';
    } else if (action === 'reject') {
      if (orderPanel.panelStatus !== 'Submitted' && !(orderPanel.reapprovalState === 'pendingReapproval' && ['Approved', 'Completed'].includes(orderPanel.panelStatus))) return NextResponse.json({ success: false, message: 'Only a submitted order or a synced record pending reapproval can be rejected.' }, { status: 400 });
      orderPanel.panelStatus = 'Rejected';
      orderPanel.approvedBy = user.id;
      orderPanel.approvedAt = new Date();
      orderPanel.approvalRemarks = remarks || 'Rejected via quick action';
    } else if (action === 'complete') {
      if (orderPanel.panelStatus !== 'Approved') return NextResponse.json({ success: false, message: 'Only an approved order can be completed.' }, { status: 400 });
      orderPanel.panelStatus = 'Completed';
      if (remarks) orderPanel.approvalRemarks = remarks;
    } else {
      return NextResponse.json({
        success: false,
        message: "Invalid action. Allowed: approve, reject, complete"
      }, { status: 400 });
    }

    if (action === 'reject' && ['pendingApproval', 'pendingReapproval'].includes(orderPanel.reapprovalState)) orderPanel.reapprovalState = 'unlocked';
    await orderPanel.save();
    if (action === 'approve') {
      try { await recordApprovedRevision('order', orderPanel._id, user); }
      catch (syncError) { return NextResponse.json({ success: false, message: `Order approved, but downstream sync failed and is blocked for admin retry: ${syncError.message}` }, { status: 503 }); }
    }

    if (action === 'approve' && orderPanel.panelStatus === 'Approved') {
      await notifyModuleCreateUsers({
        user, module: 'Vehicle Negotiation', panelLabel: 'Order Panel',
        reference: orderPanel.orderPanelNo, url: '/admin/vehicle-negotiation/create',
      });
    }

    await notifyModuleDecision({ user, record: orderPanel, module: 'Order Panel', reference: orderPanel.orderPanelNo, action, url: `/admin/order-panel/${orderPanel._id}` });

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

export const GET = withBranchAccess(branchHandlerGET);
export const POST = withBranchAccess(branchHandlerPOST);
export const PUT = withBranchAccess(branchHandlerPUT);
export const DELETE = withBranchAccess(branchHandlerDELETE);
export const PATCH = withBranchAccess(branchHandlerPATCH);
