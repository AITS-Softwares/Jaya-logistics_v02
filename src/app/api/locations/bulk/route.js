// import { NextResponse } from "next/server";
// import connectDb from "@/lib/db";
// import Location from "../schema";
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

// // POST /api/locations/bulk
// export async function POST(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { names } = await req.json();

//     if (!names || !Array.isArray(names) || names.length === 0) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Please provide an array of location names" 
//       }, { status: 400 });
//     }

//     // ✅ Capitalize each name and remove duplicates/empty strings
//     const capitalizedNames = names
//       .map(name => capitalizeName(name))
//       .filter(name => name.length > 0);
    
//     const uniqueNames = [...new Set(capitalizedNames)];
    
//     if (uniqueNames.length === 0) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "No valid location names provided" 
//       }, { status: 400 });
//     }

//     // Find existing locations
//     const existingLocations = await Location.find({
//       companyId: user.companyId,
//       name: { $in: uniqueNames }
//     });

//     const existingNames = new Set(existingLocations.map(loc => loc.name));
//     const newNames = uniqueNames.filter(name => !existingNames.has(name));
    
//     if (newNames.length === 0) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "All provided location names already exist" 
//       }, { status: 400 });
//     }

//     // Bulk insert
//     const locationsToInsert = newNames.map(name => ({
//       name: name,
//       companyId: user.companyId,
//       createdBy: user.id,
//       isActive: true
//     }));

//     const result = await Location.insertMany(locationsToInsert, { ordered: false });
    
//     return NextResponse.json({ 
//       success: true, 
//       message: `Successfully added ${result.length} locations`,
//       addedCount: result.length,
//       failedCount: uniqueNames.length - result.length,
//       skippedNames: Array.from(existingNames),
//       data: result
//     }, { status: 201 });
    
//   } catch (error) {
//     console.error("POST /locations/bulk error:", error);
    
//     if (error.code === 11000) {
//       return NextResponse.json({ 
//         success: false, 
//         message: "Some locations already exist in the system"
//       }, { status: 400 });
//     }
    
//     return NextResponse.json({ 
//       success: false, 
//       message: "Failed to add locations" 
//     }, { status: 500 });
//   }
// }

import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Location from "../schema";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

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

// POST /api/locations/bulk
export async function POST(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { locations } = await req.json();

    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "Please provide an array of location objects with name and state" 
      }, { status: 400 });
    }

    // ✅ Process each location
    const processedLocations = locations
      .map(item => {
        const name = capitalizeName(item.name);
        const state = capitalizeState(item.state || 'Unknown');
        return { name, state };
      })
      .filter(item => item.name.length > 0);
    
    // Remove duplicates based on name
    const uniqueLocations = [];
    const seenNames = new Set();
    for (const loc of processedLocations) {
      if (!seenNames.has(loc.name)) {
        seenNames.add(loc.name);
        uniqueLocations.push(loc);
      }
    }
    
    if (uniqueLocations.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "No valid location names provided" 
      }, { status: 400 });
    }

    // Find existing locations
    const existingLocations = await Location.find({
      companyId: user.companyId,
      name: { $in: uniqueLocations.map(loc => loc.name) }
    });

    const existingNames = new Set(existingLocations.map(loc => loc.name));
    const newLocations = uniqueLocations.filter(loc => !existingNames.has(loc.name));
    
    if (newLocations.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "All provided location names already exist" 
      }, { status: 400 });
    }

    // Bulk insert
    const locationsToInsert = newLocations.map(loc => ({
      name: loc.name,
      state: loc.state,
      companyId: user.companyId,
      createdBy: user.id,
      isActive: true
    }));

    const result = await Location.insertMany(locationsToInsert, { ordered: false });
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully added ${result.length} locations`,
      addedCount: result.length,
      failedCount: uniqueLocations.length - result.length,
      skippedNames: Array.from(existingNames),
      data: result
    }, { status: 201 });
    
  } catch (error) {
    console.error("POST /locations/bulk error:", error);
    
    if (error.code === 11000) {
      return NextResponse.json({ 
        success: false, 
        message: "Some locations already exist in the system"
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: "Failed to add locations" 
    }, { status: 500 });
  }
}