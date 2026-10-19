import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { activeOperatingCompanyId } from "@/lib/companyScope";

export async function GET(req) {
  try {
    await connectDb();
    
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, message: "Token missing" }, { status: 401 });
    }
    
    const user = await verifyJWT(token);
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }
    
    activeOperatingCompanyId(user);
    // Kept for older clients, but generating a preview must never consume a
    // sequence value. The number is assigned atomically when the payment saves.
    return NextResponse.json({ success: true, paymentNo: null, assignedOnSave: true });
    
  } catch (error) {
    console.error("Error generating payment number:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
