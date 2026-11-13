'use client';

import { useState, useEffect } from 'react';
import { canUseMasterPermission } from '@/lib/masterPermissionRegistry';

export default function PlantPage() {
  const [plants, setPlants] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [editingPlantId, setEditingPlantId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState(null);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const canView = canUseMasterPermission(session, 'Plants', 'view');
  const canCreate = canUseMasterPermission(session, 'Plants', 'create');
  const canEdit = canUseMasterPermission(session, 'Plants', 'edit');
  const canDelete = (session?.type === 'company' || session?.roles?.includes('Admin')) && canUseMasterPermission(session, 'Plants', 'delete');
  const cancelEdit = () => { setEditingPlantId(null); setName(''); setCode(''); setError(null); };
  const editPlant = plant => {
    if (!canEdit || saving) return;
    setEditingPlantId(plant._id); setName(plant.name); setCode(plant.code); setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ Fetch Plants
  const fetchPlants = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/plants', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPlants(data.data);
      } else {
        setPlants([]);
        setError(data.message || 'Failed to load plants');
      }
    } catch (error) {
      console.error('Error fetching plants:', error.message);
      setError('Failed to load plants');
      setPlants([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Add Plant
  const addPlant = async (e) => {
    e.preventDefault();
    if (saving || (editingPlantId ? !canEdit : !canCreate)) return;
    if (!name.trim() || !code.trim()) { setError('Plant name and code are required'); return; }
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(editingPlantId ? `/api/plants?id=${encodeURIComponent(editingPlantId)}` : '/api/plants', {
        method: editingPlantId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to save plant');
        return;
      }
      cancelEdit();
      await fetchPlants();
    } catch (error) {
      console.error('Error adding plant:', error.message);
      setError('Failed to save plant.');
    } finally { setSaving(false); }
  };

  // ✅ Delete Plant
  const deletePlant = async (id) => {
    if (!canDelete || saving || !window.confirm('Delete this plant?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/plants?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to delete plant');
        return;
      }
      setError(null);
      fetchPlants();
    } catch (error) {
      console.error('Error deleting plant:', error.message);
      setError('Failed to delete plant.');
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data.user) throw new Error(data.message || data.msg || 'Unable to load permissions');
        if (!active) return;
        setSession(data.user);
        if (canUseMasterPermission(data.user, 'Plants', 'view')) await fetchPlants();
      } catch (err) { if (active) { setSession(null); setError(err.message); } }
      finally { if (active) setPermissionsLoading(false); }
    };
    load();
    window.addEventListener('erp:user-session-updated', load);
    return () => { active = false; window.removeEventListener('erp:user-session-updated', load); };
  }, []);

  if (permissionsLoading) return <div className="p-4">Loading permissions...</div>;
  if (!canView) return <div role="alert" className="p-4 text-red-600">{error || 'You do not have permission to view Plants.'}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Plant Master</h1>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {(editingPlantId ? canEdit : canCreate) && <form onSubmit={addPlant} className="mb-6">
        <input disabled={saving}
          type="text"
          placeholder="Plant Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border px-4 py-2 mr-2"
          required
        />
        <input disabled={saving}
          type="text"
          placeholder="Plant Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="border px-4 py-2 mr-2"
          required
        />
        <button type="submit" disabled={saving} className="bg-blue-500 text-white px-4 py-2 disabled:opacity-50">
          {saving ? "Saving..." : editingPlantId ? "Update Plant" : "Add Plant"}
        </button>
        {editingPlantId && <button type="button" onClick={cancelEdit} disabled={saving} className="ml-2 bg-gray-200 px-4 py-2">Cancel</button>}
      </form>}

      {loading ? (
        <div className="mb-4">Loading plants...</div>
      ) : (
        <ul>
          {plants.length > 0 ? (
            plants.map((plant) => (
              <li key={plant._id} className="flex justify-between items-center border-b py-2">
                <span>
                  {plant.name} ({plant.code})
                </span>
                <div className="flex gap-2">
                {canEdit && <button type="button" onClick={() => editPlant(plant)} disabled={saving} className="bg-blue-500 text-white px-2 py-1 disabled:opacity-50">Edit</button>}
                {canDelete && <button type="button" disabled={saving}
                  onClick={() => deletePlant(plant._id)}
                  className="bg-red-500 text-white px-2 py-1"
                >
                  Delete
                </button>}
                </div>
              </li>
            ))
          ) : (
            <li>No plants found</li>
          )}
        </ul>
      )}
    </div>
  );
}