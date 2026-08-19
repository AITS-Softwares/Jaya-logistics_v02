// import { NextResponse } from "next/server";
// import connectDb from "@/lib/db";
// import RateMaster from "./schema";
// import RateHistory from "./history-schema";
// import Branch from "../branches/schema";
// import Location from "../locations/schema";
// import Customer from "@/models/CustomerModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// function isAuthorized(user) {
//   return (
//     user?.type === "company" ||
//     user?.role === "Admin" ||
//     user?.permissions?.includes("rate-master")
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
//     console.error("JWT Verification Failed:", err);
//     return { error: "Invalid token", status: 401 };
//   }
// }

// export async function GET(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get('id');
//     const history = searchParams.get('history');
//     const locationId = searchParams.get('locationId');
    
//     if (history && id && locationId) {
//       const historyData = await RateHistory.find({
//         rateMasterId: id,
//         locationId: locationId
//       }).sort({ revisedAt: -1 });
      
//       return NextResponse.json({ success: true, data: historyData }, { status: 200 });
//     }
    
//     if (history && id) {
//       const historyData = await RateHistory.find({
//         rateMasterId: id
//       }).sort({ revisedAt: -1 });
      
//       return NextResponse.json({ success: true, data: historyData }, { status: 200 });
//     }
    
//     if (id) {
//       const rateMaster = await RateMaster.findOne({
//         _id: id,
//         companyId: user.companyId,
//       });
      
//       if (!rateMaster) {
//         return NextResponse.json({ success: false, message: "Rate master not found" }, { status: 404 });
//       }
      
//       const branch = await Branch.findById(rateMaster.branchId);
//       const customer = await Customer.findById(rateMaster.customerId);
      
//       const locationRatesWithNames = await Promise.all(
//         rateMaster.locationRates.map(async (locRate) => {
//           const location = await Location.findById(locRate.locationId);
//           return {
//             _id: locRate._id,
//             locationId: locRate.locationId,
//             fromQty: locRate.fromQty,
//             toQty: locRate.toQty,
//             rate: locRate.rate,
//             locationName: location?.name || 'Unknown Location',
//             isActive: locRate.isActive,
//             createdAt: locRate.createdAt,
//             version: locRate.version
//           };
//         })
//       );
      
//       return NextResponse.json({ 
//         success: true, 
//         data: {
//           _id: rateMaster._id,
//           title: rateMaster.title,
//           customerId: rateMaster.customerId,
//           branchId: rateMaster.branchId,
//           companyId: rateMaster.companyId,
//           createdBy: rateMaster.createdBy,
//           isActive: rateMaster.isActive,
//           createdAt: rateMaster.createdAt,
//           updatedAt: rateMaster.updatedAt,
//           branchName: branch?.name || '',
//           customerName: customer?.customerName || '',
//           weightRule: rateMaster.weightRule,
//           approvalOption: rateMaster.approvalOption,
//           locationRates: locationRatesWithNames
//         }
//       }, { status: 200 });
//     }
    
//     const rateMasters = await RateMaster.find({
//       companyId: user.companyId,
//     }).sort({ createdAt: -1 });

//     const rateMastersWithNames = await Promise.all(
//       rateMasters.map(async (rm) => {
//         const branch = await Branch.findById(rm.branchId);
//         const customer = await Customer.findById(rm.customerId);
        
//         let locationRatesWithNames = [];
        
//         if (rm.locationRates && Array.isArray(rm.locationRates) && rm.locationRates.length > 0) {
//           locationRatesWithNames = await Promise.all(
//             rm.locationRates.map(async (locRate) => {
//               const location = await Location.findById(locRate.locationId);
//               return {
//                 _id: locRate._id,
//                 locationId: locRate.locationId,
//                 fromQty: locRate.fromQty,
//                 toQty: locRate.toQty,
//                 rate: locRate.rate,
//                 locationName: location?.name || 'Unknown Location',
//                 isActive: locRate.isActive,
//                 createdAt: locRate.createdAt,
//                 version: locRate.version
//               };
//             })
//           );
//         }
        
//         return {
//           _id: rm._id,
//           title: rm.title,
//           customerId: rm.customerId,
//           branchId: rm.branchId,
//           companyId: rm.companyId,
//           createdBy: rm.createdBy,
//           isActive: rm.isActive,
//           createdAt: rm.createdAt,
//           updatedAt: rm.updatedAt,
//           branchName: branch?.name || '',
//           branchCode: branch?.code || '',
//           customerName: customer?.customerName || '',
//           customerCode: customer?.customerCode || '',
//           weightRule: rm.weightRule,
//           approvalOption: rm.approvalOption,
//           locationRates: locationRatesWithNames
//         };
//       })
//     );

//     return NextResponse.json({ success: true, data: rateMastersWithNames }, { status: 200 });
//   } catch (err) {
//     console.error("GET /rate-master error:", err);
//     return NextResponse.json({ success: false, message: "Failed to fetch rate masters" }, { status: 500 });
//   }
// }

// export async function PUT(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const url = new URL(req.url);
//     const rateMasterId = url.searchParams.get("id");
//     const { title, customerId, branchId, locationRates, weightRule, approvalOption, rateId } = await req.json();

//     if (!rateMasterId) {
//       return NextResponse.json({ success: false, message: "Rate master ID is required" }, { status: 400 });
//     }

//     const existingRateMaster = await RateMaster.findOne({ 
//       _id: rateMasterId, 
//       companyId: user.companyId 
//     });
    
//     if (!existingRateMaster) {
//       return NextResponse.json({ success: false, message: "Rate master not found" }, { status: 404 });
//     }

//     const finalTitle = title !== undefined ? title : existingRateMaster.title;
//     const finalCustomerId = customerId !== undefined ? customerId : existingRateMaster.customerId;
//     const finalBranchId = branchId !== undefined ? branchId : existingRateMaster.branchId;
//     const finalWeightRule = weightRule !== undefined ? weightRule : existingRateMaster.weightRule;
//     const finalApprovalOption = approvalOption !== undefined ? approvalOption : existingRateMaster.approvalOption;
    
//     if (!finalTitle || !finalTitle.trim()) {
//       return NextResponse.json({ success: false, message: "Title is required" }, { status: 400 });
//     }

//     let validatedLocationRates = [];
    
//     // If updating a single rate (revision)
//     if (rateId && locationRates && locationRates.length === 1) {
//       const oldRate = existingRateMaster.locationRates.find(r => r._id.toString() === rateId);
      
//       if (!oldRate) {
//         return NextResponse.json({ success: false, message: "Rate not found" }, { status: 404 });
//       }
      
//       const newRate = locationRates[0];
//       const fromQty = parseFloat(newRate.fromQty);
//       const toQty = parseFloat(newRate.toQty);
//       const rate = parseFloat(newRate.rate);
      
//       if (isNaN(fromQty) || isNaN(toQty) || isNaN(rate)) {
//         return NextResponse.json({ success: false, message: "Invalid numbers" }, { status: 400 });
//       }
      
//       if (fromQty >= toQty) {
//         return NextResponse.json({ success: false, message: "From quantity must be less than To quantity" }, { status: 400 });
//       }
      
//       // Check for overlaps with other active rates in same location
//       const otherRates = existingRateMaster.locationRates.filter(
//         r => r.locationId.toString() === oldRate.locationId.toString() && 
//         r._id.toString() !== rateId && 
//         r.isActive === true
//       );
      
//       for (let other of otherRates) {
//         if ((fromQty >= other.fromQty && fromQty < other.toQty) ||
//             (toQty > other.fromQty && toQty <= other.toQty) ||
//             (fromQty <= other.fromQty && toQty >= other.toQty)) {
//           const location = await Location.findById(oldRate.locationId);
//           return NextResponse.json({ 
//             success: false, 
//             message: `Weight range ${fromQty}-${toQty} overlaps with existing range ${other.fromQty}-${other.toQty} for location ${location?.name}. Please fix the ranges.` 
//           }, { status: 400 });
//         }
//       }
      
//       // Save to history with the new createdAt date
//       const location = await Location.findById(oldRate.locationId);
//       await RateHistory.create({
//         rateMasterId: existingRateMaster._id,
//         rateMasterTitle: existingRateMaster.title,
//         locationId: oldRate.locationId,
//         locationName: location?.name || 'Unknown',
//         fromQty: oldRate.fromQty,
//         toQty: oldRate.toQty,
//         rate: oldRate.rate,
//         version: (oldRate.version || 1),
//         revisedBy: user.id,
//         action: 'REVISED',
//         changes: {
//           oldFromQty: oldRate.fromQty,
//           oldToQty: oldRate.toQty,
//           oldRate: oldRate.rate,
//           newFromQty: fromQty,
//           newToQty: toQty,
//           newRate: rate,
//           newCreatedAt: newRate.createdAt || null  // Track createdAt change
//         }
//       });
      
//       // Mark old rate as inactive
//       let updatedRates = existingRateMaster.locationRates.map(r => {
//         if (r._id.toString() === rateId) {
//           return {
//             ...r.toObject(),
//             isActive: false
//           };
//         }
//         return r;
//       });
      
//       // Add new rate with custom createdAt date
//       const maxVersion = Math.max(...existingRateMaster.locationRates
//         .filter(r => r.locationId.toString() === oldRate.locationId.toString())
//         .map(r => r.version || 1), 0) + 1;
      
//       // Use the provided createdAt date or keep the old one or use current date
//       let newCreatedAt = new Date();
//       if (newRate.createdAt) {
//         newCreatedAt = new Date(newRate.createdAt);
//       }
      
//       const newRateObj = {
//         locationId: oldRate.locationId,
//         fromQty: fromQty,
//         toQty: toQty,
//         rate: rate,
//         isActive: true,
//         createdAt: newCreatedAt,  // Use the custom date
//         version: maxVersion
//       };
      
//       validatedLocationRates = [...updatedRates, newRateObj];
      
//     } else if (locationRates && Array.isArray(locationRates)) {
//       // For bulk updates, preserve or update createdAt
//       validatedLocationRates = locationRates.map(rate => {
//         // If rate has createdAt, use it, otherwise keep existing or use current
//         if (rate.createdAt) {
//           return {
//             ...rate,
//             createdAt: new Date(rate.createdAt)
//           };
//         }
//         return rate;
//       });
//     } else {
//       validatedLocationRates = existingRateMaster.locationRates;
//     }

//     const updatedRateMaster = await RateMaster.findOneAndUpdate(
//       { _id: rateMasterId, companyId: user.companyId },
//       {
//         title: finalTitle.trim(),
//         customerId: finalCustomerId,
//         branchId: finalBranchId,
//         locationRates: validatedLocationRates,
//         weightRule: finalWeightRule,
//         approvalOption: finalApprovalOption
//       },
//       { new: true }
//     );

//     const branch = await Branch.findById(updatedRateMaster.branchId);
//     const customer = await Customer.findById(updatedRateMaster.customerId);
    
//     const locationRatesWithNames = await Promise.all(
//       updatedRateMaster.locationRates.map(async (locRate) => {
//         const location = await Location.findById(locRate.locationId);
//         return {
//           _id: locRate._id,
//           locationId: locRate.locationId,
//           fromQty: locRate.fromQty,
//           toQty: locRate.toQty,
//           rate: locRate.rate,
//           locationName: location?.name || 'Unknown Location',
//           isActive: locRate.isActive,
//           createdAt: locRate.createdAt,
//           version: locRate.version
//         };
//       })
//     );

//     return NextResponse.json({ 
//       success: true, 
//       data: {
//         _id: updatedRateMaster._id,
//         title: updatedRateMaster.title,
//         customerId: updatedRateMaster.customerId,
//         branchId: updatedRateMaster.branchId,
//         companyId: updatedRateMaster.companyId,
//         createdBy: updatedRateMaster.createdBy,
//         isActive: updatedRateMaster.isActive,
//         createdAt: updatedRateMaster.createdAt,
//         updatedAt: updatedRateMaster.updatedAt,
//         branchName: branch?.name || '',
//         customerName: customer?.customerName || '',
//         weightRule: updatedRateMaster.weightRule,
//         approvalOption: updatedRateMaster.approvalOption,
//         locationRates: locationRatesWithNames
//       }
//     }, { status: 200 });
//   } catch (error) {
//     console.error("PUT /rate-master error:", error);
//     return NextResponse.json({ success: false, message: "Failed to update rate master: " + error.message }, { status: 500 });
//   }
// }


// export async function DELETE(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const url = new URL(req.url);
//     const rateMasterId = url.searchParams.get("id");
//     const rateId = url.searchParams.get("rateId");

//     if (!rateMasterId) {
//       return NextResponse.json({ success: false, message: "Rate master ID is required" }, { status: 400 });
//     }

//     const rateMaster = await RateMaster.findOne({
//       _id: rateMasterId,
//       companyId: user.companyId,
//     });
    
//     if (!rateMaster) {
//       return NextResponse.json({ success: false, message: "Rate master not found" }, { status: 404 });
//     }

//     if (rateId) {
//       const rateToDelete = rateMaster.locationRates.find(r => r._id.toString() === rateId);
      
//       if (rateToDelete) {
//         const location = await Location.findById(rateToDelete.locationId);
//         await RateHistory.create({
//           rateMasterId: rateMaster._id,
//           rateMasterTitle: rateMaster.title,
//           locationId: rateToDelete.locationId,
//           locationName: location?.name || 'Unknown',
//           fromQty: rateToDelete.fromQty,
//           toQty: rateToDelete.toQty,
//           rate: rateToDelete.rate,
//           version: rateToDelete.version || 1,
//           revisedBy: user.id,
//           action: 'DELETED'
//         });
//       }
      
//       const updatedRates = rateMaster.locationRates.filter(r => r._id.toString() !== rateId);
//       rateMaster.locationRates = updatedRates;
//       await rateMaster.save();
      
//       return NextResponse.json({ success: true, message: "Rate deleted successfully" }, { status: 200 });
//     }
    
//     for (let rate of rateMaster.locationRates) {
//       const location = await Location.findById(rate.locationId);
//       await RateHistory.create({
//         rateMasterId: rateMaster._id,
//         rateMasterTitle: rateMaster.title,
//         locationId: rate.locationId,
//         locationName: location?.name || 'Unknown',
//         fromQty: rate.fromQty,
//         toQty: rate.toQty,
//         rate: rate.rate,
//         version: rate.version || 1,
//         revisedBy: user.id,
//         action: 'DELETED'
//       });
//     }

//     const deletedRateMaster = await RateMaster.findOneAndDelete({
//       _id: rateMasterId,
//       companyId: user.companyId,
//     });

//     if (!deletedRateMaster) {
//       return NextResponse.json({ success: false, message: "Rate master not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, message: "Rate master deleted successfully" }, { status: 200 });
//   } catch (error) {
//     console.error("DELETE /rate-master error:", error);
//     return NextResponse.json({ success: false, message: "Failed to delete rate master" }, { status: 500 });
//   }
// }

import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import RateMaster from "./schema";
import RateHistory from "./history-schema";
import Branch from "../branches/schema";
import Location from "../locations/schema";
import Customer from "@/models/CustomerModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import fs from 'fs';
import path from 'path';

// ✅ Role-based access for vehicle negotiation management
function isAuthorized(user) {
  if (!user) return false;

  // ✅ Company users have full access
  if (user.type === "company") return true;

  // ✅ Check for specific roles
  const allowedRoles = [
    "admin",
    "sales manager",
    "purchase manager",
    "inventory manager",
    "accounts manager",
    "hr manager",
    "support executive",
    "production head",
    "project manager"
  ];

  // Handle both single role and roles array
  const userRoles = Array.isArray(user.roles) 
    ? user.roles 
    : (user.role ? [user.role] : []);

  const hasAllowedRole = userRoles.some(role =>
    allowedRoles.includes(role.trim().toLowerCase())
  );

  if (hasAllowedRole) return true;

  // ✅ Check for specific permission (if your system uses permissions)
  if (Array.isArray(user.permissions) && 
      user.permissions.includes("vehicle_negotiation")) {
    return true;
  }

  return false;
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };

  try {
    const user = await verifyJWT(token);
    if (!user) return { error: "Invalid token", status: 401 };
    if (!isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user, error: null, status: 200 };
  } catch (err) {
    console.error("JWT Verification Failed:", err);
    return { error: "Invalid token", status: 401 };
  }
}

export async function GET(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const history = searchParams.get('history');
    const locationId = searchParams.get('locationId');
    
    if (history && id && locationId) {
      const historyData = await RateHistory.find({
        rateMasterId: id,
        locationId: locationId
      }).sort({ revisedAt: -1 });
      
      return NextResponse.json({ success: true, data: historyData }, { status: 200 });
    }
    
    if (history && id) {
      const historyData = await RateHistory.find({
        rateMasterId: id
      }).sort({ revisedAt: -1 });
      
      return NextResponse.json({ success: true, data: historyData }, { status: 200 });
    }
    
    if (id) {
      const rateMaster = await RateMaster.findOne({
        _id: id,
        companyId: user.companyId,
      });
      
      if (!rateMaster) {
        return NextResponse.json({ success: false, message: "Rate master not found" }, { status: 404 });
      }
      
      const branch = await Branch.findById(rateMaster.branchId);
      const customer = await Customer.findById(rateMaster.customerId);
      
      const locationRatesWithNames = await Promise.all(
        rateMaster.locationRates.map(async (locRate) => {
          const location = await Location.findById(locRate.locationId);
          return {
            _id: locRate._id,
            locationId: locRate.locationId,
            fromQty: locRate.fromQty,
            toQty: locRate.toQty,
            rate: locRate.rate,
            locationName: location?.name || 'Unknown Location',
            isActive: locRate.isActive,
            createdAt: locRate.createdAt,
            version: locRate.version
          };
        })
      );
      
      return NextResponse.json({ 
        success: true, 
        data: {
          _id: rateMaster._id,
          title: rateMaster.title,
          customerId: rateMaster.customerId,
          branchId: rateMaster.branchId,
          companyId: rateMaster.companyId,
          createdBy: rateMaster.createdBy,
          isActive: rateMaster.isActive,
          createdAt: rateMaster.createdAt,
          updatedAt: rateMaster.updatedAt,
          branchName: branch?.name || '',
          customerName: customer?.customerName || '',
          weightRule: rateMaster.weightRule,
          customWeightRule: rateMaster.customWeightRule || '',
          customRuleType: rateMaster.customRuleType || '',
          customRuleLimit: rateMaster.customRuleLimit || null,
          customRuleToLimit: rateMaster.customRuleToLimit || null,
          approvalOption: rateMaster.approvalOption,
          approvalFile: rateMaster.approvalFile || {
            fileName: '',
            filePath: '',
            fileType: '',
            fileSize: 0,
            uploadedAt: null
          },
          locationRates: locationRatesWithNames
        }
      }, { status: 200 });
    }
    
    const rateMasters = await RateMaster.find({
      companyId: user.companyId,
    }).sort({ createdAt: -1 });

    const rateMastersWithNames = await Promise.all(
      rateMasters.map(async (rm) => {
        const branch = await Branch.findById(rm.branchId);
        const customer = await Customer.findById(rm.customerId);
        
        let locationRatesWithNames = [];
        
        if (rm.locationRates && Array.isArray(rm.locationRates) && rm.locationRates.length > 0) {
          locationRatesWithNames = await Promise.all(
            rm.locationRates.map(async (locRate) => {
              const location = await Location.findById(locRate.locationId);
              return {
                _id: locRate._id,
                locationId: locRate.locationId,
                fromQty: locRate.fromQty,
                toQty: locRate.toQty,
                rate: locRate.rate,
                locationName: location?.name || 'Unknown Location',
                isActive: locRate.isActive,
                createdAt: locRate.createdAt,
                version: locRate.version
              };
            })
          );
        }
        
        return {
          _id: rm._id,
          title: rm.title,
          customerId: rm.customerId,
          branchId: rm.branchId,
          companyId: rm.companyId,
          createdBy: rm.createdBy,
          isActive: rm.isActive,
          createdAt: rm.createdAt,
          updatedAt: rm.updatedAt,
          branchName: branch?.name || '',
          branchCode: branch?.code || '',
          customerName: customer?.customerName || '',
          customerCode: customer?.customerCode || '',
          weightRule: rm.weightRule,
          customWeightRule: rm.customWeightRule || '',
          customRuleType: rm.customRuleType || '',
          customRuleLimit: rm.customRuleLimit || null,
          customRuleToLimit: rm.customRuleToLimit || null,
          approvalOption: rm.approvalOption,
          approvalFile: rm.approvalFile || {
            fileName: '',
            filePath: '',
            fileType: '',
            fileSize: 0,
            uploadedAt: null
          },
          locationRates: locationRatesWithNames
        };
      })
    );

    return NextResponse.json({ success: true, data: rateMastersWithNames }, { status: 200 });
  } catch (err) {
    console.error("GET /rate-master error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch rate masters" }, { status: 500 });
  }
}

export async function POST(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { 
      title, 
      customerId, 
      branchId, 
      locationRates, 
      weightRule, 
      customWeightRule,
      customRuleType,
      customRuleLimit,
      customRuleToLimit,
      approvalOption,
      approvalFile
    } = await req.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, message: "Title is required" }, { status: 400 });
    }
    if (!customerId) {
      return NextResponse.json({ success: false, message: "Customer is required" }, { status: 400 });
    }
    if (!branchId) {
      return NextResponse.json({ success: false, message: "Branch is required" }, { status: 400 });
    }
    if (!approvalOption) {
      return NextResponse.json({ success: false, message: "Approval option is required" }, { status: 400 });
    }
    if (weightRule === 'custom') {
      if (!customRuleType) {
        return NextResponse.json({ success: false, message: "Rule type is required for custom rule" }, { status: 400 });
      }
      if (!customRuleLimit || customRuleLimit <= 0) {
        return NextResponse.json({ success: false, message: "Valid weight limit is required for custom rule" }, { status: 400 });
      }
      if (customRuleType === 'between' && (!customRuleToLimit || customRuleToLimit <= customRuleLimit)) {
        return NextResponse.json({ success: false, message: "To weight must be greater than From weight" }, { status: 400 });
      }
    }

    const existingRateMaster = await RateMaster.findOne({
      title: title.trim(),
      companyId: user.companyId,
    });

    if (existingRateMaster) {
      return NextResponse.json({ success: false, message: "Rate master with this title already exists" }, { status: 400 });
    }

    let finalCustomWeightRule = customWeightRule;
    if (weightRule === 'custom' && !finalCustomWeightRule) {
      if (customRuleType === 'above') {
        finalCustomWeightRule = `Above ${customRuleLimit} kg`;
      } else if (customRuleType === 'below') {
        finalCustomWeightRule = `Below ${customRuleLimit} kg`;
      } else if (customRuleType === 'between') {
        finalCustomWeightRule = `Between ${customRuleLimit} - ${customRuleToLimit} kg`;
      }
    }

    const newRateMaster = new RateMaster({
      title: title.trim(),
      customerId,
      branchId,
      locationRates: locationRates || [],
      weightRule: weightRule || 'all_weights',
      customWeightRule: finalCustomWeightRule || '',
      customRuleType: customRuleType || '',
      customRuleLimit: customRuleLimit || null,
      customRuleToLimit: customRuleToLimit || null,
      approvalOption,
      approvalFile: approvalFile || {
        fileName: '',
        filePath: '',
        fileType: '',
        fileSize: 0,
        uploadedAt: null
      },
      companyId: user.companyId,
      createdBy: user.id,
    });

    await newRateMaster.save();

    return NextResponse.json({
      success: true,
      message: "Rate master created successfully",
      data: newRateMaster
    }, { status: 201 });

  } catch (error) {
    console.error("POST /rate-master error:", error);
    return NextResponse.json({ success: false, message: "Failed to create rate master: " + error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const url = new URL(req.url);
    const rateMasterId = url.searchParams.get("id");
    const { 
      title, 
      customerId, 
      branchId, 
      locationRates, 
      weightRule, 
      customWeightRule,
      customRuleType,
      customRuleLimit,
      customRuleToLimit,
      approvalOption,
      approvalFile,
      rateId 
    } = await req.json();

    if (!rateMasterId) {
      return NextResponse.json({ success: false, message: "Rate master ID is required" }, { status: 400 });
    }

    const existingRateMaster = await RateMaster.findOne({ 
      _id: rateMasterId, 
      companyId: user.companyId 
    });
    
    if (!existingRateMaster) {
      return NextResponse.json({ success: false, message: "Rate master not found" }, { status: 404 });
    }

    const finalTitle = title !== undefined ? title : existingRateMaster.title;
    const finalCustomerId = customerId !== undefined ? customerId : existingRateMaster.customerId;
    const finalBranchId = branchId !== undefined ? branchId : existingRateMaster.branchId;
    const finalWeightRule = weightRule !== undefined ? weightRule : existingRateMaster.weightRule;
    const finalApprovalOption = approvalOption !== undefined ? approvalOption : existingRateMaster.approvalOption;
    
    let finalCustomWeightRule = customWeightRule !== undefined ? customWeightRule : existingRateMaster.customWeightRule || '';
    let finalCustomRuleType = customRuleType !== undefined ? customRuleType : existingRateMaster.customRuleType || '';
    let finalCustomRuleLimit = customRuleLimit !== undefined ? customRuleLimit : existingRateMaster.customRuleLimit || null;
    let finalCustomRuleToLimit = customRuleToLimit !== undefined ? customRuleToLimit : existingRateMaster.customRuleToLimit || null;
    
    // Handle approval file
    let finalApprovalFile = existingRateMaster.approvalFile || {
      fileName: '',
      filePath: '',
      fileType: '',
      fileSize: 0,
      uploadedAt: null
    };
    
    if (approvalFile !== undefined) {
      finalApprovalFile = approvalFile;
    }
    
    if (finalWeightRule === 'custom') {
      if (!finalCustomRuleType) {
        return NextResponse.json({ success: false, message: "Rule type is required for custom rule" }, { status: 400 });
      }
      if (!finalCustomRuleLimit || finalCustomRuleLimit <= 0) {
        return NextResponse.json({ success: false, message: "Valid weight limit is required for custom rule" }, { status: 400 });
      }
      if (finalCustomRuleType === 'between' && (!finalCustomRuleToLimit || finalCustomRuleToLimit <= finalCustomRuleLimit)) {
        return NextResponse.json({ success: false, message: "To weight must be greater than From weight" }, { status: 400 });
      }
      
      if (!finalCustomWeightRule) {
        if (finalCustomRuleType === 'above') {
          finalCustomWeightRule = `Above ${finalCustomRuleLimit} kg`;
        } else if (finalCustomRuleType === 'below') {
          finalCustomWeightRule = `Below ${finalCustomRuleLimit} kg`;
        } else if (finalCustomRuleType === 'between') {
          finalCustomWeightRule = `Between ${finalCustomRuleLimit} - ${finalCustomRuleToLimit} kg`;
        }
      }
    } else {
      finalCustomWeightRule = '';
      finalCustomRuleType = '';
      finalCustomRuleLimit = null;
      finalCustomRuleToLimit = null;
    }
    
    if (!finalTitle || !finalTitle.trim()) {
      return NextResponse.json({ success: false, message: "Title is required" }, { status: 400 });
    }

    let validatedLocationRates = [];
    
    if (rateId && locationRates && locationRates.length === 1) {
      const oldRate = existingRateMaster.locationRates.find(r => r._id.toString() === rateId);
      
      if (!oldRate) {
        return NextResponse.json({ success: false, message: "Rate not found" }, { status: 404 });
      }
      
      const newRate = locationRates[0];
      const fromQty = parseFloat(newRate.fromQty);
      const toQty = parseFloat(newRate.toQty);
      const rate = parseFloat(newRate.rate);
      
      if (isNaN(fromQty) || isNaN(toQty) || isNaN(rate)) {
        return NextResponse.json({ success: false, message: "Invalid numbers" }, { status: 400 });
      }
      
      if (fromQty >= toQty) {
        return NextResponse.json({ success: false, message: "From quantity must be less than To quantity" }, { status: 400 });
      }
      
      if (finalWeightRule === 'custom' && finalCustomRuleType) {
        const limit = parseFloat(finalCustomRuleLimit);
        const toLimit = parseFloat(finalCustomRuleToLimit);
        
        if (finalCustomRuleType === 'above' && fromQty < limit) {
          return NextResponse.json({ 
            success: false, 
            message: `Weight must be ${limit} kg or above. Current from weight: ${fromQty} kg` 
          }, { status: 400 });
        }
        if (finalCustomRuleType === 'below' && toQty > limit) {
          return NextResponse.json({ 
            success: false, 
            message: `Weight must be ${limit} kg or below. Current to weight: ${toQty} kg` 
          }, { status: 400 });
        }
        if (finalCustomRuleType === 'between' && (fromQty < limit || toQty > toLimit)) {
          return NextResponse.json({ 
            success: false, 
            message: `Weight must be between ${limit} and ${toLimit} kg. Current range: ${fromQty}-${toQty} kg` 
          }, { status: 400 });
        }
      }
      
      const otherRates = existingRateMaster.locationRates.filter(
        r => r.locationId.toString() === oldRate.locationId.toString() && 
        r._id.toString() !== rateId && 
        r.isActive === true
      );
      
      for (let other of otherRates) {
        if ((fromQty >= other.fromQty && fromQty < other.toQty) ||
            (toQty > other.fromQty && toQty <= other.toQty) ||
            (fromQty <= other.fromQty && toQty >= other.toQty)) {
          const location = await Location.findById(oldRate.locationId);
          return NextResponse.json({ 
            success: false, 
            message: `Weight range ${fromQty}-${toQty} overlaps with existing range ${other.fromQty}-${other.toQty} for location ${location?.name}. Please fix the ranges.` 
          }, { status: 400 });
        }
      }
      
      const location = await Location.findById(oldRate.locationId);
      await RateHistory.create({
        rateMasterId: existingRateMaster._id,
        rateMasterTitle: existingRateMaster.title,
        locationId: oldRate.locationId,
        locationName: location?.name || 'Unknown',
        fromQty: oldRate.fromQty,
        toQty: oldRate.toQty,
        rate: oldRate.rate,
        version: (oldRate.version || 1),
        revisedBy: user.id,
        action: 'REVISED',
        changes: {
          oldFromQty: oldRate.fromQty,
          oldToQty: oldRate.toQty,
          oldRate: oldRate.rate,
          newFromQty: fromQty,
          newToQty: toQty,
          newRate: rate,
          newCreatedAt: newRate.createdAt || null
        }
      });
      
      let updatedRates = existingRateMaster.locationRates.map(r => {
        if (r._id.toString() === rateId) {
          return {
            ...r.toObject(),
            isActive: false
          };
        }
        return r;
      });
      
      const maxVersion = Math.max(...existingRateMaster.locationRates
        .filter(r => r.locationId.toString() === oldRate.locationId.toString())
        .map(r => r.version || 1), 0) + 1;
      
      let newCreatedAt = new Date();
      if (newRate.createdAt) {
        newCreatedAt = new Date(newRate.createdAt);
      }
      
      const newRateObj = {
        locationId: oldRate.locationId,
        fromQty: fromQty,
        toQty: toQty,
        rate: rate,
        isActive: true,
        createdAt: newCreatedAt,
        version: maxVersion
      };
      
      validatedLocationRates = [...updatedRates, newRateObj];
      
    } else if (locationRates && Array.isArray(locationRates)) {
      validatedLocationRates = locationRates.map(rate => {
        if (rate.createdAt) {
          return {
            ...rate,
            createdAt: new Date(rate.createdAt)
          };
        }
        return rate;
      });
    } else {
      validatedLocationRates = existingRateMaster.locationRates;
    }

    const updatedRateMaster = await RateMaster.findOneAndUpdate(
      { _id: rateMasterId, companyId: user.companyId },
      {
        title: finalTitle.trim(),
        customerId: finalCustomerId,
        branchId: finalBranchId,
        locationRates: validatedLocationRates,
        weightRule: finalWeightRule,
        customWeightRule: finalCustomWeightRule,
        customRuleType: finalCustomRuleType,
        customRuleLimit: finalCustomRuleLimit,
        customRuleToLimit: finalCustomRuleToLimit,
        approvalOption: finalApprovalOption,
        approvalFile: finalApprovalFile
      },
      { new: true }
    );

    const branch = await Branch.findById(updatedRateMaster.branchId);
    const customer = await Customer.findById(updatedRateMaster.customerId);
    
    const locationRatesWithNames = await Promise.all(
      updatedRateMaster.locationRates.map(async (locRate) => {
        const location = await Location.findById(locRate.locationId);
        return {
          _id: locRate._id,
          locationId: locRate.locationId,
          fromQty: locRate.fromQty,
          toQty: locRate.toQty,
          rate: locRate.rate,
          locationName: location?.name || 'Unknown Location',
          isActive: locRate.isActive,
          createdAt: locRate.createdAt,
          version: locRate.version
        };
      })
    );

    return NextResponse.json({ 
      success: true, 
      data: {
        _id: updatedRateMaster._id,
        title: updatedRateMaster.title,
        customerId: updatedRateMaster.customerId,
        branchId: updatedRateMaster.branchId,
        companyId: updatedRateMaster.companyId,
        createdBy: updatedRateMaster.createdBy,
        isActive: updatedRateMaster.isActive,
        createdAt: updatedRateMaster.createdAt,
        updatedAt: updatedRateMaster.updatedAt,
        branchName: branch?.name || '',
        customerName: customer?.customerName || '',
        weightRule: updatedRateMaster.weightRule,
        customWeightRule: updatedRateMaster.customWeightRule || '',
        customRuleType: updatedRateMaster.customRuleType || '',
        customRuleLimit: updatedRateMaster.customRuleLimit || null,
        customRuleToLimit: updatedRateMaster.customRuleToLimit || null,
        approvalOption: updatedRateMaster.approvalOption,
        approvalFile: updatedRateMaster.approvalFile || {
          fileName: '',
          filePath: '',
          fileType: '',
          fileSize: 0,
          uploadedAt: null
        },
        locationRates: locationRatesWithNames
      }
    }, { status: 200 });
  } catch (error) {
    console.error("PUT /rate-master error:", error);
    return NextResponse.json({ success: false, message: "Failed to update rate master: " + error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const url = new URL(req.url);
    const rateMasterId = url.searchParams.get("id");
    const rateId = url.searchParams.get("rateId");

    if (!rateMasterId) {
      return NextResponse.json({ success: false, message: "Rate master ID is required" }, { status: 400 });
    }

    const rateMaster = await RateMaster.findOne({
      _id: rateMasterId,
      companyId: user.companyId,
    });
    
    if (!rateMaster) {
      return NextResponse.json({ success: false, message: "Rate master not found" }, { status: 404 });
    }

    if (rateId) {
      const rateToDelete = rateMaster.locationRates.find(r => r._id.toString() === rateId);
      
      if (rateToDelete) {
        const location = await Location.findById(rateToDelete.locationId);
        await RateHistory.create({
          rateMasterId: rateMaster._id,
          rateMasterTitle: rateMaster.title,
          locationId: rateToDelete.locationId,
          locationName: location?.name || 'Unknown',
          fromQty: rateToDelete.fromQty,
          toQty: rateToDelete.toQty,
          rate: rateToDelete.rate,
          version: rateToDelete.version || 1,
          revisedBy: user.id,
          action: 'DELETED'
        });
      }
      
      const updatedRates = rateMaster.locationRates.filter(r => r._id.toString() !== rateId);
      rateMaster.locationRates = updatedRates;
      await rateMaster.save();
      
      return NextResponse.json({ success: true, message: "Rate deleted successfully" }, { status: 200 });
    }
    
    for (let rate of rateMaster.locationRates) {
      const location = await Location.findById(rate.locationId);
      await RateHistory.create({
        rateMasterId: rateMaster._id,
        rateMasterTitle: rateMaster.title,
        locationId: rate.locationId,
        locationName: location?.name || 'Unknown',
        fromQty: rate.fromQty,
        toQty: rate.toQty,
        rate: rate.rate,
        version: rate.version || 1,
        revisedBy: user.id,
        action: 'DELETED'
      });
    }

    const deletedRateMaster = await RateMaster.findOneAndDelete({
      _id: rateMasterId,
      companyId: user.companyId,
    });

    if (!deletedRateMaster) {
      return NextResponse.json({ success: false, message: "Rate master not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Rate master deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /rate-master error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete rate master" }, { status: 500 });
  }
}
