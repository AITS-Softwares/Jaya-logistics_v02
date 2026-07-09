

// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';

// export default function RateMasterManagePage() {
//   const router = useRouter();
  
//   const [title, setTitle] = useState('');
//   const [customerId, setCustomerId] = useState('');
//   const [branchId, setBranchId] = useState('');
//   const [weightRule, setWeightRule] = useState('all_weights');
//   const [approvalOption, setApprovalOption] = useState('contract_rate');
  
//   const [customers, setCustomers] = useState([]);
//   const [branches, setBranches] = useState([]);
//   const [rateMasters, setRateMasters] = useState([]);
//   const [filteredMasters, setFilteredMasters] = useState([]);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [locations, setLocations] = useState([]);
//   const [sortedLocations, setSortedLocations] = useState([]);
  
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [success, setSuccess] = useState(null);
//   const [formError, setFormError] = useState(null);
//   const [formSuccess, setFormSuccess] = useState(null);
  
//   const [selectedMasterId, setSelectedMasterId] = useState(null);
//   const [selectedMaster, setSelectedMaster] = useState(null);
//   const [locationRows, setLocationRows] = useState([]);
//   const [addingRates, setAddingRates] = useState(false);
//   const [showAddForm, setShowAddForm] = useState(false);
  
//   const [locationFilterTerm, setLocationFilterTerm] = useState('');
  
//   const [showRevisionModal, setShowRevisionModal] = useState(false);
//   const [revisionRate, setRevisionRate] = useState(null);
//   const [revisionFromQty, setRevisionFromQty] = useState('');
//   const [revisionToQty, setRevisionToQty] = useState('');
//   const [revisionRateValue, setRevisionRateValue] = useState('');
//   const [revisionCreatedDate, setRevisionCreatedDate] = useState('');
  
//   const [showHistory, setShowHistory] = useState(false);
//   const [historyData, setHistoryData] = useState([]);
//   const [selectedHistoryLocation, setSelectedHistoryLocation] = useState(null);
  
//   // State for editing rate createdAt date
//   const [editingRateId, setEditingRateId] = useState(null);
//   const [editingDateValue, setEditingDateValue] = useState('');

//   const fetchCustomers = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/customers', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) {
//         setCustomers(data.data);
//       }
//     } catch (error) {
//       console.error('Error fetching customers:', error);
//     }
//   };

//   const fetchBranches = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/branches', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) {
//         setBranches(data.data);
//       }
//     } catch (error) {
//       console.error('Error fetching branches:', error);
//     }
//   };

//   const fetchLocations = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/locations', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) {
//         const sorted = [...data.data].sort((a, b) => 
//           a.name?.toLowerCase().localeCompare(b.name?.toLowerCase())
//         );
//         setLocations(data.data);
//         setSortedLocations(sorted);
//       }
//     } catch (error) {
//       console.error('Error fetching locations:', error);
//     }
//   };

//   const fetchRateMasters = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/rate-master', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
      
//       if (data.success && Array.isArray(data.data)) {
//         setRateMasters(data.data);
//         setFilteredMasters(data.data);
//       } else {
//         setRateMasters([]);
//         setFilteredMasters([]);
//       }
//     } catch (error) {
//       console.error('Error fetching rate masters:', error);
//       setError('Failed to load rate masters');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchSingleRateMaster = async (masterId) => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch(`/api/rate-master?id=${masterId}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
      
//       if (data.success && data.data) {
//         setSelectedMaster(data.data);
//         return data.data;
//       }
//       return null;
//     } catch (error) {
//       console.error('Error fetching rate master:', error);
//       setError('Failed to load rate master details');
//       return null;
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchHistory = async (masterId, locationId) => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch(`/api/rate-master?id=${masterId}&history=true&locationId=${locationId}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
      
//       if (data.success) {
//         setHistoryData(data.data);
//         setShowHistory(true);
//       }
//     } catch (error) {
//       console.error('Error fetching history:', error);
//       setError('Failed to load history');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     if (!title.trim()) {
//       setFormError('Please enter rate master title');
//       return;
//     }
//     if (!customerId) {
//       setFormError('Please select a customer');
//       return;
//     }
//     if (!branchId) {
//       setFormError('Please select a branch');
//       return;
//     }
//     if (!approvalOption) {
//       setFormError('Please select approval option');
//       return;
//     }
    
//     setLoading(true);
//     setFormError(null);
    
//     try {
//       const token = localStorage.getItem('token');
//       const payload = {
//         title: title.trim(),
//         customerId: customerId,
//         branchId: branchId,
//         weightRule: weightRule,
//         approvalOption: approvalOption,
//         locationRates: []
//       };
      
//       const res = await fetch('/api/rate-master', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(payload),
//       });
      
//       const data = await res.json();
      
//       if (!res.ok) {
//         throw new Error(data.message || 'Failed to create rate master');
//       }
      
//       setFormSuccess('Rate master created successfully!');
      
//       setTitle('');
//       setCustomerId('');
//       setBranchId('');
//       setWeightRule('all_weights');
//       setApprovalOption('contract_rate');
      
//       fetchRateMasters();
      
//       setTimeout(() => {
//         setFormSuccess(null);
//       }, 3000);
      
//     } catch (error) {
//       console.error('Error creating rate master:', error);
//       setFormError(error.message);
//       setTimeout(() => setFormError(null), 3000);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const deleteRateMaster = async (id) => {
//     if (!confirm('Are you sure you want to delete this rate master?')) return;
    
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch(`/api/rate-master?id=${id}`, {
//         method: 'DELETE',
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (!res.ok) {
//         throw new Error(data.message || 'Failed to delete rate master');
//       }
      
//       if (selectedMasterId === id) {
//         setSelectedMasterId(null);
//         setSelectedMaster(null);
//         setShowAddForm(false);
//       }
      
//       fetchRateMasters();
//       setSuccess('Rate master deleted successfully!');
//       setTimeout(() => setSuccess(null), 3000);
//     } catch (error) {
//       console.error('Error deleting rate master:', error);
//       setError(error.message);
//       setTimeout(() => setError(null), 3000);
//     }
//   };

//   const deleteSingleRate = async (rateId) => {
//     if (!confirm('Are you sure you want to delete this rate?')) return;
    
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch(`/api/rate-master?id=${selectedMaster._id}&rateId=${rateId}`, {
//         method: 'DELETE',
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
      
//       if (!res.ok) {
//         throw new Error(data.message || 'Failed to delete rate');
//       }
      
//       setSuccess('Rate deleted successfully!');
//       setTimeout(() => setSuccess(null), 3000);
//       await fetchSingleRateMaster(selectedMaster._id);
//       await fetchRateMasters();
      
//     } catch (error) {
//       console.error('Error deleting rate:', error);
//       setError(error.message);
//       setTimeout(() => setError(null), 3000);
//     }
//   };

//   const openRevisionModal = (rate) => {
//     setRevisionRate(rate);
//     setRevisionFromQty(rate.fromQty);
//     setRevisionToQty(rate.toQty);
//     setRevisionRateValue(rate.rate);
//     // Set the created date to the rate's existing createdAt date
//     const currentDate = rate.createdAt ? new Date(rate.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
//     setRevisionCreatedDate(currentDate);
//     setShowRevisionModal(true);
//   };

//   const submitRevision = async () => {
//     if (!revisionRate) return;
    
//     const fromQty = parseFloat(revisionFromQty);
//     const toQty = parseFloat(revisionToQty);
//     const rate = parseFloat(revisionRateValue);
    
//     if (isNaN(fromQty) || isNaN(toQty) || isNaN(rate)) {
//       setError('Please enter valid numbers');
//       return;
//     }
    
//     if (fromQty >= toQty) {
//       setError('From quantity must be less than To quantity');
//       return;
//     }
    
//     if (fromQty < 0 || toQty < 0 || rate < 0) {
//       setError('Values cannot be negative');
//       return;
//     }
    
//     if (selectedMaster.weightRule === 'above_25' && fromQty < 25) {
//       setError(`Weight must start from 25 kg or above`);
//       return;
//     }
    
//     setAddingRates(true);
//     setError(null);
    
//     try {
//       const token = localStorage.getItem('token');
      
//       const payload = {
//         title: selectedMaster.title,
//         customerId: selectedMaster.customerId,
//         branchId: selectedMaster.branchId,
//         weightRule: selectedMaster.weightRule,
//         approvalOption: selectedMaster.approvalOption,
//         rateId: revisionRate._id,
//         locationRates: [{
//           locationId: revisionRate.locationId,
//           fromQty: fromQty,
//           toQty: toQty,
//           rate: rate,
//           createdAt: revisionCreatedDate ? new Date(revisionCreatedDate) : null
//         }]
//       };
      
//       const res = await fetch(`/api/rate-master?id=${selectedMaster._id}`, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(payload),
//       });
      
//       const data = await res.json();
      
//       if (!res.ok) {
//         throw new Error(data.message || 'Failed to revise rate');
//       }
      
//       setSuccess(`Rate revised successfully! Old rate moved to history.`);
//       setTimeout(() => setSuccess(null), 3000);
      
//       setShowRevisionModal(false);
//       setRevisionRate(null);
//       await fetchSingleRateMaster(selectedMaster._id);
//       await fetchRateMasters();
      
//     } catch (error) {
//       console.error('Error revising rate:', error);
//       setError(error.message);
//       setTimeout(() => setError(null), 3000);
//     } finally {
//       setAddingRates(false);
//     }
//   };

//   // Function to update rate createdAt date (saves to backend)
//   const updateRateCreatedDate = async (rateId, newDate) => {
//     if (!selectedMaster) return;
    
//     setLoading(true);
//     try {
//       const token = localStorage.getItem('token');
      
//       // Find the rate to update
//       const rateToUpdate = selectedMaster.locationRates.find(r => r._id === rateId);
//       if (!rateToUpdate) return;
      
//       const payload = {
//         title: selectedMaster.title,
//         customerId: selectedMaster.customerId,
//         branchId: selectedMaster.branchId,
//         weightRule: selectedMaster.weightRule,
//         approvalOption: selectedMaster.approvalOption,
//         rateId: rateId,
//         locationRates: [{
//           locationId: rateToUpdate.locationId,
//           fromQty: rateToUpdate.fromQty,
//           toQty: rateToUpdate.toQty,
//           rate: rateToUpdate.rate,
//           createdAt: newDate ? new Date(newDate) : null
//         }]
//       };
      
//       const res = await fetch(`/api/rate-master?id=${selectedMaster._id}`, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(payload),
//       });
      
//       const data = await res.json();
      
//       if (!res.ok) {
//         throw new Error(data.message || 'Failed to update rate date');
//       }
      
//       setSuccess('Rate date updated successfully!');
//       setTimeout(() => setSuccess(null), 3000);
      
//       await fetchSingleRateMaster(selectedMaster._id);
//       await fetchRateMasters();
      
//     } catch (error) {
//       console.error('Error updating rate date:', error);
//       setError(error.message);
//       setTimeout(() => setError(null), 3000);
//     } finally {
//       setLoading(false);
//       setEditingRateId(null);
//     }
//   };

//   const startEditDate = (rateId, currentDate) => {
//     setEditingRateId(rateId);
//     const dateValue = currentDate ? new Date(currentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
//     setEditingDateValue(dateValue);
//   };

//   const cancelEditDate = () => {
//     setEditingRateId(null);
//     setEditingDateValue('');
//   };

//   const getWeightRuleLabel = (rule) => {
//     return rule === 'above_25' ? 'Above 25 kg' : 'All Weights';
//   };

//   const getApprovalLabel = (option) => {
//     return option === 'contract_rate' ? 'Contract Rate' : 'Mail Approval';
//   };

//   const formatDate = (dateString) => {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-GB', {
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   const formatDateOnly = (dateString) => {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-GB', {
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric'
//     });
//   };

//   const addLocationRow = () => {
//     setLocationRows([
//       ...locationRows,
//       { id: Date.now(), locationId: '', fromQty: '', toQty: '', rate: '', createdAt: '' }
//     ]);
//   };

//   const removeLocationRow = (rowId) => {
//     if (locationRows.length > 1) {
//       setLocationRows(locationRows.filter(row => row.id !== rowId));
//     } else {
//       setError("At least one location is required");
//       setTimeout(() => setError(null), 3000);
//     }
//   };

//   const updateLocationRow = (rowId, field, value) => {
//     setLocationRows(locationRows.map(row => 
//       row.id === rowId ? { ...row, [field]: value } : row
//     ));
//   };

//   const handleAddRates = async () => {
//     if (!selectedMaster) return;
    
//     const validRows = locationRows.filter(row => row.locationId && row.fromQty && row.toQty && row.rate);
    
//     if (validRows.length === 0) {
//       setError('Please add at least one location with complete details');
//       return;
//     }
    
//     const newRates = [];
//     for (let row of validRows) {
//       const fromQty = parseFloat(row.fromQty);
//       const toQty = parseFloat(row.toQty);
//       const rate = parseFloat(row.rate);
      
//       if (isNaN(fromQty) || isNaN(toQty) || isNaN(rate)) {
//         setError('Please enter valid numbers for quantity and rate');
//         return;
//       }
      
//       if (fromQty >= toQty) {
//         setError(`From quantity (${fromQty}) must be less than To quantity (${toQty})`);
//         return;
//       }
      
//       if (fromQty < 0 || toQty < 0 || rate < 0) {
//         setError('Quantities and rate cannot be negative');
//         return;
//       }
      
//       if (selectedMaster.weightRule === 'above_25' && fromQty < 25) {
//         setError(`Weight must start from 25 kg or above. Current from weight: ${fromQty} kg`);
//         return;
//       }
      
//       const location = locations.find(l => l._id === row.locationId);
//       newRates.push({
//         locationId: row.locationId,
//         fromQty,
//         toQty,
//         rate,
//         locationName: location?.name || 'Unknown',
//         isActive: true,
//         version: 1,
//         createdAt: row.createdAt ? new Date(row.createdAt) : new Date()
//       });
//     }
    
//     setAddingRates(true);
//     setError(null);
    
//     try {
//       const token = localStorage.getItem('token');
//       const existingRates = selectedMaster.locationRates || [];
//       const allRates = [...existingRates, ...newRates];
      
//       const payload = {
//         title: selectedMaster.title,
//         customerId: selectedMaster.customerId,
//         branchId: selectedMaster.branchId,
//         weightRule: selectedMaster.weightRule,
//         approvalOption: selectedMaster.approvalOption,
//         locationRates: allRates.map(r => ({
//           locationId: r.locationId,
//           fromQty: r.fromQty,
//           toQty: r.toQty,
//           rate: r.rate,
//           isActive: r.isActive !== undefined ? r.isActive : true,
//           version: r.version || 1,
//           createdAt: r.createdAt || new Date()
//         }))
//       };
      
//       const res = await fetch(`/api/rate-master?id=${selectedMaster._id}`, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(payload),
//       });
      
//       const data = await res.json();
      
//       if (!res.ok) {
//         throw new Error(data.message || 'Failed to add location rates');
//       }
      
//       setSuccess('Location rates added successfully!');
//       setTimeout(() => setSuccess(null), 3000);
      
//       setLocationRows([]);
//       setShowAddForm(false);
//       await fetchSingleRateMaster(selectedMaster._id);
//       await fetchRateMasters();
      
//     } catch (error) {
//       console.error('Error adding location rates:', error);
//       setError(error.message);
//       setTimeout(() => setError(null), 3000);
//     } finally {
//       setAddingRates(false);
//     }
//   };

//   const viewHistory = async (locationId, locationName) => {
//     setSelectedHistoryLocation(locationName);
//     await fetchHistory(selectedMaster._id, locationId);
//   };

//   const handleViewRates = async (masterId) => {
//     if (selectedMasterId === masterId) {
//       setSelectedMasterId(null);
//       setSelectedMaster(null);
//       setShowAddForm(false);
//       setLocationRows([]);
//       setLocationFilterTerm('');
//       setShowHistory(false);
//     } else {
//       setSelectedMasterId(masterId);
//       await fetchSingleRateMaster(masterId);
//       setShowAddForm(false);
//       setLocationRows([]);
//       setLocationFilterTerm('');
//       setShowHistory(false);
//     }
//   };

//   const handleBackToList = () => {
//     setSelectedMasterId(null);
//     setSelectedMaster(null);
//     setShowAddForm(false);
//     setLocationRows([]);
//     setLocationFilterTerm('');
//     setShowHistory(false);
//   };

//   useEffect(() => {
//     if (rateMasters.length === 0) return;
    
//     let filtered = [...rateMasters];
    
//     if (searchTerm) {
//       filtered = filtered.filter(master =>
//         master.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         master.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         master.branchName?.toLowerCase().includes(searchTerm.toLowerCase())
//       );
//     }
    
//     setFilteredMasters(filtered);
//   }, [searchTerm, rateMasters]);

//   useEffect(() => {
//     fetchCustomers();
//     fetchBranches();
//     fetchLocations();
//     fetchRateMasters();
//   }, []);

//   return (
//     <div className="container mx-auto p-4">
//       <div className="bg-white rounded-lg shadow-md p-6 mb-6">
//         <div className="flex justify-between items-center">
//           <div>
//             <h1 className="text-2xl font-bold">Rate Master Management</h1>
//             <p className="text-gray-600">
//               {selectedMasterId ? `Viewing: ${selectedMaster?.title}` : 'Create and manage rate masters'}
//             </p>
//           </div>
//           <div className="flex gap-2">
//             {selectedMasterId && (
//               <button
//                 onClick={handleBackToList}
//                 className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
//               >
//                 ← Back to List
//               </button>
//             )}
//             <button
//               onClick={() => router.push('/admin/rate-master/create')}
//               className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
//             >
//               + Create New Rate Master
//             </button>
//           </div>
//         </div>
//       </div>

//       {formError && (
//         <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
//           {formError}
//         </div>
//       )}
      
//       {formSuccess && (
//         <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
//           {formSuccess}
//         </div>
//       )}
      
//       {error && (
//         <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
//           {error}
//         </div>
//       )}
      
//       {success && (
//         <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
//           {success}
//         </div>
//       )}

//       {!selectedMasterId && (
//         <div className="bg-white rounded-lg shadow-md p-6 mb-6">
//           <div className="mb-6">
//             <h2 className="text-xl font-bold">Create New Rate Master</h2>
//             <p className="text-gray-600">Enter basic information</p>
//           </div>
          
//           <form onSubmit={handleSubmit}>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Title <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   value={title}
//                   onChange={(e) => setTitle(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   placeholder="Enter rate master title"
//                   required
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Customer Name <span className="text-red-500">*</span>
//                 </label>
//                 <select
//                   value={customerId}
//                   onChange={(e) => setCustomerId(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 >
//                   <option value="">Select Customer</option>
//                   {customers.map((customer) => (
//                     <option key={customer._id} value={customer._id}>
//                       {customer.customerName} ({customer.customerCode})
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Branch <span className="text-red-500">*</span>
//                 </label>
//                 <select
//                   value={branchId}
//                   onChange={(e) => setBranchId(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 >
//                   <option value="">Select Branch</option>
//                   {branches.map((branch) => (
//                     <option key={branch._id} value={branch._id}>
//                       {branch.name} ({branch.code})
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Weight Rule <span className="text-red-500">*</span>
//                 </label>
//                 <select
//                   value={weightRule}
//                   onChange={(e) => setWeightRule(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 >
//                   <option value="all_weights">All Weights</option>
//                   <option value="above_25">Above 25 kg</option>
//                 </select>
//                 <p className="text-xs text-gray-500 mt-1">
//                   {weightRule === 'above_25' 
//                     ? 'Only applicable for weights above 25 kg' 
//                     : 'Applicable for all weight ranges'}
//                 </p>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Approval Option <span className="text-red-500">*</span>
//                 </label>
//                 <select
//                   value={approvalOption}
//                   onChange={(e) => setApprovalOption(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 >
//                   <option value="contract_rate">Contract Rate</option>
//                   <option value="mail_approval">Mail Approval</option>
//                 </select>
//               </div>
//             </div>

//             <div className="mt-6 flex gap-3">
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className={`px-6 py-2 rounded text-white ${
//                   loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
//                 }`}
//               >
//                 {loading ? 'Creating...' : 'Create Rate Master'}
//               </button>
//               <button
//                 type="button"
//                 onClick={() => {
//                   setTitle('');
//                   setCustomerId('');
//                   setBranchId('');
//                   setWeightRule('all_weights');
//                   setApprovalOption('contract_rate');
//                 }}
//                 className="px-6 py-2 rounded text-gray-700 bg-gray-200 hover:bg-gray-300"
//               >
//                 Reset
//               </button>
//             </div>
//           </form>
//         </div>
//       )}

//       {!selectedMasterId && (
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <div className="mb-6">
//             <h2 className="text-xl font-bold">Rate Masters List</h2>
//             <p className="text-gray-600">Click "Add/View Rates" to manage location rates</p>
//           </div>

//           <div className="mb-6">
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Search by Title, Customer or Branch
//             </label>
//             <input
//               type="text"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               placeholder="Type title, customer or branch to search..."
//               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           {loading && rateMasters.length === 0 ? (
//             <div className="text-center py-8">Loading rate masters...</div>
//           ) : filteredMasters.length === 0 ? (
//             <div className="text-center py-8 text-gray-500">
//               {searchTerm 
//                 ? `No rate masters found matching your search: "${searchTerm}"`
//                 : 'No rate masters found. Create your first rate master!'}
//             </div>
//           ) : (
//             <div className="overflow-x-auto">
//               <table className="min-w-full border border-gray-200">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th className="px-4 py-3 border text-left text-sm font-semibold">S.No</th>
//                     <th className="px-4 py-3 border text-left text-sm font-semibold">Title</th>
//                     <th className="px-4 py-3 border text-left text-sm font-semibold">Customer</th>
//                     <th className="px-4 py-3 border text-left text-sm font-semibold">Branch</th>
//                     <th className="px-4 py-3 border text-left text-sm font-semibold">Weight Rule</th>
//                     <th className="px-4 py-3 border text-left text-sm font-semibold">Approval</th>
//                     <th className="px-4 py-3 border text-left text-sm font-semibold">Status</th>
//                     <th className="px-4 py-3 border text-left text-sm font-semibold">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {filteredMasters.map((master, index) => (
//                     <tr key={master._id} className="hover:bg-gray-50">
//                       <td className="px-4 py-2 border text-sm">{index + 1}</td>
//                       <td className="px-4 py-2 border text-sm font-medium">{master.title}</td>
//                       <td className="px-4 py-2 border text-sm">{master.customerName}</td>
//                       <td className="px-4 py-2 border text-sm">{master.branchName}</td>
//                       <td className="px-4 py-2 border text-sm">
//                         <span className={`px-2 py-1 rounded text-xs ${
//                           master.weightRule === 'above_25' 
//                             ? 'bg-orange-100 text-orange-800' 
//                             : 'bg-blue-100 text-blue-800'
//                         }`}>
//                           {getWeightRuleLabel(master.weightRule)}
//                         </span>
//                        </td>
//                       <td className="px-4 py-2 border text-sm">
//                         <span className={`px-2 py-1 rounded text-xs ${
//                           master.approvalOption === 'contract_rate' 
//                             ? 'bg-green-100 text-green-800' 
//                             : 'bg-purple-100 text-purple-800'
//                         }`}>
//                           {getApprovalLabel(master.approvalOption)}
//                         </span>
//                        </td>
//                       <td className="px-4 py-2 border text-sm">
//                         <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
//                           {master.locationRates?.filter(r => r.isActive !== false).length || 0} Active | {master.locationRates?.filter(r => r.isActive === false).length || 0} History
//                         </span>
//                        </td>
//                       <td className="px-4 py-2 border text-sm">
//                         <div className="flex gap-2">
//                           <button
//                             onClick={() => handleViewRates(master._id)}
//                             className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-xs whitespace-nowrap"
//                           >
//                             Add/View Rates
//                           </button>
//                           <button
//                             onClick={() => router.push(`/admin/rate-master/edit/${master._id}`)}
//                             className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-xs"
//                           >
//                             Edit
//                           </button>
//                           <button
//                             onClick={() => deleteRateMaster(master._id)}
//                             className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-xs"
//                           >
//                             Delete
//                           </button>
//                         </div>
//                        </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>
//       )}

//       {selectedMasterId && selectedMaster && (
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg p-6 mb-6">
//             <div className="flex justify-between items-start">
//               <div>
//                 <h2 className="text-2xl font-bold">{selectedMaster.title}</h2>
//                 <p className="text-sm text-gray-300 mt-1">
//                   Customer: {selectedMaster.customerName} | Branch: {selectedMaster.branchName}
//                 </p>
//                 <div className="flex gap-3 mt-3 flex-wrap">
//                   <span className={`px-2 py-1 rounded text-xs ${
//                     selectedMaster.weightRule === 'above_25' 
//                       ? 'bg-orange-600 text-white' 
//                       : 'bg-green-600 text-white'
//                   }`}>
//                     {getWeightRuleLabel(selectedMaster.weightRule)}
//                   </span>
//                   <span className={`px-2 py-1 rounded text-xs ${
//                     selectedMaster.approvalOption === 'contract_rate' 
//                       ? 'bg-purple-600 text-white' 
//                       : 'bg-pink-600 text-white'
//                   }`}>
//                     {getApprovalLabel(selectedMaster.approvalOption)}
//                   </span>
//                   <span className="px-2 py-1 rounded text-xs bg-yellow-600 text-white">
//                     {selectedMaster.locationRates?.filter(r => r.isActive !== false).length || 0} Active | {selectedMaster.locationRates?.filter(r => r.isActive === false).length || 0} History
//                   </span>
//                 </div>
//                 {selectedMaster.weightRule === 'above_25' && (
//                   <div className="mt-3 p-2 bg-blue-900/30 rounded text-xs text-blue-200">
//                     ⚠️ <strong>Above 25 kg Rule:</strong> From weight must be 25 kg or above.
//                   </div>
//                 )}
//               </div>
//               <div className="flex gap-2">
//                 <button
//                   onClick={() => setShowAddForm(!showAddForm)}
//                   className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium"
//                 >
//                   {showAddForm ? 'Cancel' : '+ Add New Location'}
//                 </button>
//                 <button
//                   onClick={() => router.push(`/admin/rate-master/edit/${selectedMaster._id}`)}
//                   className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-sm"
//                 >
//                   Edit Master
//                 </button>
//               </div>
//             </div>
//           </div>

//           {showAddForm && (
//             <div className="mb-6 p-4 border rounded-lg bg-gray-50">
//               <h3 className="text-md font-semibold mb-3 text-gray-800">Add New Location Rates</h3>
//               <p className="text-sm text-gray-600 mb-3">⚠️ Weight ranges should not overlap with existing active rates.</p>
              
//               <div className="overflow-x-auto">
//                 <table className="min-w-full border border-gray-200 bg-white">
//                   <thead className="bg-gray-100">
//                     <tr>
//                       <th className="px-4 py-2 border text-left text-sm font-semibold">Location *</th>
//                       <th className="px-4 py-2 border text-left text-sm font-semibold">From Weight (kg)</th>
//                       <th className="px-4 py-2 border text-left text-sm font-semibold">To Weight (kg)</th>
//                       <th className="px-4 py-2 border text-left text-sm font-semibold">Rate (₹)</th>
//                       <th className="px-4 py-2 border text-left text-sm font-semibold">Created Date</th>
//                       <th className="px-4 py-2 border text-left text-sm font-semibold">Action</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {locationRows.map((row) => (
//                       <tr key={row.id}>
//                         <td className="px-4 py-2 border">
//                           <select
//                             value={row.locationId}
//                             onChange={(e) => updateLocationRow(row.id, 'locationId', e.target.value)}
//                             className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//                           >
//                             <option value="">Select Location</option>
//                             {sortedLocations.map((location) => (
//                               <option key={location._id} value={location._id}>
//                                 {location.name}
//                               </option>
//                             ))}
//                           </select>
//                         </td>
//                         <td className="px-4 py-2 border">
//                           <input
//                             type="number"
//                             step="0.01"
//                             value={row.fromQty}
//                             onChange={(e) => updateLocationRow(row.id, 'fromQty', e.target.value)}
//                             className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             placeholder="0.00"
//                           />
//                         </td>
//                         <td className="px-4 py-2 border">
//                           <input
//                             type="number"
//                             step="0.01"
//                             value={row.toQty}
//                             onChange={(e) => updateLocationRow(row.id, 'toQty', e.target.value)}
//                             className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             placeholder="100.00"
//                           />
//                         </td>
//                         <td className="px-4 py-2 border">
//                           <input
//                             type="number"
//                             step="0.01"
//                             value={row.rate}
//                             onChange={(e) => updateLocationRow(row.id, 'rate', e.target.value)}
//                             className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             placeholder="0.00"
//                             min="0"
//                           />
//                         </td>
//                         <td className="px-4 py-2 border">
//                           <input
//                             type="date"
//                             value={row.createdAt}
//                             onChange={(e) => updateLocationRow(row.id, 'createdAt', e.target.value)}
//                             className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//                           />
//                          </td>
//                         <td className="px-4 py-2 border text-center">
//                           <button
//                             type="button"
//                             onClick={() => removeLocationRow(row.id)}
//                             className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
//                           >
//                             Remove
//                           </button>
//                          </td>
//                        </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
              
//               <div className="flex justify-between mt-4">
//                 <button
//                   type="button"
//                   onClick={addLocationRow}
//                   className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
//                 >
//                   + Add Another Location
//                 </button>
//                 <button
//                   type="button"
//                   onClick={handleAddRates}
//                   disabled={addingRates}
//                   className={`px-6 py-2 rounded text-white ${
//                     addingRates ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
//                   }`}
//                 >
//                   {addingRates ? 'Saving...' : 'Save Location Rates'}
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* Revision Modal with Created Date */}
//           {showRevisionModal && revisionRate && (
//             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//               <div className="bg-white rounded-lg shadow-xl w-96 max-w-md">
//                 <div className="bg-orange-600 text-white px-6 py-3 rounded-t-lg flex justify-between items-center">
//                   <h3 className="text-lg font-semibold">Revise Rate</h3>
//                   <button
//                     onClick={() => {
//                       setShowRevisionModal(false);
//                       setRevisionRate(null);
//                     }}
//                     className="text-white hover:text-gray-200"
//                   >
//                     ✕
//                   </button>
//                 </div>
//                 <div className="p-6">
//                   <p className="text-sm text-gray-600 mb-4">
//                     Current Rate: {revisionRate.fromQty} - {revisionRate.toQty} kg → ₹{revisionRate.rate}
//                   </p>
//                   <p className="text-sm text-red-500 mb-4">
//                     ⚠️ Old rate will be moved to HISTORY under this location
//                   </p>
                  
//                   <div className="space-y-4">
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-1">
//                         From Weight (kg)
//                       </label>
//                       <input
//                         type="number"
//                         step="0.01"
//                         value={revisionFromQty}
//                         onChange={(e) => setRevisionFromQty(e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
//                       />
//                     </div>
                    
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-1">
//                         To Weight (kg)
//                       </label>
//                       <input
//                         type="number"
//                         step="0.01"
//                         value={revisionToQty}
//                         onChange={(e) => setRevisionToQty(e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
//                       />
//                     </div>
                    
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-1">
//                         Rate (₹)
//                       </label>
//                       <input
//                         type="number"
//                         step="0.01"
//                         value={revisionRateValue}
//                         onChange={(e) => setRevisionRateValue(e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
//                       />
//                     </div>
                    
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-1">
//                         Created Date
//                       </label>
//                       <input
//                         type="date"
//                         value={revisionCreatedDate}
//                         onChange={(e) => setRevisionCreatedDate(e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
//                       />
//                       <p className="text-xs text-gray-500 mt-1">Select the created date for this rate</p>
//                     </div>
//                   </div>
                  
//                   <div className="flex gap-3 mt-6">
//                     <button
//                       onClick={() => {
//                         setShowRevisionModal(false);
//                         setRevisionRate(null);
//                       }}
//                       className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
//                     >
//                       Cancel
//                     </button>
//                     <button
//                       onClick={submitRevision}
//                       disabled={addingRates}
//                       className={`flex-1 px-4 py-2 rounded text-white ${
//                         addingRates ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
//                       }`}
//                     >
//                       {addingRates ? 'Saving...' : 'Save Revision'}
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* History Modal */}
//           {showHistory && (
//             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//               <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-4xl max-h-[80vh] overflow-auto">
//                 <div className="bg-gray-800 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
//                   <h3 className="text-lg font-semibold">Rate History - {selectedHistoryLocation}</h3>
//                   <button
//                     onClick={() => setShowHistory(false)}
//                     className="text-white hover:text-gray-300"
//                   >
//                     ✕
//                   </button>
//                 </div>
//                 <div className="p-6">
//                   {historyData.length === 0 ? (
//                     <p className="text-center text-gray-500 py-8">No history found for this location</p>
//                   ) : (
//                     <div className="overflow-x-auto">
//                       <table className="min-w-full border border-gray-200">
//                         <thead className="bg-gray-50">
//                           <tr>
//                             <th className="px-4 py-2 border text-left text-sm font-semibold">Created Date</th>
//                             <th className="px-4 py-2 border text-left text-sm font-semibold">Version</th>
//                             <th className="px-4 py-2 border text-left text-sm font-semibold">From (kg)</th>
//                             <th className="px-4 py-2 border text-left text-sm font-semibold">To (kg)</th>
//                             <th className="px-4 py-2 border text-left text-sm font-semibold">Rate (₹)</th>
//                             <th className="px-4 py-2 border text-left text-sm font-semibold">Action</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {historyData.map((item, idx) => (
//                             <tr key={idx} className="hover:bg-gray-50">
//                               <td className="px-4 py-2 border text-sm">{formatDate(item.createdAt)}</td>
//                               <td className="px-4 py-2 border text-sm">
//                                 <span className="px-2 py-1 bg-gray-100 rounded text-xs">v{item.version}</span>
//                               </td>
//                               <td className="px-4 py-2 border text-sm">{item.fromQty}</td>
//                               <td className="px-4 py-2 border text-sm">{item.toQty}</td>
//                               <td className="px-4 py-2 border text-sm">
//                                 <span className="font-medium">₹ {item.rate}</span>
//                               </td>
//                               <td className="px-4 py-2 border text-sm">
//                                 <span className={`px-2 py-1 rounded text-xs ${
//                                   item.action === 'CREATED' ? 'bg-green-100 text-green-800' :
//                                   item.action === 'REVISED' ? 'bg-orange-100 text-orange-800' :
//                                   'bg-red-100 text-red-800'
//                                 }`}>
//                                   {item.action}
//                                 </span>
//                               </td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* Location Filter */}
//           {(selectedMaster.locationRates && selectedMaster.locationRates.length > 0) && (
//             <div className="mb-4">
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 🔍 Filter by Location Name
//               </label>
//               <div className="relative">
//                 <input
//                   type="text"
//                   value={locationFilterTerm}
//                   onChange={(e) => setLocationFilterTerm(e.target.value)}
//                   placeholder="Type location name to filter..."
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
//                 />
//                 <svg
//                   className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
//                   />
//                 </svg>
//                 {locationFilterTerm && (
//                   <button
//                     onClick={() => setLocationFilterTerm('')}
//                     className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
//                   >
//                     ✕
//                   </button>
//                 )}
//               </div>
//             </div>
//           )}

//           {/* Display Rates Grouped by Location */}
//           {selectedMaster.locationRates && selectedMaster.locationRates.length > 0 ? (
//             <div>
//               {(() => {
//                 const locationsMap = new Map();
                
//                 selectedMaster.locationRates.forEach(rate => {
//                   if (!locationsMap.has(rate.locationId)) {
//                     locationsMap.set(rate.locationId, {
//                       locationId: rate.locationId,
//                       locationName: rate.locationName,
//                       activeRates: [],
//                       inactiveRates: []
//                     });
//                   }
                  
//                   const locationData = locationsMap.get(rate.locationId);
//                   if (rate.isActive !== false) {
//                     locationData.activeRates.push(rate);
//                   } else {
//                     locationData.inactiveRates.push(rate);
//                   }
//                 });
                
//                 let allLocations = Array.from(locationsMap.values())
//                   .sort((a, b) => a.locationName.localeCompare(b.locationName));
                
//                 if (locationFilterTerm && locationFilterTerm.trim() !== '') {
//                   allLocations = allLocations.filter(loc =>
//                     loc.locationName?.toLowerCase().includes(locationFilterTerm.toLowerCase())
//                   );
//                 }
                
//                 return allLocations.map((location) => (
//                   <div key={location.locationId} className="mb-8 border rounded-lg overflow-hidden">
//                     <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-3">
//                       <h3 className="text-lg font-semibold">📍 {location.locationName}</h3>
//                     </div>
                    
//                     {/* Active Rates Table with Editable Created Date */}
//                     {location.activeRates.length > 0 && (
//                       <div className="p-4">
//                         <h4 className="text-md font-semibold text-green-700 mb-3">✅ Active Rates</h4>
//                         <div className="overflow-x-auto">
//                           <table className="min-w-full border border-gray-200">
//                             <thead className="bg-green-50">
//                               <tr>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">Created Date</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">Version</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">From Weight (kg)</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">To Weight (kg)</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">Rate (₹)</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">Actions</th>
//                               </tr>
//                             </thead>
//                             <tbody>
//                               {location.activeRates
//                                 .sort((a, b) => a.fromQty - b.fromQty)
//                                 .map((rate) => (
//                                   <tr key={rate._id} className="hover:bg-gray-50">
//                                     <td className="px-4 py-2 border text-sm">
//                                       {editingRateId === rate._id ? (
//                                         <div className="flex gap-2 items-center">
//                                           <input
//                                             type="date"
//                                             value={editingDateValue}
//                                             onChange={(e) => setEditingDateValue(e.target.value)}
//                                             className="px-2 py-1 border border-gray-300 rounded text-sm w-32"
//                                           />
//                                           <button
//                                             onClick={() => updateRateCreatedDate(rate._id, editingDateValue)}
//                                             className="bg-green-500 text-white px-2 py-1 rounded text-xs"
//                                           >
//                                             Save
//                                           </button>
//                                           <button
//                                             onClick={cancelEditDate}
//                                             className="bg-gray-500 text-white px-2 py-1 rounded text-xs"
//                                           >
//                                             Cancel
//                                           </button>
//                                         </div>
//                                       ) : (
//                                         <div className="flex items-center gap-2">
//                                           <span>{formatDateOnly(rate.createdAt)}</span>
//                                           <button
//                                             onClick={() => startEditDate(rate._id, rate.createdAt)}
//                                             className="text-blue-500 hover:text-blue-700 text-sm"
//                                             title="Edit created date"
//                                           >
//                                             📅
//                                           </button>
//                                         </div>
//                                       )}
//                                     </td>
//                                     <td className="px-4 py-2 border text-sm">
//                                       <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">v{rate.version || 1}</span>
//                                     </td>
//                                     <td className="px-4 py-2 border text-sm">{rate.fromQty}</td>
//                                     <td className="px-4 py-2 border text-sm">{rate.toQty}</td>
//                                     <td className="px-4 py-2 border text-sm">
//                                       <span className="font-medium text-green-600">₹ {rate.rate}</span>
//                                     </td>
//                                     <td className="px-4 py-2 border text-sm">
//                                       <div className="flex gap-2">
//                                         <button
//                                           onClick={() => openRevisionModal(rate)}
//                                           className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600"
//                                         >
//                                           Revise
//                                         </button>
//                                         <button
//                                           onClick={() => deleteSingleRate(rate._id)}
//                                           className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
//                                         >
//                                           Delete
//                                         </button>
//                                       </div>
//                                     </td>
//                                   </tr>
//                                 ))}
//                             </tbody>
//                           </table>
//                         </div>
//                         <button
//                           onClick={() => viewHistory(location.locationId, location.locationName)}
//                           className="mt-3 bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
//                         >
//                           View Full History
//                         </button>
//                       </div>
//                     )}
                    
//                     {/* Inactive/History Rates Table */}
//                     {location.inactiveRates.length > 0 && (
//                       <div className="p-4 bg-gray-50 border-t">
//                         <h4 className="text-md font-semibold text-gray-600 mb-3">📜 Rate History (Replaced/Inactive)</h4>
//                         <div className="overflow-x-auto">
//                           <table className="min-w-full border border-gray-300 bg-gray-100">
//                             <thead className="bg-gray-300">
//                               <tr>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">Created Date</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">Version</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">From Weight (kg)</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">To Weight (kg)</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">Rate (₹)</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">Status</th>
//                               </tr>
//                             </thead>
//                             <tbody>
//                               {location.inactiveRates
//                                 .sort((a, b) => b.createdAt - a.createdAt)
//                                 .map((rate) => (
//                                   <tr key={rate._id} className="bg-gray-100">
//                                     <td className="px-4 py-2 border text-sm text-gray-500">{formatDateOnly(rate.createdAt)}</td>
//                                     <td className="px-4 py-2 border text-sm text-gray-500">
//                                       <span className="px-2 py-1 bg-gray-400 text-gray-700 rounded text-xs">v{rate.version || 1}</span>
//                                     </td>
//                                     <td className="px-4 py-2 border text-sm text-gray-500">{rate.fromQty}</td>
//                                     <td className="px-4 py-2 border text-sm text-gray-500">{rate.toQty}</td>
//                                     <td className="px-4 py-2 border text-sm">
//                                       <span className="font-medium text-gray-500 line-through">₹ {rate.rate}</span>
//                                     </td>
//                                     <td className="px-4 py-2 border text-sm">
//                                       <span className="px-2 py-1 bg-gray-500 text-white rounded text-xs">Inactive</span>
//                                     </td>
//                                   </tr>
//                                 ))}
//                             </tbody>
//                           </table>
//                         </div>
//                       </div>
//                     )}
                    
//                     {location.activeRates.length === 0 && location.inactiveRates.length === 0 && (
//                       <div className="p-4 text-center text-gray-500">
//                         No rates available for this location
//                       </div>
//                     )}
//                   </div>
//                 ));
//               })()}
//             </div>
//           ) : (
//             <div className="p-6 text-center text-gray-500">
//               No location rates added for this rate master yet.
//               <button
//                 onClick={() => setShowAddForm(true)}
//                 className="ml-2 text-blue-600 hover:text-blue-800 font-medium"
//               >
//                 Click here to add rates →
//               </button>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';

// // Location Add Modal Component
// function AddLocationModal({ isOpen, onClose, onSave, loading }) {
//   const [locationName, setLocationName] = useState('');
//   const [locationState, setLocationState] = useState('');
//   const [error, setError] = useState('');

//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     if (!locationName.trim()) {
//       setError('Please enter location name');
//       return;
//     }
//     if (!locationState.trim()) {
//       setError('Please enter state');
//       return;
//     }

//     setError('');
//     await onSave({ name: locationName.trim(), state: locationState.trim() });
    
//     // Reset form after save
//     setLocationName('');
//     setLocationState('');
//   };

//   const handleClose = () => {
//     setLocationName('');
//     setLocationState('');
//     setError('');
//     onClose();
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//       <div className="bg-white rounded-lg shadow-xl w-96 max-w-md">
//         <div className="bg-blue-600 text-white px-6 py-3 rounded-t-lg flex justify-between items-center">
//           <h3 className="text-lg font-semibold">Add New Location</h3>
//           <button
//             onClick={handleClose}
//             className="text-white hover:text-gray-200 text-xl"
//           >
//             ✕
//           </button>
//         </div>
        
//         <form onSubmit={handleSubmit} className="p-6">
//           {error && (
//             <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
//               {error}
//             </div>
//           )}
          
//           <div className="mb-4">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Location Name <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               value={locationName}
//               onChange={(e) => setLocationName(e.target.value)}
//               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               placeholder="Enter location name"
//               required
//               autoFocus
//             />
//           </div>
          
//           <div className="mb-4">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               State <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               value={locationState}
//               onChange={(e) => setLocationState(e.target.value)}
//               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               placeholder="Enter state name"
//               required
//             />
//           </div>
          
//           <div className="flex gap-3 mt-6">
//             <button
//               type="button"
//               onClick={handleClose}
//               className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               disabled={loading}
//               className={`flex-1 px-4 py-2 rounded text-white ${
//                 loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
//               }`}
//             >
//               {loading ? 'Saving...' : 'Add Location'}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }

// export default function RateMasterManagePage() {
//   const router = useRouter();
  
//   const [title, setTitle] = useState('');
//   const [customerId, setCustomerId] = useState('');
//   const [branchId, setBranchId] = useState('');
//   const [weightRule, setWeightRule] = useState('all_weights');
//   const [approvalOption, setApprovalOption] = useState('contract_rate');
  
//   const [customers, setCustomers] = useState([]);
//   const [branches, setBranches] = useState([]);
//   const [rateMasters, setRateMasters] = useState([]);
//   const [filteredMasters, setFilteredMasters] = useState([]);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [locations, setLocations] = useState([]);
//   const [sortedLocations, setSortedLocations] = useState([]);
  
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [success, setSuccess] = useState(null);
//   const [formError, setFormError] = useState(null);
//   const [formSuccess, setFormSuccess] = useState(null);
  
//   const [selectedMasterId, setSelectedMasterId] = useState(null);
//   const [selectedMaster, setSelectedMaster] = useState(null);
//   const [locationRows, setLocationRows] = useState([]);
//   const [addingRates, setAddingRates] = useState(false);
//   const [showAddForm, setShowAddForm] = useState(false);
  
//   const [locationFilterTerm, setLocationFilterTerm] = useState('');
  
//   const [showRevisionModal, setShowRevisionModal] = useState(false);
//   const [revisionRate, setRevisionRate] = useState(null);
//   const [revisionFromQty, setRevisionFromQty] = useState('');
//   const [revisionToQty, setRevisionToQty] = useState('');
//   const [revisionRateValue, setRevisionRateValue] = useState('');
//   const [revisionCreatedDate, setRevisionCreatedDate] = useState('');
  
//   const [showHistory, setShowHistory] = useState(false);
//   const [historyData, setHistoryData] = useState([]);
//   const [selectedHistoryLocation, setSelectedHistoryLocation] = useState(null);
  
//   // State for editing rate createdAt date
//   const [editingRateId, setEditingRateId] = useState(null);
//   const [editingDateValue, setEditingDateValue] = useState('');

//   // State for Add Location Modal
//   const [showAddLocationModal, setShowAddLocationModal] = useState(false);
//   const [addingLocation, setAddingLocation] = useState(false);

//   const fetchCustomers = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/customers', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) {
//         setCustomers(data.data);
//       }
//     } catch (error) {
//       console.error('Error fetching customers:', error);
//     }
//   };

//   const fetchBranches = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/branches', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) {
//         setBranches(data.data);
//       }
//     } catch (error) {
//       console.error('Error fetching branches:', error);
//     }
//   };

//   const fetchLocations = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/locations', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) {
//         const sorted = [...data.data].sort((a, b) => 
//           a.name?.toLowerCase().localeCompare(b.name?.toLowerCase())
//         );
//         setLocations(data.data);
//         setSortedLocations(sorted);
//       }
//     } catch (error) {
//       console.error('Error fetching locations:', error);
//     }
//   };

//   const fetchRateMasters = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/rate-master', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
      
//       if (data.success && Array.isArray(data.data)) {
//         setRateMasters(data.data);
//         setFilteredMasters(data.data);
//       } else {
//         setRateMasters([]);
//         setFilteredMasters([]);
//       }
//     } catch (error) {
//       console.error('Error fetching rate masters:', error);
//       setError('Failed to load rate masters');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchSingleRateMaster = async (masterId) => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch(`/api/rate-master?id=${masterId}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
      
//       if (data.success && data.data) {
//         setSelectedMaster(data.data);
//         return data.data;
//       }
//       return null;
//     } catch (error) {
//       console.error('Error fetching rate master:', error);
//       setError('Failed to load rate master details');
//       return null;
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchHistory = async (masterId, locationId) => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch(`/api/rate-master?id=${masterId}&history=true&locationId=${locationId}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
      
//       if (data.success) {
//         setHistoryData(data.data);
//         setShowHistory(true);
//       }
//     } catch (error) {
//       console.error('Error fetching history:', error);
//       setError('Failed to load history');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleAddLocation = async (locationData) => {
//     setAddingLocation(true);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/locations', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(locationData),
//       });
      
//       const data = await res.json();
      
//       if (!res.ok) {
//         throw new Error(data.message || 'Failed to add location');
//       }
      
//       // Refresh locations
//       await fetchLocations();
      
//       setSuccess('Location added successfully!');
//       setTimeout(() => setSuccess(null), 3000);
      
//       setShowAddLocationModal(false);
      
//     } catch (error) {
//       console.error('Error adding location:', error);
//       setError(error.message);
//       setTimeout(() => setError(null), 3000);
//     } finally {
//       setAddingLocation(false);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     if (!title.trim()) {
//       setFormError('Please enter rate master title');
//       return;
//     }
//     if (!customerId) {
//       setFormError('Please select a customer');
//       return;
//     }
//     if (!branchId) {
//       setFormError('Please select a branch');
//       return;
//     }
//     if (!approvalOption) {
//       setFormError('Please select approval option');
//       return;
//     }
    
//     setLoading(true);
//     setFormError(null);
    
//     try {
//       const token = localStorage.getItem('token');
//       const payload = {
//         title: title.trim(),
//         customerId: customerId,
//         branchId: branchId,
//         weightRule: weightRule,
//         approvalOption: approvalOption,
//         locationRates: []
//       };
      
//       const res = await fetch('/api/rate-master', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(payload),
//       });
      
//       const data = await res.json();
      
//       if (!res.ok) {
//         throw new Error(data.message || 'Failed to create rate master');
//       }
      
//       setFormSuccess('Rate master created successfully!');
      
//       setTitle('');
//       setCustomerId('');
//       setBranchId('');
//       setWeightRule('all_weights');
//       setApprovalOption('contract_rate');
      
//       fetchRateMasters();
      
//       setTimeout(() => {
//         setFormSuccess(null);
//       }, 3000);
      
//     } catch (error) {
//       console.error('Error creating rate master:', error);
//       setFormError(error.message);
//       setTimeout(() => setFormError(null), 3000);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const deleteRateMaster = async (id) => {
//     if (!confirm('Are you sure you want to delete this rate master?')) return;
    
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch(`/api/rate-master?id=${id}`, {
//         method: 'DELETE',
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (!res.ok) {
//         throw new Error(data.message || 'Failed to delete rate master');
//       }
      
//       if (selectedMasterId === id) {
//         setSelectedMasterId(null);
//         setSelectedMaster(null);
//         setShowAddForm(false);
//       }
      
//       fetchRateMasters();
//       setSuccess('Rate master deleted successfully!');
//       setTimeout(() => setSuccess(null), 3000);
//     } catch (error) {
//       console.error('Error deleting rate master:', error);
//       setError(error.message);
//       setTimeout(() => setError(null), 3000);
//     }
//   };

//   const deleteSingleRate = async (rateId) => {
//     if (!confirm('Are you sure you want to delete this rate?')) return;
    
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch(`/api/rate-master?id=${selectedMaster._id}&rateId=${rateId}`, {
//         method: 'DELETE',
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
      
//       if (!res.ok) {
//         throw new Error(data.message || 'Failed to delete rate');
//       }
      
//       setSuccess('Rate deleted successfully!');
//       setTimeout(() => setSuccess(null), 3000);
//       await fetchSingleRateMaster(selectedMaster._id);
//       await fetchRateMasters();
      
//     } catch (error) {
//       console.error('Error deleting rate:', error);
//       setError(error.message);
//       setTimeout(() => setError(null), 3000);
//     }
//   };

//   const openRevisionModal = (rate) => {
//     setRevisionRate(rate);
//     setRevisionFromQty(rate.fromQty);
//     setRevisionToQty(rate.toQty);
//     setRevisionRateValue(rate.rate);
//     const currentDate = rate.createdAt ? new Date(rate.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
//     setRevisionCreatedDate(currentDate);
//     setShowRevisionModal(true);
//   };

//   const submitRevision = async () => {
//     if (!revisionRate) return;
    
//     const fromQty = parseFloat(revisionFromQty);
//     const toQty = parseFloat(revisionToQty);
//     const rate = parseFloat(revisionRateValue);
    
//     if (isNaN(fromQty) || isNaN(toQty) || isNaN(rate)) {
//       setError('Please enter valid numbers');
//       return;
//     }
    
//     if (fromQty >= toQty) {
//       setError('From quantity must be less than To quantity');
//       return;
//     }
    
//     if (fromQty < 0 || toQty < 0 || rate < 0) {
//       setError('Values cannot be negative');
//       return;
//     }
    
//     if (selectedMaster.weightRule === 'above_25' && fromQty < 25) {
//       setError(`Weight must start from 25 kg or above`);
//       return;
//     }
    
//     setAddingRates(true);
//     setError(null);
    
//     try {
//       const token = localStorage.getItem('token');
      
//       const payload = {
//         title: selectedMaster.title,
//         customerId: selectedMaster.customerId,
//         branchId: selectedMaster.branchId,
//         weightRule: selectedMaster.weightRule,
//         approvalOption: selectedMaster.approvalOption,
//         rateId: revisionRate._id,
//         locationRates: [{
//           locationId: revisionRate.locationId,
//           fromQty: fromQty,
//           toQty: toQty,
//           rate: rate,
//           createdAt: revisionCreatedDate ? new Date(revisionCreatedDate) : null
//         }]
//       };
      
//       const res = await fetch(`/api/rate-master?id=${selectedMaster._id}`, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(payload),
//       });
      
//       const data = await res.json();
      
//       if (!res.ok) {
//         throw new Error(data.message || 'Failed to revise rate');
//       }
      
//       setSuccess(`Rate revised successfully! Old rate moved to history.`);
//       setTimeout(() => setSuccess(null), 3000);
      
//       setShowRevisionModal(false);
//       setRevisionRate(null);
//       await fetchSingleRateMaster(selectedMaster._id);
//       await fetchRateMasters();
      
//     } catch (error) {
//       console.error('Error revising rate:', error);
//       setError(error.message);
//       setTimeout(() => setError(null), 3000);
//     } finally {
//       setAddingRates(false);
//     }
//   };

//   const updateRateCreatedDate = async (rateId, newDate) => {
//     if (!selectedMaster) return;
    
//     setLoading(true);
//     try {
//       const token = localStorage.getItem('token');
      
//       const rateToUpdate = selectedMaster.locationRates.find(r => r._id === rateId);
//       if (!rateToUpdate) return;
      
//       const payload = {
//         title: selectedMaster.title,
//         customerId: selectedMaster.customerId,
//         branchId: selectedMaster.branchId,
//         weightRule: selectedMaster.weightRule,
//         approvalOption: selectedMaster.approvalOption,
//         rateId: rateId,
//         locationRates: [{
//           locationId: rateToUpdate.locationId,
//           fromQty: rateToUpdate.fromQty,
//           toQty: rateToUpdate.toQty,
//           rate: rateToUpdate.rate,
//           createdAt: newDate ? new Date(newDate) : null
//         }]
//       };
      
//       const res = await fetch(`/api/rate-master?id=${selectedMaster._id}`, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(payload),
//       });
      
//       const data = await res.json();
      
//       if (!res.ok) {
//         throw new Error(data.message || 'Failed to update rate date');
//       }
      
//       setSuccess('Rate date updated successfully!');
//       setTimeout(() => setSuccess(null), 3000);
      
//       await fetchSingleRateMaster(selectedMaster._id);
//       await fetchRateMasters();
      
//     } catch (error) {
//       console.error('Error updating rate date:', error);
//       setError(error.message);
//       setTimeout(() => setError(null), 3000);
//     } finally {
//       setLoading(false);
//       setEditingRateId(null);
//     }
//   };

//   const startEditDate = (rateId, currentDate) => {
//     setEditingRateId(rateId);
//     const dateValue = currentDate ? new Date(currentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
//     setEditingDateValue(dateValue);
//   };

//   const cancelEditDate = () => {
//     setEditingRateId(null);
//     setEditingDateValue('');
//   };

//   const getWeightRuleLabel = (rule) => {
//     return rule === 'above_25' ? 'Above 25 kg' : 'All Weights';
//   };

//   const getApprovalLabel = (option) => {
//     return option === 'contract_rate' ? 'Contract Rate' : 'Mail Approval';
//   };

//   const formatDate = (dateString) => {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-GB', {
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   const formatDateOnly = (dateString) => {
//     if (!dateString) return 'N/A';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-GB', {
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric'
//     });
//   };

//   const addLocationRow = () => {
//     setLocationRows([
//       ...locationRows,
//       { id: Date.now(), locationId: '', fromQty: '', toQty: '', rate: '', createdAt: '' }
//     ]);
//   };

//   const removeLocationRow = (rowId) => {
//     if (locationRows.length > 1) {
//       setLocationRows(locationRows.filter(row => row.id !== rowId));
//     } else {
//       setError("At least one location is required");
//       setTimeout(() => setError(null), 3000);
//     }
//   };

//   const updateLocationRow = (rowId, field, value) => {
//     setLocationRows(locationRows.map(row => 
//       row.id === rowId ? { ...row, [field]: value } : row
//     ));
//   };

//   const handleAddRates = async () => {
//     if (!selectedMaster) return;
    
//     const validRows = locationRows.filter(row => row.locationId && row.fromQty && row.toQty && row.rate);
    
//     if (validRows.length === 0) {
//       setError('Please add at least one location with complete details');
//       return;
//     }
    
//     const newRates = [];
//     for (let row of validRows) {
//       const fromQty = parseFloat(row.fromQty);
//       const toQty = parseFloat(row.toQty);
//       const rate = parseFloat(row.rate);
      
//       if (isNaN(fromQty) || isNaN(toQty) || isNaN(rate)) {
//         setError('Please enter valid numbers for quantity and rate');
//         return;
//       }
      
//       if (fromQty >= toQty) {
//         setError(`From quantity (${fromQty}) must be less than To quantity (${toQty})`);
//         return;
//       }
      
//       if (fromQty < 0 || toQty < 0 || rate < 0) {
//         setError('Quantities and rate cannot be negative');
//         return;
//       }
      
//       if (selectedMaster.weightRule === 'above_25' && fromQty < 25) {
//         setError(`Weight must start from 25 kg or above. Current from weight: ${fromQty} kg`);
//         return;
//       }
      
//       const location = locations.find(l => l._id === row.locationId);
//       newRates.push({
//         locationId: row.locationId,
//         fromQty,
//         toQty,
//         rate,
//         locationName: location?.name || 'Unknown',
//         isActive: true,
//         version: 1,
//         createdAt: row.createdAt ? new Date(row.createdAt) : new Date()
//       });
//     }
    
//     setAddingRates(true);
//     setError(null);
    
//     try {
//       const token = localStorage.getItem('token');
//       const existingRates = selectedMaster.locationRates || [];
//       const allRates = [...existingRates, ...newRates];
      
//       const payload = {
//         title: selectedMaster.title,
//         customerId: selectedMaster.customerId,
//         branchId: selectedMaster.branchId,
//         weightRule: selectedMaster.weightRule,
//         approvalOption: selectedMaster.approvalOption,
//         locationRates: allRates.map(r => ({
//           locationId: r.locationId,
//           fromQty: r.fromQty,
//           toQty: r.toQty,
//           rate: r.rate,
//           isActive: r.isActive !== undefined ? r.isActive : true,
//           version: r.version || 1,
//           createdAt: r.createdAt || new Date()
//         }))
//       };
      
//       const res = await fetch(`/api/rate-master?id=${selectedMaster._id}`, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(payload),
//       });
      
//       const data = await res.json();
      
//       if (!res.ok) {
//         throw new Error(data.message || 'Failed to add location rates');
//       }
      
//       setSuccess('Location rates added successfully!');
//       setTimeout(() => setSuccess(null), 3000);
      
//       setLocationRows([]);
//       setShowAddForm(false);
//       await fetchSingleRateMaster(selectedMaster._id);
//       await fetchRateMasters();
      
//     } catch (error) {
//       console.error('Error adding location rates:', error);
//       setError(error.message);
//       setTimeout(() => setError(null), 3000);
//     } finally {
//       setAddingRates(false);
//     }
//   };

//   const viewHistory = async (locationId, locationName) => {
//     setSelectedHistoryLocation(locationName);
//     await fetchHistory(selectedMaster._id, locationId);
//   };

//   const handleViewRates = async (masterId) => {
//     if (selectedMasterId === masterId) {
//       setSelectedMasterId(null);
//       setSelectedMaster(null);
//       setShowAddForm(false);
//       setLocationRows([]);
//       setLocationFilterTerm('');
//       setShowHistory(false);
//     } else {
//       setSelectedMasterId(masterId);
//       await fetchSingleRateMaster(masterId);
//       setShowAddForm(false);
//       setLocationRows([]);
//       setLocationFilterTerm('');
//       setShowHistory(false);
//     }
//   };

//   const handleBackToList = () => {
//     setSelectedMasterId(null);
//     setSelectedMaster(null);
//     setShowAddForm(false);
//     setLocationRows([]);
//     setLocationFilterTerm('');
//     setShowHistory(false);
//   };

//   useEffect(() => {
//     if (rateMasters.length === 0) return;
    
//     let filtered = [...rateMasters];
    
//     if (searchTerm) {
//       filtered = filtered.filter(master =>
//         master.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         master.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         master.branchName?.toLowerCase().includes(searchTerm.toLowerCase())
//       );
//     }
    
//     setFilteredMasters(filtered);
//   }, [searchTerm, rateMasters]);

//   useEffect(() => {
//     fetchCustomers();
//     fetchBranches();
//     fetchLocations();
//     fetchRateMasters();
//   }, []);

//   return (
//     <div className="container mx-auto p-4">
//       <div className="bg-white rounded-lg shadow-md p-6 mb-6">
//         <div className="flex justify-between items-center">
//           <div>
//             <h1 className="text-2xl font-bold">Rate Master Management</h1>
//             <p className="text-gray-600">
//               {selectedMasterId ? `Viewing: ${selectedMaster?.title}` : 'Create and manage rate masters'}
//             </p>
//           </div>
//           <div className="flex gap-2">
//             {selectedMasterId && (
//               <button
//                 onClick={handleBackToList}
//                 className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
//               >
//                 ← Back to List
//               </button>
//             )}
//             <button
//               onClick={() => router.push('/admin/rate-master/create')}
//               className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
//             >
//               + Create New Rate Master
//             </button>
//           </div>
//         </div>
//       </div>

//       {formError && (
//         <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
//           {formError}
//         </div>
//       )}
      
//       {formSuccess && (
//         <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
//           {formSuccess}
//         </div>
//       )}
      
//       {error && (
//         <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
//           {error}
//         </div>
//       )}
      
//       {success && (
//         <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
//           {success}
//         </div>
//       )}

//       {!selectedMasterId && (
//         <div className="bg-white rounded-lg shadow-md p-6 mb-6">
//           <div className="mb-6">
//             <h2 className="text-xl font-bold">Create New Rate Master</h2>
//             <p className="text-gray-600">Enter basic information</p>
//           </div>
          
//           <form onSubmit={handleSubmit}>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Title <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   value={title}
//                   onChange={(e) => setTitle(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   placeholder="Enter rate master title"
//                   required
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Customer Name <span className="text-red-500">*</span>
//                 </label>
//                 <select
//                   value={customerId}
//                   onChange={(e) => setCustomerId(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 >
//                   <option value="">Select Customer</option>
//                   {customers.map((customer) => (
//                     <option key={customer._id} value={customer._id}>
//                       {customer.customerName} ({customer.customerCode})
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Branch <span className="text-red-500">*</span>
//                 </label>
//                 <select
//                   value={branchId}
//                   onChange={(e) => setBranchId(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 >
//                   <option value="">Select Branch</option>
//                   {branches.map((branch) => (
//                     <option key={branch._id} value={branch._id}>
//                       {branch.name} ({branch.code})
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Weight Rule <span className="text-red-500">*</span>
//                 </label>
//                 <select
//                   value={weightRule}
//                   onChange={(e) => setWeightRule(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 >
//                   <option value="all_weights">All Weights</option>
//                   <option value="above_25">Above 25 kg</option>
//                 </select>
//                 <p className="text-xs text-gray-500 mt-1">
//                   {weightRule === 'above_25' 
//                     ? 'Only applicable for weights above 25 kg' 
//                     : 'Applicable for all weight ranges'}
//                 </p>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Approval Option <span className="text-red-500">*</span>
//                 </label>
//                 <select
//                   value={approvalOption}
//                   onChange={(e) => setApprovalOption(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 >
//                   <option value="contract_rate">Contract Rate</option>
//                   <option value="mail_approval">Mail Approval</option>
//                 </select>
//               </div>
//             </div>

//             <div className="mt-6 flex gap-3">
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className={`px-6 py-2 rounded text-white ${
//                   loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
//                 }`}
//               >
//                 {loading ? 'Creating...' : 'Create Rate Master'}
//               </button>
//               <button
//                 type="button"
//                 onClick={() => {
//                   setTitle('');
//                   setCustomerId('');
//                   setBranchId('');
//                   setWeightRule('all_weights');
//                   setApprovalOption('contract_rate');
//                 }}
//                 className="px-6 py-2 rounded text-gray-700 bg-gray-200 hover:bg-gray-300"
//               >
//                 Reset
//               </button>
//             </div>
//           </form>
//         </div>
//       )}

//       {!selectedMasterId && (
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <div className="mb-6">
//             <h2 className="text-xl font-bold">Rate Masters List</h2>
//             <p className="text-gray-600">Click "Add/View Rates" to manage location rates</p>
//           </div>

//           <div className="mb-6">
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Search by Title, Customer or Branch
//             </label>
//             <input
//               type="text"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               placeholder="Type title, customer or branch to search..."
//               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           {loading && rateMasters.length === 0 ? (
//             <div className="text-center py-8">Loading rate masters...</div>
//           ) : filteredMasters.length === 0 ? (
//             <div className="text-center py-8 text-gray-500">
//               {searchTerm 
//                 ? `No rate masters found matching your search: "${searchTerm}"`
//                 : 'No rate masters found. Create your first rate master!'}
//             </div>
//           ) : (
//             <div className="overflow-x-auto">
//               <table className="min-w-full border border-gray-200">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th className="px-4 py-3 border text-left text-sm font-semibold">S.No</th>
//                     <th className="px-4 py-3 border text-left text-sm font-semibold">Title</th>
//                     <th className="px-4 py-3 border text-left text-sm font-semibold">Customer</th>
//                     <th className="px-4 py-3 border text-left text-sm font-semibold">Branch</th>
//                     <th className="px-4 py-3 border text-left text-sm font-semibold">Weight Rule</th>
//                     <th className="px-4 py-3 border text-left text-sm font-semibold">Approval</th>
//                     <th className="px-4 py-3 border text-left text-sm font-semibold">Status</th>
//                     <th className="px-4 py-3 border text-left text-sm font-semibold">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {filteredMasters.map((master, index) => (
//                     <tr key={master._id} className="hover:bg-gray-50">
//                       <td className="px-4 py-2 border text-sm">{index + 1}</td>
//                       <td className="px-4 py-2 border text-sm font-medium">{master.title}</td>
//                       <td className="px-4 py-2 border text-sm">{master.customerName}</td>
//                       <td className="px-4 py-2 border text-sm">{master.branchName}</td>
//                       <td className="px-4 py-2 border text-sm">
//                         <span className={`px-2 py-1 rounded text-xs ${
//                           master.weightRule === 'above_25' 
//                             ? 'bg-orange-100 text-orange-800' 
//                             : 'bg-blue-100 text-blue-800'
//                         }`}>
//                           {getWeightRuleLabel(master.weightRule)}
//                         </span>
//                       </td>
//                       <td className="px-4 py-2 border text-sm">
//                         <span className={`px-2 py-1 rounded text-xs ${
//                           master.approvalOption === 'contract_rate' 
//                             ? 'bg-green-100 text-green-800' 
//                             : 'bg-purple-100 text-purple-800'
//                         }`}>
//                           {getApprovalLabel(master.approvalOption)}
//                         </span>
//                       </td>
//                       <td className="px-4 py-2 border text-sm">
//                         <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
//                           {master.locationRates?.filter(r => r.isActive !== false).length || 0} Active | {master.locationRates?.filter(r => r.isActive === false).length || 0} History
//                         </span>
//                       </td>
//                       <td className="px-4 py-2 border text-sm">
//                         <div className="flex gap-2">
//                           <button
//                             onClick={() => handleViewRates(master._id)}
//                             className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-xs whitespace-nowrap"
//                           >
//                             Add/View Rates
//                           </button>
//                           <button
//                             onClick={() => router.push(`/admin/rate-master/edit/${master._id}`)}
//                             className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-xs"
//                           >
//                             Edit
//                           </button>
//                           <button
//                             onClick={() => deleteRateMaster(master._id)}
//                             className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-xs"
//                           >
//                             Delete
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>
//       )}

//       {selectedMasterId && selectedMaster && (
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg p-6 mb-6">
//             <div className="flex justify-between items-start">
//               <div>
//                 <h2 className="text-2xl font-bold">{selectedMaster.title}</h2>
//                 <p className="text-sm text-gray-300 mt-1">
//                   Customer: {selectedMaster.customerName} | Branch: {selectedMaster.branchName}
//                 </p>
//                 <div className="flex gap-3 mt-3 flex-wrap">
//                   <span className={`px-2 py-1 rounded text-xs ${
//                     selectedMaster.weightRule === 'above_25' 
//                       ? 'bg-orange-600 text-white' 
//                       : 'bg-green-600 text-white'
//                   }`}>
//                     {getWeightRuleLabel(selectedMaster.weightRule)}
//                   </span>
//                   <span className={`px-2 py-1 rounded text-xs ${
//                     selectedMaster.approvalOption === 'contract_rate' 
//                       ? 'bg-purple-600 text-white' 
//                       : 'bg-pink-600 text-white'
//                   }`}>
//                     {getApprovalLabel(selectedMaster.approvalOption)}
//                   </span>
//                   <span className="px-2 py-1 rounded text-xs bg-yellow-600 text-white">
//                     {selectedMaster.locationRates?.filter(r => r.isActive !== false).length || 0} Active | {selectedMaster.locationRates?.filter(r => r.isActive === false).length || 0} History
//                   </span>
//                 </div>
//                 {selectedMaster.weightRule === 'above_25' && (
//                   <div className="mt-3 p-2 bg-blue-900/30 rounded text-xs text-blue-200">
//                     ⚠️ <strong>Above 25 kg Rule:</strong> From weight must be 25 kg or above.
//                   </div>
//                 )}
//               </div>
//               <div className="flex gap-2">
//                 <button
//                   onClick={() => setShowAddForm(!showAddForm)}
//                   className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium"
//                 >
//                   {showAddForm ? 'Cancel' : '+ Add New Location'}
//                 </button>
//                 <button
//                   onClick={() => router.push(`/admin/rate-master/edit/${selectedMaster._id}`)}
//                   className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-sm"
//                 >
//                   Edit Master
//                 </button>
//               </div>
//             </div>
//           </div>

//           {showAddForm && (
//             <div className="mb-6 p-4 border rounded-lg bg-gray-50">
//               <h3 className="text-md font-semibold mb-3 text-gray-800">Add New Location Rates</h3>
//               <p className="text-sm text-gray-600 mb-3">⚠️ Weight ranges should not overlap with existing active rates.</p>
              
//               <div className="overflow-x-auto">
//                 <table className="min-w-full border border-gray-200 bg-white">
//                   <thead className="bg-gray-100">
//                     <tr>
//                       <th className="px-4 py-2 border text-left text-sm font-semibold">Location *</th>
//                       <th className="px-4 py-2 border text-left text-sm font-semibold">From Weight (kg)</th>
//                       <th className="px-4 py-2 border text-left text-sm font-semibold">To Weight (kg)</th>
//                       <th className="px-4 py-2 border text-left text-sm font-semibold">Rate (₹)</th>
//                       <th className="px-4 py-2 border text-left text-sm font-semibold">Created Date</th>
//                       <th className="px-4 py-2 border text-left text-sm font-semibold">Action</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {locationRows.map((row) => (
//                       <tr key={row.id}>
//                         <td className="px-4 py-2 border">
//                           <div className="flex gap-2 items-center">
//                             <select
//                               value={row.locationId}
//                               onChange={(e) => updateLocationRow(row.id, 'locationId', e.target.value)}
//                               className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             >
//                               <option value="">Select Location</option>
//                               {sortedLocations.map((location) => (
//                                 <option key={location._id} value={location._id}>
//                                   {location.name} {location.state ? `(${location.state})` : ''}
//                                 </option>
//                               ))}
//                             </select>
//                             <button
//                               type="button"
//                               onClick={() => setShowAddLocationModal(true)}
//                               className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm whitespace-nowrap"
//                               title="Add New Location"
//                             >
//                               + Add
//                             </button>
//                           </div>
//                         </td>
//                         <td className="px-4 py-2 border">
//                           <input
//                             type="number"
//                             step="0.01"
//                             value={row.fromQty}
//                             onChange={(e) => updateLocationRow(row.id, 'fromQty', e.target.value)}
//                             className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             placeholder="0.00"
//                           />
//                         </td>
//                         <td className="px-4 py-2 border">
//                           <input
//                             type="number"
//                             step="0.01"
//                             value={row.toQty}
//                             onChange={(e) => updateLocationRow(row.id, 'toQty', e.target.value)}
//                             className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             placeholder="100.00"
//                           />
//                         </td>
//                         <td className="px-4 py-2 border">
//                           <input
//                             type="number"
//                             step="0.01"
//                             value={row.rate}
//                             onChange={(e) => updateLocationRow(row.id, 'rate', e.target.value)}
//                             className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             placeholder="0.00"
//                             min="0"
//                           />
//                         </td>
//                         <td className="px-4 py-2 border">
//                           <input
//                             type="date"
//                             value={row.createdAt}
//                             onChange={(e) => updateLocationRow(row.id, 'createdAt', e.target.value)}
//                             className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//                           />
//                         </td>
//                         <td className="px-4 py-2 border text-center">
//                           <button
//                             type="button"
//                             onClick={() => removeLocationRow(row.id)}
//                             className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
//                           >
//                             Remove
//                           </button>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
              
//               <div className="flex justify-between mt-4">
//                 <button
//                   type="button"
//                   onClick={addLocationRow}
//                   className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
//                 >
//                   + Add Another Location
//                 </button>
//                 <button
//                   type="button"
//                   onClick={handleAddRates}
//                   disabled={addingRates}
//                   className={`px-6 py-2 rounded text-white ${
//                     addingRates ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
//                   }`}
//                 >
//                   {addingRates ? 'Saving...' : 'Save Location Rates'}
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* Revision Modal with Created Date */}
//           {showRevisionModal && revisionRate && (
//             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//               <div className="bg-white rounded-lg shadow-xl w-96 max-w-md">
//                 <div className="bg-orange-600 text-white px-6 py-3 rounded-t-lg flex justify-between items-center">
//                   <h3 className="text-lg font-semibold">Revise Rate</h3>
//                   <button
//                     onClick={() => {
//                       setShowRevisionModal(false);
//                       setRevisionRate(null);
//                     }}
//                     className="text-white hover:text-gray-200"
//                   >
//                     ✕
//                   </button>
//                 </div>
//                 <div className="p-6">
//                   <p className="text-sm text-gray-600 mb-4">
//                     Current Rate: {revisionRate.fromQty} - {revisionRate.toQty} kg → ₹{revisionRate.rate}
//                   </p>
//                   <p className="text-sm text-red-500 mb-4">
//                     ⚠️ Old rate will be moved to HISTORY under this location
//                   </p>
                  
//                   <div className="space-y-4">
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-1">
//                         From Weight (kg)
//                       </label>
//                       <input
//                         type="number"
//                         step="0.01"
//                         value={revisionFromQty}
//                         onChange={(e) => setRevisionFromQty(e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
//                       />
//                     </div>
                    
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-1">
//                         To Weight (kg)
//                       </label>
//                       <input
//                         type="number"
//                         step="0.01"
//                         value={revisionToQty}
//                         onChange={(e) => setRevisionToQty(e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
//                       />
//                     </div>
                    
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-1">
//                         Rate (₹)
//                       </label>
//                       <input
//                         type="number"
//                         step="0.01"
//                         value={revisionRateValue}
//                         onChange={(e) => setRevisionRateValue(e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
//                       />
//                     </div>
                    
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-1">
//                         Created Date
//                       </label>
//                       <input
//                         type="date"
//                         value={revisionCreatedDate}
//                         onChange={(e) => setRevisionCreatedDate(e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
//                       />
//                       <p className="text-xs text-gray-500 mt-1">Select the created date for this rate</p>
//                     </div>
//                   </div>
                  
//                   <div className="flex gap-3 mt-6">
//                     <button
//                       onClick={() => {
//                         setShowRevisionModal(false);
//                         setRevisionRate(null);
//                       }}
//                       className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
//                     >
//                       Cancel
//                     </button>
//                     <button
//                       onClick={submitRevision}
//                       disabled={addingRates}
//                       className={`flex-1 px-4 py-2 rounded text-white ${
//                         addingRates ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
//                       }`}
//                     >
//                       {addingRates ? 'Saving...' : 'Save Revision'}
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* History Modal */}
//           {showHistory && (
//             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//               <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-4xl max-h-[80vh] overflow-auto">
//                 <div className="bg-gray-800 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
//                   <h3 className="text-lg font-semibold">Rate History - {selectedHistoryLocation}</h3>
//                   <button
//                     onClick={() => setShowHistory(false)}
//                     className="text-white hover:text-gray-300"
//                   >
//                     ✕
//                   </button>
//                 </div>
//                 <div className="p-6">
//                   {historyData.length === 0 ? (
//                     <p className="text-center text-gray-500 py-8">No history found for this location</p>
//                   ) : (
//                     <div className="overflow-x-auto">
//                       <table className="min-w-full border border-gray-200">
//                         <thead className="bg-gray-50">
//                           <tr>
//                             <th className="px-4 py-2 border text-left text-sm font-semibold">Created Date</th>
//                             <th className="px-4 py-2 border text-left text-sm font-semibold">Version</th>
//                             <th className="px-4 py-2 border text-left text-sm font-semibold">From (kg)</th>
//                             <th className="px-4 py-2 border text-left text-sm font-semibold">To (kg)</th>
//                             <th className="px-4 py-2 border text-left text-sm font-semibold">Rate (₹)</th>
//                             <th className="px-4 py-2 border text-left text-sm font-semibold">Action</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {historyData.map((item, idx) => (
//                             <tr key={idx} className="hover:bg-gray-50">
//                               <td className="px-4 py-2 border text-sm">{formatDate(item.createdAt)}</td>
//                               <td className="px-4 py-2 border text-sm">
//                                 <span className="px-2 py-1 bg-gray-100 rounded text-xs">v{item.version}</span>
//                               </td>
//                               <td className="px-4 py-2 border text-sm">{item.fromQty}</td>
//                               <td className="px-4 py-2 border text-sm">{item.toQty}</td>
//                               <td className="px-4 py-2 border text-sm">
//                                 <span className="font-medium">₹ {item.rate}</span>
//                               </td>
//                               <td className="px-4 py-2 border text-sm">
//                                 <span className={`px-2 py-1 rounded text-xs ${
//                                   item.action === 'CREATED' ? 'bg-green-100 text-green-800' :
//                                   item.action === 'REVISED' ? 'bg-orange-100 text-orange-800' :
//                                   'bg-red-100 text-red-800'
//                                 }`}>
//                                   {item.action}
//                                 </span>
//                               </td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* Location Filter */}
//           {(selectedMaster.locationRates && selectedMaster.locationRates.length > 0) && (
//             <div className="mb-4">
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 🔍 Filter by Location Name
//               </label>
//               <div className="relative">
//                 <input
//                   type="text"
//                   value={locationFilterTerm}
//                   onChange={(e) => setLocationFilterTerm(e.target.value)}
//                   placeholder="Type location name to filter..."
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
//                 />
//                 <svg
//                   className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
//                   />
//                 </svg>
//                 {locationFilterTerm && (
//                   <button
//                     onClick={() => setLocationFilterTerm('')}
//                     className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
//                   >
//                     ✕
//                   </button>
//                 )}
//               </div>
//             </div>
//           )}

//           {/* Display Rates Grouped by Location */}
//           {selectedMaster.locationRates && selectedMaster.locationRates.length > 0 ? (
//             <div>
//               {(() => {
//                 const locationsMap = new Map();
                
//                 selectedMaster.locationRates.forEach(rate => {
//                   if (!locationsMap.has(rate.locationId)) {
//                     locationsMap.set(rate.locationId, {
//                       locationId: rate.locationId,
//                       locationName: rate.locationName,
//                       activeRates: [],
//                       inactiveRates: []
//                     });
//                   }
                  
//                   const locationData = locationsMap.get(rate.locationId);
//                   if (rate.isActive !== false) {
//                     locationData.activeRates.push(rate);
//                   } else {
//                     locationData.inactiveRates.push(rate);
//                   }
//                 });
                
//                 let allLocations = Array.from(locationsMap.values())
//                   .sort((a, b) => a.locationName.localeCompare(b.locationName));
                
//                 if (locationFilterTerm && locationFilterTerm.trim() !== '') {
//                   allLocations = allLocations.filter(loc =>
//                     loc.locationName?.toLowerCase().includes(locationFilterTerm.toLowerCase())
//                   );
//                 }
                
//                 return allLocations.map((location) => (
//                   <div key={location.locationId} className="mb-8 border rounded-lg overflow-hidden">
//                     <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-3">
//                       <h3 className="text-lg font-semibold">📍 {location.locationName}</h3>
//                     </div>
                    
//                     {/* Active Rates Table with Editable Created Date */}
//                     {location.activeRates.length > 0 && (
//                       <div className="p-4">
//                         <h4 className="text-md font-semibold text-green-700 mb-3">✅ Active Rates</h4>
//                         <div className="overflow-x-auto">
//                           <table className="min-w-full border border-gray-200">
//                             <thead className="bg-green-50">
//                               <tr>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">Created Date</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">Version</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">From Weight (kg)</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">To Weight (kg)</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">Rate (₹)</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">Actions</th>
//                               </tr>
//                             </thead>
//                             <tbody>
//                               {location.activeRates
//                                 .sort((a, b) => a.fromQty - b.fromQty)
//                                 .map((rate) => (
//                                   <tr key={rate._id} className="hover:bg-gray-50">
//                                     <td className="px-4 py-2 border text-sm">
//                                       {editingRateId === rate._id ? (
//                                         <div className="flex gap-2 items-center">
//                                           <input
//                                             type="date"
//                                             value={editingDateValue}
//                                             onChange={(e) => setEditingDateValue(e.target.value)}
//                                             className="px-2 py-1 border border-gray-300 rounded text-sm w-32"
//                                           />
//                                           <button
//                                             onClick={() => updateRateCreatedDate(rate._id, editingDateValue)}
//                                             className="bg-green-500 text-white px-2 py-1 rounded text-xs"
//                                           >
//                                             Save
//                                           </button>
//                                           <button
//                                             onClick={cancelEditDate}
//                                             className="bg-gray-500 text-white px-2 py-1 rounded text-xs"
//                                           >
//                                             Cancel
//                                           </button>
//                                         </div>
//                                       ) : (
//                                         <div className="flex items-center gap-2">
//                                           <span>{formatDateOnly(rate.createdAt)}</span>
//                                           <button
//                                             onClick={() => startEditDate(rate._id, rate.createdAt)}
//                                             className="text-blue-500 hover:text-blue-700 text-sm"
//                                             title="Edit created date"
//                                           >
//                                             📅
//                                           </button>
//                                         </div>
//                                       )}
//                                     </td>
//                                     <td className="px-4 py-2 border text-sm">
//                                       <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">v{rate.version || 1}</span>
//                                     </td>
//                                     <td className="px-4 py-2 border text-sm">{rate.fromQty}</td>
//                                     <td className="px-4 py-2 border text-sm">{rate.toQty}</td>
//                                     <td className="px-4 py-2 border text-sm">
//                                       <span className="font-medium text-green-600">₹ {rate.rate}</span>
//                                     </td>
//                                     <td className="px-4 py-2 border text-sm">
//                                       <div className="flex gap-2">
//                                         <button
//                                           onClick={() => openRevisionModal(rate)}
//                                           className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600"
//                                         >
//                                           Revise
//                                         </button>
//                                         <button
//                                           onClick={() => deleteSingleRate(rate._id)}
//                                           className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
//                                         >
//                                           Delete
//                                         </button>
//                                       </div>
//                                     </td>
//                                   </tr>
//                                 ))}
//                             </tbody>
//                           </table>
//                         </div>
//                         <button
//                           onClick={() => viewHistory(location.locationId, location.locationName)}
//                           className="mt-3 bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
//                         >
//                           View Full History
//                         </button>
//                       </div>
//                     )}
                    
//                     {/* Inactive/History Rates Table */}
//                     {location.inactiveRates.length > 0 && (
//                       <div className="p-4 bg-gray-50 border-t">
//                         <h4 className="text-md font-semibold text-gray-600 mb-3">📜 Rate History (Replaced/Inactive)</h4>
//                         <div className="overflow-x-auto">
//                           <table className="min-w-full border border-gray-300 bg-gray-100">
//                             <thead className="bg-gray-300">
//                               <tr>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">Created Date</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">Version</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">From Weight (kg)</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">To Weight (kg)</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">Rate (₹)</th>
//                                 <th className="px-4 py-2 border text-left text-sm font-semibold">Status</th>
//                               </tr>
//                             </thead>
//                             <tbody>
//                               {location.inactiveRates
//                                 .sort((a, b) => b.createdAt - a.createdAt)
//                                 .map((rate) => (
//                                   <tr key={rate._id} className="bg-gray-100">
//                                     <td className="px-4 py-2 border text-sm text-gray-500">{formatDateOnly(rate.createdAt)}</td>
//                                     <td className="px-4 py-2 border text-sm text-gray-500">
//                                       <span className="px-2 py-1 bg-gray-400 text-gray-700 rounded text-xs">v{rate.version || 1}</span>
//                                     </td>
//                                     <td className="px-4 py-2 border text-sm text-gray-500">{rate.fromQty}</td>
//                                     <td className="px-4 py-2 border text-sm text-gray-500">{rate.toQty}</td>
//                                     <td className="px-4 py-2 border text-sm">
//                                       <span className="font-medium text-gray-500 line-through">₹ {rate.rate}</span>
//                                     </td>
//                                     <td className="px-4 py-2 border text-sm">
//                                       <span className="px-2 py-1 bg-gray-500 text-white rounded text-xs">Inactive</span>
//                                     </td>
//                                   </tr>
//                                 ))}
//                             </tbody>
//                           </table>
//                         </div>
//                       </div>
//                     )}
                    
//                     {location.activeRates.length === 0 && location.inactiveRates.length === 0 && (
//                       <div className="p-4 text-center text-gray-500">
//                         No rates available for this location
//                       </div>
//                     )}
//                   </div>
//                 ));
//               })()}
//             </div>
//           ) : (
//             <div className="p-6 text-center text-gray-500">
//               No location rates added for this rate master yet.
//               <button
//                 onClick={() => setShowAddForm(true)}
//                 className="ml-2 text-blue-600 hover:text-blue-800 font-medium"
//               >
//                 Click here to add rates →
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Add Location Modal */}
//       <AddLocationModal
//         isOpen={showAddLocationModal}
//         onClose={() => setShowAddLocationModal(false)}
//         onSave={handleAddLocation}
//         loading={addingLocation}
//       />
//     </div>
//   );
// }

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Location Add Modal Component
function AddLocationModal({ isOpen, onClose, onSave, loading }) {
  const [locationName, setLocationName] = useState('');
  const [locationState, setLocationState] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!locationName.trim()) {
      setError('Please enter location name');
      return;
    }
    if (!locationState.trim()) {
      setError('Please enter state');
      return;
    }

    setError('');
    await onSave({ name: locationName.trim(), state: locationState.trim() });
    
    setLocationName('');
    setLocationState('');
  };

  const handleClose = () => {
    setLocationName('');
    setLocationState('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 max-w-md">
        <div className="bg-blue-600 text-white px-6 py-3 rounded-t-lg flex justify-between items-center">
          <h3 className="text-lg font-semibold">Add New Location</h3>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 text-xl"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter location name"
              required
              autoFocus
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={locationState}
              onChange={(e) => setLocationState(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter state name"
              required
            />
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 rounded text-white ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Saving...' : 'Add Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RateMasterManagePage() {
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [weightRule, setWeightRule] = useState('all_weights');
  const [customWeightRule, setCustomWeightRule] = useState('');
  const [customRuleType, setCustomRuleType] = useState('');
  const [customRuleLimit, setCustomRuleLimit] = useState('');
  const [customRuleToLimit, setCustomRuleToLimit] = useState('');
  const [approvalOption, setApprovalOption] = useState('contract_rate');
  
  // File upload states
  const [approvalFile, setApprovalFile] = useState(null);
  const [approvalFileData, setApprovalFileData] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [rateMasters, setRateMasters] = useState([]);
  const [filteredMasters, setFilteredMasters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [locations, setLocations] = useState([]);
  const [sortedLocations, setSortedLocations] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  
  const [selectedMasterId, setSelectedMasterId] = useState(null);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [locationRows, setLocationRows] = useState([]);
  const [addingRates, setAddingRates] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [locationFilterTerm, setLocationFilterTerm] = useState('');
  
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionRate, setRevisionRate] = useState(null);
  const [revisionFromQty, setRevisionFromQty] = useState('');
  const [revisionToQty, setRevisionToQty] = useState('');
  const [revisionRateValue, setRevisionRateValue] = useState('');
  const [revisionCreatedDate, setRevisionCreatedDate] = useState('');
  
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [selectedHistoryLocation, setSelectedHistoryLocation] = useState(null);
  
  const [editingRateId, setEditingRateId] = useState(null);
  const [editingDateValue, setEditingDateValue] = useState('');

  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [addingLocation, setAddingLocation] = useState(false);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/customers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCustomers(data.data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/branches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setBranches(data.data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/locations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const sorted = [...data.data].sort((a, b) => 
          a.name?.toLowerCase().localeCompare(b.name?.toLowerCase())
        );
        setLocations(data.data);
        setSortedLocations(sorted);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchRateMasters = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/rate-master', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (data.success && Array.isArray(data.data)) {
        setRateMasters(data.data);
        setFilteredMasters(data.data);
      } else {
        setRateMasters([]);
        setFilteredMasters([]);
      }
    } catch (error) {
      console.error('Error fetching rate masters:', error);
      setError('Failed to load rate masters');
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleRateMaster = async (masterId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rate-master?id=${masterId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (data.success && data.data) {
        setSelectedMaster(data.data);
        // Set approval file data if exists
        if (data.data.approvalFile && data.data.approvalFile.fileName) {
          setApprovalFileData(data.data.approvalFile);
        } else {
          setApprovalFileData(null);
        }
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching rate master:', error);
      setError('Failed to load rate master details');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (masterId, locationId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rate-master?id=${masterId}&history=true&locationId=${locationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (data.success) {
        setHistoryData(data.data);
        setShowHistory(true);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async (locationData) => {
    setAddingLocation(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(locationData),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add location');
      }
      
      await fetchLocations();
      
      setSuccess('Location added successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
      setShowAddLocationModal(false);
      
    } catch (error) {
      console.error('Error adding location:', error);
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setAddingLocation(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setFormError('Please upload only PDF or image files (JPEG, PNG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('File size should be less than 5MB');
      return;
    }

    setUploadingFile(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('token');
      const res = await fetch('/api/upload/excel', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      
      const data = await res.json();
      
      if (data.success) {
        setApprovalFileData({
          fileName: file.name,
          filePath: data.filePath,
          fileType: file.type,
          fileSize: file.size,
          uploadedAt: new Date().toISOString()
        });
        setApprovalFile(file);
        setFormSuccess('File uploaded successfully!');
        setTimeout(() => setFormSuccess(null), 3000);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setFormError('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleRemoveFile = () => {
    setApprovalFile(null);
    setApprovalFileData(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setFormError('Please enter rate master title');
      return;
    }
    if (!customerId) {
      setFormError('Please select a customer');
      return;
    }
    if (!branchId) {
      setFormError('Please select a branch');
      return;
    }
    if (!approvalOption) {
      setFormError('Please select approval option');
      return;
    }
    
    // Custom rule validation
    if (weightRule === 'custom') {
      if (!customRuleType) {
        setFormError('Please select rule type (Above/Below/Between)');
        return;
      }
      if (!customRuleLimit || parseFloat(customRuleLimit) < 0) {
        setFormError('Please enter a valid weight limit');
        return;
      }
      if (customRuleType === 'between' && (!customRuleToLimit || parseFloat(customRuleToLimit) <= parseFloat(customRuleLimit))) {
        setFormError('To weight must be greater than From weight');
        return;
      }
    }
    
    setLoading(true);
    setFormError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      let finalCustomWeightRule = customWeightRule;
      if (weightRule === 'custom' && !finalCustomWeightRule) {
        if (customRuleType === 'above') {
          finalCustomWeightRule = `Above ${customRuleLimit} kg`;
        } else if (customRuleType === 'below') {
          finalCustomWeightRule = `Below ${customRuleLimit} kg`;
        } else if (customRuleType === 'between') {
          finalCustomWeightRule = `Between ${customRuleLimit} - ${customRuleToLimit} kg`;
        }
      }
      
      const payload = {
        title: title.trim(),
        customerId: customerId,
        branchId: branchId,
        weightRule: weightRule,
        customWeightRule: finalCustomWeightRule || '',
        customRuleType: customRuleType || '',
        customRuleLimit: customRuleLimit ? parseFloat(customRuleLimit) : null,
        customRuleToLimit: customRuleToLimit ? parseFloat(customRuleToLimit) : null,
        approvalOption: approvalOption,
        approvalFile: approvalFileData || {
          fileName: '',
          filePath: '',
          fileType: '',
          fileSize: 0,
          uploadedAt: null
        },
        locationRates: []
      };
      
      const res = await fetch('/api/rate-master', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create rate master');
      }
      
      setFormSuccess('Rate master created successfully!');
      
      setTitle('');
      setCustomerId('');
      setBranchId('');
      setWeightRule('all_weights');
      setCustomWeightRule('');
      setCustomRuleType('');
      setCustomRuleLimit('');
      setCustomRuleToLimit('');
      setApprovalOption('contract_rate');
      setApprovalFile(null);
      setApprovalFileData(null);
      
      fetchRateMasters();
      
      setTimeout(() => {
        setFormSuccess(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error creating rate master:', error);
      setFormError(error.message);
      setTimeout(() => setFormError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const deleteRateMaster = async (id) => {
    if (!confirm('Are you sure you want to delete this rate master?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rate-master?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete rate master');
      }
      
      if (selectedMasterId === id) {
        setSelectedMasterId(null);
        setSelectedMaster(null);
        setShowAddForm(false);
      }
      
      fetchRateMasters();
      setSuccess('Rate master deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting rate master:', error);
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const deleteSingleRate = async (rateId) => {
    if (!confirm('Are you sure you want to delete this rate?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rate-master?id=${selectedMaster._id}&rateId=${rateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete rate');
      }
      
      setSuccess('Rate deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
      await fetchSingleRateMaster(selectedMaster._id);
      await fetchRateMasters();
      
    } catch (error) {
      console.error('Error deleting rate:', error);
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const openRevisionModal = (rate) => {
    setRevisionRate(rate);
    setRevisionFromQty(rate.fromQty);
    setRevisionToQty(rate.toQty);
    setRevisionRateValue(rate.rate);
    const currentDate = rate.createdAt ? new Date(rate.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setRevisionCreatedDate(currentDate);
    setShowRevisionModal(true);
  };

  const submitRevision = async () => {
    if (!revisionRate) return;
    
    const fromQty = parseFloat(revisionFromQty);
    const toQty = parseFloat(revisionToQty);
    const rate = parseFloat(revisionRateValue);
    
    if (isNaN(fromQty) || isNaN(toQty) || isNaN(rate)) {
      setError('Please enter valid numbers');
      return;
    }
    
    if (fromQty >= toQty) {
      setError('From quantity must be less than To quantity');
      return;
    }
    
    if (fromQty < 0 || toQty < 0 || rate < 0) {
      setError('Values cannot be negative');
      return;
    }
    
    // Validate based on rule type
    if (selectedMaster.weightRule === 'above_25' && fromQty < 25) {
      setError(`Weight must start from 25 kg or above`);
      return;
    }
    if (selectedMaster.weightRule === 'below_25' && toQty >= 25) {
      setError(`Weight must be below 25 kg`);
      return;
    }
    
    // Custom rule validation
    if (selectedMaster.weightRule === 'custom' && selectedMaster.customRuleType) {
      const limit = parseFloat(selectedMaster.customRuleLimit);
      const toLimit = parseFloat(selectedMaster.customRuleToLimit);
      
      if (selectedMaster.customRuleType === 'above') {
        if (fromQty < limit) {
          setError(`Weight must be ${limit} kg or above`);
          return;
        }
      } else if (selectedMaster.customRuleType === 'below') {
        if (toQty > limit) {
          setError(`Weight must be ${limit} kg or below`);
          return;
        }
      } else if (selectedMaster.customRuleType === 'between') {
        if (fromQty < limit || toQty > toLimit) {
          setError(`Weight must be between ${limit} and ${toLimit} kg`);
          return;
        }
      }
    }
    
    setAddingRates(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const payload = {
        title: selectedMaster.title,
        customerId: selectedMaster.customerId,
        branchId: selectedMaster.branchId,
        weightRule: selectedMaster.weightRule,
        customWeightRule: selectedMaster.customWeightRule || '',
        customRuleType: selectedMaster.customRuleType || '',
        customRuleLimit: selectedMaster.customRuleLimit || null,
        customRuleToLimit: selectedMaster.customRuleToLimit || null,
        approvalOption: selectedMaster.approvalOption,
        approvalFile: selectedMaster.approvalFile || {
          fileName: '',
          filePath: '',
          fileType: '',
          fileSize: 0,
          uploadedAt: null
        },
        rateId: revisionRate._id,
        locationRates: [{
          locationId: revisionRate.locationId,
          fromQty: fromQty,
          toQty: toQty,
          rate: rate,
          createdAt: revisionCreatedDate ? new Date(revisionCreatedDate) : null
        }]
      };
      
      const res = await fetch(`/api/rate-master?id=${selectedMaster._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to revise rate');
      }
      
      setSuccess(`Rate revised successfully! Old rate moved to history.`);
      setTimeout(() => setSuccess(null), 3000);
      
      setShowRevisionModal(false);
      setRevisionRate(null);
      await fetchSingleRateMaster(selectedMaster._id);
      await fetchRateMasters();
      
    } catch (error) {
      console.error('Error revising rate:', error);
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setAddingRates(false);
    }
  };

  const updateRateCreatedDate = async (rateId, newDate) => {
    if (!selectedMaster) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const rateToUpdate = selectedMaster.locationRates.find(r => r._id === rateId);
      if (!rateToUpdate) return;
      
      const payload = {
        title: selectedMaster.title,
        customerId: selectedMaster.customerId,
        branchId: selectedMaster.branchId,
        weightRule: selectedMaster.weightRule,
        customWeightRule: selectedMaster.customWeightRule || '',
        customRuleType: selectedMaster.customRuleType || '',
        customRuleLimit: selectedMaster.customRuleLimit || null,
        customRuleToLimit: selectedMaster.customRuleToLimit || null,
        approvalOption: selectedMaster.approvalOption,
        approvalFile: selectedMaster.approvalFile || {
          fileName: '',
          filePath: '',
          fileType: '',
          fileSize: 0,
          uploadedAt: null
        },
        rateId: rateId,
        locationRates: [{
          locationId: rateToUpdate.locationId,
          fromQty: rateToUpdate.fromQty,
          toQty: rateToUpdate.toQty,
          rate: rateToUpdate.rate,
          createdAt: newDate ? new Date(newDate) : null
        }]
      };
      
      const res = await fetch(`/api/rate-master?id=${selectedMaster._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update rate date');
      }
      
      setSuccess('Rate date updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
      await fetchSingleRateMaster(selectedMaster._id);
      await fetchRateMasters();
      
    } catch (error) {
      console.error('Error updating rate date:', error);
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
      setEditingRateId(null);
    }
  };

  const startEditDate = (rateId, currentDate) => {
    setEditingRateId(rateId);
    const dateValue = currentDate ? new Date(currentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setEditingDateValue(dateValue);
  };

  const cancelEditDate = () => {
    setEditingRateId(null);
    setEditingDateValue('');
  };

  const getWeightRuleLabel = (rule, customRule = '', customRuleType = '', customRuleLimit = '', customRuleToLimit = '') => {
    if (rule === 'above_25') return 'Above 25 kg';
    if (rule === 'below_25') return 'Below 25 kg';
    if (rule === 'custom') {
      if (customRule) return customRule;
      if (customRuleType === 'above') return `Above ${customRuleLimit} kg`;
      if (customRuleType === 'below') return `Below ${customRuleLimit} kg`;
      if (customRuleType === 'between') return `Between ${customRuleLimit} - ${customRuleToLimit} kg`;
      return 'Custom Rule';
    }
    return 'All Weights';
  };

  const getApprovalLabel = (option) => {
    return option === 'contract_rate' ? 'Contract Rate' : 'Mail Approval';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const addLocationRow = () => {
    setLocationRows([
      ...locationRows,
      { id: Date.now(), locationId: '', fromQty: '', toQty: '', rate: '', createdAt: '' }
    ]);
  };

  const removeLocationRow = (rowId) => {
    if (locationRows.length > 1) {
      setLocationRows(locationRows.filter(row => row.id !== rowId));
    } else {
      setError("At least one location is required");
      setTimeout(() => setError(null), 3000);
    }
  };

  const updateLocationRow = (rowId, field, value) => {
    setLocationRows(locationRows.map(row => 
      row.id === rowId ? { ...row, [field]: value } : row
    ));
  };

  const handleAddRates = async () => {
    if (!selectedMaster) return;
    
    const validRows = locationRows.filter(row => row.locationId && row.fromQty && row.toQty && row.rate);
    
    if (validRows.length === 0) {
      setError('Please add at least one location with complete details');
      return;
    }
    
    const newRates = [];
    for (let row of validRows) {
      const fromQty = parseFloat(row.fromQty);
      const toQty = parseFloat(row.toQty);
      const rate = parseFloat(row.rate);
      
      if (isNaN(fromQty) || isNaN(toQty) || isNaN(rate)) {
        setError('Please enter valid numbers for quantity and rate');
        return;
      }
      
      if (fromQty >= toQty) {
        setError(`From quantity (${fromQty}) must be less than To quantity (${toQty})`);
        return;
      }
      
      if (fromQty < 0 || toQty < 0 || rate < 0) {
        setError('Quantities and rate cannot be negative');
        return;
      }
      
      // Validate based on rule type
      if (selectedMaster.weightRule === 'above_25' && fromQty < 25) {
        setError(`Weight must start from 25 kg or above. Current from weight: ${fromQty} kg`);
        return;
      }
      if (selectedMaster.weightRule === 'below_25' && toQty >= 25) {
        setError(`Weight must be below 25 kg. Current to weight: ${toQty} kg`);
        return;
      }
      
      // Custom rule validation
      if (selectedMaster.weightRule === 'custom' && selectedMaster.customRuleType) {
        const limit = parseFloat(selectedMaster.customRuleLimit);
        const toLimit = parseFloat(selectedMaster.customRuleToLimit);
        
        if (selectedMaster.customRuleType === 'above') {
          if (fromQty < limit) {
            setError(`Weight must be ${limit} kg or above. Current from weight: ${fromQty} kg`);
            return;
          }
        } else if (selectedMaster.customRuleType === 'below') {
          if (toQty > limit) {
            setError(`Weight must be ${limit} kg or below. Current to weight: ${toQty} kg`);
            return;
          }
        } else if (selectedMaster.customRuleType === 'between') {
          if (fromQty < limit || toQty > toLimit) {
            setError(`Weight must be between ${limit} and ${toLimit} kg. Current range: ${fromQty}-${toQty} kg`);
            return;
          }
        }
      }
      
      const location = locations.find(l => l._id === row.locationId);
      newRates.push({
        locationId: row.locationId,
        fromQty,
        toQty,
        rate,
        locationName: location?.name || 'Unknown',
        isActive: true,
        version: 1,
        createdAt: row.createdAt ? new Date(row.createdAt) : new Date()
      });
    }
    
    setAddingRates(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const existingRates = selectedMaster.locationRates || [];
      const allRates = [...existingRates, ...newRates];
      
      const payload = {
        title: selectedMaster.title,
        customerId: selectedMaster.customerId,
        branchId: selectedMaster.branchId,
        weightRule: selectedMaster.weightRule,
        customWeightRule: selectedMaster.customWeightRule || '',
        customRuleType: selectedMaster.customRuleType || '',
        customRuleLimit: selectedMaster.customRuleLimit || null,
        customRuleToLimit: selectedMaster.customRuleToLimit || null,
        approvalOption: selectedMaster.approvalOption,
        approvalFile: selectedMaster.approvalFile || {
          fileName: '',
          filePath: '',
          fileType: '',
          fileSize: 0,
          uploadedAt: null
        },
        locationRates: allRates.map(r => ({
          locationId: r.locationId,
          fromQty: r.fromQty,
          toQty: r.toQty,
          rate: r.rate,
          isActive: r.isActive !== undefined ? r.isActive : true,
          version: r.version || 1,
          createdAt: r.createdAt || new Date()
        }))
      };
      
      const res = await fetch(`/api/rate-master?id=${selectedMaster._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add location rates');
      }
      
      setSuccess('Location rates added successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
      setLocationRows([]);
      setShowAddForm(false);
      await fetchSingleRateMaster(selectedMaster._id);
      await fetchRateMasters();
      
    } catch (error) {
      console.error('Error adding location rates:', error);
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setAddingRates(false);
    }
  };

  const viewHistory = async (locationId, locationName) => {
    setSelectedHistoryLocation(locationName);
    await fetchHistory(selectedMaster._id, locationId);
  };

  const handleViewRates = async (masterId) => {
    if (selectedMasterId === masterId) {
      setSelectedMasterId(null);
      setSelectedMaster(null);
      setShowAddForm(false);
      setLocationRows([]);
      setLocationFilterTerm('');
      setShowHistory(false);
      setApprovalFileData(null);
    } else {
      setSelectedMasterId(masterId);
      await fetchSingleRateMaster(masterId);
      setShowAddForm(false);
      setLocationRows([]);
      setLocationFilterTerm('');
      setShowHistory(false);
    }
  };

  const handleBackToList = () => {
    setSelectedMasterId(null);
    setSelectedMaster(null);
    setShowAddForm(false);
    setLocationRows([]);
    setLocationFilterTerm('');
    setShowHistory(false);
    setApprovalFileData(null);
  };

  useEffect(() => {
    if (rateMasters.length === 0) return;
    
    let filtered = [...rateMasters];
    
    if (searchTerm) {
      filtered = filtered.filter(master =>
        master.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        master.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        master.branchName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredMasters(filtered);
  }, [searchTerm, rateMasters]);

  useEffect(() => {
    fetchCustomers();
    fetchBranches();
    fetchLocations();
    fetchRateMasters();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Rate Master Management</h1>
            <p className="text-gray-600">
              {selectedMasterId ? `Viewing: ${selectedMaster?.title}` : 'Create and manage rate masters'}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedMasterId && (
              <button
                onClick={handleBackToList}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                ← Back to List
              </button>
            )}
            <button
              onClick={() => router.push('/admin/rate-master/create')}
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
            >
              + Create New Rate Master
            </button>
          </div>
        </div>
      </div>

      {formError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {formError}
        </div>
      )}
      
      {formSuccess && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {formSuccess}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      {!selectedMasterId && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold">Create New Rate Master</h2>
            <p className="text-gray-600">Enter basic information</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter rate master title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map((customer) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.customerName} ({customer.customerCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch <span className="text-red-500">*</span>
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name} ({branch.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight Rule <span className="text-red-500">*</span>
                </label>
                <select
                  value={weightRule}
                  onChange={(e) => {
                    setWeightRule(e.target.value);
                    if (e.target.value !== 'custom') {
                      setCustomWeightRule('');
                      setCustomRuleType('');
                      setCustomRuleLimit('');
                      setCustomRuleToLimit('');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="all_weights">All Weights</option>
                  <option value="above_25">Above 25 kg</option>
                  <option value="below_25">Below 25 kg</option>
                  <option value="custom">Custom Rule</option>
                </select>
                
                {weightRule === 'custom' && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rule Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={customRuleType}
                        onChange={(e) => {
                          setCustomRuleType(e.target.value);
                          setCustomRuleLimit('');
                          setCustomRuleToLimit('');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Rule Type</option>
                        <option value="above">Above</option>
                        <option value="below">Below</option>
                        <option value="between">Between</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {customRuleType === 'above' && 'Minimum Weight (kg)'}
                        {customRuleType === 'below' && 'Maximum Weight (kg)'}
                        {customRuleType === 'between' && 'From Weight (kg)'}
                        {!customRuleType && 'Weight Limit (kg)'}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={customRuleLimit}
                        onChange={(e) => setCustomRuleLimit(e.target.value)}
                        placeholder={customRuleType === 'above' ? 'e.g., 50' : customRuleType === 'below' ? 'e.g., 30' : customRuleType === 'between' ? 'e.g., 10' : 'Enter limit'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={weightRule === 'custom'}
                      />
                    </div>
                    
                    {customRuleType === 'between' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          To Weight (kg) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={customRuleToLimit}
                          onChange={(e) => setCustomRuleToLimit(e.target.value)}
                          placeholder="e.g., 100"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required={customRuleType === 'between'}
                        />
                      </div>
                    )}
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-1">
                  {weightRule === 'above_25' 
                    ? 'Only applicable for weights above 25 kg' 
                    : weightRule === 'below_25'
                    ? 'Only applicable for weights below 25 kg'
                    : weightRule === 'custom' && customRuleType && customRuleLimit
                    ? `${customRuleType.charAt(0).toUpperCase() + customRuleType.slice(1)} ${customRuleLimit} kg rule`
                    : weightRule === 'custom'
                    ? 'Custom rule configuration'
                    : 'Applicable for all weight ranges'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Option <span className="text-red-500">*</span>
                </label>
                <select
                  value={approvalOption}
                  onChange={(e) => {
                    setApprovalOption(e.target.value);
                    // Reset file when switching options
                    setApprovalFile(null);
                    setApprovalFileData(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="contract_rate">Contract Rate</option>
                  <option value="mail_approval">Mail Approval</option>
                </select>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {approvalOption === 'contract_rate' ? 'Upload Contract Document' : 'Upload Mail Approval Document'}
                <span className="text-xs text-gray-500 ml-2">(PDF, PNG, JPG - Max 5MB)</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                {uploadingFile && (
                  <div className="text-sm text-blue-600">Uploading...</div>
                )}
              </div>
              
              {approvalFileData && approvalFileData.fileName && (
                <div className="mt-2 flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <span className="text-sm text-green-700">✅ File uploaded: {approvalFileData.fileName}</span>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}
              
              {selectedMaster && selectedMaster.approvalFile && selectedMaster.approvalFile.fileName && (
                <div className="mt-2 flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <span className="text-sm text-blue-700">📎 Current file: {selectedMaster.approvalFile.fileName}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2 rounded text-white ${
                  loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {loading ? 'Creating...' : 'Create Rate Master'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitle('');
                  setCustomerId('');
                  setBranchId('');
                  setWeightRule('all_weights');
                  setCustomWeightRule('');
                  setCustomRuleType('');
                  setCustomRuleLimit('');
                  setCustomRuleToLimit('');
                  setApprovalOption('contract_rate');
                  setApprovalFile(null);
                  setApprovalFileData(null);
                }}
                className="px-6 py-2 rounded text-gray-700 bg-gray-200 hover:bg-gray-300"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      )}

      {!selectedMasterId && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold">Rate Masters List</h2>
            <p className="text-gray-600">Click "Add/View Rates" to manage location rates</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search by Title, Customer or Branch
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type title, customer or branch to search..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loading && rateMasters.length === 0 ? (
            <div className="text-center py-8">Loading rate masters...</div>
          ) : filteredMasters.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm 
                ? `No rate masters found matching your search: "${searchTerm}"`
                : 'No rate masters found. Create your first rate master!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 border text-left text-sm font-semibold">S.No</th>
                    <th className="px-4 py-3 border text-left text-sm font-semibold">Title</th>
                    <th className="px-4 py-3 border text-left text-sm font-semibold">Customer</th>
                    <th className="px-4 py-3 border text-left text-sm font-semibold">Branch</th>
                    <th className="px-4 py-3 border text-left text-sm font-semibold">Weight Rule</th>
                    <th className="px-4 py-3 border text-left text-sm font-semibold">Approval</th>
                    <th className="px-4 py-3 border text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 border text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMasters.map((master, index) => (
                    <tr key={master._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border text-sm">{index + 1}</td>
                      <td className="px-4 py-2 border text-sm font-medium">{master.title}</td>
                      <td className="px-4 py-2 border text-sm">{master.customerName}</td>
                      <td className="px-4 py-2 border text-sm">{master.branchName}</td>
                      <td className="px-4 py-2 border text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          master.weightRule === 'above_25' 
                            ? 'bg-orange-100 text-orange-800' 
                            : master.weightRule === 'below_25'
                            ? 'bg-purple-100 text-purple-800'
                            : master.weightRule === 'custom'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {getWeightRuleLabel(master.weightRule, master.customWeightRule, master.customRuleType, master.customRuleLimit, master.customRuleToLimit)}
                        </span>
                      </td>
                      <td className="px-4 py-2 border text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          master.approvalOption === 'contract_rate' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {getApprovalLabel(master.approvalOption)}
                        </span>
                      </td>
                      <td className="px-4 py-2 border text-sm">
                        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          {master.locationRates?.filter(r => r.isActive !== false).length || 0} Active | {master.locationRates?.filter(r => r.isActive === false).length || 0} History
                        </span>
                        {master.approvalFile && master.approvalFile.fileName && (
                          <span className="ml-1 text-xs text-blue-600">📎</span>
                        )}
                      </td>
                      <td className="px-4 py-2 border text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewRates(master._id)}
                            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-xs whitespace-nowrap"
                          >
                            Add/View Rates
                          </button>
                          <button
                            onClick={() => router.push(`/admin/rate-master/edit/${master._id}`)}
                            className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteRateMaster(master._id)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedMasterId && selectedMaster && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{selectedMaster.title}</h2>
                <p className="text-sm text-gray-300 mt-1">
                  Customer: {selectedMaster.customerName} | Branch: {selectedMaster.branchName}
                </p>
                <div className="flex gap-3 mt-3 flex-wrap">
                  <span className={`px-2 py-1 rounded text-xs ${
                    selectedMaster.weightRule === 'above_25' 
                      ? 'bg-orange-600 text-white' 
                      : selectedMaster.weightRule === 'below_25'
                      ? 'bg-purple-600 text-white'
                      : selectedMaster.weightRule === 'custom'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-green-600 text-white'
                  }`}>
                    {getWeightRuleLabel(selectedMaster.weightRule, selectedMaster.customWeightRule, selectedMaster.customRuleType, selectedMaster.customRuleLimit, selectedMaster.customRuleToLimit)}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    selectedMaster.approvalOption === 'contract_rate' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-pink-600 text-white'
                  }`}>
                    {getApprovalLabel(selectedMaster.approvalOption)}
                  </span>
                  <span className="px-2 py-1 rounded text-xs bg-yellow-600 text-white">
                    {selectedMaster.locationRates?.filter(r => r.isActive !== false).length || 0} Active | {selectedMaster.locationRates?.filter(r => r.isActive === false).length || 0} History
                  </span>
                  {selectedMaster.approvalFile && selectedMaster.approvalFile.fileName && (
                    <span className="px-2 py-1 rounded text-xs bg-blue-600 text-white">
                      📎 {selectedMaster.approvalFile.fileName}
                    </span>
                  )}
                </div>
                {selectedMaster.weightRule === 'above_25' && (
                  <div className="mt-3 p-2 bg-blue-900/30 rounded text-xs text-blue-200">
                    ⚠️ <strong>Above 25 kg Rule:</strong> From weight must be 25 kg or above.
                  </div>
                )}
                {selectedMaster.weightRule === 'below_25' && (
                  <div className="mt-3 p-2 bg-purple-900/30 rounded text-xs text-purple-200">
                    ⚠️ <strong>Below 25 kg Rule:</strong> To weight must be below 25 kg.
                  </div>
                )}
                {selectedMaster.weightRule === 'custom' && selectedMaster.customRuleType && selectedMaster.customRuleLimit && (
                  <div className="mt-3 p-2 bg-indigo-900/30 rounded text-xs text-indigo-200">
                    ⚠️ <strong>{selectedMaster.customRuleType.charAt(0).toUpperCase() + selectedMaster.customRuleType.slice(1)} {selectedMaster.customRuleLimit} kg Rule:</strong> 
                    {selectedMaster.customRuleType === 'above' && ` Weight must be ${selectedMaster.customRuleLimit} kg or above`}
                    {selectedMaster.customRuleType === 'below' && ` Weight must be ${selectedMaster.customRuleLimit} kg or below`}
                    {selectedMaster.customRuleType === 'between' && ` Weight must be between ${selectedMaster.customRuleLimit} and ${selectedMaster.customRuleToLimit} kg`}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium"
                >
                  {showAddForm ? 'Cancel' : '+ Add New Location'}
                </button>
                <button
                  onClick={() => router.push(`/admin/rate-master/edit/${selectedMaster._id}`)}
                  className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-sm"
                >
                  Edit Master
                </button>
              </div>
            </div>
          </div>

          {showAddForm && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-md font-semibold mb-3 text-gray-800">Add New Location Rates</h3>
              <p className="text-sm text-gray-600 mb-3">⚠️ Weight ranges should not overlap with existing active rates.</p>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 bg-white">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 border text-left text-sm font-semibold">Location *</th>
                      <th className="px-4 py-2 border text-left text-sm font-semibold">From Weight (kg)</th>
                      <th className="px-4 py-2 border text-left text-sm font-semibold">To Weight (kg)</th>
                      <th className="px-4 py-2 border text-left text-sm font-semibold">Rate (₹)</th>
                      <th className="px-4 py-2 border text-left text-sm font-semibold">Created Date</th>
                      <th className="px-4 py-2 border text-left text-sm font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-2 border">
                          <div className="flex gap-2 items-center">
                            <select
                              value={row.locationId}
                              onChange={(e) => updateLocationRow(row.id, 'locationId', e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select Location</option>
                              {sortedLocations.map((location) => (
                                <option key={location._id} value={location._id}>
                                  {location.name} {location.state ? `(${location.state})` : ''}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setShowAddLocationModal(true)}
                              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm whitespace-nowrap"
                              title="Add New Location"
                            >
                              + Add
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-2 border">
                          <input
                            type="number"
                            step="0.01"
                            value={row.fromQty}
                            onChange={(e) => updateLocationRow(row.id, 'fromQty', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-2 border">
                          <input
                            type="number"
                            step="0.01"
                            value={row.toQty}
                            onChange={(e) => updateLocationRow(row.id, 'toQty', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="100.00"
                          />
                        </td>
                        <td className="px-4 py-2 border">
                          <input
                            type="number"
                            step="0.01"
                            value={row.rate}
                            onChange={(e) => updateLocationRow(row.id, 'rate', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-2 border">
                          <input
                            type="date"
                            value={row.createdAt}
                            onChange={(e) => updateLocationRow(row.id, 'createdAt', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 border text-center">
                          <button
                            type="button"
                            onClick={() => removeLocationRow(row.id)}
                            className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-between mt-4">
                <button
                  type="button"
                  onClick={addLocationRow}
                  className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
                >
                  + Add Another Location
                </button>
                <button
                  type="button"
                  onClick={handleAddRates}
                  disabled={addingRates}
                  className={`px-6 py-2 rounded text-white ${
                    addingRates ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {addingRates ? 'Saving...' : 'Save Location Rates'}
                </button>
              </div>
            </div>
          )}

          {/* Revision Modal */}
          {showRevisionModal && revisionRate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-96 max-w-md">
                <div className="bg-orange-600 text-white px-6 py-3 rounded-t-lg flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Revise Rate</h3>
                  <button
                    onClick={() => {
                      setShowRevisionModal(false);
                      setRevisionRate(null);
                    }}
                    className="text-white hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Current Rate: {revisionRate.fromQty} - {revisionRate.toQty} kg → ₹{revisionRate.rate}
                  </p>
                  <p className="text-sm text-red-500 mb-4">
                    ⚠️ Old rate will be moved to HISTORY under this location
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        From Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={revisionFromQty}
                        onChange={(e) => setRevisionFromQty(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        To Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={revisionToQty}
                        onChange={(e) => setRevisionToQty(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rate (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={revisionRateValue}
                        onChange={(e) => setRevisionRateValue(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Created Date
                      </label>
                      <input
                        type="date"
                        value={revisionCreatedDate}
                        onChange={(e) => setRevisionCreatedDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Select the created date for this rate</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => {
                        setShowRevisionModal(false);
                        setRevisionRate(null);
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitRevision}
                      disabled={addingRates}
                      className={`flex-1 px-4 py-2 rounded text-white ${
                        addingRates ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
                      }`}
                    >
                      {addingRates ? 'Saving...' : 'Save Revision'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Modal */}
          {showHistory && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-4xl max-h-[80vh] overflow-auto">
                <div className="bg-gray-800 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Rate History - {selectedHistoryLocation}</h3>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="text-white hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-6">
                  {historyData.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No history found for this location</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 border text-left text-sm font-semibold">Created Date</th>
                            <th className="px-4 py-2 border text-left text-sm font-semibold">Version</th>
                            <th className="px-4 py-2 border text-left text-sm font-semibold">From (kg)</th>
                            <th className="px-4 py-2 border text-left text-sm font-semibold">To (kg)</th>
                            <th className="px-4 py-2 border text-left text-sm font-semibold">Rate (₹)</th>
                            <th className="px-4 py-2 border text-left text-sm font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyData.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 border text-sm">{formatDate(item.createdAt)}</td>
                              <td className="px-4 py-2 border text-sm">
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs">v{item.version}</span>
                              </td>
                              <td className="px-4 py-2 border text-sm">{item.fromQty}</td>
                              <td className="px-4 py-2 border text-sm">{item.toQty}</td>
                              <td className="px-4 py-2 border text-sm">
                                <span className="font-medium">₹ {item.rate}</span>
                              </td>
                              <td className="px-4 py-2 border text-sm">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  item.action === 'CREATED' ? 'bg-green-100 text-green-800' :
                                  item.action === 'REVISED' ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {item.action}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Location Filter */}
          {(selectedMaster.locationRates && selectedMaster.locationRates.length > 0) && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔍 Filter by Location Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={locationFilterTerm}
                  onChange={(e) => setLocationFilterTerm(e.target.value)}
                  placeholder="Type location name to filter..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {locationFilterTerm && (
                  <button
                    onClick={() => setLocationFilterTerm('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Display Rates Grouped by Location */}
          {selectedMaster.locationRates && selectedMaster.locationRates.length > 0 ? (
            <div>
              {(() => {
                const locationsMap = new Map();
                
                selectedMaster.locationRates.forEach(rate => {
                  if (!locationsMap.has(rate.locationId)) {
                    locationsMap.set(rate.locationId, {
                      locationId: rate.locationId,
                      locationName: rate.locationName,
                      activeRates: [],
                      inactiveRates: []
                    });
                  }
                  
                  const locationData = locationsMap.get(rate.locationId);
                  if (rate.isActive !== false) {
                    locationData.activeRates.push(rate);
                  } else {
                    locationData.inactiveRates.push(rate);
                  }
                });
                
                let allLocations = Array.from(locationsMap.values())
                  .sort((a, b) => a.locationName.localeCompare(b.locationName));
                
                if (locationFilterTerm && locationFilterTerm.trim() !== '') {
                  allLocations = allLocations.filter(loc =>
                    loc.locationName?.toLowerCase().includes(locationFilterTerm.toLowerCase())
                  );
                }
                
                return allLocations.map((location) => (
                  <div key={location.locationId} className="mb-8 border rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-3">
                      <h3 className="text-lg font-semibold">📍 {location.locationName}</h3>
                    </div>
                    
                    {/* Active Rates Table */}
                    {location.activeRates.length > 0 && (
                      <div className="p-4">
                        <h4 className="text-md font-semibold text-green-700 mb-3">✅ Active Rates</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full border border-gray-200">
                            <thead className="bg-green-50">
                              <tr>
                                <th className="px-4 py-2 border text-left text-sm font-semibold">Created Date</th>
                                <th className="px-4 py-2 border text-left text-sm font-semibold">Version</th>
                                <th className="px-4 py-2 border text-left text-sm font-semibold">From Weight (kg)</th>
                                <th className="px-4 py-2 border text-left text-sm font-semibold">To Weight (kg)</th>
                                <th className="px-4 py-2 border text-left text-sm font-semibold">Rate (₹)</th>
                                <th className="px-4 py-2 border text-left text-sm font-semibold">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {location.activeRates
                                .sort((a, b) => a.fromQty - b.fromQty)
                                .map((rate) => (
                                  <tr key={rate._id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 border text-sm">
                                      {editingRateId === rate._id ? (
                                        <div className="flex gap-2 items-center">
                                          <input
                                            type="date"
                                            value={editingDateValue}
                                            onChange={(e) => setEditingDateValue(e.target.value)}
                                            className="px-2 py-1 border border-gray-300 rounded text-sm w-32"
                                          />
                                          <button
                                            onClick={() => updateRateCreatedDate(rate._id, editingDateValue)}
                                            className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={cancelEditDate}
                                            className="bg-gray-500 text-white px-2 py-1 rounded text-xs"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span>{formatDateOnly(rate.createdAt)}</span>
                                          <button
                                            onClick={() => startEditDate(rate._id, rate.createdAt)}
                                            className="text-blue-500 hover:text-blue-700 text-sm"
                                            title="Edit created date"
                                          >
                                            📅
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 border text-sm">
                                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">v{rate.version || 1}</span>
                                    </td>
                                    <td className="px-4 py-2 border text-sm">{rate.fromQty}</td>
                                    <td className="px-4 py-2 border text-sm">{rate.toQty}</td>
                                    <td className="px-4 py-2 border text-sm">
                                      <span className="font-medium text-green-600">₹ {rate.rate}</span>
                                    </td>
                                    <td className="px-4 py-2 border text-sm">
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => openRevisionModal(rate)}
                                          className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600"
                                        >
                                          Revise
                                        </button>
                                        <button
                                          onClick={() => deleteSingleRate(rate._id)}
                                          className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                        <button
                          onClick={() => viewHistory(location.locationId, location.locationName)}
                          className="mt-3 bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                        >
                          View Full History
                        </button>
                      </div>
                    )}
                    
                    {/* Inactive/History Rates Table */}
                    {location.inactiveRates.length > 0 && (
                      <div className="p-4 bg-gray-50 border-t">
                        <h4 className="text-md font-semibold text-gray-600 mb-3">📜 Rate History (Replaced/Inactive)</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full border border-gray-300 bg-gray-100">
                            <thead className="bg-gray-300">
                              <tr>
                                <th className="px-4 py-2 border text-left text-sm font-semibold">Created Date</th>
                                <th className="px-4 py-2 border text-left text-sm font-semibold">Version</th>
                                <th className="px-4 py-2 border text-left text-sm font-semibold">From Weight (kg)</th>
                                <th className="px-4 py-2 border text-left text-sm font-semibold">To Weight (kg)</th>
                                <th className="px-4 py-2 border text-left text-sm font-semibold">Rate (₹)</th>
                                <th className="px-4 py-2 border text-left text-sm font-semibold">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {location.inactiveRates
                                .sort((a, b) => b.createdAt - a.createdAt)
                                .map((rate) => (
                                  <tr key={rate._id} className="bg-gray-100">
                                    <td className="px-4 py-2 border text-sm text-gray-500">{formatDateOnly(rate.createdAt)}</td>
                                    <td className="px-4 py-2 border text-sm text-gray-500">
                                      <span className="px-2 py-1 bg-gray-400 text-gray-700 rounded text-xs">v{rate.version || 1}</span>
                                    </td>
                                    <td className="px-4 py-2 border text-sm text-gray-500">{rate.fromQty}</td>
                                    <td className="px-4 py-2 border text-sm text-gray-500">{rate.toQty}</td>
                                    <td className="px-4 py-2 border text-sm">
                                      <span className="font-medium text-gray-500 line-through">₹ {rate.rate}</span>
                                    </td>
                                    <td className="px-4 py-2 border text-sm">
                                      <span className="px-2 py-1 bg-gray-500 text-white rounded text-xs">Inactive</span>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {location.activeRates.length === 0 && location.inactiveRates.length === 0 && (
                      <div className="p-4 text-center text-gray-500">
                        No rates available for this location
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No location rates added for this rate master yet.
              <button
                onClick={() => setShowAddForm(true)}
                className="ml-2 text-blue-600 hover:text-blue-800 font-medium"
              >
                Click here to add rates →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Location Modal */}
      <AddLocationModal
        isOpen={showAddLocationModal}
        onClose={() => setShowAddLocationModal(false)}
        onSave={handleAddLocation}
        loading={addingLocation}
      />
    </div>
  );
}