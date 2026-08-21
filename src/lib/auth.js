// // lib/auth.js

// import jwt from "jsonwebtoken";

// const SECRET = process.env.JWT_SECRET;

// // --------------------------------------------
// // 1. Sign token for both company and user
// // --------------------------------------------
// export function signToken(user) {
//   return jwt.sign(
//     {
//       id: user._id,
//       name: user?.name || user?.fullName || user?.companyName || "Unknown",
//       email: user.email,
//       role: user.role?.name ?? "Company",
//       type: user.type,                     // "company" or "user"
//       permissions: user.permissions,
//       // Always include companyId – for company tokens, use its own _id
//       companyId: user.companyId ? user.companyId : user._id,
//     },
//     SECRET,
//     { expiresIn: "1d" }
//   );
// }

// // --------------------------------------------
// // 2. Verify JWT – throws on error
// // --------------------------------------------
// export function verifyJWT(token) {
//   try {
//     return jwt.verify(token, SECRET);
//   } catch (error) {
//     console.error("JWT verify error:", error.message);
//     throw new Error("Invalid or expired token");
//   }
// }

// // --------------------------------------------
// // 3. Extract Bearer token from request headers
// // --------------------------------------------
// export function getTokenFromHeader(req) {
//   const auth = req.headers.get("authorization") || "";
//   if (!auth.startsWith("Bearer ")) return null;
//   return auth.split(" ")[1];
// }

// // --------------------------------------------
// // 4. verifyToken – allows both company & user
// // --------------------------------------------
// export function verifyToken(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) {
//     throw new Error("Unauthorized: No token provided");
//   }
//   const decoded = verifyJWT(token);
//   // Ensure we have companyId
//   if (!decoded.companyId) {
//     throw new Error("Unauthorized: Missing companyId");
//   }
//   // Accept both company and user types
//   if (decoded.type !== "company" && decoded.type !== "user") {
//     throw new Error("Forbidden: Invalid user type");
//   }
//   return decoded;
// }

// // --------------------------------------------
// // 5. verifyCompany – only for company admins
// // --------------------------------------------
// export function verifyCompany(req) {
//   const decoded = verifyToken(req);
//   if (decoded.type !== "company") {
//     throw new Error("Forbidden: Company access required");
//   }
//   return decoded;
// }

// // --------------------------------------------
// // 6. hasPermission – check module‑level action
// // --------------------------------------------
// export function hasPermission(user, moduleName, action) {
//   if (!user) return false;
//   if (user.role === "Admin") return true;
//   const modulePermissions =
//     user.permissions?.[moduleName] || user.permissions?.[moduleName.toLowerCase()];
//   if (!modulePermissions) return false;
//   return modulePermissions.includes(action);
// }


// lib/auth.js

import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

// Keep JWTs small.  The token only needs selected modules and their granted
// actions; serialising every unselected module was enough to exceed reverse
// proxy header limits for users with a large permissions map.
function serializeModules(modules) {
  if (!modules) return {};

  const entries = typeof modules.entries === "function"
    ? Array.from(modules.entries())
    : Object.entries(modules);

  return entries.reduce((result, [name, value]) => {
    const plainValue = value && typeof value.toObject === "function"
      ? value.toObject()
      : value || {};

    if (plainValue.selected !== true) return result;

    result[name] = {
      selected: true,
      permissions: Object.entries(plainValue.permissions || {}).reduce((permissions, [action, allowed]) => {
        if (allowed === true) permissions[action] = true;
        return permissions;
      }, {}),
    };
    return result;
  }, {});
}

// --------------------------------------------
// 1. Sign token for both company and user
// --------------------------------------------
export function signToken(user, session = {}) {
  const modulesObj = serializeModules(user.modules);

  return jwt.sign(
    {
      id: user._id,
      name: user?.name || user?.fullName || user?.companyName || "Unknown",
      email: user.email,
      roles: user.roles || [],
      type: user.type || "user",
      modules: modulesObj || {},
      permissions: user.permissions || [],
      // Always include companyId
      companyId: user.companyId || user._id,
      // The selected legal operating company is session-specific. Keeping it in
      // the token makes every protected route able to apply the same data scope.
      activeOperatingCompanyId:
        session.activeOperatingCompany?._id ||
        session.activeOperatingCompanyId ||
        user.activeOperatingCompanyId ||
        null,
      activeOperatingCompanyName:
        session.activeOperatingCompany?.name ||
        session.activeOperatingCompanyName ||
        user.activeOperatingCompanyName ||
        null,
      activeOperatingCompanyCode:
        session.activeOperatingCompany?.code ||
        session.activeOperatingCompanyCode ||
        user.activeOperatingCompanyCode ||
        null,
      operatingCompanyIds: (user.operatingCompanyIds || []).map((id) => id.toString()),
      accessAllOperatingCompanies: user.accessAllOperatingCompanies === true,
    },
    SECRET,
    { expiresIn: "7d" }
  );
}

// --------------------------------------------
// 2. Verify JWT – returns decoded or null
// --------------------------------------------
export function verifyJWT(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    console.error("JWT verify error:", error.message);
    return null;
  }
}

// --------------------------------------------
// 3. Extract Bearer token from request headers
// --------------------------------------------
export function getTokenFromHeader(req) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.split(" ")[1];
}

// --------------------------------------------
// 4. verifyToken – allows both company & user
// --------------------------------------------
export function verifyToken(req) {
  const token = getTokenFromHeader(req);
  if (!token) {
    throw new Error("Unauthorized: No token provided");
  }
  const decoded = verifyJWT(token);
  if (!decoded) {
    throw new Error("Unauthorized: Invalid or expired token");
  }
  // Ensure we have companyId
  if (!decoded.companyId) {
    throw new Error("Unauthorized: Missing companyId");
  }
  // Accept both company and user types
  if (decoded.type !== "company" && decoded.type !== "user" && decoded.type !== "customer") {
    throw new Error("Forbidden: Invalid user type");
  }
  return decoded;
}

// --------------------------------------------
// 5. verifyCompany – only for company admins
// --------------------------------------------
export function verifyCompany(req) {
  const decoded = verifyToken(req);
  if (decoded.type !== "company") {
    throw new Error("Forbidden: Company access required");
  }
  return decoded;
}

// --------------------------------------------
// 6. hasPermission – check module‑level action
// --------------------------------------------
export function hasPermission(user, moduleName, action) {
  if (!user) return false;
  
  // Company admins have full access
  if (user.type === "company") return true;
  
  // Admin role has full access
  if (user.roles && user.roles.includes("Admin")) return true;
  
  // Check module-based permissions
  const modules = user.modules || {};
  const moduleData = modules[moduleName];
  
  if (!moduleData || !moduleData.selected) return false;
  
  const permissions = moduleData.permissions || {};
  return permissions[action] === true;
}

// --------------------------------------------
// 7. hasAnyPermission – check multiple actions
// --------------------------------------------
export function hasAnyPermission(user, moduleName, actions) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.roles && user.roles.includes("Admin")) return true;
  
  const modules = user.modules || {};
  const moduleData = modules[moduleName];
  
  if (!moduleData || !moduleData.selected) return false;
  
  const permissions = moduleData.permissions || {};
  return actions.some(action => permissions[action] === true);
}

// --------------------------------------------
// 8. hasAllPermissions – check all actions
// --------------------------------------------
export function hasAllPermissions(user, moduleName, actions) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.roles && user.roles.includes("Admin")) return true;
  
  const modules = user.modules || {};
  const moduleData = modules[moduleName];
  
  if (!moduleData || !moduleData.selected) return false;
  
  const permissions = moduleData.permissions || {};
  return actions.every(action => permissions[action] === true);
}

// --------------------------------------------
// 9. getAccessibleModules – get enabled modules
// --------------------------------------------
export function getAccessibleModules(user) {
  if (!user) return [];
  
  // Company admins get all modules
  if (user.type === "company") {
    return Object.keys(user.modules || {});
  }
  
  // Admin role gets all modules
  if (user.roles && user.roles.includes("Admin")) {
    return Object.keys(user.modules || {});
  }
  
  const modules = user.modules || {};
  return Object.keys(modules).filter(key => modules[key]?.selected === true);
}

// --------------------------------------------
// 10. getModulePermissions – get permissions for a module
// --------------------------------------------
export function getModulePermissions(user, moduleName) {
  if (!user) return {};
  
  const modules = user.modules || {};
  const moduleData = modules[moduleName];
  
  if (!moduleData || !moduleData.selected) return {};
  
  return moduleData.permissions || {};
}

// --------------------------------------------
// 11. canAccessModule – check if user can access module
// --------------------------------------------
export function canAccessModule(user, moduleName) {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.roles && user.roles.includes("Admin")) return true;
  
  const modules = user.modules || {};
  const moduleData = modules[moduleName];
  
  return moduleData && moduleData.selected === true;
}

// --------------------------------------------
// 12. Middleware helper for API routes
// --------------------------------------------
export function withAuth(handler, options = {}) {
  return async (req, context) => {
    try {
      const user = verifyToken(req);
      
      // Check if specific module permission is required
      if (options.module && options.action) {
        if (!hasPermission(user, options.module, options.action)) {
          return new Response(
            JSON.stringify({
              success: false,
              message: `Permission denied: ${options.action} action not allowed for ${options.module}`,
              code: 'FORBIDDEN'
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      }
      
      // Check if any of the actions are allowed
      if (options.module && options.actions) {
        if (!hasAnyPermission(user, options.module, options.actions)) {
          return new Response(
            JSON.stringify({
              success: false,
              message: `Permission denied: None of the required actions allowed for ${options.module}`,
              code: 'FORBIDDEN'
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      }
      
      // Call the handler with user attached
      return handler(req, context, user);
      
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          message: error.message || 'Authentication failed',
          code: error.message.includes('token') ? 'UNAUTHORIZED' : 'FORBIDDEN'
        }),
        {
          status: error.message.includes('token') ? 401 : 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  };
}
