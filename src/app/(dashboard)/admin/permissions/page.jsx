// // src/app/(dashboard)/admin/permissions/page.js
// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { usePermission } from "../hooks/usePermission";
// import {
//   FiShield, FiUser, FiCheck, FiX, FiSearch, FiEdit2,
//   FiSave, FiRefreshCw, FiUsers, FiEye, FiPlus, FiTrash2,
//   FiCheckCircle, FiXCircle, FiPrinter, FiDownload, FiMail,
//   FiMessageSquare, FiChevronDown
// } from "react-icons/fi";

// // Permission definitions
// const PERMISSION_TYPES = [
//   { id: 'view', label: 'View', icon: FiEye, color: 'blue' },
//   { id: 'create', label: 'Create', icon: FiPlus, color: 'green' },
//   { id: 'edit', label: 'Edit', icon: FiEdit2, color: 'yellow' },
//   { id: 'delete', label: 'Delete', icon: FiTrash2, color: 'red' },
//   { id: 'approve', label: 'Approve', icon: FiCheckCircle, color: 'purple' },
//   { id: 'reject', label: 'Reject', icon: FiXCircle, color: 'red' },
//   { id: 'export', label: 'Export', icon: FiDownload, color: 'indigo' },
//   { id: 'print', label: 'Print', icon: FiPrinter, color: 'gray' },
//   { id: 'email', label: 'Email', icon: FiMail, color: 'blue' },
//   { id: 'whatsapp', label: 'WhatsApp', icon: FiMessageSquare, color: 'green' },
// ];

// // Module configurations
// const MODULES_CONFIG = {
//   'Order Panel': { icon: '📋', permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject'] },
//   'Vehicle Negotiation': { icon: '🚚', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
//   'Pricing Panel': { icon: '💰', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
//   'Loading Info': { icon: '📦', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
//   'Purchase Panel': { icon: '🛒', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
//   'Consignment Note': { icon: '📄', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
//   'Advance Payment': { icon: '💳', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
//   'Proof Of Delivery': { icon: '✅', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
//   'Balance-Payment': { icon: '⚖️', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
//   'Billing': { icon: '🧾', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
//   'order-full-report': { icon: '📊', permissions: ['view', 'export', 'print'] },
//   'Purchase Quotation': { icon: '📝', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
//   'Purchase Order': { icon: '📋', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
//   'GRN': { icon: '📦', permissions: ['view', 'create', 'edit', 'delete'] },
//   'Purchase Invoice': { icon: '🧾', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
//   'Debit Notes': { icon: '📉', permissions: ['view', 'create', 'edit', 'delete'] },
//   'Purchase Report': { icon: '📊', permissions: ['view', 'export', 'print'] },
//   'Customers': { icon: '👥', permissions: ['view', 'create', 'edit', 'delete'] },
//   'Suppliers': { icon: '🏭', permissions: ['view', 'create', 'edit', 'delete'] },
//   'Items': { icon: '📦', permissions: ['view', 'create', 'edit', 'delete'] },
//   'Company': { icon: '🏢', permissions: ['view', 'edit'] },
//   'Users': { icon: '👤', permissions: ['view', 'create', 'edit', 'delete'] },
//   'Accounts': { icon: '💰', permissions: ['view', 'create', 'edit', 'delete'] },
//   'Employees': { icon: '👨‍💼', permissions: ['view', 'create', 'edit', 'delete'] },
//   'Inventory': { icon: '📊', permissions: ['view', 'create', 'edit', 'delete', 'adjust'] },
//   'Payment Entry': { icon: '💳', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
//   'Journal Entry': { icon: '📒', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
//   'Reports': { icon: '📊', permissions: ['view', 'export', 'print'] },
//   'Profit & Loss': { icon: '📈', permissions: ['view', 'export', 'print'] },
//   'Balance Sheet': { icon: '📊', permissions: ['view', 'export', 'print'] },
//   'BoM': { icon: '🔧', permissions: ['view', 'create', 'edit', 'delete'] },
//   'Production Order': { icon: '🏭', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
//   'Project': { icon: '📋', permissions: ['view', 'create', 'edit', 'delete'] },
//   'Task': { icon: '✅', permissions: ['view', 'create', 'edit', 'delete'] },
//   'Lead Generation': { icon: '🎯', permissions: ['view', 'create', 'edit', 'delete'] },
//   'Opportunity': { icon: '💼', permissions: ['view', 'create', 'edit', 'delete'] },
//   'Campaign': { icon: '📢', permissions: ['view', 'create', 'edit', 'delete'] },
//   'Tickets': { icon: '🎫', permissions: ['view', 'create', 'edit', 'delete', 'resolve'] },
//   'Responses': { icon: '💬', permissions: ['view', 'create', 'edit', 'delete'] },
//   'PPC': { icon: '⚙️', permissions: ['view', 'create', 'edit', 'delete'] }
// };

// export default function PermissionsPage() {
//   const router = useRouter();
//   const { isAdmin, loading: authLoading } = usePermission();
//   const [users, setUsers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [selectedUser, setSelectedUser] = useState(null);
//   const [permissions, setPermissions] = useState({});
//   const [saving, setSaving] = useState(false);
//   const [message, setMessage] = useState({ type: '', text: '' });
//   const [expandedModules, setExpandedModules] = useState({});
//   const [quickSelect, setQuickSelect] = useState('');

//   useEffect(() => {
//     if (!isAdmin && !authLoading) {
//       router.push('/unauthorized');
//       return;
//     }
//     fetchUsers();
//   }, [isAdmin, authLoading]);

//   const fetchUsers = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem('token');
//       const response = await fetch('/api/company/users', {
//         headers: { Authorization: `Bearer ${token}` }
//       });
      
//       if (response.ok) {
//         const data = await response.json();
//         setUsers(Array.isArray(data) ? data : []);
//       }
//     } catch (error) {
//       console.error('Error fetching users:', error);
//       setMessage({ type: 'error', text: 'Failed to fetch users' });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const selectUser = (user) => {
//     setSelectedUser(user);
//     const userModules = user.modules || {};
//     const initializedPermissions = {};
    
//     Object.keys(MODULES_CONFIG).forEach(moduleName => {
//       const moduleData = userModules[moduleName] || { selected: false, permissions: {} };
//       initializedPermissions[moduleName] = {
//         selected: moduleData.selected || false,
//         permissions: {
//           ...Object.fromEntries(
//             MODULES_CONFIG[moduleName].permissions.map(p => [p, false])
//           ),
//           ...(moduleData.permissions || {})
//         }
//       };
//     });
    
//     setPermissions(initializedPermissions);
//     setExpandedModules({});
//     setMessage({ type: '', text: '' });
//   };

//   const toggleModule = (moduleName) => {
//     setPermissions(prev => ({
//       ...prev,
//       [moduleName]: {
//         ...prev[moduleName],
//         selected: !prev[moduleName]?.selected
//       }
//     }));
//   };

//   const togglePermission = (moduleName, permission) => {
//     setPermissions(prev => ({
//       ...prev,
//       [moduleName]: {
//         ...prev[moduleName],
//         permissions: {
//           ...prev[moduleName]?.permissions,
//           [permission]: !prev[moduleName]?.permissions?.[permission]
//         }
//       }
//     }));
//   };

//   const setAllPermissions = (moduleName, value) => {
//     const moduleConfig = MODULES_CONFIG[moduleName];
//     const newPermissions = {};
//     moduleConfig.permissions.forEach(p => {
//       newPermissions[p] = value;
//     });
    
//     setPermissions(prev => ({
//       ...prev,
//       [moduleName]: {
//         ...prev[moduleName],
//         selected: value,
//         permissions: newPermissions
//       }
//     }));
//   };

//   const applyQuickSelect = (type) => {
//     if (!selectedUser) return;
    
//     const allModules = Object.keys(MODULES_CONFIG);
//     const newPermissions = {};
    
//     allModules.forEach(moduleName => {
//       const moduleConfig = MODULES_CONFIG[moduleName];
//       const currentPerms = permissions[moduleName] || { selected: false, permissions: {} };
      
//       let selected = false;
//       let perms = { ...currentPerms.permissions };
      
//       switch(type) {
//         case 'view-only':
//           selected = true;
//           moduleConfig.permissions.forEach(p => {
//             perms[p] = p === 'view';
//           });
//           break;
//         case 'full-access':
//           selected = true;
//           moduleConfig.permissions.forEach(p => {
//             perms[p] = true;
//           });
//           break;
//         case 'no-access':
//           selected = false;
//           moduleConfig.permissions.forEach(p => {
//             perms[p] = false;
//           });
//           break;
//         default:
//           selected = currentPerms.selected;
//           perms = currentPerms.permissions;
//       }
      
//       newPermissions[moduleName] = {
//         selected,
//         permissions: perms
//       };
//     });
    
//     setPermissions(newPermissions);
//     setQuickSelect(type);
//   };

//   const toggleModuleExpand = (moduleName) => {
//     setExpandedModules(prev => ({
//       ...prev,
//       [moduleName]: !prev[moduleName]
//     }));
//   };

//  // In src/app/(dashboard)/admin/permissions/page.js

// const savePermissions = async () => {
//   setSaving(true);
//   setMessage({ type: '', text: '' });
  
//   try {
//     const token = localStorage.getItem('token');
//     // CHANGE THIS URL to match your backend path
//     // From: /api/company/users/${selectedUser._id}/permissions
//     // To: /api/users/${selectedUser._id}/permissions
//     const response = await fetch(`/api/users/${selectedUser._id}/permissions`, {
//       method: 'PUT',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${token}`
//       },
//       body: JSON.stringify({ modules: permissions })
//     });
    
//     if (response.ok) {
//       setMessage({ type: 'success', text: 'Permissions saved successfully!' });
//       await fetchUsers();
//       const updatedUser = users.find(u => u._id === selectedUser._id);
//       if (updatedUser) setSelectedUser(updatedUser);
//     } else {
//       const data = await response.json();
//       setMessage({ type: 'error', text: data.message || 'Failed to save permissions' });
//     }
//   } catch (error) {
//     console.error('Error saving permissions:', error);
//     setMessage({ type: 'error', text: 'Error saving permissions' });
//   } finally {
//     setSaving(false);
//   }
// };

//   const getModuleCount = (user) => {
//     if (!user.modules) return 0;
//     return Object.values(user.modules).filter(m => m?.selected).length;
//   };

//   const getPermissionColor = (permission) => {
//     const found = PERMISSION_TYPES.find(p => p.id === permission);
//     return found ? found.color : 'gray';
//   };

//   const getPermissionIcon = (permission) => {
//     const found = PERMISSION_TYPES.find(p => p.id === permission);
//     return found ? found.icon : FiEye;
//   };

//   const filteredUsers = users.filter(user => 
//     user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     user.email?.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   // Check if user has permission to view this page
//   if (!isAdmin && !authLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-50">
//         <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg">
//           <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
//             <FiShield className="w-10 h-10 text-red-600" />
//           </div>
//           <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
//           <p className="text-gray-600 mb-6">
//             You don't have permission to manage permissions.
//             Please contact your administrator.
//           </p>
//           <button
//             onClick={() => router.push('/admin')}
//             className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
//           >
//             Return to Dashboard
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-7xl mx-auto px-4 py-8">
//         {/* Header */}
//         <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
//           <div>
//             <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
//               <FiShield className="text-indigo-600" />
//               Permission Management
//             </h1>
//             <p className="text-sm text-gray-500 mt-1">
//               Manage user access and permissions across all modules
//             </p>
//           </div>
//           <div className="flex items-center gap-3">
//             <button
//               onClick={fetchUsers}
//               className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
//             >
//               <FiRefreshCw className="w-4 h-4" />
//               Refresh
//             </button>
//           </div>
//         </div>

//         {message.text && (
//           <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
//             message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
//             'bg-red-50 border border-red-200 text-red-700'
//           }`}>
//             {message.type === 'success' ? <FiCheck className="w-5 h-5" /> : <FiX className="w-5 h-5" />}
//             {message.text}
//           </div>
//         )}

//         <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
//           {/* User List Sidebar */}
//           <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
//             <div className="flex items-center gap-2 mb-4">
//               <FiUsers className="text-gray-400" />
//               <h2 className="font-semibold text-gray-700">Users</h2>
//               <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
//                 {users.length}
//               </span>
//             </div>
            
//             <div className="relative mb-4">
//               <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//               <input
//                 type="text"
//                 placeholder="Search users..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
//               />
//             </div>

//             <div className="space-y-2 max-h-[600px] overflow-y-auto">
//               {loading ? (
//                 <div className="text-center py-8 text-gray-500">Loading...</div>
//               ) : filteredUsers.length === 0 ? (
//                 <div className="text-center py-8 text-gray-500">No users found</div>
//               ) : (
//                 filteredUsers.map(user => (
//                   <button
//                     key={user._id}
//                     onClick={() => selectUser(user)}
//                     className={`w-full text-left p-3 rounded-lg transition flex items-center gap-3 ${
//                       selectedUser?._id === user._id
//                         ? 'bg-indigo-50 border border-indigo-200'
//                         : 'hover:bg-gray-50 border border-transparent'
//                     }`}
//                   >
//                     <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold flex-shrink-0">
//                       {user.name?.charAt(0).toUpperCase() || '?'}
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <p className="text-sm font-medium text-gray-900 truncate">
//                         {user.name || 'Unnamed'}
//                       </p>
//                       <p className="text-xs text-gray-500 truncate">{user.email}</p>
//                       <div className="flex items-center gap-2 mt-1">
//                         <span className="text-xs text-indigo-600">
//                           {getModuleCount(user)} modules
//                         </span>
//                         {(user.roles || []).map(role => (
//                           <span key={role} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
//                             {role}
//                           </span>
//                         ))}
//                       </div>
//                     </div>
//                     <FiEdit2 className="w-4 h-4 text-gray-400" />
//                   </button>
//                 ))
//               )}
//             </div>
//           </div>

//           {/* Permissions Panel */}
//           <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             {!selectedUser ? (
//               <div className="flex flex-col items-center justify-center h-96 text-gray-400">
//                 <FiShield className="w-16 h-16 mb-4" />
//                 <p className="text-lg font-medium">Select a user</p>
//                 <p className="text-sm">Choose a user from the list to manage their permissions</p>
//               </div>
//             ) : (
//               <>
//                 {/* User Info */}
//                 <div className="flex flex-wrap items-center justify-between pb-4 border-b border-gray-200 mb-6">
//                   <div className="flex items-center gap-4">
//                     <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-lg">
//                       {selectedUser.name?.charAt(0).toUpperCase() || '?'}
//                     </div>
//                     <div>
//                       <h2 className="text-lg font-semibold text-gray-900">{selectedUser.name}</h2>
//                       <p className="text-sm text-gray-500">{selectedUser.email}</p>
//                     </div>
//                   </div>
//                   <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-0">
//                     {(selectedUser.roles || []).map(role => (
//                       <span key={role} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
//                         {role}
//                       </span>
//                     ))}
//                     <button
//                       onClick={savePermissions}
//                       disabled={saving}
//                       className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
//                     >
//                       {saving ? (
//                         <span className="flex items-center gap-2">
//                           <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
//                           Saving...
//                         </span>
//                       ) : (
//                         <>
//                           <FiSave className="w-4 h-4" />
//                           Save Permissions
//                         </>
//                       )}
//                     </button>
//                   </div>
//                 </div>

//                 {/* Quick Select */}
//                 <div className="mb-6 flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg">
//                   <span className="text-sm font-medium text-gray-700">Quick Apply:</span>
//                   <button
//                     onClick={() => applyQuickSelect('view-only')}
//                     className={`px-3 py-1 rounded-lg text-sm transition ${
//                       quickSelect === 'view-only' 
//                         ? 'bg-blue-500 text-white' 
//                         : 'bg-white border border-gray-200 hover:bg-gray-100'
//                     }`}
//                   >
//                     View Only
//                   </button>
//                   <button
//                     onClick={() => applyQuickSelect('full-access')}
//                     className={`px-3 py-1 rounded-lg text-sm transition ${
//                       quickSelect === 'full-access' 
//                         ? 'bg-green-500 text-white' 
//                         : 'bg-white border border-gray-200 hover:bg-gray-100'
//                     }`}
//                   >
//                     Full Access
//                   </button>
//                   <button
//                     onClick={() => applyQuickSelect('no-access')}
//                     className={`px-3 py-1 rounded-lg text-sm transition ${
//                       quickSelect === 'no-access' 
//                         ? 'bg-red-500 text-white' 
//                         : 'bg-white border border-gray-200 hover:bg-gray-100'
//                     }`}
//                   >
//                     No Access
//                   </button>
//                 </div>

//                 {/* Permissions Grid */}
//                 <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2">
//                   {Object.keys(MODULES_CONFIG).map(moduleName => {
//                     const module = MODULES_CONFIG[moduleName];
//                     const modulePerms = permissions[moduleName] || { selected: false, permissions: {} };
//                     const isSelected = modulePerms.selected || false;
//                     const permValues = modulePerms.permissions || {};
//                     const isExpanded = expandedModules[moduleName] || false;
                    
//                     const enabledCount = Object.values(permValues).filter(Boolean).length;
//                     const totalPerms = module.permissions.length;
                    
//                     return (
//                       <div key={moduleName} className="border border-gray-200 rounded-lg overflow-hidden">
//                         <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition cursor-pointer"
//                              onClick={() => toggleModuleExpand(moduleName)}>
//                           <div className="flex items-center gap-3 flex-1">
//                             <span className="text-2xl">{module.icon}</span>
//                             <div>
//                               <h3 className="font-medium text-gray-900">{moduleName}</h3>
//                               <p className="text-xs text-gray-500">
//                                 {enabledCount}/{totalPerms} permissions enabled
//                               </p>
//                             </div>
//                           </div>
//                           <div className="flex items-center gap-3">
//                             <div 
//                               className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors ${
//                                 isSelected ? 'bg-indigo-600' : 'bg-gray-300'
//                               }`}
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 toggleModule(moduleName);
//                               }}
//                             >
//                               <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
//                                 isSelected ? 'left-7' : 'left-1'
//                               }`} />
//                             </div>
//                             <span className="text-xs text-gray-400">
//                               {isSelected ? 'ON' : 'OFF'}
//                             </span>
//                             <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
//                               isExpanded ? 'rotate-180' : ''
//                             }`} />
//                           </div>
//                         </div>

//                         {isExpanded && isSelected && (
//                           <div className="p-4 bg-white">
//                             <div className="flex flex-wrap gap-2">
//                               {module.permissions.map(permission => {
//                                 const isActive = permValues[permission] || false;
//                                 const color = getPermissionColor(permission);
//                                 const Icon = getPermissionIcon(permission);
                                
//                                 return (
//                                   <button
//                                     key={permission}
//                                     onClick={() => togglePermission(moduleName, permission)}
//                                     className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition transform hover:scale-105 ${
//                                       isActive
//                                         ? `bg-${color}-100 text-${color}-700 border-2 border-${color}-300`
//                                         : 'bg-gray-50 text-gray-500 border-2 border-gray-200 hover:border-gray-300'
//                                     }`}
//                                   >
//                                     <Icon className={`w-4 h-4 ${isActive ? `text-${color}-600` : ''}`} />
//                                     <span className="capitalize">{permission}</span>
//                                     {isActive && <FiCheck className="w-4 h-4" />}
//                                   </button>
//                                 );
//                               })}
                              
//                               <div className="flex items-center gap-2 ml-auto">
//                                 <button
//                                   onClick={(e) => {
//                                     e.stopPropagation();
//                                     setAllPermissions(moduleName, true);
//                                   }}
//                                   className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
//                                 >
//                                   Enable All
//                                 </button>
//                                 <button
//                                   onClick={(e) => {
//                                     e.stopPropagation();
//                                     setAllPermissions(moduleName, false);
//                                   }}
//                                   className="text-xs text-red-600 hover:text-red-800 font-medium"
//                                 >
//                                   Disable All
//                                 </button>
//                               </div>
//                             </div>
//                           </div>
//                         )}
//                       </div>
//                     );
//                   })}
//                 </div>
//               </>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
// src/app/(dashboard)/admin/permissions/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermission } from "../hooks/usePermission";
import {
  FiShield, FiUser, FiCheck, FiX, FiSearch, FiEdit2,
  FiSave, FiRefreshCw, FiUsers, FiEye, FiPlus, FiTrash2,
  FiCheckCircle, FiXCircle, FiPrinter, FiDownload, FiMail,
  FiMessageSquare, FiChevronDown
} from "react-icons/fi";

// Permission definitions
const PERMISSION_TYPES = [
  { id: 'view', label: 'View', icon: FiEye, color: 'blue' },
  { id: 'create', label: 'Create', icon: FiPlus, color: 'green' },
  { id: 'edit', label: 'Edit', icon: FiEdit2, color: 'yellow' },
  { id: 'delete', label: 'Delete', icon: FiTrash2, color: 'red' },
  { id: 'approve', label: 'Approve', icon: FiCheckCircle, color: 'purple' },
  { id: 'reject', label: 'Reject', icon: FiXCircle, color: 'red' },
  { id: 'export', label: 'Export', icon: FiDownload, color: 'indigo' },
  { id: 'print', label: 'Print', icon: FiPrinter, color: 'gray' },
  { id: 'email', label: 'Email', icon: FiMail, color: 'blue' },
  { id: 'whatsapp', label: 'WhatsApp', icon: FiMessageSquare, color: 'green' },
];

// Module configurations with approve permission added
const MODULES_CONFIG = {
  'Rate Target (Vehicle Negotiation)': { icon: 'Target', permissions: ['view', 'edit', 'approve'] },
  // Sales Modules - All have approve permission
  'Order Panel': { icon: '📋', permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject'] },
  'Vehicle Negotiation': { icon: '🚚', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  'Pricing Panel': { icon: '💰', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  'Loading Info': { icon: '📦', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  'Purchase Panel': { icon: '🛒', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  'Consignment Note': { icon: '📄', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  'Advance Payment': { icon: '💳', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  'Proof Of Delivery': { icon: '✅', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  'Balance-Payment': { icon: '⚖️', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  'Billing': { icon: '🧾', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  'order-full-report': { icon: '📊', permissions: ['view', 'export', 'print'] },

  // Purchase Modules
  'Purchase Quotation': { icon: '📝', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  'Purchase Order': { icon: '📋', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  'GRN': { icon: '📦', permissions: ['view', 'create', 'edit', 'delete'] },
  'Purchase Invoice': { icon: '🧾', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  'Debit Notes': { icon: '📉', permissions: ['view', 'create', 'edit', 'delete'] },
  'Purchase Report': { icon: '📊', permissions: ['view', 'export', 'print'] },

  // Masters
  'Customers': { icon: '👥', permissions: ['view', 'create', 'edit', 'delete'] },
  'Suppliers': { icon: '🏭', permissions: ['view', 'create', 'edit', 'delete'] },
  'Items': { icon: '📦', permissions: ['view', 'create', 'edit', 'delete'] },
  'Company': { icon: '🏢', permissions: ['view', 'edit'] },
  'Users': { icon: '👤', permissions: ['view', 'create', 'edit', 'delete'] },
  'Accounts': { icon: '💰', permissions: ['view', 'create', 'edit', 'delete'] },
  'Employees': { icon: '👨‍💼', permissions: ['view', 'create', 'edit', 'delete'] },

  // Inventory
  'Inventory': { icon: '📊', permissions: ['view', 'create', 'edit', 'delete', 'adjust'] },

  // Payment
  'Payment Entry': { icon: '💳', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },

  // Finance
  'Journal Entry': { icon: '📒', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },
  'Reports': { icon: '📊', permissions: ['view', 'export', 'print'] },
  'Profit & Loss': { icon: '📈', permissions: ['view', 'export', 'print'] },
  'Balance Sheet': { icon: '📊', permissions: ['view', 'export', 'print'] },

  // Production
  'BoM': { icon: '🔧', permissions: ['view', 'create', 'edit', 'delete'] },
  'Production Order': { icon: '🏭', permissions: ['view', 'create', 'edit', 'delete', 'approve'] },

  // Project
  'Project': { icon: '📋', permissions: ['view', 'create', 'edit', 'delete'] },
  'Task': { icon: '✅', permissions: ['view', 'create', 'edit', 'delete'] },

  // CRM
  'Lead Generation': { icon: '🎯', permissions: ['view', 'create', 'edit', 'delete'] },
  'Opportunity': { icon: '💼', permissions: ['view', 'create', 'edit', 'delete'] },
  'Campaign': { icon: '📢', permissions: ['view', 'create', 'edit', 'delete'] },

  // Helpdesk
  'Tickets': { icon: '🎫', permissions: ['view', 'create', 'edit', 'delete', 'resolve'] },
  'Responses': { icon: '💬', permissions: ['view', 'create', 'edit', 'delete'] },

  // PPC
  'PPC': { icon: '⚙️', permissions: ['view', 'create', 'edit', 'delete'] }
};

export default function PermissionsPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = usePermission();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [expandedModules, setExpandedModules] = useState({});
  const [quickSelect, setQuickSelect] = useState('');

  useEffect(() => {
    if (!isAdmin && !authLoading) {
      router.push('/unauthorized');
      return;
    }
    fetchUsers();
  }, [isAdmin, authLoading]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/company/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (user) => {
    setSelectedUser(user);
    const userModules = user.modules || {};
    const initializedPermissions = {};
    
    Object.keys(MODULES_CONFIG).forEach(moduleName => {
      const moduleData = userModules[moduleName] || { selected: false, permissions: {} };
      initializedPermissions[moduleName] = {
        selected: moduleData.selected || false,
        permissions: {
          ...Object.fromEntries(
            MODULES_CONFIG[moduleName].permissions.map(p => [p, false])
          ),
          ...(moduleData.permissions || {})
        }
      };
    });
    
    setPermissions(initializedPermissions);
    setExpandedModules({});
    setMessage({ type: '', text: '' });
  };

  const toggleModule = (moduleName) => {
    setPermissions(prev => ({
      ...prev,
      [moduleName]: {
        ...prev[moduleName],
        selected: !prev[moduleName]?.selected
      }
    }));
  };

  const togglePermission = (moduleName, permission) => {
    setPermissions(prev => ({
      ...prev,
      [moduleName]: {
        ...prev[moduleName],
        permissions: {
          ...prev[moduleName]?.permissions,
          [permission]: !prev[moduleName]?.permissions?.[permission]
        }
      }
    }));
  };

  const setAllPermissions = (moduleName, value) => {
    const moduleConfig = MODULES_CONFIG[moduleName];
    const newPermissions = {};
    moduleConfig.permissions.forEach(p => {
      newPermissions[p] = value;
    });
    
    setPermissions(prev => ({
      ...prev,
      [moduleName]: {
        ...prev[moduleName],
        selected: value,
        permissions: newPermissions
      }
    }));
  };

  const applyQuickSelect = (type) => {
    if (!selectedUser) return;
    
    const allModules = Object.keys(MODULES_CONFIG);
    const newPermissions = {};
    
    allModules.forEach(moduleName => {
      const moduleConfig = MODULES_CONFIG[moduleName];
      const currentPerms = permissions[moduleName] || { selected: false, permissions: {} };
      
      let selected = false;
      let perms = { ...currentPerms.permissions };
      
      switch(type) {
        case 'view-only':
          selected = true;
          moduleConfig.permissions.forEach(p => {
            perms[p] = p === 'view';
          });
          break;
        case 'full-access':
          selected = true;
          moduleConfig.permissions.forEach(p => {
            perms[p] = true;
          });
          break;
        case 'no-access':
          selected = false;
          moduleConfig.permissions.forEach(p => {
            perms[p] = false;
          });
          break;
        default:
          selected = currentPerms.selected;
          perms = currentPerms.permissions;
      }
      
      newPermissions[moduleName] = {
        selected,
        permissions: perms
      };
    });
    
    setPermissions(newPermissions);
    setQuickSelect(type);
  };

  const toggleModuleExpand = (moduleName) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleName]: !prev[moduleName]
    }));
  };

  const savePermissions = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/company/users/${selectedUser._id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ modules: permissions })
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Permissions saved successfully!' });
        await fetchUsers();
        const updatedUser = users.find(u => u._id === selectedUser._id);
        if (updatedUser) setSelectedUser(updatedUser);
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to save permissions' });
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      setMessage({ type: 'error', text: 'Error saving permissions' });
    } finally {
      setSaving(false);
    }
  };

  const getModuleCount = (user) => {
    if (!user.modules) return 0;
    return Object.values(user.modules).filter(m => m?.selected).length;
  };

  const getPermissionColor = (permission) => {
    const found = PERMISSION_TYPES.find(p => p.id === permission);
    return found ? found.color : 'gray';
  };

  const getPermissionIcon = (permission) => {
    const found = PERMISSION_TYPES.find(p => p.id === permission);
    return found ? found.icon : FiEye;
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if user has permission to view this page
  if (!isAdmin && !authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiShield className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to manage permissions.
            Please contact your administrator.
          </p>
          <button
            onClick={() => router.push('/admin')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FiShield className="text-indigo-600" />
              Permission Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage user access and permissions across all modules
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchUsers}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
            'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.type === 'success' ? <FiCheck className="w-5 h-5" /> : <FiX className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* User List Sidebar */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <FiUsers className="text-gray-400" />
              <h2 className="font-semibold text-gray-700">Users</h2>
              <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {users.length}
              </span>
            </div>
            
            <div className="relative mb-4">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No users found</div>
              ) : (
                filteredUsers.map(user => (
                  <button
                    key={user._id}
                    onClick={() => selectUser(user)}
                    className={`w-full text-left p-3 rounded-lg transition flex items-center gap-3 ${
                      selectedUser?._id === user._id
                        ? 'bg-indigo-50 border border-indigo-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold flex-shrink-0">
                      {user.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name || 'Unnamed'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-indigo-600">
                          {getModuleCount(user)} modules
                        </span>
                        {(user.roles || []).map(role => (
                          <span key={role} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                    <FiEdit2 className="w-4 h-4 text-gray-400" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Permissions Panel */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {!selectedUser ? (
              <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                <FiShield className="w-16 h-16 mb-4" />
                <p className="text-lg font-medium">Select a user</p>
                <p className="text-sm">Choose a user from the list to manage their permissions</p>
              </div>
            ) : (
              <>
                {/* User Info */}
                <div className="flex flex-wrap items-center justify-between pb-4 border-b border-gray-200 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-lg">
                      {selectedUser.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{selectedUser.name}</h2>
                      <p className="text-sm text-gray-500">{selectedUser.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-0">
                    {(selectedUser.roles || []).map(role => (
                      <span key={role} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {role}
                      </span>
                    ))}
                    <button
                      onClick={savePermissions}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                      {saving ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          Saving...
                        </span>
                      ) : (
                        <>
                          <FiSave className="w-4 h-4" />
                          Save Permissions
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Quick Select */}
                <div className="mb-6 flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Quick Apply:</span>
                  <button
                    onClick={() => applyQuickSelect('view-only')}
                    className={`px-3 py-1 rounded-lg text-sm transition ${
                      quickSelect === 'view-only' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    View Only
                  </button>
                  <button
                    onClick={() => applyQuickSelect('full-access')}
                    className={`px-3 py-1 rounded-lg text-sm transition ${
                      quickSelect === 'full-access' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-white border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Full Access
                  </button>
                  <button
                    onClick={() => applyQuickSelect('no-access')}
                    className={`px-3 py-1 rounded-lg text-sm transition ${
                      quickSelect === 'no-access' 
                        ? 'bg-red-500 text-white' 
                        : 'bg-white border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    No Access
                  </button>
                </div>

                {/* Permissions Grid */}
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2">
                  {Object.keys(MODULES_CONFIG).map(moduleName => {
                    const module = MODULES_CONFIG[moduleName];
                    const modulePerms = permissions[moduleName] || { selected: false, permissions: {} };
                    const isSelected = modulePerms.selected || false;
                    const permValues = modulePerms.permissions || {};
                    const isExpanded = expandedModules[moduleName] || false;
                    
                    const enabledCount = Object.values(permValues).filter(Boolean).length;
                    const totalPerms = module.permissions.length;
                    
                    return (
                      <div key={moduleName} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition cursor-pointer"
                             onClick={() => toggleModuleExpand(moduleName)}>
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-2xl">{module.icon}</span>
                            <div>
                              <h3 className="font-medium text-gray-900">{moduleName}</h3>
                              <p className="text-xs text-gray-500">
                                {enabledCount}/{totalPerms} permissions enabled
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div 
                              className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors ${
                                isSelected ? 'bg-indigo-600' : 'bg-gray-300'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleModule(moduleName);
                              }}
                            >
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                isSelected ? 'left-7' : 'left-1'
                              }`} />
                            </div>
                            <span className="text-xs text-gray-400">
                              {isSelected ? 'ON' : 'OFF'}
                            </span>
                            <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`} />
                          </div>
                        </div>

                        {isExpanded && isSelected && (
                          <div className="p-4 bg-white">
                            <div className="flex flex-wrap gap-2">
                              {module.permissions.map(permission => {
                                const isActive = permValues[permission] || false;
                                const color = getPermissionColor(permission);
                                const Icon = getPermissionIcon(permission);
                                
                                return (
                                  <button
                                    key={permission}
                                    onClick={() => togglePermission(moduleName, permission)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition transform hover:scale-105 ${
                                      isActive
                                        ? `bg-${color}-100 text-${color}-700 border-2 border-${color}-300`
                                        : 'bg-gray-50 text-gray-500 border-2 border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    <Icon className={`w-4 h-4 ${isActive ? `text-${color}-600` : ''}`} />
                                    <span className="capitalize">{permission}</span>
                                    {isActive && <FiCheck className="w-4 h-4" />}
                                  </button>
                                );
                              })}
                              
                              <div className="flex items-center gap-2 ml-auto">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAllPermissions(moduleName, true);
                                  }}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                  Enable All
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAllPermissions(moduleName, false);
                                  }}
                                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                                >
                                  Disable All
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
