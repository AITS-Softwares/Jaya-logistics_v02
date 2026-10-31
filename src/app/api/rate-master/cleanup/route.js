import {submitMasterChange} from '@/lib/masterApprovalService';
import {notifyMasterSubmission} from '@/lib/masterApprovalRoutes';
import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import RateMaster from "../schema";
import RateHistory from "../history-schema";
import Location from "../../locations/schema";
import { validateMasterDataRequest } from "@/lib/masterDataPermission";

export async function POST(req) {
  await connectDb();
  
  try {
    const { user, error, status } = await validateMasterDataRequest(req, 'edit', 'Rate Master');
    if (error) return NextResponse.json({ success: false, message: error }, { status });

    const { masterId, locationId } = await req.json();

    const rateMaster = await RateMaster.findOne({
      _id: masterId,
      companyId: user.companyId,
    }).setOptions({includeUnapprovedMasters:true});

    if (!rateMaster) {
      return NextResponse.json({ success: false, message: "Rate master not found" }, { status: 404 });
    }

    // Get all active rates for this location
    const locationRates = rateMaster.locationRates.filter(
      r => r.locationId.toString() === locationId && r.isActive === true
    );
    
    // Find duplicates (same fromQty and toQty)
    const uniqueMap = new Map();
    const duplicates = [];
    
    locationRates.forEach(rate => {
      const key = `${rate.fromQty}-${rate.toQty}`;
      if (uniqueMap.has(key)) {
        duplicates.push(rate);
      } else {
        uniqueMap.set(key, rate);
      }
    });
    
    if (duplicates.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No duplicates found",
        duplicatesCount: 0 
      });
    }
    
    // Mark duplicates as inactive
    const updatedRates = rateMaster.locationRates.map(rate => {
      const isDuplicate = duplicates.some(d => d._id.toString() === rate._id.toString());
      if (isDuplicate && rate.isActive === true) {
        return { 
          ...rate.toObject(), 
          isActive: false, 
          revisedAt: new Date().toISOString()
        };
      }
      return rate;
    });
    
    const submitted=await submitMasterChange({Model:RateMaster,record:rateMaster,input:{locationRates:updatedRates},user,kind:'rate'});
    await notifyMasterSubmission(user,submitted,'rate');
    
    return NextResponse.json({
      success: true,
      message: `Submitted removal of ${duplicates.length} duplicate rate(s) for approval`,
      duplicatesCount: duplicates.length
    });
    
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: error.status || 500 });
  }
}
