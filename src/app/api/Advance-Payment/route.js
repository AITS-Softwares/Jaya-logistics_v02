// // import { NextResponse } from "next/server";
// // import connectDb from "@/lib/db";
// // import AdvancePayment from "./AdvancePayment";
// // import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// // import { getNextAdvancePaymentNumber } from "./AdvancePaymentCounter";
// // import mongoose from 'mongoose';

// // // Helper function to convert to number
// // function num(value) {
// //   if (value === null || value === undefined || value === '') return 0;
// //   const n = Number(value);
// //   return Number.isFinite(n) ? n : 0;
// // }

// // // Role-based access check
// // function isAuthorized(user) {
// //   return (
// //     user?.type === "company" ||
// //     user?.role === "Admin" ||
// //     user?.permissions?.includes("advance_payment")
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
// //    GET /api/advance-payment
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
// //     const paymentNo = url.searchParams.get("paymentNo");
// //     const purchaseNo = url.searchParams.get("purchaseNo");
// //     const format = url.searchParams.get("format");
// //     const search = url.searchParams.get("search");
// //     const fromDate = url.searchParams.get("fromDate");
// //     const toDate = url.searchParams.get("toDate");
// //     const statusFilter = url.searchParams.get("status");

// //     // CASE 1: GET SINGLE BY ID
// //     if (id) {
// //       if (!mongoose.Types.ObjectId.isValid(id)) {
// //         return NextResponse.json({ 
// //           success: false, 
// //           message: "Invalid advance payment ID format" 
// //         }, { status: 400 });
// //       }

// //       const payment = await AdvancePayment.findOne({
// //         _id: id,
// //         companyId: user.companyId
// //       }).lean();

// //       if (!payment) {
// //         return NextResponse.json({ 
// //           success: false, 
// //           message: "Advance payment not found" 
// //         }, { status: 404 });
// //       }

// //       return NextResponse.json({ 
// //         success: true, 
// //         data: payment 
// //       }, { status: 200 });
// //     }

// //     // CASE 2: GET BY PAYMENT NUMBER
// //     if (paymentNo) {
// //       const payment = await AdvancePayment.findOne({
// //         paymentNo: paymentNo,
// //         companyId: user.companyId
// //       }).lean();

// //       if (!payment) {
// //         return NextResponse.json({ 
// //           success: false, 
// //           message: "Advance payment not found" 
// //         }, { status: 404 });
// //       }

// //       return NextResponse.json({ 
// //         success: true, 
// //         data: payment 
// //       }, { status: 200 });
// //     }

// //     // CASE 3: GET BY PURCHASE NUMBER
// // if (purchaseNo) {
// //   console.log(`🔍 Searching for Advance Payment with purchaseNo: "${purchaseNo}"`);
// //   console.log(`Company ID: ${user.companyId}`);

// //   const payment = await AdvancePayment.findOne({
// //     purchaseNo: purchaseNo,
// //     companyId: user.companyId
// //   }).lean();

// //   console.log("✅ Found payment:", payment ? payment.paymentNo : "NOT FOUND");
// //   console.log("Payment data:", payment);

// //   return NextResponse.json({ 
// //     success: true, 
// //     data: payment || null,
// //     exists: !!payment
// //   }, { status: 200 });
// // }

// //     // CASE 4: TABLE FORMAT FOR LIST VIEW
// //     if (format === 'table') {
// //       let query = { companyId: user.companyId };

// //       if (search) {
// //         query.$or = [
// //           { paymentNo: { $regex: search, $options: 'i' } },
// //           { purchaseNo: { $regex: search, $options: 'i' } },
// //           { pricingSerialNo: { $regex: search, $options: 'i' } },
// //           { 'vendorDetails.vendorName': { $regex: search, $options: 'i' } },
// //           { 'vendorDetails.vendorCode': { $regex: search, $options: 'i' } },
// //           { 'vendorDetails.vehicleNo': { $regex: search, $options: 'i' } }
// //         ];
// //       }

// //       if (statusFilter) {
// //         query['paymentDetails.paymentStatus'] = statusFilter;
// //       }

// //       if (fromDate || toDate) {
// //         query.createdAt = {};
// //         if (fromDate) {
// //           query.createdAt.$gte = new Date(fromDate);
// //         }
// //         if (toDate) {
// //           query.createdAt.$lte = new Date(toDate + 'T23:59:59');
// //         }
// //       }

// //       const payments = await AdvancePayment.find(query)
// //         .sort({ createdAt: -1 })
// //         .lean();

// //       const tableData = payments.map(payment => ({
// //         _id: payment._id,
// //         date: payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('en-GB') : '',
// //         paymentNo: payment.paymentNo || 'N/A',
// //         purchaseNo: payment.purchaseNo || 'N/A',
// //         pricingSerialNo: payment.pricingSerialNo || 'N/A',
// //         vendorName: payment.vendorDetails?.vendorName || 'N/A',
// //         vendorCode: payment.vendorDetails?.vendorCode || 'N/A',
// //         vehicleNo: payment.vendorDetails?.vehicleNo || 'N/A',
// //         purchaseAmount: payment.purchaseAmountFromVNN || 0,
// //         advance: payment.vendorDetails?.advance || 0,
// //         balance: payment.balance || 0,
// //         finalAmount: payment.paymentDetails?.finalAmount || 0,
// //         status: payment.paymentDetails?.paymentStatus || 'Draft',
// //         queueGenerated: payment.queueGenerated || false
// //       }));

// //       return NextResponse.json({
// //         success: true,
// //         data: tableData,
// //         count: tableData.length
// //       }, { status: 200 });
// //     }

// //     // CASE 5: LIST FOR DROPDOWNS
// //     const payments = await AdvancePayment.find({ 
// //       companyId: user.companyId 
// //     })
// //     .select('paymentNo purchaseNo vendorDetails.vendorName purchaseAmountFromVNN paymentDetails.paymentStatus')
// //     .sort({ createdAt: -1 })
// //     .lean();

// //     return NextResponse.json({
// //       success: true,
// //       data: payments
// //     }, { status: 200 });

// //   } catch (error) {
// //     console.error("❌ GET /advance-payment error:", error);
// //     return NextResponse.json({ 
// //       success: false, 
// //       message: error.message || "Failed to fetch advance payments"
// //     }, { status: 500 });
// //   }
// // }

// // /* ========================================
// //    POST /api/advance-payment - Create New
// // ======================================== */
// // export async function POST(req) {
// //   try {
// //     await connectDb();
// //     const { user, error, status } = await validateUser(req);
// //     if (error) {
// //       return NextResponse.json({ success: false, message: error }, { status });
// //     }

// //     const body = await req.json();

// //     console.log("📝 Creating new advance payment");

// //     // Generate payment number
// //     let paymentNo = await getNextAdvancePaymentNumber(user.companyId);

// //     // Check if payment for this purchase already exists
// //     if (body.purchaseNo) {
// //       const existing = await AdvancePayment.findOne({
// //         purchaseNo: body.purchaseNo,
// //         companyId: user.companyId
// //       });

// //       if (existing) {
// //         return NextResponse.json({ 
// //           success: false, 
// //           message: `Advance payment already exists for Purchase No: ${body.purchaseNo}` 
// //         }, { status: 400 });
// //       }
// //     }

// //     // Process order rows with all fields
// //     const processedOrderRows = (body.orderRows || []).map(row => ({
// //       _id: new mongoose.Types.ObjectId(),
// //       orderNo: row.orderNo || '',
// //       partyName: row.partyName || '',
// //       plantCode: row.plantCode || '',
// //       plantName: row.plantName || '',
// //       orderType: row.orderType || 'Sales',
// //       pinCode: row.pinCode || '',
// //       state: row.state || '',
// //       district: row.district || '',
// //       from: row.from || '',
// //       to: row.to || '',
// //       locationRate: row.locationRate || '',
// //       priceList: row.priceList || '',
// //       weight: num(row.weight),
// //       rate: num(row.rate),
// //       totalAmount: num(row.totalAmount) || (num(row.weight) * num(row.rate)),
// //       collectionCharges: row.collectionCharges || '0',
// //       cancellationCharges: row.cancellationCharges || 'Nil',
// //       loadingCharges: row.loadingCharges || 'Nil',
// //       otherCharges: row.otherCharges || '0'
// //     }));

// //     // Process addition items
// //     const processedAdditionItems = (body.additions?.items || []).map(item => ({
// //       _id: new mongoose.Types.ObjectId(),
// //       description: item.description || 'Addition',
// //       amount: num(item.amount)
// //     }));

// //     // Process deduction items
// //     const processedDeductionItems = (body.deductions?.items || []).map(item => ({
// //       _id: new mongoose.Types.ObjectId(),
// //       description: item.description || 'Deduction',
// //       amount: num(item.amount)
// //     }));

// //     // Calculate totals
// //     const totalOrderAmount = processedOrderRows.reduce((sum, row) => {
// //       const totalAmount = row.totalAmount || 0;
// //       const collectionCharges = num(row.collectionCharges);
// //       const cancellationCharges = num(row.cancellationCharges);
// //       const loadingCharges = num(row.loadingCharges);
// //       const otherCharges = num(row.otherCharges);
// //       return sum + totalAmount + collectionCharges + cancellationCharges + loadingCharges + otherCharges;
// //     }, 0);

// //     const purchaseAmountFromVNN = num(body.purchaseAmountFromVNN) || num(body.vendorDetails?.amount) || totalOrderAmount;
// //     const advance = num(body.vendorDetails?.advance);
// //     const totalAdditions = processedAdditionItems.reduce((sum, item) => sum + (item.amount || 0), 0);
// //     const totalDeductions = processedDeductionItems.reduce((sum, item) => sum + (item.amount || 0), 0);
// //     const balance = purchaseAmountFromVNN - advance + totalAdditions - totalDeductions;

// //     // Handle branch ID
// //     let branchId = null;
// //     if (body.header?.branch) {
// //       if (mongoose.Types.ObjectId.isValid(body.header.branch)) {
// //         branchId = new mongoose.Types.ObjectId(body.header.branch);
// //       }
// //     }

// //     // Create advance payment
// //     const advancePayment = new AdvancePayment({
// //       paymentNo,
// //       purchaseNo: body.purchaseNo || body.header?.purchaseNo || '',
// //       purchaseId: body.purchaseDataId || null,
// //       pricingSerialNo: body.pricingSerialNo || body.header?.pricingSerialNo || '',
// //       purchaseAmountFromVNN,

// //       header: {
// //         purchaseNo: body.header?.purchaseNo || '',
// //         pricingSerialNo: body.header?.pricingSerialNo || '',
// //         branch: branchId,
// //         branchName: body.header?.branchName || '',
// //         branchCode: body.header?.branchCode || '',
// //         date: body.header?.date ? new Date(body.header.date) : new Date(),
// //         delivery: body.header?.delivery || 'Normal'
// //       },

// //       billing: {
// //         billingType: body.billing?.billingType || 'Multi - Order',
// //         noOfLoadingPoints: body.billing?.noOfLoadingPoints || '1',
// //         noOfDroppingPoint: body.billing?.noOfDroppingPoint || '1',
// //         collectionCharges: body.billing?.collectionCharges || '0',
// //         cancellationCharges: body.billing?.cancellationCharges || 'Nil',
// //         loadingCharges: body.billing?.loadingCharges || 'Nil',
// //         otherCharges: body.billing?.otherCharges || '0'
// //       },

// //       orderRows: processedOrderRows,

// //       purchaseTerms: {
// //         purchaseType: body.purchaseTerms?.purchaseType || 'Loading & Unloading',
// //         rateType: body.purchaseTerms?.rateType || 'Per MT',
// //         paymentTerms: body.purchaseTerms?.paymentTerms || '80 % Advance'
// //       },

// //       vendorDetails: {
// //         vendorStatus: body.vendorDetails?.vendorStatus || 'Active',
// //         vendorCode: body.vendorDetails?.vendorCode || '',
// //         vendorName: body.vendorDetails?.vendorName || '',
// //         vehicleNo: body.vendorDetails?.vehicleNo || '',
// //         rate: num(body.vendorDetails?.rate),
// //         weight: num(body.vendorDetails?.weight),
// //         amount: purchaseAmountFromVNN,
// //         advance: advance,
// //         accountNo: body.vendorDetails?.accountNo || body.vendorDetails?.bankAccountNumber || '',
// //         bankName: body.vendorDetails?.bankName || '',
// //         ifsc: body.vendorDetails?.ifsc || body.vendorDetails?.ifscCode || '',
// //         transactionId: body.vendorDetails?.transactionId || ''
// //       },

// //       additions: {
// //         totalAddition: totalAdditions,
// //         items: processedAdditionItems
// //       },

// //       deductions: {
// //         totalDeduction: totalDeductions,
// //         items: processedDeductionItems
// //       },

// //       paymentDetails: {
// //         vendorNameDebit: body.paymentDetails?.vendorNameDebit || body.vendorDetails?.vendorName || '',
// //         accountNoCredit: body.paymentDetails?.accountNoCredit || body.vendorDetails?.accountNo || '',
// //         finalAmount: num(body.paymentDetails?.finalAmount) || advance,
// //         remarks: body.paymentDetails?.remarks || 'ADV Payment',
// //         transactionId: body.paymentDetails?.transactionId || '',
// //         bankVendorCode: body.paymentDetails?.bankVendorCode || body.vendorDetails?.vendorCode || '',
// //         paymentDate: body.paymentDetails?.paymentDate ? new Date(body.paymentDetails.paymentDate) : new Date(),
// //         paymentStatus: body.paymentDetails?.paymentStatus || 'Pending'
// //       },

// //       memoFile: body.memoFile || null,

// //       balance,
// //       totalOrderAmount,

// //       status: 'Draft',
// //       queueGenerated: false,

// //       companyId: user.companyId,
// //       createdBy: user.id
// //     });

// //     await advancePayment.save();

// //     return NextResponse.json({ 
// //       success: true, 
// //       message: "Advance payment created successfully",
// //       data: {
// //         _id: advancePayment._id,
// //         paymentNo: advancePayment.paymentNo,
// //         purchaseNo: advancePayment.purchaseNo
// //       }
// //     }, { status: 201 });

// //   } catch (error) {
// //     console.error("❌ POST /advance-payment error:", error);

// //     if (error.code === 11000) {
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: "Payment number already exists" 
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
// //       message: error.message || "Failed to create advance payment"
// //     }, { status: 500 });
// //   }
// // }

// // /* ========================================
// //    PUT /api/advance-payment - Update
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
// //         message: "Advance payment ID is required" 
// //       }, { status: 400 });
// //     }

// //     if (!mongoose.Types.ObjectId.isValid(id)) {
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: "Invalid advance payment ID format" 
// //       }, { status: 400 });
// //     }

// //     const payment = await AdvancePayment.findOne({
// //       _id: id,
// //       companyId: user.companyId
// //     });

// //     if (!payment) {
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: "Advance payment not found" 
// //       }, { status: 404 });
// //     }

// //     // Check if payment is already completed/paid
// //     if (payment.paymentDetails?.paymentStatus === 'Paid' || payment.paymentDetails?.paymentStatus === 'Completed') {
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: `Cannot update ${payment.paymentDetails.paymentStatus} payment` 
// //       }, { status: 400 });
// //     }

// //     // Update purchase amount from VNN
// //     if (body.purchaseAmountFromVNN !== undefined) {
// //       payment.purchaseAmountFromVNN = num(body.purchaseAmountFromVNN);
// //     }

// //     // Update header
// //     if (body.header) {
// //       payment.header = {
// //         ...payment.header,
// //         ...body.header,
// //         branch: body.header.branch ? new mongoose.Types.ObjectId(body.header.branch) : payment.header.branch,
// //         date: body.header.date ? new Date(body.header.date) : payment.header.date
// //       };
// //     }

// //     // Update billing
// //     if (body.billing) {
// //       payment.billing = {
// //         ...payment.billing,
// //         ...body.billing
// //       };
// //     }

// //     // Update order rows
// //     if (body.orderRows) {
// //       payment.orderRows = body.orderRows.map(row => ({
// //         _id: row._id && mongoose.Types.ObjectId.isValid(row._id) 
// //           ? new mongoose.Types.ObjectId(row._id) 
// //           : new mongoose.Types.ObjectId(),
// //         orderNo: row.orderNo || '',
// //         partyName: row.partyName || '',
// //         plantCode: row.plantCode || '',
// //         plantName: row.plantName || '',
// //         orderType: row.orderType || 'Sales',
// //         pinCode: row.pinCode || '',
// //         state: row.state || '',
// //         district: row.district || '',
// //         from: row.from || '',
// //         to: row.to || '',
// //         locationRate: row.locationRate || '',
// //         priceList: row.priceList || '',
// //         weight: num(row.weight),
// //         rate: num(row.rate),
// //         totalAmount: num(row.totalAmount) || (num(row.weight) * num(row.rate)),
// //         collectionCharges: row.collectionCharges || '0',
// //         cancellationCharges: row.cancellationCharges || 'Nil',
// //         loadingCharges: row.loadingCharges || 'Nil',
// //         otherCharges: row.otherCharges || '0'
// //       }));
// //     }

// //     // Update purchase terms
// //     if (body.purchaseTerms) {
// //       payment.purchaseTerms = {
// //         ...payment.purchaseTerms,
// //         ...body.purchaseTerms
// //       };
// //     }

// //     // Update vendor details
// //     if (body.vendorDetails) {
// //       payment.vendorDetails = {
// //         ...payment.vendorDetails,
// //         ...body.vendorDetails,
// //         rate: num(body.vendorDetails.rate),
// //         weight: num(body.vendorDetails.weight),
// //         amount: num(body.vendorDetails.amount) || payment.purchaseAmountFromVNN,
// //         advance: num(body.vendorDetails.advance)
// //       };
// //     }

// //     // Update additions
// //     if (body.additions) {
// //       payment.additions = {
// //         totalAddition: num(body.additions.totalAddition),
// //         items: (body.additions.items || []).map(item => ({
// //           _id: item._id && mongoose.Types.ObjectId.isValid(item._id) 
// //             ? new mongoose.Types.ObjectId(item._id) 
// //             : new mongoose.Types.ObjectId(),
// //           description: item.description || 'Addition',
// //           amount: num(item.amount)
// //         }))
// //       };
// //     }

// //     // Update deductions
// //     if (body.deductions) {
// //       payment.deductions = {
// //         totalDeduction: num(body.deductions.totalDeduction),
// //         items: (body.deductions.items || []).map(item => ({
// //           _id: item._id && mongoose.Types.ObjectId.isValid(item._id) 
// //             ? new mongoose.Types.ObjectId(item._id) 
// //             : new mongoose.Types.ObjectId(),
// //           description: item.description || 'Deduction',
// //           amount: num(item.amount)
// //         }))
// //       };
// //     }

// //     // Update payment details
// //     if (body.paymentDetails) {
// //       payment.paymentDetails = {
// //         ...payment.paymentDetails,
// //         ...body.paymentDetails,
// //         finalAmount: num(body.paymentDetails.finalAmount),
// //         paymentDate: body.paymentDetails.paymentDate ? new Date(body.paymentDetails.paymentDate) : payment.paymentDetails.paymentDate
// //       };
// //     }

// //     // Update memo file
// //     if (body.memoFile !== undefined) {
// //       payment.memoFile = body.memoFile;
// //     }

// //     // Update queue generation
// //     if (body.queueGenerated !== undefined) {
// //       payment.queueGenerated = body.queueGenerated;
// //       if (body.queueGenerated) {
// //         payment.queueDate = new Date();
// //       }
// //     }

// //     // Update status
// //     if (body.status) {
// //       payment.status = body.status;
// //     }

// //     // The pre-save hook will recalculate balance
// //     await payment.save();

// //     return NextResponse.json({ 
// //       success: true, 
// //       message: "Advance payment updated successfully",
// //       data: {
// //         _id: payment._id,
// //         paymentNo: payment.paymentNo,
// //         purchaseNo: payment.purchaseNo
// //       }
// //     }, { status: 200 });

// //   } catch (error) {
// //     console.error("❌ PUT /advance-payment error:", error);
// //     return NextResponse.json({ 
// //       success: false, 
// //       message: error.message || "Failed to update advance payment"
// //     }, { status: 500 });
// //   }
// // }

// // /* ========================================
// //    DELETE /api/advance-payment - Delete
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

// //     if (!id || !mongoose.Types.ObjectId.isValid(id)) {
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: "Valid ID is required" 
// //       }, { status: 400 });
// //     }

// //     const payment = await AdvancePayment.findOne({
// //       _id: id,
// //       companyId: user.companyId
// //     });

// //     if (!payment) {
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: "Advance payment not found" 
// //       }, { status: 404 });
// //     }

// //     // Don't allow deletion of paid/completed payments
// //     if (payment.paymentDetails?.paymentStatus === 'Paid' || payment.paymentDetails?.paymentStatus === 'Completed') {
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: `Cannot delete ${payment.paymentDetails.paymentStatus} payment` 
// //       }, { status: 400 });
// //     }

// //     await AdvancePayment.deleteOne({
// //       _id: id,
// //       companyId: user.companyId
// //     });

// //     return NextResponse.json({ 
// //       success: true, 
// //       message: "Advance payment deleted successfully",
// //       data: {
// //         paymentNo: payment.paymentNo
// //       }
// //     }, { status: 200 });

// //   } catch (error) {
// //     console.error("❌ DELETE /advance-payment error:", error);
// //     return NextResponse.json({ 
// //       success: false, 
// //       message: error.message || "Failed to delete advance payment"
// //     }, { status: 500 });
// //   }
// // }

// // /* ========================================
// //    PATCH /api/advance-payment - Generate Queue
// // ======================================== */
// // export async function PATCH(req) {
// //   try {
// //     await connectDb();
// //     const { user, error, status } = await validateUser(req);
// //     if (error) {
// //       return NextResponse.json({ success: false, message: error }, { status });
// //     }

// //     const url = new URL(req.url);
// //     const id = url.searchParams.get("id");
// //     const action = url.searchParams.get("action");

// //     if (!id || !mongoose.Types.ObjectId.isValid(id)) {
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: "Valid ID is required" 
// //       }, { status: 400 });
// //     }

// //     const payment = await AdvancePayment.findOne({
// //       _id: id,
// //       companyId: user.companyId
// //     });

// //     if (!payment) {
// //       return NextResponse.json({ 
// //         success: false, 
// //         message: "Advance payment not found" 
// //       }, { status: 404 });
// //     }

// //     if (action === 'generate-queue') {
// //       payment.queueGenerated = true;
// //       payment.queueDate = new Date();
// //       payment.paymentDetails.paymentStatus = 'Paid';
// //       await payment.save();

// //       return NextResponse.json({ 
// //         success: true, 
// //         message: "Payment queue generated successfully",
// //         data: {
// //           _id: payment._id,
// //           paymentNo: payment.paymentNo,
// //           queueGenerated: true,
// //           queueDate: payment.queueDate
// //         }
// //       }, { status: 200 });
// //     }

// //     return NextResponse.json({ 
// //       success: false, 
// //       message: "Invalid action" 
// //     }, { status: 400 });

// //   } catch (error) {
// //     console.error("❌ PATCH /advance-payment error:", error);
// //     return NextResponse.json({ 
// //       success: false, 
// //       message: error.message || "Failed to process request"
// //     }, { status: 500 });
// //   }
// // }

// import { NextResponse } from "next/server";
// import connectDb from "@/lib/db";
// import AdvancePayment from "./AdvancePayment";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { getNextAdvancePaymentNumber } from "./AdvancePaymentCounter";
// import mongoose from 'mongoose';

// // ── PERMISSION FUNCTIONS ──

// function isAuthorized(user) {
//   if (!user) return false;

//   // Company admins have full access
//   if (user.type === "company") return true;

//   // Admin role has full access
//   if (user.roles && user.roles.includes("Admin")) return true;

//   // Check module-based permissions for "Advance Payment"
//   const modules = user.modules || {};
//   const moduleData = modules["Advance Payment"];

//   if (!moduleData || !moduleData.selected) return false;

//   return true;
// }

// function hasPermission(user, action) {
//   if (!user) return false;
//   if (user.type === "company") return true;
//   if (user.roles && user.roles.includes("Admin")) return true;

//   const modules = user.modules || {};
//   const moduleData = modules["Advance Payment"];

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
//         error: "Access denied. You don't have permission to access Advance Payments.", 
//         status: 403 
//       };
//     }

//     if (requiredAction && !hasPermission(user, requiredAction)) {
//       return { 
//         error: `Permission denied: ${requiredAction} action not allowed for Advance Payments.`, 
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
//    GET /api/advance-payment - Requires 'view' permission
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
//     const paymentNo = url.searchParams.get("paymentNo");
//     const purchaseNo = url.searchParams.get("purchaseNo");
//     const format = url.searchParams.get("format");
//     const search = url.searchParams.get("search");
//     const fromDate = url.searchParams.get("fromDate");
//     const toDate = url.searchParams.get("toDate");
//     const statusFilter = url.searchParams.get("status");

//     // CASE 1: GET SINGLE BY ID
//     if (id) {
//       if (!isValidObjectId(id)) {
//         return NextResponse.json({ 
//           success: false, 
//           message: "Invalid advance payment ID format" 
//         }, { status: 400 });
//       }

//       const payment = await AdvancePayment.findOne({
//         _id: id,
//         companyId: user.companyId
//       }).lean();

//       if (!payment) {
//         return NextResponse.json({ 
//           success: false, 
//           message: "Advance payment not found" 
//         }, { status: 404 });
//       }

//       return NextResponse.json({ 
//         success: true, 
//         data: payment 
//       }, { status: 200 });
//     }

//     // CASE 2: GET BY PAYMENT NUMBER
//     if (paymentNo) {
//       const payment = await AdvancePayment.findOne({
//         paymentNo: paymentNo,
//         companyId: user.companyId
//       }).lean();

//       if (!payment) {
//         return NextResponse.json({ 
//           success: false, 
//           message: "Advance payment not found" 
//         }, { status: 404 });
//       }

//       return NextResponse.json({ 
//         success: true, 
//         data: payment 
//       }, { status: 200 });
//     }

//     // CASE 3: GET BY PURCHASE NUMBER
//     if (purchaseNo) {
//       console.log(`🔍 Searching for Advance Payment with purchaseNo: "${purchaseNo}"`);

//       const payment = await AdvancePayment.findOne({
//         purchaseNo: purchaseNo,
//         companyId: user.companyId
//       }).lean();

//       console.log("✅ Found payment:", payment ? payment.paymentNo : "NOT FOUND");

//       return NextResponse.json({ 
//         success: true, 
//         data: payment || null,
//         exists: !!payment
//       }, { status: 200 });
//     }

//     // CASE 4: TABLE FORMAT FOR LIST VIEW
//     if (format === 'table') {
//       let query = { companyId: user.companyId };

//       if (search) {
//         query.$or = [
//           { paymentNo: { $regex: search, $options: 'i' } },
//           { purchaseNo: { $regex: search, $options: 'i' } },
//           { pricingSerialNo: { $regex: search, $options: 'i' } },
//           { 'vendorDetails.vendorName': { $regex: search, $options: 'i' } },
//           { 'vendorDetails.vendorCode': { $regex: search, $options: 'i' } },
//           { 'vendorDetails.vehicleNo': { $regex: search, $options: 'i' } }
//         ];
//       }

//       if (statusFilter) {
//         query['paymentDetails.paymentStatus'] = statusFilter;
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

//       const payments = await AdvancePayment.find(query)
//         .sort({ createdAt: -1 })
//         .lean();

//       const tableData = payments.map(payment => ({
//         _id: payment._id,
//         date: payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('en-GB') : '',
//         paymentNo: payment.paymentNo || 'N/A',
//         purchaseNo: payment.purchaseNo || 'N/A',
//         pricingSerialNo: payment.pricingSerialNo || 'N/A',
//         vendorName: payment.vendorDetails?.vendorName || 'N/A',
//         vendorCode: payment.vendorDetails?.vendorCode || 'N/A',
//         vehicleNo: payment.vendorDetails?.vehicleNo || 'N/A',
//         amount: payment.purchaseAmountFromVNN || 0,
//         advance: payment.vendorDetails?.advance || 0,
//         balance: payment.balance || 0,
//         finalAmount: payment.paymentDetails?.finalAmount || 0,
//         status: payment.paymentDetails?.paymentStatus || 'Draft',
//         queueGenerated: payment.queueGenerated || false
//       }));

//       return NextResponse.json({
//         success: true,
//         data: tableData,
//         count: tableData.length
//       }, { status: 200 });
//     }

//     // CASE 5: LIST FOR DROPDOWNS
//     const payments = await AdvancePayment.find({ 
//       companyId: user.companyId 
//     })
//     .select('paymentNo purchaseNo vendorDetails.vendorName purchaseAmountFromVNN paymentDetails.paymentStatus')
//     .sort({ createdAt: -1 })
//     .lean();

//     return NextResponse.json({
//       success: true,
//       data: payments
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ GET /advance-payment error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to fetch advance payments"
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    POST /api/advance-payment - Requires 'create' permission
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

//     console.log("📝 Creating new advance payment");

//     let paymentNo = await getNextAdvancePaymentNumber(user.companyId);

//     if (body.purchaseNo) {
//       const existing = await AdvancePayment.findOne({
//         purchaseNo: body.purchaseNo,
//         companyId: user.companyId
//       });

//       if (existing) {
//         return NextResponse.json({ 
//           success: false, 
//           message: `Advance payment already exists for Purchase No: ${body.purchaseNo}` 
//         }, { status: 400 });
//       }
//     }

//     const processedOrderRows = (body.orderRows || []).map(row => ({
//       _id: new mongoose.Types.ObjectId(),
//       orderNo: row.orderNo || '',
//       partyName: row.partyName || '',
//       plantCode: row.plantCode || '',
//       plantName: row.plantName || '',
//       orderType: row.orderType || 'Sales',
//       pinCode: row.pinCode || '',
//       state: row.state || '',
//       district: row.district || '',
//       from: row.from || '',
//       to: row.to || '',
//       locationRate: row.locationRate || '',
//       priceList: row.priceList || '',
//       weight: num(row.weight),
//       rate: num(row.rate),
//       totalAmount: num(row.totalAmount) || (num(row.weight) * num(row.rate)),
//       collectionCharges: row.collectionCharges || '0',
//       cancellationCharges: row.cancellationCharges || 'Nil',
//       loadingCharges: row.loadingCharges || 'Nil',
//       otherCharges: row.otherCharges || '0'
//     }));

//     const processedAdditionItems = (body.additions?.items || []).map(item => ({
//       _id: new mongoose.Types.ObjectId(),
//       description: item.description || 'Addition',
//       amount: num(item.amount)
//     }));

//     const processedDeductionItems = (body.deductions?.items || []).map(item => ({
//       _id: new mongoose.Types.ObjectId(),
//       description: item.description || 'Deduction',
//       amount: num(item.amount)
//     }));

//     const totalOrderAmount = processedOrderRows.reduce((sum, row) => {
//       const totalAmount = row.totalAmount || 0;
//       const collectionCharges = num(row.collectionCharges);
//       const cancellationCharges = num(row.cancellationCharges);
//       const loadingCharges = num(row.loadingCharges);
//       const otherCharges = num(row.otherCharges);
//       return sum + totalAmount + collectionCharges + cancellationCharges + loadingCharges + otherCharges;
//     }, 0);

//     const purchaseAmountFromVNN = num(body.purchaseAmountFromVNN) || num(body.vendorDetails?.amount) || totalOrderAmount;
//     const advance = num(body.vendorDetails?.advance);
//     const totalAdditions = processedAdditionItems.reduce((sum, item) => sum + (item.amount || 0), 0);
//     const totalDeductions = processedDeductionItems.reduce((sum, item) => sum + (item.amount || 0), 0);
//     const balance = purchaseAmountFromVNN - advance + totalAdditions - totalDeductions;

//     let branchId = null;
//     if (body.header?.branch) {
//       if (isValidObjectId(body.header.branch)) {
//         branchId = new mongoose.Types.ObjectId(body.header.branch);
//       }
//     }

//     const advancePayment = new AdvancePayment({
//       paymentNo,
//       purchaseNo: body.purchaseNo || body.header?.purchaseNo || '',
//       purchaseId: body.purchaseDataId || null,
//       pricingSerialNo: body.pricingSerialNo || body.header?.pricingSerialNo || '',
//       purchaseAmountFromVNN,

//       header: {
//         purchaseNo: body.header?.purchaseNo || '',
//         pricingSerialNo: body.header?.pricingSerialNo || '',
//         branch: branchId,
//         branchName: body.header?.branchName || '',
//         branchCode: body.header?.branchCode || '',
//         date: body.header?.date ? new Date(body.header.date) : new Date(),
//         delivery: body.header?.delivery || 'Normal'
//       },

//       billing: {
//         billingType: body.billing?.billingType || 'Multi - Order',
//         noOfLoadingPoints: body.billing?.noOfLoadingPoints || '1',
//         noOfDroppingPoint: body.billing?.noOfDroppingPoint || '1',
//         collectionCharges: body.billing?.collectionCharges || '0',
//         cancellationCharges: body.billing?.cancellationCharges || 'Nil',
//         loadingCharges: body.billing?.loadingCharges || 'Nil',
//         otherCharges: body.billing?.otherCharges || '0'
//       },

//       orderRows: processedOrderRows,

//       purchaseTerms: {
//         purchaseType: body.purchaseTerms?.purchaseType || 'Loading & Unloading',
//         rateType: body.purchaseTerms?.rateType || 'Per MT',
//         paymentTerms: body.purchaseTerms?.paymentTerms || '80 % Advance'
//       },

//       vendorDetails: {
//         vendorStatus: body.vendorDetails?.vendorStatus || 'Active',
//         vendorCode: body.vendorDetails?.vendorCode || '',
//         vendorName: body.vendorDetails?.vendorName || '',
//         vehicleNo: body.vendorDetails?.vehicleNo || '',
//         rate: num(body.vendorDetails?.rate),
//         weight: num(body.vendorDetails?.weight),
//         amount: purchaseAmountFromVNN,
//         advance: advance,
//         accountNo: body.vendorDetails?.accountNo || body.vendorDetails?.bankAccountNumber || '',
//         bankName: body.vendorDetails?.bankName || '',
//         ifsc: body.vendorDetails?.ifsc || body.vendorDetails?.ifscCode || '',
//         transactionId: body.vendorDetails?.transactionId || ''
//       },

//       additions: {
//         totalAddition: totalAdditions,
//         items: processedAdditionItems
//       },

//       deductions: {
//         totalDeduction: totalDeductions,
//         items: processedDeductionItems
//       },

//       paymentDetails: {
//         vendorNameDebit: body.paymentDetails?.vendorNameDebit || body.vendorDetails?.vendorName || '',
//         accountNoCredit: body.paymentDetails?.accountNoCredit || body.vendorDetails?.accountNo || '',
//         finalAmount: num(body.paymentDetails?.finalAmount) || advance,
//         remarks: body.paymentDetails?.remarks || 'ADV Payment',
//         transactionId: body.paymentDetails?.transactionId || '',
//         bankVendorCode: body.paymentDetails?.bankVendorCode || body.vendorDetails?.vendorCode || '',
//         paymentDate: body.paymentDetails?.paymentDate ? new Date(body.paymentDetails.paymentDate) : new Date(),
//         paymentStatus: body.paymentDetails?.paymentStatus || 'Pending'
//       },

//       memoFile: body.memoFile || null,

//       balance,
//       totalOrderAmount,

//       status: 'Draft',
//       queueGenerated: false,

//       companyId: user.companyId,
//       createdBy: user.id
//     });

//     await advancePayment.save();

//     return NextResponse.json({ 
//       success: true, 
//       message: "Advance payment created successfully",
//       data: {
//         _id: advancePayment._id,
//         paymentNo: advancePayment.paymentNo,
//         purchaseNo: advancePayment.purchaseNo
//       }
//     }, { status: 201 });

//   } catch (error) {
//     console.error("❌ POST /advance-payment error:", error);

//     if (error.code === 11000) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Payment number already exists" 
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
//       message: error.message || "Failed to create advance payment"
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    PUT /api/advance-payment - Requires 'edit' permission
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
//         message: "Advance payment ID is required" 
//       }, { status: 400 });
//     }

//     if (!isValidObjectId(id)) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Invalid advance payment ID format" 
//       }, { status: 400 });
//     }

//     const payment = await AdvancePayment.findOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (!payment) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Advance payment not found" 
//       }, { status: 404 });
//     }

//     if (payment.paymentDetails?.paymentStatus === 'Paid' || payment.paymentDetails?.paymentStatus === 'Completed') {
//       return NextResponse.json({ 
//         success: false, 
//         message: `Cannot update ${payment.paymentDetails.paymentStatus} payment` 
//       }, { status: 400 });
//     }

//     if (body.purchaseAmountFromVNN !== undefined) {
//       payment.purchaseAmountFromVNN = num(body.purchaseAmountFromVNN);
//     }

//     if (body.header) {
//       payment.header = {
//         ...payment.header,
//         ...body.header,
//         branch: body.header.branch ? new mongoose.Types.ObjectId(body.header.branch) : payment.header.branch,
//         date: body.header.date ? new Date(body.header.date) : payment.header.date
//       };
//     }

//     if (body.billing) {
//       payment.billing = {
//         ...payment.billing,
//         ...body.billing
//       };
//     }

//     if (body.orderRows) {
//       payment.orderRows = body.orderRows.map(row => ({
//         _id: row._id && isValidObjectId(row._id) 
//           ? new mongoose.Types.ObjectId(row._id) 
//           : new mongoose.Types.ObjectId(),
//         orderNo: row.orderNo || '',
//         partyName: row.partyName || '',
//         plantCode: row.plantCode || '',
//         plantName: row.plantName || '',
//         orderType: row.orderType || 'Sales',
//         pinCode: row.pinCode || '',
//         state: row.state || '',
//         district: row.district || '',
//         from: row.from || '',
//         to: row.to || '',
//         locationRate: row.locationRate || '',
//         priceList: row.priceList || '',
//         weight: num(row.weight),
//         rate: num(row.rate),
//         totalAmount: num(row.totalAmount) || (num(row.weight) * num(row.rate)),
//         collectionCharges: row.collectionCharges || '0',
//         cancellationCharges: row.cancellationCharges || 'Nil',
//         loadingCharges: row.loadingCharges || 'Nil',
//         otherCharges: row.otherCharges || '0'
//       }));
//     }

//     if (body.purchaseTerms) {
//       payment.purchaseTerms = {
//         ...payment.purchaseTerms,
//         ...body.purchaseTerms
//       };
//     }

//     if (body.vendorDetails) {
//       payment.vendorDetails = {
//         ...payment.vendorDetails,
//         ...body.vendorDetails,
//         rate: num(body.vendorDetails.rate),
//         weight: num(body.vendorDetails.weight),
//         amount: num(body.vendorDetails.amount) || payment.purchaseAmountFromVNN,
//         advance: num(body.vendorDetails.advance)
//       };
//     }

//     if (body.additions) {
//       payment.additions = {
//         totalAddition: num(body.additions.totalAddition),
//         items: (body.additions.items || []).map(item => ({
//           _id: item._id && isValidObjectId(item._id) 
//             ? new mongoose.Types.ObjectId(item._id) 
//             : new mongoose.Types.ObjectId(),
//           description: item.description || 'Addition',
//           amount: num(item.amount)
//         }))
//       };
//     }

//     if (body.deductions) {
//       payment.deductions = {
//         totalDeduction: num(body.deductions.totalDeduction),
//         items: (body.deductions.items || []).map(item => ({
//           _id: item._id && isValidObjectId(item._id) 
//             ? new mongoose.Types.ObjectId(item._id) 
//             : new mongoose.Types.ObjectId(),
//           description: item.description || 'Deduction',
//           amount: num(item.amount)
//         }))
//       };
//     }

//     if (body.paymentDetails) {
//       payment.paymentDetails = {
//         ...payment.paymentDetails,
//         ...body.paymentDetails,
//         finalAmount: num(body.paymentDetails.finalAmount),
//         paymentDate: body.paymentDetails.paymentDate ? new Date(body.paymentDetails.paymentDate) : payment.paymentDetails.paymentDate
//       };
//     }

//     if (body.memoFile !== undefined) {
//       payment.memoFile = body.memoFile;
//     }

//     if (body.queueGenerated !== undefined) {
//       payment.queueGenerated = body.queueGenerated;
//       if (body.queueGenerated) {
//         payment.queueDate = new Date();
//       }
//     }

//     if (body.status) {
//       payment.status = body.status;
//     }

//     await payment.save();

//     return NextResponse.json({ 
//       success: true, 
//       message: "Advance payment updated successfully",
//       data: {
//         _id: payment._id,
//         paymentNo: payment.paymentNo,
//         purchaseNo: payment.purchaseNo
//       }
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ PUT /advance-payment error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to update advance payment"
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    DELETE /api/advance-payment - Requires 'delete' permission
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

//     if (!id || !isValidObjectId(id)) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Valid ID is required" 
//       }, { status: 400 });
//     }

//     const payment = await AdvancePayment.findOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (!payment) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Advance payment not found" 
//       }, { status: 404 });
//     }

//     if (payment.paymentDetails?.paymentStatus === 'Paid' || payment.paymentDetails?.paymentStatus === 'Completed') {
//       return NextResponse.json({ 
//         success: false, 
//         message: `Cannot delete ${payment.paymentDetails.paymentStatus} payment` 
//       }, { status: 400 });
//     }

//     await AdvancePayment.deleteOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     return NextResponse.json({ 
//       success: true, 
//       message: "Advance payment deleted successfully",
//       data: {
//         paymentNo: payment.paymentNo
//       }
//     }, { status: 200 });

//   } catch (error) {
//     console.error("❌ DELETE /advance-payment error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to delete advance payment"
//     }, { status: 500 });
//   }
// }

// /* ========================================
//    PATCH /api/advance-payment - Requires 'approve' permission
//    Handles: generate-queue, approve, reject, update-status
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

//     const url = new URL(req.url);
//     const id = url.searchParams.get("id");
//     const action = url.searchParams.get("action");

//     if (!id || !isValidObjectId(id)) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Valid ID is required" 
//       }, { status: 400 });
//     }

//     const payment = await AdvancePayment.findOne({
//       _id: id,
//       companyId: user.companyId
//     });

//     if (!payment) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Advance payment not found" 
//       }, { status: 404 });
//     }

//     // Handle different actions
//     if (action === 'generate-queue') {
//       payment.queueGenerated = true;
//       payment.queueDate = new Date();
//       payment.paymentDetails.paymentStatus = 'Paid';
//       payment.status = 'Paid';
//       await payment.save();

//       return NextResponse.json({ 
//         success: true, 
//         message: "Payment queue generated successfully",
//         data: {
//           _id: payment._id,
//           paymentNo: payment.paymentNo,
//           queueGenerated: true,
//           queueDate: payment.queueDate,
//           paymentStatus: payment.paymentDetails.paymentStatus
//         }
//       }, { status: 200 });
//     }

//     // Approve action
//     if (action === 'approve') {
//       // If body contains paymentStatus, use it, else set to Approved
//       const body = await req.json();
//       const newStatus = body.paymentStatus || 'Approved';

//       payment.paymentDetails.paymentStatus = newStatus;
//       payment.status = newStatus;

//       // Update remarks if provided
//       if (body.remarks !== undefined) {
//         payment.paymentDetails.remarks = body.remarks;
//       }

//       await payment.save();

//       return NextResponse.json({ 
//         success: true, 
//         message: `Payment ${newStatus} successfully`,
//         data: {
//           _id: payment._id,
//           paymentNo: payment.paymentNo,
//           status: payment.paymentDetails.paymentStatus,
//           remarks: payment.paymentDetails.remarks
//         }
//       }, { status: 200 });
//     }

//     // Reject action
//     if (action === 'reject') {
//       const body = await req.json();

//       payment.paymentDetails.paymentStatus = 'Rejected';
//       payment.status = 'Rejected';

//       // Update remarks if provided
//       if (body.remarks !== undefined) {
//         payment.paymentDetails.remarks = body.remarks;
//       }

//       await payment.save();

//       return NextResponse.json({ 
//         success: true, 
//         message: "Payment rejected successfully",
//         data: {
//           _id: payment._id,
//           paymentNo: payment.paymentNo,
//           status: payment.paymentDetails.paymentStatus,
//           remarks: payment.paymentDetails.remarks
//         }
//       }, { status: 200 });
//     }

//     // Update status only (for Pending status changes)
//     if (action === 'update-status') {
//       const body = await req.json();

//       if (body.paymentStatus) {
//         payment.paymentDetails.paymentStatus = body.paymentStatus;
//         payment.status = body.paymentStatus;
//       }

//       if (body.remarks !== undefined) {
//         payment.paymentDetails.remarks = body.remarks;
//       }

//       await payment.save();

//       return NextResponse.json({ 
//         success: true, 
//         message: `Payment status updated to ${payment.paymentDetails.paymentStatus}`,
//         data: {
//           _id: payment._id,
//           paymentNo: payment.paymentNo,
//           status: payment.paymentDetails.paymentStatus,
//           remarks: payment.paymentDetails.remarks
//         }
//       }, { status: 200 });
//     }

//     return NextResponse.json({ 
//       success: false, 
//       message: "Invalid action. Allowed: generate-queue, approve, reject, update-status" 
//     }, { status: 400 });

//   } catch (error) {
//     console.error("❌ PATCH /advance-payment error:", error);
//     return NextResponse.json({ 
//       success: false, 
//       message: error.message || "Failed to process request"
//     }, { status: 500 });
//   }
// }

import { isIciciQueueApiSkipped, generateLocalPaymentQueue } from '@/lib/paymentQueueConfig.mjs';
import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import AdvancePayment from "./AdvancePayment";
import PurchasePanel from "../purchase-panel/PurchasePanel";
import LoadingPanel from "@/app/api/loading-panel/LoadingPanel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { getNextAdvancePaymentNumber } from "./AdvancePaymentCounter";
import mongoose from 'mongoose';
import { activeOperatingCompanyId, companyScopeFilter } from "@/lib/companyScope";
import { syncPodAdvanceForPurchase } from "@/lib/advanceSettlement";
import { ADVANCE_STATUSES, assertValidAmounts } from "@/lib/paymentRules";
import { validateOpenOrderRows } from '@/lib/orderRowStatus';
import { handleModuleDelete } from '@/lib/deletion/handler';
import { inquireCibNeftPayment, inquireCibPayment, normalizeCibStatus, stableIciciUniqueId, submitCibPayment } from '@/lib/iciciCib';
import Supplier from '@/models/SupplierModels';
import { notifyModuleApprovers } from '@/lib/workflowNotifications';
import { advanceMaterialProjection, isAdvanceStatusUpdate, changedApprovedAdvanceBankFields } from '@/lib/advancePaymentReview.mjs';

// ── PERMISSION FUNCTIONS ──

function isAuthorized(user) {
  if (!user) return false;

  // Company admins have full access
  if (user.type === "company") return true;

  // Admin role has full access
  if (user.roles && user.roles.includes("Admin")) return true;

  // Check module-based permissions for "Advance Payment"
  const modules = user.modules || {};
  const moduleData = modules["Advance Payment"];

  if (!moduleData || !moduleData.selected) return false;

  return true;
}

function hasPermission(user, action) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.roles && user.roles.includes("Admin")) return true;

  const modules = user.modules || {};
  const moduleData = modules["Advance Payment"];

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
        error: "Access denied. You don't have permission to access Advance Payments.",
        status: 403
      };
    }

    if (requiredAction && !hasPermission(user, requiredAction)) {
      return {
        error: `Permission denied: ${requiredAction} action not allowed for Advance Payments.`,
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

function purchaseWarehouseDeduction(purchase, loadingInfo = null) {
  const le = loadingInfo?.loadedWeighment || purchase?.loadingExpenses || {};
  return ['loadingCharges', 'loadingStaffMunshiyana', 'otherExpenses', 'vehicleFloorTarpaulin', 'vehicleOuterTarpaulin']
    .reduce((sum, key) => sum + (Number(le[key]) || 0), 0);
}

async function liveWarehouseDeduction(user, purchase) {
  if (!purchase) return 0;
  const loadingInfo = purchase.loadingInfoNo
    ? await LoadingPanel.findOne(companyScopeFilter(user, { vehicleArrivalNo: purchase.loadingInfoNo })).lean()
    : null;
  return purchaseWarehouseDeduction(purchase, loadingInfo);
}

/* ========================================
   GET /api/advance-payment - Requires 'view' permission
======================================== */
// Net amount for Advance Payment = Purchase Panel advance + additions - deductions - warehouse deductions
// (computed from the purchase's own rows so older records with a stale netEffect still match)
function purchaseOfficeNetEffect(purchase, loadingInfo = null) {
  if (!purchase) return 0;
  const sumRows = (rows) => (rows || []).reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
  // Loading Info is the source of truth for loading charges & expenses; the copy
  // saved on the purchase can be stale if Loading Info was edited afterwards.
  const le = loadingInfo?.loadedWeighment || purchase.loadingExpenses || {};
  const warehouseDeduct = ['loadingCharges', 'loadingStaffMunshiyana', 'otherExpenses', 'vehicleFloorTarpaulin', 'vehicleOuterTarpaulin']
    .reduce((sum, key) => sum + (Number(le[key]) || 0), 0);
  return (Number(purchase.purchaseDetails?.advance) || 0) + sumRows(purchase.additions) - sumRows(purchase.deductions) - warehouseDeduct;
}

async function liveOfficeNetEffect(user, purchase) {
  if (!purchase) return 0;
  const loadingInfo = purchase.loadingInfoNo
    ? await LoadingPanel.findOne(companyScopeFilter(user, { vehicleArrivalNo: purchase.loadingInfoNo })).lean()
    : null;
  return purchaseOfficeNetEffect(purchase, loadingInfo);
}

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
    const paymentNo = url.searchParams.get("paymentNo");
    const purchaseNo = url.searchParams.get("purchaseNo");
    const format = url.searchParams.get("format");
    const search = url.searchParams.get("search");
    const fromDate = url.searchParams.get("fromDate");
    const toDate = url.searchParams.get("toDate");
    const statusFilter = url.searchParams.get("status");

    // CASE 1: GET SINGLE BY ID
    if (id) {
      if (!isValidObjectId(id)) {
        return NextResponse.json({
          success: false,
          message: "Invalid advance payment ID format"
        }, { status: 400 });
      }

      const payment = await AdvancePayment.findOne(companyScopeFilter(user, { _id: id })).lean();

      if (!payment) {
        return NextResponse.json({
          success: false,
          message: "Advance payment not found"
        }, { status: 404 });
      }

      const sourcePurchase = payment.purchaseId
        ? await PurchasePanel.findOne(companyScopeFilter(user, { _id: payment.purchaseId })).lean()
        : await PurchasePanel.findOne(companyScopeFilter(user, { purchaseNo: payment.purchaseNo })).lean();
      const warehouseDeduction = await liveWarehouseDeduction(user, sourcePurchase);

      return NextResponse.json({
        success: true,
        data: { ...payment, warehouseDeduction }
      }, { status: 200 });
    }

    // CASE 2: GET BY PAYMENT NUMBER
    if (paymentNo) {
      const payment = await AdvancePayment.findOne(companyScopeFilter(user, { paymentNo })).lean();

      if (!payment) {
        return NextResponse.json({
          success: false,
          message: "Advance payment not found"
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: payment
      }, { status: 200 });
    }

    // CASE 3: GET BY PURCHASE NUMBER
    if (purchaseNo) {
      console.log(`🔍 Searching for Advance Payment with purchaseNo: "${purchaseNo}"`);

      const payment = await AdvancePayment.findOne(companyScopeFilter(user, { purchaseNo })).lean();

      console.log("✅ Found payment:", payment ? payment.paymentNo : "NOT FOUND");

      return NextResponse.json({
        success: true,
        data: payment || null,
        exists: !!payment
      }, { status: 200 });
    }

    // CASE 4: TABLE FORMAT FOR LIST VIEW
    if (format === 'table') {
      let query = {};

      if (search) {
        query.$or = [
          { paymentNo: { $regex: search, $options: 'i' } },
          { purchaseNo: { $regex: search, $options: 'i' } },
          { 'orderRows.orderNo': { $regex: search, $options: 'i' } },
          { pricingSerialNo: { $regex: search, $options: 'i' } },
          { subCompanyName: { $regex: search, $options: 'i' } },
          { subCompanyCode: { $regex: search, $options: 'i' } },
          { 'vendorDetails.vendorName': { $regex: search, $options: 'i' } },
          { 'vendorDetails.vendorCode': { $regex: search, $options: 'i' } },
          { 'vendorDetails.vehicleNo': { $regex: search, $options: 'i' } }
        ];
      }

      if (statusFilter) {
        query['paymentDetails.paymentStatus'] = statusFilter;
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

      const payments = await AdvancePayment.find(companyScopeFilter(user, query))
        .sort({ createdAt: -1 })
        .lean();

      const tableData = payments.map(payment => ({
        _id: payment._id,
        date: payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('en-GB') : '',
        paymentNo: payment.paymentNo || 'N/A',
        purchaseNo: payment.purchaseNo || 'N/A',
        orderNo: [...new Set((payment.orderRows || []).map(r => r.orderNo).filter(Boolean))].join(', '),
        pricingSerialNo: payment.pricingSerialNo || 'N/A',
        subCompanyName: payment.subCompanyName || '',
        subCompanyCode: payment.subCompanyCode || '',
        vendorName: payment.vendorDetails?.vendorName || 'N/A',
        vendorCode: payment.vendorDetails?.vendorCode || 'N/A',
        vehicleNo: payment.vendorDetails?.vehicleNo || 'N/A',
        amount: payment.purchaseAmountFromVNN || 0,
        advance: payment.vendorDetails?.advance || 0,
        balance: (payment.purchaseAmountFromVNN || 0) - (payment.vendorDetails?.advance || 0),
        finalAmount: payment.paymentDetails?.finalAmount || 0,
        transactionId: payment.paymentDetails?.transactionId || payment.vendorDetails?.transactionId || '',
        bankIntegration: payment.bankIntegration || null,
        status: payment.isDraft ? 'Draft' : (payment.paymentDetails?.paymentStatus || 'Pending'),
        isDraft: !!payment.isDraft,
        queueGenerated: payment.queueGenerated || false
      }));

      return NextResponse.json({
        success: true,
        data: tableData,
        count: tableData.length
      }, { status: 200 });
    }

    // CASE 5: LIST FOR DROPDOWNS
    const payments = await AdvancePayment.find(companyScopeFilter(user))
      .select('paymentNo purchaseNo subCompanyName subCompanyCode vendorDetails.vendorName purchaseAmountFromVNN paymentDetails.paymentStatus')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: payments
    }, { status: 200 });

  } catch (error) {
    console.error("❌ GET /advance-payment error:", error);
    return NextResponse.json({
      success: false,
      message: error.message || "Failed to fetch advance payments"
    }, { status: 500 });
  }
}

/* ========================================
   POST /api/advance-payment - Requires 'create' permission
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
    const isDraftSave = body.saveMode === 'draft';

    console.log("📝 Creating new advance payment");

    if (!body.purchaseNo && !body.purchaseDataId) {
      return NextResponse.json({ success: false, message: "A Purchase Panel is required." }, { status: 400 });
    }

    let paymentNo = await getNextAdvancePaymentNumber(user.companyId, user.activeOperatingCompanyId, user.activeOperatingCompanyCode);

    if (body.purchaseNo) {
      const existing = await AdvancePayment.findOne(companyScopeFilter(user, { purchaseNo: body.purchaseNo }));

      if (existing) {
        return NextResponse.json({
          success: false,
          message: `Advance payment already exists for Purchase No: ${body.purchaseNo}`
        }, { status: 400 });
      }
    }

    // Purchase remains the source of truth for the MEMO and adjustments.
    const purchaseLookup = body.purchaseDataId
      ? { _id: body.purchaseDataId }
      : { purchaseNo: body.purchaseNo };
    const sourcePurchase = await PurchasePanel.findOne(companyScopeFilter(user, purchaseLookup)).lean();
    if (!sourcePurchase) {
      return NextResponse.json({ success: false, message: "A valid Purchase Panel is required." }, { status: 400 });
    }
    if (sourcePurchase.isDraft || sourcePurchase.panelStatus === 'Draft') {
      return NextResponse.json({ success: false, message: `Purchase ${sourcePurchase.purchaseNo} is still a draft. Submit it before creating an Advance Payment.` }, { status: 409 });
    }
    if (sourcePurchase.approval?.status !== 'Approved') {
      return NextResponse.json({ success: false, message: `Purchase ${sourcePurchase.purchaseNo} must be Approved before creating an Advance Payment.` }, { status: 409 });
    }
    const heldPurchaseRow = await validateOpenOrderRows(user, sourcePurchase.orderRows || []);
    if (heldPurchaseRow) return NextResponse.json({ success: false, message: heldPurchaseRow }, { status: 409 });

    // ✅ Get sub-company from body
    const subCompanyId = user.activeOperatingCompanyId;
    const subCompanyName = user.activeOperatingCompanyName || '';
    const subCompanyCode = user.activeOperatingCompanyCode || '';

    const processedOrderRows = (body.orderRows || []).map(row => ({
      _id: new mongoose.Types.ObjectId(),
      orderNo: row.orderNo || '',
      partyName: row.partyName || '',
      plantCode: row.plantCode || '',
      plantName: row.plantName || '',
      orderType: row.orderType || 'Sales',
      pinCode: row.pinCode || '',
      state: row.state || '',
      stateName: row.stateName || row.state || '',
      fromState: row.fromState || '',
      district: row.district || '',
      from: row.from || '',
      fromName: row.fromName || row.from || '',
      to: row.to || '',
      toName: row.toName || row.to || '',
      locationRate: row.locationRate || '',
      priceList: row.priceList || '',
      weight: num(row.weight),
      rate: num(row.rate),
      totalAmount: num(row.totalAmount) || (num(row.weight) * num(row.rate)),
      collectionCharges: row.collectionCharges || '0',
      cancellationCharges: row.cancellationCharges || 'Nil',
      loadingCharges: row.loadingCharges || 'Nil',
      otherCharges: row.otherCharges || '0',
      localStatus: row.localStatus || 'unknown',
      localStatusLabel: row.localStatusLabel || 'Unknown',
      subCompanyId,
      subCompanyName,
      subCompanyCode
    }));

    const processedAdditionItems = (sourcePurchase.additions || []).map(item => ({
      _id: new mongoose.Types.ObjectId(),
      description: item.description || 'Addition',
      amount: num(item.amount)
    }));

    const processedDeductionItems = (sourcePurchase.deductions || []).map(item => ({
      _id: new mongoose.Types.ObjectId(),
      description: item.description || 'Deduction',
      amount: num(item.amount)
    }));

    const totalOrderAmount = processedOrderRows.reduce((sum, row) => {
      const totalAmount = row.totalAmount || 0;
      const collectionCharges = num(row.collectionCharges);
      const cancellationCharges = num(row.cancellationCharges);
      const loadingCharges = num(row.loadingCharges);
      const otherCharges = num(row.otherCharges);
      return sum + totalAmount + collectionCharges + cancellationCharges + loadingCharges + otherCharges;
    }, 0);

    const amountError = assertValidAmounts({ advance: body.vendorDetails?.advance, amount: body.vendorDetails?.amount, purchaseAmountFromVNN: body.purchaseAmountFromVNN });
    if (amountError) return NextResponse.json({ success: false, message: amountError }, { status: 400 });
    const purchaseAmountFromVNN = num(body.purchaseAmountFromVNN) || num(body.vendorDetails?.amount) || totalOrderAmount;
    const advance = num(body.vendorDetails?.advance);
    const totalAdditions = processedAdditionItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalDeductions = processedDeductionItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    // Balance is independent of adjustments.  The payment to queue is the
    // Purchase Panel's Net Effect, which includes its approved adjustments.
    // const balance = purchaseAmountFromVNN - advance;
    const finalAdvanceAmount = await liveOfficeNetEffect(user, sourcePurchase);

    let branchId = null;
    if (body.header?.branch) {
      if (isValidObjectId(body.header.branch)) {
        branchId = new mongoose.Types.ObjectId(body.header.branch);
      }
    }

    const advancePayment = new AdvancePayment({
      paymentNo,
      purchaseNo: sourcePurchase.purchaseNo || body.purchaseNo || body.header?.purchaseNo || '',
      purchaseId: sourcePurchase._id,
      pricingSerialNo: body.pricingSerialNo || body.header?.pricingSerialNo || '',
      purchaseAmountFromVNN,

      // ✅ Sub-Company at root level
      subCompanyId,
      subCompanyName,
      subCompanyCode,

      header: {
        purchaseNo: body.header?.purchaseNo || '',
        pricingSerialNo: body.header?.pricingSerialNo || '',
        branch: branchId,
        branchName: body.header?.branchName || '',
        branchCode: body.header?.branchCode || '',
        subCompanyId,
        subCompanyName,
        subCompanyCode,
        date: body.header?.date ? new Date(body.header.date) : new Date(),
        delivery: body.header?.delivery || 'Normal'
      },

      billing: {
        billingType: body.billing?.billingType || 'Multi - Order',
        noOfLoadingPoints: body.billing?.noOfLoadingPoints || '1',
        noOfDroppingPoint: body.billing?.noOfDroppingPoint || '1',
        collectionCharges: body.billing?.collectionCharges || '0',
        cancellationCharges: body.billing?.cancellationCharges || 'Nil',
        loadingCharges: body.billing?.loadingCharges || 'Nil',
        otherCharges: body.billing?.otherCharges || '0'
      },

      orderRows: processedOrderRows,

      purchaseTerms: {
        purchaseType: body.purchaseTerms?.purchaseType || 'Loading & Unloading',
        rateType: body.purchaseTerms?.rateType || 'Per MT',
        paymentTerms: body.purchaseTerms?.paymentTerms || '80 % Advance'
      },

      vendorDetails: {
        vendorStatus: body.vendorDetails?.vendorStatus || 'Active',
        vendorCode: body.vendorDetails?.vendorCode || '',
        vendorName: body.vendorDetails?.vendorName || '',
        vehicleNo: body.vendorDetails?.vehicleNo || '',
        rate: num(body.vendorDetails?.rate),
        weight: num(body.vendorDetails?.weight),
        amount: purchaseAmountFromVNN,
        advance: advance,
        accountNo: body.vendorDetails?.accountNo || body.vendorDetails?.bankAccountNumber || '',
        bankName: body.vendorDetails?.bankName || '',
        ifsc: body.vendorDetails?.ifsc || body.vendorDetails?.ifscCode || '',
        transactionId: body.vendorDetails?.transactionId || '',
        subCompanyId,
        subCompanyName,
        subCompanyCode
      },

      additions: {
        totalAddition: totalAdditions,
        items: processedAdditionItems
      },

      deductions: {
        totalDeduction: totalDeductions,
        items: processedDeductionItems
      },

      paymentDetails: {
        vendorNameDebit: body.paymentDetails?.vendorNameDebit || body.vendorDetails?.vendorName || '',
        accountNoCredit: body.paymentDetails?.accountNoCredit || body.vendorDetails?.accountNo || '',
        finalAmount: finalAdvanceAmount,
        remarks: body.paymentDetails?.remarks || 'ADV Payment',
        transactionId: body.paymentDetails?.transactionId || '',
        bankVendorCode: body.paymentDetails?.bankVendorCode || body.vendorDetails?.vendorCode || '',
        paymentDate: body.paymentDetails?.paymentDate ? new Date(body.paymentDetails.paymentDate) : new Date(),
        paymentStatus: body.paymentDetails?.paymentStatus || 'Pending'
      },

      memoFile: sourcePurchase.memoFile || null,

      // balance,
      totalOrderAmount,

      status: 'Draft',
      isDraft: isDraftSave,
      queueGenerated: false,

      companyId: user.companyId,
      createdBy: user.id
    });

    await advancePayment.save({ validateBeforeSave: !isDraftSave });

    return NextResponse.json({
      success: true,
      message: "Advance payment created successfully",
      data: {
        _id: advancePayment._id,
        paymentNo: advancePayment.paymentNo,
        purchaseNo: advancePayment.purchaseNo,
        subCompanyName: advancePayment.subCompanyName
      }
    }, { status: 201 });

  } catch (error) {
    console.error("❌ POST /advance-payment error:", error);

    if (error.code === 11000) {
      return NextResponse.json({
        success: false,
        message: "Payment number already exists"
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
      message: error.message || "Failed to create advance payment"
    }, { status: 500 });
  }
}

/* ========================================
   PUT /api/advance-payment - Requires 'edit' permission
======================================== */
export async function PUT(req) {
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req);
    if (error) {
      return NextResponse.json({
        success: false,
        message: error,
        code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN'
      }, { status });
    }

    const canEdit = hasPermission(user, 'edit');
    const canApprove = hasPermission(user, 'approve');
    if (!canEdit && !canApprove) {
      return NextResponse.json({
        success: false,
        message: "Permission denied: edit or approve action required for Advance Payment.",
        code: 'FORBIDDEN'
      }, { status: 403 });
    }

    const body = await req.json();
    const { id } = body;

    // Approve-only users: only id + paymentDetails.paymentStatus/remarks.
    if (!canEdit) {
      const extra = Object.keys(body).filter((k) => !['id', 'paymentDetails', 'expectedFinalAmount'].includes(k));
      const pdExtra = Object.keys(body.paymentDetails || {})
        .filter((k) => k !== 'paymentStatus' && k !== 'remarks');
      if (extra.length || pdExtra.length || !body.paymentDetails) {
        return NextResponse.json({
          success: false,
          message: "Permission denied: edit action not allowed for Advance Payment.",
          code: 'FORBIDDEN'
        }, { status: 403 });
      }
    }

    if (!id) {
      return NextResponse.json({
        success: false,
        message: "Advance payment ID is required"
      }, { status: 400 });
    }

    if (!isValidObjectId(id)) {
      return NextResponse.json({
        success: false,
        message: "Invalid advance payment ID format"
      }, { status: 400 });
    }

    const payment = await AdvancePayment.findOne(companyScopeFilter(user, { _id: id }));

    if (!payment) {
      return NextResponse.json({
        success: false,
        message: "Advance payment not found"
      }, { status: 404 });
    }

    if (payment.bankIntegration?.provider === 'ICICI_CIB' && payment.queueGenerated) {
      return NextResponse.json({ success: false, message: 'A payment submitted to ICICI cannot be edited. Reconcile or resolve it through the bank status workflow.' }, { status: 409 });
    }

    const saveMode = body.saveMode;
    const wasDraft = !!payment.isDraft || payment.paymentDetails?.paymentStatus === 'Draft';
    if (saveMode && !['draft', 'submit'].includes(saveMode)) {
      return NextResponse.json({ success: false, message: "Invalid saveMode" }, { status: 400 });
    }
    if (saveMode && !canEdit) {
      return NextResponse.json({ success: false, message: "Draft saving and submission require edit permission." }, { status: 403 });
    }
    if (saveMode === 'submit' && !hasPermission(user, 'create')) {
      return NextResponse.json({ success: false, message: "Permission denied: create action required to submit an Advance Payment draft.", code: 'FORBIDDEN' }, { status: 403 });
    }
    if ((saveMode === 'draft' || saveMode === 'submit') && !wasDraft) {
      return NextResponse.json({ success: false, message: "Only a draft can be saved as draft or submitted" }, { status: 400 });
    }
    if (!saveMode && wasDraft) {
      return NextResponse.json({ success: false, message: "Submit this draft for approval first" }, { status: 400 });
    }

    if (saveMode === 'submit') {
      payment.isDraft = false;
      payment.paymentDetails.paymentStatus = 'Pending';
    }

    const sourcePurchase = await PurchasePanel.findOne(companyScopeFilter(user, { purchaseNo: payment.purchaseNo })).select('orderRows').lean();
    const heldPurchaseRow = await validateOpenOrderRows(user, sourcePurchase?.orderRows || []);
    if (heldPurchaseRow) return NextResponse.json({ success: false, message: heldPurchaseRow }, { status: 409 });

    if (payment.paymentDetails?.paymentStatus === 'Paid' || payment.paymentDetails?.paymentStatus === 'Completed') {
      return NextResponse.json({
        success: false,
        message: `Cannot update ${payment.paymentDetails.paymentStatus} payment`
      }, { status: 400 });
    }

    if (changedApprovedAdvanceBankFields(payment, body).length) {
      return NextResponse.json({ success: false, message: 'Bank details cannot be changed after this Advance Payment has been approved.' }, { status: 409 });
    }

    if (isAdvanceStatusUpdate(body)) {
      if (!canApprove) return NextResponse.json({ success: false, message: 'Approve permission is required to update payment status or approval remarks.' }, { status: 403 });
      const nextStatus = body.paymentDetails.paymentStatus || payment.paymentDetails.paymentStatus;
      if (!ADVANCE_STATUSES.includes(nextStatus)) return NextResponse.json({ success: false, message: 'Invalid payment status.' }, { status: 400 });
      if (body.expectedFinalAmount !== undefined && (!Number.isFinite(Number(body.expectedFinalAmount)) || Math.abs(Number(body.expectedFinalAmount) - num(payment.paymentDetails.finalAmount)) > 0.005)) {
        return NextResponse.json({ success: false, message: 'The payable amount changed since this page was opened. Refresh and review it before approving.' }, { status: 409 });
      }
      // Approval changes only the selected status and remarks. Do not refresh
      // purchase/loading amounts behind the approver's read-only page.
      payment.paymentDetails.paymentStatus = nextStatus;
      if (body.paymentDetails.remarks !== undefined) payment.paymentDetails.remarks = body.paymentDetails.remarks;
      await payment.save();
      await syncPodAdvanceForPurchase(user, payment.purchaseNo);
      return NextResponse.json({ success: true, message: 'Payment status updated successfully.', data: { _id: payment._id, paymentNo: payment.paymentNo, paymentStatus: nextStatus } });
    }

    const previouslyApproved = payment.paymentDetails?.paymentStatus === 'Approved';
    const previousMaterial = JSON.stringify(advanceMaterialProjection(payment));

    // ✅ Update sub-company
    payment.subCompanyId = user.activeOperatingCompanyId;
    payment.subCompanyName = user.activeOperatingCompanyName || '';
    payment.subCompanyCode = user.activeOperatingCompanyCode || '';

    if (body.purchaseAmountFromVNN !== undefined) {
      payment.purchaseAmountFromVNN = num(body.purchaseAmountFromVNN);
    }

    if (body.header) {
      payment.header = {
        ...payment.header,
        ...body.header,
        branch: body.header.branch ? new mongoose.Types.ObjectId(body.header.branch) : payment.header.branch,
        subCompanyId: user.activeOperatingCompanyId,
        subCompanyName: user.activeOperatingCompanyName || '',
        subCompanyCode: user.activeOperatingCompanyCode || '',
        date: body.header.date ? new Date(body.header.date) : payment.header.date
      };
    }

    if (body.billing) {
      payment.billing = {
        ...payment.billing,
        ...body.billing
      };
    }

    if (body.orderRows) {
      payment.orderRows = body.orderRows.map(row => ({
        _id: row._id && isValidObjectId(row._id)
          ? new mongoose.Types.ObjectId(row._id)
          : new mongoose.Types.ObjectId(),
        orderNo: row.orderNo || '',
        partyName: row.partyName || '',
        plantCode: row.plantCode || '',
        plantName: row.plantName || '',
        orderType: row.orderType || 'Sales',
        pinCode: row.pinCode || '',
        state: row.state || '',
        stateName: row.stateName || row.state || '',
        fromState: row.fromState || '',
        district: row.district || '',
        from: row.from || '',
        fromName: row.fromName || row.from || '',
        to: row.to || '',
        toName: row.toName || row.to || '',
        locationRate: row.locationRate || '',
        priceList: row.priceList || '',
        weight: num(row.weight),
        rate: num(row.rate),
        totalAmount: num(row.totalAmount) || (num(row.weight) * num(row.rate)),
        collectionCharges: row.collectionCharges || '0',
        cancellationCharges: row.cancellationCharges || 'Nil',
        loadingCharges: row.loadingCharges || 'Nil',
        otherCharges: row.otherCharges || '0',
        localStatus: row.localStatus || 'unknown',
        localStatusLabel: row.localStatusLabel || 'Unknown',
        subCompanyId: user.activeOperatingCompanyId,
        subCompanyName: user.activeOperatingCompanyName || '',
        subCompanyCode: user.activeOperatingCompanyCode || ''
      }));
    }

    if (body.purchaseTerms) {
      payment.purchaseTerms = {
        ...payment.purchaseTerms,
        ...body.purchaseTerms
      };
    }

    if (body.vendorDetails) {
      payment.vendorDetails = {
        ...payment.vendorDetails,
        ...body.vendorDetails,
        rate: num(body.vendorDetails.rate),
        weight: num(body.vendorDetails.weight),
        amount: num(body.vendorDetails.amount) || payment.purchaseAmountFromVNN,
        advance: num(body.vendorDetails.advance),
        subCompanyId: payment.subCompanyId,
        subCompanyName: payment.subCompanyName,
        subCompanyCode: payment.subCompanyCode
      };
    }

    if (body.additions) {
      payment.additions = {
        totalAddition: num(body.additions.totalAddition),
        items: (body.additions.items || []).map(item => ({
          _id: item._id && isValidObjectId(item._id)
            ? new mongoose.Types.ObjectId(item._id)
            : new mongoose.Types.ObjectId(),
          description: item.description || 'Addition',
          amount: num(item.amount)
        }))
      };
    }

    if (body.deductions) {
      payment.deductions = {
        totalDeduction: num(body.deductions.totalDeduction),
        items: (body.deductions.items || []).map(item => ({
          _id: item._id && isValidObjectId(item._id)
            ? new mongoose.Types.ObjectId(item._id)
            : new mongoose.Types.ObjectId(),
          description: item.description || 'Deduction',
          amount: num(item.amount)
        }))
      };
    }

    if (body.paymentDetails) {
      // Only users with approve permission may change the payment (approval) status.
      const currentStatus = wasDraft ? 'Pending' : (payment.paymentDetails?.paymentStatus || 'Pending');
      const nextStatus = wasDraft
        ? 'Pending'
        : (body.paymentDetails.paymentStatus || currentStatus);
      if (!wasDraft && !ADVANCE_STATUSES.includes(nextStatus)) {
        return NextResponse.json({
          success: false,
          message: `Invalid payment status. Allowed: ${ADVANCE_STATUSES.join(', ')}`
        }, { status: 400 });
      }
      if (!canApprove) {
        if (nextStatus !== currentStatus) {
          return NextResponse.json({
            success: false,
            message: "Permission denied: approve action not allowed for Advance Payment.",
            code: 'FORBIDDEN'
          }, { status: 403 });
        }
      }
      const sourcePurchase = payment.purchaseId
        ? await PurchasePanel.findOne(companyScopeFilter(user, { _id: payment.purchaseId })).lean()
        : await PurchasePanel.findOne(companyScopeFilter(user, { purchaseNo: payment.purchaseNo })).lean();
      const editablePaymentDetails = { ...body.paymentDetails };
      delete editablePaymentDetails.paymentStatus;
      payment.paymentDetails = {
        ...payment.paymentDetails,
        ...editablePaymentDetails,
        paymentStatus: nextStatus,
        finalAmount: sourcePurchase ? await liveOfficeNetEffect(user, sourcePurchase) : payment.paymentDetails.finalAmount,
        paymentDate: body.paymentDetails.paymentDate ? new Date(body.paymentDetails.paymentDate) : payment.paymentDetails.paymentDate
      };
    }

    if (body.memoFile !== undefined) {
      payment.memoFile = body.memoFile;
    }

    if (body.queueGenerated !== undefined) {
      payment.queueGenerated = body.queueGenerated;
      if (body.queueGenerated) {
        payment.queueDate = new Date();
      }
    }

    if (body.status && body.status !== payment.status) {
      if (!hasPermission(user, 'approve')) {
        return NextResponse.json({
          success: false,
          message: "Permission denied: approve action not allowed for Advance Payment.",
          code: 'FORBIDDEN'
        }, { status: 403 });
      }
      payment.status = body.status;
    }

    if (saveMode === 'draft') {
      payment.isDraft = true;
      payment.paymentDetails.paymentStatus = 'Draft';
    }
    const needsFreshApproval = previouslyApproved && previousMaterial !== JSON.stringify(advanceMaterialProjection(payment));
    if (needsFreshApproval) {
      payment.paymentDetails.paymentStatus = 'Pending';
      payment.status = 'Pending';
    }
    await payment.save({ validateBeforeSave: saveMode !== 'draft' });
    await syncPodAdvanceForPurchase(user, payment.purchaseNo);

    if (needsFreshApproval || (saveMode === 'submit' && wasDraft && payment.paymentDetails?.paymentStatus === 'Pending')) {
      await notifyModuleApprovers({
        user,
        module: 'Advance Payment',
        panelLabel: 'Advance Payment',
        reference: payment.paymentNo,
        url: `/admin/Advance-Payment/${payment._id}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: needsFreshApproval ? "Advance payment updated and submitted for fresh approval" : "Advance payment updated successfully",
      data: {
        _id: payment._id,
        paymentNo: payment.paymentNo,
        purchaseNo: payment.purchaseNo,
        subCompanyName: payment.subCompanyName,
        requiresApproval: needsFreshApproval,
        paymentStatus: payment.paymentDetails.paymentStatus
      }
    }, { status: 200 });

  } catch (error) {
    console.error("❌ PUT /advance-payment error:", error);
    return NextResponse.json({
      success: false,
      message: error.message || "Failed to update advance payment"
    }, { status: 500 });
  }
}

/* ========================================
   DELETE /api/advance-payment - Requires 'delete' permission
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
    return await handleModuleDelete(req, 'advance', user);

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({
        success: false,
        message: "Valid ID is required"
      }, { status: 400 });
    }

    const payment = await AdvancePayment.findOne(companyScopeFilter(user, { _id: id }));

    if (!payment) {
      return NextResponse.json({
        success: false,
        message: "Advance payment not found"
      }, { status: 404 });
    }

    if (payment.bankIntegration?.provider === 'ICICI_CIB') {
      return NextResponse.json({ success: false, message: 'A payment submitted to ICICI cannot be deleted. Reconcile or resolve it through the bank status workflow.' }, { status: 409 });
    }

    if (payment.paymentDetails?.paymentStatus === 'Paid' || payment.paymentDetails?.paymentStatus === 'Completed') {
      return NextResponse.json({
        success: false,
        message: `Cannot delete ${payment.paymentDetails.paymentStatus} payment`
      }, { status: 400 });
    }

    await AdvancePayment.deleteOne(companyScopeFilter(user, { _id: id }));

    return NextResponse.json({
      success: true,
      message: "Advance payment deleted successfully",
      data: {
        paymentNo: payment.paymentNo
      }
    }, { status: 200 });

  } catch (error) {
    console.error("❌ DELETE /advance-payment error:", error);
    return NextResponse.json({
      success: false,
      message: error.message || "Failed to delete advance payment"
    }, { status: 500 });
  }
}

/* ========================================
   PATCH /api/advance-payment - Requires 'approve' permission
   Handles: generate-queue, approve, reject, update-status
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

    // Get body for actions that need additional data
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      // Body might be empty for some actions
    }

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({
        success: false,
        message: "Valid ID is required"
      }, { status: 400 });
    }

    const payment = await AdvancePayment.findOne(companyScopeFilter(user, { _id: id }));

    if (!payment) {
      return NextResponse.json({
        success: false,
        message: "Advance payment not found"
      }, { status: 404 });
    }

    if (payment.isDraft) {
      return NextResponse.json({ success: false, message: "Open and save this draft before changing its approval status or generating a queue." }, { status: 400 });
    }

    if (body.paymentStatus !== undefined && body.paymentStatus !== "" && !ADVANCE_STATUSES.includes(body.paymentStatus)) {
      return NextResponse.json({ success: false, message: `Invalid status. Allowed: ${ADVANCE_STATUSES.join(", ")}` }, { status: 400 });
    }

    // Handle different actions
    if (action === 'generate-queue') {
      if (payment.isDraft) return NextResponse.json({ success: false, message: "Submit this draft before generating its queue." }, { status: 400 });
      if (payment.queueGenerated) {
        return NextResponse.json({ success: false, message: "Payment queue has already been generated." }, { status: 409 });
      }
      if ((payment.paymentDetails?.paymentStatus || payment.status) !== 'Approved') {
        return NextResponse.json({ success: false, message: 'Approve this Advance Payment before generating its queue.' }, { status: 409 });
      }

      const purchaseLookup = payment.purchaseId
        ? { _id: payment.purchaseId }
        : { purchaseNo: payment.purchaseNo };
      const sourcePurchase = await PurchasePanel.findOne(companyScopeFilter(user, purchaseLookup)).lean();
      if (!sourcePurchase?.memoFile?.filePath || !payment.memoFile?.filePath) {
        return NextResponse.json({
          success: false,
          message: "Generate Queue requires the MEMO attached in Purchase Panel and available in Advance Payment."
        }, { status: 400 });
      }

      // Temporary API skip; normal ICICI submission below is preserved.
      if (isIciciQueueApiSkipped()) {
        let data;
        try { data = generateLocalPaymentQueue('advance', payment, user); }
        catch (error) { return NextResponse.json({ success: false, message: error.message }, { status: error.status || 400 }); }
        await payment.save();
        return NextResponse.json({ success: true, message: 'Payment queue generated successfully.', data });
      }
      if (payment.bankIntegration?.provider === 'ERP_QUEUE') return NextResponse.json({ success: false, message: 'This payment already has a generated queue. It will not be submitted again when bank API calling resumes.' }, { status: 409 });

      const uniqueId = payment.bankIntegration?.uniqueId || stableIciciUniqueId('advance', payment._id);
      let supplier = null;
      if (payment.vendorDetails?.vendorCode) {
        supplier = await Supplier.findOne({ companyId: user.companyId, supplierCode: payment.vendorDetails.vendorCode })
          .select('supplierName bankAccountNumber ifscCode').lean();
      }
      const bankPayment = payment.toObject();
      if (!bankPayment.paymentDetails.accountNoCredit) bankPayment.paymentDetails.accountNoCredit = supplier?.bankAccountNumber || '';
      if (!bankPayment.vendorDetails.ifsc) bankPayment.vendorDetails.ifsc = supplier?.ifscCode || '';
      if (!bankPayment.paymentDetails.vendorNameDebit) bankPayment.paymentDetails.vendorNameDebit = supplier?.supplierName || '';

      let result;
      try {
        result = await submitCibPayment({ kind: 'advance', payment: bankPayment, uniqueId });
      } catch (bankError) {
        if (bankError.code === 'ICICI_PAYMENT_VALIDATION') return NextResponse.json({ success: false, message: bankError.message, code: bankError.code }, { status: 400 });
        if (/configuration is incomplete|not enabled|restricted to the documented sandbox|must be RTG|OAEP_HASH/i.test(bankError.message)) {
          return NextResponse.json({ success: false, message: bankError.message, code: 'ICICI_UAT_NOT_CONFIGURED' }, { status: 503 });
        }
        if (bankError.code !== 'ICICI_UNCERTAIN') return NextResponse.json({ success: false, message: 'Could not prepare the ICICI request. Check the server certificate configuration.' }, { status: 500 });
        payment.bankIntegration = {
          ...(payment.bankIntegration?.toObject?.() || payment.bankIntegration || {}),
          provider: 'ICICI_CIB', uniqueId, transactionType: bankError.transactionType || '', bankStatus: 'UNCERTAIN', submittedAt: new Date(),
          lastError: String(bankError.message || 'ICICI response was not received').slice(0, 500),
        };
        payment.bankIntegration.events = [...(payment.bankIntegration.events || []), { event: 'SUBMISSION_UNCERTAIN', bankStatus: 'UNCERTAIN', message: payment.bankIntegration.lastError, at: new Date() }].slice(-50);
        payment.queueGenerated = true;
        payment.queueDate = new Date();
        payment.paymentDetails.paymentStatus = 'Pending';
        payment.status = 'Pending';
        await payment.save();
        return NextResponse.json({ success: false, uncertain: true, message: 'ICICI response was not conclusive. Check bank status before any retry.', data: { uniqueId, bankStatus: 'UNCERTAIN' } }, { status: 502 });
      }

      let bankStatus = !result.accepted && !result.rejected ? 'UNCERTAIN' : normalizeCibStatus(result.status);
      if (bankStatus === 'SUCCESS' && result.transactionType === 'RGS') bankStatus = 'PENDING FOR PROCESSING';
      payment.bankIntegration = {
        provider: 'ICICI_CIB', uniqueId, transactionType: result.transactionType, bankStatus,
        requestId: result.requestId, utrNumber: result.utr, message: result.message,
        responseCode: result.responseCode, submittedAt: new Date(), checkedAt: new Date(), lastError: '',
        events: [...(payment.bankIntegration?.events || []), { event: 'PAYMENT_SUBMITTED', bankStatus, message: result.message, requestId: result.requestId, utrNumber: result.utr, at: new Date() }].slice(-50),
      };
      payment.queueGenerated = result.accepted || !result.rejected;
      payment.queueDate = payment.queueGenerated ? new Date() : payment.queueDate;
      if (result.utr) payment.paymentDetails.transactionId = result.utr;
      if (bankStatus === 'SUCCESS' && result.transactionType !== 'RGS') {
        payment.paymentDetails.paymentStatus = 'Completed';
        payment.status = 'Completed';
      } else if (bankStatus === 'FAILURE') {
        payment.paymentDetails.paymentStatus = 'Rejected';
        payment.status = 'Rejected';
      } else {
        payment.paymentDetails.paymentStatus = 'Pending';
        payment.status = 'Pending';
      }
      await payment.save();

      return NextResponse.json({
        success: result.accepted,
        uncertain: bankStatus === 'UNCERTAIN',
        message: result.message || (bankStatus === 'UNCERTAIN'
          ? 'ICICI did not return a conclusive status. Check bank status before retrying.'
          : bankStatus === 'PENDING FOR APPROVAL'
          ? 'Submitted to ICICI and waiting for authorization in CIB.'
          : result.accepted ? 'Payment submitted to ICICI.' : 'ICICI did not accept the payment.'),
        data: {
          _id: payment._id,
          paymentNo: payment.paymentNo,
          queueGenerated: payment.queueGenerated,
          queueDate: payment.queueDate,
          paymentStatus: payment.paymentDetails.paymentStatus,
          amount: Number(bankPayment.paymentDetails?.finalAmount || bankPayment.vendorDetails?.advance),
          bankStatus,
          uniqueId,
          requestId: result.requestId,
          utrNumber: result.utr,
          subCompanyName: payment.subCompanyName
        }
      }, { status: result.accepted ? 200 : 502 });
    }

    if (action === 'check-status') {
      if (payment.bankIntegration?.provider === 'ERP_QUEUE') return NextResponse.json({ success: false, message: 'No bank submission exists for this generated queue.' }, { status: 409 });
      const uniqueId = payment.bankIntegration?.uniqueId;
      if (!uniqueId) return NextResponse.json({ success: false, message: 'No ICICI transaction ID exists for this payment.' }, { status: 400 });
      const result = await inquireCibPayment({ uniqueId });
      const transactionNotFound = normalizeCibStatus(result.status) === 'UNKNOWN' && /transaction not found|invalid inquiry req id.*unique id/i.test(result.message || '');
      const retryAllowed = transactionNotFound && payment.bankIntegration.submittedAt && Date.now() - new Date(payment.bankIntegration.submittedAt).getTime() >= 2 * 60 * 60 * 1000;
      let bankStatus = retryAllowed ? 'NOT_FOUND' : normalizeCibStatus(result.status);
      let bankMessage = result.message;
      let bankRequestId = result.requestId;
      let bankUtr = result.utr;
      if (payment.bankIntegration.transactionType === 'RGS' && bankStatus === 'SUCCESS' && (bankUtr || payment.bankIntegration.utrNumber)) {
        const neftResult = await inquireCibNeftPayment({ utrNumber: bankUtr || payment.bankIntegration.utrNumber });
        bankStatus = neftResult.status;
        bankMessage = neftResult.message;
        bankRequestId = neftResult.requestId || bankRequestId;
        bankUtr = neftResult.utr || bankUtr;
      }
      payment.bankIntegration.bankStatus = bankStatus;
      payment.bankIntegration.requestId = bankRequestId || payment.bankIntegration.requestId;
      payment.bankIntegration.utrNumber = bankUtr || payment.bankIntegration.utrNumber;
      payment.bankIntegration.message = bankMessage;
      payment.bankIntegration.responseCode = result.responseCode;
      payment.bankIntegration.checkedAt = new Date();
      payment.bankIntegration.lastError = '';
      payment.bankIntegration.events = [...(payment.bankIntegration.events || []), { event: payment.bankIntegration.transactionType === 'RGS' && bankStatus !== normalizeCibStatus(result.status) ? 'NEFT_INCREMENTAL_STATUS' : 'STATUS_INQUIRY', bankStatus, message: bankMessage, requestId: bankRequestId, utrNumber: bankUtr, at: new Date() }].slice(-50);
      if (bankStatus === 'SUCCESS') {
        payment.paymentDetails.paymentStatus = 'Completed';
        payment.status = 'Completed';
        payment.queueGenerated = true;
      } else if (bankStatus === 'FAILURE' || bankStatus === 'REVERSED') {
        payment.paymentDetails.paymentStatus = 'Rejected';
        payment.status = 'Rejected';
      } else if (retryAllowed) {
        payment.queueGenerated = false;
        payment.paymentDetails.paymentStatus = 'Pending';
        payment.status = 'Pending';
      }
      await payment.save();
      return NextResponse.json({ success: true, data: { paymentNo: payment.paymentNo, bankStatus, retryAllowed: !!retryAllowed, queueGenerated: payment.queueGenerated, uniqueId, requestId: payment.bankIntegration.requestId, utrNumber: payment.bankIntegration.utrNumber, checkedAt: payment.bankIntegration.checkedAt } });
    }

    // Approve action
    if (action === 'approve') {
      if (payment.bankIntegration?.provider === 'ICICI_CIB') return NextResponse.json({ success: false, message: 'This payment must be authorized in ICICI CIB. ERP approval cannot approve a bank transaction.' }, { status: 409 });
      const newStatus = body.paymentStatus || 'Approved';

      payment.paymentDetails.paymentStatus = newStatus;
      payment.status = newStatus;

      if (body.remarks !== undefined) {
        payment.paymentDetails.remarks = body.remarks;
      }

      await payment.save();
      await syncPodAdvanceForPurchase(user, payment.purchaseNo);

      return NextResponse.json({
        success: true,
        message: `Payment ${newStatus} successfully`,
        data: {
          _id: payment._id,
          paymentNo: payment.paymentNo,
          status: payment.paymentDetails.paymentStatus,
          remarks: payment.paymentDetails.remarks,
          subCompanyName: payment.subCompanyName
        }
      }, { status: 200 });
    }

    // Reject action
    if (action === 'reject') {
      if (payment.bankIntegration?.provider === 'ICICI_CIB') return NextResponse.json({ success: false, message: 'Reject this payment in ICICI CIB, then refresh its bank status in the ERP.' }, { status: 409 });
      payment.paymentDetails.paymentStatus = 'Rejected';
      payment.status = 'Rejected';

      if (body.remarks !== undefined) {
        payment.paymentDetails.remarks = body.remarks;
      }

      await payment.save();

      return NextResponse.json({
        success: true,
        message: "Payment rejected successfully",
        data: {
          _id: payment._id,
          paymentNo: payment.paymentNo,
          status: payment.paymentDetails.paymentStatus,
          remarks: payment.paymentDetails.remarks,
          subCompanyName: payment.subCompanyName
        }
      }, { status: 200 });
    }

    // Update status only (for Pending status changes)
    if (action === 'update-status') {
      if (payment.bankIntegration?.provider === 'ICICI_CIB') return NextResponse.json({ success: false, message: 'ICICI transaction status is bank-controlled. Use status inquiry to refresh it.' }, { status: 409 });
      if (body.paymentStatus) {
        payment.paymentDetails.paymentStatus = body.paymentStatus;
        payment.status = body.paymentStatus;
      }

      if (body.remarks !== undefined) {
        payment.paymentDetails.remarks = body.remarks;
      }

      await payment.save();

      return NextResponse.json({
        success: true,
        message: `Payment status updated to ${payment.paymentDetails.paymentStatus}`,
        data: {
          _id: payment._id,
          paymentNo: payment.paymentNo,
          status: payment.paymentDetails.paymentStatus,
          remarks: payment.paymentDetails.remarks,
          subCompanyName: payment.subCompanyName
        }
      }, { status: 200 });
    }

    return NextResponse.json({
      success: false,
      message: "Invalid action. Allowed: generate-queue, approve, reject, update-status"
    }, { status: 400 });

  } catch (error) {
    console.error("❌ PATCH /advance-payment error:", error);
    return NextResponse.json({
      success: false,
      message: error.message || "Failed to process request"
    }, { status: 500 });
  }
}
