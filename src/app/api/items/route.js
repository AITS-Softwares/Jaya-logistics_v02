import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Item from "@/models/ItemModels";
import Customer from "@/models/CustomerModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { validateMasterDataRequest } from '@/lib/masterDataPermission';
import { syncItem } from '@/lib/frappe-item.mjs';

// ✅ Role-based access for item management
function isAuthorized(user) {
  if (!user) return false;

  if (user.type === "company") return true;

  const allowedRoles = [
    "admin",
    "sales manager",
    "purchase manager",
    "inventory manager",
    "accounts manager",
    "hr manager",
    "support executive",
    "production head",
    "project manager",
  ];

  const userRoles = Array.isArray(user.roles)
    ? user.roles
    : [];

  return userRoles.some(role =>
    allowedRoles.includes(role.trim().toLowerCase())
  );
}

// ✅ Validate user token & permissions
async function validateUser(req, action = 'view') {
  return validateMasterDataRequest(req, action);
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };

  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch (err) {
    console.error("JWT Verification Failed:", err.message);
    return { error: "Invalid token", status: 401 };
  }
}

/* ========================================
   📥 GET /api/item
======================================== */
export async function GET(req) {
  await dbConnect();

  const { user, error, status } = await validateUser(req, 'view');
  if (error)
    return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const posOnly = searchParams.get("posOnly") === "true";
    const activeOnly = searchParams.get("activeOnly") === "true";

    // ✅ Old logic as it is
    const query = { companyId: user.companyId };

    // ✅ Only when posOnly=true (POS items only)
    if (posOnly) {
      query.posEnabled = true;
      query.active = true;
      query.status = "active";
      query["posConfig.showInPOS"] = { $ne: false };
    }

    if (activeOnly) {
      query.active = true;
      query.status = "active";
    }

    const items = await Item.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: items }, { status: 200 });
  } catch (err) {
    console.error("GET /item error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch items" },
      { status: 500 }
    );
  }
}


/* ========================================
   ✏️ POST /api/item
======================================== */
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req, 'create');
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const data = await req.json();

    // ✅ Validate required fields
    // Match the required fields in the connected Frappe Item form.
    const requiredFields = ["itemCode", "category", "gstCode", "uom", "customerId"];
    for (let field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    const customer = await Customer.findOne({ _id: data.customerId, companyId: user.companyId }).select('customerName customerCode');
    if (!customer) {
      return NextResponse.json({ success: false, message: "Select a valid customer from Customer Management" }, { status: 400 });
    }

    // ✅ Prevent duplicate itemCode within the company
    const existingItem = await Item.findOne({
      itemCode: data.itemCode,
      companyId: user.companyId,
    });
    if (existingItem) {
      return NextResponse.json({ success: false, message: "Item Code already exists" }, { status: 400 });
    }

    // ✅ Save item
    const item = new Item({
      ...data,
      customerId: customer._id,
      customerName: customer.customerName,
      customerCode: customer.customerCode || "",
      companyId: user.companyId,
      createdBy: user.id,
    });

    await item.save();
    const frappeSync = await syncItem(item);
    await Item.updateOne(
      { _id: item._id, companyId: user.companyId },
      { $set: { frappeSync: { ...frappeSync, attemptedAt: new Date() } } }
    );
    return NextResponse.json({ success: true, data: item, frappeSync }, { status: 201 });
  } catch (err) {
    console.error("POST /item error:", err);
    return NextResponse.json({ success: false, message: "Failed to create item" }, { status: 500 });
  }
}





// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Item from "@/models/ItemModels";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// // ✅ Role-based access for item management
// function isAuthorized(user) {
//   return user?.type === "company" || user?.role === "Admin" || user?.permissions?.includes("item");
// }

// // ✅ Validate user token & permissions
// async function validateUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };

//   try {
//     const user = await verifyJWT(token);
//     if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
//     return { user };
//   } catch (err) {
//     console.error("JWT Verification Failed:", err.message);
//     return { error: "Invalid token", status: 401 };
//   }
// }

// /* ========================================
//    📥 GET /api/item
// ======================================== */
// export async function GET(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const items = await Item.find({ companyId: user.companyId }).sort({ createdAt: -1 });
//     return NextResponse.json({ success: true, data: items }, { status: 200 });
//   } catch (err) {
//     console.error("GET /item error:", err);
//     return NextResponse.json({ success: false, message: "Failed to fetch items" }, { status: 500 });
//   }
// }

// /* ========================================
//    ✏️ POST /api/item
// ======================================== */
// export async function POST(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const data = await req.json();

//     // ✅ Validate required fields
//     const requiredFields = ["itemCode", "itemName", "category", "unitPrice", "quantity"];
//     for (let field of requiredFields) {
//       if (!data[field]) {
//         return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
//       }
//     }

//     // ✅ Prevent duplicate itemCode within the company
//     const existingItem = await Item.findOne({ itemCode: data.itemCode, companyId: user.companyId });
//     if (existingItem) {
//       return NextResponse.json({ success: false, message: "Item Code already exists" }, { status: 400 });
//     }

//     // ✅ Save item
//     const item = new Item({
//       ...data,
//       companyId: user.companyId,
//       createdBy: user.id,
//     });

//     await item.save();
//     return NextResponse.json({ success: true, data: item }, { status: 201 });
//   } catch (err) {
//     console.error("POST /item error:", err);
//     return NextResponse.json({ success: false, message: "Failed to create item" }, { status: 500 });
//   }
// }


