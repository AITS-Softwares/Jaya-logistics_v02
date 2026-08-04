// src/app/(dashboard)/admin/subcompanies/page.js
'use client';

import { useState, useEffect } from 'react';

export default function SubCompanyPage() {
  const [subCompanies, setSubCompanies] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // ✅ Fetch Sub-Companies
  const fetchSubCompanies = async (page = 1, search = '') => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const url = `/api/subcompanies?page=${page}&limit=10${search ? `&search=${search}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.success && Array.isArray(data.data)) {
        setSubCompanies(data.data);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setSubCompanies([]);
        setError(data.message || 'Failed to load sub-companies');
      }
    } catch (error) {
      console.error('Error fetching sub-companies:', error.message);
      setError('Failed to load sub-companies. Please check if the API endpoint exists.');
      setSubCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Add Sub-Company
  const addSubCompany = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Sub-company name is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/subcompanies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.message || 'Failed to add sub-company');
        return;
      }

      setName('');
      setSuccessMessage(data.message || 'Sub-company added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchSubCompanies(pagination.page, searchTerm);
    } catch (error) {
      console.error('Error adding sub-company:', error.message);
      setError('Failed to add sub-company.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete Sub-Company
  const deleteSubCompany = async (id) => {
    if (!confirm('Are you sure you want to delete this sub-company?')) return;

    setDeletingId(id);
    setError(null);
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/subcompanies?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.message || 'Failed to delete sub-company');
        return;
      }

      setSuccessMessage(data.message || 'Sub-company deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchSubCompanies(pagination.page, searchTerm);
    } catch (error) {
      console.error('Error deleting sub-company:', error.message);
      setError('Failed to delete sub-company.');
    } finally {
      setDeletingId(null);
    }
  };

  // ✅ Search Handler
  const handleSearch = (e) => {
    e.preventDefault();
    fetchSubCompanies(1, searchTerm);
  };

  // ✅ Page Change Handler
  const handlePageChange = (newPage) => {
    fetchSubCompanies(newPage, searchTerm);
  };

  useEffect(() => {
    fetchSubCompanies();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Sub-Company Master</h1>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Add Sub-Company Form */}
      <form onSubmit={addSubCompany} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Enter Sub-Company Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border px-4 py-2 rounded flex-1"
          required
          disabled={loading}
        />
        <button 
          type="submit" 
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Sub-Company'}
        </button>
      </form>

      {/* Search Bar */}
      <div className="mb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border px-4 py-2 rounded flex-1"
          />
          <button 
            type="submit" 
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Search
          </button>
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                fetchSubCompanies(1, '');
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Sub-Companies List */}
      {loading && !deletingId ? (
        <div className="text-center py-4">Loading sub-companies...</div>
      ) : (
        <>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {subCompanies.length > 0 ? (
                subCompanies.map((subCompany) => (
                  <li key={subCompany._id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <div className="font-medium text-gray-900">
                        {subCompany.name}
                      </div>
                      <div className="text-sm">
                        Code: <span className="font-mono font-bold text-blue-600">{subCompany.code}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Created: {new Date(subCompany.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSubCompany(subCompany._id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50 text-sm"
                      disabled={deletingId === subCompany._id}
                    >
                      {deletingId === subCompany._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-6 py-4 text-center text-gray-500">
                  No sub-companies found
                </li>
              )}
            </ul>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
              >
                Previous
              </button>
              <span className="px-3 py-1">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          )}

          {/* Total Count */}
          {pagination.total > 0 && (
            <div className="mt-2 text-center text-sm text-gray-500">
              Total: {pagination.total} sub-company{pagination.total !== 1 ? 'ies' : 'y'}
            </div>
          )}
        </>
      )}
    </div>
  );
}