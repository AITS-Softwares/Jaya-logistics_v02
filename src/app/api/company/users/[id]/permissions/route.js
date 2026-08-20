// src/app/api/company/users/[id]/permissions/route.js
import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ── PERMISSION DEFINITIONS ──
const MODULE_PERMISSIONS = {
  // Sales Modules
  "Order Panel": ['view', 'create', 'edit', 'delete', 'approve', 'reject'],
  "Vehicle Negotiation": ['view', 'create', 'edit', 'delete', 'approve'],
  "Vehicle Negotiation Placement": ['view', 'edit'],
  "Rate Target (Vehicle Negotiation)": ['view', 'edit'],
  "Pricing Panel": ['view', 'create', 'edit', 'delete', 'approve'],
  "Loading Info": ['view', 'create', 'edit', 'delete', 'approve'],
  "Purchase Panel": ['view', 'create', 'edit', 'delete', 'approve'],
  "Consignment Note": ['view', 'create', 'edit', 'delete', 'approve'],
  "Advance Payment": ['view', 'create', 'edit', 'delete', 'approve'],
  "Proof Of Delivery": ['view', 'create', 'edit', 'delete', 'approve'],
  "Balance-Payment": ['view', 'create', 'edit', 'delete', 'approve'],
  "Billing": ['view', 'create', 'edit', 'delete', 'approve'],
  "order-full-report": ['view', 'export', 'print'],

  // Purchase Modules
  "Purchase Quotation": ['view', 'create', 'edit', 'delete', 'approve'],
  "Purchase Order": ['view', 'create', 'edit', 'delete', 'approve'],
  "GRN": ['view', 'create', 'edit', 'delete'],
  "Purchase Invoice": ['view', 'create', 'edit', 'delete', 'approve'],
  "Debit Notes": ['view', 'create', 'edit', 'delete'],
  "Purchase Report": ['view', 'export', 'print'],

  // Masters
  "Master Data": ['view', 'create', 'edit', 'approve', 'reject'],
  "Rate Master": ['view', 'create', 'edit', 'approve', 'reject'],
  "Customers": ['view', 'create', 'edit', 'approve', 'reject'],
  "Suppliers": ['view', 'create', 'edit', 'approve', 'reject'],
  "Items": ['view', 'create', 'edit', 'approve', 'reject'],
  "Company": ['view', 'edit', 'approve', 'reject'],
  "Users": ['view', 'create', 'edit', 'delete'],
  "Accounts": ['view', 'create', 'edit', 'approve', 'reject'],
  "Employees": ['view', 'create', 'edit', 'approve', 'reject'],

  // Inventory
  "Inventory": ['view', 'create', 'edit', 'delete', 'adjust'],

  // Payment
  "Payment Entry": ['view', 'create', 'edit', 'delete', 'approve'],

  // Finance
  "Journal Entry": ['view', 'create', 'edit', 'delete', 'approve'],
  "Reports": ['view', 'export', 'print'],
  "Profit & Loss": ['view', 'export', 'print'],
  "Balance Sheet": ['view', 'export', 'print'],
  "Ageing": ['view', 'export', 'print'],
  "Statement": ['view', 'export', 'print'],
  "Bank Statement": ['view', 'export', 'print'],

  // Production
  "BoM": ['view', 'create', 'edit', 'delete'],
  "Production Order": ['view', 'create', 'edit', 'delete', 'approve'],

  // Project
  "Project": ['view', 'create', 'edit', 'delete'],
  "Task": ['view', 'create', 'edit', 'delete'],

  // CRM
  "Lead Generation": ['view', 'create', 'edit', 'delete'],
  "Opportunity": ['view', 'create', 'edit', 'delete'],
  "Campaign": ['view', 'create', 'edit', 'delete'],

  // Helpdesk
  "Tickets": ['view', 'create', 'edit', 'delete', 'resolve'],
  "Responses": ['view', 'create', 'edit', 'delete'],

  // PPC
  "PPC": ['view', 'create', 'edit', 'delete']
};

function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) {
    return { error: "Authentication required", status: 401 };
  }

  try {
    const user = verifyJWT(token);
    if (!user) {
      return { error: "Invalid token", status: 401 };
    }
    
    // Only company admins can manage permissions
    if (user.type !== 'company' && !user.roles?.includes('Admin')) {
      return { error: "Only company admins can manage permissions", status: 403 };
    }
    
    return { user, error: null, status: 200 };
  } catch (err) {
    console.error("JWT Verification Failed:", err);
    return { error: "Authentication failed", status: 401 };
  }
}

// ── PUT: Update user permissions ──
export async function PUT(req, { params }) {
  await connectDb();
  
  const { user, error, status } = validateUser(req);
  if (error) {
    return NextResponse.json({ 
      success: false, 
      message: error 
    }, { status });
  }

  try {
    const { id } = params;
    const body = await req.json();
    const { modules } = body;

    if (!modules || typeof modules !== 'object') {
      return NextResponse.json({ 
        success: false, 
        message: "Modules data is required" 
      }, { status: 400 });
    }

    // Find user
    const targetUser = await CompanyUser.findOne({
      _id: id,
      companyId: user.companyId
    });

    if (!targetUser) {
      return NextResponse.json({ 
        success: false, 
        message: "User not found" 
      }, { status: 404 });
    }

    // Validate and update modules
    const moduleMap = new Map();
    let hasChanges = false;

    Object.entries(modules).forEach(([moduleName, moduleData]) => {
      // Skip if module is not defined in permissions config
      if (!MODULE_PERMISSIONS[moduleName]) {
        return;
      }

      // Validate permissions
      const validPermissions = {};
      const availablePerms = MODULE_PERMISSIONS[moduleName];
      const providedPerms = moduleData.permissions || {};

      availablePerms.forEach(perm => {
        validPermissions[perm] = providedPerms[perm] === true;
      });

      moduleMap.set(moduleName, {
        selected: moduleData.selected === true,
        permissions: validPermissions
      });
      
      hasChanges = true;
    });

    if (!hasChanges) {
      return NextResponse.json({ 
        success: false, 
        message: "No valid modules found to update" 
      }, { status: 400 });
    }

    // Update modules
    targetUser.modules = moduleMap;
    await targetUser.save();

    // Convert Map to plain object for response
    const modulesObj = {};
    for (const [key, value] of targetUser.modules) {
      modulesObj[key] = {
        selected: value.selected || false,
        permissions: value.permissions || {}
      };
    }

    return NextResponse.json({
      success: true,
      message: "Permissions updated successfully",
      data: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        roles: targetUser.roles || [],
        modules: modulesObj
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Error updating permissions:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to update permissions" 
    }, { status: 500 });
  }
}

// ── GET: Get user permissions ──
export async function GET(req, { params }) {
  await connectDb();
  
  const { user, error, status } = validateUser(req);
  if (error) {
    return NextResponse.json({ 
      success: false, 
      message: error 
    }, { status });
  }

  try {
    const { id } = params;

    const targetUser = await CompanyUser.findOne({
      _id: id,
      companyId: user.companyId
    }).select('modules roles name email');

    if (!targetUser) {
      return NextResponse.json({ 
        success: false, 
        message: "User not found" 
      }, { status: 404 });
    }

    // Convert Map to plain object for response
    const modulesObj = {};
    if (targetUser.modules) {
      for (const [key, value] of targetUser.modules) {
        modulesObj[key] = {
          selected: value.selected || false,
          permissions: value.permissions || {}
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        roles: targetUser.roles || [],
        modules: modulesObj
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to fetch permissions" 
    }, { status: 500 });
  }
}
