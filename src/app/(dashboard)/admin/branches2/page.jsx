'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BranchPage() {
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Fetch Branches
  const fetchBranches = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/branches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setBranches(data.data);
      } else {
        setBranches([]);
        setError(data.message || 'Failed to load branches');
      }
    } catch (error) {
      console.error('Error fetching branches:', error.message);
      setError('Failed to load branches');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Add Branch
  const saveBranch = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(editingBranchId ? `/api/branches?id=${editingBranchId}` : '/api/branches', {
        method: editingBranchId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || `Failed to ${editingBranchId ? 'update' : 'add'} branch`);
        return;
      }
      setName('');
      setCode('');
      setEditingBranchId(null);
      setError(null);
      fetchBranches();
      
      // Ask user if they want to return to Order Panel
      if (!editingBranchId) setTimeout(() => {
        const returnToOrderPanel = window.confirm(
          `Branch "${data.data?.name || name}" created successfully!\n\nDo you want to return to Order Panel?`
        );
        if (returnToOrderPanel) {
          router.push('/admin/order-panel'); // Your order panel route
        }
      }, 500);
      
    } catch (error) {
      console.error('Error saving branch:', error.message);
      setError(`Failed to ${editingBranchId ? 'update' : 'add'} branch.`);
    }
  };

  const editBranch = (branch) => {
    setEditingBranchId(branch._id);
    setName(branch.name || '');
    setCode(branch.code || '');
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingBranchId(null);
    setName('');
    setCode('');
    setError(null);
  };

  // ✅ Delete Branch
  const deleteBranch = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/branches?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to delete branch');
        return;
      }
      setError(null);
      fetchBranches();
    } catch (error) {
      console.error('Error deleting branch:', error.message);
      setError('Failed to delete branch.');
    }
  };

  // ✅ Return to Order Panel
  const returnToOrderPanel = () => {
    router.push('/admin/order-panel'); // Your order panel route
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Branch Master</h1>
        <button
          onClick={returnToOrderPanel}
          className="bg-blue-500 text-white px-4 py-2"
        >
          ← Back to Order Panel
        </button>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <form onSubmit={saveBranch} className="mb-6">
        <input
          type="text"
          placeholder="Branch Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border px-4 py-2 mr-2"
          required
        />
        <input
          type="text"
          placeholder="Branch Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="border px-4 py-2 mr-2"
          required
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2">
          {editingBranchId ? 'Save Changes' : 'Add Branch'}
        </button>
        {editingBranchId && <button type="button" onClick={cancelEdit} className="ml-2 border px-4 py-2">Cancel</button>}
      </form>

      {loading ? (
        <div className="mb-4">Loading branches...</div>
      ) : (
        <ul>
          {branches.length > 0 ? (
            branches.map((branch) => (
              <li key={branch._id} className="flex justify-between items-center border-b py-2">
                <span>
                  {branch.name} ({branch.code})
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => editBranch(branch)} className="bg-amber-500 text-white px-2 py-1">Edit</button>
                  <button type="button" onClick={() => deleteBranch(branch._id)} className="bg-red-500 text-white px-2 py-1">Delete</button>
                </div>
              </li>
            ))
          ) : (
            <li>No branches found</li>
          )}
        </ul>
      )}
    </div>
  );
}
