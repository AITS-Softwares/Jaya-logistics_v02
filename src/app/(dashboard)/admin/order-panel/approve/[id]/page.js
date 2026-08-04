// "use client";

// import { useState, useEffect, useMemo } from "react";
// import { useRouter, useParams } from "next/navigation";

// /** =========================
//  * CONSTANTS
//  ========================= */
// const STATUS_OPTIONS = ["Open", "Hold", "Cancelled"];
// const PANEL_STATUS_OPTIONS = ["Draft", "Submitted", "Approved", "Completed", "Cancelled", "Rejected"];
// const ORDER_TYPES = ["Sales", "STO Order", "Export", "Import"];
// const DELIVERY_OPTIONS = ["Urgent", "Normal", "Express", "Scheduled"];

// function num(v) {
//   const n = Number(v);
//   return Number.isFinite(n) ? n : 0;
// }

// function formatDate(dateString) {
//   if (!dateString) return '-';
//   const date = new Date(dateString);
//   return date.toLocaleDateString('en-IN', {
//     day: '2-digit',
//     month: '2-digit',
//     year: 'numeric'
//   });
// }

// /* =======================
//   UI COMPONENTS
// ========================= */
// function Card({ title, right, children }) {
//   return (
//     <div className="rounded-2xl border border-slate-200 bg-white shadow-sm mb-4">
//       <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
//         <div className="text-sm font-extrabold text-slate-900">{title}</div>
//         {right || null}
//       </div>
//       <div className="p-4">{children}</div>
//     </div>
//   );
// }

// function InfoRow({ label, value, highlight = false }) {
//   return (
//     <div className="flex justify-between items-center py-2 border-b border-slate-100">
//       <span className="text-xs font-bold text-slate-600">{label}</span>
//       <span className={`text-sm ${highlight ? 'font-bold text-purple-800' : 'text-slate-800'}`}>
//         {value || '-'}
//       </span>
//     </div>
//   );
// }

// function Input({ label, value, col = "", type = "text", readOnly = true }) {
//   return (
//     <div className={col}>
//       <label className="text-xs font-bold text-slate-600">{label}</label>
//       <input
//         type={type}
//         value={value || ""}
//         readOnly={readOnly}
//         className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ${
//           readOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200'
//         }`}
//       />
//     </div>
//   );
// }

// function EditableSelect({ label, value, onChange, options = [], col = "" }) {
//   return (
//     <div className={col}>
//       <label className="text-xs font-bold text-slate-600">{label}</label>
//       <select
//         value={value || ""}
//         onChange={(e) => onChange?.(e.target.value)}
//         className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
//       >
//         <option value="">Select {label}</option>
//         {options.map((o) => (
//           <option key={o} value={o}>{o}</option>
//         ))}
//       </select>
//     </div>
//   );
// }

// function EditableInput({ label, value, onChange, col = "", type = "text", placeholder = "" }) {
//   return (
//     <div className={col}>
//       <label className="text-xs font-bold text-slate-600">{label}</label>
//       <input
//         type={type}
//         value={value || ""}
//         onChange={(e) => onChange?.(e.target.value)}
//         placeholder={placeholder}
//         className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
//       />
//     </div>
//   );
// }

// /* =======================
//   ORDERS TABLE (READ-ONLY with fromState and Local/Not Local)
// ========================= */
// function OrdersTable({ rows }) {
//   const columns = [
//     { key: "orderNo", label: "Order No" },
//     { key: "partyName", label: "Party Name" },
//     { key: "plantName", label: "Plant" },
//     { key: "orderType", label: "Order Type" },
//     { key: "pinCode", label: "Pin Code" },
//     { key: "taluka", label: "Taluka" },
//     { key: "district", label: "District" },
//     { key: "state", label: "State" },
//     { key: "fromState", label: "From State" },
//     { key: "localStatus", label: "Local/Not Local" },
//     { key: "country", label: "Country" },
//     { key: "from", label: "From" },
//     { key: "to", label: "To" },
//     { key: "locationRate", label: "Location Rate" },
//     { key: "weight", label: "Weight (MT)" },
//     { key: "rate", label: "Rate (₹)" },
//     { key: "totalAmount", label: "Total Amount" },
//     { key: "collectionCharges", label: "Collection Charges" },
//     { key: "cancellationCharges", label: "Cancellation Charges" },
//     { key: "loadingCharges", label: "Loading Charges" },
//     { key: "otherCharges", label: "Other Charges" },
//   ];

//   const renderLocalStatus = (row) => {
//     if (row.fromState && row.state) {
//       const isLocal = row.fromState.trim().toUpperCase() === row.state.trim().toUpperCase();
//       return (
//         <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
//           isLocal ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
//         }`}>
//           {isLocal ? '✅ Local' : '❌ Not Local'}
//         </span>
//       );
//     }
//     return <span className="text-xs text-gray-400">-</span>;
//   };

//   return (
//     <div className="overflow-auto rounded-xl border border-yellow-300 max-h-[500px]">
//       <table className="min-w-max w-full text-sm">
//         <thead className="sticky top-0 bg-yellow-400 z-10">
//           <tr>
//             {columns.map((col) => (
//               <th
//                 key={col.key}
//                 className="border border-yellow-500 px-3 py-3 text-xs font-extrabold text-slate-900 text-center min-w-[100px]"
//               >
//                 {col.label}
//               </th>
//             ))}
//           </tr>
//         </thead>
//         <tbody>
//           {rows.length > 0 ? (
//             rows.map((row, index) => (
//               <tr key={row._id || index} className="hover:bg-yellow-50 even:bg-slate-50">
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.orderNo || '-'}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.partyName || '-'}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.plantName || '-'}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.orderType || '-'}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.pinCode || '-'}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.taluka || '-'}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.district || '-'}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.state || '-'}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.fromState || '-'}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-center">{renderLocalStatus(row)}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.country || '-'}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.from || '-'}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.to || '-'}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.locationRate || '-'}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.weight || '0'}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">₹{num(row.rate).toLocaleString()}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right font-medium">₹{num(row.totalAmount).toLocaleString()}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">₹{num(row.collectionCharges).toLocaleString()}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.cancellationCharges || '-'}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.loadingCharges || '-'}</td>
//                 <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">₹{num(row.otherCharges).toLocaleString()}</td>
//               </tr>
//             ))
//           ) : (
//             <tr>
//               <td colSpan={columns.length} className="border border-yellow-300 px-4 py-8 text-center text-slate-400">
//                 No orders added.
//               </td>
//             </tr>
//           )}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// /* =======================
//   PACK DATA TABLES (READ-ONLY)
// ========================= */
// function PalletizationTable({ rows }) {
//   if (!rows || rows.length === 0) {
//     return <div className="text-center py-4 text-slate-400">No palletization data available</div>;
//   }

//   return (
//     <div className="overflow-auto rounded-xl border border-yellow-300">
//       <table className="min-w-full w-full text-sm">
//         <thead className="sticky top-0 bg-yellow-400">
//           <tr>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">NO OF PALLETS</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">UNIT PER PALLETS</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">TOTAL PKGS</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">PKG TYPE</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">UOM</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">SKU - SIZE</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">PACK - WEIGHT</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">PRODUCT NAME</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">ACTUAL - WT</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">CHARGED - WT</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">WT UOM</th>
//           </tr>
//         </thead>
//         <tbody>
//           {rows.map((row, index) => (
//             <tr key={row._id || index} className="hover:bg-yellow-50 even:bg-slate-50">
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.noOfPallets || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.unitPerPallets || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.totalPkgs || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.pkgsType || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.uom || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.skuSize || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.packWeight || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.productName || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.actualWt || '0'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.chargedWt || '0'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.wtUom || 'MT'}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// function UniformTable({ rows }) {
//   if (!rows || rows.length === 0) {
//     return <div className="text-center py-4 text-slate-400">No uniform data available</div>;
//   }

//   return (
//     <div className="overflow-auto rounded-xl border border-yellow-300">
//       <table className="min-w-full w-full text-sm">
//         <thead className="sticky top-0 bg-yellow-400">
//           <tr>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">TOTAL PKGS</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">PKG TYPE</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">UOM</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">SKU - SIZE</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">PACK - WEIGHT</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">PRODUCT NAME</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">ACTUAL - WT</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">CHARGED - WT</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">WT UOM</th>
//           </tr>
//         </thead>
//         <tbody>
//           {rows.map((row, index) => (
//             <tr key={row._id || index} className="hover:bg-yellow-50 even:bg-slate-50">
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.totalPkgs || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.pkgsType || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.uom || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.skuSize || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.packWeight || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.productName || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.actualWt || '0'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.chargedWt || '0'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.wtUom || 'MT'}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// function LooseCargoTable({ rows }) {
//   if (!rows || rows.length === 0) {
//     return <div className="text-center py-4 text-slate-400">No loose cargo data available</div>;
//   }

//   return (
//     <div className="overflow-auto rounded-xl border border-yellow-300">
//       <table className="min-w-full w-full text-sm">
//         <thead className="sticky top-0 bg-yellow-400">
//           <tr>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">UOM</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">PRODUCT NAME</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">ACTUAL - WT</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">CHARGED - WT</th>
//           </tr>
//         </thead>
//         <tbody>
//           {rows.map((row, index) => (
//             <tr key={row._id || index} className="hover:bg-yellow-50 even:bg-slate-50">
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.uom || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.productName || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.actualWt || '0'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.chargedWt || '0'}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// function NonUniformTable({ rows }) {
//   if (!rows || rows.length === 0) {
//     return <div className="text-center py-4 text-slate-400">No non-uniform cargo data available</div>;
//   }

//   return (
//     <div className="overflow-auto rounded-xl border border-yellow-300">
//       <table className="min-w-full w-full text-sm">
//         <thead className="sticky top-0 bg-yellow-400">
//           <tr>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">NOS</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">PRODUCT NAME</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">UOM</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">LENGTH</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">WIDTH</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">HEIGHT</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">ACTUAL - WT</th>
//             <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">CHARGED - WT</th>
//           </tr>
//         </thead>
//         <tbody>
//           {rows.map((row, index) => (
//             <tr key={row._id || index} className="hover:bg-yellow-50 even:bg-slate-50">
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.nos || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.productName || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.uom || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.length || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.width || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.height || '-'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.actualWt || '0'}</td>
//               <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.chargedWt || '0'}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// /* =======================
//   MAIN APPROVE PAGE
// ========================= */
// export default function ApproveOrderPanel() {
//   const router = useRouter();
//   const params = useParams();
//   const orderId = params.id;

//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState(null);

//   // State for all data (READ-ONLY)
//   const [orderPanel, setOrderPanel] = useState(null);
//   const [header, setHeader] = useState({});
//   const [plantRows, setPlantRows] = useState([]);
//   const [packData, setPackData] = useState({
//     PALLETIZATION: [],
//     'UNIFORM - BAGS/BOXES': [],
//     'LOOSE - CARGO': [],
//     'NON-UNIFORM - GENERAL CARGO': []
//   });

//   // EDITABLE: Approval State
//   const [approval, setApproval] = useState({
//     status: "",
//     remarks: "",
//   });

//   // Fetch order data
//   useEffect(() => {
//     if (orderId) {
//       fetchOrderData();
//     }
//   }, [orderId]);

//   const fetchOrderData = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem('token');
      
//       const res = await fetch(`/api/order-panel?id=${orderId}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
      
//       if (!res.ok) {
//         throw new Error(`HTTP error! status: ${res.status}`);
//       }
      
//       const data = await res.json();
      
//       if (!data.success) {
//         throw new Error(data.message || 'Failed to fetch order');
//       }

//       const order = data.data;
//       console.log("📦 Order Data for Approval:", order);
      
//       setOrderPanel(order);
      
//       // Set header data (READ-ONLY)
//       setHeader({
//         orderPanelNo: order.orderPanelNo || "",
//         branchName: order.branchName || "",
//         branchCode: order.branchCode || "",
//         date: order.date ? new Date(order.date).toISOString().split('T')[0] : "",
//         delivery: order.delivery || "Normal",
//         customerName: order.customerName || "",
//         partyName: order.partyName || "",
//         customerCode: order.customerCode || "",
//         contactPerson: order.contactPerson || "",
//         collectionCharges: order.collectionCharges || 0,
//         cancellationCharges: order.cancellationCharges || "Nil",
//         loadingCharges: order.loadingCharges || "Nil",
//         otherCharges: order.otherCharges || 0,
//         panelStatus: order.panelStatus || "Draft",
//         totalWeight: order.totalWeight || 0,
//         totalAmount: order.totalAmount || 0,
//       });

//       // Set plant rows (READ-ONLY) - preserve fromState
//       if (order.plantRows && order.plantRows.length > 0) {
//         const processedRows = order.plantRows.map(row => ({
//           ...row,
//           orderNo: row.orderNo || header.orderPanelNo || 'N/A',
//           fromState: row.fromState || '',
//           localStatus: row.localStatus || 'unknown',
//           localStatusLabel: row.localStatusLabel || 'Unknown'
//         }));
//         setPlantRows(processedRows);
//       }

//       // Set pack data (READ-ONLY)
//       if (order.packData) {
//         setPackData({
//           PALLETIZATION: order.packData.PALLETIZATION || [],
//           'UNIFORM - BAGS/BOXES': order.packData['UNIFORM - BAGS/BOXES'] || [],
//           'LOOSE - CARGO': order.packData['LOOSE - CARGO'] || [],
//           'NON-UNIFORM - GENERAL CARGO': order.packData['NON-UNIFORM - GENERAL CARGO'] || [],
//         });
//       }

//       // Set approval
//       if (order.approval) {
//         setApproval({
//           status: order.approval.status || order.panelStatus || "",
//           remarks: order.approval.remarks || "",
//         });
//       } else {
//         setApproval({
//           status: order.panelStatus || "",
//           remarks: "",
//         });
//       }

//     } catch (error) {
//       console.error('Error fetching order:', error);
//       setError(error.message);
//       alert(`❌ Failed to load order: ${error.message}`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleApprove = async () => {
//     if (!approval.status) {
//       alert("Please select approval status");
//       return;
//     }

//     setSaving(true);
//     try {
//       const token = localStorage.getItem('token');
      
//       const res = await fetch('/api/order-panel', {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({
//           id: orderId,
//           panelStatus: approval.status,
//           approvalRemarks: approval.remarks,
//           approvedBy: 'Approver', // This would come from the user context
//           approvedAt: new Date().toISOString()
//         }),
//       });

//       const data = await res.json();

//       if (data.success) {
//         alert(`✅ Order ${approval.status} successfully!`);
//         router.push('/admin/order-panel');
//       } else {
//         alert(data.message || 'Failed to update approval');
//       }
//     } catch (error) {
//       console.error('Error updating approval:', error);
//       alert(`❌ Error: ${error.message}`);
//     } finally {
//       setSaving(false);
//     }
//   };

//   // Calculate totals
//   const totalWeight = useMemo(() => {
//     return plantRows.reduce((sum, row) => sum + num(row.weight), 0);
//   }, [plantRows]);

//   const totalAmount = useMemo(() => {
//     return plantRows.reduce((sum, row) => sum + num(row.totalAmount), 0);
//   }, [plantRows]);

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
//           <p className="mt-4 text-slate-600">Loading order data...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
//       {/* Sticky Top Bar */}
//       <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
//         <div className="mx-auto max-w-full px-4 py-3 flex items-center justify-between">
//           <div>
//             <div className="flex items-center gap-3">
//               <button
//                 onClick={() => router.push('/admin/order-panel')}
//                 className="text-yellow-600 hover:text-yellow-800 font-medium text-sm flex items-center gap-1"
//               >
//                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
//                 </svg>
//                 Back to List
//               </button>
//               <div className="text-lg font-extrabold text-slate-900">
//                 Approve Order: {header.orderPanelNo}
//               </div>
//             </div>
//             <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
//               <span>Party: {header.partyName || header.customerName}</span>
//               {header.panelStatus && (
//                 <>
//                   <span>|</span>
//                   <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
//                     Current: {header.panelStatus}
//                   </span>
//                 </>
//               )}
//             </div>
//           </div>

//           <div className="flex items-center gap-3">
//             <button
//               onClick={handleApprove}
//               disabled={saving}
//               className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition ${
//                 saving 
//                   ? 'bg-gray-400 cursor-not-allowed' 
//                   : 'bg-yellow-600 hover:bg-yellow-700'
//               }`}
//             >
//               {saving ? (
//                 <span className="flex items-center gap-2">
//                   <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                   </svg>
//                   Submitting...
//                 </span>
//               ) : 'Submit Approval'}
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="mx-auto max-w-full p-4">
        
//         {/* Header Information */}
//         <Card title="Order Information (Read Only)">
//           <div className="grid grid-cols-12 gap-3">
//             <Input col="col-span-12 md:col-span-2" label="Order No" value={header.orderPanelNo} readOnly={true} />
//             <Input col="col-span-12 md:col-span-2" label="Branch" value={header.branchName} readOnly={true} />
//             <Input col="col-span-12 md:col-span-2" label="Branch Code" value={header.branchCode} readOnly={true} />
//             <Input col="col-span-12 md:col-span-2" label="Date" value={formatDate(header.date)} readOnly={true} />
//             <Input col="col-span-12 md:col-span-2" label="Delivery" value={header.delivery} readOnly={true} />
//             <Input col="col-span-12 md:col-span-2" label="Status" value={header.panelStatus} readOnly={true} />
//           </div>
//         </Card>

//         {/* Customer Information */}
//         <Card title="Customer Information (Read Only)">
//           <div className="grid grid-cols-12 gap-3">
//             <Input col="col-span-12 md:col-span-3" label="Customer Name" value={header.customerName} readOnly={true} />
//             <Input col="col-span-12 md:col-span-3" label="Party Name" value={header.partyName} readOnly={true} />
//             <Input col="col-span-12 md:col-span-3" label="Customer Code" value={header.customerCode} readOnly={true} />
//             <Input col="col-span-12 md:col-span-3" label="Contact Person" value={header.contactPerson} readOnly={true} />
//           </div>
//         </Card>

//         {/* Charges */}
//         <Card title="Charges (Read Only)">
//           <div className="grid grid-cols-12 gap-3">
//             <Input col="col-span-12 md:col-span-3" label="Collection Charges" value={`₹${num(header.collectionCharges).toLocaleString()}`} readOnly={true} />
//             <Input col="col-span-12 md:col-span-3" label="Cancellation Charges" value={header.cancellationCharges} readOnly={true} />
//             <Input col="col-span-12 md:col-span-3" label="Loading Charges" value={header.loadingCharges} readOnly={true} />
//             <Input col="col-span-12 md:col-span-3" label="Other Charges" value={`₹${num(header.otherCharges).toLocaleString()}`} readOnly={true} />
//           </div>
//         </Card>

//         {/* Orders Table - with fromState and Local/Not Local */}
//         <Card title="Order Details (Read Only)">
//           <OrdersTable rows={plantRows} />
//           <div className="flex justify-end gap-4 mt-4">
//             <div className="flex items-center gap-3 border border-yellow-300 px-6 py-3 bg-yellow-50 rounded-xl">
//               <div className="text-sm font-extrabold text-slate-900">Total Weight:</div>
//               <div className="text-xl font-extrabold text-emerald-700">{totalWeight} kg</div>
//             </div>
//             <div className="flex items-center gap-3 border border-yellow-300 px-6 py-3 bg-yellow-50 rounded-xl">
//               <div className="text-sm font-extrabold text-slate-900">Total Amount:</div>
//               <div className="text-xl font-extrabold text-purple-700">₹{totalAmount.toLocaleString()}</div>
//             </div>
//           </div>
//         </Card>

//         {/* Pack Data - All Types */}
//         <Card title="Pack Data (Read Only)">
//           {/* Palletization */}
//           {packData.PALLETIZATION.length > 0 && (
//             <div className="mb-6">
//               <h3 className="text-sm font-bold text-slate-800 mb-2 bg-yellow-100 inline-block px-3 py-1 rounded-full">Palletization</h3>
//               <PalletizationTable rows={packData.PALLETIZATION} />
//             </div>
//           )}

//           {/* Uniform */}
//           {packData['UNIFORM - BAGS/BOXES'].length > 0 && (
//             <div className="mb-6">
//               <h3 className="text-sm font-bold text-slate-800 mb-2 bg-yellow-100 inline-block px-3 py-1 rounded-full">Uniform - Bags/Boxes</h3>
//               <UniformTable rows={packData['UNIFORM - BAGS/BOXES']} />
//             </div>
//           )}

//           {/* Loose Cargo */}
//           {packData['LOOSE - CARGO'].length > 0 && (
//             <div className="mb-6">
//               <h3 className="text-sm font-bold text-slate-800 mb-2 bg-yellow-100 inline-block px-3 py-1 rounded-full">Loose - Cargo</h3>
//               <LooseCargoTable rows={packData['LOOSE - CARGO']} />
//             </div>
//           )}

//           {/* Non-Uniform */}
//           {packData['NON-UNIFORM - GENERAL CARGO'].length > 0 && (
//             <div className="mb-6">
//               <h3 className="text-sm font-bold text-slate-800 mb-2 bg-yellow-100 inline-block px-3 py-1 rounded-full">Non-uniform - General Cargo</h3>
//               <NonUniformTable rows={packData['NON-UNIFORM - GENERAL CARGO']} />
//             </div>
//           )}

//           {packData.PALLETIZATION.length === 0 && 
//            packData['UNIFORM - BAGS/BOXES'].length === 0 && 
//            packData['LOOSE - CARGO'].length === 0 && 
//            packData['NON-UNIFORM - GENERAL CARGO'].length === 0 && (
//             <div className="text-center py-8 text-slate-400">No pack data available</div>
//           )}
//         </Card>

//         {/* Approval Section - EDITABLE */}
//         <Card title="Approval / Rejection (Editable)">
//           <div className="grid grid-cols-12 gap-4">
//             <div className="col-span-12 md:col-span-6">
//               <div className="bg-white p-4 rounded-xl border border-yellow-200">
//                 <h3 className="text-sm font-bold text-slate-800 mb-3">Approval Status</h3>
//                 <div className="space-y-4">
//                   <div>
//                     <label className="text-xs font-bold text-slate-600">Approval Status *</label>
//                     <select
//                       value={approval.status}
//                       onChange={(e) => setApproval({ ...approval, status: e.target.value })}
//                       className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
//                     >
//                       <option value="">Select Approval Status</option>
//                       {PANEL_STATUS_OPTIONS.map((opt) => (
//                         <option key={opt} value={opt}>{opt}</option>
//                       ))}
//                     </select>
//                   </div>
                  
//                   <div>
//                     <label className="text-xs font-bold text-slate-600">Remarks</label>
//                     <textarea
//                       value={approval.remarks}
//                       onChange={(e) => setApproval({ ...approval, remarks: e.target.value })}
//                       rows={4}
//                       className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
//                       placeholder="Enter approval remarks..."
//                     />
//                   </div>

//                   {/* Current Status Display */}
//                   {approval.status && (
//                     <div className="mt-3 p-3 rounded-lg border" style={{
//                       backgroundColor: approval.status === 'Approved' ? '#f0fdf4' : 
//                                      approval.status === 'Rejected' ? '#fef2f2' :
//                                      approval.status === 'Completed' ? '#eff6ff' :
//                                      approval.status === 'Cancelled' ? '#fef3c7' :
//                                      approval.status === 'Draft' ? '#f3f4f6' : '#fefce8',
//                       borderColor: approval.status === 'Approved' ? '#86efac' : 
//                                    approval.status === 'Rejected' ? '#fca5a5' :
//                                    approval.status === 'Completed' ? '#93c5fd' :
//                                    approval.status === 'Cancelled' ? '#fcd34d' :
//                                    approval.status === 'Draft' ? '#d1d5db' : '#fde047'
//                     }}>
//                       <p className="text-sm font-medium">
//                         Selected Status: <span className={`
//                           ${approval.status === 'Approved' ? 'text-green-700' : 
//                             approval.status === 'Rejected' ? 'text-red-700' :
//                             approval.status === 'Completed' ? 'text-blue-700' :
//                             approval.status === 'Cancelled' ? 'text-yellow-700' :
//                             approval.status === 'Draft' ? 'text-gray-700' : 'text-yellow-700'}
//                         `}>
//                           {approval.status}
//                         </span>
//                       </p>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div className="col-span-12 md:col-span-6">
//               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
//                 <h3 className="text-sm font-bold text-slate-800 mb-3">Approval Instructions</h3>
//                 <div className="space-y-3">
//                   <div className="flex items-start gap-2">
//                     <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center mt-0.5">
//                       <span className="text-yellow-600 text-xs font-bold">1</span>
//                     </div>
//                     <p className="text-sm text-slate-600">Select approval status from the dropdown</p>
//                   </div>
//                   <div className="flex items-start gap-2">
//                     <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center mt-0.5">
//                       <span className="text-yellow-600 text-xs font-bold">2</span>
//                     </div>
//                     <p className="text-sm text-slate-600">Add any relevant remarks or comments</p>
//                   </div>
//                   <div className="flex items-start gap-2">
//                     <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center mt-0.5">
//                       <span className="text-yellow-600 text-xs font-bold">3</span>
//                     </div>
//                     <p className="text-sm text-slate-600">Click "Submit Approval" to finalize the decision</p>
//                   </div>

//                   {/* Status Descriptions */}
//                   <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200">
//                     <p className="text-xs font-bold text-slate-700 mb-2">Status Descriptions:</p>
//                     <div className="space-y-1 text-xs">
//                       <div className="flex items-center gap-2">
//                         <span className="w-2 h-2 rounded-full bg-green-500"></span>
//                         <span className="text-slate-600"><strong>Approved:</strong> Order is fully approved</span>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <span className="w-2 h-2 rounded-full bg-red-500"></span>
//                         <span className="text-slate-600"><strong>Rejected:</strong> Order is rejected</span>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <span className="w-2 h-2 rounded-full bg-blue-500"></span>
//                         <span className="text-slate-600"><strong>Completed:</strong> Order is completed</span>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
//                         <span className="text-slate-600"><strong>Draft:</strong> Order is in draft state</span>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <span className="w-2 h-2 rounded-full bg-orange-500"></span>
//                         <span className="text-slate-600"><strong>Submitted:</strong> Order is submitted for approval</span>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <span className="w-2 h-2 rounded-full bg-gray-500"></span>
//                         <span className="text-slate-600"><strong>Cancelled:</strong> Order is cancelled</span>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
//                     <p className="text-xs text-yellow-800">
//                       <span className="font-bold">Note:</span> Once approved, the order will be finalized and cannot be edited.
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </Card>

//         {/* Summary Card */}
//         <Card title="Order Summary">
//           <div className="grid grid-cols-12 gap-4">
//             <div className="col-span-12 md:col-span-4">
//               <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
//                 <h3 className="text-sm font-bold text-slate-800 mb-3">Order Summary</h3>
//                 <div className="space-y-2">
//                   <InfoRow label="Order No" value={header.orderPanelNo} />
//                   <InfoRow label="Party Name" value={header.partyName || header.customerName} />
//                   <InfoRow label="Total Orders" value={plantRows.length} />
//                 </div>
//               </div>
//             </div>

//             <div className="col-span-12 md:col-span-4">
//               <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
//                 <h3 className="text-sm font-bold text-slate-800 mb-3">Weight Summary</h3>
//                 <div className="space-y-2">
//                   <InfoRow label="Total Weight" value={`${totalWeight} kg`} />
//                   <InfoRow label="Total Amount" value={`₹${totalAmount.toLocaleString()}`} />
//                 </div>
//               </div>
//             </div>

//             <div className="col-span-12 md:col-span-4">
//               <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
//                 <h3 className="text-sm font-bold text-slate-800 mb-3">Status</h3>
//                 <div className="space-y-2">
//                   <div className="flex justify-between">
//                     <span className="text-sm text-slate-600">Current Status:</span>
//                     <span className={`px-2 py-1 rounded-full text-xs font-medium ${
//                       header.panelStatus === 'Approved' ? 'bg-green-100 text-green-800' :
//                       header.panelStatus === 'Rejected' ? 'bg-red-100 text-red-800' :
//                       header.panelStatus === 'Completed' ? 'bg-blue-100 text-blue-800' :
//                       header.panelStatus === 'Cancelled' ? 'bg-gray-100 text-gray-800' :
//                       header.panelStatus === 'Draft' ? 'bg-slate-100 text-slate-800' :
//                       'bg-yellow-100 text-yellow-800'
//                     }`}>
//                       {header.panelStatus || 'Draft'}
//                     </span>
//                   </div>
//                   <InfoRow label="Delivery Type" value={header.delivery} />
//                 </div>
//               </div>
//             </div>
//           </div>
//         </Card>
//       </div>
//     </div>
//   );
// }

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";

/** =========================
 * CONSTANTS
 ========================= */
const STATUS_OPTIONS = ["Open", "Hold", "Cancelled"];
const PANEL_STATUS_OPTIONS = ["Draft", "Submitted", "Approved", "Completed", "Cancelled", "Rejected"];
const ORDER_TYPES = ["Sales", "STO Order", "Export", "Import"];
const DELIVERY_OPTIONS = ["Urgent", "Normal", "Express", "Scheduled"];

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/* =======================
  UI COMPONENTS
========================= */
function Card({ title, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm mb-4">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="text-sm font-extrabold text-slate-900">{title}</div>
        {right || null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, highlight = false }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <span className={`text-sm ${highlight ? 'font-bold text-purple-800' : 'text-slate-800'}`}>
        {value || '-'}
      </span>
    </div>
  );
}

function Input({ label, value, col = "", type = "text", readOnly = true }) {
  return (
    <div className={col}>
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <input
        type={type}
        value={value || ""}
        readOnly={readOnly}
        className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ${
          readOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200'
        }`}
      />
    </div>
  );
}

function EditableSelect({ label, value, onChange, options = [], col = "" }) {
  return (
    <div className={col}>
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <select
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
      >
        <option value="">Select {label}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function EditableInput({ label, value, onChange, col = "", type = "text", placeholder = "" }) {
  return (
    <div className={col}>
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
      />
    </div>
  );
}

/* =======================
  ORDERS TABLE (READ-ONLY with fromState and Local/Not Local)
========================= */
function OrdersTable({ rows }) {
  const columns = [
    { key: "orderNo", label: "Order No" },
    { key: "partyName", label: "Party Name" },
    { key: "plantName", label: "Plant" },
    { key: "orderType", label: "Order Type" },
    { key: "pinCode", label: "Pin Code" },
    { key: "taluka", label: "Taluka" },
    { key: "district", label: "District" },
    { key: "state", label: "State" },
    { key: "fromState", label: "From State" },
    { key: "localStatus", label: "Local/Not Local" },
    { key: "country", label: "Country" },
    { key: "from", label: "From" },
    { key: "to", label: "To" },
    { key: "locationRate", label: "Location Rate" },
    { key: "weight", label: "Weight (MT)" },
    { key: "rate", label: "Rate (₹)" },
    { key: "totalAmount", label: "Total Amount" },
    { key: "collectionCharges", label: "Collection Charges" },
    { key: "cancellationCharges", label: "Cancellation Charges" },
    { key: "loadingCharges", label: "Loading Charges" },
    { key: "otherCharges", label: "Other Charges" },
  ];

  const renderLocalStatus = (row) => {
    if (row.fromState && row.state) {
      const isLocal = row.fromState.trim().toUpperCase() === row.state.trim().toUpperCase();
      return (
        <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
          isLocal ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {isLocal ? '✅ Local' : '❌ Not Local'}
        </span>
      );
    }
    return <span className="text-xs text-gray-400">-</span>;
  };

  return (
    <div className="overflow-auto rounded-xl border border-yellow-300 max-h-[500px]">
      <table className="min-w-max w-full text-sm">
        <thead className="sticky top-0 bg-yellow-400 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="border border-yellow-500 px-3 py-3 text-xs font-extrabold text-slate-900 text-center min-w-[100px]"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, index) => (
              <tr key={row._id || index} className="hover:bg-yellow-50 even:bg-slate-50">
                <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.orderNo || '-'}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.partyName || '-'}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.plantName || '-'}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.orderType || '-'}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.pinCode || '-'}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.taluka || '-'}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.district || '-'}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.state || '-'}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.fromState || '-'}</td>
                <td className="border border-yellow-300 px-2 py-2 text-center">{renderLocalStatus(row)}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.country || '-'}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.from || '-'}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.to || '-'}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.locationRate || '-'}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.weight || '0'}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">₹{num(row.rate).toLocaleString()}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right font-medium">₹{num(row.totalAmount).toLocaleString()}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">₹{num(row.collectionCharges).toLocaleString()}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.cancellationCharges || '-'}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.loadingCharges || '-'}</td>
                <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">₹{num(row.otherCharges).toLocaleString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="border border-yellow-300 px-4 py-8 text-center text-slate-400">
                No orders added.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* =======================
  PACK DATA TABLES (READ-ONLY)
========================= */
function PalletizationTable({ rows }) {
  if (!rows || rows.length === 0) {
    return <div className="text-center py-4 text-slate-400">No palletization data available</div>;
  }

  return (
    <div className="overflow-auto rounded-xl border border-yellow-300">
      <table className="min-w-full w-full text-sm">
        <thead className="sticky top-0 bg-yellow-400">
          <tr>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">NO OF PALLETS</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">UNIT PER PALLETS</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">TOTAL PKGS</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">PKG TYPE</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">UOM</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">SKU - SIZE</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">PACK - WEIGHT</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">PRODUCT NAME</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">ACTUAL - WT</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">CHARGED - WT</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">WT UOM</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row._id || index} className="hover:bg-yellow-50 even:bg-slate-50">
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.noOfPallets || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.unitPerPallets || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.totalPkgs || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.pkgsType || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.uom || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.skuSize || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.packWeight || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.productName || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.actualWt || '0'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.chargedWt || '0'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.wtUom || 'MT'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UniformTable({ rows }) {
  if (!rows || rows.length === 0) {
    return <div className="text-center py-4 text-slate-400">No uniform data available</div>;
  }

  return (
    <div className="overflow-auto rounded-xl border border-yellow-300">
      <table className="min-w-full w-full text-sm">
        <thead className="sticky top-0 bg-yellow-400">
          <tr>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">TOTAL PKGS</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">PKG TYPE</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">UOM</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">SKU - SIZE</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">PACK - WEIGHT</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">PRODUCT NAME</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">ACTUAL - WT</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">CHARGED - WT</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">WT UOM</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row._id || index} className="hover:bg-yellow-50 even:bg-slate-50">
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.totalPkgs || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.pkgsType || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.uom || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.skuSize || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.packWeight || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.productName || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.actualWt || '0'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.chargedWt || '0'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.wtUom || 'MT'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LooseCargoTable({ rows }) {
  if (!rows || rows.length === 0) {
    return <div className="text-center py-4 text-slate-400">No loose cargo data available</div>;
  }

  return (
    <div className="overflow-auto rounded-xl border border-yellow-300">
      <table className="min-w-full w-full text-sm">
        <thead className="sticky top-0 bg-yellow-400">
          <tr>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">UOM</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">PRODUCT NAME</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">ACTUAL - WT</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">CHARGED - WT</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row._id || index} className="hover:bg-yellow-50 even:bg-slate-50">
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.uom || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.productName || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.actualWt || '0'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.chargedWt || '0'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NonUniformTable({ rows }) {
  if (!rows || rows.length === 0) {
    return <div className="text-center py-4 text-slate-400">No non-uniform cargo data available</div>;
  }

  return (
    <div className="overflow-auto rounded-xl border border-yellow-300">
      <table className="min-w-full w-full text-sm">
        <thead className="sticky top-0 bg-yellow-400">
          <tr>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">NOS</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">PRODUCT NAME</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">UOM</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">LENGTH</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">WIDTH</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">HEIGHT</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">ACTUAL - WT</th>
            <th className="border border-yellow-500 px-2 py-3 text-xs font-extrabold">CHARGED - WT</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row._id || index} className="hover:bg-yellow-50 even:bg-slate-50">
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.nos || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700">{row.productName || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.uom || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.length || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.width || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-center">{row.height || '-'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.actualWt || '0'}</td>
              <td className="border border-yellow-300 px-2 py-2 text-slate-700 text-right">{row.chargedWt || '0'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =======================
  MAIN APPROVE PAGE
========================= */
export default function ApproveOrderPanel() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // State for all data (READ-ONLY)
  const [orderPanel, setOrderPanel] = useState(null);
  const [header, setHeader] = useState({});
  const [plantRows, setPlantRows] = useState([]);
  const [packData, setPackData] = useState({
    PALLETIZATION: [],
    'UNIFORM - BAGS/BOXES': [],
    'LOOSE - CARGO': [],
    'NON-UNIFORM - GENERAL CARGO': []
  });

  // EDITABLE: Approval State
  const [approval, setApproval] = useState({
    status: "",
    remarks: "",
  });

  // Fetch order data
  useEffect(() => {
    if (orderId) {
      fetchOrderData();
    }
  }, [orderId]);

  const fetchOrderData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`/api/order-panel?id=${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch order');
      }

      const order = data.data;
      console.log("📦 Order Data for Approval:", order);
      
      setOrderPanel(order);
      
      // Set header data (READ-ONLY)
      setHeader({
        orderPanelNo: order.orderPanelNo || "",
        branchName: order.branchName || "",
        branchCode: order.branchCode || "",
        date: order.date ? new Date(order.date).toISOString().split('T')[0] : "",
        delivery: order.delivery || "Normal",
        customerName: order.customerName || "",
        partyName: order.partyName || "",
        customerCode: order.customerCode || "",
        contactPerson: order.contactPerson || "",
        collectionCharges: order.collectionCharges || 0,
        cancellationCharges: order.cancellationCharges || "Nil",
        loadingCharges: order.loadingCharges || "Nil",
        otherCharges: order.otherCharges || 0,
        panelStatus: order.panelStatus || "Draft",
        totalWeight: order.totalWeight || 0,
        totalAmount: order.totalAmount || 0,
      });

      // Set plant rows (READ-ONLY) - preserve fromState
      if (order.plantRows && order.plantRows.length > 0) {
        const processedRows = order.plantRows.map(row => ({
          ...row,
          orderNo: row.orderNo || header.orderPanelNo || 'N/A',
          fromState: row.fromState || '',
          localStatus: row.localStatus || 'unknown',
          localStatusLabel: row.localStatusLabel || 'Unknown'
        }));
        setPlantRows(processedRows);
      }

      // Set pack data (READ-ONLY)
      if (order.packData) {
        setPackData({
          PALLETIZATION: order.packData.PALLETIZATION || [],
          'UNIFORM - BAGS/BOXES': order.packData['UNIFORM - BAGS/BOXES'] || [],
          'LOOSE - CARGO': order.packData['LOOSE - CARGO'] || [],
          'NON-UNIFORM - GENERAL CARGO': order.packData['NON-UNIFORM - GENERAL CARGO'] || [],
        });
      }

      // Set approval
      if (order.approval) {
        setApproval({
          status: order.approval.status || order.panelStatus || "",
          remarks: order.approval.remarks || "",
        });
      } else {
        setApproval({
          status: order.panelStatus || "",
          remarks: "",
        });
      }

    } catch (error) {
      console.error('Error fetching order:', error);
      setError(error.message);
      alert(`❌ Failed to load order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approval.status) {
      alert("Please select approval status");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch('/api/order-panel', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: orderId,
          panelStatus: approval.status,
          approvalRemarks: approval.remarks,
          approvedBy: 'Approver', // This would come from the user context
          approvedAt: new Date().toISOString()
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ Order ${approval.status} successfully!`);
        router.push('/admin/order-panel');
      } else {
        alert(data.message || 'Failed to update approval');
      }
    } catch (error) {
      console.error('Error updating approval:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const totalWeight = useMemo(() => {
    return plantRows.reduce((sum, row) => sum + num(row.weight), 0);
  }, [plantRows]);

  const totalAmount = useMemo(() => {
    return plantRows.reduce((sum, row) => sum + num(row.totalAmount), 0);
  }, [plantRows]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading order data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-full px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/order-panel')}
                className="text-yellow-600 hover:text-yellow-800 font-medium text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to List
              </button>
              <div className="text-lg font-extrabold text-slate-900">
                Approve Order: {header.orderPanelNo}
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Party: {header.partyName || header.customerName}</span>
              {header.panelStatus && (
                <>
                  <span>|</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Current: {header.panelStatus}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleApprove}
              disabled={saving}
              className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition ${
                saving 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : 'Submit Approval'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-full p-4">
        
        {/* Header Information */}
        <Card title="Order Information (Read Only)">
          <div className="grid grid-cols-12 gap-3">
            <Input col="col-span-12 md:col-span-2" label="Order No" value={header.orderPanelNo} readOnly={true} />
            <Input col="col-span-12 md:col-span-2" label="Branch" value={header.branchName} readOnly={true} />
            <Input col="col-span-12 md:col-span-2" label="Branch Code" value={header.branchCode} readOnly={true} />
            <Input col="col-span-12 md:col-span-2" label="Date" value={formatDate(header.date)} readOnly={true} />
            <Input col="col-span-12 md:col-span-2" label="Delivery" value={header.delivery} readOnly={true} />
            <Input col="col-span-12 md:col-span-2" label="Status" value={header.panelStatus} readOnly={true} />
          </div>
        </Card>

        {/* Customer Information */}
        <Card title="Customer Information (Read Only)">
          <div className="grid grid-cols-12 gap-3">
            <Input col="col-span-12 md:col-span-3" label="Customer Name" value={header.customerName} readOnly={true} />
            <Input col="col-span-12 md:col-span-3" label="Party Name" value={header.partyName} readOnly={true} />
            <Input col="col-span-12 md:col-span-3" label="Customer Code" value={header.customerCode} readOnly={true} />
            <Input col="col-span-12 md:col-span-3" label="Contact Person" value={header.contactPerson} readOnly={true} />
          </div>
        </Card>

        {/* Charges */}
        <Card title="Charges (Read Only)">
          <div className="grid grid-cols-12 gap-3">
            <Input col="col-span-12 md:col-span-3" label="Collection Charges" value={`₹${num(header.collectionCharges).toLocaleString()}`} readOnly={true} />
            <Input col="col-span-12 md:col-span-3" label="Cancellation Charges" value={header.cancellationCharges} readOnly={true} />
            <Input col="col-span-12 md:col-span-3" label="Loading Charges" value={header.loadingCharges} readOnly={true} />
            <Input col="col-span-12 md:col-span-3" label="Other Charges" value={`₹${num(header.otherCharges).toLocaleString()}`} readOnly={true} />
          </div>
        </Card>

        {/* Orders Table - with fromState and Local/Not Local */}
        <Card title="Order Details (Read Only)">
          <OrdersTable rows={plantRows} />
          <div className="flex justify-end gap-4 mt-4">
            <div className="flex items-center gap-3 border border-yellow-300 px-6 py-3 bg-yellow-50 rounded-xl">
              <div className="text-sm font-extrabold text-slate-900">Total Weight:</div>
              <div className="text-xl font-extrabold text-emerald-700">{totalWeight} kg</div>
            </div>
            <div className="flex items-center gap-3 border border-yellow-300 px-6 py-3 bg-yellow-50 rounded-xl">
              <div className="text-sm font-extrabold text-slate-900">Total Amount:</div>
              <div className="text-xl font-extrabold text-purple-700">₹{totalAmount.toLocaleString()}</div>
            </div>
          </div>
        </Card>

        {/* Pack Data - All Types */}
        <Card title="Pack Data (Read Only)">
          {/* Palletization */}
          {packData.PALLETIZATION.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-800 mb-2 bg-yellow-100 inline-block px-3 py-1 rounded-full">Palletization</h3>
              <PalletizationTable rows={packData.PALLETIZATION} />
            </div>
          )}

          {/* Uniform */}
          {packData['UNIFORM - BAGS/BOXES'].length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-800 mb-2 bg-yellow-100 inline-block px-3 py-1 rounded-full">Uniform - Bags/Boxes</h3>
              <UniformTable rows={packData['UNIFORM - BAGS/BOXES']} />
            </div>
          )}

          {/* Loose Cargo */}
          {packData['LOOSE - CARGO'].length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-800 mb-2 bg-yellow-100 inline-block px-3 py-1 rounded-full">Loose - Cargo</h3>
              <LooseCargoTable rows={packData['LOOSE - CARGO']} />
            </div>
          )}

          {/* Non-Uniform */}
          {packData['NON-UNIFORM - GENERAL CARGO'].length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-800 mb-2 bg-yellow-100 inline-block px-3 py-1 rounded-full">Non-uniform - General Cargo</h3>
              <NonUniformTable rows={packData['NON-UNIFORM - GENERAL CARGO']} />
            </div>
          )}

          {packData.PALLETIZATION.length === 0 && 
           packData['UNIFORM - BAGS/BOXES'].length === 0 && 
           packData['LOOSE - CARGO'].length === 0 && 
           packData['NON-UNIFORM - GENERAL CARGO'].length === 0 && (
            <div className="text-center py-8 text-slate-400">No pack data available</div>
          )}
        </Card>

        {/* Approval Section - EDITABLE */}
        <Card title="Approval / Rejection (Editable)">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6">
              <div className="bg-white p-4 rounded-xl border border-yellow-200">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Approval Status</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600">Approval Status *</label>
                    <select
                      value={approval.status}
                      onChange={(e) => setApproval({ ...approval, status: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                    >
                      <option value="">Select Approval Status</option>
                      {PANEL_STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-slate-600">Remarks</label>
                    <textarea
                      value={approval.remarks}
                      onChange={(e) => setApproval({ ...approval, remarks: e.target.value })}
                      rows={4}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                      placeholder="Enter approval remarks..."
                    />
                  </div>

                  {/* Current Status Display */}
                  {approval.status && (
                    <div className="mt-3 p-3 rounded-lg border" style={{
                      backgroundColor: approval.status === 'Approved' ? '#f0fdf4' : 
                                     approval.status === 'Rejected' ? '#fef2f2' :
                                     approval.status === 'Completed' ? '#eff6ff' :
                                     approval.status === 'Cancelled' ? '#fef3c7' :
                                     approval.status === 'Draft' ? '#f3f4f6' : '#fefce8',
                      borderColor: approval.status === 'Approved' ? '#86efac' : 
                                   approval.status === 'Rejected' ? '#fca5a5' :
                                   approval.status === 'Completed' ? '#93c5fd' :
                                   approval.status === 'Cancelled' ? '#fcd34d' :
                                   approval.status === 'Draft' ? '#d1d5db' : '#fde047'
                    }}>
                      <p className="text-sm font-medium">
                        Selected Status: <span className={`
                          ${approval.status === 'Approved' ? 'text-green-700' : 
                            approval.status === 'Rejected' ? 'text-red-700' :
                            approval.status === 'Completed' ? 'text-blue-700' :
                            approval.status === 'Cancelled' ? 'text-yellow-700' :
                            approval.status === 'Draft' ? 'text-gray-700' : 'text-yellow-700'}
                        `}>
                          {approval.status}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-span-12 md:col-span-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Approval Instructions</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center mt-0.5">
                      <span className="text-yellow-600 text-xs font-bold">1</span>
                    </div>
                    <p className="text-sm text-slate-600">Select approval status from the dropdown</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center mt-0.5">
                      <span className="text-yellow-600 text-xs font-bold">2</span>
                    </div>
                    <p className="text-sm text-slate-600">Add any relevant remarks or comments</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center mt-0.5">
                      <span className="text-yellow-600 text-xs font-bold">3</span>
                    </div>
                    <p className="text-sm text-slate-600">Click "Submit Approval" to finalize the decision</p>
                  </div>

                  {/* Status Descriptions */}
                  <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-xs font-bold text-slate-700 mb-2">Status Descriptions:</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-slate-600"><strong>Approved:</strong> Order is fully approved</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span className="text-slate-600"><strong>Rejected:</strong> Order is rejected</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span className="text-slate-600"><strong>Completed:</strong> Order is completed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        <span className="text-slate-600"><strong>Draft:</strong> Order is in draft state</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        <span className="text-slate-600"><strong>Submitted:</strong> Order is submitted for approval</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                        <span className="text-slate-600"><strong>Cancelled:</strong> Order is cancelled</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs text-yellow-800">
                      <span className="font-bold">Note:</span> Once approved, the order will be finalized and cannot be edited.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Summary Card */}
        <Card title="Order Summary">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Order Summary</h3>
                <div className="space-y-2">
                  <InfoRow label="Order No" value={header.orderPanelNo} />
                  <InfoRow label="Party Name" value={header.partyName || header.customerName} />
                  <InfoRow label="Total Orders" value={plantRows.length} />
                </div>
              </div>
            </div>

            <div className="col-span-12 md:col-span-4">
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Weight Summary</h3>
                <div className="space-y-2">
                  <InfoRow label="Total Weight" value={`${totalWeight} kg`} />
                  <InfoRow label="Total Amount" value={`₹${totalAmount.toLocaleString()}`} />
                </div>
              </div>
            </div>

            <div className="col-span-12 md:col-span-4">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Status</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Current Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      header.panelStatus === 'Approved' ? 'bg-green-100 text-green-800' :
                      header.panelStatus === 'Rejected' ? 'bg-red-100 text-red-800' :
                      header.panelStatus === 'Completed' ? 'bg-blue-100 text-blue-800' :
                      header.panelStatus === 'Cancelled' ? 'bg-gray-100 text-gray-800' :
                      header.panelStatus === 'Draft' ? 'bg-slate-100 text-slate-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {header.panelStatus || 'Draft'}
                    </span>
                  </div>
                  <InfoRow label="Delivery Type" value={header.delivery} />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}