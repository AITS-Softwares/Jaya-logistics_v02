const CRUD = ["view", "create", "edit", "delete"];
// Keep previously supported approval flags during migration so saving the
// expanded permission matrix cannot silently clear existing user settings.
const LEGACY_APPROVAL_ACTIONS = [...CRUD, "approve", "reject"];

/**
 * Single registry for master-management permissions, navigation, routes, APIs,
 * and transaction modules allowed to use each resource as a lookup.
 */
export const MASTER_PERMISSION_REGISTRY = [
  { key: "Groups", label: "Groups", icon: "👥", actions: CRUD, menus: [{ section: "masters", label: "Create Group", path: "/admin/CreateGroup" }], apiPrefixes: ["/api/groupscreate"], lookupModules: ["Suppliers"] },
  { key: "Item Groups", label: "Item Groups", icon: "📦", actions: CRUD, menus: [{ section: "masters", label: "Create Item Group", path: "/admin/CreateItemGroup" }], apiPrefixes: ["/api/itemGroups"], lookupModules: ["Billing"] },
  { key: "Customers", label: "Customers", icon: "👥", actions: LEGACY_APPROVAL_ACTIONS, menus: [{ section: "masters", label: "Create Customer", path: "/admin/createCustomers" }, { section: "mastersView", label: "Customer View", path: "/admin/customer-view" }], apiPrefixes: ["/api/customers"], lookupModules: ["Order Panel", "Pricing Panel", "Loading Info", "Purchase Panel", "Consignment Note", "Advance Payment", "Proof Of Delivery", "Balance-Payment", "Billing", "Lead Generation", "Opportunity", "Campaign"] },
  { key: "Suppliers", label: "Suppliers", icon: "🏭", actions: LEGACY_APPROVAL_ACTIONS, menus: [{ section: "masters", label: "Supplier", path: "/admin/createSupplier" }, { section: "mastersView", label: "Supplier View", path: "/admin/supplier" }], apiPrefixes: ["/api/suppliers"], lookupModules: ["Vehicle Negotiation", "Purchase Quotation", "Purchase Order", "Purchase Invoice", "Purchase Panel", "Advance Payment", "Balance-Payment", "Debit Notes"] },
  { key: "Items", label: "Items", icon: "📦", actions: LEGACY_APPROVAL_ACTIONS, menus: [{ section: "masters", label: "Item", path: "/admin/createItem" }, { section: "mastersView", label: "Item View", path: "/admin/item" }], apiPrefixes: ["/api/items"] , lookupModules: ["Order Panel", "Pricing Panel", "Purchase Quotation", "Purchase Order", "Purchase Invoice", "GRN", "Debit Notes", "Inventory", "BoM", "Production Order", "Billing"] },
  { key: "Account Head", label: "Account Head", icon: "🏦", actions: CRUD, menus: [{ section: "masters", label: "Account Head", path: "/admin/account-bankhead" }, { section: "mastersView", label: "Account Head View", path: "/admin/account-head-view" }], apiPrefixes: ["/api/account-head"], lookupModules: ["General Ledger", "Payment Entry", "Journal Entry", "Reports", "Profit & Loss", "Balance Sheet", "Billing", "Advance Payment", "Balance-Payment"] },
  { key: "General Ledger", label: "General Ledger", icon: "💰", actions: CRUD, menus: [{ section: "masters", label: "General Ledger", path: "/admin/bank-head-details" }, { section: "mastersView", label: "General Ledger View", path: "/admin/bank-head-details-view" }], apiPrefixes: ["/api/bank-head"], lookupModules: ["Payment Entry", "Journal Entry", "Reports", "Profit & Loss", "Balance Sheet", "Billing", "Advance Payment", "Balance-Payment"] },
  { key: "Warehouse Details", label: "Warehouse Details", icon: "🏬", actions: CRUD, menus: [{ section: "masters", label: "Warehouse Details", path: "/admin/WarehouseDetailsForm" }], apiPrefixes: ["/api/warehouse"], lookupModules: ["Inventory", "BoM", "Production Order", "Purchase Order", "GRN"] },
  { key: "Sub Companies", label: "Sub Companies", icon: "🏢", actions: CRUD, menus: [{ section: "masters", label: "Sub Companies", path: "/admin/subcompanies" }], apiPrefixes: ["/api/subcompanies"], lookupModules: ["Order Panel", "Vehicle Negotiation", "Pricing Panel", "Loading Info", "Purchase Panel", "Consignment Note", "Advance Payment", "Proof Of Delivery", "Balance-Payment", "Billing"] },
  { key: "Email Templates", label: "Email Templates", icon: "✉️", actions: CRUD, menus: [{ section: "mastersView", label: "Email Templates", path: "/admin/email-templates" }], apiPrefixes: ["/api/email-templates"], lookupModules: ["Campaign"] },
  { key: "Email & App Password Master", label: "Email & App Password Master", icon: "🔐", actions: CRUD, menus: [{ section: "mastersView", label: "Email & App Password Master", path: "/admin/email-masters" }], apiPrefixes: ["/api/email-masters"], lookupModules: ["Campaign"] },
  { key: "Branches", label: "Branches", icon: "🏢", actions: CRUD, menus: [{ section: "mastersView", label: "Branches", path: "/admin/branches" }], apiPrefixes: ["/api/branches"], lookupModules: ["Order Panel", "Vehicle Negotiation", "Pricing Panel", "Loading Info", "Purchase Panel", "Consignment Note", "Advance Payment", "Proof Of Delivery", "Balance-Payment", "Billing"] },
  { key: "Locations", label: "Locations", icon: "📍", actions: CRUD, menus: [{ section: "mastersView", label: "From-location", path: "/admin/locations" }], apiPrefixes: ["/api/locations"], lookupModules: ["Order Panel", "Vehicle Negotiation", "Pricing Panel", "Loading Info", "Purchase Panel", "Consignment Note", "Billing"] },
  { key: "Package Types", label: "Package Types", icon: "📦", actions: CRUD, menus: [{ section: "mastersView", label: "Pkg-type", path: "/admin/pkg-type" }], apiPrefixes: ["/api/pkg-types"], lookupModules: ["Order Panel", "Pricing Panel", "Billing"] },
  { key: "Vehicles", label: "Vehicles", icon: "🚚", actions: CRUD, menus: [{ section: "mastersView", label: "Vehicles", path: "/admin/vehicles" }], apiPrefixes: ["/api/vehicles"], lookupModules: ["Vehicle Negotiation", "Loading Info", "Consignment Note", "Tracking Plan"] },
  { key: "Vehicle Owners", label: "Vehicle Owners", icon: "🚚", actions: CRUD, menus: [{ section: "mastersView", label: "Vehicles-owner", path: "/admin/owners" }], apiPrefixes: ["/api/owners"], lookupModules: ["Vehicle Negotiation", "Loading Info"] },
  { key: "Plants", label: "Plants", icon: "🏭", actions: CRUD, menus: [{ section: "mastersView", label: "Plants", path: "/admin/plants" }], apiPrefixes: ["/api/plants"], lookupModules: ["Order Panel", "Pricing Panel", "Loading Info", "Billing"] },
  { key: "Rate Master", label: "Rate Master", icon: "💱", actions: LEGACY_APPROVAL_ACTIONS, menus: [{ section: "mastersView", label: "Rate-Location-Master-create", path: "/admin/rate-master/create" }], apiPrefixes: ["/api/rate-master"], lookupModules: ["Pricing Panel", "Billing"] },
  { key: "UOM", label: "UOM", icon: "⚖️", actions: CRUD, menus: [{ section: "mastersView", label: "UOM", path: "/admin/UOM" }], apiPrefixes: ["/api/uoms"], lookupModules: ["Items", "Order Panel", "Pricing Panel", "Inventory", "Production Order", "Billing"] },
  { key: "SKU Sizes", label: "SKU Sizes", icon: "📐", actions: CRUD, menus: [{ section: "mastersView", label: "SKU Sizes", path: "/admin/sku-sizes" }], apiPrefixes: ["/api/sku-sizes"], lookupModules: ["Order Panel", "Pricing Panel", "Inventory", "Production Order", "Billing"] },
  { key: "Purchase Types", label: "Purchase Types", icon: "🧾", actions: CRUD, menus: [{ section: "mastersView", label: "Purchase Types", path: "/admin/purchase-type" }], apiPrefixes: ["/api/purchase-type"], lookupModules: ["Purchase Quotation", "Purchase Order", "Purchase Invoice", "Purchase Panel", "Billing"] },
];

export const MASTER_PERMISSION_KEYS = MASTER_PERMISSION_REGISTRY.map((resource) => resource.key);

export const MASTER_PERMISSION_MODULES = Object.fromEntries(
  MASTER_PERMISSION_REGISTRY.map(({ key, icon, actions }) => [key, { icon, permissions: [...actions] }])
);
export const MASTER_PERMISSION_ACTIONS = Object.fromEntries(
  MASTER_PERMISSION_REGISTRY.map(({ key, actions }) => [key, [...actions]])
);

export function canUseMasterPermission(user, key, action = "view") {
  if (!user || !MASTER_PERMISSION_KEYS.includes(key)) return false;
  if (user.type === "company" || user.roles?.includes("Admin")) return true;

  // While the legacy umbrella exists, preserve its prior access. Saving the
  // new permission matrix migrates the user and removes this legacy entry.
  const legacy = user.modules?.["Master Data"];
  if (legacy?.selected) {
    return action === "view"
      ? legacy.permissions?.view !== false
      : legacy.permissions?.[action] === true;
  }

  const module = user.modules?.[key];
  if (module) return module.selected === true && module.permissions?.[action] === true;
  return false;
}

export function hasMasterManagementAccess(user, key) {
  return MASTER_PERMISSION_REGISTRY.some((resource) => resource.key === key) &&
    ["view", "create", "edit", "delete"].some((action) => canUseMasterPermission(user, key, action));
}
