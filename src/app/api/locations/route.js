// import { NextResponse } from "next/server";
// import connectDb from "@/lib/db";
// import Location from "./schema";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// // Helper function to capitalize first letter of each word
// function capitalizeName(str) {
//   if (!str || typeof str !== 'string') return '';
  
//   // Trim and convert to lowercase first, then capitalize first letter of each word
//   return str
//     .trim()
//     .toLowerCase()
//     .split(' ')
//     .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//     .join(' ');
// }

// // Role-based access check
// function isAuthorized(user) {
//   return (
//     user?.type === "company" ||
//     user?.role === "Admin" ||
//     user?.permissions?.includes("location")
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

// /* ========================================
//    GET /api/locations
// ======================================== */
// export async function GET(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const locations = await Location.find({
//       companyId: user.companyId,
//     }).sort({ name: 1 });

//     return NextResponse.json({ success: true, data: locations }, { status: 200 });
//   } catch (err) {
//     console.error("GET /locations error:", err);
//     return NextResponse.json({ success: false, message: "Failed to fetch locations" }, { status: 500 });
//   }
// }

// /* ========================================
//    POST /api/locations
// ======================================== */
// export async function POST(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     let { name } = await req.json();

//     if (!name || !name.trim()) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Location name is required" 
//       }, { status: 400 });
//     }

//     // ✅ Capitalize first letter of each word
//     name = capitalizeName(name);

//     // Check if location with same name already exists for this company
//     const existingLocation = await Location.findOne({
//       name: name,
//       companyId: user.companyId,
//     });
    
//     if (existingLocation) {
//       return NextResponse.json({ success: false, message: "Location name already exists" }, { status: 400 });
//     }

//     // Create new location
//     const newLocation = new Location({
//       name: name,
//       companyId: user.companyId,
//       createdBy: user.id,
//     });

//     await newLocation.save();
//     return NextResponse.json({ success: true, data: newLocation }, { status: 201 });
//   } catch (error) {
//     console.error("POST /locations error:", error);
//     return NextResponse.json({ success: false, message: "Failed to create location" }, { status: 500 });
//   }
// }

// /* ========================================
//    PUT /api/locations?id=123
// ======================================== */
// export async function PUT(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const url = new URL(req.url);
//     const locationId = url.searchParams.get("id");
//     let { name } = await req.json();

//     if (!locationId) {
//       return NextResponse.json({ success: false, message: "Location ID is required" }, { status: 400 });
//     }

//     if (!name || !name.trim()) {
//       return NextResponse.json({ success: false, message: "Location name is required" }, { status: 400 });
//     }

//     // ✅ Capitalize first letter of each word
//     name = capitalizeName(name);

//     // Check if another location with same name exists
//     const existingLocation = await Location.findOne({
//       _id: { $ne: locationId },
//       name: name,
//       companyId: user.companyId,
//     });
    
//     if (existingLocation) {
//       return NextResponse.json({ success: false, message: "Location name already exists" }, { status: 400 });
//     }

//     // Update location
//     const updatedLocation = await Location.findOneAndUpdate(
//       { _id: locationId, companyId: user.companyId },
//       { name: name },
//       { new: true }
//     );

//     if (!updatedLocation) {
//       return NextResponse.json({ success: false, message: "Location not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, data: updatedLocation }, { status: 200 });
//   } catch (error) {
//     console.error("PUT /locations error:", error);
//     return NextResponse.json({ success: false, message: "Failed to update location" }, { status: 500 });
//   }
// }

// /* ========================================
//    DELETE /api/locations?id=123
// ======================================== */
// export async function DELETE(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const url = new URL(req.url);
//     const locationId = url.searchParams.get("id");

//     if (!locationId) {
//       return NextResponse.json({ success: false, message: "Location ID is required" }, { status: 400 });
//     }

//     const deletedLocation = await Location.findOneAndDelete({
//       _id: locationId,
//       companyId: user.companyId,
//     });

//     if (!deletedLocation) {
//       return NextResponse.json({ success: false, message: "Location not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, message: "Location deleted successfully" }, { status: 200 });
//   } catch (error) {
//     console.error("DELETE /locations error:", error);
//     return NextResponse.json({ success: false, message: "Failed to delete location" }, { status: 500 });
//   }
// }

import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Location from "./schema";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { validateMasterDataRequest } from '@/lib/masterDataPermission';

// Helper function to capitalize first letter of each word
function capitalizeName(str) {
  if (!str || typeof str !== 'string') return '';
  
  // Trim and convert to lowercase first, then capitalize first letter of each word
  return str
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper function to capitalize state
function capitalizeState(str) {
  if (!str || typeof str !== 'string') return 'Unknown';
  return str.trim().toUpperCase();
}

// Role-based access check
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

async function validateUser(req, action = 'view') {
  return validateMasterDataRequest(req, action);
}

/* ========================================
   GET /api/locations
======================================== */
export async function GET(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req, 'view');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const locations = await Location.find({
      companyId: user.companyId,
    }).sort({ name: 1 });

    return NextResponse.json({ success: true, data: locations }, { status: 200 });
  } catch (err) {
    console.error("GET /locations error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch locations" }, { status: 500 });
  }
}

/* ========================================
   POST /api/locations
======================================== */
export async function POST(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req, 'create');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    let { name, state } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ 
        success: false, 
        message: "Location name is required" 
      }, { status: 400 });
    }

    if (!state || !state.trim()) {
      return NextResponse.json({ 
        success: false, 
        message: "State is required" 
      }, { status: 400 });
    }

    // ✅ Capitalize name and state
    name = capitalizeName(name);
    state = capitalizeState(state);

    // Check if location with same name already exists for this company
    const existingLocation = await Location.findOne({
      name: name,
      companyId: user.companyId,
    });
    
    if (existingLocation) {
      return NextResponse.json({ success: false, message: "Location name already exists" }, { status: 400 });
    }

    // Create new location
    const newLocation = new Location({
      name: name,
      state: state,
      companyId: user.companyId,
      createdBy: user.id,
    });

    await newLocation.save();
    return NextResponse.json({ success: true, data: newLocation }, { status: 201 });
  } catch (error) {
    console.error("POST /locations error:", error);
    return NextResponse.json({ success: false, message: "Failed to create location" }, { status: 500 });
  }
}

/* ========================================
   PUT /api/locations?id=123
======================================== */
export async function PUT(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req, 'edit');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const url = new URL(req.url);
    const locationId = url.searchParams.get("id");
    let { name, state } = await req.json();

    if (!locationId) {
      return NextResponse.json({ success: false, message: "Location ID is required" }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: "Location name is required" }, { status: 400 });
    }

    if (!state || !state.trim()) {
      return NextResponse.json({ success: false, message: "State is required" }, { status: 400 });
    }

    // ✅ Capitalize name and state
    name = capitalizeName(name);
    state = capitalizeState(state);

    // Check if another location with same name exists
    const existingLocation = await Location.findOne({
      _id: { $ne: locationId },
      name: name,
      companyId: user.companyId,
    });
    
    if (existingLocation) {
      return NextResponse.json({ success: false, message: "Location name already exists" }, { status: 400 });
    }

    // Update location
    const updatedLocation = await Location.findOneAndUpdate(
      { _id: locationId, companyId: user.companyId },
      { name: name, state: state },
      { new: true }
    );

    if (!updatedLocation) {
      return NextResponse.json({ success: false, message: "Location not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedLocation }, { status: 200 });
  } catch (error) {
    console.error("PUT /locations error:", error);
    return NextResponse.json({ success: false, message: "Failed to update location" }, { status: 500 });
  }
}

/* ========================================
   DELETE /api/locations?id=123
======================================== */
export async function DELETE(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req, 'delete');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const url = new URL(req.url);
    const locationId = url.searchParams.get("id");

    if (!locationId) {
      return NextResponse.json({ success: false, message: "Location ID is required" }, { status: 400 });
    }

    const deletedLocation = await Location.findOneAndDelete({
      _id: locationId,
      companyId: user.companyId,
    });

    if (!deletedLocation) {
      return NextResponse.json({ success: false, message: "Location not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Location deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /locations error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete location" }, { status: 500 });
  }
}
