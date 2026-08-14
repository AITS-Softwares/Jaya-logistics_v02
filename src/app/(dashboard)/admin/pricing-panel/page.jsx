// // "use client";

// // import { useState, useEffect } from "react";
// // import { useRouter } from "next/navigation";

// // export default function PricingPanelList() {
// //   const router = useRouter();
// //   const [panels, setPanels] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [error, setError] = useState(null);
// //   const [deleteLoading, setDeleteLoading] = useState(null);
// //   const [filters, setFilters] = useState({
// //     search: "",
// //     pricingStatus: "",
// //     approvalStatus: "",
// //     fromDate: "",
// //     toDate: ""
// //   });

// //   useEffect(() => {
// //     fetchPanels();
// //   }, []);

// //   const fetchPanels = async () => {
// //     setLoading(true);
// //     try {
// //       const token = localStorage.getItem('token');
      
// //       const params = new URLSearchParams({ format: 'table' });
// //       if (filters.search) params.append('search', filters.search);
// //       if (filters.pricingStatus) params.append('pricingStatus', filters.pricingStatus);
// //       if (filters.approvalStatus) params.append('approvalStatus', filters.approvalStatus);
// //       if (filters.fromDate) params.append('fromDate', filters.fromDate);
// //       if (filters.toDate) params.append('toDate', filters.toDate);
      
// //       const res = await fetch(`/api/pricing-panel?${params.toString()}`, {
// //         headers: { Authorization: `Bearer ${token}` },
// //       });
      
// //       const data = await res.json();
      
// //       if (data.success) {
// //         // Group by Pricing Serial Number to show each panel once
// //         const grouped = {};
// //         data.data.forEach(item => {
// //           if (!grouped[item.panelId]) {
// //             grouped[item.panelId] = {
// //               panelId: item.panelId,
// //               pricingSerialNo: item.pricingSerialNo,
// //               date: item.date,
// //               partyName: item.partyName,
// //               from: item.from,
// //               to: item.to,
// //               weight: item.weight,
// //               pricing: item.pricing || 'Pending',
// //               approval: item.approval || 'Pending',
// //               orderCount: 1,
// //               vnnNumbers: item.vnn ? [item.vnn] : []
// //             };
// //           } else {
// //             grouped[item.panelId].orderCount += 1;
// //             if (item.vnn && !grouped[item.panelId].vnnNumbers.includes(item.vnn)) {
// //               grouped[item.panelId].vnnNumbers.push(item.vnn);
// //             }
// //           }
// //         });
// //         setPanels(Object.values(grouped));
// //       } else {
// //         setPanels([]);
// //         setError(data.message || 'Failed to fetch pricing panels');
// //       }
// //     } catch (err) {
// //       console.error('Error fetching pricing panels:', err);
// //       setError('Failed to load pricing panels');
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const handleFilterChange = (key, value) => {
// //     setFilters(prev => ({ ...prev, [key]: value }));
// //   };

// //   const applyFilters = () => {
// //     fetchPanels();
// //   };

// //   const clearFilters = () => {
// //     setFilters({
// //       search: "",
// //       pricingStatus: "",
// //       approvalStatus: "",
// //       fromDate: "",
// //       toDate: ""
// //     });
// //     setTimeout(() => fetchPanels(), 100);
// //   };

// //   const handleDelete = async (panelId, pricingSerialNo) => {
// //     if (!confirm(`Are you sure you want to delete Pricing Panel ${pricingSerialNo}?`)) {
// //       return;
// //     }

// //     setDeleteLoading(panelId);
// //     try {
// //       const token = localStorage.getItem('token');
// //       const res = await fetch(`/api/pricing-panel?id=${panelId}`, {
// //         method: 'DELETE',
// //         headers: { Authorization: `Bearer ${token}` },
// //       });

// //       const data = await res.json();

// //       if (data.success) {
// //         setPanels(panels.filter(item => item.panelId !== panelId));
// //         alert('Pricing Panel deleted successfully!');
// //       } else {
// //         alert(data.message || 'Failed to delete pricing panel');
// //       }
// //     } catch (err) {
// //       console.error('Error deleting pricing panel:', err);
// //       alert('Failed to delete pricing panel');
// //     } finally {
// //       setDeleteLoading(null);
// //     }
// //   };

// //   const handleEdit = (panelId) => {
// //     router.push(`/admin/pricing-panel/${panelId}`);
// //   };

// //   const handleApprove = (panelId) => {
// //     router.push(`/admin/pricing-panel/approve/${panelId}`);
// //   };

// //   const handleCreateNew = () => {
// //     router.push('/admin/pricing-panel/create');
// //   };

// //   if (loading) {
// //     return (
// //       <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-6">
// //         <div className="flex items-center justify-center h-64">
// //           <div className="text-center">
// //             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
// //             <p className="mt-4 text-slate-600">Loading pricing panels...</p>
// //           </div>
// //         </div>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
// //       {/* Top Bar */}
// //       <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
// //         <div className="mx-auto max-w-full px-6 py-4 flex items-center justify-between">
// //           <div>
// //             <h1 className="text-2xl font-extrabold text-slate-900">
// //               Pricing Panel Management
// //             </h1>
// //             <p className="text-sm text-slate-600 mt-1">
// //               Manage all pricing panels in one place
// //             </p>
// //           </div>

// //           <button
// //             onClick={handleCreateNew}
// //             className="rounded-xl bg-yellow-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-yellow-700 transition flex items-center gap-2"
// //           >
// //             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
// //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
// //             </svg>
// //             Create New Pricing Panel
// //           </button>
// //         </div>
// //       </div>

// //       {/* Main Content */}
// //       <div className="mx-auto max-w-full p-6">
// //         {error && (
// //           <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
// //             {error}
// //           </div>
// //         )}

// //         {/* Filters */}
// //         <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4">
// //           <h2 className="text-sm font-bold text-slate-700 mb-3">Filter Pricing Panels</h2>
// //           <div className="grid grid-cols-12 gap-3">
// //             <div className="col-span-12 md:col-span-3">
// //               <input
// //                 type="text"
// //                 placeholder="Search by PSN, VNN, Party..."
// //                 value={filters.search}
// //                 onChange={(e) => handleFilterChange('search', e.target.value)}
// //                 className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
// //               />
// //             </div>
// //             <div className="col-span-12 md:col-span-2">
// //               <select
// //                 value={filters.pricingStatus}
// //                 onChange={(e) => handleFilterChange('pricingStatus', e.target.value)}
// //                 className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
// //               >
// //                 <option value="">All Pricing Status</option>
// //                 <option value="Pending">Pending</option>
// //                 <option value="Completed">Completed</option>
// //               </select>
// //             </div>
// //             <div className="col-span-12 md:col-span-2">
// //               <select
// //                 value={filters.approvalStatus}
// //                 onChange={(e) => handleFilterChange('approvalStatus', e.target.value)}
// //                 className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
// //               >
// //                 <option value="">All Approval</option>
// //                 <option value="Pending">Pending</option>
// //                 <option value="Approved">Approved</option>
// //                 <option value="Rejected">Rejected</option>
// //                 <option value="Completed">Completed</option>
// //               </select>
// //             </div>
// //             <div className="col-span-12 md:col-span-2">
// //               <input
// //                 type="date"
// //                 value={filters.fromDate}
// //                 onChange={(e) => handleFilterChange('fromDate', e.target.value)}
// //                 className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
// //                 placeholder="From Date"
// //               />
// //             </div>
// //             <div className="col-span-12 md:col-span-2">
// //               <input
// //                 type="date"
// //                 value={filters.toDate}
// //                 onChange={(e) => handleFilterChange('toDate', e.target.value)}
// //                 className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
// //                 placeholder="To Date"
// //               />
// //             </div>
// //             <div className="col-span-12 md:col-span-1 flex gap-2">
// //               <button
// //                 onClick={applyFilters}
// //                 className="flex-1 rounded-xl bg-yellow-600 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-700 transition"
// //               >
// //                 Filter
// //               </button>
// //               <button
// //                 onClick={clearFilters}
// //                 className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
// //                 title="Clear Filters"
// //               >
// //                 ✕
// //               </button>
// //             </div>
// //           </div>
// //         </div>

// //         {/* Pricing Panels Table */}
// //         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
// //           <div className="overflow-x-auto">
// //             <table className="w-full text-sm">
// //               <thead className="bg-yellow-400 border-b border-yellow-500">
// //                 <tr>
// //                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">S.No</th>
// //                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Date</th>
// //                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">PSN</th>
// //                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">VNN Numbers</th>
// //                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Party Name</th>
// //                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">From → To</th>
// //                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Total Weight</th>
// //                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Orders</th>
// //                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Pricing</th>
// //                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Approval</th>
// //                   <th className="px-4 py-3 text-center text-xs font-extrabold text-slate-900 uppercase tracking-wider">Actions</th>
// //                 </tr>
// //               </thead>
// //               <tbody className="divide-y divide-slate-200">
// //                 {panels.length > 0 ? (
// //                   panels.map((item, index) => (
// //                     <tr key={item.panelId} className="hover:bg-yellow-50 transition">
// //                       <td className="px-4 py-3 text-slate-600">{index + 1}</td>
// //                       <td className="px-4 py-3 text-slate-600">{item.date}</td>
// //                       <td className="px-4 py-3 font-medium text-slate-900">{item.pricingSerialNo}</td>
// //                       <td className="px-4 py-3">
// //                         <div className="flex flex-wrap gap-1">
// //                           {item.vnnNumbers && item.vnnNumbers.length > 0 ? (
// //                             item.vnnNumbers.map((vnn, idx) => (
// //                               <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
// //                                 {vnn}
// //                               </span>
// //                             ))
// //                           ) : (
// //                             <span className="text-slate-400">-</span>
// //                           )}
// //                         </div>
// //                       </td>
// //                       <td className="px-4 py-3">
// //                         <div className="font-medium text-slate-800">{item.partyName}</div>
// //                       </td>
// //                       <td className="px-4 py-3">
// //                         <div className="text-sm">
// //                           <span>{item.from || '-'}</span>
// //                           <span className="mx-1 text-slate-400">→</span>
// //                           <span>{item.to || '-'}</span>
// //                         </div>
// //                       </td>
// //                       <td className="px-4 py-3 font-medium">{item.weight} kg</td>
// //                       <td className="px-4 py-3">
// //                         <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
// //                           {item.orderCount} order{item.orderCount !== 1 ? 's' : ''}
// //                         </span>
// //                       </td>
// //                       <td className="px-4 py-3">
// //                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${
// //                           item.pricing === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
// //                         }`}>
// //                           {item.pricing}
// //                         </span>
// //                       </td>
// //                       <td className="px-4 py-3">
// //                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${
// //                           item.approval === 'Approved' ? 'bg-green-100 text-green-800' :
// //                           item.approval === 'Rejected' ? 'bg-red-100 text-red-800' :
// //                           item.approval === 'Completed' ? 'bg-blue-100 text-blue-800' :
// //                           'bg-yellow-100 text-yellow-800'
// //                         }`}>
// //                           {item.approval}
// //                         </span>
// //                       </td>
// //                       <td className="px-4 py-3">
// //                         <div className="flex items-center justify-center gap-2">
// //                           {/* Edit Button */}
// //                           <button
// //                             onClick={() => handleEdit(item.panelId)}
// //                             className="p-2 bg-sky-100 text-sky-700 rounded-lg hover:bg-sky-200 transition"
// //                             title="Edit Pricing Panel"
// //                           >
// //                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
// //                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
// //                             </svg>
// //                           </button>
                          
// //                           {/* Approve Button */}
// //                           <button
// //                             onClick={() => handleApprove(item.panelId)}
// //                             className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
// //                             title="Approve/Review Pricing Panel"
// //                           >
// //                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
// //                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
// //                             </svg>
// //                           </button>
                          
// //                           {/* Delete Button */}
// //                           <button
// //                             onClick={() => handleDelete(item.panelId, item.pricingSerialNo)}
// //                             disabled={deleteLoading === item.panelId}
// //                             className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
// //                             title="Delete Pricing Panel"
// //                           >
// //                             {deleteLoading === item.panelId ? (
// //                               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
// //                             ) : (
// //                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
// //                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
// //                               </svg>
// //                             )}
// //                           </button>
// //                         </div>
// //                       </td>
// //                     </tr>
// //                   ))
// //                 ) : (
// //                   <tr>
// //                     <td colSpan="11" className="px-4 py-12 text-center text-slate-500">
// //                       <div className="flex flex-col items-center">
// //                         <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
// //                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
// //                         </svg>
// //                         <p className="text-lg font-medium mb-2">No pricing panels found</p>
// //                         <p className="text-sm mb-4">Get started by creating your first pricing panel</p>
// //                         <button
// //                           onClick={handleCreateNew}
// //                           className="px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition text-sm font-bold"
// //                         >
// //                           Create New Pricing Panel
// //                         </button>
// //                       </div>
// //                     </td>
// //                   </tr>
// //                 )}
// //               </tbody>
// //             </table>
// //           </div>

// //           {/* Table Footer */}
// //           {panels.length > 0 && (
// //             <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-600">
// //               Total {panels.length} pricing panel{panels.length !== 1 ? 's' : ''} found
// //             </div>
// //           )}
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }
// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { useRouter } from "next/navigation";
// import { usePermission } from "../hooks/usePermission";
// import Link from "next/link";

// export default function PricingPanelList() {
//   const router = useRouter();
//   const { canView, canCreate, canEdit, canDelete, canApprove, loading: permissionLoading } = usePermission();
//   const [panels, setPanels] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [deleteLoading, setDeleteLoading] = useState(null);
//   const [approveLoading, setApproveLoading] = useState(null);
//   const [filters, setFilters] = useState({
//     search: "",
//     pricingStatus: "",
//     approvalStatus: "",
//     fromDate: "",
//     toDate: ""
//   });

//   const MODULE_NAME = 'Pricing Panel';

//   // Fetch panels - wrapped in useCallback to prevent infinite re-renders
//   const fetchPanels = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const token = localStorage.getItem('token');
      
//       const params = new URLSearchParams({ format: 'table' });
//       if (filters.search) params.append('search', filters.search);
//       if (filters.pricingStatus) params.append('pricingStatus', filters.pricingStatus);
//       if (filters.approvalStatus) params.append('approvalStatus', filters.approvalStatus);
//       if (filters.fromDate) params.append('fromDate', filters.fromDate);
//       if (filters.toDate) params.append('toDate', filters.toDate);
      
//       const res = await fetch(`/api/pricing-panel?${params.toString()}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
      
//       const data = await res.json();
      
//       if (data.success) {
//         // Group by Pricing Serial Number to show each panel once
//         const grouped = {};
//         data.data.forEach(item => {
//           if (!grouped[item.panelId]) {
//             grouped[item.panelId] = {
//               panelId: item.panelId,
//               pricingSerialNo: item.pricingSerialNo,
//               date: item.date,
//               partyName: item.partyName,
//               from: item.from,
//               to: item.to,
//               weight: item.weight,
//               pricing: item.pricing || 'Pending',
//               approval: item.approval || 'Pending',
//               orderCount: 1,
//               vnnNumbers: item.vnn && item.vnn !== '-' ? [item.vnn] : []
//             };
//           } else {
//             grouped[item.panelId].orderCount += 1;
//             if (item.vnn && item.vnn !== '-' && !grouped[item.panelId].vnnNumbers.includes(item.vnn)) {
//               grouped[item.panelId].vnnNumbers.push(item.vnn);
//             }
//           }
//         });
//         setPanels(Object.values(grouped));
//       } else {
//         setPanels([]);
//         setError(data.message || 'Failed to fetch pricing panels');
//       }
//     } catch (err) {
//       console.error('Error fetching pricing panels:', err);
//       setError('Failed to load pricing panels');
//     } finally {
//       setLoading(false);
//     }
//   }, [filters]);

//   // Only fetch when permissions are loaded and user has view permission
//   useEffect(() => {
//     if (!permissionLoading) {
//       if (canView(MODULE_NAME)) {
//         fetchPanels();
//       } else {
//         setLoading(false);
//       }
//     }
//   }, [permissionLoading, canView, fetchPanels]);

//   const handleFilterChange = (key, value) => {
//     setFilters(prev => ({ ...prev, [key]: value }));
//   };

//   const applyFilters = () => {
//     fetchPanels();
//   };

//   const clearFilters = () => {
//     setFilters({
//       search: "",
//       pricingStatus: "",
//       approvalStatus: "",
//       fromDate: "",
//       toDate: ""
//     });
//     setTimeout(() => fetchPanels(), 100);
//   };

//   const handleDelete = async (panelId, pricingSerialNo) => {
//     if (!canDelete(MODULE_NAME)) {
//       alert('You don\'t have permission to delete pricing panels');
//       return;
//     }

//     if (!confirm(`Are you sure you want to delete Pricing Panel ${pricingSerialNo}?`)) {
//       return;
//     }

//     setDeleteLoading(panelId);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch(`/api/pricing-panel?id=${panelId}`, {
//         method: 'DELETE',
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       const data = await res.json();

//       if (data.success) {
//         setPanels(prev => prev.filter(item => item.panelId !== panelId));
//         alert('Pricing Panel deleted successfully!');
//       } else {
//         alert(data.message || 'Failed to delete pricing panel');
//       }
//     } catch (err) {
//       console.error('Error deleting pricing panel:', err);
//       alert('Failed to delete pricing panel');
//     } finally {
//       setDeleteLoading(null);
//     }
//   };

//   const handleEdit = (panelId) => {
//     if (!canEdit(MODULE_NAME)) {
//       alert('You don\'t have permission to edit pricing panels');
//       return;
//     }
//     router.push(`/admin/pricing-panel/${panelId}`);
//   };

//   // ✅ NEW: Quick Approve function - approves without going to approve page
//   const handleQuickApprove = async (panelId, pricingSerialNo) => {
//     if (!canApprove(MODULE_NAME)) {
//       alert('You don\'t have permission to approve pricing panels');
//       return;
//     }

//     if (!confirm(`Are you sure you want to approve Pricing Panel ${pricingSerialNo}?`)) {
//       return;
//     }

//     setApproveLoading(panelId);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/pricing-panel', {
//         method: 'PATCH',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({ 
//           id: panelId, 
//           action: 'approve'
//         })
//       });

//       const data = await res.json();

//       if (data.success) {
//         alert('Pricing panel approved successfully!');
//         fetchPanels();
//       } else {
//         alert(data.message || 'Failed to approve');
//       }
//     } catch (error) {
//       console.error('Error approving:', error);
//       alert('Failed to approve');
//     } finally {
//       setApproveLoading(null);
//     }
//   };

//   // ✅ Full Approve with Details - navigates to approve page
//   const handleApprove = (panelId) => {
//     if (!canApprove(MODULE_NAME)) {
//       alert('You don\'t have permission to approve pricing panels');
//       return;
//     }
//     router.push(`/admin/pricing-panel/approve/${panelId}`);
//   };

//   const handleCreateNew = () => {
//     if (!canCreate(MODULE_NAME)) {
//       alert('You don\'t have permission to create pricing panels');
//       return;
//     }
//     router.push('/admin/pricing-panel/create');
//   };

//   // Show loading while permissions are being loaded
//   if (permissionLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-50">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
//           <p className="mt-4 text-slate-600">Loading permissions...</p>
//         </div>
//       </div>
//     );
//   }

//   // If user doesn't have view permission, show access denied
//   if (!canView(MODULE_NAME)) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-50">
//         <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg">
//           <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
//             <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
//                 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
//             </svg>
//           </div>
//           <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
//           <p className="text-gray-600 mb-6">
//             You don't have permission to access Pricing Panels.
//             Please contact your administrator.
//           </p>
//           <Link
//             href="/admin"
//             className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
//           >
//             Return to Dashboard
//           </Link>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
//       {/* Top Bar */}
//       <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
//         <div className="mx-auto max-w-full px-6 py-4 flex flex-wrap items-center justify-between gap-4">
//           <div>
//             <h1 className="text-2xl font-extrabold text-slate-900">
//               Pricing Panel Management
//             </h1>
//             <p className="text-sm text-slate-600 mt-1">
//               Manage all pricing panels in one place
//             </p>
//           </div>

//           {canCreate(MODULE_NAME) && (
//             <button
//               onClick={handleCreateNew}
//               className="rounded-xl bg-yellow-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-yellow-700 transition flex items-center gap-2"
//             >
//               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//               </svg>
//               Create New Pricing Panel
//             </button>
//           )}
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="mx-auto max-w-full p-6">
//         {error && (
//           <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
//             {error}
//           </div>
//         )}

//         {/* Filters */}
//         <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4">
//           <h2 className="text-sm font-bold text-slate-700 mb-3">Filter Pricing Panels</h2>
//           <div className="grid grid-cols-12 gap-3">
//             <div className="col-span-12 md:col-span-3">
//               <input
//                 type="text"
//                 placeholder="Search by PSN, VNN, Party..."
//                 value={filters.search}
//                 onChange={(e) => handleFilterChange('search', e.target.value)}
//                 className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
//               />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <select
//                 value={filters.pricingStatus}
//                 onChange={(e) => handleFilterChange('pricingStatus', e.target.value)}
//                 className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
//               >
//                 <option value="">All Pricing Status</option>
//                 <option value="Pending">Pending</option>
//                 <option value="Completed">Completed</option>
//               </select>
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <select
//                 value={filters.approvalStatus}
//                 onChange={(e) => handleFilterChange('approvalStatus', e.target.value)}
//                 className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
//               >
//                 <option value="">All Approval</option>
//                 <option value="Pending">Pending</option>
//                 <option value="Approved">Approved</option>
//                 <option value="Rejected">Rejected</option>
//                 <option value="Completed">Completed</option>
//               </select>
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <input
//                 type="date"
//                 value={filters.fromDate}
//                 onChange={(e) => handleFilterChange('fromDate', e.target.value)}
//                 className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
//                 placeholder="From Date"
//               />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <input
//                 type="date"
//                 value={filters.toDate}
//                 onChange={(e) => handleFilterChange('toDate', e.target.value)}
//                 className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
//                 placeholder="To Date"
//               />
//             </div>
//             <div className="col-span-12 md:col-span-1 flex gap-2">
//               <button
//                 onClick={applyFilters}
//                 className="flex-1 rounded-xl bg-yellow-600 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-700 transition"
//               >
//                 Filter
//               </button>
//               <button
//                 onClick={clearFilters}
//                 className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
//                 title="Clear Filters"
//               >
//                 ✕
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Pricing Panels Table */}
//         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead className="bg-yellow-400 border-b border-yellow-500">
//                 <tr>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">S.No</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Date</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">PSN</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">VNN Numbers</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Party Name</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">From → To</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Total Weight</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Orders</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Pricing</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Approval</th>
//                   <th className="px-4 py-3 text-center text-xs font-extrabold text-slate-900 uppercase tracking-wider">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-200">
//                 {loading ? (
//                   <tr>
//                     <td colSpan="11" className="px-4 py-12 text-center">
//                       <div className="flex items-center justify-center">
//                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
//                       </div>
//                     </td>
//                   </tr>
//                 ) : panels.length > 0 ? (
//                   panels.map((item, index) => (
//                     <tr key={item.panelId} className="hover:bg-yellow-50 transition">
//                       <td className="px-4 py-3 text-slate-600">{index + 1}</td>
//                       <td className="px-4 py-3 text-slate-600">{item.date}</td>
//                       <td className="px-4 py-3 font-medium text-slate-900">{item.pricingSerialNo}</td>
//                       <td className="px-4 py-3">
//                         <div className="flex flex-wrap gap-1">
//                           {item.vnnNumbers && item.vnnNumbers.length > 0 ? (
//                             item.vnnNumbers.map((vnn, idx) => (
//                               <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
//                                 {vnn}
//                               </span>
//                             ))
//                           ) : (
//                             <span className="text-slate-400">-</span>
//                           )}
//                         </div>
//                       </td>
//                       <td className="px-4 py-3">
//                         <div className="font-medium text-slate-800">{item.partyName}</div>
//                       </td>
//                       <td className="px-4 py-3">
//                         <div className="text-sm">
//                           <span>{item.from || '-'}</span>
//                           <span className="mx-1 text-slate-400">→</span>
//                           <span>{item.to || '-'}</span>
//                         </div>
//                       </td>
//                       <td className="px-4 py-3 font-medium">{item.weight} kg</td>
//                       <td className="px-4 py-3">
//                         <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
//                           {item.orderCount} order{item.orderCount !== 1 ? 's' : ''}
//                         </span>
//                       </td>
//                       <td className="px-4 py-3">
//                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${
//                           item.pricing === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
//                         }`}>
//                           {item.pricing}
//                         </span>
//                       </td>
//                       <td className="px-4 py-3">
//                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${
//                           item.approval === 'Approved' ? 'bg-green-100 text-green-800' :
//                           item.approval === 'Rejected' ? 'bg-red-100 text-red-800' :
//                           item.approval === 'Completed' ? 'bg-blue-100 text-blue-800' :
//                           'bg-yellow-100 text-yellow-800'
//                         }`}>
//                           {item.approval}
//                         </span>
//                       </td>
//                       <td className="px-4 py-3">
//                         <div className="flex items-center justify-center gap-2 flex-wrap">
//                           {/* Edit Button - Only shown if user has edit permission */}
//                           {canEdit(MODULE_NAME) && (
//                             <button
//                               onClick={() => handleEdit(item.panelId)}
//                               className="p-2 bg-sky-100 text-sky-700 rounded-lg hover:bg-sky-200 transition"
//                               title="Edit Pricing Panel"
//                             >
//                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                               </svg>
//                             </button>
//                           )}
                          
//                           {/* ✅ Quick Approve Button - Green (with checkmark) */}
//                           {canApprove(MODULE_NAME) && item.approval !== 'Approved' && item.approval !== 'Rejected' && item.approval !== 'Completed' && (
//                             <button
//                               onClick={() => handleQuickApprove(item.panelId, item.pricingSerialNo)}
//                               disabled={approveLoading === item.panelId}
//                               className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition disabled:opacity-50"
//                               title="Quick Approve"
//                             >
//                               {approveLoading === item.panelId ? (
//                                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700"></div>
//                               ) : (
//                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                                 </svg>
//                               )}
//                             </button>
//                           )}
                          
//                           {/* ✅ Full Approve Button - Blue (with details) */}
//                           {canApprove(MODULE_NAME) && item.approval !== 'Approved' && item.approval !== 'Rejected' && item.approval !== 'Completed' && (
//                             <button
//                               onClick={() => handleApprove(item.panelId)}
//                               className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
//                               title="Approve with Details"
//                             >
//                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//                               </svg>
//                             </button>
//                           )}
                          
//                           {/* Delete Button - Only shown if user has delete permission */}
//                           {canDelete(MODULE_NAME) && (
//                             <button
//                               onClick={() => handleDelete(item.panelId, item.pricingSerialNo)}
//                               disabled={deleteLoading === item.panelId}
//                               className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
//                               title="Delete Pricing Panel"
//                             >
//                               {deleteLoading === item.panelId ? (
//                                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
//                               ) : (
//                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                                 </svg>
//                               )}
//                             </button>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan="11" className="px-4 py-12 text-center text-slate-500">
//                       <div className="flex flex-col items-center">
//                         <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
//                         </svg>
//                         <p className="text-lg font-medium mb-2">No pricing panels found</p>
//                         <p className="text-sm mb-4">Get started by creating your first pricing panel</p>
//                         {canCreate(MODULE_NAME) && (
//                           <button
//                             onClick={handleCreateNew}
//                             className="px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition text-sm font-bold"
//                           >
//                             Create New Pricing Panel
//                           </button>
//                         )}
//                       </div>
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* Table Footer */}
//           {panels.length > 0 && (
//             <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-600">
//               Total {panels.length} pricing panel{panels.length !== 1 ? 's' : ''} found
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePermission } from "../hooks/usePermission";
import Link from "next/link";

export default function PricingPanelList() {
  const router = useRouter();
  const { canView, canCreate, canEdit, canDelete, canApprove, loading: permissionLoading } = usePermission();
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [approveLoading, setApproveLoading] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    pricingStatus: "",
    approvalStatus: "",
    fromDate: "",
    toDate: ""
  });

  const MODULE_NAME = 'Pricing Panel';

  // Fetch panels - wrapped in useCallback to prevent infinite re-renders
  const fetchPanels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({ format: 'table' });
      if (filters.search) params.append('search', filters.search);
      if (filters.pricingStatus) params.append('pricingStatus', filters.pricingStatus);
      if (filters.approvalStatus) params.append('approvalStatus', filters.approvalStatus);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
      
      const res = await fetch(`/api/pricing-panel?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Group by Pricing Serial Number to show each panel once
        const grouped = {};
        data.data.forEach(item => {
          if (!grouped[item.panelId]) {
            grouped[item.panelId] = {
              panelId: item.panelId,
              pricingSerialNo: item.pricingSerialNo,
              date: item.date,
              partyName: item.partyName,
              from: item.from,
              to: item.to,
              weight: item.weight,
              pricing: item.pricing || 'Pending',
              approval: item.approval || 'Pending',
              orderCount: 1,
              vnnNumbers: item.vnn && item.vnn !== '-' ? [item.vnn] : [],
              orderNumbers: item.orderNo ? [item.orderNo] : []
            };
          } else {
            grouped[item.panelId].orderCount += 1;
            if (item.vnn && item.vnn !== '-' && !grouped[item.panelId].vnnNumbers.includes(item.vnn)) {
              grouped[item.panelId].vnnNumbers.push(item.vnn);
            }
            if (item.orderNo && !grouped[item.panelId].orderNumbers.includes(item.orderNo)) grouped[item.panelId].orderNumbers.push(item.orderNo);
          }
        });
        setPanels(Object.values(grouped));
      } else {
        setPanels([]);
        setError(data.message || 'Failed to fetch pricing panels');
      }
    } catch (err) {
      console.error('Error fetching pricing panels:', err);
      setError('Failed to load pricing panels');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Only fetch when permissions are loaded and user has view permission
  useEffect(() => {
    if (!permissionLoading) {
      if (canView(MODULE_NAME)) {
        fetchPanels();
      } else {
        setLoading(false);
      }
    }
  }, [permissionLoading, canView, fetchPanels]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchPanels();
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      pricingStatus: "",
      approvalStatus: "",
      fromDate: "",
      toDate: ""
    });
    setTimeout(() => fetchPanels(), 100);
  };

  const handleDelete = async (panelId, pricingSerialNo) => {
    if (!canDelete(MODULE_NAME)) {
      alert('You don\'t have permission to delete pricing panels');
      return;
    }

    if (!confirm(`Are you sure you want to delete Pricing Panel ${pricingSerialNo}?`)) {
      return;
    }

    setDeleteLoading(panelId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/pricing-panel?id=${panelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.success) {
        setPanels(prev => prev.filter(item => item.panelId !== panelId));
        alert('Pricing Panel deleted successfully!');
      } else {
        alert(data.message || 'Failed to delete pricing panel');
      }
    } catch (err) {
      console.error('Error deleting pricing panel:', err);
      alert('Failed to delete pricing panel');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleEdit = (panelId) => {
    if (!canEdit(MODULE_NAME)) {
      alert('You don\'t have permission to edit pricing panels');
      return;
    }
    router.push(`/admin/pricing-panel/${panelId}`);
  };

  // ✅ Quick Approve function - approves without going to approve page
  const handleQuickApprove = async (panelId, pricingSerialNo) => {
    if (!canApprove(MODULE_NAME)) {
      alert('You don\'t have permission to approve pricing panels');
      return;
    }

    if (!confirm(`Are you sure you want to approve Pricing Panel ${pricingSerialNo}?`)) {
      return;
    }

    setApproveLoading(panelId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/pricing-panel', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          id: panelId, 
          action: 'approve'
        })
      });

      const data = await res.json();

      if (data.success) {
        alert('Pricing panel approved successfully!');
        fetchPanels();
      } else {
        alert(data.message || 'Failed to approve');
      }
    } catch (error) {
      console.error('Error approving:', error);
      alert('Failed to approve');
    } finally {
      setApproveLoading(null);
    }
  };

  // ✅ Full Approve with Details - navigates to approve page
  const handleApprove = (panelId) => {
    if (!canApprove(MODULE_NAME)) {
      alert('You don\'t have permission to approve pricing panels');
      return;
    }
    // Navigate to the approval page with the panel ID
    router.push(`/admin/pricing-panel/approve/${panelId}`);
  };

  const handleCreateNew = () => {
    if (!canCreate(MODULE_NAME)) {
      alert('You don\'t have permission to create pricing panels');
      return;
    }
    router.push('/admin/pricing-panel/create');
  };

  // Show loading while permissions are being loaded
  if (permissionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  // If user doesn't have view permission, show access denied
  if (!canView(MODULE_NAME)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access Pricing Panels.
            Please contact your administrator.
          </p>
          <Link
            href="/admin"
            className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-full px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Pricing Panel Management
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage all pricing panels in one place
            </p>
          </div>

          {canCreate(MODULE_NAME) && (
            <button
              onClick={handleCreateNew}
              className="rounded-xl bg-yellow-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-yellow-700 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Pricing Panel
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-full p-6">
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-bold text-slate-700 mb-3">Filter Pricing Panels</h2>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-3">
              <input
                type="text"
                placeholder="Search by PSN, VNN, Party..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
              />
            </div>
            <div className="col-span-12 md:col-span-2">
              <select
                value={filters.pricingStatus}
                onChange={(e) => handleFilterChange('pricingStatus', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
              >
                <option value="">All Pricing Status</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="col-span-12 md:col-span-2">
              <select
                value={filters.approvalStatus}
                onChange={(e) => handleFilterChange('approvalStatus', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
              >
                <option value="">All Approval</option>
                <option value="Pending">Pending</option>
                <option value="Pending from Team">Pending from Team</option>
                <option value="Pending from Client">Pending from Client</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="col-span-12 md:col-span-2">
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                placeholder="From Date"
              />
            </div>
            <div className="col-span-12 md:col-span-2">
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                placeholder="To Date"
              />
            </div>
            <div className="col-span-12 md:col-span-1 flex gap-2">
              <button
                onClick={applyFilters}
                className="flex-1 rounded-xl bg-yellow-600 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-700 transition"
              >
                Filter
              </button>
              <button
                onClick={clearFilters}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
                title="Clear Filters"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Panels Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-yellow-400 border-b border-yellow-500">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">PSN</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">VNNs</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Party Name</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">From → To</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Total Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Pricing</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Approval</th>
                  <th className="px-4 py-3 text-center text-xs font-extrabold text-slate-900 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="11" className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
                      </div>
                    </td>
                  </tr>
                ) : panels.length > 0 ? (
                  panels.map((item, index) => (
                    <tr key={item.panelId} className="hover:bg-yellow-50 transition">
                      <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                      <td className="px-4 py-3 text-slate-600">{item.date}</td>
                       <td className="px-4 py-3 font-medium text-slate-900"><button onClick={() => router.push(`/admin/pricing-panel/${item.panelId}/view`)} className="hover:text-indigo-600 hover:underline">{item.pricingSerialNo}</button></td>
                      <td className="px-4 py-3">
                        {item.vnnNumbers?.length ? (
                           <div className="flex max-w-48 flex-wrap gap-1">{item.vnnNumbers.map((vnn) => <span key={vnn} className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">{vnn}</span>)}</div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{item.partyName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <span>{item.from || '-'}</span>
                          <span className="mx-1 text-slate-400">→</span>
                          <span>{item.to || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{item.weight} kg</td>
                      <td className="px-4 py-3">
                         <div className="flex max-w-48 flex-wrap gap-1">{item.orderNumbers.map((orderNo) => <span key={orderNo} className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">{orderNo}</span>)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.pricing === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.pricing}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.approval === 'Approved' ? 'bg-green-100 text-green-800' :
                          item.approval === 'Rejected' ? 'bg-red-100 text-red-800' :
                          item.approval === 'Completed' ? 'bg-blue-100 text-blue-800' :
                          item.approval === 'Pending from Team' ? 'bg-orange-100 text-orange-800' :
                          item.approval === 'Pending from Client' ? 'bg-purple-100 text-purple-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.approval}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          {/* Edit Button - Only shown if user has edit permission */}
                          {canEdit(MODULE_NAME) && (
                            <button
                              onClick={() => handleEdit(item.panelId)}
                              className="p-2 bg-sky-100 text-sky-700 rounded-lg hover:bg-sky-200 transition"
                              title="Edit Pricing Panel"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          
                          {/* ✅ Quick Approve Button - Green (with checkmark) - Based ONLY on permission */}
                          {canApprove(MODULE_NAME) && (
                            <button
                              onClick={() => handleQuickApprove(item.panelId, item.pricingSerialNo)}
                              disabled={approveLoading === item.panelId}
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition disabled:opacity-50"
                              title="Quick Approve"
                            >
                              {approveLoading === item.panelId ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700"></div>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          )}
                          
                          {/* ✅ Full Approve with Details - Blue (navigates to approve page) - Based ONLY on permission */}
                          {canApprove(MODULE_NAME) && (
                            <button
                              onClick={() => handleApprove(item.panelId)}
                              className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                              title="Approve with Details"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                          
                          {/* Delete Button - Only shown if user has delete permission */}
                          {canDelete(MODULE_NAME) && (
                            <button
                              onClick={() => handleDelete(item.panelId, item.pricingSerialNo)}
                              disabled={deleteLoading === item.panelId}
                              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
                              title="Delete Pricing Panel"
                            >
                              {deleteLoading === item.panelId ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="11" className="px-4 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center">
                        <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-lg font-medium mb-2">No pricing panels found</p>
                        <p className="text-sm mb-4">Get started by creating your first pricing panel</p>
                        {canCreate(MODULE_NAME) && (
                          <button
                            onClick={handleCreateNew}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition text-sm font-bold"
                          >
                            Create New Pricing Panel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {panels.length > 0 && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-600">
              Total {panels.length} pricing panel{panels.length !== 1 ? 's' : ''} found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
