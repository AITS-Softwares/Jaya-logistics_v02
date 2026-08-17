// import { NextResponse } from 'next/server';
// import dbConnect from '@/lib/db';
// import User from '@/models/CompanyUser';
// import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

// export async function GET(req) {
//   try {
//     await dbConnect();

//     // Get JWT from header
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     if (!decoded) {
//       return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
//     }

//     const companyId = decoded.companyId; // Assuming token contains companyId

//     if (!companyId) {
//       return NextResponse.json({ message: 'Company ID missing in token' }, { status: 400 });
//     }

//     // Fetch users only belonging to the same company
//     const users = await User.find({ companyId });

//     return NextResponse.json(users, { status: 200 });
//   } catch (error) {
//     console.error('Error fetching users:', error);
//     return NextResponse.json(
//       { message: 'Error fetching users', error: error.message },
//       { status: 500 }
//     );
//   }
// }


// app/api/company/users/route.js
import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import bcrypt from "bcryptjs";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ── PERMISSION DEFINITIONS ──
const MODULE_PERMISSIONS = {
  // Sales Modules
  "Order Panel": ['view', 'create', 'edit', 'delete', 'approve', 'reject'],
  "Vehicle Negotiation": ['view', 'create', 'edit', 'delete', 'approve'],
  "Vehicle Negotiation Placement": ['view', 'edit'],
  "Rate Target (Vehicle Negotiation)": ['view', 'edit'],
  "Pricing Panel": ['view', 'create', 'edit', 'delete'],
  "Loading Info": ['view', 'create', 'edit', 'delete'],
  "Purchase Panel": ['view', 'create', 'edit', 'delete'],
  "Consignment Note": ['view', 'create', 'edit', 'delete'],
  "Advance Payment": ['view', 'create', 'edit', 'delete', 'approve'],
  "Proof Of Delivery": ['view', 'create', 'edit', 'delete'],
  "Balance-Payment": ['view', 'create', 'edit', 'delete'],
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
  "Customers": ['view', 'create', 'edit', 'delete'],
  "Suppliers": ['view', 'create', 'edit', 'delete'],
  "Items": ['view', 'create', 'edit', 'delete'],
  "Company": ['view', 'edit'],
  "Users": ['view', 'create', 'edit', 'delete'],
  "Accounts": ['view', 'create', 'edit', 'delete'],
  "Employees": ['view', 'create', 'edit', 'delete'],

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

// ── HELPER FUNCTIONS ──

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
    
    // Only company admins can manage users
    if (user.type !== 'company' && !user.roles?.includes('Admin')) {
      return { error: "Only company admins can manage users", status: 403 };
    }
    
    return { user, error: null, status: 200 };
  } catch (err) {
    console.error("JWT Verification Failed:", err);
    return { error: "Authentication failed", status: 401 };
  }
}

// Helper to create default modules with permissions
function createDefaultModules(roles = []) {
  const modules = new Map();
  
  // If user has Admin role, give full access to all modules
  if (roles.includes('Admin')) {
    Object.keys(MODULE_PERMISSIONS).forEach(moduleName => {
      const permissions = {};
      MODULE_PERMISSIONS[moduleName].forEach(perm => {
        permissions[perm] = true;
      });
      modules.set(moduleName, {
        selected: true,
        permissions
      });
    });
    return modules;
  }
  
  // For non-admin users, only enable modules based on their roles
  const roleModuleMap = {
    'Sales': ['Order Panel', 'Vehicle Negotiation', 'Rate Target (Vehicle Negotiation)', 'Pricing Panel', 'Loading Info',
              'Purchase Panel', 'Consignment Note', 'Advance Payment', 'Proof Of Delivery',
              'Balance-Payment', 'Billing', 'order-full-report'],
    'Sales Manager': ['Order Panel', 'Vehicle Negotiation', 'Rate Target (Vehicle Negotiation)', 'Pricing Panel', 'Loading Info',
                      'Purchase Panel', 'Consignment Note', 'Advance Payment', 'Proof Of Delivery',
                      'Balance-Payment', 'Billing', 'order-full-report'],
    'Purchase Manager': ['Purchase Quotation', 'Purchase Order', 'GRN', 'Purchase Invoice', 
                         'Debit Notes', 'Purchase Report'],
    'Inventory Manager': ['Inventory'],
    'Accounts Manager': ['Payment Entry', 'Journal Entry', 'Reports', 'Profit & Loss', 'Balance Sheet',
                         'Ageing', 'Statement', 'Bank Statement'],
    'HR Manager': ['Employees'],
    'crm': ['Lead Generation', 'Opportunity', 'Campaign'],
    'Agent': ['Tickets', 'Responses', 'Lead Generation', 'Opportunity'],
    'Production Head': ['BoM', 'Production Order', 'PPC'],
    'Project Manager': ['Project', 'Task'],
    'Employee': ['Employees']
  };
  
  // Enable modules based on roles
  roles.forEach(role => {
    const modulesToEnable = roleModuleMap[role] || [];
    modulesToEnable.forEach(moduleName => {
      if (MODULE_PERMISSIONS[moduleName]) {
        const permissions = {};
        // Default permissions: view and create for all, edit/delete/approve only for managers
        MODULE_PERMISSIONS[moduleName].forEach(perm => {
          if (perm === 'view' || perm === 'create') {
            permissions[perm] = true;
          } else if (role.includes('Manager') || role === 'Admin' || role === 'Production Head' || role === 'Project Manager') {
            permissions[perm] = true;
          } else {
            permissions[perm] = false;
          }
        });
        modules.set(moduleName, {
          selected: true,
          permissions
        });
      }
    });
  });
  
  return modules;
}

// ── GET: Fetch all users ──
export async function GET(req) {
  await connectDb();
  
  const { user, error, status } = validateUser(req);
  if (error) {
    return NextResponse.json({ 
      success: false, 
      message: error 
    }, { status });
  }

  try {
    const users = await CompanyUser.find({ 
      companyId: user.companyId 
    })
    .select('-password')
    .sort({ createdAt: -1 });

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to fetch users" 
    }, { status: 500 });
  }
}

// ── POST: Create new user ──
export async function POST(req) {
  await connectDb();
  
  const { user, error, status } = validateUser(req);
  if (error) {
    return NextResponse.json({ 
      success: false, 
      message: error 
    }, { status });
  }

  try {
    const body = await req.json();
    const { 
      name, 
      email, 
      password, 
      roles = [], 
      modules = {},
      employeeId,
      isActive = true 
    } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({ 
        success: false, 
        message: "Name, email, and password are required" 
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await CompanyUser.findOne({ 
      email: email.toLowerCase(),
      companyId: user.companyId 
    });
    
    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        message: "User with this email already exists" 
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Process modules - merge provided modules with default modules based on roles
    let moduleMap = new Map();
    
    // Start with default modules based on roles
    const defaultModules = createDefaultModules(roles);
    
    // Merge with provided modules (if any)
    if (modules && typeof modules === 'object') {
      Object.entries(modules).forEach(([moduleName, moduleData]) => {
        if (defaultModules.has(moduleName)) {
          const existing = defaultModules.get(moduleName);
          moduleMap.set(moduleName, {
            selected: moduleData.selected !== undefined ? moduleData.selected : existing.selected,
            permissions: {
              ...existing.permissions,
              ...(moduleData.permissions || {})
            }
          });
        } else {
          moduleMap.set(moduleName, {
            selected: moduleData.selected || false,
            permissions: moduleData.permissions || {}
          });
        }
      });
    } else {
      moduleMap = defaultModules;
    }

    // Create user
    const newUser = new CompanyUser({
      companyId: user.companyId,
      employeeId: employeeId || null,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      roles,
      modules: moduleMap,
      isActive,
      type: 'user'
    });

    await newUser.save();

    // Return user without password
    const userResponse = newUser.toObject();
    delete userResponse.password;

    return NextResponse.json({ 
      success: true, 
      message: "User created successfully",
      data: userResponse 
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to create user" 
    }, { status: 500 });
  }
}

// ── PUT: Update user ──
export async function PUT(req) {
  await connectDb();
  
  const { user, error, status } = validateUser(req);
  if (error) {
    return NextResponse.json({ 
      success: false, 
      message: error 
    }, { status });
  }

  try {
    const body = await req.json();
    const { 
      id, 
      name, 
      email, 
      password, 
      roles, 
      modules,
      employeeId,
      isActive 
    } = body;

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: "User ID is required" 
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

    // Update fields
    if (name) targetUser.name = name;
    if (email) targetUser.email = email.toLowerCase();
    if (employeeId !== undefined) targetUser.employeeId = employeeId;
    if (isActive !== undefined) targetUser.isActive = isActive;
    
    // Update password if provided
    if (password) {
      targetUser.password = await bcrypt.hash(password, 10);
    }

    // Update roles
    if (roles && Array.isArray(roles)) {
      targetUser.roles = roles;
      
      // If modules not provided, auto-update based on new roles
      if (!modules) {
        targetUser.modules = createDefaultModules(roles);
      }
    }

    // Update modules if provided
    if (modules && typeof modules === 'object') {
      const moduleMap = new Map();
      Object.entries(modules).forEach(([moduleName, moduleData]) => {
        moduleMap.set(moduleName, {
          selected: moduleData.selected || false,
          permissions: moduleData.permissions || {}
        });
      });
      targetUser.modules = moduleMap;
    }

    await targetUser.save();

    // Return updated user without password
    const userResponse = targetUser.toObject();
    delete userResponse.password;

    return NextResponse.json({ 
      success: true, 
      message: "User updated successfully",
      data: userResponse 
    }, { status: 200 });

  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to update user" 
    }, { status: 500 });
  }
}

// ── DELETE: Delete user ──
export async function DELETE(req) {
  await connectDb();
  
  const { user, error, status } = validateUser(req);
  if (error) {
    return NextResponse.json({ 
      success: false, 
      message: error 
    }, { status });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: "User ID is required" 
      }, { status: 400 });
    }

    // Find and delete user
    const result = await CompanyUser.deleteOne({
      _id: id,
      companyId: user.companyId
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "User not found" 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "User deleted successfully" 
    }, { status: 200 });

  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to delete user" 
    }, { status: 500 });
  }
}
