// // "use client";

// // import { useState, useEffect, useRef } from "react";
// // import Link from "next/link";
// // import {
// //   HiUsers, HiGlobeAlt, HiFlag, HiUserGroup, HiOutlineCube, HiOutlineLibrary,
// //   HiCurrencyDollar, HiOutlineCreditCard, HiChartSquareBar, HiReceiptTax,
// //   HiPuzzle, HiViewGrid, HiUser, HiDocumentText, HiOutlineOfficeBuilding,
// //   HiCube, HiShoppingCart, HiCog, HiMenu, HiX, HiHome, HiClipboardList,
// //   HiTruck, HiCurrencyRupee, HiInformationCircle, HiDocumentReport, HiCash,
// //   HiOfficeBuilding, HiLocationMarker, HiMail
// // } from "react-icons/hi";
// // import { GiStockpiles } from "react-icons/gi";
// // import { SiCivicrm } from "react-icons/si";
// // import { useRouter, usePathname } from "next/navigation";
// // import LogoutButton from "@/components/LogoutButton";

// // /* ---------- UI COMPONENTS ---------- */

// // const Section = ({ title, icon, isOpen, onToggle, children }) => (
// //   <div className="border-b border-gray-600/20">
// //     <button
// //       onClick={onToggle}
// //       className="flex justify-between w-full px-3 py-3 hover:bg-gray-600/40 transition-colors text-left"
// //     >
// //       <span className="flex gap-3 items-center font-medium text-sm">
// //         <span className="text-lg text-blue-400">{icon}</span>
// //         <span className="truncate">{title}</span>
// //       </span>
// //       <span className="text-xs ml-2 shrink-0">{isOpen ? "−" : "+"}</span>
// //     </button>
// //     {isOpen && (
// //       <div className="bg-gray-800/40 pb-2 ml-4 border-l border-gray-500/50">
// //         {children}
// //       </div>
// //     )}
// //   </div>
// // );

// // const Submenu = ({ label, icon, isOpen, onToggle, children }) => (
// //   <div className="mt-1">
// //     <button
// //       onClick={onToggle}
// //       className="flex justify-between w-full px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white uppercase tracking-wider transition-colors"
// //     >
// //       <span className="flex gap-2 items-center">{icon}<span>{label}</span></span>
// //       <span>{isOpen ? "−" : "+"}</span>
// //     </button>
// //     {isOpen && (
// //       <div className="ml-2 space-y-0.5 border-l border-gray-600/30">
// //         {children}
// //       </div>
// //     )}
// //   </div>
// // );

// // const Item = ({ href, icon, label, onClick, isActive }) => (
// //   <Link
// //     href={href}
// //     onClick={onClick}
// //     className={`flex gap-3 px-4 py-2 text-[13px] rounded-l-md transition-all ${
// //       isActive
// //         ? "text-white bg-blue-600/40 border-r-2 border-blue-400"
// //         : "text-gray-300 hover:text-white hover:bg-blue-600/20"
// //     }`}
// //   >
// //     <span className="text-base opacity-70 shrink-0">{icon}</span>
// //     <span className="truncate">{label}</span>
// //   </Link>
// // );

// // /* ---------- MODULE ROUTE MAP ---------- */

// // const MODULE_ROUTE_MAP = {
// //   // ── Sales ──────────────────────────────────────────

// //   "Sales Managers" :[
// //           { label :"Order Panel",path:"/admin/order-panel",needsView: true},
// //       { label :"Vehicle Negotiation", path:"/admin/vehicle-negotiation", needsView: true},
// //       { label :"Pricing Panel", path:"/admin/pricing-panel", needsView: true},
// //       { label :"Loading Info", path:"/admin/Loading-Info", needsView: true},
// //       { label :"Purchase Panel", path:"/admin/Purchase-Panel", needsView: true},
// //       { label :"Consignment Note", path:"/admin/Consignment-Note", needsView: true},
// //       { label :"Advance Payment", path:"/admin/Advance-Payment", needsView: true},
// //       { label :"Proof Of Delivery", path:"/admin/ProofofDelivery", needsView: true},
// //       { label :"Balance-Payment", path:"/admin/Balance-Payment", needsView: true},
// //       { label :"Billing",path:"/admin/Billing",needsView: true},
// //       { label :"order-full-report", path:"/admin/reports/order-full-report",needsView: true}
// //   ],
// //     "Sales":[
// //       { label :"Order Panel",path:"/admin/order-panel",needsView: true},
// //       { label :"Vehicle Negotiation", path:"/admin/vehicle-negotiation", needsView: true},
// //       { label :"Pricing Panel", path:"/admin/pricing-panel", needsView: true},
// //       { label :"Loading Info", path:"/admin/Loading-Info", needsView: true},
// //       { label :"Purchase Panel", path:"/admin/Purchase-Panel", needsView: true},
// //       { label :"Consignment Note", path:"/admin/Consignment-Note", needsView: true},
// //       { label :"Advance Payment", path:"/admin/Advance-Payment", needsView: true},
// //       { label :"Proof Of Delivery", path:"/admin/ProofofDelivery", needsView: true},
// //       { label :"Balance-Payment", path:"/admin/Balance-Payment", needsView: true},
// //       { label :"Billing",path:"/admin/Billing",needsView: true},
// //       { label :"order-full-report", path:"/admin/reports/order-full-report",needsView: true}
// //     ],
// //        "Order Panel":[
// //               { label :"Order Panel",path:"/admin/order-panel",needsView: true},
// //        ],
// //        "Vehicle Negotiation":[
// //          { label :"Vehicle Negotiation", path:"/admin/vehicle-negotiation", needsView: true},
// //        ],
// //        "Pricing Panel":[
// //          { label :"Pricing Panel", path:"/admin/pricing-panel", needsView: true},
// //        ],
// //        "Loading Info":[
// //  { label :"Loading Info", path:"/admin/Loading-Info", needsView: true},
// //        ],
// //        "Purchase Panel":[
// //         { label :"Purchase Panel", path:"/admin/Purchase-Panel", needsView: true},
// //        ],
// //        "Consignment Note":[
// // { label :"Consignment Note", path:"/admin/Consignment-Note", needsView: true},
// //        ],
// //        "Advance Payment":[
// //           { label :"Advance Payment", path:"/admin/Advance-Payment", needsView: true},
// //        ],

// //        "Proof Of Delivery":[
// //         { label :"Proof Of Delivery", path:"/admin/ProofofDelivery", needsView: true},
// //        ],

// //       "Balance-Payment": [
// //          { label :"Balance-Payment", path:"/admin/Balance-Payment", needsView: true},
// //        ],

// //            "Billing": [ { label :"Billing",path:"/admin/Billing",needsView: true}],
// //    "order-full-report":  [ { label :"order-full-report", path:"/admin/reports/order-full-report",needsView: true}],




// //   // ── Masters ────────────────────────────────────────
// //   "Customers": [
// //     { label: "Customer View",     path: "/admin/customer-view",        needsView: true },
// //     { label: "Create Customer",   path: "/admin/createCustomers",      needsCreate: true },
// //   ],
// //   "Suppliers": [
// //     { label: "Supplier View",     path: "/admin/supplier",             needsView: true },
// //     { label: "Create Supplier",   path: "/admin/createSupplier",       needsCreate: true },
// //   ],
// //   "Items": [
// //     { label: "Item View",         path: "/admin/item",                 needsView: true },
// //     { label: "Create Item",       path: "/admin/createItem",           needsCreate: true },
// //   ],
// //   "Company": [
// //     { label: "Company Settings",  path: "/admin/company",              needsView: true },
// //   ],
// //   "Users": [
// //     { label: "Users",             path: "/admin/users",                needsView: true },
// //   ],
// //   "Accounts": [
// //     { label: "Account Head View", path: "/admin/account-head-view",          needsView: true },
// //     { label: "General Ledger",    path: "/admin/bank-head-details-view",      needsView: true },
// //   ],
// //   "Employees": [
// //     { label: "Employee Details",    path: "/admin/hr/Dashboard",             needsView: true },
// //     { label: "Employee Onboarding", path: "/admin/hr/employee-onboarding",   needsCreate: true },
// //     { label: "Department",          path: "/admin/hr/masters",               needsView: true },
// //     { label: "Leave",               path: "/admin/hr/leaves",                needsView: true },
// //     { label: "Attendance",          path: "/admin/hr/attendance",            needsView: true },
// //     { label: "Payroll",             path: "/admin/hr/payroll",               needsView: true },
// //     { label: "Employee",            path: "/admin/hr/employees",             needsView: true },
// //     { label: "Reports",             path: "/admin/hr/reports",               needsView: true },
// //     { label: "Holidays",            path: "/admin/hr/holidays",              needsView: true },
// //     { label: "Profile",             path: "/admin/hr/profile",               needsView: true },
// //   ],

// //   // ── Purchase ───────────────────────────────────────
// //   "Purchase Quotation": [
// //     { label: "Quotation View",    path: "/admin/PurchaseQuotationList",       needsView: true },
// //   ],
// //   "Purchase Order": [
// //     { label: "Order View",        path: "/admin/purchase-order-view",         needsView: true },
// //   ],
// //   "GRN": [
// //     { label: "GRN View",          path: "/admin/grn-view",                    needsView: true },
// //   ],
// //   "Purchase Invoice": [
// //     { label: "Invoice View",      path: "/admin/purchaseInvoice-view",        needsView: true },
// //   ],
// //   "Debit Notes": [
// //     { label: "Debit Notes View",  path: "/admin/debit-notes-view",            needsView: true },
// //   ],
// //   "Purchase Report": [
// //     { label: "Purchase Report",   path: "/admin/purchase-report",             needsView: true },
// //   ],


// //   // ── Inventory / Stock ──────────────────────────────
// //   "Inventory": [
// //     { label: "Inventory View",    path: "/admin/InventoryView",               needsView: true },
// //     { label: "Inventory Entry",   path: "/admin/InventoryEntry",              needsCreate: true },
// //     { label: "Inventory Ledger",  path: "/admin/InventoryAdjustmentsView",    needsView: true },
// //   ],
// //   "Inventory View": [
// //     { label: "Inventory View",    path: "/admin/InventoryView",               needsView: true },
// //   ],
// //   "Inventory Entry": [
// //     { label: "Inventory Entry",   path: "/admin/InventoryEntry",              needsCreate: true },
// //   ],
// //   "Stock Adjustment": [
// //     { label: "Stock Adjustment",  path: "/admin/InventoryAdjustmentsView",    needsView: true },
// //   ],
// //   "Stock Transfer": [
// //     { label: "Stock Transfer",    path: "/admin/InventoryAdjustmentsView",    needsView: true },
// //   ],
// //   "Stock Report": [
// //     { label: "Stock Report",      path: "/admin/sales-report",                needsView: true },
// //   ],

// //   // ── Production ─────────────────────────────────────
// //   "Production Order": [
// //     { label: "Production Order",  path: "/admin/ProductionOrder",             needsView: true },
// //     { label: "Production Board",  path: "/admin/production-board",            needsView: true },
// //   ],
// //   "BoM": [
// //     { label: "BoM",               path: "/admin/bom",                         needsCreate: true },
// //     { label: "BoM View",          path: "/admin/bom-view",                    needsView: true },
// //   ],

// //   // ── CRM ────────────────────────────────────────────
// //   "Lead Generation": [
// //     { label: "Lead Generation",   path: "/admin/leads-view",                  needsView: true },
// //   ],
// //   "Opportunity": [
// //     { label: "Opportunity",       path: "/admin/opportunities",               needsView: true },
// //   ],
// //   "crm": [
// //     { label: "Campaign",          path: "/admin/crm/campaign",                needsView: true },
// //     { label: "Opportunity",       path: "/admin/opportunities",               needsView: true },
// //     { label: "Lead Generation",   path: "/admin/leads-view",                  needsView: true },
// //   ],
// //   "Campaign" : [
// //     { label: "Campaign",          path: "/admin/crm/campaign",                needsView: true },
// //   ],


// //   // ── Project ────────────────────────────────────────
// //   "Project": [
// //     { label: "Projects",          path: "/admin/project/projects",            needsView: true },
// //     { label: "Workspaces",        path: "/admin/project/workspaces",          needsView: true },
// //     { label: "Tasks",             path: "/admin/project/tasks",               needsView: true },
// //     { label: "Task Board",        path: "/admin/project/tasks/board",         needsView: true },
// //   ],

// //   // ── Finance ────────────────────────────────────────
// //   "Journal Entry": [
// //     { label: "Journal Entry",     path: "/admin/finance/journal-entry",       needsCreate: true },
// //   ],
// //   "Reports": [
// //     { label: "Trial Balance",     path: "/admin/finance/report/trial-balance", needsView: true },
// //   ],
// //   "Ageing": [
// //     { label: "Customer Ageing",   path: "/admin/finance/report/ageing/customer", needsView: true },
// //   ],
// //   "Statement": [
// //     { label: "Customer Statement", path: "/admin/finance/report/statement/customer", needsView: true },
// //   ],
// //   "Bank Statement": [
// //     { label: "Bank Statement",    path: "/admin/finance/report/statement/bank",    needsView: true },
// //   ],
// //   "Profit & Loss": [
// //     { label: "Profit & Loss",     path: "/admin/finance/report/profit-loss",        needsView: true },
// //   ],
// //   "Balance Sheet": [
// //     { label: "Balance Sheet",     path: "/admin/finance/report/balance-sheet",      needsView: true },
// //   ],
// //   "Supplier Ageing": [
// //     { label: "Supplier Ageing",   path: "/admin/finance/report/ageing/supplier",    needsView: true },
// //   ],
// //   "Supplier Statement": [
// //     { label: "Supplier Statement", path: "/admin/finance/report/statement/supplier", needsView: true },
// //   ],
// //   "Financial Statements": [
// //     { label: "Financial Statements", path: "/admin/finance/report/financial-statements", needsView: true },
// //   ],
// //   "Payment": [
// //     { label: "Payment Form",      path: "/admin/Payment",                     needsCreate: true },
// //   ],
// //   "Payment Entry": [
// //     { label: "Payment Form",      path: "/admin/Payment",                     needsCreate: true },
// //   ],
// //   "Payment Form": [
// //     { label: "Payment Form",      path: "/admin/Payment",                     needsCreate: true },
// //   ],
// //   "Ledger": [
// //     { label: "General Ledger",    path: "/admin/bank-head-details-view",      needsView: true },
// //   ],

// //   // ── Helpdesk ───────────────────────────────────────
// //   "Tickets": [
// //     { label: "Tickets",           path: "/admin/helpdesk/tickets",            needsView: true },
// //   ],
// //   "Responses": [
// //     { label: "Feedback",          path: "/admin/helpdesk/feedback",           needsView: true },
// //     { label: "Feedback Analysis", path: "/admin/helpdesk/feedback/analytics", needsView: true },
// //   ],

// //   // ── PPC ────────────────────────────────────────────
// //   "PPC": [
// //     { label: "Operators",              path: "/admin/ppc/operatorsPage",              needsView: true },
// //     { label: "Machines",               path: "/admin/ppc/machinesPage",               needsView: true },
// //     { label: "Resources",              path: "/admin/ppc/resourcesPage",              needsView: true },
// //     { label: "Machine Outputs",        path: "/admin/ppc/machineOutputPage",          needsView: true },
// //     { label: "Holidays",               path: "/admin/ppc/holidaysPage",               needsView: true },
// //     { label: "Machine-Operator Map",   path: "/admin/ppc/operatorMachineMappingPage", needsView: true },
// //     { label: "Operations",             path: "/admin/ppc/operations",                 needsView: true },
// //     { label: "Production Planning",    path: "/admin/ppc/productionOrderPage",        needsView: true },
// //     { label: "Job Card",               path: "/admin/ppc/jobcards",                   needsView: true },
// //     { label: "Downtime",               path: "/admin/ppc/downtime",                   needsView: true },
// //   ],

// //   // ── Task ───────────────────────────────────────────
// //   "Task": [
// //     { label: "Tasks",             path: "/admin/tasks",                       needsView: true },
// //     { label: "Tasks Board",       path: "/admin/tasks/board",                 needsView: true },
// //   ],
// // };

// // /* ---------- PERMISSION HELPER ---------- */

// // function canAccessModule(data) {
// //   if (!data) return false;
// //   if (data.selected === true) return true;
// //   const p = data.permissions || {};
// //   return !!(p.view || p.read || p.write || p.edit || p.create || p.delete);
// // }

// // /* ---------- MAIN LAYOUT ---------- */

// // export default function Layout({ children }) {
// //   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
// //   const [openMenu, setOpenMenu] = useState(null);
// //   const [openSubmenus, setOpenSubmenus] = useState({});
// //   const [session, setSession] = useState(null);
// //   const router = useRouter();
// //   const pathname = usePathname();
// //   const sidebarRef = useRef(null);

// //   useEffect(() => {
// //     async function getSession() {
// //       try {
// //         const token = localStorage.getItem("token");

// //         if (!token) {
// //           router.push("/signin");
// //           return;
// //         }

// //         const res = await fetch("/api/auth/me", {
// //           headers: {
// //             Authorization: `Bearer ${token}`,
// //           },
// //         });

// //         if (!res.ok) {
// //           localStorage.removeItem("token");
// //           localStorage.removeItem("user");
// //           router.push("/signin");
// //           return;
// //         }

// //         const data = await res.json();
// //         setSession(data.user);
// //       } catch (err) {
// //         console.error("Session fetch error:", err);
// //         router.push("/signin");
// //       }
// //     }

// //     getSession();
// //   }, [router]);

// //   useEffect(() => {
// //     setIsSidebarOpen(false);
// //   }, [pathname]);

// //   useEffect(() => {
// //     const handler = (e) => {
// //       if (e.key === "Escape") setIsSidebarOpen(false);
// //     };
// //     document.addEventListener("keydown", handler);
// //     return () => document.removeEventListener("keydown", handler);
// //   }, []);

// //   if (!session) return (
// //     <div className="flex h-screen items-center justify-center bg-gray-100">
// //       <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
// //     </div>
// //   );

// //   const isCompany = session?.type?.toLowerCase() === "company";
// //   const isAdmin = session?.roles?.includes("Admin");
// //   const hasFullAccess = isCompany || isAdmin;
// //   const modules = session?.modules || {};

// //   const toggleSubmenu = (k) => setOpenSubmenus((p) => ({ ...p, [k]: !p[k] }));
// //   const toggleMenu = (m) => setOpenMenu(openMenu === m ? null : m);
// //   const closeSidebar = () => setIsSidebarOpen(false);
// //   const isActive = (path) => pathname === path;

// //   return (
// //     <div className="flex h-screen bg-gray-100 overflow-hidden pt-[safe-area-inset-top] sm:pt-0 font-sans">

// //       {/* Overlay */}
// //       {isSidebarOpen && (
// //         <div
// //           className="fixed inset-0 bg-black/60 z-40 md:hidden"
// //           onClick={closeSidebar}
// //           aria-hidden="true"
// //         />
// //       )}

// //       {/* SIDEBAR */}
// //       <aside
// //         ref={sidebarRef}
// //         aria-label="Sidebar navigation"
// //         className={`fixed inset-y-0 left-0 z-50 w-64 lg:w-72 bg-[#1e293b] text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
// //           isSidebarOpen ? "translate-x-0" : "-translate-x-full"
// //         } flex flex-col shadow-2xl`}
// //       >
// //         {/* Logo */}
// //         <div className="h-16 flex items-center justify-between px-4 lg:px-6 bg-[#0f172a] border-b border-gray-700 shrink-0">
// //           <span className="font-bold text-base lg:text-lg flex items-center gap-2 tracking-wider">
// //             <HiHome className="text-blue-400 shrink-0" />
// //             <Link href="/admin" className="truncate">ERP SYSTEM</Link>
// //           </span>
// //           {isSidebarOpen && (
// //             <button
// //               onClick={closeSidebar}
// //               className="p-2 rounded hover:bg-gray-700 transition-colors"
// //             >
// //               <HiX size={24} />
// //             </button>
// //           )}
// //         </div>

// //         {/* Nav */}
// //         <nav className="flex-1 overflow-y-auto py-2">

// //           {/* ===== FULL ACCESS (Admin / Company) ===== */}
// //           {hasFullAccess && (
// //             <>
// //               <Section title="Masters" icon={<HiUsers />} isOpen={openMenu === "master"} onToggle={() => toggleMenu("master")}>
// //                 {/*<Item href="/admin/Countries"            icon={<HiGlobeAlt />}          label="Countries"             onClick={closeSidebar} isActive={isActive("/admin/Countries")} />
// //                 <Item href="/admin/State"                icon={<HiFlag />}               label="State"                 onClick={closeSidebar} isActive={isActive("/admin/State")} />*/}
// //                 <Item href="/admin/CreateGroup"          icon={<HiUserGroup />}          label="Create Group"          onClick={closeSidebar} isActive={isActive("/admin/CreateGroup")} />
// //                 <Item href="/admin/CreateItemGroup"      icon={<HiOutlineCube />}        label="Create Item Group"     onClick={closeSidebar} isActive={isActive("/admin/CreateItemGroup")} />
// //                 <Item href="/admin/account-bankhead"     icon={<HiOutlineLibrary />}     label="Account Head"          onClick={closeSidebar} isActive={isActive("/admin/account-bankhead")} />
// //                 <Item href="/admin/bank-head-details"    icon={<HiCurrencyDollar />}     label="General Ledger"        onClick={closeSidebar} isActive={isActive("/admin/bank-head-details")} />
// //                 <Item href="/admin/createCustomers"      icon={<HiUserGroup />}          label="Create Customer"       onClick={closeSidebar} isActive={isActive("/admin/createCustomers")} />
// //                 <Item href="/admin/supplier"             icon={<HiUserGroup />}          label="Supplier"              onClick={closeSidebar} isActive={isActive("/admin/supplier")} />
// //                 <Item href="/admin/item"                 icon={<HiCube />}               label="Item"                  onClick={closeSidebar} isActive={isActive("/admin/item")} />
// //                 <Item href="/admin/WarehouseDetailsForm" icon={<HiOutlineLibrary />}     label="Warehouse Details"     onClick={closeSidebar} isActive={isActive("/admin/WarehouseDetailsForm")} />
// //               </Section>

// //               <Section title="Masters View" icon={<HiViewGrid />} isOpen={openMenu === "masterView"} onToggle={() => toggleMenu("masterView")}>
// //                 <Item href="/admin/customer-view"          icon={<HiUsers />}             label="Customer View"                onClick={closeSidebar} isActive={isActive("/admin/customer-view")} />
// //                 <Item href="/admin/supplier"               icon={<HiUserGroup />}         label="Supplier View"                onClick={closeSidebar} isActive={isActive("/admin/supplier")} />
// //                 <Item href="/admin/item"                   icon={<HiCube />}              label="Item View"                    onClick={closeSidebar} isActive={isActive("/admin/item")} />
// //                 <Item href="/admin/account-head-view"      icon={<HiOutlineLibrary />}    label="Account Head View"            onClick={closeSidebar} isActive={isActive("/admin/account-head-view")} />
// //                 <Item href="/admin/bank-head-details-view" icon={<HiCurrencyDollar />}    label="General Ledger View"          onClick={closeSidebar} isActive={isActive("/admin/bank-head-details-view")} />
// //                 <Item href="/admin/email-templates"        icon={<HiDocumentText />}      label="Email Templates"              onClick={closeSidebar} isActive={isActive("/admin/email-templates")} />
// //                 <Item href="/admin/email-masters"          icon={<HiOutlineCreditCard />} label="Email & App Password Master"  onClick={closeSidebar} isActive={isActive("/admin/email-masters")} />
// //                 {/*<Item href="/admin/price-list"             icon={<HiOutlineOfficeBuilding />} label="Price List"               onClick={closeSidebar} isActive={isActive("/admin/price-list")} />*/}
// //                 <Item href="/admin/branches"               icon={<HiOfficeBuilding />}    label="Branches"                     onClick={closeSidebar} isActive={isActive("/admin/branches")} />
// // 				    <Item href="/admin/locations"               icon={<HiOfficeBuilding />}    label="From-location"                     onClick={closeSidebar} isActive={isActive("/admin/locations")} />
// // 					   <Item href="/admin/pkg-type"               icon={<HiOfficeBuilding />}    label="Pkg-type"                     onClick={closeSidebar} isActive={isActive("/admin/pkg-type")} />
// //                 {/*<Item href="/admin/districts"              icon={<HiLocationMarker />}    label="Districts"                    onClick={closeSidebar} isActive={isActive("/admin/districts")} />*/}
             
// //                 <Item href="/admin/vehicles"               icon={<HiTruck />}             label="Vehicles"                     onClick={closeSidebar} isActive={isActive("/admin/vehicels")} />
// // 				<Item href="/admin/owners"               icon={<HiTruck />}             label="Vehicles-owner"                     onClick={closeSidebar} isActive={isActive("/admin/owners")} />
// // 								<Item href="/admin/plants"               icon={<HiTruck />}             label="plants"                     onClick={closeSidebar} isActive={isActive("/admin/plants")} />
// //                 <Item href="/admin/rate-master/create"   icon={<HiCurrencyRupee />}     label="Rate-Location-Master-create"         onClick={closeSidebar} isActive={isActive("admin/rate-master/create")} />
			
// //  <Item href="/admin/UOM"   icon={<HiCurrencyRupee />}     label="UOM"         onClick={closeSidebar} isActive={isActive("/admin/UOM")} />
// //  <Item href="/admin/sku-sizes"   icon={<HiCurrencyRupee />}     label="sku-sizes"         onClick={closeSidebar} isActive={isActive("/admin/sku-sizes")} />
// //  <Item href="/admin/purchase-type"   icon={<HiCurrencyRupee />}     label="purchase-type"         onClick={closeSidebar} isActive={isActive("/admin/purchase-type")} />
 


// //               </Section>

// //               <Section title="Transactions View" icon={<HiOutlineCreditCard />} isOpen={openMenu === "transactionsView"} onToggle={() => toggleMenu("transactionsView")}>
// //                 <Submenu isOpen={!!openSubmenus["tvSales"]} onToggle={() => toggleSubmenu("tvSales")} icon={<HiShoppingCart />} label="Sales">
// //                   <Item href="/admin/order-panel" icon={<HiClipboardList />} label="Order Panel" onClick={closeSidebar} isActive={isActive("/admin/order-panel")} />
// //                   <Item href="/admin/vehicle-negotiation" icon={<HiTruck />} label="Vehicle Negotiation" onClick={closeSidebar} isActive={isActive("/admin/vehicle-negotiation")} />
// //                   <Item href="/admin/pricing-panel" icon={<HiCurrencyRupee />} label="Pricing Panel" onClick={closeSidebar} isActive={isActive("/admin/pricing-panel")} />
// //                   <Item href="/admin/Loading-Info" icon={<HiInformationCircle />} label="Loading Info" onClick={closeSidebar} isActive={isActive("/admin/Loading-Info")} />
// //                   <Item href="/admin/Purchase-Panel" icon={<HiShoppingCart />} label="Purchase Panel" onClick={closeSidebar} isActive={isActive("/admin/Purchase-Panel")} />
// //                   <Item href="/admin/Consignment-Note" icon={<HiDocumentText />} label="Consignment Note" onClick={closeSidebar} isActive={isActive("/admin/Consignment-Note")} />
// //                   <Item href="/admin/Advance-Payment" icon={<HiCash />} label="Advance Payment" onClick={closeSidebar} isActive={isActive("/admin/Advance-Payment")} />
// // 				    <Item href="/admin/ProofofDelivery" icon={<HiCash />} label="Proof Of Delivery" onClick={closeSidebar} isActive={isActive("/admin/ProofofDelivery")} />
// // 					 <Item href="/admin/Balance-Payment" icon={<HiCash />} label="Balance-Payment" onClick={closeSidebar} isActive={isActive("/admin/Balance-Payment")} />
// // 					 <Item href="/admin/Billing" icon={<HiCash />} label="Billing" onClick={closeSidebar} isActive={isActive("/admin/Billing")} />
// //            			 <Item href="/admin/reports/order-full-report" icon={<HiCash />} label="order-full-report" onClick={closeSidebar} isActive={isActive("/admin/reports/order-full-report")} />
// //                 </Submenu>

// //                 <Submenu isOpen={!!openSubmenus["tvPurchase"]} onToggle={() => toggleSubmenu("tvPurchase")} icon={<GiStockpiles />} label="Purchase">
// //                   <Item href="/admin/PurchaseQuotationList"  icon={<SiCivicrm />}           label="Quotation View"    onClick={closeSidebar} isActive={isActive("/admin/PurchaseQuotationList")} />
// //                   <Item href="/admin/purchase-order-view"    icon={<HiPuzzle />}            label="Order View"        onClick={closeSidebar} isActive={isActive("/admin/purchase-order-view")} />
// //                   <Item href="/admin/grn-view"               icon={<HiOutlineCube />}       label="GRN View"          onClick={closeSidebar} isActive={isActive("/admin/grn-view")} />
// //                   <Item href="/admin/purchaseInvoice-view"   icon={<HiOutlineCreditCard />} label="Invoice View"      onClick={closeSidebar} isActive={isActive("/admin/purchaseInvoice-view")} />
// //                   <Item href="/admin/debit-notes-view"       icon={<HiReceiptTax />}        label="Debit Notes"       onClick={closeSidebar} isActive={isActive("/admin/debit-notes-view")} />
// //                   <Item href="/admin/purchase-report"        icon={<HiChartSquareBar />}    label="Report"            onClick={closeSidebar} isActive={isActive("/admin/purchase-report")} />
// //                 </Submenu>
// //               </Section>

// //               <Section title="User" icon={<SiCivicrm />} isOpen={openMenu === "user"} onToggle={() => toggleMenu("user")}>
// //                 <Item href="/admin/users" icon={<HiUserGroup />} label="User" onClick={closeSidebar} isActive={isActive("/admin/users")} />
// //                  <Item href="/admin/authorizations" icon={<HiUserGroup />} label="Authorizations" onClick={closeSidebar} isActive={isActive("/admin/authorizations")} />
// //               </Section>

// //               <Section title="Task" icon={<HiUserGroup />} isOpen={openMenu === "task"} onToggle={() => toggleMenu("task")}>
// //                 <Item href="/admin/tasks"       icon={<HiUserGroup />} label="Tasks"       onClick={closeSidebar} isActive={isActive("/admin/tasks")} />
// //                 <Item href="/admin/tasks/board" icon={<HiPuzzle />}    label="Tasks Board" onClick={closeSidebar} isActive={isActive("/admin/tasks/board")} />
// //               </Section>

// //               <Section title="CRM" icon={<SiCivicrm />} isOpen={openMenu === "CRM-View"} onToggle={() => toggleMenu("CRM-View")}>
// //                 <Item href="/admin/leads-view"     icon={<HiUserGroup />} label="Lead Generation" onClick={closeSidebar} isActive={isActive("/admin/leads-view")} />
// //                 <Item href="/admin/opportunities"  icon={<HiPuzzle />}    label="Opportunity"     onClick={closeSidebar} isActive={isActive("/admin/opportunities")} />
// //                 <Item href="/admin/crm/campaign"   icon={<HiPuzzle />}    label="Campaign"        onClick={closeSidebar} isActive={isActive("/admin/crm/campaign")} />
// //                 <Item href="/admin/crm/calls"      icon={<HiPuzzle />}    label="Calls"           onClick={closeSidebar} isActive={isActive("/admin/crm/calls")} />
// //               </Section>

// //               <Section title="Stock" icon={<HiOutlineCube />} isOpen={openMenu === "Stock"} onToggle={() => toggleMenu("Stock")}>
// //                 <Item href="/admin/InventoryView"            icon={<HiOutlineLibrary />} label="Inventory View"   onClick={closeSidebar} isActive={isActive("/admin/InventoryView")} />
// //                 <Item href="/admin/InventoryEntry"           icon={<HiOutlineLibrary />} label="Inventory Entry"  onClick={closeSidebar} isActive={isActive("/admin/InventoryEntry")} />
// //                 <Item href="/admin/InventoryAdjustmentsView" icon={<HiOutlineLibrary />} label="Inventory Ledger" onClick={closeSidebar} isActive={isActive("/admin/InventoryAdjustmentsView")} />
// //               </Section>

// //               <Section title="Payment" icon={<HiOutlineCreditCard />} isOpen={openMenu === "Payment"} onToggle={() => toggleMenu("Payment")}>
// //                 <Item href="/admin/Payment" icon={<HiCurrencyDollar />} label="Payment Form" onClick={closeSidebar} isActive={isActive("/admin/Payment")} />
// //               </Section>

// //               <Section title="Finance" icon={<HiOutlineCreditCard />} isOpen={openMenu === "finance"} onToggle={() => toggleMenu("finance")}>
// //                 <Submenu isOpen={!!openSubmenus["journalEntry"]} onToggle={() => toggleSubmenu("journalEntry")} icon={<HiCurrencyDollar />} label="Journal Entry">
// //                   <Item href="/admin/finance/journal-entry" icon={<HiOutlineCreditCard />} label="Journal Entry" onClick={closeSidebar} isActive={isActive("/admin/finance/journal-entry")} />
// //                 </Submenu>
// //                 <Submenu isOpen={!!openSubmenus["report"]} onToggle={() => toggleSubmenu("report")} icon={<HiChartSquareBar />} label="Report">
// //                   <Submenu isOpen={!!openSubmenus["financialReport"]} onToggle={() => toggleSubmenu("financialReport")} icon={<HiOutlineLibrary />} label="Financial Report">
// //                     <Item href="/admin/finance/report/trial-balance" icon={<HiDocumentText />} label="Trial Balance"  onClick={closeSidebar} isActive={isActive("/admin/finance/report/trial-balance")} />
// //                     <Item href="/admin/finance/report/profit-loss"   icon={<HiDocumentText />} label="Profit & Loss"  onClick={closeSidebar} isActive={isActive("/admin/finance/report/profit-loss")} />
// //                     <Item href="/admin/finance/report/balance-sheet" icon={<HiDocumentText />} label="Balance Sheet"  onClick={closeSidebar} isActive={isActive("/admin/finance/report/balance-sheet")} />
// //                   </Submenu>
// //                   <Submenu isOpen={!!openSubmenus["ageingReport"]} onToggle={() => toggleSubmenu("ageingReport")} icon={<HiUserGroup />} label="Ageing">
// //                     <Item href="/admin/finance/report/ageing/customer" icon={<HiUser />} label="Customer Ageing" onClick={closeSidebar} isActive={isActive("/admin/finance/report/ageing/customer")} />
// //                     <Item href="/admin/finance/report/ageing/supplier" icon={<HiUser />} label="Supplier Ageing" onClick={closeSidebar} isActive={isActive("/admin/finance/report/ageing/supplier")} />
// //                   </Submenu>
// //                   <Submenu isOpen={!!openSubmenus["statementReport"]} onToggle={() => toggleSubmenu("statementReport")} icon={<HiReceiptTax />} label="Statement">
// //                     <Item href="/admin/finance/report/statement/customer" icon={<HiUser />}              label="Customer Statement" onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/customer")} />
// //                     <Item href="/admin/finance/report/statement/supplier" icon={<HiUser />}              label="Supplier Statement" onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/supplier")} />
// //                     <Item href="/admin/finance/report/statement/bank"     icon={<HiOutlineCreditCard />} label="Bank Statement"     onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/bank")} />
// //                   </Submenu>
// //                 </Submenu>
// //               </Section>

// //               <Section title="Production" icon={<HiPuzzle />} isOpen={openMenu === "Production"} onToggle={() => toggleMenu("Production")}>
// //                 <Item href="/admin/bom"             icon={<HiOutlineCube />} label="BoM"              onClick={closeSidebar} isActive={isActive("/admin/bom")} />
// //                 <Item href="/admin/ProductionOrder" icon={<HiReceiptTax />}  label="Production Order" onClick={closeSidebar} isActive={isActive("/admin/ProductionOrder")} />
// //               </Section>

// //               <Section title="Production View" icon={<HiOutlineLibrary />} isOpen={openMenu === "ProductionView"} onToggle={() => toggleMenu("ProductionView")}>
// //                 <Item href="/admin/bom-view"                   icon={<HiOutlineCube />}    label="BoM View"               onClick={closeSidebar} isActive={isActive("/admin/bom-view")} />
// //                 <Item href="/admin/productionorders-list-view" icon={<HiReceiptTax />}     label="Production Orders View" onClick={closeSidebar} isActive={isActive("/admin/productionorders-list-view")} />
// //                 <Item href="/admin/production-board"           icon={<HiChartSquareBar />} label="Production Board"       onClick={closeSidebar} isActive={isActive("/admin/production-board")} />
// //               </Section>

// //               <Section title="Project" icon={<HiViewGrid />} isOpen={openMenu === "project"} onToggle={() => toggleMenu("project")}>
// //                 <Item href="/admin/project/workspaces"   icon={<HiOutlineOfficeBuilding />} label="Workspaces"  onClick={closeSidebar} isActive={isActive("/admin/project/workspaces")} />
// //                 <Item href="/admin/project/projects"     icon={<HiOutlineCube />}           label="Projects"    onClick={closeSidebar} isActive={isActive("/admin/project/projects")} />
// //                 <Item href="/admin/project/tasks/board"  icon={<HiPuzzle />}                label="Tasks Board" onClick={closeSidebar} isActive={isActive("/admin/project/tasks/board")} />
// //                 <Item href="/admin/project/tasks"        icon={<HiPuzzle />}                label="Tasks List"  onClick={closeSidebar} isActive={isActive("/admin/project/tasks")} />
// //               </Section>

// //               <Section title="HR" icon={<HiUserGroup />} isOpen={openMenu === "hr"} onToggle={() => toggleMenu("hr")}>
// //                 <Item href="/admin/hr/employee-onboarding" icon={<HiUserGroup />} label="Employee Onboarding" onClick={closeSidebar} isActive={isActive("/admin/hr/employee-onboarding")} />
// //                 <Item href="/admin/hr/Dashboard"           icon={<HiUserGroup />} label="Employee Details"    onClick={closeSidebar} isActive={isActive("/admin/hr/Dashboard")} />
// //                 <Item href="/admin/hr/masters"             icon={<HiUserGroup />} label="Department"          onClick={closeSidebar} isActive={isActive("/admin/hr/masters")} />
// //                 <Item href="/admin/hr/leaves"              icon={<HiUserGroup />} label="Leave"               onClick={closeSidebar} isActive={isActive("/admin/hr/leaves")} />
// //                 <Item href="/admin/hr/attendance"          icon={<HiUserGroup />} label="Attendance"          onClick={closeSidebar} isActive={isActive("/admin/hr/attendance")} />
// //                 <Item href="/admin/hr/payroll"             icon={<HiUserGroup />} label="Payroll"             onClick={closeSidebar} isActive={isActive("/admin/hr/payroll")} />
// //                 <Item href="/admin/hr/employees"           icon={<HiUserGroup />} label="Employee"            onClick={closeSidebar} isActive={isActive("/admin/hr/employees")} />
// //                 <Item href="/admin/hr/reports"             icon={<HiUserGroup />} label="Reports"             onClick={closeSidebar} isActive={isActive("/admin/hr/reports")} />
// //                 <Item href="/admin/hr/settings"            icon={<HiCog />}       label="Settings"            onClick={closeSidebar} isActive={isActive("/admin/hr/settings")} />
// //                 <Item href="/admin/hr/holidays"            icon={<HiGlobeAlt />}  label="Holidays"            onClick={closeSidebar} isActive={isActive("/admin/hr/holidays")} />
// //                 <Item href="/admin/hr/profile"             icon={<HiUser />}      label="Profile"             onClick={closeSidebar} isActive={isActive("/admin/hr/profile")} />
// //               </Section>

// //               <Section title="PPC" icon={<HiPuzzle />} isOpen={openMenu === "ppc"} onToggle={() => toggleMenu("ppc")}>
// //                 <Item href="/admin/ppc/operatorsPage"              icon={<HiUser />}              label="Operators"                onClick={closeSidebar} isActive={isActive("/admin/ppc/operatorsPage")} />
// //                 <Item href="/admin/ppc/machinesPage"               icon={<HiOutlineCube />}       label="Machines"                 onClick={closeSidebar} isActive={isActive("/admin/ppc/machinesPage")} />
// //                 <Item href="/admin/ppc/resourcesPage"              icon={<HiOutlineLibrary />}    label="Resources"                onClick={closeSidebar} isActive={isActive("/admin/ppc/resourcesPage")} />
// //                 <Item href="/admin/ppc/machineOutputPage"          icon={<HiOutlineLibrary />}    label="Machine Outputs"          onClick={closeSidebar} isActive={isActive("/admin/ppc/machineOutputPage")} />
// //                 <Item href="/admin/ppc/holidaysPage"               icon={<HiGlobeAlt />}          label="Holidays"                 onClick={closeSidebar} isActive={isActive("/admin/ppc/holidaysPage")} />
// //                 <Item href="/admin/ppc/operatorMachineMappingPage" icon={<HiPuzzle />}            label="Machine-Operator Mapping" onClick={closeSidebar} isActive={isActive("/admin/ppc/operatorMachineMappingPage")} />
// //                 <Item href="/admin/ppc/operations"                 icon={<HiPuzzle />}            label="Operations"               onClick={closeSidebar} isActive={isActive("/admin/ppc/operations")} />
// //                 <Item href="/admin/ppc/productionOrderPage"        icon={<HiReceiptTax />}        label="Production Planning"      onClick={closeSidebar} isActive={isActive("/admin/ppc/productionOrderPage")} />
// //                 <Item href="/admin/ppc/jobcards"                   icon={<HiReceiptTax />}        label="Job Card"                 onClick={closeSidebar} isActive={isActive("/admin/ppc/jobcards")} />
// //                 <Item href="/admin/ppc/downtime"                   icon={<HiReceiptTax />}        label="Downtime"                 onClick={closeSidebar} isActive={isActive("/admin/ppc/downtime")} />
// //               </Section>

// //               <Section title="Helpdesk" icon={<HiUser />} isOpen={openMenu === "helpdesk"} onToggle={() => toggleMenu("helpdesk")}>
// //                 <Item href="/admin/helpdesk/tickets"            icon={<HiDocumentText />}   label="Tickets"           onClick={closeSidebar} isActive={isActive("/admin/helpdesk/tickets")} />
// //                 <Item href="/admin/helpdesk/agents"             icon={<HiUsers />}          label="Agents"            onClick={closeSidebar} isActive={isActive("/admin/helpdesk/agents")} />
// //                 <Item href="/admin/helpdesk/categories"         icon={<HiUserGroup />}      label="Categories"        onClick={closeSidebar} isActive={isActive("/admin/helpdesk/categories")} />
// //                 <Item href="/admin/helpdesk/agents/manage"      icon={<HiPuzzle />}         label="Create Agent"      onClick={closeSidebar} isActive={isActive("/admin/helpdesk/agents/manage")} />
// //                 <Item href="/admin/helpdesk/settings"           icon={<HiCog />}            label="Settings"          onClick={closeSidebar} isActive={isActive("/admin/helpdesk/settings")} />
// //                 <Item href="/admin/helpdesk/feedback"           icon={<HiDocumentText />}   label="Feedback"          onClick={closeSidebar} isActive={isActive("/admin/helpdesk/feedback")} />
// //                 <Item href="/admin/helpdesk/feedback/analytics" icon={<HiChartSquareBar />} label="Feedback Analysis" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/feedback/analytics")} />
// //                 <Item href="/admin/helpdesk/report"             icon={<HiChartSquareBar />} label="Report"            onClick={closeSidebar} isActive={isActive("/admin/helpdesk/report")} />
// //               </Section>

// //               {/* ===== NEW REPORTS SECTION ===== */}
// //               <Section title="Reports" icon={<HiDocumentReport />} isOpen={openMenu === "reports"} onToggle={() => toggleMenu("reports")}>
// //                 <Item href="/admin/OrderPanel-Report" icon={<HiDocumentReport />} label="Order Panel Report" onClick={closeSidebar} isActive={isActive("/admin/OrderPanel-Report")} />
// //                 <Item href="/admin/vehiclenegotiation-Report" icon={<HiDocumentReport />} label="Vehicle Negotiation Report" onClick={closeSidebar} isActive={isActive("/admin/vehiclenegotiation-Report")} />
// //                 <Item href="/admin/Pricingpanel-Report" icon={<HiDocumentReport />} label="Pricing Panel Report" onClick={closeSidebar} isActive={isActive("/admin/Pricingpanel-Report")} />
// //                 <Item href="/admin/LoadingPanel-Report" icon={<HiDocumentReport />} label="Loading Panel Report" onClick={closeSidebar} isActive={isActive("/admin/LoadingPanel-Report")} />
// //               </Section>
// //             </>
// //           )}

// //           {/* ===== MODULE-BASED ACCESS (Normal Users) ===== */}
// //           {!hasFullAccess &&
// //             Object.entries(modules).map(([moduleName, data]) => {
// //               if (!canAccessModule(data)) return null;

// //               const moduleRoutes = MODULE_ROUTE_MAP[moduleName];
// //               if (!moduleRoutes) return null;

// //               const permissions = data?.permissions || {};

// //               const visibleRoutes = moduleRoutes.filter((route) => {
// //                 if (route.needsCreate && !permissions.create) return false;
// //                 if (route.needsView && !permissions.view) return false;
// //                 return true;
// //               });

// //               if (!visibleRoutes.length) return null;

// //               return (
// //                 <Section
// //                   key={moduleName}
// //                   title={moduleName}
// //                   icon={<HiOutlineCube />}
// //                   isOpen={openMenu === moduleName}
// //                   onToggle={() => toggleMenu(moduleName)}
// //                 >
// //                   {visibleRoutes.map((route) => (
// //                     <Item
// //                       key={route.path}
// //                       href={route.path}
// //                       icon={<HiViewGrid />}
// //                       label={route.label}
// //                       onClick={closeSidebar}
// //                       isActive={isActive(route.path)}
// //                     />
// //                   ))}
// //                 </Section>
// //               );
// //             })
// //           }

// //           <div className="p-4 mt-4 border-t border-gray-700">
// //             <LogoutButton />
// //           </div>
// //         </nav>
// //       </aside>

// //       {/* CONTENT AREA */}
// //       <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
// //         <header className="sticky top-0 z-50 w-full bg-black border-b border-gray-800 shadow-lg shrink-0">
// //           {/* Safe area (mobile notch ke liye) */}
// //           <div className="h-[env(safe-area-inset-top,24px)] w-full bg-black" />

// //           {/* Main Header Content */}
// //           <div className="flex items-center justify-between px-4 h-14">
// //             {/* Left Section */}
// //             <div className="flex items-center gap-3 min-w-0">
// //               <button
// //                 onClick={() => setIsSidebarOpen(!isSidebarOpen)}
// //                 className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
// //               >
// //                 {isSidebarOpen ? <HiX size={24} /> : <HiMenu size={24} />}
// //               </button>

// //               <h1 className="text-sm md:text-base font-bold text-white truncate tracking-tight">
// //                 {isCompany
// //                   ? "Company Administrator"
// //                   : isAdmin
// //                   ? "Admin Dashboard"
// //                   : "Dashboard"}
// //               </h1>
// //             </div>

// //             {/* Right Section */}
// //             <div className="flex items-center gap-3 shrink-0">
// //               <div className="hidden md:flex items-center gap-3 text-sm text-gray-300">
// //                 <span>{session.name || session.email}</span>
// //               </div>

// //               <div
// //                 className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border-2 border-white/10 shadow-inner"
// //                 title={session.email}
// //               >
// //                 {session.email?.charAt(0).toUpperCase()}
// //               </div>
// //             </div>
// //           </div>
// //         </header>

// //         <main className="flex-1 overflow-y-auto bg-[#f8fafc]">
// //           {children}
// //         </main>
// //       </div>
// //     </div>
// //   );
// // }

// // src/app/(dashboard)/admin/layout.js
// "use client";

// import { useState, useEffect, useRef } from "react";
// import Link from "next/link";
// import {
//   HiUsers, HiGlobeAlt, HiFlag, HiUserGroup, HiOutlineCube, HiOutlineLibrary,
//   HiCurrencyDollar, HiOutlineCreditCard, HiChartSquareBar, HiReceiptTax,
//   HiPuzzle, HiViewGrid, HiUser, HiDocumentText, HiOutlineOfficeBuilding,
//   HiCube, HiShoppingCart, HiCog, HiMenu, HiX, HiHome, HiClipboardList,
//   HiTruck, HiCurrencyRupee, HiInformationCircle, HiDocumentReport, HiCash,
//   HiOfficeBuilding, HiLocationMarker, HiMail, HiShieldCheck
// } from "react-icons/hi";
// import { GiStockpiles } from "react-icons/gi";
// import { SiCivicrm } from "react-icons/si";
// import { useRouter, usePathname } from "next/navigation";
// import LogoutButton from "@/components/LogoutButton";
// import { usePermission } from "./hooks/usePermission";

// // ── UI COMPONENTS ──

// const Section = ({ title, icon, isOpen, onToggle, children }) => (
//   <div className="border-b border-gray-600/20">
//     <button
//       onClick={onToggle}
//       className="flex justify-between w-full px-3 py-3 hover:bg-gray-600/40 transition-colors text-left"
//     >
//       <span className="flex gap-3 items-center font-medium text-sm">
//         <span className="text-lg text-blue-400">{icon}</span>
//         <span className="truncate">{title}</span>
//       </span>
//       <span className="text-xs ml-2 shrink-0">{isOpen ? "−" : "+"}</span>
//     </button>
//     {isOpen && (
//       <div className="bg-gray-800/40 pb-2 ml-4 border-l border-gray-500/50">
//         {children}
//       </div>
//     )}
//   </div>
// );

// const Submenu = ({ label, icon, isOpen, onToggle, children }) => (
//   <div className="mt-1">
//     <button
//       onClick={onToggle}
//       className="flex justify-between w-full px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white uppercase tracking-wider transition-colors"
//     >
//       <span className="flex gap-2 items-center">{icon}<span>{label}</span></span>
//       <span>{isOpen ? "−" : "+"}</span>
//     </button>
//     {isOpen && (
//       <div className="ml-2 space-y-0.5 border-l border-gray-600/30">
//         {children}
//       </div>
//     )}
//   </div>
// );

// const Item = ({ href, icon, label, onClick, isActive }) => (
//   <Link
//     href={href}
//     onClick={onClick}
//     className={`flex gap-3 px-4 py-2 text-[13px] rounded-l-md transition-all ${
//       isActive
//         ? "text-white bg-blue-600/40 border-r-2 border-blue-400"
//         : "text-gray-300 hover:text-white hover:bg-blue-600/20"
//     }`}
//   >
//     <span className="text-base opacity-70 shrink-0">{icon}</span>
//     <span className="truncate">{label}</span>
//   </Link>
// );

// // ── MAIN LAYOUT ──

// export default function Layout({ children }) {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [openMenu, setOpenMenu] = useState(null);
//   const [openSubmenus, setOpenSubmenus] = useState({});
//   const [session, setSession] = useState(null);
//   const router = useRouter();
//   const pathname = usePathname();
//   const sidebarRef = useRef(null);
//   const { canView, isAdmin } = usePermission();

//   useEffect(() => {
//     async function getSession() {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) {
//           router.push("/signin");
//           return;
//         }

//         const res = await fetch("/api/auth/me", {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         if (!res.ok) {
//           localStorage.removeItem("token");
//           localStorage.removeItem("user");
//           router.push("/signin");
//           return;
//         }

//         const data = await res.json();
//         setSession(data.user);
//         // Store user in localStorage for permission hook
//         localStorage.setItem("user", JSON.stringify(data.user));
//       } catch (err) {
//         console.error("Session fetch error:", err);
//         router.push("/signin");
//       }
//     }

//     getSession();
//   }, [router]);

//   useEffect(() => {
//     setIsSidebarOpen(false);
//   }, [pathname]);

//   useEffect(() => {
//     const handler = (e) => {
//       if (e.key === "Escape") setIsSidebarOpen(false);
//     };
//     document.addEventListener("keydown", handler);
//     return () => document.removeEventListener("keydown", handler);
//   }, []);

//   if (!session) return (
//     <div className="flex h-screen items-center justify-center bg-gray-100">
//       <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
//     </div>
//   );

//   const isCompany = session?.type?.toLowerCase() === "company";
//   const isAdminUser = isCompany || session?.roles?.includes("Admin");
//   const hasFullAccess = isAdminUser;
//   const modules = session?.modules || {};

//   const toggleSubmenu = (k) => setOpenSubmenus((p) => ({ ...p, [k]: !p[k] }));
//   const toggleMenu = (m) => setOpenMenu(openMenu === m ? null : m);
//   const closeSidebar = () => setIsSidebarOpen(false);
//   const isActive = (path) => pathname === path;

//   // Check if user can access a module
//   const canAccessModule = (moduleName) => {
//     if (hasFullAccess) return true;
//     return canView(moduleName);
//   };

//   return (
//     <div className="flex h-screen bg-gray-100 overflow-hidden pt-[safe-area-inset-top] sm:pt-0 font-sans">

//       {/* Overlay */}
//       {isSidebarOpen && (
//         <div
//           className="fixed inset-0 bg-black/60 z-40 md:hidden"
//           onClick={closeSidebar}
//           aria-hidden="true"
//         />
//       )}

//       {/* SIDEBAR */}
//       <aside
//         ref={sidebarRef}
//         aria-label="Sidebar navigation"
//         className={`fixed inset-y-0 left-0 z-50 w-64 lg:w-72 bg-[#1e293b] text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
//           isSidebarOpen ? "translate-x-0" : "-translate-x-full"
//         } flex flex-col shadow-2xl`}
//       >
//         {/* Logo */}
//         <div className="h-16 flex items-center justify-between px-4 lg:px-6 bg-[#0f172a] border-b border-gray-700 shrink-0">
//           <span className="font-bold text-base lg:text-lg flex items-center gap-2 tracking-wider">
//             <HiHome className="text-blue-400 shrink-0" />
//             <Link href="/admin" className="truncate">ERP SYSTEM</Link>
//           </span>
//           {isSidebarOpen && (
//             <button
//               onClick={closeSidebar}
//               className="p-2 rounded hover:bg-gray-700 transition-colors"
//             >
//               <HiX size={24} />
//             </button>
//           )}
//         </div>

//         {/* Nav */}
//         <nav className="flex-1 overflow-y-auto py-2">

//           {/* ===== FULL ACCESS (Admin / Company) ===== */}
//           {hasFullAccess && (
//             <>
//               <Section 
//                 title="Masters" 
//                 icon={<HiUsers />} 
//                 isOpen={openMenu === "master"} 
//                 onToggle={() => toggleMenu("master")}
//               >
//                 <Item 
//                   href="/admin/CreateGroup" 
//                   icon={<HiUserGroup />} 
//                   label="Create Group" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/CreateGroup")}
//                 />
//                 <Item 
//                   href="/admin/CreateItemGroup" 
//                   icon={<HiOutlineCube />} 
//                   label="Create Item Group" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/CreateItemGroup")}
//                 />
//                 <Item 
//                   href="/admin/account-bankhead" 
//                   icon={<HiOutlineLibrary />} 
//                   label="Account Head" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/account-bankhead")}
//                 />
//                 <Item 
//                   href="/admin/bank-head-details" 
//                   icon={<HiCurrencyDollar />} 
//                   label="General Ledger" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/bank-head-details")}
//                 />
//                 <Item 
//                   href="/admin/createCustomers" 
//                   icon={<HiUserGroup />} 
//                   label="Create Customer" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/createCustomers")}
//                 />
//                 <Item 
//                   href="/admin/supplier" 
//                   icon={<HiUserGroup />} 
//                   label="Supplier" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/supplier")}
//                 />
//                 <Item 
//                   href="/admin/item" 
//                   icon={<HiCube />} 
//                   label="Item" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/item")}
//                 />
//                 <Item 
//                   href="/admin/WarehouseDetailsForm" 
//                   icon={<HiOutlineLibrary />} 
//                   label="Warehouse Details" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/WarehouseDetailsForm")}
//                 />
//               </Section>

//               <Section 
//                 title="Masters View" 
//                 icon={<HiViewGrid />} 
//                 isOpen={openMenu === "masterView"} 
//                 onToggle={() => toggleMenu("masterView")}
//               >
//                 <Item 
//                   href="/admin/customer-view" 
//                   icon={<HiUsers />} 
//                   label="Customer View" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/customer-view")}
//                 />
//                 <Item 
//                   href="/admin/supplier" 
//                   icon={<HiUserGroup />} 
//                   label="Supplier View" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/supplier")}
//                 />
//                 <Item 
//                   href="/admin/item" 
//                   icon={<HiCube />} 
//                   label="Item View" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/item")}
//                 />
//                 <Item 
//                   href="/admin/account-head-view" 
//                   icon={<HiOutlineLibrary />} 
//                   label="Account Head View" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/account-head-view")}
//                 />
//                 <Item 
//                   href="/admin/bank-head-details-view" 
//                   icon={<HiCurrencyDollar />} 
//                   label="General Ledger View" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/bank-head-details-view")}
//                 />
//                 <Item 
//                   href="/admin/email-templates" 
//                   icon={<HiDocumentText />} 
//                   label="Email Templates" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/email-templates")}
//                 />
//                 <Item 
//                   href="/admin/email-masters" 
//                   icon={<HiOutlineCreditCard />} 
//                   label="Email & App Password Master" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/email-masters")}
//                 />
//                 <Item 
//                   href="/admin/branches" 
//                   icon={<HiOfficeBuilding />} 
//                   label="Branches" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/branches")}
//                 />
//                 <Item 
//                   href="/admin/locations" 
//                   icon={<HiOfficeBuilding />} 
//                   label="From-location" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/locations")}
//                 />
//                 <Item 
//                   href="/admin/pkg-type" 
//                   icon={<HiOfficeBuilding />} 
//                   label="Pkg-type" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/pkg-type")}
//                 />
//                 <Item 
//                   href="/admin/vehicles" 
//                   icon={<HiTruck />} 
//                   label="Vehicles" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/vehicles")}
//                 />
//                 <Item 
//                   href="/admin/owners" 
//                   icon={<HiTruck />} 
//                   label="Vehicles-owner" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/owners")}
//                 />
//                 <Item 
//                   href="/admin/plants" 
//                   icon={<HiTruck />} 
//                   label="plants" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/plants")}
//                 />
//                 <Item 
//                   href="/admin/rate-master/create" 
//                   icon={<HiCurrencyRupee />} 
//                   label="Rate-Location-Master-create" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/rate-master/create")}
//                 />
//                 <Item 
//                   href="/admin/UOM" 
//                   icon={<HiCurrencyRupee />} 
//                   label="UOM" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/UOM")}
//                 />
//                 <Item 
//                   href="/admin/sku-sizes" 
//                   icon={<HiCurrencyRupee />} 
//                   label="sku-sizes" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/sku-sizes")}
//                 />
//                 <Item 
//                   href="/admin/purchase-type" 
//                   icon={<HiCurrencyRupee />} 
//                   label="purchase-type" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/purchase-type")}
//                 />
//               </Section>

//               <Section 
//                 title="Transactions View" 
//                 icon={<HiOutlineCreditCard />} 
//                 isOpen={openMenu === "transactionsView"} 
//                 onToggle={() => toggleMenu("transactionsView")}
//               >
//                 <Submenu 
//                   isOpen={!!openSubmenus["tvSales"]} 
//                   onToggle={() => toggleSubmenu("tvSales")} 
//                   icon={<HiShoppingCart />} 
//                   label="Sales"
//                 >
//                   <Item 
//                     href="/admin/order-panel" 
//                     icon={<HiClipboardList />} 
//                     label="Order Panel" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/order-panel")}
//                   />
//                   <Item 
//                     href="/admin/vehicle-negotiation" 
//                     icon={<HiTruck />} 
//                     label="Vehicle Negotiation" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/vehicle-negotiation")}
//                   />
//                   <Item 
//                     href="/admin/pricing-panel" 
//                     icon={<HiCurrencyRupee />} 
//                     label="Pricing Panel" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/pricing-panel")}
//                   />
//                   <Item 
//                     href="/admin/Loading-Info" 
//                     icon={<HiInformationCircle />} 
//                     label="Loading Info" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/Loading-Info")}
//                   />
//                   <Item 
//                     href="/admin/Purchase-Panel" 
//                     icon={<HiShoppingCart />} 
//                     label="Purchase Panel" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/Purchase-Panel")}
//                   />
//                   <Item 
//                     href="/admin/Consignment-Note" 
//                     icon={<HiDocumentText />} 
//                     label="Consignment Note" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/Consignment-Note")}
//                   />
//                   <Item 
//                     href="/admin/Advance-Payment" 
//                     icon={<HiCash />} 
//                     label="Advance Payment" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/Advance-Payment")}
//                   />
//                   <Item 
//                     href="/admin/ProofofDelivery" 
//                     icon={<HiCash />} 
//                     label="Proof Of Delivery" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/ProofofDelivery")}
//                   />
//                   <Item 
//                     href="/admin/Balance-Payment" 
//                     icon={<HiCash />} 
//                     label="Balance-Payment" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/Balance-Payment")}
//                   />
//                   <Item 
//                     href="/admin/Billing" 
//                     icon={<HiCash />} 
//                     label="Billing" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/Billing")}
//                   />
//                   <Item 
//                     href="/admin/reports/order-full-report" 
//                     icon={<HiCash />} 
//                     label="order-full-report" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/reports/order-full-report")}
//                   />
//                 </Submenu>

//                 <Submenu 
//                   isOpen={!!openSubmenus["tvPurchase"]} 
//                   onToggle={() => toggleSubmenu("tvPurchase")} 
//                   icon={<GiStockpiles />} 
//                   label="Purchase"
//                 >
//                   <Item 
//                     href="/admin/PurchaseQuotationList" 
//                     icon={<SiCivicrm />} 
//                     label="Quotation View" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/PurchaseQuotationList")}
//                   />
//                   <Item 
//                     href="/admin/purchase-order-view" 
//                     icon={<HiPuzzle />} 
//                     label="Order View" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/purchase-order-view")}
//                   />
//                   <Item 
//                     href="/admin/grn-view" 
//                     icon={<HiOutlineCube />} 
//                     label="GRN View" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/grn-view")}
//                   />
//                   <Item 
//                     href="/admin/purchaseInvoice-view" 
//                     icon={<HiOutlineCreditCard />} 
//                     label="Invoice View" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/purchaseInvoice-view")}
//                   />
//                   <Item 
//                     href="/admin/debit-notes-view" 
//                     icon={<HiReceiptTax />} 
//                     label="Debit Notes" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/debit-notes-view")}
//                   />
//                   <Item 
//                     href="/admin/purchase-report" 
//                     icon={<HiChartSquareBar />} 
//                     label="Report" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/purchase-report")}
//                   />
//                 </Submenu>
//               </Section>

//               <Section 
//                 title="User" 
//                 icon={<SiCivicrm />} 
//                 isOpen={openMenu === "user"} 
//                 onToggle={() => toggleMenu("user")}
//               >
//                 <Item 
//                   href="/admin/users" 
//                   icon={<HiUserGroup />} 
//                   label="User" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/users")}
//                 />
//                 <Item 
//                   href="/admin/authorizations" 
//                   icon={<HiUserGroup />} 
//                   label="Authorizations" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/authorizations")}
//                 />
//                 <Item 
//                   href="/admin/permissions" 
//                   icon={<HiShieldCheck />} 
//                   label="Permissions" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/permissions")}
//                 />
//               </Section>

//               <Section 
//                 title="Task" 
//                 icon={<HiUserGroup />} 
//                 isOpen={openMenu === "task"} 
//                 onToggle={() => toggleMenu("task")}
//               >
//                 <Item 
//                   href="/admin/tasks" 
//                   icon={<HiUserGroup />} 
//                   label="Tasks" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/tasks")}
//                 />
//                 <Item 
//                   href="/admin/tasks/board" 
//                   icon={<HiPuzzle />} 
//                   label="Tasks Board" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/tasks/board")}
//                 />
//               </Section>

//               <Section 
//                 title="CRM" 
//                 icon={<SiCivicrm />} 
//                 isOpen={openMenu === "CRM-View"} 
//                 onToggle={() => toggleMenu("CRM-View")}
//               >
//                 <Item 
//                   href="/admin/leads-view" 
//                   icon={<HiUserGroup />} 
//                   label="Lead Generation" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/leads-view")}
//                 />
//                 <Item 
//                   href="/admin/opportunities" 
//                   icon={<HiPuzzle />} 
//                   label="Opportunity" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/opportunities")}
//                 />
//                 <Item 
//                   href="/admin/crm/campaign" 
//                   icon={<HiPuzzle />} 
//                   label="Campaign" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/crm/campaign")}
//                 />
//                 <Item 
//                   href="/admin/crm/calls" 
//                   icon={<HiPuzzle />} 
//                   label="Calls" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/crm/calls")}
//                 />
//               </Section>

//               <Section 
//                 title="Stock" 
//                 icon={<HiOutlineCube />} 
//                 isOpen={openMenu === "Stock"} 
//                 onToggle={() => toggleMenu("Stock")}
//               >
//                 <Item 
//                   href="/admin/InventoryView" 
//                   icon={<HiOutlineLibrary />} 
//                   label="Inventory View" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/InventoryView")}
//                 />
//                 <Item 
//                   href="/admin/InventoryEntry" 
//                   icon={<HiOutlineLibrary />} 
//                   label="Inventory Entry" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/InventoryEntry")}
//                 />
//                 <Item 
//                   href="/admin/InventoryAdjustmentsView" 
//                   icon={<HiOutlineLibrary />} 
//                   label="Inventory Ledger" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/InventoryAdjustmentsView")}
//                 />
//               </Section>

//               <Section 
//                 title="Payment" 
//                 icon={<HiOutlineCreditCard />} 
//                 isOpen={openMenu === "Payment"} 
//                 onToggle={() => toggleMenu("Payment")}
//               >
//                 <Item 
//                   href="/admin/Payment" 
//                   icon={<HiCurrencyDollar />} 
//                   label="Payment Form" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/Payment")}
//                 />
//               </Section>

//               <Section 
//                 title="Finance" 
//                 icon={<HiOutlineCreditCard />} 
//                 isOpen={openMenu === "finance"} 
//                 onToggle={() => toggleMenu("finance")}
//               >
//                 <Submenu 
//                   isOpen={!!openSubmenus["journalEntry"]} 
//                   onToggle={() => toggleSubmenu("journalEntry")} 
//                   icon={<HiCurrencyDollar />} 
//                   label="Journal Entry"
//                 >
//                   <Item 
//                     href="/admin/finance/journal-entry" 
//                     icon={<HiOutlineCreditCard />} 
//                     label="Journal Entry" 
//                     onClick={closeSidebar} 
//                     isActive={isActive("/admin/finance/journal-entry")}
//                   />
//                 </Submenu>
//                 <Submenu 
//                   isOpen={!!openSubmenus["report"]} 
//                   onToggle={() => toggleSubmenu("report")} 
//                   icon={<HiChartSquareBar />} 
//                   label="Report"
//                 >
//                   <Submenu 
//                     isOpen={!!openSubmenus["financialReport"]} 
//                     onToggle={() => toggleSubmenu("financialReport")} 
//                     icon={<HiOutlineLibrary />} 
//                     label="Financial Report"
//                   >
//                     <Item 
//                       href="/admin/finance/report/trial-balance" 
//                       icon={<HiDocumentText />} 
//                       label="Trial Balance" 
//                       onClick={closeSidebar} 
//                       isActive={isActive("/admin/finance/report/trial-balance")}
//                     />
//                     <Item 
//                       href="/admin/finance/report/profit-loss" 
//                       icon={<HiDocumentText />} 
//                       label="Profit & Loss" 
//                       onClick={closeSidebar} 
//                       isActive={isActive("/admin/finance/report/profit-loss")}
//                     />
//                     <Item 
//                       href="/admin/finance/report/balance-sheet" 
//                       icon={<HiDocumentText />} 
//                       label="Balance Sheet" 
//                       onClick={closeSidebar} 
//                       isActive={isActive("/admin/finance/report/balance-sheet")}
//                     />
//                   </Submenu>
//                   <Submenu 
//                     isOpen={!!openSubmenus["ageingReport"]} 
//                     onToggle={() => toggleSubmenu("ageingReport")} 
//                     icon={<HiUserGroup />} 
//                     label="Ageing"
//                   >
//                     <Item 
//                       href="/admin/finance/report/ageing/customer" 
//                       icon={<HiUser />} 
//                       label="Customer Ageing" 
//                       onClick={closeSidebar} 
//                       isActive={isActive("/admin/finance/report/ageing/customer")}
//                     />
//                     <Item 
//                       href="/admin/finance/report/ageing/supplier" 
//                       icon={<HiUser />} 
//                       label="Supplier Ageing" 
//                       onClick={closeSidebar} 
//                       isActive={isActive("/admin/finance/report/ageing/supplier")}
//                     />
//                   </Submenu>
//                   <Submenu 
//                     isOpen={!!openSubmenus["statementReport"]} 
//                     onToggle={() => toggleSubmenu("statementReport")} 
//                     icon={<HiReceiptTax />} 
//                     label="Statement"
//                   >
//                     <Item 
//                       href="/admin/finance/report/statement/customer" 
//                       icon={<HiUser />} 
//                       label="Customer Statement" 
//                       onClick={closeSidebar} 
//                       isActive={isActive("/admin/finance/report/statement/customer")}
//                     />
//                     <Item 
//                       href="/admin/finance/report/statement/supplier" 
//                       icon={<HiUser />} 
//                       label="Supplier Statement" 
//                       onClick={closeSidebar} 
//                       isActive={isActive("/admin/finance/report/statement/supplier")}
//                     />
//                     <Item 
//                       href="/admin/finance/report/statement/bank" 
//                       icon={<HiOutlineCreditCard />} 
//                       label="Bank Statement" 
//                       onClick={closeSidebar} 
//                       isActive={isActive("/admin/finance/report/statement/bank")}
//                     />
//                   </Submenu>
//                 </Submenu>
//               </Section>

//               <Section 
//                 title="Production" 
//                 icon={<HiPuzzle />} 
//                 isOpen={openMenu === "Production"} 
//                 onToggle={() => toggleMenu("Production")}
//               >
//                 <Item 
//                   href="/admin/bom" 
//                   icon={<HiOutlineCube />} 
//                   label="BoM" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/bom")}
//                 />
//                 <Item 
//                   href="/admin/ProductionOrder" 
//                   icon={<HiReceiptTax />} 
//                   label="Production Order" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/ProductionOrder")}
//                 />
//               </Section>

//               <Section 
//                 title="Production View" 
//                 icon={<HiOutlineLibrary />} 
//                 isOpen={openMenu === "ProductionView"} 
//                 onToggle={() => toggleMenu("ProductionView")}
//               >
//                 <Item 
//                   href="/admin/bom-view" 
//                   icon={<HiOutlineCube />} 
//                   label="BoM View" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/bom-view")}
//                 />
//                 <Item 
//                   href="/admin/productionorders-list-view" 
//                   icon={<HiReceiptTax />} 
//                   label="Production Orders View" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/productionorders-list-view")}
//                 />
//                 <Item 
//                   href="/admin/production-board" 
//                   icon={<HiChartSquareBar />} 
//                   label="Production Board" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/production-board")}
//                 />
//               </Section>

//               <Section 
//                 title="Project" 
//                 icon={<HiViewGrid />} 
//                 isOpen={openMenu === "project"} 
//                 onToggle={() => toggleMenu("project")}
//               >
//                 <Item 
//                   href="/admin/project/workspaces" 
//                   icon={<HiOutlineOfficeBuilding />} 
//                   label="Workspaces" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/project/workspaces")}
//                 />
//                 <Item 
//                   href="/admin/project/projects" 
//                   icon={<HiOutlineCube />} 
//                   label="Projects" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/project/projects")}
//                 />
//                 <Item 
//                   href="/admin/project/tasks/board" 
//                   icon={<HiPuzzle />} 
//                   label="Tasks Board" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/project/tasks/board")}
//                 />
//                 <Item 
//                   href="/admin/project/tasks" 
//                   icon={<HiPuzzle />} 
//                   label="Tasks List" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/project/tasks")}
//                 />
//               </Section>

//               <Section 
//                 title="HR" 
//                 icon={<HiUserGroup />} 
//                 isOpen={openMenu === "hr"} 
//                 onToggle={() => toggleMenu("hr")}
//               >
//                 <Item 
//                   href="/admin/hr/employee-onboarding" 
//                   icon={<HiUserGroup />} 
//                   label="Employee Onboarding" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/hr/employee-onboarding")}
//                 />
//                 <Item 
//                   href="/admin/hr/Dashboard" 
//                   icon={<HiUserGroup />} 
//                   label="Employee Details" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/hr/Dashboard")}
//                 />
//                 <Item 
//                   href="/admin/hr/masters" 
//                   icon={<HiUserGroup />} 
//                   label="Department" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/hr/masters")}
//                 />
//                 <Item 
//                   href="/admin/hr/leaves" 
//                   icon={<HiUserGroup />} 
//                   label="Leave" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/hr/leaves")}
//                 />
//                 <Item 
//                   href="/admin/hr/attendance" 
//                   icon={<HiUserGroup />} 
//                   label="Attendance" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/hr/attendance")}
//                 />
//                 <Item 
//                   href="/admin/hr/payroll" 
//                   icon={<HiUserGroup />} 
//                   label="Payroll" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/hr/payroll")}
//                 />
//                 <Item 
//                   href="/admin/hr/employees" 
//                   icon={<HiUserGroup />} 
//                   label="Employee" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/hr/employees")}
//                 />
//                 <Item 
//                   href="/admin/hr/reports" 
//                   icon={<HiUserGroup />} 
//                   label="Reports" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/hr/reports")}
//                 />
//                 <Item 
//                   href="/admin/hr/settings" 
//                   icon={<HiCog />} 
//                   label="Settings" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/hr/settings")}
//                 />
//                 <Item 
//                   href="/admin/hr/holidays" 
//                   icon={<HiGlobeAlt />} 
//                   label="Holidays" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/hr/holidays")}
//                 />
//                 <Item 
//                   href="/admin/hr/profile" 
//                   icon={<HiUser />} 
//                   label="Profile" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/hr/profile")}
//                 />
//               </Section>

//               <Section 
//                 title="PPC" 
//                 icon={<HiPuzzle />} 
//                 isOpen={openMenu === "ppc"} 
//                 onToggle={() => toggleMenu("ppc")}
//               >
//                 <Item 
//                   href="/admin/ppc/operatorsPage" 
//                   icon={<HiUser />} 
//                   label="Operators" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/ppc/operatorsPage")}
//                 />
//                 <Item 
//                   href="/admin/ppc/machinesPage" 
//                   icon={<HiOutlineCube />} 
//                   label="Machines" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/ppc/machinesPage")}
//                 />
//                 <Item 
//                   href="/admin/ppc/resourcesPage" 
//                   icon={<HiOutlineLibrary />} 
//                   label="Resources" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/ppc/resourcesPage")}
//                 />
//                 <Item 
//                   href="/admin/ppc/machineOutputPage" 
//                   icon={<HiOutlineLibrary />} 
//                   label="Machine Outputs" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/ppc/machineOutputPage")}
//                 />
//                 <Item 
//                   href="/admin/ppc/holidaysPage" 
//                   icon={<HiGlobeAlt />} 
//                   label="Holidays" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/ppc/holidaysPage")}
//                 />
//                 <Item 
//                   href="/admin/ppc/operatorMachineMappingPage" 
//                   icon={<HiPuzzle />} 
//                   label="Machine-Operator Mapping" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/ppc/operatorMachineMappingPage")}
//                 />
//                 <Item 
//                   href="/admin/ppc/operations" 
//                   icon={<HiPuzzle />} 
//                   label="Operations" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/ppc/operations")}
//                 />
//                 <Item 
//                   href="/admin/ppc/productionOrderPage" 
//                   icon={<HiReceiptTax />} 
//                   label="Production Planning" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/ppc/productionOrderPage")}
//                 />
//                 <Item 
//                   href="/admin/ppc/jobcards" 
//                   icon={<HiReceiptTax />} 
//                   label="Job Card" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/ppc/jobcards")}
//                 />
//                 <Item 
//                   href="/admin/ppc/downtime" 
//                   icon={<HiReceiptTax />} 
//                   label="Downtime" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/ppc/downtime")}
//                 />
//               </Section>

//               <Section 
//                 title="Helpdesk" 
//                 icon={<HiUser />} 
//                 isOpen={openMenu === "helpdesk"} 
//                 onToggle={() => toggleMenu("helpdesk")}
//               >
//                 <Item 
//                   href="/admin/helpdesk/tickets" 
//                   icon={<HiDocumentText />} 
//                   label="Tickets" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/helpdesk/tickets")}
//                 />
//                 <Item 
//                   href="/admin/helpdesk/agents" 
//                   icon={<HiUsers />} 
//                   label="Agents" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/helpdesk/agents")}
//                 />
//                 <Item 
//                   href="/admin/helpdesk/categories" 
//                   icon={<HiUserGroup />} 
//                   label="Categories" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/helpdesk/categories")}
//                 />
//                 <Item 
//                   href="/admin/helpdesk/agents/manage" 
//                   icon={<HiPuzzle />} 
//                   label="Create Agent" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/helpdesk/agents/manage")}
//                 />
//                 <Item 
//                   href="/admin/helpdesk/settings" 
//                   icon={<HiCog />} 
//                   label="Settings" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/helpdesk/settings")}
//                 />
//                 <Item 
//                   href="/admin/helpdesk/feedback" 
//                   icon={<HiDocumentText />} 
//                   label="Feedback" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/helpdesk/feedback")}
//                 />
//                 <Item 
//                   href="/admin/helpdesk/feedback/analytics" 
//                   icon={<HiChartSquareBar />} 
//                   label="Feedback Analysis" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/helpdesk/feedback/analytics")}
//                 />
//                 <Item 
//                   href="/admin/helpdesk/report" 
//                   icon={<HiChartSquareBar />} 
//                   label="Report" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/helpdesk/report")}
//                 />
//               </Section>

//               <Section 
//                 title="Reports" 
//                 icon={<HiDocumentReport />} 
//                 isOpen={openMenu === "reports"} 
//                 onToggle={() => toggleMenu("reports")}
//               >
//                 <Item 
//                   href="/admin/OrderPanel-Report" 
//                   icon={<HiDocumentReport />} 
//                   label="Order Panel Report" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/OrderPanel-Report")}
//                 />
//                 <Item 
//                   href="/admin/vehiclenegotiation-Report" 
//                   icon={<HiDocumentReport />} 
//                   label="Vehicle Negotiation Report" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/vehiclenegotiation-Report")}
//                 />
//                 <Item 
//                   href="/admin/Pricingpanel-Report" 
//                   icon={<HiDocumentReport />} 
//                   label="Pricing Panel Report" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/Pricingpanel-Report")}
//                 />
//                 <Item 
//                   href="/admin/LoadingPanel-Report" 
//                   icon={<HiDocumentReport />} 
//                   label="Loading Panel Report" 
//                   onClick={closeSidebar} 
//                   isActive={isActive("/admin/LoadingPanel-Report")}
//                 />
//               </Section>
//             </>
//           )}

//           {/* ===== MODULE-BASED ACCESS (Normal Users) ===== */}
//           {!hasFullAccess &&
//             Object.entries(modules).map(([moduleName, data]) => {
//               if (!data?.selected) return null;
              
//               // Check if user has view permission for this module
//               if (!canView(moduleName)) return null;

//               return (
//                 <Section
//                   key={moduleName}
//                   title={moduleName}
//                   icon={<HiOutlineCube />}
//                   isOpen={openMenu === moduleName}
//                   onToggle={() => toggleMenu(moduleName)}
//                 >
//                   {/* Show all routes for this module */}
//                   <Item
//                     href={`/admin/${moduleName.toLowerCase().replace(/ /g, '-')}`}
//                     icon={<HiViewGrid />}
//                     label={moduleName}
//                     onClick={closeSidebar}
//                     isActive={isActive(`/admin/${moduleName.toLowerCase().replace(/ /g, '-')}`)}
//                   />
//                 </Section>
//               );
//             })
//           }

//           <div className="p-4 mt-4 border-t border-gray-700">
//             <LogoutButton />
//           </div>
//         </nav>
//       </aside>

//       {/* CONTENT AREA */}
//       <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
//         <header className="sticky top-0 z-50 w-full bg-black border-b border-gray-800 shadow-lg shrink-0">
//           <div className="h-[env(safe-area-inset-top,24px)] w-full bg-black" />

//           <div className="flex items-center justify-between px-4 h-14">
//             <div className="flex items-center gap-3 min-w-0">
//               <button
//                 onClick={() => setIsSidebarOpen(!isSidebarOpen)}
//                 className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
//               >
//                 {isSidebarOpen ? <HiX size={24} /> : <HiMenu size={24} />}
//               </button>

//               <h1 className="text-sm md:text-base font-bold text-white truncate tracking-tight">
//                 {isCompany
//                   ? "Company Administrator"
//                   : isAdminUser
//                   ? "Admin Dashboard"
//                   : "Dashboard"}
//               </h1>
//             </div>

//             <div className="flex items-center gap-3 shrink-0">
//               <div className="hidden md:flex items-center gap-3 text-sm text-gray-300">
//                 <span>{session.name || session.email}</span>
//               </div>

//               <div
//                 className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border-2 border-white/10 shadow-inner"
//                 title={session.email}
//               >
//                 {session.email?.charAt(0).toUpperCase()}
//               </div>
//             </div>
//           </div>
//         </header>

//         <main className="flex-1 overflow-y-auto bg-[#f8fafc]">
//           {children}
//         </main>
//       </div>
//     </div>
//   );
// }

// src/app/(dashboard)/admin/layout.js
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  HiUsers, HiGlobeAlt, HiFlag, HiUserGroup, HiOutlineCube, HiOutlineLibrary,
  HiCurrencyDollar, HiOutlineCreditCard, HiChartSquareBar, HiReceiptTax,
  HiPuzzle, HiViewGrid, HiUser, HiDocumentText, HiOutlineOfficeBuilding,
  HiCube, HiShoppingCart, HiCog, HiMenu, HiX, HiHome, HiClipboardList,
  HiTruck, HiCurrencyRupee, HiInformationCircle, HiDocumentReport, HiCash,
  HiOfficeBuilding, HiLocationMarker, HiMail, HiShieldCheck
} from "react-icons/hi";
import { GiStockpiles } from "react-icons/gi";
import { SiCivicrm } from "react-icons/si";
import { useRouter, usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

// ✅ FIXED: Changed from "./hooks/usePermission" to "@/hooks/usePermission"
import { usePermission } from "./hooks/usePermission";

// ── UI COMPONENTS ──

const Section = ({ title, icon, isOpen, onToggle, children }) => (
  <div className="border-b border-gray-600/20">
    <button
      onClick={onToggle}
      className="flex justify-between w-full px-3 py-3 hover:bg-gray-600/40 transition-colors text-left"
    >
      <span className="flex gap-3 items-center font-medium text-sm">
        <span className="text-lg text-blue-400">{icon}</span>
        <span className="truncate">{title}</span>
      </span>
      <span className="text-xs ml-2 shrink-0">{isOpen ? "−" : "+"}</span>
    </button>
    {isOpen && (
      <div className="bg-gray-800/40 pb-2 ml-4 border-l border-gray-500/50">
        {children}
      </div>
    )}
  </div>
);

const Submenu = ({ label, icon, isOpen, onToggle, children }) => (
  <div className="mt-1">
    <button
      onClick={onToggle}
      className="flex justify-between w-full px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white uppercase tracking-wider transition-colors"
    >
      <span className="flex gap-2 items-center">{icon}<span>{label}</span></span>
      <span>{isOpen ? "−" : "+"}</span>
    </button>
    {isOpen && (
      <div className="ml-2 space-y-0.5 border-l border-gray-600/30">
        {children}
      </div>
    )}
  </div>
);

const Item = ({ href, icon, label, onClick, isActive }) => (
  <Link
    href={href}
    onClick={onClick}
    className={`flex gap-3 px-4 py-2 text-[13px] rounded-l-md transition-all ${
      isActive
        ? "text-white bg-blue-600/40 border-r-2 border-blue-400"
        : "text-gray-300 hover:text-white hover:bg-blue-600/20"
    }`}
  >
    <span className="text-base opacity-70 shrink-0">{icon}</span>
    <span className="truncate">{label}</span>
  </Link>
);

// ── MAIN LAYOUT ──

export default function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [openSubmenus, setOpenSubmenus] = useState({});
  const [session, setSession] = useState(null);
  const router = useRouter();
  const pathname = usePathname();
  const sidebarRef = useRef(null);
  const { canView, isAdmin } = usePermission();

  useEffect(() => {
    async function getSession() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/signin");
          return;
        }

        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.push("/signin");
          return;
        }

        const data = await res.json();
        setSession(data.user);
        // Store user in localStorage for permission hook
        localStorage.setItem("user", JSON.stringify(data.user));
        window.dispatchEvent(new Event('erp:user-session-updated'));
      } catch (err) {
        console.error("Session fetch error:", err);
        router.push("/signin");
      }
    }

    getSession();
  }, [router]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setIsSidebarOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (!session) return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
    </div>
  );

  const isCompany = session?.type?.toLowerCase() === "company";
  const isAdminUser = isCompany || session?.roles?.includes("Admin");
  const hasFullAccess = isAdminUser;
  const modules = session?.modules || {};

  const toggleSubmenu = (k) => setOpenSubmenus((p) => ({ ...p, [k]: !p[k] }));
  const toggleMenu = (m) => setOpenMenu(openMenu === m ? null : m);
  const closeSidebar = () => setIsSidebarOpen(false);
  const isActive = (path) => pathname === path;

  // Check if user can access a module
  const canAccessModule = (moduleName) => {
    if (hasFullAccess) return true;
    return canView(moduleName);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden pt-[safe-area-inset-top] sm:pt-0 font-sans">

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside
        ref={sidebarRef}
        aria-label="Sidebar navigation"
        className={`fixed inset-y-0 left-0 z-50 w-64 lg:w-72 bg-[#1e293b] text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col shadow-2xl`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 lg:px-6 bg-[#0f172a] border-b border-gray-700 shrink-0">
          <span className="font-bold text-base lg:text-lg flex items-center gap-2 tracking-wider">
            <HiHome className="text-blue-400 shrink-0" />
            <Link href="/admin" className="truncate">ERP SYSTEM</Link>
          </span>
          {isSidebarOpen && (
            <button
              onClick={closeSidebar}
              className="p-2 rounded hover:bg-gray-700 transition-colors"
            >
              <HiX size={24} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">

          {/* ===== FULL ACCESS (Admin / Company) ===== */}
          {hasFullAccess && (
            <>
              <Section 
                title="Masters" 
                icon={<HiUsers />} 
                isOpen={openMenu === "master"} 
                onToggle={() => toggleMenu("master")}
              >
                <Item 
                  href="/admin/CreateGroup" 
                  icon={<HiUserGroup />} 
                  label="Create Group" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/CreateGroup")}
                />
                <Item 
                  href="/admin/CreateItemGroup" 
                  icon={<HiOutlineCube />} 
                  label="Create Item Group" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/CreateItemGroup")}
                />
                <Item 
                  href="/admin/account-bankhead" 
                  icon={<HiOutlineLibrary />} 
                  label="Account Head" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/account-bankhead")}
                />
                <Item 
                  href="/admin/bank-head-details" 
                  icon={<HiCurrencyDollar />} 
                  label="General Ledger" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/bank-head-details")}
                />
                <Item 
                  href="/admin/createCustomers" 
                  icon={<HiUserGroup />} 
                  label="Create Customer" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/createCustomers")}
                />
                <Item 
                  href="/admin/supplier" 
                  icon={<HiUserGroup />} 
                  label="Supplier" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/supplier")}
                />
                <Item 
                  href="/admin/item" 
                  icon={<HiCube />} 
                  label="Item" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/item")}
                />
                <Item 
                  href="/admin/WarehouseDetailsForm" 
                  icon={<HiOutlineLibrary />} 
                  label="Warehouse Details" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/WarehouseDetailsForm")}
                />
                <Item 
                  href="/admin/subcompanies" 
                  icon={<HiOutlineLibrary />} 
                  label="sub companies" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/subcompanies")}
                />
              </Section>

              <Section 
                title="Masters View" 
                icon={<HiViewGrid />} 
                isOpen={openMenu === "masterView"} 
                onToggle={() => toggleMenu("masterView")}
              >
                <Item 
                  href="/admin/customer-view" 
                  icon={<HiUsers />} 
                  label="Customer View" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/customer-view")}
                />
                <Item 
                  href="/admin/supplier" 
                  icon={<HiUserGroup />} 
                  label="Supplier View" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/supplier")}
                />
                <Item 
                  href="/admin/item" 
                  icon={<HiCube />} 
                  label="Item View" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/item")}
                />
                <Item 
                  href="/admin/account-head-view" 
                  icon={<HiOutlineLibrary />} 
                  label="Account Head View" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/account-head-view")}
                />
                <Item 
                  href="/admin/bank-head-details-view" 
                  icon={<HiCurrencyDollar />} 
                  label="General Ledger View" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/bank-head-details-view")}
                />
                <Item 
                  href="/admin/email-templates" 
                  icon={<HiDocumentText />} 
                  label="Email Templates" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/email-templates")}
                />
                <Item 
                  href="/admin/email-masters" 
                  icon={<HiOutlineCreditCard />} 
                  label="Email & App Password Master" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/email-masters")}
                />
                <Item 
                  href="/admin/branches" 
                  icon={<HiOfficeBuilding />} 
                  label="Branches" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/branches")}
                />
                <Item 
                  href="/admin/locations" 
                  icon={<HiOfficeBuilding />} 
                  label="From-location" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/locations")}
                />
                <Item 
                  href="/admin/pkg-type" 
                  icon={<HiOfficeBuilding />} 
                  label="Pkg-type" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/pkg-type")}
                />
                <Item 
                  href="/admin/vehicles" 
                  icon={<HiTruck />} 
                  label="Vehicles" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/vehicles")}
                />
                <Item 
                  href="/admin/owners" 
                  icon={<HiTruck />} 
                  label="Vehicles-owner" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/owners")}
                />
                <Item 
                  href="/admin/plants" 
                  icon={<HiTruck />} 
                  label="plants" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/plants")}
                />
                <Item 
                  href="/admin/rate-master/create" 
                  icon={<HiCurrencyRupee />} 
                  label="Rate-Location-Master-create" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/rate-master/create")}
                />
                <Item 
                  href="/admin/UOM" 
                  icon={<HiCurrencyRupee />} 
                  label="UOM" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/UOM")}
                />
                <Item 
                  href="/admin/sku-sizes" 
                  icon={<HiCurrencyRupee />} 
                  label="sku-sizes" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/sku-sizes")}
                />
                <Item 
                  href="/admin/purchase-type" 
                  icon={<HiCurrencyRupee />} 
                  label="purchase-type" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/purchase-type")}
                />
              </Section>

              <Section 
                title="Transactions View" 
                icon={<HiOutlineCreditCard />} 
                isOpen={openMenu === "transactionsView"} 
                onToggle={() => toggleMenu("transactionsView")}
              >
                <Submenu 
                  isOpen={!!openSubmenus["tvSales"]} 
                  onToggle={() => toggleSubmenu("tvSales")} 
                  icon={<HiShoppingCart />} 
                  label="Sales"
                >
                  <Item 
                    href="/admin/order-panel" 
                    icon={<HiClipboardList />} 
                    label="Order Panel" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/order-panel")}
                  />
                  <Item 
                    href="/admin/vehicle-negotiation" 
                    icon={<HiTruck />} 
                    label="Vehicle Negotiation" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/vehicle-negotiation")}
                  />
                  {canView("Rate Target (Vehicle Negotiation)") && (
                    <Item
                      href="/admin/rate-target-vehicle-negotiation"
                      icon={<HiCurrencyRupee />}
                      label="Rate Target (Vehicle Negotiation)"
                      onClick={closeSidebar}
                      isActive={isActive("/admin/rate-target-vehicle-negotiation")}
                    />
                  )}
                  <Item 
                    href="/admin/pricing-panel" 
                    icon={<HiCurrencyRupee />} 
                    label="Pricing Panel" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/pricing-panel")}
                  />
                  <Item 
                    href="/admin/Loading-Info" 
                    icon={<HiInformationCircle />} 
                    label="Loading Info" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/Loading-Info")}
                  />
                  <Item 
                    href="/admin/Purchase-Panel" 
                    icon={<HiShoppingCart />} 
                    label="Purchase Panel" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/Purchase-Panel")}
                  />
                  <Item 
                    href="/admin/Consignment-Note" 
                    icon={<HiDocumentText />} 
                    label="Consignment Note" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/Consignment-Note")}
                  />
                  <Item 
                    href="/admin/Advance-Payment" 
                    icon={<HiCash />} 
                    label="Advance Payment" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/Advance-Payment")}
                  />
                  <Item 
                    href="/admin/ProofofDelivery" 
                    icon={<HiCash />} 
                    label="Proof Of Delivery" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/ProofofDelivery")}
                  />
                  <Item 
                    href="/admin/Balance-Payment" 
                    icon={<HiCash />} 
                    label="Balance-Payment" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/Balance-Payment")}
                  />
                  <Item 
                    href="/admin/Billing" 
                    icon={<HiCash />} 
                    label="Billing" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/Billing")}
                  />
                  <Item 
                    href="/admin/reports/order-full-report" 
                    icon={<HiCash />} 
                    label="order-full-report" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/reports/order-full-report")}
                  />
                </Submenu>

                <Submenu 
                  isOpen={!!openSubmenus["tvPurchase"]} 
                  onToggle={() => toggleSubmenu("tvPurchase")} 
                  icon={<GiStockpiles />} 
                  label="Purchase"
                >
                  <Item 
                    href="/admin/PurchaseQuotationList" 
                    icon={<SiCivicrm />} 
                    label="Quotation View" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/PurchaseQuotationList")}
                  />
                  <Item 
                    href="/admin/purchase-order-view" 
                    icon={<HiPuzzle />} 
                    label="Order View" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/purchase-order-view")}
                  />
                  <Item 
                    href="/admin/grn-view" 
                    icon={<HiOutlineCube />} 
                    label="GRN View" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/grn-view")}
                  />
                  <Item 
                    href="/admin/purchaseInvoice-view" 
                    icon={<HiOutlineCreditCard />} 
                    label="Invoice View" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/purchaseInvoice-view")}
                  />
                  <Item 
                    href="/admin/debit-notes-view" 
                    icon={<HiReceiptTax />} 
                    label="Debit Notes" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/debit-notes-view")}
                  />
                  <Item 
                    href="/admin/purchase-report" 
                    icon={<HiChartSquareBar />} 
                    label="Report" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/purchase-report")}
                  />
                </Submenu>
              </Section>

              <Section 
                title="User" 
                icon={<SiCivicrm />} 
                isOpen={openMenu === "user"} 
                onToggle={() => toggleMenu("user")}
              >
                <Item 
                  href="/admin/users" 
                  icon={<HiUserGroup />} 
                  label="User" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/users")}
                />
                <Item 
                  href="/admin/authorizations" 
                  icon={<HiUserGroup />} 
                  label="Authorizations" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/authorizations")}
                />
                <Item 
                  href="/admin/permissions" 
                  icon={<HiShieldCheck />} 
                  label="Permissions" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/permissions")}
                />
              </Section>

              <Section 
                title="Task" 
                icon={<HiUserGroup />} 
                isOpen={openMenu === "task"} 
                onToggle={() => toggleMenu("task")}
              >
                <Item 
                  href="/admin/tasks" 
                  icon={<HiUserGroup />} 
                  label="Tasks" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/tasks")}
                />
                <Item 
                  href="/admin/tasks/board" 
                  icon={<HiPuzzle />} 
                  label="Tasks Board" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/tasks/board")}
                />
              </Section>

              <Section 
                title="CRM" 
                icon={<SiCivicrm />} 
                isOpen={openMenu === "CRM-View"} 
                onToggle={() => toggleMenu("CRM-View")}
              >
                <Item 
                  href="/admin/leads-view" 
                  icon={<HiUserGroup />} 
                  label="Lead Generation" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/leads-view")}
                />
                <Item 
                  href="/admin/opportunities" 
                  icon={<HiPuzzle />} 
                  label="Opportunity" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/opportunities")}
                />
                <Item 
                  href="/admin/crm/campaign" 
                  icon={<HiPuzzle />} 
                  label="Campaign" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/crm/campaign")}
                />
                <Item 
                  href="/admin/crm/calls" 
                  icon={<HiPuzzle />} 
                  label="Calls" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/crm/calls")}
                />
              </Section>

              <Section 
                title="Stock" 
                icon={<HiOutlineCube />} 
                isOpen={openMenu === "Stock"} 
                onToggle={() => toggleMenu("Stock")}
              >
                <Item 
                  href="/admin/InventoryView" 
                  icon={<HiOutlineLibrary />} 
                  label="Inventory View" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/InventoryView")}
                />
                <Item 
                  href="/admin/InventoryEntry" 
                  icon={<HiOutlineLibrary />} 
                  label="Inventory Entry" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/InventoryEntry")}
                />
                <Item 
                  href="/admin/InventoryAdjustmentsView" 
                  icon={<HiOutlineLibrary />} 
                  label="Inventory Ledger" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/InventoryAdjustmentsView")}
                />
              </Section>

              <Section 
                title="Payment" 
                icon={<HiOutlineCreditCard />} 
                isOpen={openMenu === "Payment"} 
                onToggle={() => toggleMenu("Payment")}
              >
                <Item 
                  href="/admin/Payment" 
                  icon={<HiCurrencyDollar />} 
                  label="Payment Form" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/Payment")}
                />
              </Section>

              <Section 
                title="Finance" 
                icon={<HiOutlineCreditCard />} 
                isOpen={openMenu === "finance"} 
                onToggle={() => toggleMenu("finance")}
              >
                <Submenu 
                  isOpen={!!openSubmenus["journalEntry"]} 
                  onToggle={() => toggleSubmenu("journalEntry")} 
                  icon={<HiCurrencyDollar />} 
                  label="Journal Entry"
                >
                  <Item 
                    href="/admin/finance/journal-entry" 
                    icon={<HiOutlineCreditCard />} 
                    label="Journal Entry" 
                    onClick={closeSidebar} 
                    isActive={isActive("/admin/finance/journal-entry")}
                  />
                </Submenu>
                <Submenu 
                  isOpen={!!openSubmenus["report"]} 
                  onToggle={() => toggleSubmenu("report")} 
                  icon={<HiChartSquareBar />} 
                  label="Report"
                >
                  <Submenu 
                    isOpen={!!openSubmenus["financialReport"]} 
                    onToggle={() => toggleSubmenu("financialReport")} 
                    icon={<HiOutlineLibrary />} 
                    label="Financial Report"
                  >
                    <Item 
                      href="/admin/finance/report/trial-balance" 
                      icon={<HiDocumentText />} 
                      label="Trial Balance" 
                      onClick={closeSidebar} 
                      isActive={isActive("/admin/finance/report/trial-balance")}
                    />
                    <Item 
                      href="/admin/finance/report/profit-loss" 
                      icon={<HiDocumentText />} 
                      label="Profit & Loss" 
                      onClick={closeSidebar} 
                      isActive={isActive("/admin/finance/report/profit-loss")}
                    />
                    <Item 
                      href="/admin/finance/report/balance-sheet" 
                      icon={<HiDocumentText />} 
                      label="Balance Sheet" 
                      onClick={closeSidebar} 
                      isActive={isActive("/admin/finance/report/balance-sheet")}
                    />
                  </Submenu>
                  <Submenu 
                    isOpen={!!openSubmenus["ageingReport"]} 
                    onToggle={() => toggleSubmenu("ageingReport")} 
                    icon={<HiUserGroup />} 
                    label="Ageing"
                  >
                    <Item 
                      href="/admin/finance/report/ageing/customer" 
                      icon={<HiUser />} 
                      label="Customer Ageing" 
                      onClick={closeSidebar} 
                      isActive={isActive("/admin/finance/report/ageing/customer")}
                    />
                    <Item 
                      href="/admin/finance/report/ageing/supplier" 
                      icon={<HiUser />} 
                      label="Supplier Ageing" 
                      onClick={closeSidebar} 
                      isActive={isActive("/admin/finance/report/ageing/supplier")}
                    />
                  </Submenu>
                  <Submenu 
                    isOpen={!!openSubmenus["statementReport"]} 
                    onToggle={() => toggleSubmenu("statementReport")} 
                    icon={<HiReceiptTax />} 
                    label="Statement"
                  >
                    <Item 
                      href="/admin/finance/report/statement/customer" 
                      icon={<HiUser />} 
                      label="Customer Statement" 
                      onClick={closeSidebar} 
                      isActive={isActive("/admin/finance/report/statement/customer")}
                    />
                    <Item 
                      href="/admin/finance/report/statement/supplier" 
                      icon={<HiUser />} 
                      label="Supplier Statement" 
                      onClick={closeSidebar} 
                      isActive={isActive("/admin/finance/report/statement/supplier")}
                    />
                    <Item 
                      href="/admin/finance/report/statement/bank" 
                      icon={<HiOutlineCreditCard />} 
                      label="Bank Statement" 
                      onClick={closeSidebar} 
                      isActive={isActive("/admin/finance/report/statement/bank")}
                    />
                  </Submenu>
                </Submenu>
              </Section>

              <Section 
                title="Production" 
                icon={<HiPuzzle />} 
                isOpen={openMenu === "Production"} 
                onToggle={() => toggleMenu("Production")}
              >
                <Item 
                  href="/admin/bom" 
                  icon={<HiOutlineCube />} 
                  label="BoM" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/bom")}
                />
                <Item 
                  href="/admin/ProductionOrder" 
                  icon={<HiReceiptTax />} 
                  label="Production Order" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/ProductionOrder")}
                />
              </Section>

              <Section 
                title="Production View" 
                icon={<HiOutlineLibrary />} 
                isOpen={openMenu === "ProductionView"} 
                onToggle={() => toggleMenu("ProductionView")}
              >
                <Item 
                  href="/admin/bom-view" 
                  icon={<HiOutlineCube />} 
                  label="BoM View" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/bom-view")}
                />
                <Item 
                  href="/admin/productionorders-list-view" 
                  icon={<HiReceiptTax />} 
                  label="Production Orders View" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/productionorders-list-view")}
                />
                <Item 
                  href="/admin/production-board" 
                  icon={<HiChartSquareBar />} 
                  label="Production Board" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/production-board")}
                />
              </Section>

              <Section 
                title="Project" 
                icon={<HiViewGrid />} 
                isOpen={openMenu === "project"} 
                onToggle={() => toggleMenu("project")}
              >
                <Item 
                  href="/admin/project/workspaces" 
                  icon={<HiOutlineOfficeBuilding />} 
                  label="Workspaces" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/project/workspaces")}
                />
                <Item 
                  href="/admin/project/projects" 
                  icon={<HiOutlineCube />} 
                  label="Projects" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/project/projects")}
                />
                <Item 
                  href="/admin/project/tasks/board" 
                  icon={<HiPuzzle />} 
                  label="Tasks Board" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/project/tasks/board")}
                />
                <Item 
                  href="/admin/project/tasks" 
                  icon={<HiPuzzle />} 
                  label="Tasks List" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/project/tasks")}
                />
              </Section>

              <Section 
                title="HR" 
                icon={<HiUserGroup />} 
                isOpen={openMenu === "hr"} 
                onToggle={() => toggleMenu("hr")}
              >
                <Item 
                  href="/admin/hr/employee-onboarding" 
                  icon={<HiUserGroup />} 
                  label="Employee Onboarding" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/hr/employee-onboarding")}
                />
                <Item 
                  href="/admin/hr/Dashboard" 
                  icon={<HiUserGroup />} 
                  label="Employee Details" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/hr/Dashboard")}
                />
                <Item 
                  href="/admin/hr/masters" 
                  icon={<HiUserGroup />} 
                  label="Department" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/hr/masters")}
                />
                <Item 
                  href="/admin/hr/leaves" 
                  icon={<HiUserGroup />} 
                  label="Leave" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/hr/leaves")}
                />
                <Item 
                  href="/admin/hr/attendance" 
                  icon={<HiUserGroup />} 
                  label="Attendance" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/hr/attendance")}
                />
                <Item 
                  href="/admin/hr/payroll" 
                  icon={<HiUserGroup />} 
                  label="Payroll" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/hr/payroll")}
                />
                <Item 
                  href="/admin/hr/employees" 
                  icon={<HiUserGroup />} 
                  label="Employee" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/hr/employees")}
                />
                <Item 
                  href="/admin/hr/reports" 
                  icon={<HiUserGroup />} 
                  label="Reports" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/hr/reports")}
                />
                <Item 
                  href="/admin/hr/settings" 
                  icon={<HiCog />} 
                  label="Settings" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/hr/settings")}
                />
                <Item 
                  href="/admin/hr/holidays" 
                  icon={<HiGlobeAlt />} 
                  label="Holidays" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/hr/holidays")}
                />
                <Item 
                  href="/admin/hr/profile" 
                  icon={<HiUser />} 
                  label="Profile" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/hr/profile")}
                />
              </Section>

              <Section 
                title="PPC" 
                icon={<HiPuzzle />} 
                isOpen={openMenu === "ppc"} 
                onToggle={() => toggleMenu("ppc")}
              >
                <Item 
                  href="/admin/ppc/operatorsPage" 
                  icon={<HiUser />} 
                  label="Operators" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/ppc/operatorsPage")}
                />
                <Item 
                  href="/admin/ppc/machinesPage" 
                  icon={<HiOutlineCube />} 
                  label="Machines" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/ppc/machinesPage")}
                />
                <Item 
                  href="/admin/ppc/resourcesPage" 
                  icon={<HiOutlineLibrary />} 
                  label="Resources" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/ppc/resourcesPage")}
                />
                <Item 
                  href="/admin/ppc/machineOutputPage" 
                  icon={<HiOutlineLibrary />} 
                  label="Machine Outputs" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/ppc/machineOutputPage")}
                />
                <Item 
                  href="/admin/ppc/holidaysPage" 
                  icon={<HiGlobeAlt />} 
                  label="Holidays" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/ppc/holidaysPage")}
                />
                <Item 
                  href="/admin/ppc/operatorMachineMappingPage" 
                  icon={<HiPuzzle />} 
                  label="Machine-Operator Mapping" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/ppc/operatorMachineMappingPage")}
                />
                <Item 
                  href="/admin/ppc/operations" 
                  icon={<HiPuzzle />} 
                  label="Operations" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/ppc/operations")}
                />
                <Item 
                  href="/admin/ppc/productionOrderPage" 
                  icon={<HiReceiptTax />} 
                  label="Production Planning" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/ppc/productionOrderPage")}
                />
                <Item 
                  href="/admin/ppc/jobcards" 
                  icon={<HiReceiptTax />} 
                  label="Job Card" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/ppc/jobcards")}
                />
                <Item 
                  href="/admin/ppc/downtime" 
                  icon={<HiReceiptTax />} 
                  label="Downtime" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/ppc/downtime")}
                />
              </Section>

              <Section 
                title="Helpdesk" 
                icon={<HiUser />} 
                isOpen={openMenu === "helpdesk"} 
                onToggle={() => toggleMenu("helpdesk")}
              >
                <Item 
                  href="/admin/helpdesk/tickets" 
                  icon={<HiDocumentText />} 
                  label="Tickets" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/helpdesk/tickets")}
                />
                <Item 
                  href="/admin/helpdesk/agents" 
                  icon={<HiUsers />} 
                  label="Agents" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/helpdesk/agents")}
                />
                <Item 
                  href="/admin/helpdesk/categories" 
                  icon={<HiUserGroup />} 
                  label="Categories" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/helpdesk/categories")}
                />
                <Item 
                  href="/admin/helpdesk/agents/manage" 
                  icon={<HiPuzzle />} 
                  label="Create Agent" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/helpdesk/agents/manage")}
                />
                <Item 
                  href="/admin/helpdesk/settings" 
                  icon={<HiCog />} 
                  label="Settings" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/helpdesk/settings")}
                />
                <Item 
                  href="/admin/helpdesk/feedback" 
                  icon={<HiDocumentText />} 
                  label="Feedback" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/helpdesk/feedback")}
                />
                <Item 
                  href="/admin/helpdesk/feedback/analytics" 
                  icon={<HiChartSquareBar />} 
                  label="Feedback Analysis" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/helpdesk/feedback/analytics")}
                />
                <Item 
                  href="/admin/helpdesk/report" 
                  icon={<HiChartSquareBar />} 
                  label="Report" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/helpdesk/report")}
                />
              </Section>

              <Section 
                title="Reports" 
                icon={<HiDocumentReport />} 
                isOpen={openMenu === "reports"} 
                onToggle={() => toggleMenu("reports")}
              >
                <Item 
                  href="/admin/OrderPanel-Report" 
                  icon={<HiDocumentReport />} 
                  label="Order Panel Report" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/OrderPanel-Report")}
                />
                <Item 
                  href="/admin/vehiclenegotiation-Report" 
                  icon={<HiDocumentReport />} 
                  label="Vehicle Negotiation Report" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/vehiclenegotiation-Report")}
                />
                <Item 
                  href="/admin/Pricingpanel-Report" 
                  icon={<HiDocumentReport />} 
                  label="Pricing Panel Report" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/Pricingpanel-Report")}
                />
                <Item 
                  href="/admin/LoadingPanel-Report" 
                  icon={<HiDocumentReport />} 
                  label="Loading Panel Report" 
                  onClick={closeSidebar} 
                  isActive={isActive("/admin/LoadingPanel-Report")}
                />
              </Section>
            </>
          )}

          {/* ===== MODULE-BASED ACCESS (Normal Users) ===== */}
          {!hasFullAccess &&
            Object.entries(modules).map(([moduleName, data]) => {
              if (!data?.selected) return null;
              
              // Check if user has view permission for this module
              if (!canView(moduleName)) return null;

              // Rate Target belongs under Vehicle Negotiation when that parent module is available.
              if (moduleName === 'Rate Target (Vehicle Negotiation)' && canView('Vehicle Negotiation')) return null;

              return (
                <Section
                  key={moduleName}
                  title={moduleName}
                  icon={<HiOutlineCube />}
                  isOpen={openMenu === moduleName}
                  onToggle={() => toggleMenu(moduleName)}
                >
                  {/* Show all routes for this module */}
                  <Item
                    href={moduleName === 'Rate Target (Vehicle Negotiation)' ? '/admin/rate-target-vehicle-negotiation' : `/admin/${moduleName.toLowerCase().replace(/ /g, '-')}`}
                    icon={<HiViewGrid />}
                    label={moduleName}
                    onClick={closeSidebar}
                    isActive={isActive(moduleName === 'Rate Target (Vehicle Negotiation)' ? '/admin/rate-target-vehicle-negotiation' : `/admin/${moduleName.toLowerCase().replace(/ /g, '-')}`)}
                  />
                  {moduleName === 'Vehicle Negotiation' && canView('Rate Target (Vehicle Negotiation)') && (
                    <Item
                      href="/admin/rate-target-vehicle-negotiation"
                      icon={<HiCurrencyRupee />}
                      label="Rate Target"
                      onClick={closeSidebar}
                      isActive={isActive('/admin/rate-target-vehicle-negotiation')}
                    />
                  )}
                </Section>
              );
            })
          }

          <div className="p-4 mt-4 border-t border-gray-700">
            <LogoutButton />
          </div>
        </nav>
      </aside>

      {/* CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-50 w-full bg-black border-b border-gray-800 shadow-lg shrink-0">
          <div className="h-[env(safe-area-inset-top,24px)] w-full bg-black" />

          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
              >
                {isSidebarOpen ? <HiX size={24} /> : <HiMenu size={24} />}
              </button>

              <h1 className="text-sm md:text-base font-bold text-white truncate tracking-tight">
                {isCompany
                  ? "Company Administrator"
                  : isAdminUser
                  ? "Admin Dashboard"
                  : "Dashboard"}
              </h1>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden md:flex items-center gap-3 text-sm text-gray-300">
                <span>{session.name || session.email}</span>
              </div>
              {session.activeOperatingCompany && (
                <div
                  className="hidden sm:block rounded-lg border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold text-blue-100"
                  title="Data is limited to the company selected when you signed in. Sign out and select another company to switch."
                >
                  {session.activeOperatingCompany.name}
                </div>
              )}

              <div
                className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border-2 border-white/10 shadow-inner"
                title={session.email}
              >
                {session.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#f8fafc]">
          {children}
        </main>
      </div>
    </div>
  );
}
