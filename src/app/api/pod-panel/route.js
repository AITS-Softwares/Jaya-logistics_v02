// import { NextResponse } from "next/server";
// import connectDb from "@/lib/db";
// import POD from "./POD";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { getNextPODNumber } from "./PODCounter"
// import mongoose from 'mongoose';

// // Helper function to convert to number
// function num(value) {
//   if (value === null || value === undefined || value === '') return 0;
//   const n = Number(value);
//   return Number.isFinite(n) ? n : 0;
// }

// // Role-based access check
// function isAuthorized(user) {
//   return (
//     user?.type === "company" ||
//     user?.role === "Admin" ||
//     user?.permissions?.includes("pod_panel")
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

// /* ========================================
//    GET /api/pod-panel
// ======================================== */
// export async function GET(req) {
//   try {
//     await connectDb();
//     const { user, error, status } = await validateUser(req);
//     if (error) {
//       return NextResponse.json({ success: false, message: error }, { status });
//     }

//     const url = new URL(req.url);
//     const id = url.searchParams.get("id");
//     const podNo = url.searchParams.get("podNo");
//     const format = url.searchParams.get("format");
//     const search = url.searchParams.get("search");
//     const fromDate = url.searchParams.get("fromDate");
//     const toDate = url.searchParams.get("toDate");
//     const podStatus = url.searchParams.get("podStatus");

//     // CASE 1: GET SINGLE POD BY ID
//     if (id) {
//       if (!mongoose.Types.ObjectId.isValid(id)) {
//         return NextResponse.json({ 
//           success: false, 
//           message: "Invalid POD ID format" 
//         }, { status: 400 });
//       }

//       const pod = await POD.findOne({
//         _id: id,
//         companyId: user.companyId
//       }).lean();

//       if (!pod) {
//         return NextResponse.json({ 
//           success: false, 
//           message: "POD not found" 
//         }, { status: 404 });
//       }

//       return NextResponse.json({ 
//         success: true, 
//         data: pod 
//       }, { status: 200 });
//     }

//     // CASE 2: GET SINGLE POD BY POD NUMBER
//     if (podNo) {
//       const pod = await POD.findOne({
//         podNo: podNo,
//         companyId: user.companyId
//       }).lean();

//       if (!pod) {
//         return NextResponse.json({ 
//           success: false, 
//           message: "POD not found" 
//         }, { status: 404 });
//       }

//       return NextResponse.json({ 
//         success: true, 
//         data: pod 
//       }, { status: 200 });
//     }

//     // CASE 3: TABLE FORMAT FOR LIST VIEW
//     if (format === 'table') {
//       let query = { companyId: user.companyId };

//       if (search) {
//         query.$or = [
//           { podNo: { $regex: search, $options: 'i' } },
//           { purchaseNo: { $regex: search, $options: 'i' } },
//           { 'vendorFinancial.vendorName': { $regex: search, $options: 'i' } },
//           { 'purchaseOrders.orderNo': { $regex: search, $options: 'i' } }
//         ];
//       }

//       if (podStatus) {
//         query.podStatus = podStatus;
//       }

//       if (fromDate || toDate) {
//         query.createdAt = {};
//         if (fromDate) {
//           query.createdAt.$gte = new Date(fromDate);
//         }
//         if (toDate) {
//           query.createdAt.$lte = new Date(toDate + 'T23:59:59');
//         }
//       }

//       const pods = await POD.find(query)
//         .sort({ createdAt: -1 })
//         .lean();

//       const tableData = pods.map(pod => ({
//   _id: pod._id,
//   podNo: pod.podNo,
//   date: pod.createdAt ? new Date(pod.createdAt).toLocaleDateString('en-IN') : '',
//   purchaseNo: pod.purchaseNo,
//   orderNo: pod.purchaseOrders?.[0]?.orderNo || '',
//   partyName: pod.purchaseOrders?.[0]?.partyName || '',
//   plantCode: pod.purchaseOrders?.[0]?.plantCode || '',
//   orderType: pod.purchaseOrders?.[0]?.orderType || '',
//   pinCode: pod.purchaseOrders?.[0]?.pinCode || '',
//   state: pod.purchaseOrders?.[0]?.state || '',
//   district: pod.purchaseOrders?.[0]?.district || '',
//   from: pod.purchaseOrders?.[0]?.from || '',
//   to: pod.purchaseOrders?.[0]?.to || '',
//   weight: pod.purchaseOrders?.[0]?.weight || 0,
//   unloading: pod.podStatus || 'Pending',
//   podUpload: pod.lrEntries?.[0]?.podUpload === 'UPLOADED' ? 'Completed' : 'Pending',
//   podReceived: pod.lrEntries?.[0]?.podReceived || 'Pending',
//   inPersonParsal: pod.lrEntries?.[0]?.inPersonParsal || '', // ADD THIS LINE
//   vendorName: pod.vendorFinancial?.vendorName || '',
//   vendorCode: pod.vendorFinancial?.vendorCode || '',
//   vehicleNo: '',
//   totalAmount: pod.vendorFinancial?.total || 0,
//   paymentStatus: pod.paymentStatus || 'Pending'
// }));

//       return NextResponse.json({
//         success: true,
//         data: tableData,
//         count: tableData.length
//       }, { status: 200 });
//     }

//     // CASE 4: LIST FOR DROPDOWNS
//     const pods = await POD.find({ 
//       companyId: user.companyId 
//     })
//     .select('podNo purchaseNo podStatus')
//     .sort({ createdAt: -1 })
//     .lean();

//     return NextResponse.json({
//       success: true,
//       data: pods
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ GET /pod-panel error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to fetch PODs"
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    POST /api/pod-panel - Create New
// ======================================== */
// export async function POST(req) {
//   try {
//     await connectDb();
//     const { user, error, status } = await validateUser(req);
//     if (error) {
//       return NextResponse.json({ success: false, message: error }, { status });
//     }

//     const body = await req.json();
    
//     console.log("📝 Creating new POD");

//     // Generate POD number
//     const podNo = await getNextPODNumber(user.companyId);

//     // Process data
//     const purchaseOrders = (body.purchaseOrders || []).map(order => ({
//       orderNo: order.orderNo || '',
//       partyName: order.partyName || '',
//       branch: order.branch || '',
//       plantCode: order.plantCode || '',
//       orderType: order.orderType || '',
//       pinCode: order.pinCode || '',
//       state: order.state || '',
//       district: order.district || '',
//       from: order.from || '',
//       to: order.to || '',
//       locationRate: order.locationRate || '',
//       weight: num(order.weight)
//     }));

//    const lrEntries = (body.lrEntries || []).map(lr => ({
//   _id: lr._id,
//   lrNo: lr.lrNo || '',
//   lrDate: lr.lrDate || '',
//   orderNo: lr.orderNo || '',
//   delivery: lr.delivery || 'COURIER',
//   inPersonParsal: lr.inPersonParsal || '', // ADD THIS LINE
//   docketNo: lr.docketNo || '',
//   podDate: lr.podDate || '',
//   podUpload: lr.podUpload || '',
//   podReceived: lr.podReceived || 'Pending'
// }));

//     const products = (body.products || []).map(product => ({
//       _id: product._id,
//       lrRefId: product.lrRefId || '',
//       productName: product.productName || '',
//       totalPkgs: product.totalPkgs || '',
//       pkgsType: product.pkgsType || '',
//       uom: product.uom || '',
//       packSize: product.packSize || '',
//       skuSize: product.skuSize || '',
//       wtLtr: product.wtLtr || '',
//       actualWt: product.actualWt || '',
//       deliveryStatus: product.deliveryStatus || '',
//       deduction: product.deduction || '',
//       value: product.value || ''
//     }));

//     // Calculate totals
//     const totalQuantity = products.reduce((sum, p) => sum + num(p.totalPkgs), 0);
//     const totalActualWt = products.reduce((sum, p) => sum + num(p.actualWt), 0);
//     const podDeduction = products.reduce((sum, p) => sum + num(p.value), 0);
    
//     const vendorTotal = body.vendorFinancial?.total || 0;
//     const advance = body.vendorFinancial?.advance || 0;
//     const poDeduction = body.vendorFinancial?.poDeduction || 0;
//     const finalBalance = vendorTotal - advance - poDeduction - podDeduction;

//     // Create POD document
//     const pod = new POD({
//       podNo,
//       purchaseNo: body.purchaseNo || '',
//       pricingSerialNo: body.pricingSerialNo || '',
      
//       header: {
//         podNo,
//         purchaseNo: body.purchaseNo || '',
//         pricingSerialNo: body.pricingSerialNo || '',
//         branch: body.header?.branch || '',
//         date: body.header?.date ? new Date(body.header.date) : new Date(),
//         delivery: body.header?.delivery || 'Normal'
//       },
      
//       billing: {
//         billingType: body.billing?.billingType || 'Multi - Order',
//         noOfLoadingPoints: body.billing?.noOfLoadingPoints || '',
//         noOfDroppingPoint: body.billing?.noOfDroppingPoint || ''
//       },
      
//       purchaseOrders,
//       lrEntries,
//       products,
      
//       // In POST method, update vendorFinancial:
// vendorFinancial: {
//   vendorName: body.vendorFinancial?.vendorName || '',
//   vendorCode: body.vendorFinancial?.vendorCode || '',  // ADD THIS
//   total: vendorTotal,
//   advance: advance,
//   balance: vendorTotal - advance,
//   poDeduction: poDeduction,
//   podDeduction: body.vendorFinancial?.podDeduction || 0,  // ADD THIS
//   finalBalance: finalBalance
// },
      
//       podStatusSection: {
//         lastPodDate: body.podStatusSection?.lastPodDate || '',
//         podStatus: body.podStatusSection?.podStatus || 'Pending',
//         dueDate: body.podStatusSection?.dueDate || '',
//         paymentDate: body.podStatusSection?.paymentDate || '',
//         acknowledgementMail: body.podStatusSection?.acknowledgementMail || false,
//         note: body.podStatusSection?.note || ''
//       },
      
//       remarks: body.remarks || '',
      
//       totalQuantity,
//       totalActualWt,
//       podDeduction,
//       finalBalance,
      
//       podStatus: body.podStatus || 'Pending',
//       paymentStatus: body.paymentStatus || 'Pending',
      
//       companyId: user.companyId,
//       createdBy: user.id
//     });

//     await pod.save();

//     return NextResponse.json({ 
//       success: true, 
//       message: "POD created successfully",
//       data: {
//         _id: pod._id,
//         podNo: pod.podNo,
//         purchaseNo: pod.purchaseNo
//       }
//     }, { status: 201 });

//   } catch (error) {
//     console.error("❌ POST /pod-panel error:", error);

//     if (error.code === 11000) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "POD number already exists" 
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
//       message: error.message || "Failed to create POD"
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    PUT /api/pod-panel - Update
// ======================================== */
// export async function PUT(req) {
//   try {
//     await connectDb();
//     const { user, error, status } = await validateUser(req);
//     if (error) {
//       return NextResponse.json({ success: false, message: error }, { status });
//     }

//     const body = await req.json();
//     const { id } = body;
    
//     if (!id) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "POD ID is required" 
//       }, { status: 400 });
//     }

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Invalid POD ID format" 
//       }, { status: 400 });
//     }

//     const pod = await POD.findOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (!pod) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "POD not found" 
//       }, { status: 404 });
//     }

//     // Update header
//     if (body.header) {
//       pod.header = {
//         ...pod.header,
//         ...body.header,
//         date: body.header.date ? new Date(body.header.date) : pod.header.date
//       };
//     }

//     // Update billing
//     if (body.billing) {
//       pod.billing = {
//         ...pod.billing,
//         ...body.billing
//       };
//     }

//     // Update purchase orders
//     if (body.purchaseOrders) {
//       pod.purchaseOrders = body.purchaseOrders.map(order => ({
//         orderNo: order.orderNo || '',
//         partyName: order.partyName || '',
//         branch: order.branch || '',
//         plantCode: order.plantCode || '',
//         orderType: order.orderType || '',
//         pinCode: order.pinCode || '',
//         state: order.state || '',
//         district: order.district || '',
//         from: order.from || '',
//         to: order.to || '',
//         locationRate: order.locationRate || '',
//         weight: num(order.weight)
//       }));
//     }

//     // Update LR entries
// if (body.lrEntries) {
//   pod.lrEntries = body.lrEntries.map(lr => ({
//     _id: lr._id,
//     lrNo: lr.lrNo || '',
//     lrDate: lr.lrDate || '',
//     orderNo: lr.orderNo || '',
//     delivery: lr.delivery || 'COURIER',
//     inPersonParsal: lr.inPersonParsal || '', // ADD THIS LINE
//     docketNo: lr.docketNo || '',
//     podDate: lr.podDate || '',
//     podUpload: lr.podUpload || '',
//     podReceived: lr.podReceived || 'Pending'
//   }));
// }

//     // Update products
//     if (body.products) {
//       pod.products = body.products.map(product => ({
//         _id: product._id,
//         lrRefId: product.lrRefId || '',
//         productName: product.productName || '',
//         totalPkgs: product.totalPkgs || '',
//         pkgsType: product.pkgsType || '',
//         uom: product.uom || '',
//         packSize: product.packSize || '',
//         skuSize: product.skuSize || '',
//         wtLtr: product.wtLtr || '',
//         actualWt: product.actualWt || '',
//         deliveryStatus: product.deliveryStatus || '',
//         deduction: product.deduction || '',
//         value: product.value || ''
//       }));
//     }

//     // Update vendor financial
//     if (body.vendorFinancial) {
//       pod.vendorFinancial = {
//         ...pod.vendorFinancial,
//         ...body.vendorFinancial
//       };
//     }

//     // Update pod status section
//     if (body.podStatusSection) {
//       pod.podStatusSection = {
//         ...pod.podStatusSection,
//         ...body.podStatusSection
//       };
//     }

//     // Update remarks
//     if (body.remarks !== undefined) {
//       pod.remarks = body.remarks;
//     }

//     // Update statuses
//     if (body.podStatus) pod.podStatus = body.podStatus;
//     if (body.paymentStatus) pod.paymentStatus = body.paymentStatus;

//     // Recalculate totals
//     pod.totalQuantity = pod.products.reduce((sum, p) => sum + num(p.totalPkgs), 0);
//     pod.totalActualWt = pod.products.reduce((sum, p) => sum + num(p.actualWt), 0);
//     pod.podDeduction = pod.products.reduce((sum, p) => sum + num(p.value), 0);
    
//     const total = pod.vendorFinancial?.total || 0;
//     const advance = pod.vendorFinancial?.advance || 0;
//     const poDeduction = pod.vendorFinancial?.poDeduction || 0;
//     pod.finalBalance = total - advance - poDeduction - pod.podDeduction;

//     await pod.save();

//     return NextResponse.json({ 
//       success: true, 
//       message: "POD updated successfully",
//       data: {
//         _id: pod._id,
//         podNo: pod.podNo,
//         purchaseNo: pod.purchaseNo
//       }
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ PUT /pod-panel error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to update POD"
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    DELETE /api/pod-panel - Delete
// ======================================== */
// export async function DELETE(req) {
//   try {
//     await connectDb();
//     const { user, error, status } = await validateUser(req);
//     if (error) {
//       return NextResponse.json({ success: false, message: error }, { status });
//     }

//     const url = new URL(req.url);
//     const id = url.searchParams.get("id");
    
//     if (!id) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "POD ID is required" 
//       }, { status: 400 });
//     }

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Invalid POD ID format" 
//       }, { status: 400 });
//     }

//     const pod = await POD.findOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (!pod) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "POD not found" 
//       }, { status: 404 });
//     }

//     await POD.deleteOne({ _id: id, companyId: user.companyId });

//     console.log(`✅ POD deleted: ${pod.podNo}`);

//     return NextResponse.json({ 
//       success: true, 
//       message: "POD deleted successfully",
//       data: {
//         podNo: pod.podNo,
//         purchaseNo: pod.purchaseNo
//       }
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ DELETE /pod-panel error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to delete POD"
//     }, { status: 500 });
//   }
// }

import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import POD from "./POD";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { getNextPODNumber } from "./PODCounter";
import mongoose from 'mongoose';

// ── PERMISSION FUNCTIONS ──

function isAuthorized(user) {
  if (!user) return false;
  
  // Company admins have full access
  if (user.type === "company") return true;
  
  // Admin role has full access
  if (user.roles && user.roles.includes("Admin")) return true;
  
  // Check module-based permissions for "Proof Of Delivery"
  const modules = user.modules || {};
  const moduleData = modules["Proof Of Delivery"];
  
  if (!moduleData || !moduleData.selected) return false;
  
  return true;
}

function hasPermission(user, action) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.roles && user.roles.includes("Admin")) return true;
  
  const modules = user.modules || {};
  const moduleData = modules["Proof Of Delivery"];
  
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
    
    if (!isAuthorized(user)) {
      return { 
        error: "Access denied. You don't have permission to access Proof of Delivery.", 
        status: 403 
      };
    }
    
    if (requiredAction && !hasPermission(user, requiredAction)) {
      return { 
        error: `Permission denied: ${requiredAction} action not allowed for Proof of Delivery.`, 
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
   GET /api/pod-panel - Requires 'view' permission
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
    const podNo = url.searchParams.get("podNo");
    const format = url.searchParams.get("format");
    const search = url.searchParams.get("search");
    const fromDate = url.searchParams.get("fromDate");
    const toDate = url.searchParams.get("toDate");
    const podStatus = url.searchParams.get("podStatus");

    // CASE 1: GET SINGLE POD BY ID
    if (id) {
      if (!isValidObjectId(id)) {
        return NextResponse.json({ 
          success: false, 
          message: "Invalid POD ID format" 
        }, { status: 400 });
      }

      const pod = await POD.findOne({
        _id: id,
        companyId: user.companyId
      }).lean();

      if (!pod) {
        return NextResponse.json({ 
          success: false, 
          message: "POD not found" 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        data: pod 
      }, { status: 200 });
    }

    // CASE 2: GET SINGLE POD BY POD NUMBER
    if (podNo) {
      const pod = await POD.findOne({
        podNo: podNo,
        companyId: user.companyId
      }).lean();

      if (!pod) {
        return NextResponse.json({ 
          success: false, 
          message: "POD not found" 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        data: pod 
      }, { status: 200 });
    }

    // CASE 3: TABLE FORMAT FOR LIST VIEW
    if (format === 'table') {
      let query = { companyId: user.companyId };

      if (search) {
        query.$or = [
          { podNo: { $regex: search, $options: 'i' } },
          { purchaseNo: { $regex: search, $options: 'i' } },
          { 'vendorFinancial.vendorName': { $regex: search, $options: 'i' } },
          { 'purchaseOrders.orderNo': { $regex: search, $options: 'i' } }
        ];
      }

      if (podStatus) {
        query.podStatus = podStatus;
      }

      if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) {
          query.createdAt.$gte = new Date(fromDate);
        }
        if (toDate) {
          query.createdAt.$lte = new Date(toDate + 'T23:59:59');
        }
      }

      const pods = await POD.find(query)
        .sort({ createdAt: -1 })
        .lean();

      const tableData = pods.map(pod => ({
        _id: pod._id,
        podNo: pod.podNo,
        date: pod.createdAt ? new Date(pod.createdAt).toLocaleDateString('en-IN') : '',
        purchaseNo: pod.purchaseNo,
        orderNo: pod.purchaseOrders?.[0]?.orderNo || '',
        partyName: pod.purchaseOrders?.[0]?.partyName || '',
        plantCode: pod.purchaseOrders?.[0]?.plantCode || '',
        orderType: pod.purchaseOrders?.[0]?.orderType || '',
        pinCode: pod.purchaseOrders?.[0]?.pinCode || '',
        state: pod.purchaseOrders?.[0]?.state || '',
        district: pod.purchaseOrders?.[0]?.district || '',
        from: pod.purchaseOrders?.[0]?.from || '',
        to: pod.purchaseOrders?.[0]?.to || '',
        weight: pod.purchaseOrders?.[0]?.weight || 0,
        unloading: pod.podStatus || 'Pending',
        podUpload: pod.lrEntries?.[0]?.podUpload === 'UPLOADED' ? 'Completed' : 'Pending',
        podReceived: pod.lrEntries?.[0]?.podReceived || 'Pending',
        inPersonParsal: pod.lrEntries?.[0]?.inPersonParsal || '',
        vendorName: pod.vendorFinancial?.vendorName || '',
        vendorCode: pod.vendorFinancial?.vendorCode || '',
        vehicleNo: '',
        totalAmount: pod.vendorFinancial?.total || 0,
        paymentStatus: pod.paymentStatus || 'Pending'
      }));

      return NextResponse.json({
        success: true,
        data: tableData,
        count: tableData.length
      }, { status: 200 });
    }

    // CASE 4: LIST FOR DROPDOWNS
    const pods = await POD.find({ 
      companyId: user.companyId 
    })
    .select('podNo purchaseNo podStatus')
    .sort({ createdAt: -1 })
    .lean();

    return NextResponse.json({
      success: true,
      data: pods
    }, { status: 200 });

  } catch (error) {
    console.error("❌ GET /pod-panel error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to fetch PODs"
    }, { status: 500 });
  }
}

/* ========================================
   POST /api/pod-panel - Requires 'create' permission
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
    
    console.log("📝 Creating new POD");

    const podNo = await getNextPODNumber(user.companyId);

    const purchaseOrders = (body.purchaseOrders || []).map(order => ({
      orderNo: order.orderNo || '',
      partyName: order.partyName || '',
      branch: order.branch || '',
      plantCode: order.plantCode || '',
      orderType: order.orderType || '',
      pinCode: order.pinCode || '',
      state: order.state || '',
      district: order.district || '',
      from: order.from || '',
      to: order.to || '',
      locationRate: order.locationRate || '',
      weight: num(order.weight)
    }));

    const lrEntries = (body.lrEntries || []).map(lr => ({
      _id: lr._id,
      lrNo: lr.lrNo || '',
      lrDate: lr.lrDate || '',
      orderNo: lr.orderNo || '',
      delivery: lr.delivery || 'COURIER',
      inPersonParsal: lr.inPersonParsal || '',
      docketNo: lr.docketNo || '',
      podDate: lr.podDate || '',
      podUpload: lr.podUpload || '',
      podReceived: lr.podReceived || 'Pending'
    }));

    const products = (body.products || []).map(product => ({
      _id: product._id,
      lrRefId: product.lrRefId || '',
      productName: product.productName || '',
      totalPkgs: product.totalPkgs || '',
      pkgsType: product.pkgsType || '',
      uom: product.uom || '',
      packSize: product.packSize || '',
      skuSize: product.skuSize || '',
      wtLtr: product.wtLtr || '',
      actualWt: product.actualWt || '',
      deliveryStatus: product.deliveryStatus || '',
      deduction: product.deduction || '',
      value: product.value || ''
    }));

    const totalQuantity = products.reduce((sum, p) => sum + num(p.totalPkgs), 0);
    const totalActualWt = products.reduce((sum, p) => sum + num(p.actualWt), 0);
    const podDeduction = products.reduce((sum, p) => sum + num(p.value), 0);
    
    const vendorTotal = body.vendorFinancial?.total || 0;
    const advance = body.vendorFinancial?.advance || 0;
    const poDeduction = body.vendorFinancial?.poDeduction || 0;
    const finalBalance = vendorTotal - advance - poDeduction - podDeduction;

    const pod = new POD({
      podNo,
      purchaseNo: body.purchaseNo || '',
      pricingSerialNo: body.pricingSerialNo || '',
      
      header: {
        podNo,
        purchaseNo: body.purchaseNo || '',
        pricingSerialNo: body.pricingSerialNo || '',
        branch: body.header?.branch || '',
        date: body.header?.date ? new Date(body.header.date) : new Date(),
        delivery: body.header?.delivery || 'Normal'
      },
      
      billing: {
        billingType: body.billing?.billingType || 'Multi - Order',
        noOfLoadingPoints: body.billing?.noOfLoadingPoints || '',
        noOfDroppingPoint: body.billing?.noOfDroppingPoint || ''
      },
      
      purchaseOrders,
      lrEntries,
      products,
      
      vendorFinancial: {
        vendorName: body.vendorFinancial?.vendorName || '',
        vendorCode: body.vendorFinancial?.vendorCode || '',
        total: vendorTotal,
        advance: advance,
        balance: vendorTotal - advance,
        poDeduction: poDeduction,
        podDeduction: body.vendorFinancial?.podDeduction || 0,
        finalBalance: finalBalance
      },
      
      podStatusSection: {
        lastPodDate: body.podStatusSection?.lastPodDate || '',
        podStatus: body.podStatusSection?.podStatus || 'Pending',
        dueDate: body.podStatusSection?.dueDate || '',
        paymentDate: body.podStatusSection?.paymentDate || '',
        acknowledgementMail: body.podStatusSection?.acknowledgementMail || false,
        note: body.podStatusSection?.note || ''
      },
      
      remarks: body.remarks || '',
      
      totalQuantity,
      totalActualWt,
      podDeduction,
      finalBalance,
      
      podStatus: body.podStatus || 'Pending',
      paymentStatus: body.paymentStatus || 'Pending',
      
      companyId: user.companyId,
      createdBy: user.id
    });

    await pod.save();

    return NextResponse.json({ 
      success: true, 
      message: "POD created successfully",
      data: {
        _id: pod._id,
        podNo: pod.podNo,
        purchaseNo: pod.purchaseNo
      }
    }, { status: 201 });

  } catch (error) {
    console.error("❌ POST /pod-panel error:", error);

    if (error.code === 11000) {
      return NextResponse.json({ 
        success: false, 
        message: "POD number already exists" 
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
      message: error.message || "Failed to create POD"
    }, { status: 500 });
  }
}

/* ========================================
   PUT /api/pod-panel - Requires 'edit' permission
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
        message: "POD ID is required" 
      }, { status: 400 });
    }

    if (!isValidObjectId(id)) {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid POD ID format" 
      }, { status: 400 });
    }

    const pod = await POD.findOne({
      _id: id,
      companyId: user.companyId
    });

    if (!pod) {
      return NextResponse.json({ 
        success: false, 
        message: "POD not found" 
      }, { status: 404 });
    }

    // Update header
    if (body.header) {
      pod.header = {
        ...pod.header,
        ...body.header,
        date: body.header.date ? new Date(body.header.date) : pod.header.date
      };
    }

    // Update billing
    if (body.billing) {
      pod.billing = {
        ...pod.billing,
        ...body.billing
      };
    }

    // Update purchase orders
    if (body.purchaseOrders) {
      pod.purchaseOrders = body.purchaseOrders.map(order => ({
        orderNo: order.orderNo || '',
        partyName: order.partyName || '',
        branch: order.branch || '',
        plantCode: order.plantCode || '',
        orderType: order.orderType || '',
        pinCode: order.pinCode || '',
        state: order.state || '',
        district: order.district || '',
        from: order.from || '',
        to: order.to || '',
        locationRate: order.locationRate || '',
        weight: num(order.weight)
      }));
    }

    // Update LR entries
    if (body.lrEntries) {
      pod.lrEntries = body.lrEntries.map(lr => ({
        _id: lr._id,
        lrNo: lr.lrNo || '',
        lrDate: lr.lrDate || '',
        orderNo: lr.orderNo || '',
        delivery: lr.delivery || 'COURIER',
        inPersonParsal: lr.inPersonParsal || '',
        docketNo: lr.docketNo || '',
        podDate: lr.podDate || '',
        podUpload: lr.podUpload || '',
        podReceived: lr.podReceived || 'Pending'
      }));
    }

    // Update products
    if (body.products) {
      pod.products = body.products.map(product => ({
        _id: product._id,
        lrRefId: product.lrRefId || '',
        productName: product.productName || '',
        totalPkgs: product.totalPkgs || '',
        pkgsType: product.pkgsType || '',
        uom: product.uom || '',
        packSize: product.packSize || '',
        skuSize: product.skuSize || '',
        wtLtr: product.wtLtr || '',
        actualWt: product.actualWt || '',
        deliveryStatus: product.deliveryStatus || '',
        deduction: product.deduction || '',
        value: product.value || ''
      }));
    }

    // Update vendor financial
    if (body.vendorFinancial) {
      pod.vendorFinancial = {
        ...pod.vendorFinancial,
        ...body.vendorFinancial
      };
    }

    // Update pod status section
    if (body.podStatusSection) {
      pod.podStatusSection = {
        ...pod.podStatusSection,
        ...body.podStatusSection
      };
    }

    // Update remarks
    if (body.remarks !== undefined) {
      pod.remarks = body.remarks;
    }

    // Update statuses
    if (body.podStatus) pod.podStatus = body.podStatus;
    if (body.paymentStatus) pod.paymentStatus = body.paymentStatus;

    // Recalculate totals
    pod.totalQuantity = pod.products.reduce((sum, p) => sum + num(p.totalPkgs), 0);
    pod.totalActualWt = pod.products.reduce((sum, p) => sum + num(p.actualWt), 0);
    pod.podDeduction = pod.products.reduce((sum, p) => sum + num(p.value), 0);
    
    const total = pod.vendorFinancial?.total || 0;
    const advance = pod.vendorFinancial?.advance || 0;
    const poDeduction = pod.vendorFinancial?.poDeduction || 0;
    pod.finalBalance = total - advance - poDeduction - pod.podDeduction;

    await pod.save();

    return NextResponse.json({ 
      success: true, 
      message: "POD updated successfully",
      data: {
        _id: pod._id,
        podNo: pod.podNo,
        purchaseNo: pod.purchaseNo
      }
    }, { status: 200 });

  } catch (error) {
    console.error("❌ PUT /pod-panel error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to update POD"
    }, { status: 500 });
  }
}

/* ========================================
   DELETE /api/pod-panel - Requires 'delete' permission
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
        message: "POD ID is required" 
      }, { status: 400 });
    }

    if (!isValidObjectId(id)) {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid POD ID format" 
      }, { status: 400 });
    }

    const pod = await POD.findOne({
      _id: id,
      companyId: user.companyId
    });

    if (!pod) {
      return NextResponse.json({ 
        success: false, 
        message: "POD not found" 
      }, { status: 404 });
    }

    await POD.deleteOne({ _id: id, companyId: user.companyId });

    console.log(`✅ POD deleted: ${pod.podNo}`);

    return NextResponse.json({ 
      success: true, 
      message: "POD deleted successfully",
      data: {
        podNo: pod.podNo,
        purchaseNo: pod.purchaseNo
      }
    }, { status: 200 });

  } catch (error) {
    console.error("❌ DELETE /pod-panel error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to delete POD"
    }, { status: 500 });
  }
}
/* ========================================
   PATCH /api/pod-panel - Requires 'approve' permission
   Handles: approve, reject, complete with full updates
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

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const action = url.searchParams.get("action");
    
    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ 
        success: false, 
        message: "Valid ID is required" 
      }, { status: 400 });
    }

    const pod = await POD.findOne({
      _id: id,
      companyId: user.companyId
    });

    if (!pod) {
      return NextResponse.json({ 
        success: false, 
        message: "POD not found" 
      }, { status: 404 });
    }

    // Get body for additional data
    const body = await req.json();

    // Handle different actions
    if (action === 'approve') {
      // Update pod status
      pod.podStatus = body.podStatus || 'Received';
      pod.paymentStatus = 'Approved';
      
      // Update pod status section
      if (pod.podStatusSection) {
        if (body.podStatusSection) {
          pod.podStatusSection = {
            ...pod.podStatusSection,
            ...body.podStatusSection,
            podStatus: body.podStatus || 'Received'
          };
        } else {
          pod.podStatusSection.podStatus = 'Received';
        }
      }
      
      // Update remarks if provided
      if (body.remarks !== undefined) {
        pod.remarks = body.remarks;
      }
      
      // Update LR entries pod received status
      if (pod.lrEntries && pod.lrEntries.length > 0) {
        pod.lrEntries.forEach(lr => {
          lr.podReceived = body.podStatus || 'Received';
        });
      }
      
      await pod.save();

      return NextResponse.json({ 
        success: true, 
        message: "POD approved successfully",
        data: {
          _id: pod._id,
          podNo: pod.podNo,
          podStatus: pod.podStatus,
          paymentStatus: pod.paymentStatus
        }
      }, { status: 200 });
    }

    if (action === 'reject') {
      pod.podStatus = body.podStatus || 'Rejected';
      pod.paymentStatus = 'Rejected';
      
      if (pod.podStatusSection) {
        if (body.podStatusSection) {
          pod.podStatusSection = {
            ...pod.podStatusSection,
            ...body.podStatusSection,
            podStatus: body.podStatus || 'Rejected'
          };
        } else {
          pod.podStatusSection.podStatus = 'Rejected';
        }
      }
      
      if (body.remarks !== undefined) {
        pod.remarks = body.remarks;
      }
      
      // Update LR entries pod received status
      if (pod.lrEntries && pod.lrEntries.length > 0) {
        pod.lrEntries.forEach(lr => {
          lr.podReceived = 'Rejected';
        });
      }
      
      await pod.save();

      return NextResponse.json({ 
        success: true, 
        message: "POD rejected successfully",
        data: {
          _id: pod._id,
          podNo: pod.podNo,
          podStatus: pod.podStatus,
          paymentStatus: pod.paymentStatus
        }
      }, { status: 200 });
    }

    if (action === 'complete') {
      pod.podStatus = body.podStatus || 'Completed';
      pod.paymentStatus = 'Paid';
      
      if (pod.podStatusSection) {
        if (body.podStatusSection) {
          pod.podStatusSection = {
            ...pod.podStatusSection,
            ...body.podStatusSection,
            podStatus: body.podStatus || 'Completed',
            paymentDate: new Date().toISOString()
          };
        } else {
          pod.podStatusSection.podStatus = 'Completed';
          pod.podStatusSection.paymentDate = new Date().toISOString();
        }
      }
      
      if (body.remarks !== undefined) {
        pod.remarks = body.remarks;
      }
      
      // Update LR entries pod received status
      if (pod.lrEntries && pod.lrEntries.length > 0) {
        pod.lrEntries.forEach(lr => {
          lr.podReceived = 'Completed';
        });
      }
      
      await pod.save();

      return NextResponse.json({ 
        success: true, 
        message: "POD completed successfully",
        data: {
          _id: pod._id,
          podNo: pod.podNo,
          podStatus: pod.podStatus,
          paymentStatus: pod.paymentStatus
        }
      }, { status: 200 });
    }

    // Update status only (for Pending updates)
    if (action === 'update-status') {
      if (body.podStatus) {
        pod.podStatus = body.podStatus;
        if (pod.podStatusSection) {
          pod.podStatusSection.podStatus = body.podStatus;
        }
      }
      
      if (body.remarks !== undefined) {
        pod.remarks = body.remarks;
      }
      
      if (body.podStatusSection) {
        pod.podStatusSection = {
          ...pod.podStatusSection,
          ...body.podStatusSection
        };
      }
      
      await pod.save();

      return NextResponse.json({ 
        success: true, 
        message: `POD status updated to ${pod.podStatus}`,
        data: {
          _id: pod._id,
          podNo: pod.podNo,
          podStatus: pod.podStatus,
          paymentStatus: pod.paymentStatus
        }
      }, { status: 200 });
    }

    return NextResponse.json({ 
      success: false, 
      message: "Invalid action. Allowed: approve, reject, complete, update-status" 
    }, { status: 400 });

  } catch (error) {
    console.error("❌ PATCH /pod-panel error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to update POD status"
    }, { status: 500 });
  }
}