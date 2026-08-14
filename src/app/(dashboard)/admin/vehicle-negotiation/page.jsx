

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePermission } from "../hooks/usePermission";
import Link from "next/link";

export default function VehicleNegotiationList() {
  const router = useRouter();
  const { canView, canCreate, canEdit, canDelete, canApprove, loading: permissionLoading } = usePermission();
  const [negotiations, setNegotiations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    approvalStatus: "",
    memoStatus: "",
    fromDate: "",
    toDate: ""
  });

  const MODULE_NAME = 'Vehicle Negotiation';

  // Fetch negotiations - wrapped in useCallback to prevent infinite re-renders
  const fetchNegotiations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      // Build query string with filters
      const params = new URLSearchParams({ format: 'table' });
      if (filters.search) params.append('search', filters.search);
      if (filters.approvalStatus) params.append('approvalStatus', filters.approvalStatus);
      if (filters.memoStatus) params.append('memoStatus', filters.memoStatus);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
      
      const res = await fetch(`/api/vehicle-negotiation?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Group by VNN to show unique VNN numbers
        const groupedData = groupByVNN(data.data || []);
        setNegotiations(groupedData);
      } else {
        setError(data.message || 'Failed to fetch vehicle negotiations');
      }
    } catch (err) {
      console.error('Error fetching vehicle negotiations:', err);
      setError('Failed to load vehicle negotiations');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Group data by VNN number to show unique VNN rows
  const groupByVNN = (data) => {
    const vnnMap = new Map();
    
    data.forEach(item => {
      if (!vnnMap.has(item.vnn)) {
        vnnMap.set(item.vnn, {
          ...item,
          orderCount: 1,
          totalWeight: item.weight || 0,
          orders: [item],
          orderNumbers: item.order ? [item.order] : []
        });
      } else {
        const existing = vnnMap.get(item.vnn);
        existing.orderCount += 1;
        existing.totalWeight += (item.weight || 0);
        existing.orders.push(item);
        if (item.order && !existing.orderNumbers.includes(item.order)) existing.orderNumbers.push(item.order);
        
        if (!existing.order && item.order) existing.order = item.order;
        if (!existing.from && item.from) existing.from = item.from;
        if (!existing.to && item.to) existing.to = item.to;
      }
    });
    
    return Array.from(vnnMap.values());
  };

  // Only fetch when permissions are loaded and user has view permission
  useEffect(() => {
    if (!permissionLoading) {
      if (canView(MODULE_NAME)) {
        fetchNegotiations();
      } else {
        setLoading(false);
      }
    }
  }, [permissionLoading, canView, fetchNegotiations]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchNegotiations();
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      approvalStatus: "",
      memoStatus: "",
      fromDate: "",
      toDate: ""
    });
    setTimeout(() => fetchNegotiations(), 100);
  };

  const handleDelete = async (vnId, vnnNo) => {
    if (!canDelete(MODULE_NAME)) {
      alert('You don\'t have permission to delete vehicle negotiations');
      return;
    }

    if (!confirm(`Are you sure you want to delete Vehicle Negotiation ${vnnNo}?`)) {
      return;
    }

    setDeleteLoading(vnId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/vehicle-negotiation?id=${vnId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.success) {
        setNegotiations(prev => prev.filter(item => item.vnId !== vnId));
        alert('Vehicle Negotiation deleted successfully!');
      } else {
        alert(data.message || 'Failed to delete vehicle negotiation');
      }
    } catch (err) {
      console.error('Error deleting vehicle negotiation:', err);
      alert('Failed to delete vehicle negotiation');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleEdit = (vnId) => {
    if (!canEdit(MODULE_NAME)) {
      alert('You don\'t have permission to edit vehicle negotiations');
      return;
    }
    router.push(`/admin/vehicle-negotiation/${vnId}`);
  };

  // Navigate directly to the approval page with the correct route
  const handleApprove = (vnId) => {
    if (!canApprove(MODULE_NAME)) {
      alert('You don\'t have permission to approve vehicle negotiations');
      return;
    }
    // Navigate to the approval page with the negotiation ID
    router.push(`/admin/vehicle-negotiation/approve/${vnId}`);
  };

  const handleCreateNew = () => {
    if (!canCreate(MODULE_NAME)) {
      alert('You don\'t have permission to create vehicle negotiations');
      return;
    }
    router.push('/admin/vehicle-negotiation/create');
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
            You don't have permission to access Vehicle Negotiations.
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
              Vehicle Negotiation Management
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage all vehicle negotiations in one place
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
              Create New Negotiation
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
          <h2 className="text-sm font-bold text-slate-700 mb-3">Filter Negotiations</h2>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-3">
              <input
                type="text"
                placeholder="Search by VNN, Party, Vendor..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
              />
            </div>
            <div className="col-span-12 md:col-span-2">
              <select
                value={filters.approvalStatus}
                onChange={(e) => handleFilterChange('approvalStatus', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
              >
                <option value="">All Approval Status</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Reject">Reject</option>
              </select>
            </div>
            <div className="col-span-12 md:col-span-2">
              <select
                value={filters.memoStatus}
                onChange={(e) => handleFilterChange('memoStatus', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
              >
                <option value="">All Memo Status</option>
                <option value="Uploaded">Uploaded</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            <div className="col-span-12 md:col-span-2">
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
              />
            </div>
            <div className="col-span-12 md:col-span-2">
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
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

        {/* Negotiations Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-yellow-400 border-b border-yellow-500">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">VNN No</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Party Name</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">From → To</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Total Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Approval</th>
                  <th className="px-4 py-3 text-left text-xs font-extrabold text-slate-900 uppercase tracking-wider">Memo</th>
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
                ) : negotiations.length > 0 ? (
                  negotiations.map((item, index) => (
                    <tr key={item.vnId} className="hover:bg-yellow-50 transition">
                      <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                      <td className="px-4 py-3 text-slate-600">{item.date}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <button onClick={() => router.push(`/admin/vehicle-negotiation/${item.vnId}/view`)} className="hover:text-indigo-600 hover:underline">{item.vnn}</button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-48 flex-wrap gap-1">
                          {item.orderNumbers.map((orderNo) => <span key={orderNo} className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">{orderNo}</span>)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{item.partyName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-600">{item.vendorName || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <span>{item.from || '-'}</span>
                          <span className="mx-1 text-slate-400">→</span>
                          <span>{item.to || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{item.totalWeight} kg</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.approval === 'Approved' ? 'bg-green-100 text-green-800' :
                          item.approval === 'Reject' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.approval || 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.memo === 'Uploaded' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.memo || 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          {/* Edit Button - Only shown if user has edit permission */}
                          {canEdit(MODULE_NAME) && (
                            <button
                              onClick={() => handleEdit(item.vnId)}
                              className="p-2 bg-sky-100 text-sky-700 rounded-lg hover:bg-sky-200 transition"
                              title="Edit Vehicle Negotiation"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          
                          {/* ✅ Approve Button - Only shown if user has approve permission */}
                          {canApprove(MODULE_NAME) && (
                            <button
                              onClick={() => handleApprove(item.vnId)}
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                              title="Approve/Review Vehicle Negotiation"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                          
                          {/* Delete Button - Only shown if user has delete permission */}
                          {canDelete(MODULE_NAME) && (
                            <button
                              onClick={() => handleDelete(item.vnId, item.vnn)}
                              disabled={deleteLoading === item.vnId}
                              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
                              title="Delete Vehicle Negotiation"
                            >
                              {deleteLoading === item.vnId ? (
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <p className="text-lg font-medium mb-2">No vehicle negotiations found</p>
                        <p className="text-sm mb-4">Get started by creating your first vehicle negotiation</p>
                        {canCreate(MODULE_NAME) && (
                          <button
                            onClick={handleCreateNew}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition text-sm font-bold"
                          >
                            Create New Negotiation
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
          {negotiations.length > 0 && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-600">
              Total {negotiations.length} negotiation{negotiations.length !== 1 ? 's' : ''} found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
