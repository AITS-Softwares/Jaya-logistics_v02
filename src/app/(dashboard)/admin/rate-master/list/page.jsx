// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';

// export default function RateMasterListPage() {
//   const router = useRouter();
  
//   // Data state
//   const [rateMasters, setRateMasters] = useState([]);
//   const [filteredMasters, setFilteredMasters] = useState([]);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [success, setSuccess] = useState(null);

//   // Fetch Rate Masters
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

//   // Search filter
//   useEffect(() => {
//     if (searchTerm) {
//       const filtered = rateMasters.filter(master =>
//         master.title?.toLowerCase().includes(searchTerm.toLowerCase())
//       );
//       setFilteredMasters(filtered);
//     } else {
//       setFilteredMasters(rateMasters);
//     }
//   }, [searchTerm, rateMasters]);

//   useEffect(() => {
//     fetchRateMasters();
//   }, []);

//   // Delete Rate Master
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
//       fetchRateMasters();
//       setSuccess('Rate master deleted successfully!');
//       setTimeout(() => setSuccess(null), 3000);
//     } catch (error) {
//       console.error('Error deleting rate master:', error);
//       setError(error.message);
//       setTimeout(() => setError(null), 3000);
//     }
//   };

//   // Helper function to get weight rule label
//   const getWeightRuleLabel = (rule) => {
//     return rule === 'above_25' ? 'Above 25 kg' : 'All Weights';
//   };

//   // Helper function to get approval option label
//   const getApprovalLabel = (option) => {
//     return option === 'contract_rate' ? 'Contract Rate' : 'Mail Approval';
//   };

//   return (
//     <div className="container mx-auto p-4">
//       {/* Header Section */}
//       <div className="bg-white rounded-lg shadow-md p-6 mb-6">
//         <div className="flex justify-between items-center">
//           <div>
//             <h1 className="text-2xl font-bold">Rate Masters List</h1>
//             <p className="text-gray-600">All created rate masters</p>
//           </div>
//           <button
//             onClick={() => router.push('/admin/rate-master/create')}
//             className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
//           >
//             + Create New Rate Master
//           </button>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="bg-white rounded-lg shadow-md p-6">
//         {/* Search Section */}
//         <div className="mb-6">
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Search by Title
//           </label>
//           <input
//             type="text"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             placeholder="Type title to search..."
//             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>

//         {error && (
//           <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
//             {error}
//           </div>
//         )}
        
//         {success && (
//           <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
//             {success}
//           </div>
//         )}

//         {loading ? (
//           <div className="text-center py-8">Loading rate masters...</div>
//         ) : filteredMasters.length === 0 ? (
//           <div className="text-center py-8 text-gray-500">
//             {searchTerm ? 'No rate masters found matching your search' : 'No rate masters found. Create your first rate master!'}
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="min-w-full border border-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-4 py-3 border text-left text-sm font-semibold">S.No</th>
//                   <th className="px-4 py-3 border text-left text-sm font-semibold">Title</th>
//                   <th className="px-4 py-3 border text-left text-sm font-semibold">Customer</th>
//                   <th className="px-4 py-3 border text-left text-sm font-semibold">Branch</th>
//                   <th className="px-4 py-3 border text-left text-sm font-semibold">Weight Rule</th>
//                   <th className="px-4 py-3 border text-left text-sm font-semibold">Approval</th>
//                   <th className="px-4 py-3 border text-left text-sm font-semibold">Status</th>
//                   <th className="px-4 py-3 border text-left text-sm font-semibold">Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filteredMasters.map((master, index) => (
//                   <tr key={master._id} className="hover:bg-gray-50">
//                     <td className="px-4 py-2 border text-sm">{index + 1}</td>
//                     <td className="px-4 py-2 border text-sm font-medium">{master.title}</td>
//                     <td className="px-4 py-2 border text-sm">{master.customerName}</td>
//                     <td className="px-4 py-2 border text-sm">{master.branchName}</td>
//                     <td className="px-4 py-2 border text-sm">
//                       <span className={`px-2 py-1 rounded text-xs ${
//                         master.weightRule === 'above_25' 
//                           ? 'bg-orange-100 text-orange-800' 
//                           : 'bg-blue-100 text-blue-800'
//                       }`}>
//                         {getWeightRuleLabel(master.weightRule)}
//                       </span>
//                     </td>
//                     <td className="px-4 py-2 border text-sm">
//                       <span className={`px-2 py-1 rounded text-xs ${
//                         master.approvalOption === 'contract_rate' 
//                           ? 'bg-green-100 text-green-800' 
//                           : 'bg-purple-100 text-purple-800'
//                       }`}>
//                         {getApprovalLabel(master.approvalOption)}
//                       </span>
//                     </td>
//                     <td className="px-4 py-2 border text-sm">
//                       <span className={`px-2 py-1 rounded text-xs ${
//                         master.locationRates?.length > 0 
//                           ? 'bg-green-100 text-green-800' 
//                           : 'bg-yellow-100 text-yellow-800'
//                       }`}>
//                         {master.locationRates?.length || 0} Locations Added
//                       </span>
//                     </td>
//                     <td className="px-4 py-2 border text-sm">
//                       <div className="flex gap-2">
//                         <button
//                           onClick={() => router.push(`/admin/rate-master/rates/${master._id}`)}
//                           className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-xs"
//                         >
//                           Add/View Rates
//                         </button>
//                         <button
//                           onClick={() => router.push(`/admin/rate-master/edit/${master._id}`)}
//                           className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-xs"
//                         >
//                           Edit
//                         </button>
//                         <button
//                           onClick={() => deleteRateMaster(master._id)}
//                           className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-xs"
//                         >
//                           Delete
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RateMasterListPage() {
  const router = useRouter();
  
  // Data state
  const [rateMasters, setRateMasters] = useState([]);
  const [filteredMasters, setFilteredMasters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Modal state for viewing attachment
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);

  // Fetch Rate Masters
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

  // Search filter
  useEffect(() => {
    if (searchTerm) {
      const filtered = rateMasters.filter(master =>
        master.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMasters(filtered);
    } else {
      setFilteredMasters(rateMasters);
    }
  }, [searchTerm, rateMasters]);

  useEffect(() => {
    fetchRateMasters();
  }, []);

  // Delete Rate Master
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
      fetchRateMasters();
      setSuccess('Rate master deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting rate master:', error);
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  // Helper function to get weight rule label
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

  // Helper function to get approval option label
  const getApprovalLabel = (option) => {
    return option === 'contract_rate' ? 'Contract Rate' : 'Mail Approval';
  };

  // Helper function to get file icon based on file type
  const getFileIcon = (fileType) => {
    if (!fileType) return '📄';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel')) return '📊';
    return '📄';
  };

  // View attachment handler
  const viewAttachment = (master) => {
    if (master.approvalFile && master.approvalFile.fileName) {
      setSelectedAttachment({
        fileName: master.approvalFile.fileName,
        filePath: master.approvalFile.filePath,
        fileType: master.approvalFile.fileType,
        fileSize: master.approvalFile.fileSize,
        uploadedAt: master.approvalFile.uploadedAt,
        title: master.title,
        approvalOption: master.approvalOption
      });
      setShowAttachmentModal(true);
    }
  };

  return (
    <div className="container mx-auto p-4">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Rate Masters List</h1>
            <p className="text-gray-600">All created rate masters</p>
          </div>
          <button
            onClick={() => router.push('/admin/rate-master/create')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            + Create New Rate Master
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Search Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search by Title
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type title to search..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

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

        {loading ? (
          <div className="text-center py-8">Loading rate masters...</div>
        ) : filteredMasters.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No rate masters found matching your search' : 'No rate masters found. Create your first rate master!'}
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
                  <th className="px-4 py-3 border text-left text-sm font-semibold">Attachment</th>
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
                    <td className="px-4 py-2 border text-sm text-center">
                      {master.approvalFile && master.approvalFile.fileName ? (
                        <button
                          onClick={() => viewAttachment(master)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition text-xs"
                        >
                          <span>{getFileIcon(master.approvalFile.fileType)}</span>
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">No file</span>
                      )}
                    </td>
                    <td className="px-4 py-2 border text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        master.locationRates?.filter(r => r.isActive !== false).length > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {master.locationRates?.filter(r => r.isActive !== false).length || 0} Active
                      </span>
                      {master.locationRates?.filter(r => r.isActive === false).length > 0 && (
                        <span className="ml-1 px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                          {master.locationRates?.filter(r => r.isActive === false).length} History
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 border text-sm">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => router.push(`/admin/rate-master/rates/${master._id}`)}
                          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-xs"
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

      {/* Attachment View Modal */}
      {showAttachmentModal && selectedAttachment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-2xl max-h-[90vh] overflow-auto">
            <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Attachment Details</h3>
                <p className="text-sm text-blue-100">{selectedAttachment.title}</p>
              </div>
              <button
                onClick={() => {
                  setShowAttachmentModal(false);
                  setSelectedAttachment(null);
                }}
                className="text-white hover:text-gray-200 text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">File Name</label>
                  <p className="text-sm font-medium text-gray-900">{selectedAttachment.fileName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Approval Type</label>
                  <p className="text-sm font-medium text-gray-900">
                    {getApprovalLabel(selectedAttachment.approvalOption)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">File Type</label>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedAttachment.fileType || 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">File Size</label>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedAttachment.fileSize 
                      ? `${(selectedAttachment.fileSize / 1024).toFixed(2)} KB` 
                      : 'Unknown'}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Uploaded At</label>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedAttachment.uploadedAt 
                      ? new Date(selectedAttachment.uploadedAt).toLocaleString() 
                      : 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  {selectedAttachment.filePath ? (
                    <a
                      href={selectedAttachment.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                    >
                      <span>📄</span>
                      View File
                    </a>
                  ) : (
                    <p className="text-gray-500">File path not available</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowAttachmentModal(false);
                    setSelectedAttachment(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}