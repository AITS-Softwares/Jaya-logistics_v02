// app/api/company/users/[id]/route.js
import dbConnect from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const SECRET = process.env.JWT_SECRET;

const VALID_ROLES = [
  "Admin", "crm", "masters", "Sales Manager", 
  "Purchase Manager", "Inventory Manager", "Accounts Manager", 
  "HR Manager", "Agent", "Production Head", "Project Manager", "Employee"
];

// ─── Helper ───
function verifyCompany(req) {
  const auth = req.headers.get("authorization") || "";
  const [, token] = auth.split(" ");
  if (!token) throw new Error("Unauthorized");
  const decoded = jwt.verify(token, SECRET);
  if (decoded.type !== "company") throw new Error("Forbidden");
  return decoded;
}

// ─── GET /api/company/users/[id] ───
export async function GET(req, { params }) {
  try {
    const company = verifyCompany(req);
    await dbConnect();

    const { id } = params;
    const user = await CompanyUser.findOne({
      _id: id,
      companyId: company.companyId,
    }).select("-password");

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (e) {
    console.error("GET /api/company/users/[id] error:", e);
    const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
    return NextResponse.json({ message: e.message }, { status });
  }
}

// ─── PUT /api/company/users/[id] ───
export async function PUT(req, { params }) {
  try {
    const company = verifyCompany(req);
    const { id } = params;
    const body = await req.json();
    
    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json(
        { message: "Name and email are required" },
        { status: 400 }
      );
    }

    // Validate roles if provided
    if (body.roles && !Array.isArray(body.roles)) {
      return NextResponse.json(
        { message: "Roles must be an array" },
        { status: 400 }
      );
    }

    if (body.roles) {
      const invalidRole = body.roles.find((r) => !VALID_ROLES.includes(r));
      if (invalidRole) {
        return NextResponse.json(
          { message: `Invalid role: ${invalidRole}` },
          { status: 400 }
        );
      }
    }

    await dbConnect();

    // Check if email is already taken by another user
    if (body.email) {
      const existingUser = await CompanyUser.findOne({
        _id: { $ne: id },
        companyId: company.companyId,
        email: body.email,
      });
      if (existingUser) {
        return NextResponse.json(
          { message: "Email already in use by another user" },
          { status: 409 }
        );
      }
    }

    // Find the user
    const user = await CompanyUser.findOne({
      _id: id,
      companyId: company.companyId,
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData = {
      name: body.name,
      email: body.email,
      roles: body.roles || user.roles,
      employeeId: body.employeeId || user.employeeId,
    };

    // Handle modules if provided
    if (body.modules && typeof body.modules === 'object') {
      // Convert modules to Map if needed
      if (user.modules instanceof Map) {
        for (const [key, value] of Object.entries(body.modules)) {
          user.modules.set(key, {
            selected: value.selected || false,
            permissions: value.permissions || {}
          });
        }
        updateData.modules = user.modules;
      } else {
        updateData.modules = body.modules;
      }
    }

    // Handle password update
    if (body.password && body.password.trim() !== "") {
      if (body.password.length < 8) {
        return NextResponse.json(
          { message: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    // Update user
    const updatedUser = await CompanyUser.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    return NextResponse.json(updatedUser);
  } catch (e) {
    console.error("PUT /api/company/users/[id] error:", e);
    const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
    return NextResponse.json({ message: e.message }, { status });
  }
}

// ─── DELETE /api/company/users/[id] ───
export async function DELETE(req, { params }) {
  try {
    const company = verifyCompany(req);
    await dbConnect();

    const { id } = params;

    // Don't allow deleting yourself
    if (id === company.id) {
      return NextResponse.json(
        { message: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const user = await CompanyUser.findOneAndDelete({
      _id: id,
      companyId: company.companyId,
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      message: "User deleted successfully" 
    });
  } catch (e) {
    console.error("DELETE /api/company/users/[id] error:", e);
    const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
    return NextResponse.json({ message: e.message }, { status });
  }
}