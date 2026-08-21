

// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { useRouter } from "next/navigation";
// import { usePermission } from "../hooks/usePermission";
// import Link from "next/link";

// export default function OrderPanelList() {
//   const router = useRouter();
//   const { canView, canCreate, canEdit, canDelete, canApprove, loading: permissionLoading } = usePermission();
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [deleteLoading, setDeleteLoading] = useState(null);
//   const [approveLoading, setApproveLoading] = useState(null);
//   const [selectedOrders, setSelectedOrders] = useState([]);
//   const [filterStatus, setFilterStatus] = useState('all');
//   const [searchTerm, setSearchTerm] = useState('');

//   const MODULE_NAME = 'Order Panel';

//   // Fetch orders
//   const fetchOrders = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const token = localStorage.getItem('token');
      
//       const res = await fetch('/api/order-panel?table=true', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
      
//       const data = await res.json();
      
//       if (data.success) {
//         setOrders(data.data || []);
//       } else {
//         setError(data.message || 'Failed to fetch orders');
//       }
//     } catch (err) {
//       console.error('Error fetching orders:', err);
//       setError('Failed to load orders');
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     if (!permissionLoading) {
//       if (canView(MODULE_NAME)) {
//         fetchOrders();
//       } else {
//         setLoading(false);
//       }
//     }
//   }, [permissionLoading, canView, fetchOrders]);

//   // Handle Delete
//   const handleDelete = async (orderId, orderNo) => {
//     if (!canDelete(MODULE_NAME)) {
//       alert('You don\'t have permission to delete orders');
//       return;
//     }

//     if (!confirm(`Are you sure you want to delete order ${orderNo}?`)) {
//       return;
//     }

//     setDeleteLoading(orderId);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch(`/api/order-panel?id=${orderId}`, {
//         method: 'DELETE',
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       const data = await res.json();

//       if (data.success) {
//         setOrders(prev => prev.filter(order => order.originalOrderId !== orderId));
//         alert('Order deleted successfully!');
//       } else {
//         alert(data.message || 'Failed to delete order');
//       }
//     } catch (err) {
//       console.error('Error deleting order:', err);
//       alert('Failed to delete order');
//     } finally {
//       setDeleteLoading(null);
//     }
//   };

//   // Handle Edit
//   const handleEdit = (orderId) => {
//     if (!canEdit(MODULE_NAME)) {
//       alert('You don\'t have permission to edit orders');
//       return;
//     }
//     router.push(`/admin/order-panel/${orderId}`);
//   };

//   // Handle Create New
//   const handleCreateNew = () => {
//     if (!canCreate(MODULE_NAME)) {
//       alert('You don\'t have permission to create orders');
//       return;
//     }
//     router.push('/admin/order-panel/create');
//   };

//   // ✅ Create Vehicle Negotiation for selected orders (Multi-select)
//   const handleCreateVehicleNegotiation = () => {
//     if (selectedOrders.length === 0) {
//       alert('Please select at least one order to create a Vehicle Negotiation.');
//       return;
//     }

//     // Get the selected order details
//     const selectedOrderData = orders.filter(order => 
//       selectedOrders.includes(order.originalOrderId) && 
//       order.panelStatus === 'Approved' &&
//       !order.usedInVehicleNegotiation
//     );

//     if (selectedOrderData.length === 0) {
//       alert('Selected orders are not approved or already used in a Vehicle Negotiation.');
//       return;
//     }

//     // Build query parameters with order IDs and details
//     const orderIds = selectedOrderData.map(o => o.originalOrderId).join(',');
//     const orderPanelNos = selectedOrderData.map(o => o.orderNo).join(',');
    
//     // Navigate to vehicle negotiation create page with order data
//     router.push(`/admin/vehicle-negotiation/create?orderIds=${orderIds}&orderPanelNos=${orderPanelNos}`);
//   };

//   // ✅ Quick Create Vehicle Negotiation for a single order (Individual action)
//   const handleQuickCreateVN = (order) => {
//     if (order.usedInVehicleNegotiation) {
//       alert(`This order is already used in Vehicle Negotiation.`);
//       return;
//     }
    
//     if (order.panelStatus !== 'Approved') {
//       alert('Order must be approved before creating Vehicle Negotiation.');
//       return;
//     }
    
//     // Navigate to vehicle negotiation create page with this order
//     router.push(`/admin/vehicle-negotiation/create?orderIds=${order.originalOrderId}&orderPanelNos=${order.orderNo}`);
//   };

//   // Quick Approve function
//   const handleQuickApprove = async (orderId, orderNo) => {
//     if (!canApprove(MODULE_NAME)) {
//       alert('You don\'t have permission to approve orders');
//       return;
//     }

//     if (!confirm(`Are you sure you want to approve order ${orderNo}?`)) {
//       return;
//     }

//     setApproveLoading(orderId);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch(`/api/order-panel`, {
//         method: 'PATCH',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`
//         },
//         body: JSON.stringify({ id: orderId, action: 'approve' })
//       });

//       const data = await res.json();

//       if (data.success) {
//         alert('Order approved successfully!');
//         fetchOrders();
//       } else {
//         alert(data.message || 'Failed to approve order');
//       }
//     } catch (err) {
//       console.error('Error approving order:', err);
//       alert('Failed to approve order');
//     } finally {
//       setApproveLoading(null);
//     }
//   };

//   // Quick Reject function
//   const handleQuickReject = async (orderId, orderNo) => {
//     if (!canApprove(MODULE_NAME)) {
//       alert('You don\'t have permission to reject orders');
//       return;
//     }

//     if (!confirm(`Are you sure you want to reject order ${orderNo}?`)) {
//       return;
//     }

//     setApproveLoading(orderId);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch(`/api/order-panel`, {
//         method: 'PATCH',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`
//         },
//         body: JSON.stringify({ id: orderId, action: 'reject' })
//       });

//       const data = await res.json();

//       if (data.success) {
//         alert('Order rejected successfully!');
//         fetchOrders();
//       } else {
//         alert(data.message || 'Failed to reject order');
//       }
//     } catch (err) {
//       console.error('Error rejecting order:', err);
//       alert('Failed to reject order');
//     } finally {
//       setApproveLoading(null);
//     }
//   };

//   // Full Approve with Details
//   const handleApprove = (orderId) => {
//     if (!canApprove(MODULE_NAME)) {
//       alert('You don\'t have permission to approve orders');
//       return;
//     }
//     router.push(`/admin/order-panel/approve/${orderId}`);
//   };

//   // Handle Select Order
//   const handleSelectOrder = (orderId) => {
//     setSelectedOrders(prev => {
//       if (prev.includes(orderId)) {
//         return prev.filter(id => id !== orderId);
//       } else {
//         return [...prev, orderId];
//       }
//     });
//   };

//   // Handle Select All (only for approved orders not used in VN)
//   const handleSelectAll = () => {
//     const selectableOrders = filteredOrders.filter(o => 
//       o.panelStatus === 'Approved' && !o.usedInVehicleNegotiation
//     );
    
//     if (selectedOrders.length === selectableOrders.length && selectableOrders.length > 0) {
//       setSelectedOrders([]);
//     } else {
//       setSelectedOrders(selectableOrders.map(o => o.originalOrderId));
//     }
//   };

//   // Bulk Approve
//   const handleBulkApprove = async () => {
//     if (selectedOrders.length === 0) {
//       alert('Please select at least one order to approve');
//       return;
//     }

//     if (!canApprove(MODULE_NAME)) {
//       alert('You don\'t have permission to approve orders');
//       return;
//     }

//     if (!confirm(`Are you sure you want to approve ${selectedOrders.length} order(s)?`)) {
//       return;
//     }

//     setApproveLoading('bulk');
//     try {
//       for (const orderId of selectedOrders) {
//         const token = localStorage.getItem('token');
//         await fetch(`/api/order-panel`, {
//           method: 'PATCH',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${token}`
//           },
//           body: JSON.stringify({ id: orderId, action: 'approve' })
//         });
//       }

//       alert(`${selectedOrders.length} order(s) approved successfully!`);
//       setSelectedOrders([]);
//       fetchOrders();
//     } catch (err) {
//       console.error('Error approving orders:', err);
//       alert('Failed to approve some orders');
//     } finally {
//       setApproveLoading(null);
//     }
//   };

//   // Format Date
//   const formatDate = (dateString) => {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-IN', {
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric'
//     });
//   };

//   // Filter orders
//   const filteredOrders = orders.filter(order => {
//     if (filterStatus !== 'all' && order.panelStatus !== filterStatus) {
//       return false;
//     }
//     if (searchTerm) {
//       const search = searchTerm.toLowerCase();
//       return (
//         order.orderNo?.toLowerCase().includes(search) ||
//         order.partyName?.toLowerCase().includes(search) ||
//         order.branchName?.toLowerCase().includes(search) ||
//         order.plantName?.toLowerCase().includes(search) ||
//         order.customerName?.toLowerCase().includes(search)
//       );
//     }
//     return true;
//   });

//   // Count selectable orders (approved and not used in Vehicle Negotiation)
//   const selectableOrdersCount = filteredOrders.filter(o => 
//     o.panelStatus === 'Approved' && !o.usedInVehicleNegotiation
//   ).length;

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
//             You don't have permission to access the Order Panel.
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

//   // Get status badge color for Approver Status
//   const getApproverStatusColor = (status) => {
//     switch(status) {
//       case 'Approved': return 'bg-green-100 text-green-800';
//       case 'Rejected': return 'bg-red-100 text-red-800';
//       case 'Completed': return 'bg-blue-100 text-blue-800';
//       case 'Draft': return 'bg-gray-100 text-gray-800';
//       case 'Submitted': return 'bg-yellow-100 text-yellow-800';
//       case 'Cancelled': return 'bg-gray-100 text-gray-800';
//       default: return 'bg-yellow-100 text-yellow-800';
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
//       {/* Top Bar */}
//       <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
//         <div className="mx-auto max-w-full px-6 py-4 flex flex-wrap items-center justify-between gap-4">
//           <div>
//             <h1 className="text-2xl font-extrabold text-slate-900">
//               Order Panel Management
//             </h1>
//             <p className="text-sm text-slate-600 mt-1">
//               Manage all your orders in one place
//             </p>
//           </div>

//           <div className="flex items-center gap-3 flex-wrap">
//             {/* ✅ Create Vehicle Negotiation Button - For MULTIPLE selected orders */}
//             {canCreate('Vehicle Negotiation') && selectedOrders.length > 0 && (
//               <button
//                 onClick={handleCreateVehicleNegotiation}
//                 className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700 transition flex items-center gap-2"
//               >
//                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0v8m0-8l-8 8-4-4-6 6" />
//                 </svg>
//                 Create Vehicle Negotiation ({selectedOrders.filter(id => {
//                   const order = orders.find(o => o.originalOrderId === id);
//                   return order && order.panelStatus === 'Approved' && !order.usedInVehicleNegotiation;
//                 }).length})
//               </button>
//             )}

//             {/* Bulk Approve Button */}
//             {canApprove(MODULE_NAME) && selectedOrders.length > 0 && (
//               <button
//                 onClick={handleBulkApprove}
//                 disabled={approveLoading === 'bulk'}
//                 className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50"
//               >
//                 {approveLoading === 'bulk' ? (
//                   <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
//                 ) : (
//                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//                   </svg>
//                 )}
//                 Approve Selected ({selectedOrders.length})
//               </button>
//             )}

//             {/* Create Button */}
//             {canCreate(MODULE_NAME) && (
//               <button
//                 onClick={handleCreateNew}
//                 className="rounded-xl bg-yellow-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-yellow-700 transition flex items-center gap-2"
//               >
//                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                 </svg>
//                 Create New Order
//               </button>
//             )}
//           </div>
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
//         <div className="mb-6 flex flex-wrap items-center gap-4">
//           <div className="flex items-center gap-2">
//             <label className="text-sm font-medium text-slate-600">Status:</label>
//             <select
//               value={filterStatus}
//               onChange={(e) => setFilterStatus(e.target.value)}
//               className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
//             >
//               <option value="all">All</option>
//               <option value="Open">Open</option>
//               <option value="Hold">Hold</option>
//               <option value="Approved">Approved</option>
//               <option value="Completed">Completed</option>
//               <option value="Cancelled">Cancelled</option>
//               <option value="Rejected">Rejected</option>
//             </select>
//           </div>

//           <div className="flex-1 min-w-[200px]">
//             <input
//               type="text"
//               placeholder="Search by order no, party, branch..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full px-4 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
//             />
//           </div>

//           <button
//             onClick={fetchOrders}
//             className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm"
//           >
//             Refresh
//           </button>
          
//           <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
//             {selectableOrdersCount} order(s) available for VN
//           </div>
//         </div>

//         {/* Orders Table */}
//         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead className="bg-yellow-400 border-b border-yellow-500">
//                 <tr>
//                   <th className="px-4 py-3 text-left">
//                     <input
//                       type="checkbox"
//                       checked={selectedOrders.length === selectableOrdersCount && selectableOrdersCount > 0}
//                       onChange={handleSelectAll}
//                       className="w-4 h-4 rounded border-slate-300 text-yellow-600 focus:ring-yellow-500"
//                       title="Select all approved orders not used in Vehicle Negotiation"
//                     />
//                   </th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">S.No</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Order No</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Date</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Branch</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Party Name</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Plant</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">From → To</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Weight</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Status</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Approver Status</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">VN Used</th>
//                   <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">VNN No</th>
//                   <th className="px-4 py-3 text-center text-xs font-extrabold text-slate-900 uppercase tracking-wider">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-200">
//                 {loading ? (
//                   <tr>
//                     <td colSpan="14" className="px-4 py-12 text-center">
//                       <div className="flex items-center justify-center">
//                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
//                       </div>
//                     </td>
//                   </tr>
//                 ) : filteredOrders.length > 0 ? (
//                   filteredOrders.map((order, index) => {
//                     const isUsedInVN = order.usedInVehicleNegotiation || false;
//                     const isApproved = order.panelStatus === 'Approved';
//                     const isSelectable = isApproved && !isUsedInVN;
                    
//                     return (
//                       <tr key={order._id} className={`hover:bg-yellow-50 transition ${isSelectable ? 'bg-green-50' : ''}`}>
//                         <td className="px-4 py-3">
//                           <input
//                             type="checkbox"
//                             checked={selectedOrders.includes(order.originalOrderId)}
//                             onChange={() => handleSelectOrder(order.originalOrderId)}
//                             className="w-4 h-4 rounded border-slate-300 text-yellow-600 focus:ring-yellow-500"
//                             disabled={!isSelectable}
//                             title={!isSelectable ? (isUsedInVN ? 'Order already used in Vehicle Negotiation' : 'Order not approved') : 'Select order'}
//                           />
//                         </td>
//                         <td className="px-4 py-3 text-slate-600">{index + 1}</td>
//                         <td className="px-4 py-3 font-medium text-slate-900">{order.orderNo}</td>
//                         <td className="px-4 py-3 text-slate-600">{formatDate(order.date)}</td>
//                         <td className="px-4 py-3">
//                           <div>
//                             <div className="font-medium text-slate-800">{order.branchName}</div>
//                             <div className="text-xs text-slate-500">{order.branchCode}</div>
//                           </div>
//                         </td>
//                         <td className="px-4 py-3">
//                           <div>
//                             <div className="font-medium text-slate-800">{order.partyName}</div>
//                             <div className="text-xs text-slate-500">{order.customerName}</div>
//                           </div>
//                         </td>
//                         <td className="px-4 py-3">
//                           <div>
//                             <div className="font-medium text-slate-800">{order.plantName || 'N/A'}</div>
//                             <div className="text-xs text-slate-500">{order.plantCode}</div>
//                           </div>
//                         </td>
//                         <td className="px-4 py-3">
//                           <div className="text-sm">
//                             <span className="font-medium">{order.from}</span>
//                             <span className="mx-1 text-slate-400">→</span>
//                             <span className="font-medium">{order.to}</span>
//                           </div>
//                         </td>
//                         <td className="px-4 py-3 font-medium">{order.weight} kg</td>
//                         <td className="px-4 py-3">
//                           <span className={`px-2 py-1 rounded-full text-xs font-medium ${
//                             order.status === 'Open' ? 'bg-green-100 text-green-800' :
//                             order.status === 'Hold' ? 'bg-yellow-100 text-yellow-800' :
//                             order.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
//                             order.status === 'Completed' ? 'bg-purple-100 text-purple-800' :
//                             order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
//                             order.status === 'Rejected' ? 'bg-red-100 text-red-800' :
//                             'bg-slate-100 text-slate-800'
//                           }`}>
//                             {order.status}
//                           </span>
//                         </td>
//                         <td className="px-4 py-3">
//                           <span className={`px-2 py-1 rounded-full text-xs font-medium ${getApproverStatusColor(order.approverStatus || order.panelStatus || 'Pending')}`}>
//                             {order.approverStatus || order.panelStatus || 'Pending'}
//                           </span>
//                         </td>
//                         <td className="px-4 py-3">
//                           {isUsedInVN ? (
//                             <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
//                               ✓ Used
//                             </span>
//                           ) : isApproved ? (
//                             <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
//                               Available
//                             </span>
//                           ) : (
//                             <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
//                               N/A
//                             </span>
//                           )}
//                         </td>
//                         <td className="px-4 py-3">
//                           {order.vnnNumber && order.vnnNumber !== 'Used' ? (
//                             <span className="text-xs font-medium text-purple-600">
//                               {order.vnnNumber}
//                             </span>
//                           ) : order.vnnNumber === 'Used' ? (
//                             <span className="text-xs text-gray-400">Used</span>
//                           ) : (
//                             <span className="text-xs text-gray-400">-</span>
//                           )}
//                         </td>
//                         <td className="px-4 py-3">
//                           <div className="flex items-center justify-center gap-1 flex-wrap">
//                             {/* ✅ Create VN Button - For SINGLE order (quick action) */}
//                             {canCreate('Vehicle Negotiation') && isSelectable && (
//                               <button
//                                 onClick={() => handleQuickCreateVN(order)}
//                                 className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
//                                 title="Create Vehicle Negotiation"
//                               >
//                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0v8m0-8l-8 8-4-4-6 6" />
//                                 </svg>
//                               </button>
//                             )}

//                             {/* Edit Button */}
//                             {canEdit(MODULE_NAME) && !isUsedInVN && (
//                               <button
//                                 onClick={() => handleEdit(order.originalOrderId)}
//                                 className="p-2 bg-sky-100 text-sky-700 rounded-lg hover:bg-sky-200 transition"
//                                 title="Edit Order"
//                               >
//                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
//                                 </svg>
//                               </button>
//                             )}

//                             {/* Quick Approve Button */}
//                             {canApprove(MODULE_NAME) && !isUsedInVN && order.panelStatus !== 'Approved' && order.panelStatus !== 'Completed' && order.panelStatus !== 'Rejected' && (
//                               <button
//                                 onClick={() => handleQuickApprove(order.originalOrderId, order.orderNo)}
//                                 disabled={approveLoading === order.originalOrderId}
//                                 className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition disabled:opacity-50"
//                                 title="Quick Approve"
//                               >
//                                 {approveLoading === order.originalOrderId ? (
//                                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700"></div>
//                                 ) : (
//                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                                   </svg>
//                                 )}
//                               </button>
//                             )}

//                             {/* Full Approve Button */}
//                             {canApprove(MODULE_NAME) && !isUsedInVN && order.panelStatus !== 'Approved' && order.panelStatus !== 'Completed' && order.panelStatus !== 'Rejected' && (
//                               <button
//                                 onClick={() => handleApprove(order.originalOrderId)}
//                                 className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
//                                 title="Approve with Details"
//                               >
//                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//                                 </svg>
//                               </button>
//                             )}

//                             {/* Quick Reject Button */}
//                             {canApprove(MODULE_NAME) && !isUsedInVN && order.panelStatus !== 'Rejected' && order.panelStatus !== 'Completed' && (
//                               <button
//                                 onClick={() => handleQuickReject(order.originalOrderId, order.orderNo)}
//                                 disabled={approveLoading === order.originalOrderId}
//                                 className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
//                                 title="Quick Reject"
//                               >
//                                 {approveLoading === order.originalOrderId ? (
//                                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
//                                 ) : (
//                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                                   </svg>
//                                 )}
//                               </button>
//                             )}

//                             {/* Delete Button */}
//                             {canDelete(MODULE_NAME) && !isUsedInVN && (
//                               <button
//                                 onClick={() => handleDelete(order.originalOrderId, order.orderNo)}
//                                 disabled={deleteLoading === order.originalOrderId}
//                                 className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
//                                 title="Delete Order"
//                               >
//                                 {deleteLoading === order.originalOrderId ? (
//                                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
//                                 ) : (
//                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                                   </svg>
//                                 )}
//                               </button>
//                             )}
//                           </div>
//                         </td>
//                       </tr>
//                     );
//                   })
//                 ) : (
//                   <tr>
//                     <td colSpan="14" className="px-4 py-12 text-center text-slate-500">
//                       <div className="flex flex-col items-center">
//                         <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
//                         </svg>
//                         <p className="text-lg font-medium mb-2">No orders found</p>
//                         <p className="text-sm mb-4">Get started by creating your first order</p>
//                         {canCreate(MODULE_NAME) && (
//                           <button
//                             onClick={handleCreateNew}
//                             className="px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition text-sm font-bold"
//                           >
//                             Create New Order
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
//           {filteredOrders.length > 0 && (
//             <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
//               <span>
//                 Showing {filteredOrders.length} of {orders.length} order{orders.length !== 1 ? 's' : ''}
//               </span>
//               <span>
//                 Selected: {selectedOrders.length} {selectedOrders.length > 0 && `(${selectedOrders.filter(id => {
//                   const order = orders.find(o => o.originalOrderId === id);
//                   return order && order.panelStatus === 'Approved' && !order.usedInVehicleNegotiation;
//                 }).length} available for VN)`}
//               </span>
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

export default function OrderPanelList() {
  const router = useRouter();
  const { canView, canCreate, canEdit, canDelete, canApprove, loading: permissionLoading } = usePermission();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [approveLoading, setApproveLoading] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const MODULE_NAME = 'Order Panel';

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch('/api/order-panel?table=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      
      if (data.success) {
        setOrders(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!permissionLoading) {
      if (canView(MODULE_NAME)) {
        fetchOrders();
      } else {
        setLoading(false);
      }
    }
  }, [permissionLoading, canView, fetchOrders]);

  // Handle Delete
  const handleDelete = async (orderId, orderNo) => {
    if (!canDelete(MODULE_NAME)) {
      alert('You don\'t have permission to delete orders');
      return;
    }

    if (!confirm(`Are you sure you want to delete order ${orderNo}?`)) {
      return;
    }

    setDeleteLoading(orderId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/order-panel?id=${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.success) {
        setOrders(prev => prev.filter(order => order.originalOrderId !== orderId));
        alert('Order deleted successfully!');
      } else {
        alert(data.message || 'Failed to delete order');
      }
    } catch (err) {
      console.error('Error deleting order:', err);
      alert('Failed to delete order');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Handle Edit
  const handleEdit = (orderId) => {
    if (!canEdit(MODULE_NAME)) {
      alert('You don\'t have permission to edit orders');
      return;
    }
    router.push(`/admin/order-panel/${orderId}`);
  };

  const handleView = (orderId) => {
    router.push(`/admin/order-panel/${orderId}/view`);
  };

  // Handle Create New
  const handleCreateNew = () => {
    if (!canCreate(MODULE_NAME)) {
      alert('You don\'t have permission to create orders');
      return;
    }
    router.push('/admin/order-panel/create');
  };

  // ✅ Create Vehicle Negotiation for selected orders (Multi-select)
  const handleCreateVehicleNegotiation = () => {
    if (selectedOrders.length === 0) {
      alert('Please select at least one order to create a Vehicle Negotiation.');
      return;
    }

    // Get the selected order details
    const selectedOrderData = orders.filter(order => 
      selectedOrders.includes(order.originalOrderId) && 
      order.panelStatus === 'Approved' &&
      !order.usedInVehicleNegotiation
    );

    if (selectedOrderData.length === 0) {
      alert('Selected orders are not approved or already used in a Vehicle Negotiation.');
      return;
    }

    // Build query parameters with order IDs and details
    const orderIds = selectedOrderData.map(o => o.originalOrderId).join(',');
    const orderPanelNos = selectedOrderData.map(o => o.orderNo).join(',');
    
    // Navigate to vehicle negotiation create page with order data
    router.push(`/admin/vehicle-negotiation/create?orderIds=${orderIds}&orderPanelNos=${orderPanelNos}`);
  };

  // ✅ Quick Create Vehicle Negotiation for a single order (Individual action)
  const handleQuickCreateVN = (order) => {
    if (order.usedInVehicleNegotiation) {
      alert(`This order is already used in Vehicle Negotiation.`);
      return;
    }
    
    if (order.panelStatus !== 'Approved') {
      alert('Order must be approved before creating Vehicle Negotiation.');
      return;
    }
    
    // Navigate to vehicle negotiation create page with this order
    router.push(`/admin/vehicle-negotiation/create?orderIds=${order.originalOrderId}&orderPanelNos=${order.orderNo}`);
  };

  // Quick Approve function
  const handleQuickApprove = async (orderId, orderNo) => {
    if (!canApprove(MODULE_NAME)) {
      alert('You don\'t have permission to approve orders');
      return;
    }

    if (!confirm(`Are you sure you want to approve order ${orderNo}?`)) {
      return;
    }

    setApproveLoading(orderId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/order-panel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id: orderId, action: 'approve' })
      });

      const data = await res.json();

      if (data.success) {
        alert('Order approved successfully!');
        fetchOrders();
      } else {
        alert(data.message || 'Failed to approve order');
      }
    } catch (err) {
      console.error('Error approving order:', err);
      alert('Failed to approve order');
    } finally {
      setApproveLoading(null);
    }
  };

  // Quick Reject function
  const handleQuickReject = async (orderId, orderNo) => {
    if (!canApprove(MODULE_NAME)) {
      alert('You don\'t have permission to reject orders');
      return;
    }

    if (!confirm(`Are you sure you want to reject order ${orderNo}?`)) {
      return;
    }

    setApproveLoading(orderId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/order-panel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id: orderId, action: 'reject' })
      });

      const data = await res.json();

      if (data.success) {
        alert('Order rejected successfully!');
        fetchOrders();
      } else {
        alert(data.message || 'Failed to reject order');
      }
    } catch (err) {
      console.error('Error rejecting order:', err);
      alert('Failed to reject order');
    } finally {
      setApproveLoading(null);
    }
  };

  // Full Approve with Details
  const handleApprove = (orderId) => {
    if (!canApprove(MODULE_NAME)) {
      alert('You don\'t have permission to approve orders');
      return;
    }
    router.push(`/admin/order-panel/approve/${orderId}`);
  };

  // Handle Select Order
  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId);
      } else {
        return [...prev, orderId];
      }
    });
  };

  // Handle Select All (only for approved orders not used in VN)
  const handleSelectAll = () => {
    const selectableOrders = filteredOrders.filter(o => 
      o.panelStatus === 'Approved' && !o.usedInVehicleNegotiation
    );
    
    if (selectedOrders.length === selectableOrders.length && selectableOrders.length > 0) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(selectableOrders.map(o => o.originalOrderId));
    }
  };

  // Bulk Approve
  const handleBulkApprove = async () => {
    if (selectedOrders.length === 0) {
      alert('Please select at least one order to approve');
      return;
    }

    if (!canApprove(MODULE_NAME)) {
      alert('You don\'t have permission to approve orders');
      return;
    }

    if (!confirm(`Are you sure you want to approve ${selectedOrders.length} order(s)?`)) {
      return;
    }

    setApproveLoading('bulk');
    try {
      for (const orderId of selectedOrders) {
        const token = localStorage.getItem('token');
        await fetch(`/api/order-panel`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ id: orderId, action: 'approve' })
        });
      }

      alert(`${selectedOrders.length} order(s) approved successfully!`);
      setSelectedOrders([]);
      fetchOrders();
    } catch (err) {
      console.error('Error approving orders:', err);
      alert('Failed to approve some orders');
    } finally {
      setApproveLoading(null);
    }
  };

  // Format Date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (filterStatus !== 'all' && order.panelStatus !== filterStatus) {
      return false;
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        order.orderNo?.toLowerCase().includes(search) ||
        order.partyName?.toLowerCase().includes(search) ||
        order.branchName?.toLowerCase().includes(search) ||
        order.plantName?.toLowerCase().includes(search) ||
        order.customerName?.toLowerCase().includes(search) ||
        order.subCompanyName?.toLowerCase().includes(search) ||
        order.subCompanyCode?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Count selectable orders (approved and not used in Vehicle Negotiation)
  const selectableOrdersCount = filteredOrders.filter(o => 
    o.panelStatus === 'Approved' && !o.usedInVehicleNegotiation
  ).length;

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
            You don't have permission to access the Order Panel.
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

  // Get status badge color for Approver Status
  const getApproverStatusColor = (status) => {
    switch(status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Submitted': return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-full px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Order Panel Management
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage all your orders in one place
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* ✅ Create Vehicle Negotiation Button - For MULTIPLE selected orders */}
            {canCreate('Vehicle Negotiation') && selectedOrders.length > 0 && (
              <button
                onClick={handleCreateVehicleNegotiation}
                className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Create Vehicle Negotiation ({selectedOrders.filter(id => {
                  const order = orders.find(o => o.originalOrderId === id);
                  return order && order.panelStatus === 'Approved' && !order.usedInVehicleNegotiation;
                }).length})
              </button>
            )}

            {/* Bulk Approve Button */}
            {canApprove(MODULE_NAME) && selectedOrders.length > 0 && (
              <button
                onClick={handleBulkApprove}
                disabled={approveLoading === 'bulk'}
                className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                {approveLoading === 'bulk' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                Approve Selected ({selectedOrders.length})
              </button>
            )}

            {/* Create Button */}
            {canCreate(MODULE_NAME) && (
              <button
                onClick={handleCreateNew}
                className="rounded-xl bg-yellow-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-yellow-700 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Order
              </button>
            )}
          </div>
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
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="all">All</option>
              <option value="Open">Open</option>
              <option value="Hold">Hold</option>
              <option value="Approved">Approved</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by order no, party, branch, sub-company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          <button
            onClick={fetchOrders}
            className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm"
          >
            Refresh
          </button>
          
          <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
            {selectableOrdersCount} order(s) available for VN
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="max-h-[calc(100vh-280px)] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-yellow-400 border-b border-yellow-500">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === selectableOrdersCount && selectableOrdersCount > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-yellow-600 focus:ring-yellow-500"
                      title="Select all approved orders not used in Vehicle Negotiation"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Order No</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Branch</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Sub-Company</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Party Name</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Plant</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">From → To</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Approver Status</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">VN Used</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">VNN No</th>
                  <th className="px-4 py-3 text-center text-xs font-extrabold text-slate-900 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="15" className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map((order, index) => {
                    const isUsedInVN = order.usedInVehicleNegotiation || false;
                    const isApproved = order.panelStatus === 'Approved';
                    const isSelectable = isApproved && !isUsedInVN;
                    
                    return (
                      <tr key={order._id} className={`hover:bg-yellow-50 transition ${isSelectable ? 'bg-green-50' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order.originalOrderId)}
                            onChange={() => handleSelectOrder(order.originalOrderId)}
                            className="w-4 h-4 rounded border-slate-300 text-yellow-600 focus:ring-yellow-500"
                            disabled={!isSelectable}
                            title={!isSelectable ? (isUsedInVN ? 'Order already used in Vehicle Negotiation' : 'Order not approved') : 'Select order'}
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                        <td className="px-4 py-3"><button type="button" onClick={() => handleView(order.originalOrderId)} className="font-semibold text-slate-900 hover:text-indigo-700 hover:underline" title="View order details">{order.orderNo}</button></td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(order.date)}</td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-slate-800">{order.branchName}</div>
                            <div className="text-xs text-slate-500">{order.branchCode}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {order.subCompanyName ? (
                            <div>
                              <div className="font-medium text-slate-800">{order.subCompanyName}</div>
                              <div className="text-xs text-slate-500">{order.subCompanyCode}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-slate-800">{order.partyName}</div>
                            <div className="text-xs text-slate-500">{order.customerName}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-slate-800">{order.plantName || 'N/A'}</div>
                            <div className="text-xs text-slate-500">{order.plantCode}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <span className="font-medium">{order.from}</span>
                            <span className="mx-1 text-slate-400">→</span>
                            <span className="font-medium">{order.to}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{order.weight} MT</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === 'Open' ? 'bg-green-100 text-green-800' :
                            order.status === 'Hold' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'Completed' ? 'bg-purple-100 text-purple-800' :
                            order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                            order.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getApproverStatusColor(order.approverStatus || order.panelStatus || 'Pending')}`}>
                            {order.approverStatus || order.panelStatus || 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isUsedInVN ? (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                              ✓ Used
                            </span>
                          ) : isApproved ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              Available
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                              N/A
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {order.vnnNumber && order.vnnNumber !== 'Used' ? (
                            <span className="text-xs font-medium text-purple-600">
                              {order.vnnNumber}
                            </span>
                          ) : order.vnnNumber === 'Used' ? (
                            <span className="text-xs text-gray-400">Used</span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {/* ✅ Create VN Button - For SINGLE order (quick action) */}
                            {canCreate('Vehicle Negotiation') && isSelectable && (
                              <button
                                onClick={() => handleQuickCreateVN(order)}
                                className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
                                title="Create Vehicle Negotiation"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                              </button>
                            )}

                            {/* Edit Button */}
                            {canEdit(MODULE_NAME) && !isUsedInVN && (
                              <button
                                onClick={() => handleEdit(order.originalOrderId)}
                                className="p-2 bg-sky-100 text-sky-700 rounded-lg hover:bg-sky-200 transition"
                                title="Edit Order"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}

                            {/* Quick Approve Button */}
                            {canApprove(MODULE_NAME) && !isUsedInVN && order.panelStatus !== 'Approved' && order.panelStatus !== 'Completed' && order.panelStatus !== 'Rejected' && (
                              <button
                                onClick={() => handleQuickApprove(order.originalOrderId, order.orderNo)}
                                disabled={approveLoading === order.originalOrderId}
                                className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition disabled:opacity-50"
                                title="Quick Approve"
                              >
                                {approveLoading === order.originalOrderId ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700"></div>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            )}

                            {/* Full Approve Button */}
                            {canApprove(MODULE_NAME) && !isUsedInVN && order.panelStatus !== 'Approved' && order.panelStatus !== 'Completed' && order.panelStatus !== 'Rejected' && (
                              <button
                                onClick={() => handleApprove(order.originalOrderId)}
                                className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                                title="Approve with Details"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            )}

                            {/* Quick Reject Button */}
                            {canApprove(MODULE_NAME) && !isUsedInVN && order.panelStatus !== 'Rejected' && order.panelStatus !== 'Completed' && (
                              <button
                                onClick={() => handleQuickReject(order.originalOrderId, order.orderNo)}
                                disabled={approveLoading === order.originalOrderId}
                                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
                                title="Quick Reject"
                              >
                                {approveLoading === order.originalOrderId ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                )}
                              </button>
                            )}

                            {/* Delete Button */}
                            {canDelete(MODULE_NAME) && !isUsedInVN && (
                              <button
                                onClick={() => handleDelete(order.originalOrderId, order.orderNo)}
                                disabled={deleteLoading === order.originalOrderId}
                                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
                                title="Delete Order"
                              >
                                {deleteLoading === order.originalOrderId ? (
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
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="15" className="px-4 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center">
                        <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-lg font-medium mb-2">No orders found</p>
                        <p className="text-sm mb-4">Get started by creating your first order</p>
                        {canCreate(MODULE_NAME) && (
                          <button
                            onClick={handleCreateNew}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition text-sm font-bold"
                          >
                            Create New Order
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
          {filteredOrders.length > 0 && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
              <span>
                Showing {filteredOrders.length} of {orders.length} order{orders.length !== 1 ? 's' : ''}
              </span>
              <span>
                Selected: {selectedOrders.length} {selectedOrders.length > 0 && `(${selectedOrders.filter(id => {
                  const order = orders.find(o => o.originalOrderId === id);
                  return order && order.panelStatus === 'Approved' && !order.usedInVehicleNegotiation;
                }).length} available for VN)`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
