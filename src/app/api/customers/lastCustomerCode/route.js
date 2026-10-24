import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Customer from "@/models/CustomerModel";
import { validateMasterDataRequest } from "@/lib/masterDataPermission";

export async function GET(req) {
  try {
    await dbConnect();
    
    const { user, error, status } = await validateMasterDataRequest(req, 'create', 'Customers');
    if (error) return NextResponse.json({ error }, { status });
    
    // Get the last customer for this company
    const lastCustomer = await Customer.findOne({ 
      companyId: user.companyId 
    }).sort({ customerCode: -1 }).limit(1);
    
    let lastCustomerCode = "CUST-0000";
    
    if (lastCustomer && lastCustomer.customerCode) {
      lastCustomerCode = lastCustomer.customerCode;
    }
    
    return NextResponse.json({ 
      success: true, 
      lastCustomerCode: lastCustomerCode 
    });
    
  } catch (error) {
    console.error("Error fetching last customer code:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch last customer code" 
    }, { status: 500 });
  }
}
