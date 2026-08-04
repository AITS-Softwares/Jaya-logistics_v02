// src/app/api/subcompanies/route.js
import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import SubCompany from "./SubCompany";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

console.log("✅ SubCompanies API route loaded");

// Role-based access check
function isAuthorized(user) {
  return (
    user?.type === "company" ||
    user?.role === "Admin" ||
    user?.permissions?.includes("subcompany")
  );
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
    console.error("JWT Verification Failed:", err?.message || err);
    return { error: "Invalid token", status: 401 };
  }
}

// ========================================
// Helper: Generate sequential sub-company code
// ========================================
async function generateSubCompanyCode(companyId) {
  // Find the last sub-company for this company
  const lastSubCompany = await SubCompany.findOne(
    { companyId: companyId },
    { code: 1 }
  ).sort({ code: -1 });

  let lastNumber = 0;
  
  if (lastSubCompany && lastSubCompany.code) {
    // Extract the number from the code (e.g., SUB0000001 -> 1)
    const match = lastSubCompany.code.match(/SUB(\d+)/);
    if (match) {
      lastNumber = parseInt(match[1], 10);
    }
  }

  // Increment the number
  const nextNumber = lastNumber + 1;
  
  // Format: SUB + 7 digit number (padded with zeros)
  // This gives us SUB0000001 to SUB9999999
  const paddedNumber = String(nextNumber).padStart(7, '0');
  const newCode = `SUB${paddedNumber}`;

  console.log(`📝 Generated code: ${newCode} (from ${lastNumber} to ${nextNumber})`);
  
  return newCode;
}

// ========================================
// GET /api/subcompanies
// ========================================
export async function GET(req) {
  console.log("🚀 GET /api/subcompanies called");
  
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req);
    if (error) return NextResponse.json({ success: false, message: error }, { status });

    const url = new URL(req.url);
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build filter
    let filter = { companyId: user.companyId };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch sub-companies with pagination
    const [subCompanies, total] = await Promise.all([
      SubCompany.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SubCompany.countDocuments(filter)
    ]);

    return NextResponse.json({
      success: true,
      data: subCompanies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, { status: 200 });
  } catch (err) {
    console.error("GET /subcompanies error:", err);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to fetch sub-companies",
      error: err.message 
    }, { status: 500 });
  }
}

// ========================================
// POST /api/subcompanies
// ========================================
export async function POST(req) {
  console.log("🚀 POST /api/subcompanies called");
  
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req);
    if (error) return NextResponse.json({ success: false, message: error }, { status });

    const body = await req.json();
    const { name } = body;

    console.log("📝 Creating sub-company:", name);

    // Validation
    if (!name) {
      return NextResponse.json({ 
        success: false, 
        message: "Sub-company name is required" 
      }, { status: 400 });
    }

    // Check for duplicate sub-company name
    const existingSubCompany = await SubCompany.findOne({
      name: name.trim(),
      companyId: user.companyId
    });

    if (existingSubCompany) {
      return NextResponse.json({ 
        success: false, 
        message: "Sub-company name already exists" 
      }, { status: 400 });
    }

    // ✅ Generate sequential code (SUB0000001, SUB0000002, etc.)
    const code = await generateSubCompanyCode(user.companyId);

    // Create new sub-company with generated code
    const newSubCompany = new SubCompany({
      name: name.trim(),
      code: code,
      companyId: user.companyId,
      createdBy: user.id
    });

    await newSubCompany.save();
    console.log(`✅ Sub-company created: ${newSubCompany.name} (${newSubCompany.code})`);

    return NextResponse.json({ 
      success: true, 
      data: newSubCompany,
      message: `Sub-company created successfully with code: ${code}`
    }, { status: 201 });

  } catch (error) {
    console.error("POST /subcompanies error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to create sub-company",
      error: error.message 
    }, { status: 500 });
  }
}

// ========================================
// DELETE /api/subcompanies
// ========================================
export async function DELETE(req) {
  console.log("🚀 DELETE /api/subcompanies called");
  
  try {
    await connectDb();
    const { user, error, status } = await validateUser(req);
    if (error) return NextResponse.json({ success: false, message: error }, { status });

    const url = new URL(req.url);
    const subCompanyId = url.searchParams.get("id");

    if (!subCompanyId) {
      return NextResponse.json({ 
        success: false, 
        message: "Sub-company ID is required" 
      }, { status: 400 });
    }

    console.log("🗑️ Deleting sub-company:", subCompanyId);

    const deletedSubCompany = await SubCompany.findOneAndDelete({
      _id: subCompanyId,
      companyId: user.companyId
    });

    if (!deletedSubCompany) {
      return NextResponse.json({ 
        success: false, 
        message: "Sub-company not found" 
      }, { status: 404 });
    }

    console.log(`✅ Sub-company deleted: ${deletedSubCompany.name} (${deletedSubCompany.code})`);
    return NextResponse.json({ 
      success: true, 
      message: "Sub-company deleted successfully" 
    }, { status: 200 });

  } catch (error) {
    console.error("DELETE /subcompanies error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to delete sub-company",
      error: error.message 
    }, { status: 500 });
  }
}