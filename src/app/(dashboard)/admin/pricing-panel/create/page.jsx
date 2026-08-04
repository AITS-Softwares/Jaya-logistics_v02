
// "use client";

// import { useMemo, useState, useEffect, useRef, useCallback } from "react";
// import { useRouter } from "next/navigation";

// /* =========================
//   CONSTANTS
// ========================= */
// const ORDER_TYPES = ["Sales", "STO Order", "Export", "Import"];
// const BILLING_TYPES = ["Single - Order", "Multi - Order"];
// const DELIVERY_TYPES = ["Urgent", "Normal", "Express", "Scheduled"];
// const APPROVAL_STATUS = ["Pending", "Approved", "Rejected", "Completed"];
// const RATE_APPROVAL_TYPES = ["Contract Rates", "Mail Approval Rate"];

// function uid() {
//   return Math.random().toString(36).slice(2, 10);
// }

// function num(v) {
//   const n = Number(v);
//   return Number.isFinite(n) ? n : 0;
// }

// /* =========================
//   CUSTOMER SEARCH HOOK
// ========================= */
// function useCustomerSearch() {
//   const [customers, setCustomers] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const searchCustomers = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/customers', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) {
//         setCustomers(data.data);
//       } else {
//         setCustomers([]);
//         setError(data.message || 'No customers found');
//       }
//     } catch (err) {
//       console.error('Error fetching customers:', err);
//       setCustomers([]);
//       setError('Failed to fetch customers');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return { customers, loading, error, searchCustomers };
// }

// /* =========================
//   VEHICLE NEGOTIATION SEARCH HOOK
// ========================= */
// function useVehicleNegotiationSearch() {
//   const [vehicleNegotiations, setVehicleNegotiations] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const searchVehicleNegotiations = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const token = localStorage.getItem('token');
      
//       const vnRes = await fetch('/api/vehicle-negotiation', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
      
//       if (!vnRes.ok) {
//         throw new Error(`HTTP error! status: ${vnRes.status}`);
//       }
      
//       const vnData = await vnRes.json();
      
//       const pricingRes = await fetch('/api/pricing-panel?format=table', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
      
//       const pricingData = await pricingRes.json();
      
//       const usedVnns = new Set();
//       if (pricingData.success && Array.isArray(pricingData.data)) {
//         pricingData.data.forEach(item => {
//           if (item.vnn && item.vnn !== '-' && item.vnn !== 'N/A') {
//             usedVnns.add(item.vnn);
//           }
//         });
//       }
      
//       if (vnData.success && Array.isArray(vnData.data)) {
//         const availableVNs = vnData.data.filter(vn => !usedVnns.has(vn.vnnNo));
//         setVehicleNegotiations(availableVNs);
//       } else {
//         setVehicleNegotiations([]);
//         setError(vnData.message || 'No vehicle negotiations found');
//       }
//     } catch (err) {
//       console.error('Error fetching vehicle negotiations:', err);
//       setVehicleNegotiations([]);
//       setError('Failed to fetch vehicle negotiations');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getVehicleNegotiationById = async (id) => {
//     setLoading(true);
//     setError(null);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch(`/api/vehicle-negotiation?id=${id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
      
//       if (!res.ok) {
//         throw new Error(`HTTP error! status: ${res.status}`);
//       }
      
//       const data = await res.json();
      
//       if (data.success && data.data) {
//         return data.data;
//       } else {
//         setError(data.message || 'Vehicle negotiation not found');
//         return null;
//       }
//     } catch (err) {
//       console.error('Error fetching vehicle negotiation:', err);
//       setError('Failed to fetch vehicle negotiation');
//       return null;
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     searchVehicleNegotiations();
//   }, []);

//   return { 
//     vehicleNegotiations, 
//     loading, 
//     error, 
//     searchVehicleNegotiations, 
//     getVehicleNegotiationById 
//   };
// }

// /* =========================
//   RATE MASTER SEARCH HOOK
// ========================= */
// function useRateMasterSearch() {
//   const [rateMasters, setRateMasters] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const searchRateMasters = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/rate-master', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
      
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) {
//         const processedData = data.data.map(rm => ({
//           ...rm,
//           locationRates: rm.locationRates || [],
//           rateSlabs: rm.locationRates?.flatMap(lr => [{
//             fromQty: lr.fromQty,
//             toQty: lr.toQty,
//             rate: lr.rate,
//             locationName: lr.locationName
//           }]) || []
//         }));
//         setRateMasters(processedData);
//       } else {
//         setRateMasters([]);
//       }
//     } catch (err) {
//       console.error('Error fetching rate masters:', err);
//       setRateMasters([]);
//       setError('Failed to fetch rate masters');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return { rateMasters, loading, error, searchRateMasters };
// }

// /* =========================
//   DEFAULT ROWS
// ========================= */
// function defaultOrderRow() {
//   return {
//     _id: uid(),
//     orderNo: "",
//     vehicleNegotiationId: "",
//     vnnNumber: "",
//     partyName: "",
//     customerId: "",
//     customerCode: "",
//     contactPerson: "",
//     plantCode: "",
//     plantName: "",
//     plantCodeValue: "",
//     orderType: "Sales",
//     pinCode: "",
//     from: "",
//     fromName: "",
//     fromState: "", // ✅ ADD THIS
//     to: "",
//     toName: "",
//     taluka: "",
//     talukaName: "",
//     district: "",
//     districtName: "",
//     state: "",
//     stateName: "",
//     country: "",
//     countryName: "",
//     locationRate: "",
//     priceList: "",
//     selectedRateMaster: null,
//     weight: "",
//     rate: "",
//     totalAmount: 0,
//     collectionCharges: "",
//     cancellationCharges: "",
//     loadingCharges: "",
//     otherCharges: "",
//     localStatus: "unknown", // ✅ ADD THIS
//     localStatusLabel: "Unknown" // ✅ ADD THIS
//   };
// }

// /* =========================
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

// function Input({ label, value, onChange, col = "", type = "text", readOnly = false }) {
//   return (
//     <div className={col}>
//       <label className="text-xs font-bold text-slate-600">{label}</label>
//       <input
//         type={type}
//         value={value || ""}
//         onChange={(e) => onChange?.(e.target.value)}
//         readOnly={readOnly}
//         className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
//           readOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
//         }`}
//       />
//     </div>
//   );
// }

// function Select({ label, value, onChange, options = [], col = "", readOnly = false }) {
//   return (
//     <div className={col}>
//       <label className="text-xs font-bold text-slate-600">{label}</label>
//       <select
//         value={value || ""}
//         onChange={(e) => onChange?.(e.target.value)}
//         disabled={readOnly}
//         className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
//           readOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
//         }`}
//       >
//         <option value="">Select {label}</option>
//         {options.map((o) => (
//           <option key={o} value={o}>
//             {o}
//           </option>
//         ))}
//       </select>
//     </div>
//   );
// }

// /* =========================
//   SEARCHABLE DROPDOWN COMPONENT
// ========================= */
// function SearchableDropdown({ 
//   items, 
//   selectedId, 
//   onSelect, 
//   placeholder = "Search...",
//   required = false,
//   displayField = 'name',
//   codeField = 'code',
//   readOnly = false
// }) {
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filteredItems, setFilteredItems] = useState([]);
//   const [showDropdown, setShowDropdown] = useState(false);
//   const [selectedItem, setSelectedItem] = useState(null);
//   const dropdownRef = useRef(null);

//   useEffect(() => {
//     setFilteredItems(items);
//     if (selectedId) {
//       const item = items.find(i => i._id === selectedId);
//       setSelectedItem(item);
//       if (item) {
//         setSearchQuery(getDisplayValue(item));
//       }
//     } else {
//       setSelectedItem(null);
//       setSearchQuery("");
//     }
//   }, [items, selectedId]);

//   const getDisplayValue = (item) => {
//     if (!item) return "";
//     const display = item[displayField] || item.customerName || "";
//     const code = item[codeField] ? `(${item[codeField]})` : "";
//     return `${display} ${code}`.trim();
//   };

//   const handleSearch = (query) => {
//     if (readOnly) return;
//     setSearchQuery(query);
    
//     if (!query.trim()) {
//       setFilteredItems(items);
//     } else {
//       const filtered = items.filter(item =>
//         (item[displayField] && item[displayField].toLowerCase().includes(query.toLowerCase())) ||
//         (item[codeField] && item[codeField].toLowerCase().includes(query.toLowerCase())) ||
//         (item.customerName && item.customerName.toLowerCase().includes(query.toLowerCase()))
//       );
//       setFilteredItems(filtered);
//     }
    
//     if (selectedItem && query !== getDisplayValue(selectedItem)) {
//       setSelectedItem(null);
//       onSelect?.(null);
//     }
//   };

//   const handleSelectItem = (item) => {
//     if (readOnly) return;
//     setSelectedItem(item);
//     setSearchQuery(getDisplayValue(item));
//     setShowDropdown(false);
//     onSelect?.(item);
//   };

//   return (
//     <div className="relative" ref={dropdownRef}>
//       <input
//         type="text"
//         value={searchQuery}
//         onChange={(e) => handleSearch(e.target.value)}
//         onFocus={() => !readOnly && setShowDropdown(true)}
//         onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
//         className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
//           readOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
//         }`}
//         placeholder={placeholder}
//         required={required}
//         autoComplete="off"
//         readOnly={readOnly}
//       />
      
//       {showDropdown && !readOnly && (
//         <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
//           {filteredItems.length > 0 ? (
//             filteredItems.map((item) => (
//               <div
//                 key={item._id}
//                 onMouseDown={() => handleSelectItem(item)}
//                 className={`p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
//                   selectedItem?._id === item._id ? 'bg-sky-50' : ''
//                 }`}
//               >
//                 <div className="font-medium text-slate-800">
//                   {item[displayField] || item.customerName}
//                 </div>
//                 {item[codeField] && (
//                   <div className="text-xs text-slate-500 mt-1">
//                     Code: {item[codeField]}
//                   </div>
//                 )}
//               </div>
//             ))
//           ) : (
//             <div className="p-3 text-center text-sm text-slate-500">
//               {searchQuery.trim() ? 
//                 `No items found for "${searchQuery}"` : 
//                 "No items available"
//               }
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// /* =========================
//   LOCATION RATE DROPDOWN COMPONENT - Shows only locations from selected Price List
// ========================= */
// function LocationRateDropdown({ 
//   locations,  // All locations from API
//   selectedName,
//   onSelect, 
//   placeholder = "Select Location...",
//   readOnly = false,
//   selectedRateMaster = null  // The selected Price List object
// }) {
//   const [searchQuery, setSearchQuery] = useState("");
//   const [showDropdown, setShowDropdown] = useState(false);
//   const [selectedItem, setSelectedItem] = useState(null);
//   const dropdownRef = useRef(null);
//   const inputRef = useRef(null);
//   const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

//   // Get location names that exist in the selected Price List
//   const availableLocationNames = useMemo(() => {
//     if (selectedRateMaster && selectedRateMaster.locationRates) {
//       return selectedRateMaster.locationRates.map(lr => lr.locationName);
//     }
//     return [];
//   }, [selectedRateMaster]);

//   // Filter locations - ONLY show locations that are in the selected Price List
//   const filteredLocationsByRateMaster = useMemo(() => {
//     if (!selectedRateMaster) {
//       // No Price List selected - show no locations (or show message)
//       return [];
//     }
    
//     if (availableLocationNames.length === 0) {
//       return [];
//     }
    
//     // Only return locations whose name is in the Price List's locationRates
//     return (locations || []).filter(loc => 
//       availableLocationNames.includes(loc.name)
//     );
//   }, [locations, selectedRateMaster, availableLocationNames]);

//   useEffect(() => {
//     if (selectedName && locations) {
//       // Check if the selected location exists in the available locations
//       const isValidLocation = availableLocationNames.includes(selectedName);
//       if (isValidLocation) {
//         const item = locations.find(l => l.name === selectedName);
//         setSelectedItem(item);
//         if (item) {
//           setSearchQuery(item.name);
//         }
//       } else {
//         // If selected location is not valid for this Price List, clear it
//         setSelectedItem(null);
//         setSearchQuery("");
//         onSelect?.(""); // Clear the location
//       }
//     } else if (!selectedName) {
//       setSelectedItem(null);
//       setSearchQuery("");
//     }
//   }, [locations, selectedName, availableLocationNames]);

//   const handleSelectItem = (item) => {
//     if (readOnly) return;
//     setSelectedItem(item);
//     setSearchQuery(item.name);
//     setShowDropdown(false);
//     onSelect?.(item.name);
//   };

//   const handleInputFocus = () => {
//     if (!readOnly && inputRef.current && filteredLocationsByRateMaster.length > 0) {
//       const rect = inputRef.current.getBoundingClientRect();
//       setDropdownPosition({
//         top: rect.bottom + window.scrollY,
//         left: rect.left + window.scrollX,
//         width: rect.width
//       });
//       setShowDropdown(true);
//     }
//   };

//   const handleInputBlur = () => {
//     setTimeout(() => {
//       if (dropdownRef.current && !dropdownRef.current.contains(document.activeElement)) {
//         setShowDropdown(false);
//       }
//     }, 200);
//   };

//   const searchedLocations = useMemo(() => {
//     if (!searchQuery.trim()) return filteredLocationsByRateMaster;
//     return filteredLocationsByRateMaster.filter(loc => 
//       loc.name.toLowerCase().includes(searchQuery.toLowerCase())
//     );
//   }, [filteredLocationsByRateMaster, searchQuery]);

//   // Determine placeholder text
//   const getPlaceholder = () => {
//     if (!selectedRateMaster) {
//       return "Please select Price List first";
//     }
//     if (filteredLocationsByRateMaster.length === 0) {
//       return "No locations available for this Price List";
//     }
//     return placeholder;
//   };

//   return (
//     <div className="relative w-full" ref={dropdownRef}>
//       <input
//         ref={inputRef}
//         type="text"
//         value={searchQuery}
//         onChange={(e) => setSearchQuery(e.target.value)}
//         onFocus={handleInputFocus}
//         onBlur={handleInputBlur}
//         className={`w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
//           (readOnly || !selectedRateMaster || filteredLocationsByRateMaster.length === 0) ? 'bg-slate-50 cursor-not-allowed' : 'bg-white cursor-pointer'
//         }`}
//         placeholder={getPlaceholder()}
//         readOnly={readOnly || !selectedRateMaster || filteredLocationsByRateMaster.length === 0}
//         autoComplete="off"
//       />
//       <div className="absolute right-2 top-2 text-gray-400 pointer-events-none">
//         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//         </svg>
//       </div>
      
//       {showDropdown && !readOnly && selectedRateMaster && filteredLocationsByRateMaster.length > 0 && (
//         <div 
//           ref={dropdownRef}
//           className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto"
//           style={{
//             top: dropdownPosition.top,
//             left: dropdownPosition.left,
//             width: dropdownPosition.width,
//             maxHeight: '300px'
//           }}
//         >
//           <div className="sticky top-0 bg-gray-50 px-3 py-2 text-xs font-semibold text-slate-600 border-b">
//             Select Location (from {selectedRateMaster.title})
//           </div>
//           {searchedLocations.map((location) => (
//             <div
//               key={location._id}
//               onMouseDown={() => handleSelectItem(location)}
//               className={`px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
//                 selectedItem?._id === location._id ? 'bg-sky-50' : ''
//               }`}
//             >
//               <div className="font-medium text-slate-800 text-sm">
//                 {location.name}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// /* =========================
//   PRICE LIST DROPDOWN COMPONENT
// ========================= */
// function PriceListDropdown({ 
//   rateMasters, 
//   selectedValue, 
//   onSelect, 
//   locationName,
//   branchId,
//   customerId,
//   placeholder = "Select Price List...",
//   readOnly = false
// }) {
//   const [searchQuery, setSearchQuery] = useState("");
//   const [showDropdown, setShowDropdown] = useState(false);
//   const [selectedItem, setSelectedItem] = useState(null);
//   const dropdownRef = useRef(null);
//   const inputRef = useRef(null);
//   const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

//   const filteredRateMasters = useMemo(() => {
//     let filtered = rateMasters || [];
    
//     if (branchId) {
//       filtered = filtered.filter(rm => {
//         const rmBranchId = rm.branchId?._id || rm.branchId;
//         return String(rmBranchId) === String(branchId);
//       });
//     } else {
//       return [];
//     }
    
//     if (customerId) {
//       filtered = filtered.filter(rm => {
//         const rmCustomerId = rm.customerId?._id || rm.customerId;
//         return String(rmCustomerId) === String(customerId);
//       });
//     } else {
//       return [];
//     }
    
//     if (locationName) {
//       filtered = filtered.filter(rm => {
//         return rm.locationRates && Array.isArray(rm.locationRates) && 
//                rm.locationRates.some(lr => lr.locationName === locationName);
//       });
//     }
    
//     return filtered;
//   }, [rateMasters, locationName, branchId, customerId]);

//   useEffect(() => {
//     if (selectedValue) {
//       const item = filteredRateMasters.find(rm => rm.title === selectedValue);
//       setSelectedItem(item);
//       if (item) {
//         setSearchQuery(item.title);
//       }
//     } else {
//       setSelectedItem(null);
//       setSearchQuery("");
//     }
//   }, [filteredRateMasters, selectedValue]);

//   const handleSelectItem = (item) => {
//     if (readOnly) return;
//     setSelectedItem(item);
//     setSearchQuery(item.title);
//     setShowDropdown(false);
//     onSelect?.(item);
//   };

//   const handleInputFocus = () => {
//     if (!readOnly && inputRef.current && filteredRateMasters.length > 0) {
//       const rect = inputRef.current.getBoundingClientRect();
//       setDropdownPosition({
//         top: rect.bottom + window.scrollY,
//         left: rect.left + window.scrollX,
//         width: rect.width
//       });
//       setShowDropdown(true);
//     }
//   };

//   const handleInputBlur = () => {
//     setTimeout(() => {
//       if (dropdownRef.current && !dropdownRef.current.contains(document.activeElement)) {
//         setShowDropdown(false);
//       }
//     }, 200);
//   };

//   const searchedItems = useMemo(() => {
//     if (!searchQuery.trim()) return filteredRateMasters;
//     return filteredRateMasters.filter(rm => 
//       rm.title.toLowerCase().includes(searchQuery.toLowerCase())
//     );
//   }, [filteredRateMasters, searchQuery]);

//   return (
//     <div className="relative w-full" ref={dropdownRef}>
//       <input
//         ref={inputRef}
//         type="text"
//         value={searchQuery}
//         onChange={(e) => setSearchQuery(e.target.value)}
//         onFocus={handleInputFocus}
//         onBlur={handleInputBlur}
//         className={`w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
//           readOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white cursor-pointer'
//         }`}
//         placeholder={placeholder}
//         readOnly={readOnly}
//         autoComplete="off"
//       />
//       <div className="absolute right-2 top-2 text-gray-400 pointer-events-none">
//         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//         </svg>
//       </div>
      
//       {showDropdown && !readOnly && filteredRateMasters.length > 0 && (
//         <div 
//           className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto"
//           style={{
//             position: 'fixed',
//             top: dropdownPosition.top,
//             left: dropdownPosition.left,
//             width: dropdownPosition.width,
//             maxHeight: '300px'
//           }}
//         >
//           <div className="sticky top-0 bg-gray-50 px-3 py-2 text-xs font-semibold text-slate-600 border-b">
//             Select Price List
//           </div>
//           {searchedItems.length > 0 ? (
//             searchedItems.map((rm) => (
//               <div
//                 key={rm._id}
//                 onMouseDown={() => handleSelectItem(rm)}
//                 className={`px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
//                   selectedItem?._id === rm._id ? 'bg-sky-50' : ''
//                 }`}
//               >
//                 <div className="font-medium text-slate-800 text-sm">
//                   {rm.title}
//                 </div>
//                 <div className="text-xs text-slate-500 mt-0.5">
//                   Branch: {rm.branchName || 'N/A'} | Customer: {rm.customerName || 'N/A'} | Locations: {rm.locationRates?.length || 0}
//                 </div>
//               </div>
//             ))
//           ) : (
//             <div className="p-3 text-center text-sm text-slate-500">
//               {searchQuery.trim() ? 
//                 `No price lists found for "${searchQuery}"` : 
//                 `No price lists available for this branch, customer, and location`
//               }
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// /* =========================
//   VEHICLE NEGOTIATION DROPDOWN FOR HEADER
// ========================= */
// function VehicleNegotiationHeaderDropdown({ 
//   onSelect,
//   placeholder = "Search vehicle negotiation..."
// }) {
//   const [searchQuery, setSearchQuery] = useState("");
//   const [showDropdown, setShowDropdown] = useState(false);
//   const [vnList, setVnList] = useState([]);
//   const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
//   const inputRef = useRef(null);
//   const dropdownRef = useRef(null);
//   const vehicleNegotiationSearch = useVehicleNegotiationSearch();

//   useEffect(() => {
//     setVnList(vehicleNegotiationSearch.vehicleNegotiations);
//   }, [vehicleNegotiationSearch.vehicleNegotiations]);

//   const handleSearch = (query) => {
//     setSearchQuery(query);
//     if (!showDropdown) {
//       setShowDropdown(true);
//     }
//   };

//   const handleSelectVN = async (vn) => {
//     setSearchQuery(vn.vnnNo);
//     setShowDropdown(false);
    
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch(`/api/vehicle-negotiation?id=${vn._id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
      
//       if (res.ok) {
//         const data = await res.json();
//         if (data.success && data.data) {
//           onSelect(data.data);
//         }
//       }
//     } catch (error) {
//       console.error('Error fetching VN details:', error);
//     }
//   };

//   const handleInputFocus = () => {
//     if (inputRef.current) {
//       const rect = inputRef.current.getBoundingClientRect();
//       setDropdownPosition({
//         top: rect.bottom + window.scrollY,
//         left: rect.left + window.scrollX,
//         width: rect.width
//       });
//     }
    
//     setShowDropdown(true);
//     if (vnList.length === 0 && vehicleNegotiationSearch.vehicleNegotiations.length === 0) {
//       vehicleNegotiationSearch.searchVehicleNegotiations();
//     }
//   };

//   const handleInputBlur = () => {
//     setTimeout(() => {
//       if (dropdownRef.current && !dropdownRef.current.contains(document.activeElement)) {
//         setShowDropdown(false);
//       }
//     }, 200);
//   };

//   useEffect(() => {
//     const handleScroll = () => {
//       if (showDropdown && inputRef.current) {
//         const rect = inputRef.current.getBoundingClientRect();
//         setDropdownPosition({
//           top: rect.bottom + window.scrollY,
//           left: rect.left + window.scrollX,
//           width: rect.width
//         });
//       }
//     };

//     window.addEventListener('scroll', handleScroll, true);
//     window.addEventListener('resize', handleScroll);

//     return () => {
//       window.removeEventListener('scroll', handleScroll, true);
//       window.removeEventListener('resize', handleScroll);
//     };
//   }, [showDropdown]);

//   const filteredList = useMemo(() => {
//     if (!searchQuery.trim()) return vnList;
//     return vnList.filter(vn =>
//       vn.vnnNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       vn.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       vn.branchName?.toLowerCase().includes(searchQuery.toLowerCase())
//     );
//   }, [vnList, searchQuery]);

//   return (
//     <div className="relative w-full">
//       <input
//         ref={inputRef}
//         type="text"
//         value={searchQuery}
//         onChange={(e) => handleSearch(e.target.value)}
//         onFocus={handleInputFocus}
//         onBlur={handleInputBlur}
//         className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//         placeholder={placeholder}
//         autoComplete="off"
//       />
      
//       {showDropdown && (
//         <div 
//           ref={dropdownRef}
//           style={{
//             position: 'fixed',
//             top: dropdownPosition.top,
//             left: dropdownPosition.left,
//             width: dropdownPosition.width,
//             zIndex: 9999,
//             maxHeight: '400px'
//           }}
//           className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-y-auto"
//         >
//           {vehicleNegotiationSearch.loading ? (
//             <div className="p-4 text-center text-sm text-slate-500">
//               <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500 mx-auto mb-2"></div>
//               Loading vehicle negotiations...
//             </div>
//           ) : filteredList.length > 0 ? (
//             <div className="divide-y divide-slate-100">
//               {filteredList.map((vn) => (
//                 <div
//                   key={vn._id}
//                   onMouseDown={() => handleSelectVN(vn)}
//                   className="p-3 hover:bg-yellow-50 cursor-pointer"
//                 >
//                   <div className="font-medium text-slate-800">{vn.vnnNo}</div>
//                   <div className="text-xs text-slate-500 mt-1">
//                     {vn.customerName || 'N/A'} | {vn.branchName} | Orders: {vn.orders?.length || 0}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           ) : (
//             <div className="p-4 text-center text-sm text-slate-500">
//               {searchQuery.trim() ? 
//                 `No vehicle negotiations found for "${searchQuery}"` : 
//                 "No vehicle negotiations available"
//               }
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// /* =========================
//   ORDERS TABLE COMPONENT
// ========================= */
// function OrdersTable({ 
//   rows, 
//   onChange, 
//   onRemove, 
//   billingType, 
//   selectedVehicleNegotiation,
//   locations,
//   rateMasters,
//   headerBranch,
//   headerCustomerId
// }) {
// const columns = [
//   { key: "orderNo", label: "Order No *", width: "120px" },
//   { key: "partyName", label: "Party Name", width: "150px" },
//   { key: "plantCode", label: "Plant Code", width: "100px" },
//   { key: "plantName", label: "Plant Name *Auto", width: "120px", readOnly: true },
//   { key: "plantCodeValue", label: "Plant Code Value *Auto", width: "120px", readOnly: true },
//   { key: "orderType", label: "Order Type", width: "100px" },
//   { key: "pinCode", label: "Pin Code", width: "100px" },
//   { key: "from", label: "From", width: "120px" },
//   { key: "to", label: "To", width: "120px" },
//   { key: "taluka", label: "Taluka", width: "120px" },
//   { key: "district", label: "District", width: "100px" },
//   { key: "state", label: "State", width: "100px" },
//   { key: "localStatus", label: "Local/Not Local", width: "120px" }, // ✅ ADD THIS
//   { key: "country", label: "Country", width: "100px" },
//   { key: "priceList", label: "Price List", width: "180px" },
//   { key: "locationRate", label: "Location Rate", width: "150px" },
//   { key: "weight", label: "Weight", type: "number", width: "80px" },
//   { key: "rate", label: "Rate (₹)", type: "number", width: "80px", readOnly: true },
//   { key: "totalAmount", label: "Total Amount", type: "number", width: "100px", readOnly: true },
//   { key: "collectionCharges", label: "Collection Charges", type: "number", width: "120px" },
//   { key: "cancellationCharges", label: "Cancellation Charges", width: "130px" },
//   { key: "loadingCharges", label: "Loading Charges", width: "120px" },
//   { key: "otherCharges", label: "Other Charges", type: "number", width: "100px" },
// ];

//   const isReadOnlyMode = !!selectedVehicleNegotiation;

//   const handlePriceListSelect = (rowId, rateMaster) => {
//     onChange(rowId, 'priceList', rateMaster.title);
//     onChange(rowId, 'selectedRateMaster', rateMaster);
//       onChange(rowId, 'locationRate', '');
//   onChange(rowId, 'rate', '');
//     const currentRow = rows.find(r => r._id === rowId);
//     if (currentRow && currentRow.weight && currentRow.locationRate) {
//       const locationRate = rateMaster.locationRates?.find(lr => 
//         lr.locationName === currentRow.locationRate
//       );
      
//       if (locationRate) {
//         const weightNum = parseFloat(currentRow.weight);
//         if (weightNum >= locationRate.fromQty && weightNum <= locationRate.toQty) {
//           onChange(rowId, 'rate', locationRate.rate);
//         } else {
//           onChange(rowId, 'rate', '');
//           alert(`Weight ${currentRow.weight} is outside the range (${locationRate.fromQty} - ${locationRate.toQty}) for this price list`);
//         }
//       }
//     }
//   };

//   const handleWeightChange = (rowId, weight) => {
//     onChange(rowId, 'weight', weight);
    
//     const currentRow = rows.find(r => r._id === rowId);
//     if (currentRow && currentRow.selectedRateMaster && currentRow.locationRate) {
//       const locationRate = currentRow.selectedRateMaster.locationRates?.find(lr => 
//         lr.locationName === currentRow.locationRate
//       );
      
//       if (locationRate) {
//         const weightNum = parseFloat(weight);
//         if (weightNum >= locationRate.fromQty && weightNum <= locationRate.toQty) {
//           onChange(rowId, 'rate', locationRate.rate);
//         } else {
//           onChange(rowId, 'rate', '');
//         }
//       }
//     }
//   };

//   return (
//     <div className="overflow-auto rounded-xl border border-yellow-300 max-h-[600px]">
//       <table className="min-w-max w-full text-sm">
//         <thead className="sticky top-0 bg-yellow-400 z-10">
//           <tr>
//             {columns.map((col) => (
//               <th
//                 key={col.key}
//                 className="border border-yellow-500 px-2 py-2 text-xs font-extrabold text-slate-900 text-center whitespace-nowrap"
//                 style={{ minWidth: col.width }}
//               >
//                 {col.label}
//                 {col.readOnly && <span className="ml-1 text-xs text-blue-600">*</span>}
//               </th>
//             ))}
//             {billingType === "Multi - Order" && !isReadOnlyMode && (
//               <th className="border border-yellow-500 px-2 py-2 text-xs font-extrabold text-slate-900 text-center whitespace-nowrap">
//                 Actions
//               </th>
//             )}
//           </tr>
//         </thead>

//         <tbody>
//           {rows.map((row) => {
//             const totalAmount = num(row.weight) * num(row.rate);
//             const isFromVehicleNegotiation = !!row.vehicleNegotiationId || isReadOnlyMode;
//             const currentCustomerId = row.customerId || headerCustomerId;
            
//             return (
//               <tr key={row._id} className="hover:bg-yellow-50 even:bg-slate-50">
//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     value={row.orderNo || ""}
//                     onChange={(e) => onChange(row._id, 'orderNo', e.target.value)}
//                     className={`w-full min-w-[100px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
//                       isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
//                     }`}
//                     placeholder="Order No"
//                     readOnly={isFromVehicleNegotiation}
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     value={row.partyName || ""}
//                     onChange={(e) => onChange(row._id, 'partyName', e.target.value)}
//                     className={`w-full min-w-[120px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
//                       isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
//                     }`}
//                     placeholder="Party Name"
//                     readOnly={isFromVehicleNegotiation}
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     value={row.plantCode || ""}
//                     onChange={(e) => onChange(row._id, 'plantCode', e.target.value)}
//                     className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
//                       isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
//                     }`}
//                     placeholder="Plant Code"
//                     readOnly={isFromVehicleNegotiation}
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     type="text"
//                     value={row.plantName || ""}
//                     readOnly
//                     className="w-full min-w-[100px] rounded border border-slate-200 bg-slate-50 px-1 py-1 text-xs outline-none"
//                     placeholder="Auto-filled"
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     type="text"
//                     value={row.plantCodeValue || ""}
//                     readOnly
//                     className="w-full min-w-[100px] rounded border border-slate-200 bg-slate-50 px-1 py-1 text-xs outline-none"
//                     placeholder="Auto-filled"
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <select
//                     value={row.orderType || ""}
//                     onChange={(e) => onChange(row._id, 'orderType', e.target.value)}
//                     className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
//                       isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
//                     }`}
//                     disabled={isFromVehicleNegotiation}
//                   >
//                     <option value="">Select</option>
//                     {ORDER_TYPES.map((opt) => (
//                       <option key={opt} value={opt}>{opt}</option>
//                     ))}
//                   </select>
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     type="text"
//                     value={row.pinCode || ""}
//                     onChange={(e) => onChange(row._id, 'pinCode', e.target.value)}
//                     className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
//                       isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
//                     }`}
//                     placeholder="Pin Code"
//                     readOnly={isFromVehicleNegotiation}
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     value={row.fromName || ""}
//                     onChange={(e) => onChange(row._id, 'fromName', e.target.value)}
//                     className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
//                       isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
//                     }`}
//                     placeholder="From"
//                     readOnly={isFromVehicleNegotiation}
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     value={row.toName || ""}
//                     onChange={(e) => onChange(row._id, 'toName', e.target.value)}
//                     className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
//                       isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
//                     }`}
//                     placeholder="To"
//                     readOnly={isFromVehicleNegotiation}
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     value={row.talukaName || row.taluka || ""}
//                     onChange={(e) => onChange(row._id, 'talukaName', e.target.value)}
//                     className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
//                       isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
//                     }`}
//                     placeholder="Taluka"
//                     readOnly={isFromVehicleNegotiation}
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     value={row.districtName || ""}
//                     onChange={(e) => onChange(row._id, 'districtName', e.target.value)}
//                     className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
//                       isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
//                     }`}
//                     placeholder="District"
//                     readOnly={isFromVehicleNegotiation}
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     value={row.stateName || ""}
//                     onChange={(e) => onChange(row._id, 'stateName', e.target.value)}
//                     className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
//                       isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
//                     }`}
//                     placeholder="State"
//                     readOnly={isFromVehicleNegotiation}
//                   />
//                 </td>
// {/* Local Status */}
// <td className="border border-yellow-300 px-1 py-1 text-center">
//   {row.fromState && row.stateName ? (
//     <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
//       row.fromState.trim().toUpperCase() === row.stateName.trim().toUpperCase()
//         ? 'bg-green-100 text-green-800 border border-green-300'
//         : 'bg-red-100 text-red-800 border border-red-300'
//     }`}>
//       {row.fromState.trim().toUpperCase() === row.stateName.trim().toUpperCase() ? '✅ Local' : '❌ Not Local'}
//     </span>
//   ) : (
//     <span className="text-xs text-gray-400">-</span>
//   )}
// </td>
//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     value={row.countryName || ""}
//                     onChange={(e) => onChange(row._id, 'countryName', e.target.value)}
//                     className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
//                       isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
//                     }`}
//                     placeholder="Country"
//                     readOnly={isFromVehicleNegotiation}
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <PriceListDropdown
//                     rateMasters={rateMasters}
//                     selectedValue={row.priceList}
//                     onSelect={(rateMaster) => handlePriceListSelect(row._id, rateMaster)}
//                     locationName={row.locationRate}
//                     branchId={headerBranch}
//                     customerId={currentCustomerId}
//                     placeholder="Select Price List..."
//                     readOnly={false}
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//   <LocationRateDropdown
//     locations={locations}
//     selectedName={row.locationRate}
//     onSelect={(locationName) => {
//       onChange(row._id, 'locationRate', locationName);
//       // Reset rate when location changes
//       onChange(row._id, 'rate', '');
//     }}
//     readOnly={false}
//     placeholder="Select Location..."
//     selectedRateMaster={row.selectedRateMaster}  // Pass the selected Price List
//   />
// </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     type="number"
//                     step="0.01"
//                     value={row.weight || ""}
//                     onChange={(e) => handleWeightChange(row._id, e.target.value)}
//                     className={`w-full min-w-[70px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
//                       isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
//                     }`}
//                     placeholder="Weight"
//                     readOnly={isFromVehicleNegotiation}
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     type="number"
//                     step="0.01"
//                     value={row.rate || ""}
//                     readOnly
//                     className="w-full min-w-[70px] rounded border border-slate-200 bg-slate-50 px-1 py-1 text-xs outline-none cursor-not-allowed"
//                     placeholder="Auto"
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     type="number"
//                     value={totalAmount}
//                     readOnly
//                     className="w-full min-w-[80px] rounded border border-slate-200 bg-slate-50 px-1 py-1 text-xs outline-none"
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     type="number"
//                     step="0.01"
//                     value={row.collectionCharges || ""}
//                     onChange={(e) => onChange(row._id, 'collectionCharges', e.target.value)}
//                     className="w-full min-w-[90px] rounded border border-slate-200 bg-white px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
//                     placeholder="Collection"
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     value={row.cancellationCharges || ""}
//                     onChange={(e) => onChange(row._id, 'cancellationCharges', e.target.value)}
//                     className="w-full min-w-[100px] rounded border border-slate-200 bg-white px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
//                     placeholder="Cancellation"
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     value={row.loadingCharges || ""}
//                     onChange={(e) => onChange(row._id, 'loadingCharges', e.target.value)}
//                     className="w-full min-w-[90px] rounded border border-slate-200 bg-white px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
//                     placeholder="Loading"
//                   />
//                 </td>

//                 <td className="border border-yellow-300 px-1 py-1">
//                   <input
//                     type="number"
//                     step="0.01"
//                     value={row.otherCharges || ""}
//                     onChange={(e) => onChange(row._id, 'otherCharges', e.target.value)}
//                     className="w-full min-w-[80px] rounded border border-slate-200 bg-white px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
//                     placeholder="Other"
//                   />
//                 </td>

//                 {billingType === "Multi - Order" && !isReadOnlyMode && (
//                   <td className="border border-yellow-300 px-1 py-1 text-center">
//                     <button
//                       onClick={() => onRemove(row._id)}
//                       className="rounded bg-red-500 px-2 py-1 text-xs font-bold text-white hover:bg-red-600 transition"
//                     >
//                       Remove
//                     </button>
//                   </td>
//                 )}
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// /* =========================
//   MAIN CREATE PAGE
// ========================= */
// export default function PricingPanelPage() {
//   const router = useRouter();
  
//   const [branches, setBranches] = useState([]);
//   const [locations, setLocations] = useState([]);
//   const [countries, setCountries] = useState([]);
//   const [plants, setPlants] = useState([]);
//   const [saving, setSaving] = useState(false);
//   const [saveError, setSaveError] = useState(null);
//   const [saveSuccess, setSaveSuccess] = useState(false);
//   const [pricingSerialNo, setPricingSerialNo] = useState("");

//   const [selectedCustomer, setSelectedCustomer] = useState(null);
//   const customerSearch = useCustomerSearch();

//   const [selectedVehicleNegotiation, setSelectedVehicleNegotiation] = useState(null);
//   const vehicleNegotiationSearch = useVehicleNegotiationSearch();

//   const rateMasterSearch = useRateMasterSearch();

//   const [header, setHeader] = useState({
//     pricingSerialNo: "",
//     branch: "",
//     branchName: "",
//     branchCode: "",
//     delivery: "Normal",
//     date: new Date().toISOString().split('T')[0],
//     partyName: "",
//     customerId: ""
//   });

//   const [billing, setBilling] = useState({
//     billingType: "Multi - Order",
//     loadingPoints: "",
//     dropPoints: "",
//     collectionCharges: 0,
//     cancellationCharges: "Nil",
//     loadingCharges: "Nil",
//     otherCharges: 0,
//   });

//   const [orders, setOrders] = useState([
//     defaultOrderRow(),
//     defaultOrderRow()
//   ]);

//   const [rateApproval, setRateApproval] = useState({
//     approvalType: "Contract Rates",
//     uploadFile: null,
//     uploadFileName: "",
//     approvalStatus: "Pending",
//   });

//   useEffect(() => {
//     fetchBranches();
//     fetchLocations();
//     fetchCountries();
//     fetchPlants();
//     customerSearch.searchCustomers();
//     rateMasterSearch.searchRateMasters();
//   }, []);

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
//       console.error('Error fetching branches:', error.message);
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
//         setLocations(data.data);
//         console.log("Loaded locations:", data.data.length);
//       } else {
//         setLocations([]);
//       }
//     } catch (error) {
//       console.error('Error fetching locations:', error.message);
//       setLocations([]);
//     }
//   };

//   const fetchCountries = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/countries', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) {
//         setCountries(data.data);
//       }
//     } catch (error) {
//       console.error('Error fetching countries:', error.message);
//     }
//   };

//   const fetchPlants = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/plants', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) {
//         setPlants(data.data);
//       }
//     } catch (error) {
//       console.error('Error fetching plants:', error.message);
//     }
//   };

//   useEffect(() => {
//     if (orders.length === 1) {
//       setBilling(prev => ({ ...prev, billingType: "Single - Order" }));
//     } else if (orders.length > 1) {
//       setBilling(prev => ({ ...prev, billingType: "Multi - Order" }));
//     }
//   }, [orders.length]);

//  const handleSelectVehicleNegotiation = async (fullVN) => {
//   setSelectedVehicleNegotiation(fullVN);
  
//   setHeader(prev => ({
//     ...prev,
//     branch: fullVN.branch?._id || fullVN.branch || "",
//     branchName: fullVN.branchName || "",
//     branchCode: fullVN.branchCode || "",
//     delivery: fullVN.delivery || "Normal",
//     date: fullVN.date ? new Date(fullVN.date).toISOString().split('T')[0] : prev.date,
//     partyName: fullVN.customerName || fullVN.partyName || prev.partyName,
//     customerId: fullVN.customerId?._id || fullVN.customerId || prev.customerId
//   }));

//   setBilling(prev => ({
//     ...prev,
//     collectionCharges: fullVN.collectionCharges || 0,
//     cancellationCharges: fullVN.cancellationCharges || "Nil",
//     loadingCharges: fullVN.loadingCharges || "Nil",
//     otherCharges: fullVN.otherCharges || 0,
//     loadingPoints: fullVN.loadingPoints || prev.loadingPoints || "",
//     dropPoints: fullVN.dropPoints || prev.dropPoints || ""
//   }));

//   if (fullVN.orders && fullVN.orders.length > 0) {
//     const newOrders = fullVN.orders.map(order => ({
//       _id: uid(),
//       orderNo: order.orderNo,
//       vehicleNegotiationId: fullVN._id,
//       vnnNumber: fullVN.vnnNo,
//       partyName: order.partyName || fullVN.customerName || "",
//       customerId: order.customerId?._id || order.customerId || fullVN.customerId?._id || fullVN.customerId,
//       customerCode: order.customerCode || "",
//       contactPerson: order.contactPerson || fullVN.contactPerson || "",
//       plantCode: order.plantCode?._id || order.plantCode,
//       plantName: order.plantName || "",
//       plantCodeValue: order.plantCodeValue || "",
//       orderType: order.orderType || "Sales",
//       pinCode: order.pinCode || "",
//       from: order.from,
//       fromName: order.fromName || "",
//       fromState: order.fromState || "", // ✅ ADD THIS
//       to: order.to,
//       toName: order.toName || "",
//       taluka: order.taluka || "",
//       talukaName: order.talukaName || order.taluka || "",
//       district: order.district,
//       districtName: order.districtName || "",
//       state: order.state,
//       stateName: order.stateName || "",
//       country: order.country,
//       countryName: order.countryName || "",
//       locationRate: "",
//       locationRateId: "",
//       locationRateTitle: "",
//       priceList: "",
//       selectedRateMaster: null,
//       weight: order.weight || "",
//       rate: "",
//       totalAmount: 0,
//       collectionCharges: order.collectionCharges || "",
//       cancellationCharges: order.cancellationCharges || "",
//       loadingCharges: order.loadingCharges || "",
//       otherCharges: order.otherCharges || "",
//       localStatus: order.localStatus || "unknown", // ✅ ADD THIS
//       localStatusLabel: order.localStatusLabel || "Unknown" // ✅ ADD THIS
//     }));

//     if (billing.billingType === "Single - Order") {
//       setOrders([newOrders[0]]);
//     } else {
//       setOrders(newOrders);
//     }
//   }
// };
//   const updateOrder = (id, key, value) => {
//     setOrders((prev) => prev.map((r) => (r._id === id ? { ...r, [key]: value } : r)));
//   };

//   const addOrder = () => {
//     setOrders((prev) => [...prev, defaultOrderRow()]);
//   };

//   const removeOrder = (id) => {
//     if (orders.length > 1) {
//       setOrders((prev) => prev.filter((x) => x._id !== id));
//     } else {
//       alert("At least one order row is required");
//     }
//   };

//   const handleBillingTypeChange = (value) => {
//     setBilling((prev) => ({ ...prev, billingType: value }));
    
//     if (value === "Single - Order") {
//       setOrders([orders[0] || defaultOrderRow()]);
//     } else {
//       if (orders.length < 2) {
//         setOrders([...orders, defaultOrderRow()]);
//       }
//     }
//   };

//   const totalWeight = useMemo(() => {
//     return orders.reduce((acc, r) => acc + num(r.weight), 0);
//   }, [orders]);

//   const totalAmount = useMemo(() => {
//     return orders.reduce((acc, r) => {
//       const weight = num(r.weight);
//       const rate = num(r.rate);
//       return acc + (weight * rate);
//     }, 0);
//   }, [orders]);

//   const handleFileSelect = (e) => {
//     alert("Rate Approval section is read-only");
//   };

//   const handleSaveAll = async () => {
//     if (!header.branch) {
//       alert("Please select a branch");
//       return;
//     }
    
//     const hasInvalidOrders = orders.some(order => !order.orderNo);
//     if (hasInvalidOrders) {
//       alert("Please enter Order No for all order rows");
//       return;
//     }

//     setSaving(true);
//     setSaveError(null);
//     setSaveSuccess(false);

//     try {
//       const token = localStorage.getItem('token');
//       if (!token) {
//         throw new Error("No authentication token found. Please login again.");
//       }

//       const payload = {
//         header: {
//           ...header,
//           partyName: selectedCustomer?.customerName || header.partyName,
//           customerId: selectedCustomer?._id || header.customerId
//         },
//         billing: {
//           ...billing,
//           loadingPoints: num(billing.loadingPoints) || 1,
//           dropPoints: num(billing.dropPoints) || 1,
//           collectionCharges: num(billing.collectionCharges) || 0,
//           otherCharges: num(billing.otherCharges) || 0
//         },
//       orders: orders.map(order => ({
//   orderNo: order.orderNo,
//   vehicleNegotiationId: order.vehicleNegotiationId,
//   vnnNumber: order.vnnNumber,
//   partyName: order.partyName,
//   customerId: order.customerId || null,
//   customerCode: order.customerCode,
//   contactPerson: order.contactPerson,
//   plantCode: order.plantCode,
//   plantName: order.plantName,
//   plantCodeValue: order.plantCodeValue,
//   orderType: order.orderType,
//   pinCode: order.pinCode,
//   from: order.from,
//   fromName: order.fromName,
//   fromState: order.fromState || '', // ✅ ADD THIS
//   to: order.to,
//   toName: order.toName,
//   taluka: order.taluka,
//   talukaName: order.talukaName,
//   district: order.district,
//   districtName: order.districtName,
//   state: order.state,
//   stateName: order.stateName,
//   country: order.country,
//   countryName: order.countryName,
//   locationRate: order.locationRate,
//   priceList: order.priceList,
//   weight: num(order.weight),
//   rate: num(order.rate),
//   totalAmount: num(order.weight) * num(order.rate),
//   collectionCharges: num(order.collectionCharges) || 0,
//   cancellationCharges: order.cancellationCharges || "Nil",
//   loadingCharges: order.loadingCharges || "Nil",
//   otherCharges: num(order.otherCharges) || 0,
//   localStatus: order.localStatus || 'unknown', // ✅ ADD THIS
//   localStatusLabel: order.localStatusLabel || 'Unknown' // ✅ ADD THIS
// })),
//         totalWeight,
//         totalAmount,
//         rateApproval: {
//           approvalType: rateApproval.approvalType,
//           approvalStatus: rateApproval.approvalStatus,
//           uploadFileName: rateApproval.uploadFileName
//         },
//         branches: branches,
//         plants: plants,
//         countries: countries,
//         locations: locations
//       };

//       const res = await fetch('/api/pricing-panel', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         throw new Error(data.message || `Failed to save pricing panel: ${res.status}`);
//       }

//       setSaveSuccess(true);
//       setPricingSerialNo(data.data?.pricingSerialNo || "Generated");
      
//       alert(`✅ Pricing panel saved successfully!\nPricing Serial No: ${data.data?.pricingSerialNo}`);
      
//       resetForm();
      
//     } catch (error) {
//       console.error('Error saving pricing panel:', error);
//       setSaveError(error.message || 'Failed to save pricing panel');
//       alert(`❌ Error: ${error.message}`);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const resetForm = () => {
//     setHeader({
//       pricingSerialNo: "",
//       branch: "",
//       branchName: "",
//       branchCode: "",
//       delivery: "Normal",
//       date: new Date().toISOString().split('T')[0],
//       partyName: "",
//       customerId: ""
//     });
    
//     setBilling({
//       billingType: "Multi - Order",
//       loadingPoints: "",
//       dropPoints: "",
//       collectionCharges: 0,
//       cancellationCharges: "Nil",
//       loadingCharges: "Nil",
//       otherCharges: 0,
//     });
    
//     setOrders([defaultOrderRow(), defaultOrderRow()]);
    
//     setRateApproval({
//       approvalType: "Contract Rates",
//       uploadFile: null,
//       uploadFileName: "",
//       approvalStatus: "Pending",
//     });
    
//     setSelectedCustomer(null);
//     setSelectedVehicleNegotiation(null);
    
//     setSaveSuccess(false);
//     setSaveError(null);
//     setPricingSerialNo("");
    
//     window.scrollTo({ top: 0, behavior: 'smooth' });
//   };

//   const billingColumns = [
//     { key: "billingType", label: "Billing Type", options: BILLING_TYPES },
//     { key: "loadingPoints", label: "No. of Loading Points", type: "number" },
//     { key: "dropPoints", label: "No. of Droping Point", type: "number" },
//   ];

//   const isHeaderReadOnly = !!selectedVehicleNegotiation;

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
//       <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
//         <div className="mx-auto max-w-full px-4 py-3 flex items-center justify-between">
//           <div>
//             <div className="text-lg font-extrabold text-slate-900">
//               Pricing Panel
//             </div>
//             {saveSuccess && (
//               <div className="text-sm text-green-600 font-medium">
//                 ✅ Pricing panel saved successfully! PSN: {pricingSerialNo}
//               </div>
//             )}
//             {saveError && (
//               <div className="text-sm text-red-600 font-medium">
//                 ❌ {saveError}
//               </div>
//             )}
//           </div>

//           <div className="flex items-center gap-3">
//             <button
//               onClick={handleSaveAll}
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
//                   Saving...
//                 </span>
//               ) : 'Save All'}
//             </button>
//           </div>
//         </div>
//       </div>

//       <div className="mx-auto max-w-full p-4 space-y-4">
//         <Card title="Pricing Panel - Part -1">
//           <div className="grid grid-cols-12 gap-3 mb-4">
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Pricing Serial No</label>
//               <div className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
//                 {pricingSerialNo || "Auto-generated on save"}
//               </div>
//             </div>

//             <div className="col-span-12 md:col-span-3 relative">
//               <label className="text-xs font-bold text-slate-600">Search Vehicle Negotiation</label>
//               <VehicleNegotiationHeaderDropdown
//                 onSelect={handleSelectVehicleNegotiation}
//                 placeholder="Search by VNN..."
//               />
//               {selectedVehicleNegotiation && (
//                 <div className="text-xs text-slate-500 mt-1">
//                   Selected: {selectedVehicleNegotiation.vnnNo}
//                 </div>
//               )}
//             </div>
            
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Branch *</label>
//               <SearchableDropdown
//                 items={branches}
//                 selectedId={header.branch}
//                 onSelect={(branch) => setHeader(p => ({ 
//                   ...p, 
//                   branch: branch?._id || '',
//                   branchName: branch?.name || '',
//                   branchCode: branch?.code || ''
//                 }))}
//                 placeholder="Search branch... *"
//                 required={true}
//                 displayField="name"
//                 codeField="code"
//                 readOnly={isHeaderReadOnly}
//               />
//             </div>

//             <Select
//               col="col-span-12 md:col-span-3"
//               label="Delivery"
//               value={header.delivery}
//               onChange={(v) => setHeader((p) => ({ ...p, delivery: v }))}
//               options={DELIVERY_TYPES}
//               readOnly={isHeaderReadOnly}
//             />

//             <Input
//               type="date"
//               col="col-span-12 md:col-span-3"
//               label="Date"
//               value={header.date}
//               onChange={(v) => setHeader((p) => ({ ...p, date: v }))}
//               readOnly={isHeaderReadOnly}
//             />
//           </div>

//           <div className="mb-4">
//   <div className="text-sm font-bold text-slate-700 mb-2">Billing Type / Charges</div>
//   <div className="overflow-auto rounded-xl border border-yellow-300">
//     <table className="min-w-full w-full text-sm">
//       <thead className="sticky top-0 bg-yellow-400">
//         <tr>
//           {billingColumns.map((col) => (
//             <th
//               key={col.key}
//               className="border border-yellow-500 px-4 py-3 text-xs font-extrabold text-slate-900 text-center"
//             >
//               {col.label}
//             </th>
//           ))}
//         </tr>
//       </thead>
//       <tbody>
//         <tr className="hover:bg-yellow-50 even:bg-slate-50">
//           {billingColumns.map((col) => (
//             <td key={col.key} className="border border-yellow-300 px-2 py-2">
//               {col.options ? (
//                 <select
//                   value={billing[col.key] || ""}
//                   onChange={(e) => {
//                     if (col.key === "billingType") {
//                       handleBillingTypeChange(e.target.value);
//                     } else {
//                       setBilling(prev => ({ ...prev, [col.key]: e.target.value }));
//                     }
//                   }}
//                   disabled={col.key !== "billingType" && selectedVehicleNegotiation}
//                   className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
//                     (col.key !== "billingType" && selectedVehicleNegotiation) ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
//                   }`}
//                 >
//                   <option value="">Select {col.label}</option>
//                   {col.options.map((opt) => (
//                     <option key={opt} value={opt}>
//                       {opt}
//                     </option>
//                   ))}
//                 </select>
//               ) : (
//                 <input
//                   type={col.type || "text"}
//                   step={col.type === "number" ? "1" : undefined}
//                   value={billing[col.key] || ""}
//                   onChange={(e) => setBilling(prev => ({ ...prev, [col.key]: e.target.value }))}
//                   readOnly={selectedVehicleNegotiation}
//                   className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
//                     selectedVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
//                   }`}
//                   placeholder={`Enter ${col.label}`}
//                 />
//               )}
//             </td>
//           ))}
//         </tr>
//       </tbody>
//     </table>
//   </div>
// </div>
//           <div>
//             <div className="flex items-center justify-between mb-4">
//               <div className="text-sm font-bold text-slate-700">
//                 Orders - {billing.billingType} - {orders.length} row{orders.length !== 1 ? 's' : ''}
//               </div>
              
//               {billing.billingType === "Multi - Order" && !selectedVehicleNegotiation && (
//                 <button
//                   onClick={addOrder}
//                   className="rounded-xl bg-yellow-600 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-700"
//                 >
//                   + Add Row
//                 </button>
//               )}
//             </div>
            
//             <OrdersTable
//               rows={orders}
//               onChange={updateOrder}
//               onRemove={removeOrder}
//               billingType={billing.billingType}
//               selectedVehicleNegotiation={selectedVehicleNegotiation}
//               locations={locations}
//               rateMasters={rateMasterSearch.rateMasters}
//               headerBranch={header.branch}
//               headerCustomerId={header.customerId}
//             />
//           </div>

//           <div className="flex justify-end gap-4 mt-4">
//             <div className="flex items-center gap-3 border border-yellow-300 px-6 py-3 bg-yellow-50 rounded-xl">
//               <div className="text-sm font-extrabold text-slate-900">Total Weight:</div>
//               <div className="text-xl font-extrabold text-emerald-700">{totalWeight}</div>
//             </div>
//             <div className="flex items-center gap-3 border border-yellow-300 px-6 py-3 bg-yellow-50 rounded-xl">
//               <div className="text-sm font-extrabold text-slate-900">Total Amount:</div>
//               <div className="text-xl font-extrabold text-emerald-700">{totalAmount}</div>
//             </div>
//           </div>
//         </Card>

//         <Card title="Rate - Approval - Part - 2 (Read Only)">
//           <div className="grid grid-cols-12 gap-4">
//             <Select
//               col="col-span-12 md:col-span-4"
//               label="Rate Approval Type"
//               value={rateApproval.approvalType}
//               onChange={(v) => setRateApproval((p) => ({ ...p, approvalType: v }))}
//               options={RATE_APPROVAL_TYPES}
//               readOnly={true}
//             />

//             <div className="col-span-12 md:col-span-4">
//               <label className="text-xs font-bold text-slate-600">Rate Approval Upload</label>
//               <input
//                 type="file"
//                 accept=".pdf,.png,.jpg,.jpeg"
//                 onChange={handleFileSelect}
//                 disabled={true}
//                 className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none cursor-not-allowed"
//               />
//               {rateApproval.uploadFileName && (
//                 <div className="mt-1 text-xs text-green-600">
//                   ✅ File: {rateApproval.uploadFileName}
//                 </div>
//               )}
//             </div>

//             <Select
//               col="col-span-12 md:col-span-4"
//               label="Approval Status"
//               value={rateApproval.approvalStatus}
//               onChange={(v) => setRateApproval((p) => ({ ...p, approvalStatus: v }))}
//               options={APPROVAL_STATUS}
//               readOnly={true}
//             />
//           </div>
//         </Card>
//       </div>
//     </div>
//   );
// }
"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

/* =========================
  CONSTANTS
========================= */
const ORDER_TYPES = ["Sales", "STO Order", "Export", "Import"];
const BILLING_TYPES = ["Single - Order", "Multi - Order"];
const DELIVERY_TYPES = ["Urgent", "Normal", "Express", "Scheduled"];
const APPROVAL_STATUS = ["Pending", "Pending from Team", "Pending from Client", "Approved", "Rejected", "Completed"];
const RATE_APPROVAL_TYPES = ["Contract Rates", "Mail Approval Rate"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/* =========================
  CUSTOMER SEARCH HOOK
========================= */
function useCustomerSearch() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/customers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCustomers(data.data);
      } else {
        setCustomers([]);
        setError(data.message || 'No customers found');
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setCustomers([]);
      setError('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  return { customers, loading, error, searchCustomers };
}

/* =========================
  VEHICLE NEGOTIATION SEARCH HOOK
========================= */
function useVehicleNegotiationSearch() {
  const [vehicleNegotiations, setVehicleNegotiations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchVehicleNegotiations = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      const vnRes = await fetch('/api/vehicle-negotiation', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!vnRes.ok) {
        throw new Error(`HTTP error! status: ${vnRes.status}`);
      }
      
      const vnData = await vnRes.json();
      
      const pricingRes = await fetch('/api/pricing-panel?format=table', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const pricingData = await pricingRes.json();
      
      const usedVnns = new Set();
      if (pricingData.success && Array.isArray(pricingData.data)) {
        pricingData.data.forEach(item => {
          if (item.vnn && item.vnn !== '-' && item.vnn !== 'N/A') {
            usedVnns.add(item.vnn);
          }
        });
      }
      
      if (vnData.success && Array.isArray(vnData.data)) {
        const availableVNs = vnData.data.filter(vn => !usedVnns.has(vn.vnnNo));
        setVehicleNegotiations(availableVNs);
      } else {
        setVehicleNegotiations([]);
        setError(vnData.message || 'No vehicle negotiations found');
      }
    } catch (err) {
      console.error('Error fetching vehicle negotiations:', err);
      setVehicleNegotiations([]);
      setError('Failed to fetch vehicle negotiations');
    } finally {
      setLoading(false);
    }
  };

  const getVehicleNegotiationById = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/vehicle-negotiation?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        setError(data.message || 'Vehicle negotiation not found');
        return null;
      }
    } catch (err) {
      console.error('Error fetching vehicle negotiation:', err);
      setError('Failed to fetch vehicle negotiation');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchVehicleNegotiations();
  }, []);

  return { 
    vehicleNegotiations, 
    loading, 
    error, 
    searchVehicleNegotiations, 
    getVehicleNegotiationById 
  };
}

/* =========================
  RATE MASTER SEARCH HOOK
========================= */
function useRateMasterSearch() {
  const [rateMasters, setRateMasters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchRateMasters = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/rate-master', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const processedData = data.data.map(rm => ({
          ...rm,
          locationRates: rm.locationRates || [],
          rateSlabs: rm.locationRates?.flatMap(lr => [{
            fromQty: lr.fromQty,
            toQty: lr.toQty,
            rate: lr.rate,
            locationName: lr.locationName
          }]) || []
        }));
        setRateMasters(processedData);
      } else {
        setRateMasters([]);
      }
    } catch (err) {
      console.error('Error fetching rate masters:', err);
      setRateMasters([]);
      setError('Failed to fetch rate masters');
    } finally {
      setLoading(false);
    }
  };

  return { rateMasters, loading, error, searchRateMasters };
}

/* =========================
  DEFAULT ROWS
========================= */
function defaultOrderRow() {
  return {
    _id: uid(),
    orderNo: "",
    vehicleNegotiationId: "",
    vnnNumber: "",
    partyName: "",
    customerId: "",
    customerCode: "",
    contactPerson: "",
    plantCode: "",
    plantName: "",
    plantCodeValue: "",
    orderType: "Sales",
    pinCode: "",
    from: "",
    fromName: "",
    fromState: "",
    to: "",
    toName: "",
    taluka: "",
    talukaName: "",
    district: "",
    districtName: "",
    state: "",
    stateName: "",
    country: "",
    countryName: "",
    locationRate: "",
    priceList: "",
    selectedRateMaster: null,
    weight: "",
    rate: "",
    totalAmount: 0,
    collectionCharges: "",
    cancellationCharges: "",
    loadingCharges: "",
    otherCharges: "",
    localStatus: "unknown",
    localStatusLabel: "Unknown",
    subCompanyId: "",
    subCompanyName: "",
    subCompanyCode: ""
  };
}

/* =========================
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

function Input({ label, value, onChange, col = "", type = "text", readOnly = false }) {
  return (
    <div className={col}>
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
          readOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
        }`}
      />
    </div>
  );
}

function Select({ label, value, onChange, options = [], col = "", readOnly = false }) {
  return (
    <div className={col}>
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <select
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={readOnly}
        className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
          readOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
        }`}
      >
        <option value="">Select {label}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

/* =========================
  SEARCHABLE DROPDOWN COMPONENT
========================= */
function SearchableDropdown({ 
  items, 
  selectedId, 
  onSelect, 
  placeholder = "Search...",
  required = false,
  displayField = 'name',
  codeField = 'code',
  readOnly = false
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setFilteredItems(items);
    if (selectedId) {
      const item = items.find(i => i._id === selectedId);
      setSelectedItem(item);
      if (item) {
        setSearchQuery(getDisplayValue(item));
      }
    } else {
      setSelectedItem(null);
      setSearchQuery("");
    }
  }, [items, selectedId]);

  const getDisplayValue = (item) => {
    if (!item) return "";
    const display = item[displayField] || item.customerName || "";
    const code = item[codeField] ? `(${item[codeField]})` : "";
    return `${display} ${code}`.trim();
  };

  const handleSearch = (query) => {
    if (readOnly) return;
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item =>
        (item[displayField] && item[displayField].toLowerCase().includes(query.toLowerCase())) ||
        (item[codeField] && item[codeField].toLowerCase().includes(query.toLowerCase())) ||
        (item.customerName && item.customerName.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredItems(filtered);
    }
    
    if (selectedItem && query !== getDisplayValue(selectedItem)) {
      setSelectedItem(null);
      onSelect?.(null);
    }
  };

  const handleSelectItem = (item) => {
    if (readOnly) return;
    setSelectedItem(item);
    setSearchQuery(getDisplayValue(item));
    setShowDropdown(false);
    onSelect?.(item);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => !readOnly && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
          readOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
        }`}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        readOnly={readOnly}
      />
      
      {showDropdown && !readOnly && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item._id}
                onMouseDown={() => handleSelectItem(item)}
                className={`p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
                  selectedItem?._id === item._id ? 'bg-sky-50' : ''
                }`}
              >
                <div className="font-medium text-slate-800">
                  {item[displayField] || item.customerName}
                </div>
                {item[codeField] && (
                  <div className="text-xs text-slate-500 mt-1">
                    Code: {item[codeField]}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-sm text-slate-500">
              {searchQuery.trim() ? 
                `No items found for "${searchQuery}"` : 
                "No items available"
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================
  LOCATION RATE DROPDOWN COMPONENT
========================= */
function LocationRateDropdown({ 
  locations,
  selectedName,
  onSelect, 
  placeholder = "Select Location...",
  readOnly = false,
  selectedRateMaster = null
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const availableLocationNames = useMemo(() => {
    if (selectedRateMaster && selectedRateMaster.locationRates) {
      return selectedRateMaster.locationRates.map(lr => lr.locationName);
    }
    return [];
  }, [selectedRateMaster]);

  const filteredLocationsByRateMaster = useMemo(() => {
    if (!selectedRateMaster) {
      return [];
    }
    
    if (availableLocationNames.length === 0) {
      return [];
    }
    
    return (locations || []).filter(loc => 
      availableLocationNames.includes(loc.name)
    );
  }, [locations, selectedRateMaster, availableLocationNames]);

  useEffect(() => {
    if (selectedName && locations) {
      const isValidLocation = availableLocationNames.includes(selectedName);
      if (isValidLocation) {
        const item = locations.find(l => l.name === selectedName);
        setSelectedItem(item);
        if (item) {
          setSearchQuery(item.name);
        }
      } else {
        setSelectedItem(null);
        setSearchQuery("");
        onSelect?.("");
      }
    } else if (!selectedName) {
      setSelectedItem(null);
      setSearchQuery("");
    }
  }, [locations, selectedName, availableLocationNames]);

  const handleSelectItem = (item) => {
    if (readOnly) return;
    setSelectedItem(item);
    setSearchQuery(item.name);
    setShowDropdown(false);
    onSelect?.(item.name);
  };

  const handleInputFocus = () => {
    if (!readOnly && inputRef.current && filteredLocationsByRateMaster.length > 0) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
      setShowDropdown(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (dropdownRef.current && !dropdownRef.current.contains(document.activeElement)) {
        setShowDropdown(false);
      }
    }, 200);
  };

  const searchedLocations = useMemo(() => {
    if (!searchQuery.trim()) return filteredLocationsByRateMaster;
    return filteredLocationsByRateMaster.filter(loc => 
      loc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [filteredLocationsByRateMaster, searchQuery]);

  const getPlaceholder = () => {
    if (!selectedRateMaster) {
      return "Please select Price List first";
    }
    if (filteredLocationsByRateMaster.length === 0) {
      return "No locations available for this Price List";
    }
    return placeholder;
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        className={`w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
          (readOnly || !selectedRateMaster || filteredLocationsByRateMaster.length === 0) ? 'bg-slate-50 cursor-not-allowed' : 'bg-white cursor-pointer'
        }`}
        placeholder={getPlaceholder()}
        readOnly={readOnly || !selectedRateMaster || filteredLocationsByRateMaster.length === 0}
        autoComplete="off"
      />
      <div className="absolute right-2 top-2 text-gray-400 pointer-events-none">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {showDropdown && !readOnly && selectedRateMaster && filteredLocationsByRateMaster.length > 0 && (
        <div 
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            maxHeight: '300px'
          }}
        >
          <div className="sticky top-0 bg-gray-50 px-3 py-2 text-xs font-semibold text-slate-600 border-b">
            Select Location (from {selectedRateMaster.title})
          </div>
          {searchedLocations.map((location) => (
            <div
              key={location._id}
              onMouseDown={() => handleSelectItem(location)}
              className={`px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
                selectedItem?._id === location._id ? 'bg-sky-50' : ''
              }`}
            >
              <div className="font-medium text-slate-800 text-sm">
                {location.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================
  PRICE LIST DROPDOWN COMPONENT
========================= */
function PriceListDropdown({ 
  rateMasters, 
  selectedValue, 
  onSelect, 
  locationName,
  branchId,
  customerId,
  placeholder = "Select Price List...",
  readOnly = false
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const filteredRateMasters = useMemo(() => {
    let filtered = rateMasters || [];
    
    if (branchId) {
      filtered = filtered.filter(rm => {
        const rmBranchId = rm.branchId?._id || rm.branchId;
        return String(rmBranchId) === String(branchId);
      });
    } else {
      return [];
    }
    
    if (customerId) {
      filtered = filtered.filter(rm => {
        const rmCustomerId = rm.customerId?._id || rm.customerId;
        return String(rmCustomerId) === String(customerId);
      });
    } else {
      return [];
    }
    
    if (locationName) {
      filtered = filtered.filter(rm => {
        return rm.locationRates && Array.isArray(rm.locationRates) && 
               rm.locationRates.some(lr => lr.locationName === locationName);
      });
    }
    
    return filtered;
  }, [rateMasters, locationName, branchId, customerId]);

  useEffect(() => {
    if (selectedValue) {
      const item = filteredRateMasters.find(rm => rm.title === selectedValue);
      setSelectedItem(item);
      if (item) {
        setSearchQuery(item.title);
      }
    } else {
      setSelectedItem(null);
      setSearchQuery("");
    }
  }, [filteredRateMasters, selectedValue]);

  const handleSelectItem = (item) => {
    if (readOnly) return;
    setSelectedItem(item);
    setSearchQuery(item.title);
    setShowDropdown(false);
    onSelect?.(item);
  };

  const handleInputFocus = () => {
    if (!readOnly && inputRef.current && filteredRateMasters.length > 0) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
      setShowDropdown(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (dropdownRef.current && !dropdownRef.current.contains(document.activeElement)) {
        setShowDropdown(false);
      }
    }, 200);
  };

  const searchedItems = useMemo(() => {
    if (!searchQuery.trim()) return filteredRateMasters;
    return filteredRateMasters.filter(rm => 
      rm.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [filteredRateMasters, searchQuery]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        className={`w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
          readOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white cursor-pointer'
        }`}
        placeholder={placeholder}
        readOnly={readOnly}
        autoComplete="off"
      />
      <div className="absolute right-2 top-2 text-gray-400 pointer-events-none">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {showDropdown && !readOnly && filteredRateMasters.length > 0 && (
        <div 
          className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            maxHeight: '300px'
          }}
        >
          <div className="sticky top-0 bg-gray-50 px-3 py-2 text-xs font-semibold text-slate-600 border-b">
            Select Price List
          </div>
          {searchedItems.length > 0 ? (
            searchedItems.map((rm) => (
              <div
                key={rm._id}
                onMouseDown={() => handleSelectItem(rm)}
                className={`px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
                  selectedItem?._id === rm._id ? 'bg-sky-50' : ''
                }`}
              >
                <div className="font-medium text-slate-800 text-sm">
                  {rm.title}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Branch: {rm.branchName || 'N/A'} | Customer: {rm.customerName || 'N/A'} | Locations: {rm.locationRates?.length || 0}
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-sm text-slate-500">
              {searchQuery.trim() ? 
                `No price lists found for "${searchQuery}"` : 
                `No price lists available for this branch, customer, and location`
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================
  VEHICLE NEGOTIATION DROPDOWN FOR HEADER
========================= */
function VehicleNegotiationHeaderDropdown({ 
  onSelect,
  placeholder = "Search vehicle negotiation..."
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [vnList, setVnList] = useState([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const vehicleNegotiationSearch = useVehicleNegotiationSearch();

  useEffect(() => {
    setVnList(vehicleNegotiationSearch.vehicleNegotiations);
  }, [vehicleNegotiationSearch.vehicleNegotiations]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!showDropdown) {
      setShowDropdown(true);
    }
  };

  const handleSelectVN = async (vn) => {
    setSearchQuery(vn.vnnNo);
    setShowDropdown(false);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/vehicle-negotiation?id=${vn._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          onSelect(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching VN details:', error);
    }
  };

  const handleInputFocus = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    
    setShowDropdown(true);
    if (vnList.length === 0 && vehicleNegotiationSearch.vehicleNegotiations.length === 0) {
      vehicleNegotiationSearch.searchVehicleNegotiations();
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (dropdownRef.current && !dropdownRef.current.contains(document.activeElement)) {
        setShowDropdown(false);
      }
    }, 200);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (showDropdown && inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [showDropdown]);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return vnList;
    return vnList.filter(vn =>
      vn.vnnNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vn.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vn.branchName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vn.subCompanyName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [vnList, searchQuery]);

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        placeholder={placeholder}
        autoComplete="off"
      />
      
      {showDropdown && (
        <div 
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 9999,
            maxHeight: '400px'
          }}
          className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-y-auto"
        >
          {vehicleNegotiationSearch.loading ? (
            <div className="p-4 text-center text-sm text-slate-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500 mx-auto mb-2"></div>
              Loading vehicle negotiations...
            </div>
          ) : filteredList.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredList.map((vn) => (
                <div
                  key={vn._id}
                  onMouseDown={() => handleSelectVN(vn)}
                  className="p-3 hover:bg-yellow-50 cursor-pointer"
                >
                  <div className="font-medium text-slate-800">{vn.vnnNo}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {vn.customerName || 'N/A'} | {vn.branchName} | Orders: {vn.orders?.length || 0}
                    {vn.subCompanyName && (
                      <span className="ml-2 text-blue-600">Sub-Company: {vn.subCompanyName}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-slate-500">
              {searchQuery.trim() ? 
                `No vehicle negotiations found for "${searchQuery}"` : 
                "No vehicle negotiations available"
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================
  ORDERS TABLE COMPONENT
========================= */
function OrdersTable({ 
  rows, 
  onChange, 
  onRemove, 
  billingType, 
  selectedVehicleNegotiation,
  locations,
  rateMasters,
  headerBranch,
  headerCustomerId,
  headerSubCompanyId,
  headerSubCompanyName,
  headerSubCompanyCode
}) {
const columns = [
  { key: "orderNo", label: "Order No *", width: "120px" },
  { key: "partyName", label: "Party Name", width: "150px" },
  { key: "plantCode", label: "Plant Code", width: "100px" },
  { key: "plantName", label: "Plant Name *Auto", width: "120px", readOnly: true },
  { key: "plantCodeValue", label: "Plant Code Value *Auto", width: "120px", readOnly: true },
  { key: "orderType", label: "Order Type", width: "100px" },
  { key: "pinCode", label: "Pin Code", width: "100px" },
  { key: "from", label: "From", width: "120px" },
  { key: "to", label: "To", width: "120px" },
  { key: "taluka", label: "Taluka", width: "120px" },
  { key: "district", label: "District", width: "100px" },
  { key: "state", label: "State", width: "100px" },
  { key: "localStatus", label: "Local/Not Local", width: "120px" },
  { key: "country", label: "Country", width: "100px" },
  { key: "priceList", label: "Price List", width: "180px" },
  { key: "locationRate", label: "Location Rate", width: "150px" },
  { key: "weight", label: "Weight", type: "number", width: "80px" },
  { key: "rate", label: "Rate (₹)", type: "number", width: "80px", readOnly: true },
  { key: "totalAmount", label: "Total Amount", type: "number", width: "100px", readOnly: true },
  { key: "collectionCharges", label: "Collection Charges", type: "number", width: "120px" },
  { key: "cancellationCharges", label: "Cancellation Charges", width: "130px" },
  { key: "loadingCharges", label: "Loading Charges", width: "120px" },
  { key: "otherCharges", label: "Other Charges", type: "number", width: "100px" },
  { key: "subCompanyName", label: "Sub-Company", width: "120px" },
];

  const isReadOnlyMode = !!selectedVehicleNegotiation;

  const handlePriceListSelect = (rowId, rateMaster) => {
    onChange(rowId, 'priceList', rateMaster.title);
    onChange(rowId, 'selectedRateMaster', rateMaster);
    onChange(rowId, 'locationRate', '');
    onChange(rowId, 'rate', '');
    const currentRow = rows.find(r => r._id === rowId);
    if (currentRow && currentRow.weight && currentRow.locationRate) {
      const locationRate = rateMaster.locationRates?.find(lr => 
        lr.locationName === currentRow.locationRate
      );
      
      if (locationRate) {
        const weightNum = parseFloat(currentRow.weight);
        if (weightNum >= locationRate.fromQty && weightNum <= locationRate.toQty) {
          onChange(rowId, 'rate', locationRate.rate);
        } else {
          onChange(rowId, 'rate', '');
          alert(`Weight ${currentRow.weight} is outside the range (${locationRate.fromQty} - ${locationRate.toQty}) for this price list`);
        }
      }
    }
  };

  const handleWeightChange = (rowId, weight) => {
    onChange(rowId, 'weight', weight);
    
    const currentRow = rows.find(r => r._id === rowId);
    if (currentRow && currentRow.selectedRateMaster && currentRow.locationRate) {
      const locationRate = currentRow.selectedRateMaster.locationRates?.find(lr => 
        lr.locationName === currentRow.locationRate
      );
      
      if (locationRate) {
        const weightNum = parseFloat(weight);
        if (weightNum >= locationRate.fromQty && weightNum <= locationRate.toQty) {
          onChange(rowId, 'rate', locationRate.rate);
        } else {
          onChange(rowId, 'rate', '');
        }
      }
    }
  };

  const handleSubCompanyChange = (rowId, subCompanyId) => {
    const selected = subCompanies.find(sc => sc._id === subCompanyId);
    onChange(rowId, 'subCompanyId', subCompanyId);
    onChange(rowId, 'subCompanyName', selected?.name || '');
    onChange(rowId, 'subCompanyCode', selected?.code || '');
  };

  return (
    <div className="overflow-auto rounded-xl border border-yellow-300 max-h-[600px]">
      <table className="min-w-max w-full text-sm">
        <thead className="sticky top-0 bg-yellow-400 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="border border-yellow-500 px-2 py-2 text-xs font-extrabold text-slate-900 text-center whitespace-nowrap"
                style={{ minWidth: col.width }}
              >
                {col.label}
                {col.readOnly && <span className="ml-1 text-xs text-blue-600">*</span>}
              </th>
            ))}
            {billingType === "Multi - Order" && !isReadOnlyMode && (
              <th className="border border-yellow-500 px-2 py-2 text-xs font-extrabold text-slate-900 text-center whitespace-nowrap">
                Actions
              </th>
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const totalAmount = num(row.weight) * num(row.rate);
            const isFromVehicleNegotiation = !!row.vehicleNegotiationId || isReadOnlyMode;
            const currentCustomerId = row.customerId || headerCustomerId;
            
            return (
              <tr key={row._id} className="hover:bg-yellow-50 even:bg-slate-50">
                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    value={row.orderNo || ""}
                    onChange={(e) => onChange(row._id, 'orderNo', e.target.value)}
                    className={`w-full min-w-[100px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
                      isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                    }`}
                    placeholder="Order No"
                    readOnly={isFromVehicleNegotiation}
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    value={row.partyName || ""}
                    onChange={(e) => onChange(row._id, 'partyName', e.target.value)}
                    className={`w-full min-w-[120px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
                      isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                    }`}
                    placeholder="Party Name"
                    readOnly={isFromVehicleNegotiation}
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    value={row.plantCode || ""}
                    onChange={(e) => onChange(row._id, 'plantCode', e.target.value)}
                    className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
                      isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                    }`}
                    placeholder="Plant Code"
                    readOnly={isFromVehicleNegotiation}
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    type="text"
                    value={row.plantName || ""}
                    readOnly
                    className="w-full min-w-[100px] rounded border border-slate-200 bg-slate-50 px-1 py-1 text-xs outline-none"
                    placeholder="Auto-filled"
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    type="text"
                    value={row.plantCodeValue || ""}
                    readOnly
                    className="w-full min-w-[100px] rounded border border-slate-200 bg-slate-50 px-1 py-1 text-xs outline-none"
                    placeholder="Auto-filled"
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <select
                    value={row.orderType || ""}
                    onChange={(e) => onChange(row._id, 'orderType', e.target.value)}
                    className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
                      isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                    }`}
                    disabled={isFromVehicleNegotiation}
                  >
                    <option value="">Select</option>
                    {ORDER_TYPES.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    type="text"
                    value={row.pinCode || ""}
                    onChange={(e) => onChange(row._id, 'pinCode', e.target.value)}
                    className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
                      isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                    }`}
                    placeholder="Pin Code"
                    readOnly={isFromVehicleNegotiation}
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    value={row.fromName || ""}
                    onChange={(e) => onChange(row._id, 'fromName', e.target.value)}
                    className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
                      isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                    }`}
                    placeholder="From"
                    readOnly={isFromVehicleNegotiation}
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    value={row.toName || ""}
                    onChange={(e) => onChange(row._id, 'toName', e.target.value)}
                    className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
                      isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                    }`}
                    placeholder="To"
                    readOnly={isFromVehicleNegotiation}
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    value={row.talukaName || row.taluka || ""}
                    onChange={(e) => onChange(row._id, 'talukaName', e.target.value)}
                    className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
                      isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                    }`}
                    placeholder="Taluka"
                    readOnly={isFromVehicleNegotiation}
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    value={row.districtName || ""}
                    onChange={(e) => onChange(row._id, 'districtName', e.target.value)}
                    className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
                      isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                    }`}
                    placeholder="District"
                    readOnly={isFromVehicleNegotiation}
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    value={row.stateName || ""}
                    onChange={(e) => onChange(row._id, 'stateName', e.target.value)}
                    className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
                      isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                    }`}
                    placeholder="State"
                    readOnly={isFromVehicleNegotiation}
                  />
                </td>

                {/* Local Status */}
                <td className="border border-yellow-300 px-1 py-1 text-center">
                  {row.fromState && row.stateName ? (
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                      row.fromState.trim().toUpperCase() === row.stateName.trim().toUpperCase()
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}>
                      {row.fromState.trim().toUpperCase() === row.stateName.trim().toUpperCase() ? '✅ Local' : '❌ Not Local'}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    value={row.countryName || ""}
                    onChange={(e) => onChange(row._id, 'countryName', e.target.value)}
                    className={`w-full min-w-[80px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
                      isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                    }`}
                    placeholder="Country"
                    readOnly={isFromVehicleNegotiation}
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <PriceListDropdown
                    rateMasters={rateMasters}
                    selectedValue={row.priceList}
                    onSelect={(rateMaster) => handlePriceListSelect(row._id, rateMaster)}
                    locationName={row.locationRate}
                    branchId={headerBranch}
                    customerId={currentCustomerId}
                    placeholder="Select Price List..."
                    readOnly={false}
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <LocationRateDropdown
                    locations={locations}
                    selectedName={row.locationRate}
                    onSelect={(locationName) => {
                      onChange(row._id, 'locationRate', locationName);
                      onChange(row._id, 'rate', '');
                    }}
                    readOnly={false}
                    placeholder="Select Location..."
                    selectedRateMaster={row.selectedRateMaster}
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    type="number"
                    step="0.01"
                    value={row.weight || ""}
                    onChange={(e) => handleWeightChange(row._id, e.target.value)}
                    className={`w-full min-w-[70px] rounded border border-slate-200 px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 ${
                      isFromVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                    }`}
                    placeholder="Weight"
                    readOnly={isFromVehicleNegotiation}
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    type="number"
                    step="0.01"
                    value={row.rate || ""}
                    readOnly
                    className="w-full min-w-[70px] rounded border border-slate-200 bg-slate-50 px-1 py-1 text-xs outline-none cursor-not-allowed"
                    placeholder="Auto"
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    type="number"
                    value={totalAmount}
                    readOnly
                    className="w-full min-w-[80px] rounded border border-slate-200 bg-slate-50 px-1 py-1 text-xs outline-none"
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    type="number"
                    step="0.01"
                    value={row.collectionCharges || ""}
                    onChange={(e) => onChange(row._id, 'collectionCharges', e.target.value)}
                    className="w-full min-w-[90px] rounded border border-slate-200 bg-white px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                    placeholder="Collection"
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    value={row.cancellationCharges || ""}
                    onChange={(e) => onChange(row._id, 'cancellationCharges', e.target.value)}
                    className="w-full min-w-[100px] rounded border border-slate-200 bg-white px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                    placeholder="Cancellation"
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    value={row.loadingCharges || ""}
                    onChange={(e) => onChange(row._id, 'loadingCharges', e.target.value)}
                    className="w-full min-w-[90px] rounded border border-slate-200 bg-white px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                    placeholder="Loading"
                  />
                </td>

                <td className="border border-yellow-300 px-1 py-1">
                  <input
                    type="number"
                    step="0.01"
                    value={row.otherCharges || ""}
                    onChange={(e) => onChange(row._id, 'otherCharges', e.target.value)}
                    className="w-full min-w-[80px] rounded border border-slate-200 bg-white px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                    placeholder="Other"
                  />
                </td>

                {/* Sub-Company Column */}
                <td className="border border-yellow-300 px-1 py-1">
                  {isFromVehicleNegotiation ? (
                    <div className="text-xs">
                      {row.subCompanyName || headerSubCompanyName || '-'}
                      {row.subCompanyCode && (
                        <span className="text-xs text-gray-500 ml-1">({row.subCompanyCode})</span>
                      )}
                    </div>
                  ) : (
                    <select
                      value={row.subCompanyId || headerSubCompanyId || ''}
                      onChange={(e) => {
                        const subCompanyId = e.target.value;
                        const selected = window._subCompanies?.find(sc => sc._id === subCompanyId);
                        onChange(row._id, 'subCompanyId', subCompanyId);
                        onChange(row._id, 'subCompanyName', selected?.name || '');
                        onChange(row._id, 'subCompanyCode', selected?.code || '');
                      }}
                      className="w-full rounded border border-slate-200 bg-white px-1 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                    >
                      <option value="">Select</option>
                      {(window._subCompanies || []).map((sc) => (
                        <option key={sc._id} value={sc._id}>
                          {sc.name} ({sc.code})
                        </option>
                      ))}
                    </select>
                  )}
                </td>

                {billingType === "Multi - Order" && !isReadOnlyMode && (
                  <td className="border border-yellow-300 px-1 py-1 text-center">
                    <button
                      onClick={() => onRemove(row._id)}
                      className="rounded bg-red-500 px-2 py-1 text-xs font-bold text-white hover:bg-red-600 transition"
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* =========================
  MAIN CREATE PAGE
========================= */
export default function PricingPanelPage() {
  const router = useRouter();
  
  const [branches, setBranches] = useState([]);
  const [subCompanies, setSubCompanies] = useState([]);
  const [locations, setLocations] = useState([]);
  const [countries, setCountries] = useState([]);
  const [plants, setPlants] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pricingSerialNo, setPricingSerialNo] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const customerSearch = useCustomerSearch();

  const [selectedVehicleNegotiation, setSelectedVehicleNegotiation] = useState(null);
  const vehicleNegotiationSearch = useVehicleNegotiationSearch();

  const rateMasterSearch = useRateMasterSearch();

  // Store subCompanies in window for use in OrdersTable
  useEffect(() => {
    if (subCompanies.length > 0) {
      window._subCompanies = subCompanies;
    }
  }, [subCompanies]);

  const [header, setHeader] = useState({
    pricingSerialNo: "",
    branch: "",
    branchName: "",
    branchCode: "",
    subCompanyId: "",
    subCompanyName: "",
    subCompanyCode: "",
    delivery: "Normal",
    date: new Date().toISOString().split('T')[0],
    partyName: "",
    customerId: ""
  });

  const [billing, setBilling] = useState({
    billingType: "Multi - Order",
    loadingPoints: "",
    dropPoints: "",
    collectionCharges: 0,
    cancellationCharges: "Nil",
    loadingCharges: "Nil",
    otherCharges: 0,
  });

  const [orders, setOrders] = useState([
    defaultOrderRow(),
    defaultOrderRow()
  ]);

  const [rateApproval, setRateApproval] = useState({
    approvalType: "Contract Rates",
    uploadFile: null,
    uploadFileName: "",
    approvalStatus: "Pending",
  });

  useEffect(() => {
    fetchBranches();
    fetchLocations();
    fetchCountries();
    fetchPlants();
    fetchSubCompanies();
    customerSearch.searchCustomers();
    rateMasterSearch.searchRateMasters();
  }, []);

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
      console.error('Error fetching branches:', error.message);
    }
  };

  const fetchSubCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/subcompanies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSubCompanies(data.data);
      } else {
        setSubCompanies([]);
      }
    } catch (error) {
      console.error('Error fetching sub-companies:', error.message);
      setSubCompanies([]);
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
        setLocations(data.data);
        console.log("Loaded locations:", data.data.length);
      } else {
        setLocations([]);
      }
    } catch (error) {
      console.error('Error fetching locations:', error.message);
      setLocations([]);
    }
  };

  const fetchCountries = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/countries', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCountries(data.data);
      }
    } catch (error) {
      console.error('Error fetching countries:', error.message);
    }
  };

  const fetchPlants = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/plants', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPlants(data.data);
      }
    } catch (error) {
      console.error('Error fetching plants:', error.message);
    }
  };

  useEffect(() => {
    if (orders.length === 1) {
      setBilling(prev => ({ ...prev, billingType: "Single - Order" }));
    } else if (orders.length > 1) {
      setBilling(prev => ({ ...prev, billingType: "Multi - Order" }));
    }
  }, [orders.length]);

  const handleSelectVehicleNegotiation = async (fullVN) => {
    setSelectedVehicleNegotiation(fullVN);
    
    setHeader(prev => ({
      ...prev,
      branch: fullVN.branch?._id || fullVN.branch || "",
      branchName: fullVN.branchName || "",
      branchCode: fullVN.branchCode || "",
      subCompanyId: fullVN.subCompanyId || "",
      subCompanyName: fullVN.subCompanyName || "",
      subCompanyCode: fullVN.subCompanyCode || "",
      delivery: fullVN.delivery || "Normal",
      date: fullVN.date ? new Date(fullVN.date).toISOString().split('T')[0] : prev.date,
      partyName: fullVN.customerName || fullVN.partyName || prev.partyName,
      customerId: fullVN.customerId?._id || fullVN.customerId || prev.customerId
    }));

    setBilling(prev => ({
      ...prev,
      collectionCharges: fullVN.collectionCharges || 0,
      cancellationCharges: fullVN.cancellationCharges || "Nil",
      loadingCharges: fullVN.loadingCharges || "Nil",
      otherCharges: fullVN.otherCharges || 0,
      loadingPoints: fullVN.loadingPoints || prev.loadingPoints || "",
      dropPoints: fullVN.dropPoints || prev.dropPoints || ""
    }));

    if (fullVN.orders && fullVN.orders.length > 0) {
      const newOrders = fullVN.orders.map(order => ({
        _id: uid(),
        orderNo: order.orderNo,
        vehicleNegotiationId: fullVN._id,
        vnnNumber: fullVN.vnnNo,
        partyName: order.partyName || fullVN.customerName || "",
        customerId: order.customerId?._id || order.customerId || fullVN.customerId?._id || fullVN.customerId,
        customerCode: order.customerCode || "",
        contactPerson: order.contactPerson || fullVN.contactPerson || "",
        plantCode: order.plantCode?._id || order.plantCode,
        plantName: order.plantName || "",
        plantCodeValue: order.plantCodeValue || "",
        orderType: order.orderType || "Sales",
        pinCode: order.pinCode || "",
        from: order.from,
        fromName: order.fromName || "",
        fromState: order.fromState || "",
        to: order.to,
        toName: order.toName || "",
        taluka: order.taluka || "",
        talukaName: order.talukaName || order.taluka || "",
        district: order.district,
        districtName: order.districtName || "",
        state: order.state,
        stateName: order.stateName || "",
        country: order.country,
        countryName: order.countryName || "",
        locationRate: "",
        locationRateId: "",
        locationRateTitle: "",
        priceList: "",
        selectedRateMaster: null,
        weight: order.weight || "",
        rate: "",
        totalAmount: 0,
        collectionCharges: order.collectionCharges || "",
        cancellationCharges: order.cancellationCharges || "",
        loadingCharges: order.loadingCharges || "",
        otherCharges: order.otherCharges || "",
        localStatus: order.localStatus || "unknown",
        localStatusLabel: order.localStatusLabel || "Unknown",
        subCompanyId: fullVN.subCompanyId || "",
        subCompanyName: fullVN.subCompanyName || "",
        subCompanyCode: fullVN.subCompanyCode || ""
      }));

      if (billing.billingType === "Single - Order") {
        setOrders([newOrders[0]]);
      } else {
        setOrders(newOrders);
      }
    }
  };

  const updateOrder = (id, key, value) => {
    setOrders((prev) => prev.map((r) => (r._id === id ? { ...r, [key]: value } : r)));
  };

  const addOrder = () => {
    const newOrder = defaultOrderRow();
    // Inherit sub-company from header if available
    if (header.subCompanyId) {
      newOrder.subCompanyId = header.subCompanyId;
      newOrder.subCompanyName = header.subCompanyName;
      newOrder.subCompanyCode = header.subCompanyCode;
    }
    setOrders((prev) => [...prev, newOrder]);
  };

  const removeOrder = (id) => {
    if (orders.length > 1) {
      setOrders((prev) => prev.filter((x) => x._id !== id));
    } else {
      alert("At least one order row is required");
    }
  };

  const handleBillingTypeChange = (value) => {
    setBilling((prev) => ({ ...prev, billingType: value }));
    
    if (value === "Single - Order") {
      setOrders([orders[0] || defaultOrderRow()]);
    } else {
      if (orders.length < 2) {
        const newOrder = defaultOrderRow();
        if (header.subCompanyId) {
          newOrder.subCompanyId = header.subCompanyId;
          newOrder.subCompanyName = header.subCompanyName;
          newOrder.subCompanyCode = header.subCompanyCode;
        }
        setOrders([...orders, newOrder]);
      }
    }
  };

  const totalWeight = useMemo(() => {
    return orders.reduce((acc, r) => acc + num(r.weight), 0);
  }, [orders]);

  const totalAmount = useMemo(() => {
    return orders.reduce((acc, r) => {
      const weight = num(r.weight);
      const rate = num(r.rate);
      return acc + (weight * rate);
    }, 0);
  }, [orders]);

  const handleFileSelect = (e) => {
    alert("Rate Approval section is read-only");
  };

  const handleSaveAll = async () => {
    if (!header.branch) {
      alert("Please select a branch");
      return;
    }
    
    const hasInvalidOrders = orders.some(order => !order.orderNo);
    if (hasInvalidOrders) {
      alert("Please enter Order No for all order rows");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("No authentication token found. Please login again.");
      }

      const payload = {
        header: {
          ...header,
          subCompanyId: header.subCompanyId || null,
          subCompanyName: header.subCompanyName || '',
          subCompanyCode: header.subCompanyCode || '',
          partyName: selectedCustomer?.customerName || header.partyName,
          customerId: selectedCustomer?._id || header.customerId
        },
        billing: {
          ...billing,
          loadingPoints: num(billing.loadingPoints) || 1,
          dropPoints: num(billing.dropPoints) || 1,
          collectionCharges: num(billing.collectionCharges) || 0,
          otherCharges: num(billing.otherCharges) || 0
        },
        orders: orders.map(order => ({
          orderNo: order.orderNo,
          vehicleNegotiationId: order.vehicleNegotiationId,
          vnnNumber: order.vnnNumber,
          partyName: order.partyName,
          customerId: order.customerId || null,
          customerCode: order.customerCode,
          contactPerson: order.contactPerson,
          plantCode: order.plantCode,
          plantName: order.plantName,
          plantCodeValue: order.plantCodeValue,
          orderType: order.orderType,
          pinCode: order.pinCode,
          from: order.from,
          fromName: order.fromName,
          fromState: order.fromState || '',
          to: order.to,
          toName: order.toName,
          taluka: order.taluka,
          talukaName: order.talukaName,
          district: order.district,
          districtName: order.districtName,
          state: order.state,
          stateName: order.stateName,
          country: order.country,
          countryName: order.countryName,
          locationRate: order.locationRate,
          priceList: order.priceList,
          weight: num(order.weight),
          rate: num(order.rate),
          totalAmount: num(order.weight) * num(order.rate),
          collectionCharges: num(order.collectionCharges) || 0,
          cancellationCharges: order.cancellationCharges || "Nil",
          loadingCharges: order.loadingCharges || "Nil",
          otherCharges: num(order.otherCharges) || 0,
          localStatus: order.localStatus || 'unknown',
          localStatusLabel: order.localStatusLabel || 'Unknown',
          subCompanyId: order.subCompanyId || header.subCompanyId || null,
          subCompanyName: order.subCompanyName || header.subCompanyName || '',
          subCompanyCode: order.subCompanyCode || header.subCompanyCode || ''
        })),
        totalWeight,
        totalAmount,
        rateApproval: {
          approvalType: rateApproval.approvalType,
          approvalStatus: rateApproval.approvalStatus,
          uploadFileName: rateApproval.uploadFileName
        },
        branches: branches,
        plants: plants,
        countries: countries,
        locations: locations
      };

      const res = await fetch('/api/pricing-panel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Failed to save pricing panel: ${res.status}`);
      }

      setSaveSuccess(true);
      setPricingSerialNo(data.data?.pricingSerialNo || "Generated");
      
      alert(`✅ Pricing panel saved successfully!\nPricing Serial No: ${data.data?.pricingSerialNo}`);
      
      resetForm();
      
    } catch (error) {
      console.error('Error saving pricing panel:', error);
      setSaveError(error.message || 'Failed to save pricing panel');
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setHeader({
      pricingSerialNo: "",
      branch: "",
      branchName: "",
      branchCode: "",
      subCompanyId: "",
      subCompanyName: "",
      subCompanyCode: "",
      delivery: "Normal",
      date: new Date().toISOString().split('T')[0],
      partyName: "",
      customerId: ""
    });
    
    setBilling({
      billingType: "Multi - Order",
      loadingPoints: "",
      dropPoints: "",
      collectionCharges: 0,
      cancellationCharges: "Nil",
      loadingCharges: "Nil",
      otherCharges: 0,
    });
    
    setOrders([defaultOrderRow(), defaultOrderRow()]);
    
    setRateApproval({
      approvalType: "Contract Rates",
      uploadFile: null,
      uploadFileName: "",
      approvalStatus: "Pending",
    });
    
    setSelectedCustomer(null);
    setSelectedVehicleNegotiation(null);
    
    setSaveSuccess(false);
    setSaveError(null);
    setPricingSerialNo("");
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const billingColumns = [
    { key: "billingType", label: "Billing Type", options: BILLING_TYPES },
    { key: "loadingPoints", label: "No. of Loading Points", type: "number" },
    { key: "dropPoints", label: "No. of Droping Point", type: "number" },
  ];

  const isHeaderReadOnly = !!selectedVehicleNegotiation;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-full px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-lg font-extrabold text-slate-900">
              Pricing Panel
            </div>
            {saveSuccess && (
              <div className="text-sm text-green-600 font-medium">
                ✅ Pricing panel saved successfully! PSN: {pricingSerialNo}
              </div>
            )}
            {saveError && (
              <div className="text-sm text-red-600 font-medium">
                ❌ {saveError}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAll}
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
                  Saving...
                </span>
              ) : 'Save All'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-full p-4 space-y-4">
        <Card title="Pricing Panel - Part -1">
          <div className="grid grid-cols-12 gap-3 mb-4">
            <div className="col-span-12 md:col-span-3">
              <label className="text-xs font-bold text-slate-600">Pricing Serial No</label>
              <div className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                {pricingSerialNo || "Auto-generated on save"}
              </div>
            </div>

            <div className="col-span-12 md:col-span-3 relative">
              <label className="text-xs font-bold text-slate-600">Search Vehicle Negotiation</label>
              <VehicleNegotiationHeaderDropdown
                onSelect={handleSelectVehicleNegotiation}
                placeholder="Search by VNN..."
              />
              {selectedVehicleNegotiation && (
                <div className="text-xs text-slate-500 mt-1">
                  Selected: {selectedVehicleNegotiation.vnnNo}
                </div>
              )}
            </div>
            
            <div className="col-span-12 md:col-span-3">
              <label className="text-xs font-bold text-slate-600">Branch *</label>
              <SearchableDropdown
                items={branches}
                selectedId={header.branch}
                onSelect={(branch) => setHeader(p => ({ 
                  ...p, 
                  branch: branch?._id || '',
                  branchName: branch?.name || '',
                  branchCode: branch?.code || ''
                }))}
                placeholder="Search branch... *"
                required={true}
                displayField="name"
                codeField="code"
                readOnly={isHeaderReadOnly}
              />
            </div>

            {/* Sub-Company Dropdown */}
            <div className="col-span-12 md:col-span-3">
              <label className="text-xs font-bold text-slate-600">Sub-Company</label>
              {isHeaderReadOnly ? (
                <div className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {header.subCompanyName || '-'}
                  {header.subCompanyCode && (
                    <span className="text-xs text-gray-500 ml-1">({header.subCompanyCode})</span>
                  )}
                </div>
              ) : (
                <select
                  value={header.subCompanyId || ''}
                  onChange={(e) => {
                    const subCompanyId = e.target.value;
                    const selected = subCompanies.find(sc => sc._id === subCompanyId);
                    setHeader(prev => ({
                      ...prev,
                      subCompanyId: subCompanyId,
                      subCompanyName: selected?.name || '',
                      subCompanyCode: selected?.code || ''
                    }));
                    // Update orders with sub-company
                    setOrders(prevOrders => 
                      prevOrders.map(order => ({
                        ...order,
                        subCompanyId: subCompanyId,
                        subCompanyName: selected?.name || '',
                        subCompanyCode: selected?.code || ''
                      }))
                    );
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                >
                  <option value="">Select Sub-Company</option>
                  {subCompanies.map((sc) => (
                    <option key={sc._id} value={sc._id}>
                      {sc.name} ({sc.code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <Select
              col="col-span-12 md:col-span-3"
              label="Delivery"
              value={header.delivery}
              onChange={(v) => setHeader((p) => ({ ...p, delivery: v }))}
              options={DELIVERY_TYPES}
              readOnly={isHeaderReadOnly}
            />

            <Input
              type="date"
              col="col-span-12 md:col-span-3"
              label="Date"
              value={header.date}
              onChange={(v) => setHeader((p) => ({ ...p, date: v }))}
              readOnly={isHeaderReadOnly}
            />
          </div>

          <div className="mb-4">
            <div className="text-sm font-bold text-slate-700 mb-2">Billing Type / Charges</div>
            <div className="overflow-auto rounded-xl border border-yellow-300">
              <table className="min-w-full w-full text-sm">
                <thead className="sticky top-0 bg-yellow-400">
                  <tr>
                    {billingColumns.map((col) => (
                      <th
                        key={col.key}
                        className="border border-yellow-500 px-4 py-3 text-xs font-extrabold text-slate-900 text-center"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-yellow-50 even:bg-slate-50">
                    {billingColumns.map((col) => (
                      <td key={col.key} className="border border-yellow-300 px-2 py-2">
                        {col.options ? (
                          <select
                            value={billing[col.key] || ""}
                            onChange={(e) => {
                              if (col.key === "billingType") {
                                handleBillingTypeChange(e.target.value);
                              } else {
                                setBilling(prev => ({ ...prev, [col.key]: e.target.value }));
                              }
                            }}
                            disabled={col.key !== "billingType" && selectedVehicleNegotiation}
                            className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
                              (col.key !== "billingType" && selectedVehicleNegotiation) ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                            }`}
                          >
                            <option value="">Select {col.label}</option>
                            {col.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={col.type || "text"}
                            step={col.type === "number" ? "1" : undefined}
                            value={billing[col.key] || ""}
                            onChange={(e) => setBilling(prev => ({ ...prev, [col.key]: e.target.value }))}
                            readOnly={selectedVehicleNegotiation}
                            className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
                              selectedVehicleNegotiation ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                            }`}
                            placeholder={`Enter ${col.label}`}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-slate-700">
                Orders - {billing.billingType} - {orders.length} row{orders.length !== 1 ? 's' : ''}
              </div>
              
              {billing.billingType === "Multi - Order" && !selectedVehicleNegotiation && (
                <button
                  onClick={addOrder}
                  className="rounded-xl bg-yellow-600 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-700"
                >
                  + Add Row
                </button>
              )}
            </div>
            
            <OrdersTable
              rows={orders}
              onChange={updateOrder}
              onRemove={removeOrder}
              billingType={billing.billingType}
              selectedVehicleNegotiation={selectedVehicleNegotiation}
              locations={locations}
              rateMasters={rateMasterSearch.rateMasters}
              headerBranch={header.branch}
              headerCustomerId={header.customerId}
              headerSubCompanyId={header.subCompanyId}
              headerSubCompanyName={header.subCompanyName}
              headerSubCompanyCode={header.subCompanyCode}
            />
          </div>

          <div className="flex justify-end gap-4 mt-4">
            <div className="flex items-center gap-3 border border-yellow-300 px-6 py-3 bg-yellow-50 rounded-xl">
              <div className="text-sm font-extrabold text-slate-900">Total Weight:</div>
              <div className="text-xl font-extrabold text-emerald-700">{totalWeight}</div>
            </div>
            <div className="flex items-center gap-3 border border-yellow-300 px-6 py-3 bg-yellow-50 rounded-xl">
              <div className="text-sm font-extrabold text-slate-900">Total Amount:</div>
              <div className="text-xl font-extrabold text-emerald-700">{totalAmount}</div>
            </div>
          </div>
        </Card>

        <Card title="Rate - Approval - Part - 2 (Read Only)">
          <div className="grid grid-cols-12 gap-4">
            <Select
              col="col-span-12 md:col-span-4"
              label="Rate Approval Type"
              value={rateApproval.approvalType}
              onChange={(v) => setRateApproval((p) => ({ ...p, approvalType: v }))}
              options={RATE_APPROVAL_TYPES}
              readOnly={true}
            />

            <div className="col-span-12 md:col-span-4">
              <label className="text-xs font-bold text-slate-600">Rate Approval Upload</label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                disabled={true}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none cursor-not-allowed"
              />
              {rateApproval.uploadFileName && (
                <div className="mt-1 text-xs text-green-600">
                  ✅ File: {rateApproval.uploadFileName}
                </div>
              )}
            </div>

            <Select
              col="col-span-12 md:col-span-4"
              label="Approval Status"
              value={rateApproval.approvalStatus}
              onChange={(v) => setRateApproval((p) => ({ ...p, approvalStatus: v }))}
              options={APPROVAL_STATUS}
              readOnly={true}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}