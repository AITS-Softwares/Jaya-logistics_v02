

// "use client";

// import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
// import { useRouter } from "next/navigation";

// /** =========================
//  * CONSTANTS
//  ========================= */
// const PACK_TYPES = [
//   { key: "PALLETIZATION", label: "Palletization" },
//   { key: "UNIFORM - BAGS/BOXES", label: "Uniform - Bags/Boxes" },
//   { key: "LOOSE - CARGO", label: "Loose - Cargo" },
//   { key: "NON-UNIFORM - GENERAL CARGO", label: "Non-uniform - General Cargo" },
// ];

// const ORDER_TYPES = ["Sales", "STO Order", "Export", "Import"];
// const STATUSES = ["Open", "Hold", "Cancelled"];
// const DELIVERY_OPTIONS = ["Urgent", "Normal", "Express", "Scheduled"];

// function uid() {
//   return Math.random().toString(36).slice(2, 10);
// }

// function num(v) {
//   const n = Number(v);
//   return Number.isFinite(n) ? n : 0;
// }

// /** =========================
//  * DEFAULT EMPTY ROWS
//  ========================= */
// function defaultRow(packType) {
//   if (packType === "PALLETIZATION") {
//     return {
//       _id: uid(),
//       packType: "PALLETIZATION",
//       noOfPallets: "",
//       unitPerPallets: "",
//       totalPkgs: "",
//       pkgsType: "",
//       uom: "MT",
//       skuSize: "",
//       packWeight: "",
//       productName: "",
//       wtLtr: "",
//       actualWt: "",
//       chargedWt: "",
//       wtUom: "MT",
//       isUniform: false,
//     };
//   }

//   if (packType === "UNIFORM - BAGS/BOXES") {
//     return {
//       _id: uid(),
//       packType: "UNIFORM - BAGS/BOXES",
//       totalPkgs: "",
//       pkgsType: "",
//       uom: "",
//       skuSize: "",
//       packWeight: "",
//       productName: "",
//       wtLtr: "",
//       actualWt: "",
//       chargedWt: "",
//       wtUom: "MT",
//     };
//   }

//   if (packType === "LOOSE - CARGO") {
//     return {
//       _id: uid(),
//       packType: "LOOSE - CARGO",
//       uom: "MT",
//       productName: "",
//       actualWt: "",
//       chargedWt: "",
//     };
//   }

//   // NON-UNIFORM - GENERAL CARGO
//   return {
//     _id: uid(),
//     packType: "NON-UNIFORM - GENERAL CARGO",
//     nos: "",
//     productName: "",
//     uom: "MT",
//     length: "",
//     width: "",
//     height: "",
//     actualWt: "",
//     chargedWt: "",
//   };
// }

// function defaultPlantRow() {
//   return {
//     _id: uid(),
//     plantCode: "",
//     plantName: "",
//     plantCodeValue: "",
//     orderType: "",
//     pinCode: "",
//     from: null,
//     fromName: "",
//     fromState: "",
//     to: null,
//     toName: "",
//     taluka: "",
//     talukaName: "",
//     district: "",
//     districtName: "",
//     state: "",
//     stateName: "",
//     country: "",
//     countryName: "",
//     weight: "",
//     status: "",
//     collectionCharges: "",
//     cancellationCharges: "",
//     loadingCharges: "",
//     otherCharges: "",
//     localStatus: "unknown", 
//     localStatusLabel: "Unknown" 
//   };
// }

// /** =========================
//  * Customer Search Hook
//  ========================= */
// function useCustomerSearch() {
//   const [customers, setCustomers] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const searchCustomers = async (query = "") => {
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

// /** =========================
//  * External Pincode API Hook with Multiple Cities Support
//  ========================= */
// function useExternalPincodeAPI() {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [pincodeData, setPincodeData] = useState(null);
//   const [multipleCities, setMultipleCities] = useState([]);

//   const fetchPincodeDetails = async (pincode) => {
//     if (!pincode || pincode.length !== 6) {
//       return null;
//     }

//     setLoading(true);
//     setError(null);
//     setMultipleCities([]);
    
//     try {
//       const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
//       const data = await response.json();
      
//       if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
//         const postOffices = data[0].PostOffice;
        
//         const uniqueLocations = [];
//         const seen = new Set();
        
//         postOffices.forEach(po => {
//           const cityName = po.Name;
//           const key = `${po.Name}-${po.District}-${po.State}`;
          
//           if (!seen.has(key)) {
//             seen.add(key);
//             uniqueLocations.push({
//               taluka: po.Block || po.Taluk || po.District,
//               talukaName: po.Block || po.Taluk || po.District,
//               district: po.District,
//               districtName: po.District,
//               state: po.State,
//               stateName: po.State,
//               country: po.Country,
//               countryName: po.Country,
//               city: cityName,
//               cityName: cityName,
//               pincode: pincode,
//               postOffice: po.Name,
//               block: po.Block,
//               division: po.Division
//             });
//           }
//         });
        
//         if (uniqueLocations.length > 1) {
//           setMultipleCities(uniqueLocations);
//         }
        
//         const firstLocation = uniqueLocations[0];
//         const result = {
//           taluka: firstLocation.taluka,
//           talukaName: firstLocation.talukaName,
//           district: firstLocation.district,
//           districtName: firstLocation.districtName,
//           state: firstLocation.state,
//           stateName: firstLocation.stateName,
//           country: firstLocation.country,
//           countryName: firstLocation.countryName,
//           city: firstLocation.city,
//           cityName: firstLocation.cityName,
//           pincode: pincode,
//           hasMultiple: uniqueLocations.length > 1,
//           allLocations: uniqueLocations
//         };
        
//         setPincodeData(result);
//         return result;
//       } else {
//         setError('Invalid pincode or no data found');
//         return null;
//       }
//     } catch (err) {
//       console.error('Error fetching pincode details:', err);
//       setError('Failed to fetch pincode details');
//       return null;
//     } finally {
//       setLoading(false);
//     }
//   };

//   return { loading, error, pincodeData, multipleCities, fetchPincodeDetails };
// }

// // ✅ Enter Key Navigation Helper
// const handleKeyDown = (e, nextFieldRef) => {
//   if (e.key === 'Enter') {
//     e.preventDefault();
//     if (nextFieldRef && nextFieldRef.current) {
//       nextFieldRef.current.focus();
//     }
//   }
// };

// export default function CreateOrderPanel() {
//   const router = useRouter();

//   // ✅ Refs for Enter key navigation
//   const branchRef = useRef(null);
//   const deliveryRef = useRef(null);
//   const dateRef = useRef(null);
//   const partyNameRef = useRef(null);
//   const plantCodeRefs = useRef({});
//   const plantNameRefs = useRef({});
//   const orderTypeRefs = useRef({});
//   const pinCodeRefs = useRef({});
//   const fromRefs = useRef({});
//   const toRefs = useRef({});
//   const weightRefs = useRef({});
//   const statusRefs = useRef({});
//   const collectionChargesRefs = useRef({});
//   const cancellationChargesRefs = useRef({});
//   const loadingChargesRefs = useRef({});
//   const otherChargesRefs = useRef({});

//   /** =========================
//    * STATE FOR API DATA
//    ========================= */
//   const [branches, setBranches] = useState([]);
//   const [subCompanies, setSubCompanies] = useState([]);
//   const [countries, setCountries] = useState([]);
//   const [states, setStates] = useState([]);
//   const [districts, setDistricts] = useState([]);
//   const [plants, setPlants] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [saveError, setSaveError] = useState(null);
//   const [saveSuccess, setSaveSuccess] = useState(false);
//   const [orderNumber, setOrderNumber] = useState("");
//   const [locations, setLocations] = useState([]);
//   const [pkgTypes, setPkgTypes] = useState([]);
//   const [uoms, setUoms] = useState([]);
//   const [skuSizes, setSkuSizes] = useState([]);
  
//   /** =========================
//    * CUSTOMER SEARCH STATE
//    ========================= */
//   const [customerSearchQuery, setCustomerSearchQuery] = useState("");
//   const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
//   const [selectedCustomer, setSelectedCustomer] = useState(null);
//   const [filteredCustomers, setFilteredCustomers] = useState([]);
//   const customerSearch = useCustomerSearch();

//   /** =========================
//    * PINCODE API STATE
//    ========================= */
//   const pincodeAPI = useExternalPincodeAPI();
//   const [pincodeInput, setPincodeInput] = useState({});
//   const [showCityDropdown, setShowCityDropdown] = useState({});
//   const [cityOptionsByRow, setCityOptionsByRow] = useState({});
//   const [items, setItems] = useState([]);
//   const [showProductDropdown, setShowProductDropdown] = useState({});

//   const fetchItems = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/items', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) {
//         setItems(data.data);
//       } else {
//         setItems([]);
//       }
//     } catch (error) {
//       console.error('Error fetching items:', error.message);
//       setItems([]);
//     }
//   };

//   /** =========================
//    * CHARGES VISIBILITY STATE
//    ========================= */
//   const [showCharges, setShowCharges] = useState(false);

//   const fetchLocations = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/locations', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) {
//         setLocations(data.data);
//       } else {
//         setLocations([]);
//       }
//     } catch (error) {
//       console.error('Error fetching locations:', error.message);
//       setLocations([]);
//     }
//   };

//   const fetchPkgTypes = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/pkg-types', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) {
//         setPkgTypes(data.data);
//       } else {
//         setPkgTypes([]);
//       }
//     } catch (error) {
//       console.error('Error fetching PKG types:', error.message);
//       setPkgTypes([]);
//     }
//   };

//   const fetchUOMs = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/uoms', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) {
//         setUoms(data.data);
//       } else {
//         setUoms([]);
//       }
//     } catch (error) {
//       console.error('Error fetching UOMs:', error.message);
//       setUoms([]);
//     }
//   };

//   const fetchSKUSizes = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/sku-sizes', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) {
//         setSkuSizes(data.data);
//       } else {
//         setSkuSizes([]);
//       }
//     } catch (error) {
//       console.error('Error fetching SKU sizes:', error.message);
//       setSkuSizes([]);
//     }
//   };

//   /** =========================
//    * HEADER - EMPTY INITIAL STATE
//    ========================= */
//   const [top, setTop] = useState({
//     orderNo: "",
//     branch: "",
//     branchName: "",
//     branchCode: "",
//     subCompanyId: "",
//     subCompanyName: "",
//     subCompanyCode: "",
//     delivery: "Normal",
//     date: new Date().toISOString().split('T')[0],
//     partyName: "",
//     collectionCharges: "",
//     cancellationCharges: "",
//     loadingCharges: "",
//     otherCharges: "",
//     customerId: "",
//     customerCode: "",
//     customerName: "",
//     contactPerson: "",
//   });

//   /** =========================
//    * PLANT GRID TABLE DATA
//    ========================= */
//   const [plantRows, setPlantRows] = useState([defaultPlantRow()]);

//   /** =========================
//    * PACK DATA - Single array for all pack types
//    ========================= */
//   const [activePack, setActivePack] = useState("PALLETIZATION");
//   const [packRows, setPackRows] = useState([
//     { ...defaultRow("PALLETIZATION"), packType: "PALLETIZATION" }
//   ]);

//   /** =========================
//    * FETCH DATA FROM APIs
//    ========================= */
//   useEffect(() => {
//     fetchBranches();
//     fetchSubCompanies();
//     fetchCountries();
//     fetchPlants();
//     fetchLocations();
//     fetchPkgTypes();
//     fetchUOMs();
//     fetchSKUSizes();
//     fetchItems(); 
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
//       } else {
//         setBranches([]);
//       }
//     } catch (error) {
//       console.error('Error fetching branches:', error.message);
//       setBranches([]);
//     }
//   };

//   const fetchSubCompanies = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/subcompanies', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) {
//         setSubCompanies(data.data);
//       } else {
//         setSubCompanies([]);
//       }
//     } catch (error) {
//       console.error('Error fetching sub-companies:', error.message);
//       setSubCompanies([]);
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
//       } else {
//         setCountries([]);
//       }
//     } catch (error) {
//       console.error('Error fetching countries:', error.message);
//       setCountries([]);
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
//       } else {
//         setPlants([]);
//       }
//     } catch (error) {
//       console.error('Error fetching plants:', error.message);
//       setPlants([]);
//     }
//   };

//   /** =========================
//    * CUSTOMER SEARCH FUNCTIONS
//    ========================= */
//   const handleCustomerSearch = (query) => {
//     setCustomerSearchQuery(query);
    
//     if (query.trim() === "") {
//       setFilteredCustomers(customerSearch.customers);
//     } else {
//       const filtered = customerSearch.customers.filter(customer =>
//         customer.customerName.toLowerCase().includes(query.toLowerCase()) ||
//         customer.customerCode.toLowerCase().includes(query.toLowerCase()) ||
//         (customer.contactPersonName && customer.contactPersonName.toLowerCase().includes(query.toLowerCase()))
//       );
//       setFilteredCustomers(filtered);
//     }
    
//     if (selectedCustomer && query !== selectedCustomer.customerName) {
//       setSelectedCustomer(null);
//       setTop(prev => ({
//         ...prev,
//         customerId: "",
//         customerCode: "",
//         customerName: "",
//         contactPerson: "",
//         partyName: ""
//       }));
//     }
//   };

//   const handleSelectCustomer = (customer) => {
//     setSelectedCustomer(customer);
//     setCustomerSearchQuery(customer.customerName);
//     setShowCustomerDropdown(false);
    
//     setTop(prev => ({
//       ...prev,
//       customerId: customer._id,
//       customerCode: customer.customerCode,
//       customerName: customer.customerName,
//       contactPerson: customer.contactPersonName || "",
//       partyName: customer.customerName
//     }));
//   };

//   const handleCustomerInputFocus = async () => {
//     if (!showCustomerDropdown) {
//       if (customerSearch.customers.length === 0) {
//         await customerSearch.searchCustomers("");
//       }
//       setFilteredCustomers(customerSearch.customers);
//       setShowCustomerDropdown(true);
//     }
//   };

//   const handleCustomerInputBlur = () => {
//     setTimeout(() => {
//       setShowCustomerDropdown(false);
//     }, 200);
//   };

//   useEffect(() => {
//     if (customerSearch.customers.length > 0) {
//       setFilteredCustomers(customerSearch.customers);
//     }
//   }, [customerSearch.customers]);

//   /** =========================
//    * BRANCH SELECTION
//    ========================= */
//   const handleBranchSelect = (branch) => {
//     if (branch) {
//       setTop(prev => ({
//         ...prev,
//         branch: branch._id,
//         branchName: branch.name,
//         branchCode: branch.code || ''
//       }));
//     } else {
//       setTop(prev => ({
//         ...prev,
//         branch: "",
//         branchName: "",
//         branchCode: ""
//       }));
//     }
//   };

//   /** =========================
//    * PLANT SELECTION
//    ========================= */
//   const handlePlantChange = (rowId, plantId) => {
//     const selectedPlant = plants.find(p => p._id === plantId);
//     if (selectedPlant) {
//       updatePlantRow(rowId, 'plantCode', plantId);
//       updatePlantRow(rowId, 'plantName', selectedPlant.name);
//       updatePlantRow(rowId, 'plantCodeValue', selectedPlant.code);
//     } else {
//       updatePlantRow(rowId, 'plantCode', '');
//       updatePlantRow(rowId, 'plantName', '');
//       updatePlantRow(rowId, 'plantCodeValue', '');
//     }
//   };

//   /** =========================
//    * PINCODE API INTEGRATION with Multiple Cities Support
//    ========================= */
//   const handlePincodeChange = async (rowId, pincode) => {
//     updatePlantRow(rowId, 'pinCode', pincode);
//     setPincodeInput(prev => ({ ...prev, [rowId]: pincode }));
    
//     if (pincode && pincode.length === 6) {
//       const result = await pincodeAPI.fetchPincodeDetails(pincode);
      
//       if (result) {
//         if (result.hasMultiple && result.allLocations && result.allLocations.length > 0) {
//           setCityOptionsByRow(prev => ({ 
//             ...prev, 
//             [rowId]: result.allLocations 
//           }));
//         } else {
//           setCityOptionsByRow(prev => ({ ...prev, [rowId]: [] }));
//           updatePlantRow(rowId, 'taluka', result.taluka);
//           updatePlantRow(rowId, 'talukaName', result.talukaName);
//           updatePlantRow(rowId, 'district', result.district);
//           updatePlantRow(rowId, 'districtName', result.districtName);
//           updatePlantRow(rowId, 'state', result.state);
//           updatePlantRow(rowId, 'stateName', result.stateName);
//           updatePlantRow(rowId, 'country', result.country);
//           updatePlantRow(rowId, 'countryName', result.countryName);
//           updatePlantRow(rowId, 'toName', result.cityName);
//           updatePlantRow(rowId, 'to', null);
//           updateLocalStatus(rowId);
//         }
//       }
//     } else {
//       setCityOptionsByRow(prev => ({ ...prev, [rowId]: [] }));
//     }
//   };

//   const handleSelectCity = (rowId, location) => {
//     updatePlantRow(rowId, 'taluka', location.taluka);
//     updatePlantRow(rowId, 'talukaName', location.talukaName);
//     updatePlantRow(rowId, 'district', location.district);
//     updatePlantRow(rowId, 'districtName', location.districtName);
//     updatePlantRow(rowId, 'state', location.state);
//     updatePlantRow(rowId, 'stateName', location.stateName);
//     updatePlantRow(rowId, 'country', location.country);
//     updatePlantRow(rowId, 'countryName', location.countryName);
//     updatePlantRow(rowId, 'toName', location.cityName);
//     updatePlantRow(rowId, 'to', null);
//     setShowCityDropdown(prev => ({ ...prev, [rowId]: false }));
//     updateLocalStatus(rowId);
//   };

//   const updateLocalStatus = (rowId) => {
//     const row = plantRows.find(r => r._id === rowId);
//     if (row) {
//       const fromState = row.fromState?.trim().toUpperCase() || '';
//       const toState = row.stateName?.trim().toUpperCase() || '';
      
//       if (!fromState || !toState) {
//         updatePlantRow(rowId, 'localStatus', 'unknown');
//         updatePlantRow(rowId, 'localStatusLabel', 'Unknown');
//       } else if (fromState === toState) {
//         updatePlantRow(rowId, 'localStatus', 'local');
//         updatePlantRow(rowId, 'localStatusLabel', 'Local');
//       } else {
//         updatePlantRow(rowId, 'localStatus', 'not-local');
//         updatePlantRow(rowId, 'localStatusLabel', 'Not Local');
//       }
//     }
//   };

//   /** =========================
//    * PLANT ROW FUNCTIONS
//    ========================= */
//   const addPlantRow = () => {
//     setPlantRows((p) => [...p, defaultPlantRow()]);
//     // Focus on the new row's plant code after a short delay
//     setTimeout(() => {
//       const newRowId = plantRows[plantRows.length - 1]?._id;
//       if (newRowId && plantCodeRefs.current[newRowId]) {
//         plantCodeRefs.current[newRowId].focus();
//       }
//     }, 100);
//   };

//   const updatePlantRow = (rowId, key, value) => {
//     setPlantRows((prev) =>
//       prev.map((r) => (r._id === rowId ? { ...r, [key]: value } : r))
//     );
//   };

//   const removePlantRow = (rowId) => {
//     if (plantRows.length > 1) {
//       setPlantRows((prev) => prev.filter((r) => r._id !== rowId));
//     } else {
//       alert("At least one plant row is required");
//     }
//   };

//   // ✅ Focus next field in plant row
//   const focusNextPlantField = (rowId, currentField) => {
//     const rowIndex = plantRows.findIndex(r => r._id === rowId);
//     const fields = ['plantCode', 'orderType', 'pinCode', 'from', 'to', 'weight', 'status'];
//     const currentIndex = fields.indexOf(currentField);
    
//     if (currentIndex !== -1 && currentIndex < fields.length - 1) {
//       const nextField = fields[currentIndex + 1];
//       const nextRef = {
//         plantCode: plantCodeRefs.current[rowId],
//         orderType: orderTypeRefs.current[rowId],
//         pinCode: pinCodeRefs.current[rowId],
//         from: fromRefs.current[rowId],
//         to: toRefs.current[rowId],
//         weight: weightRefs.current[rowId],
//         status: statusRefs.current[rowId]
//       }[nextField];
      
//       if (nextRef) {
//         setTimeout(() => nextRef.focus(), 50);
//       }
//     } else if (currentIndex === fields.length - 1) {
//       // Last field - move to next row's plant code
//       const nextRowIndex = rowIndex + 1;
//       if (nextRowIndex < plantRows.length) {
//         const nextRowId = plantRows[nextRowIndex]._id;
//         if (plantCodeRefs.current[nextRowId]) {
//           setTimeout(() => plantCodeRefs.current[nextRowId].focus(), 50);
//         }
//       }
//     }
//   };

//   /** =========================
//    * PACK DATA FUNCTIONS - Single array
//    ========================= */
  
//   const recalculatePalletizationWeights = (row) => {
//     const updatedRow = { ...row };
    
//     const noOfPallets = num(updatedRow.noOfPallets);
//     const unitPerPallets = num(updatedRow.unitPerPallets);
//     const packWeight = num(updatedRow.packWeight);
//     const uom = (updatedRow.uom || "").toUpperCase().trim();
    
//     let totalPkgs = num(updatedRow.totalPkgs);
    
//     if (noOfPallets > 0 && unitPerPallets > 0) {
//       const calculatedTotalPkgs = noOfPallets * unitPerPallets;
//       totalPkgs = calculatedTotalPkgs;
//       updatedRow.totalPkgs = String(calculatedTotalPkgs);
//     }
    
//     if (totalPkgs > 0 && packWeight > 0) {
//       const isLTR = uom === "LTR" || uom === "L" || uom === "LITRE" || uom === "LITRES";
      
//       if (isLTR) {
//         const wtLtr = totalPkgs * packWeight;
//         updatedRow.wtLtr = wtLtr.toFixed(2);
//         const actualWt = (wtLtr / 1000) * 2;
//         updatedRow.actualWt = actualWt.toFixed(3);
//       } else {
//         const actualWt = (totalPkgs * packWeight) / 1000;
//         updatedRow.actualWt = actualWt.toFixed(3);
//         updatedRow.wtLtr = "";
//       }
//     } else {
//       updatedRow.wtLtr = "";
//       updatedRow.actualWt = "";
//     }
    
//     return updatedRow;
//   };
  
//   const recalculateUniformWeights = (row) => {
//     const updatedRow = { ...row };
    
//     const totalPkgs = num(updatedRow.totalPkgs);
//     const packWeight = num(updatedRow.packWeight);
//     const uom = (updatedRow.uom || "").toUpperCase().trim();
    
//     if (totalPkgs > 0 && packWeight > 0) {
//       const isLTR = uom === "LTR" || uom === "L" || uom === "LITRE" || uom === "LITRES";
      
//       if (isLTR) {
//         const wtLtr = totalPkgs * packWeight;
//         updatedRow.wtLtr = wtLtr.toFixed(2);
//         const actualWt = (wtLtr / 1000) * 2;
//         updatedRow.actualWt = actualWt.toFixed(3);
//       } else {
//         const actualWt = (totalPkgs * packWeight) / 1000;
//         updatedRow.actualWt = actualWt.toFixed(3);
//         updatedRow.wtLtr = "";
//       }
//     } else {
//       updatedRow.wtLtr = "";
//       updatedRow.actualWt = "";
//     }
    
//     return updatedRow;
//   };

//   const updatePackRow = (rowId, key, value) => {
//     setPackRows((prev) =>
//       prev.map((r) => {
//         if (r._id === rowId) {
//           let updatedRow = { ...r, [key]: value };
          
//           if (r.packType === "PALLETIZATION") {
//             updatedRow = recalculatePalletizationWeights(updatedRow);
//           } else if (r.packType === "UNIFORM - BAGS/BOXES") {
//             updatedRow = recalculateUniformWeights(updatedRow);
//           }
          
//           return updatedRow;
//         }
//         return r;
//       })
//     );
//   };
  
//   const addRow = () => {
//     if (packRows.length === 1 && packRows[0].packType === "PALLETIZATION") {
//       setPackRows([
//         { ...defaultRow(activePack), packType: activePack }
//       ]);
//     } else {
//       setPackRows((prev) => [
//         ...prev,
//         { ...defaultRow(activePack), packType: activePack }
//       ]);
//     }
//   };

//   const removeRow = (id) => {
//     if (packRows.length > 1) {
//       setPackRows((prev) => prev.filter((r) => r._id !== id));
//     } else {
//       alert("At least one row is required");
//     }
//   };

//   const duplicateRow = (id) => {
//     const row = packRows.find((r) => r._id === id);
//     if (!row) return;
//     setPackRows((prev) => [
//       ...prev,
//       { ...row, _id: uid() }
//     ]);
//   };

//   /** =========================
//    * SAVE ORDER FUNCTION
//    ========================= */
//   const handleSave = async () => {
//     if (!top.branch) {
//       alert("Please select a branch");
//       return;
//     }
    
//     const hasInvalidPlantRows = plantRows.some(row => !row.plantCode);
//     if (hasInvalidPlantRows) {
//       alert("Please select plant for all plant rows");
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
      
//       // Build packData from packRows
//       const packDataGrouped = {
//         PALLETIZATION: [],
//         'UNIFORM - BAGS/BOXES': [],
//         'LOOSE - CARGO': [],
//         'NON-UNIFORM - GENERAL CARGO': []
//       };
      
//       packRows.forEach(row => {
//         if (row.packType === "PALLETIZATION") {
//           packDataGrouped.PALLETIZATION.push({
//             noOfPallets: num(row.noOfPallets),
//             unitPerPallets: num(row.unitPerPallets),
//             totalPkgs: num(row.totalPkgs),
//             pkgsType: row.pkgsType || "",
//             uom: row.uom || "MT",
//             skuSize: row.skuSize || "",
//             packWeight: num(row.packWeight),
//             productName: row.productName || "",
//             wtLtr: num(row.wtLtr),
//             actualWt: num(row.actualWt),
//             chargedWt: num(row.chargedWt),
//             wtUom: row.wtUom || "MT",
//             isUniform: row.isUniform || false
//           });
//         } else if (row.packType === "UNIFORM - BAGS/BOXES") {
//           packDataGrouped['UNIFORM - BAGS/BOXES'].push({
//             totalPkgs: num(row.totalPkgs),
//             pkgsType: row.pkgsType || "",
//             uom: row.uom || "MT",
//             skuSize: row.skuSize || "",
//             packWeight: num(row.packWeight),
//             productName: row.productName || "",
//             wtLtr: num(row.wtLtr),
//             actualWt: num(row.actualWt),
//             chargedWt: num(row.chargedWt),
//             wtUom: row.wtUom || "MT"
//           });
//         } else if (row.packType === "LOOSE - CARGO") {
//           packDataGrouped['LOOSE - CARGO'].push({
//             uom: row.uom || "MT",
//             productName: row.productName || "",
//             actualWt: num(row.actualWt),
//             chargedWt: num(row.chargedWt)
//           });
//         } else if (row.packType === "NON-UNIFORM - GENERAL CARGO") {
//           packDataGrouped['NON-UNIFORM - GENERAL CARGO'].push({
//             nos: num(row.nos),
//             productName: row.productName || "",
//             uom: row.uom || "MT",
//             length: num(row.length),
//             width: num(row.width),
//             height: num(row.height),
//             actualWt: num(row.actualWt),
//             chargedWt: num(row.chargedWt)
//           });
//         }
//       });
      
//       // Remove empty arrays
//       Object.keys(packDataGrouped).forEach(key => {
//         if (packDataGrouped[key].length === 0) {
//           delete packDataGrouped[key];
//         }
//       });

//       const payload = {
//         branch: top.branch,
//         branchName: top.branchName,
//         branchCode: top.branchCode,
//         subCompanyId: top.subCompanyId || null,
//         subCompanyName: top.subCompanyName || '',
//         subCompanyCode: top.subCompanyCode || '',
//         delivery: top.delivery,
//         date: top.date,
//         customerId: selectedCustomer?._id || null,
//         customerCode: selectedCustomer?.customerCode || '',
//         customerName: selectedCustomer?.customerName || '',
//         contactPerson: selectedCustomer?.contactPersonName || '',
//         partyName: selectedCustomer?.customerName || top.partyName || '',
        
//         plantRows: plantRows.map(row => ({
//           plantCode: row.plantCode || '',
//           plantName: row.plantName || '',
//           plantCodeValue: row.plantCodeValue || '',
//           orderType: row.orderType || "Sales",
//           pinCode: row.pinCode || "",
//           from: row.from || null,
//           fromName: row.fromName || "",
//           fromState: row.fromState || "",
//           to: row.to || null,
//           toName: row.toName || "",
//           taluka: row.taluka || "",
//           talukaName: row.talukaName || "",
//           district: row.district || "",
//           districtName: row.districtName || "",
//           state: row.state || "",
//           stateName: row.stateName || "",
//           country: row.country || "",
//           countryName: row.countryName || "",
//           weight: num(row.weight) || 0,
//           status: row.status || "Open",
//           rate: 0,
//           locationRate: 0,
//           collectionCharges: num(row.collectionCharges) || 0,
//           cancellationCharges: row.cancellationCharges || 'Nil',
//           loadingCharges: row.loadingCharges || 'Nil',
//           otherCharges: num(row.otherCharges) || 0,
//           localStatus: row.localStatus || 'unknown',
//           localStatusLabel: row.localStatusLabel || 'Unknown'
//         })),
        
//         packData: packDataGrouped,
//         branches: branches,
//         plants: plants,
//         countries: countries,
//         states: states,
//         districts: districts
//       };
      
//       const res = await fetch('/api/order-panel', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         throw new Error(data.message || `Failed to save order: ${res.status}`);
//       }

//       setSaveSuccess(true);
//       setOrderNumber(data.data?.orderPanelNo || "Generated");
      
//       const orderPanelNo = data.data?.orderPanelNo || data.data?.orderNo || "Generated";
//       alert(`✅ Order saved successfully!\nOrder Panel Number: ${orderPanelNo}`);
      
//       resetForm();
      
//     } catch (error) {
//       console.error('Error saving order:', error);
//       setSaveError(error.message || 'Failed to save order');
//       alert(`❌ Error: ${error.message}`);
//     } finally {
//       setSaving(false);
//     }
//   };

//   /** =========================
//    * RESET FORM FUNCTION
//    ========================= */
//   const resetForm = () => {
//     setTop({
//       orderNo: "",
//       branch: "",
//       branchName: "",
//       branchCode: "",
//       subCompanyId: "",
//       subCompanyName: "",
//       subCompanyCode: "",
//       delivery: "Normal",
//       date: new Date().toISOString().split('T')[0],
//       partyName: "",
//       collectionCharges: "",
//       cancellationCharges: "",
//       loadingCharges: "",
//       otherCharges: "",
//       customerId: "",
//       customerCode: "",
//       customerName: "",
//       contactPerson: "",
//     });
    
//     setPlantRows([defaultPlantRow()]);
    
//     setPackRows([{ ...defaultRow("PALLETIZATION"), packType: "PALLETIZATION" }]);
    
//     setSelectedCustomer(null);
//     setCustomerSearchQuery("");
//     setFilteredCustomers([]);
//     setPincodeInput({});
//     setShowCityDropdown({});
//     setCityOptionsByRow({});
//     setShowCharges(false);
    
//     setActivePack("PALLETIZATION");
    
//     window.scrollTo({ top: 0, behavior: 'smooth' });
//   };

//   // ✅ Register refs for plant rows
//   useEffect(() => {
//     plantRows.forEach(row => {
//       if (!plantCodeRefs.current[row._id]) {
//         plantCodeRefs.current[row._id] = null;
//       }
//       if (!plantNameRefs.current[row._id]) {
//         plantNameRefs.current[row._id] = null;
//       }
//       if (!orderTypeRefs.current[row._id]) {
//         orderTypeRefs.current[row._id] = null;
//       }
//       if (!pinCodeRefs.current[row._id]) {
//         pinCodeRefs.current[row._id] = null;
//       }
//       if (!fromRefs.current[row._id]) {
//         fromRefs.current[row._id] = null;
//       }
//       if (!toRefs.current[row._id]) {
//         toRefs.current[row._id] = null;
//       }
//       if (!weightRefs.current[row._id]) {
//         weightRefs.current[row._id] = null;
//       }
//       if (!statusRefs.current[row._id]) {
//         statusRefs.current[row._id] = null;
//       }
//     });
//   }, [plantRows]);

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
//       {/* ===== Top Bar ===== */}
//       <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
//         <div className="mx-auto max-w-full px-4 py-3 flex items-center justify-between">
//           <div>
//             <div className="flex items-center gap-3">
//               <button
//                 onClick={() => router.push('/admin/order-panel')}
//                 className="text-sky-600 hover:text-sky-800 font-medium text-sm flex items-center gap-1"
//               >
//                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
//                 </svg>
//                 Back to List
//               </button>
//               <div className="text-lg font-extrabold text-slate-900">
//                 Create New Order Panel
//               </div>
//             </div>
//             {saveSuccess && (
//               <div className="text-sm text-green-600 font-medium">
//                 ✅ Order saved successfully! Order Number: {orderNumber}
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
//               onClick={handleSave}
//               disabled={saving}
//               className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition ${
//                 saving 
//                   ? 'bg-gray-400 cursor-not-allowed' 
//                   : 'bg-emerald-600 hover:bg-emerald-700'
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
//               ) : 'Save Order'}
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* ===== Main Layout ===== */}
//       <div className="mx-auto max-w-full p-4">
//         {/* Header info */}
//         <Card title="Order Details">
//           <div className="grid grid-cols-12 gap-3">
//             <div className="col-span-12 md:col-span-4">
//               <label className="text-xs font-bold text-slate-600">Order No</label>
//               <div className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
//                 {orderNumber || "Auto-generated on save"}
//               </div>
//             </div>
            
//             <div className="col-span-12 md:col-span-4 relative">
//               <label className="text-xs font-bold text-slate-600">Branch *</label>
//               <div className="flex items-center gap-2">
//                 <div className="flex-1">
//                   <SearchableDropdown
//                     items={branches}
//                     selectedId={top.branch}
//                     onSelect={handleBranchSelect}
//                     placeholder="Search branch... *"
//                     required={true}
//                     displayField="name"
//                     codeField="code"
//                   />
//                 </div>
//                 <button
//                   onClick={() => router.push('/admin/branches2')}
//                   className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 transition whitespace-nowrap"
//                   title="Create New Branch"
//                 >
//                   Create
//                 </button>
//               </div>
//             </div>

//             {/* Sub-Company Dropdown */}
//             <div className="col-span-12 md:col-span-4">
//               <label className="text-xs font-bold text-slate-600">Sub-Company</label>
//               <select
//                 value={top.subCompanyId || ''}
//                 onChange={(e) => {
//                   const subCompanyId = e.target.value;
//                   const selected = subCompanies.find(sc => sc._id === subCompanyId);
//                   setTop(prev => ({
//                     ...prev,
//                     subCompanyId: subCompanyId,
//                     subCompanyName: selected?.name || '',
//                     subCompanyCode: selected?.code || ''
//                   }));
//                 }}
//                 className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//               >
//                 <option value="">Select Sub-Company</option>
//                 {subCompanies.map((sc) => (
//                   <option key={sc._id} value={sc._id}>
//                     {sc.name} ({sc.code})
//                   </option>
//                 ))}
//               </select>
//             </div>
            
//             <Select
//               col="col-span-12 md:col-span-4"
//               label="Delivery"
//               value={top.delivery}
//               onChange={(v) => setTop((p) => ({ ...p, delivery: v }))}
//               options={DELIVERY_OPTIONS}
//               ref={deliveryRef}
//               onKeyDown={(e) => handleKeyDown(e, dateRef)}
//             />

//             <Input
//               col="col-span-12 md:col-span-4"
//               type="date"
//               label="Date"
//               value={top.date}
//               onChange={(v) => setTop((p) => ({ ...p, date: v }))}
//               ref={dateRef}
//               onKeyDown={(e) => handleKeyDown(e, partyNameRef)}
//             />
            
//             <div className="col-span-12 md:col-span-8 relative">
//               <label className="text-xs font-bold text-slate-600">Party Name *</label>
//               <div className="flex items-center gap-2">
//                 <div className="flex-1">
//                   <input
//                     ref={partyNameRef}
//                     type="text"
//                     value={selectedCustomer ? selectedCustomer.customerName : customerSearchQuery}
//                     onChange={(e) => handleCustomerSearch(e.target.value)}
//                     onFocus={handleCustomerInputFocus}
//                     onBlur={handleCustomerInputBlur}
//                     className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//                     placeholder="Search customer by name... *"
//                     onKeyDown={(e) => {
//                       if (e.key === 'Enter') {
//                         e.preventDefault();
//                         // Focus first plant code
//                         const firstRowId = plantRows[0]?._id;
//                         if (firstRowId && plantCodeRefs.current[firstRowId]) {
//                           plantCodeRefs.current[firstRowId].focus();
//                         }
//                       }
//                     }}
//                   />
                  
//                   {showCustomerDropdown && (
//                     <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
//                       {customerSearch.loading ? (
//                         <div className="p-3 text-center text-sm text-slate-500">
//                           <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500 mx-auto"></div>
//                           <p className="mt-1">Loading customers...</p>
//                         </div>
//                       ) : filteredCustomers.length > 0 ? (
//                         filteredCustomers.map((customer) => (
//                           <div
//                             key={customer._id}
//                             onMouseDown={() => handleSelectCustomer(customer)}
//                             className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
//                           >
//                             <div className="font-medium text-slate-800">
//                               {customer.customerName}
//                             </div>
//                             <div className="text-xs text-slate-500 mt-1">
//                               Code: {customer.customerCode}
//                               {customer.contactPersonName && ` • Contact: ${customer.contactPersonName}`}
//                             </div>
//                           </div>
//                         ))
//                       ) : (
//                         <div className="p-3 text-center text-sm text-slate-500">
//                           {customerSearchQuery.trim() ? 
//                             `No customers found for "${customerSearchQuery}"` : 
//                             "No customers available"
//                           }
//                         </div>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>
//           </div>
//         </Card>

//         <div className="mt-4">
//           <Card title="Plant Code / Route">
//             <div className="mb-4 flex justify-between items-center">
//               <div className="text-sm text-slate-600">
//                 Manage plant routes and distribution - Enter pincode to auto-fill location fields
//               </div>
//               <div className="flex gap-2">
//                 <button
//                   onClick={() => setShowCharges(!showCharges)}
//                   className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
//                     showCharges 
//                       ? 'bg-blue-600 text-white hover:bg-blue-700' 
//                       : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
//                   }`}
//                 >
//                   {showCharges ? 'Hide Charges' : 'Charges'}
//                 </button>
//                 <button
//                   onClick={addPlantRow}
//                   className="rounded-xl bg-yellow-600 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-700 transition"
//                 >
//                   + Add Row
//                 </button>
//               </div>
//             </div>
//             <PlantGridTable
//               rows={plantRows}
//               onChange={updatePlantRow}
//               onRemove={removePlantRow}
//               onPlantChange={handlePlantChange}
//               onPincodeChange={handlePincodeChange}
//               onSelectCity={handleSelectCity}
//               plants={plants}
//               branches={branches}
//               locations={locations}
//               pincodeAPI={pincodeAPI}
//               pincodeInput={pincodeInput}
//               showCityDropdown={showCityDropdown}
//               setShowCityDropdown={setShowCityDropdown}
//               cityOptionsByRow={cityOptionsByRow}
//               showCharges={showCharges}
//               plantCodeRefs={plantCodeRefs}
//               plantNameRefs={plantNameRefs}
//               orderTypeRefs={orderTypeRefs}
//               pinCodeRefs={pinCodeRefs}
//               fromRefs={fromRefs}
//               toRefs={toRefs}
//               weightRefs={weightRefs}
//               statusRefs={statusRefs}
//               focusNextPlantField={focusNextPlantField}
//             />
//           </Card>
          
//           {/* PACK TYPE SECTIONS - Single table with all rows */}
//           <div className="mt-4">
//             <Card title="Pack Type">
//               {/* Pack Type Selector for adding new rows */}
//               <div className="mb-4 flex justify-between items-center">
//                 <div className="flex items-center gap-3">
//                   <div className="text-sm font-bold text-slate-700">Select Pack Type to Add:</div>
//                   <div className="flex items-center gap-2">
//                     <select
//                       value={activePack}
//                       onChange={(e) => setActivePack(e.target.value)}
//                       className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//                     >
//                       {PACK_TYPES.map((p) => (
//                         <option key={p.key} value={p.key}>
//                           {p.label}
//                         </option>
//                       ))}
//                     </select>
//                     <button
//                       onClick={addRow}
//                       className="rounded-xl bg-yellow-600 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-700 transition whitespace-nowrap"
//                     >
//                       + Add Row
//                     </button>
//                   </div>
//                 </div>
//               </div>
              
//               {/* Single Table showing ALL rows with Pack Type column */}
//               <PackTypeTable
//                 rows={packRows}
//                 onChange={updatePackRow}
//                 onRemove={removeRow}
//                 onDuplicate={duplicateRow}
//                 pkgTypes={pkgTypes}
//                 uoms={uoms}
//                 skuSizes={skuSizes}
//                 items={items}
//                 onNavigateToCreate={() => router.push('/admin/pkg-type?returnUrl=/admin/order-panel/create')}
//                 onNavigateToCreateUOM={() => router.push('/admin/uoms?returnUrl=/admin/order-panel/create')}
//                 onNavigateToCreateSKUSize={() => router.push('/admin/sku-sizes?returnUrl=/admin/order-panel/create')}
//                 onNavigateToCreateItem={() => router.push('/admin/items?returnUrl=/admin/order-panel/create')}
//               />
//             </Card>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// /** =========================
//  * COMPONENTS
//  ========================= */

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

// // ✅ Updated Input with ref forwarding and Enter key support
// const Input = React.forwardRef(({ label, value, onChange, col = "", type = "text", required = false, onKeyDown }, ref) => {
//   return (
//     <div className={col}>
//       <label className="text-xs font-bold text-slate-600">{label}</label>
//       <input
//         ref={ref}
//         type={type}
//         value={value}
//         onChange={(e) => onChange?.(e.target.value)}
//         onKeyDown={onKeyDown}
//         className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//         required={required}
//       />
//     </div>
//   );
// });
// Input.displayName = 'Input';

// // ✅ Updated Select with ref forwarding and Enter key support
// const Select = React.forwardRef(({ label, value, onChange, options = [], col = "", onKeyDown }, ref) => {
//   return (
//     <div className={col}>
//       <label className="text-xs font-bold text-slate-600">{label}</label>
//       <select
//         ref={ref}
//         value={value}
//         onChange={(e) => onChange?.(e.target.value)}
//         onKeyDown={onKeyDown}
//         className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
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
// });
// Select.displayName = 'Select';

// /** =========================
//  * Searchable Dropdown Component
//  ========================= */
// function SearchableDropdown({ 
//   items, 
//   selectedId, 
//   onSelect, 
//   placeholder = "Search...",
//   required = false,
//   displayField = 'name',
//   codeField = 'code',
//   disabled = false
// }) {
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filteredItems, setFilteredItems] = useState([]);
//   const [showDropdown, setShowDropdown] = useState(false);
//   const [selectedItem, setSelectedItem] = useState(null);
//   const dropdownRef = useRef(null);
//   const inputRef = useRef(null);
//   const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

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
//     const display = item[displayField] || "";
//     const code = item[codeField] ? `(${item[codeField]})` : "";
//     return `${display} ${code}`.trim();
//   };

//   const handleSearch = (query) => {
//     setSearchQuery(query);
    
//     if (!query.trim()) {
//       setFilteredItems(items);
//     } else {
//       const filtered = items.filter(item =>
//         (item[displayField] && item[displayField].toLowerCase().includes(query.toLowerCase())) ||
//         (item[codeField] && item[codeField].toLowerCase().includes(query.toLowerCase()))
//       );
//       setFilteredItems(filtered);
//     }
    
//     if (selectedItem && query !== getDisplayValue(selectedItem)) {
//       setSelectedItem(null);
//       onSelect?.(null);
//     }
//   };

//   const handleSelectItem = (item) => {
//     setSelectedItem(item);
//     setSearchQuery(getDisplayValue(item));
//     setShowDropdown(false);
//     onSelect?.(item);
//   };

//   const handleInputFocus = () => {
//     if (!showDropdown) {
//       setFilteredItems(items);
//       setShowDropdown(true);
      
//       if (inputRef.current) {
//         const rect = inputRef.current.getBoundingClientRect();
//         setDropdownPosition({
//           top: rect.bottom + window.scrollY,
//           left: rect.left + window.scrollX,
//           width: rect.width
//         });
//       }
//     }
//   };

//   const handleInputBlur = () => {
//     setTimeout(() => {
//       if (dropdownRef.current && !dropdownRef.current.contains(document.activeElement)) {
//         setShowDropdown(false);
//         if (selectedItem) {
//           setSearchQuery(getDisplayValue(selectedItem));
//         }
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

//   return (
//     <div className="relative" ref={dropdownRef}>
//       <input
//         ref={inputRef}
//         type="text"
//         value={searchQuery}
//         onChange={(e) => handleSearch(e.target.value)}
//         onFocus={handleInputFocus}
//         onBlur={handleInputBlur}
//         className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:opacity-50"
//         placeholder={placeholder}
//         required={required}
//         disabled={disabled}
//         autoComplete="off"
//       />
      
//       {showDropdown && (
//         <div 
//           className="fixed z-[9999] bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
//           style={{
//             top: `${dropdownPosition.top}px`,
//             left: `${dropdownPosition.left}px`,
//             width: `${dropdownPosition.width}px`
//           }}
//         >
//           {filteredItems.length > 0 ? (
//             filteredItems.map((item) => (
//               <div
//                 key={item._id}
//                 onMouseDown={(e) => {
//                   e.preventDefault();
//                   handleSelectItem(item);
//                 }}
//                 className={`p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
//                   selectedItem?._id === item._id ? 'bg-sky-50' : ''
//                 }`}
//               >
//                 <div className="font-medium text-slate-800">
//                   {item[displayField]}
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

// // ============================================================
// // PLANT GRID TABLE COMPONENT (with Enter key support)
// // ============================================================
// function PlantGridTable({ 
//   rows, 
//   onChange, 
//   onRemove, 
//   onPlantChange,
//   onPincodeChange,
//   onSelectCity,
//   plants,
//   branches,
//   locations,
//   pincodeAPI,
//   pincodeInput,
//   showCityDropdown,
//   setShowCityDropdown,
//   cityOptionsByRow,
//   showCharges = false,
//   plantCodeRefs,
//   plantNameRefs,
//   orderTypeRefs,
//   pinCodeRefs,
//   fromRefs,
//   toRefs,
//   weightRefs,
//   statusRefs,
//   focusNextPlantField
// }) {
//   const [cityDropdownPosition, setCityDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
//   const [activeCityRowId, setActiveCityRowId] = useState(null);
//   const inputRefs = useRef({});

//   const handleBranchSelect = (rowId, field, branch) => {
//     if (branch) {
//       onChange(rowId, field, branch._id);
//       if (field === 'from') {
//         onChange(rowId, 'fromName', branch.name);
//         onChange(rowId, 'fromState', branch.state || '');
//         updateLocalStatus(rowId);
//       } else if (field === 'to') {
//         onChange(rowId, 'toName', branch.name);
//       }
//     } else {
//       onChange(rowId, field, null);
//       if (field === 'from') {
//         onChange(rowId, 'fromName', '');
//         onChange(rowId, 'fromState', '');
//         onChange(rowId, 'localStatus', 'unknown');
//         onChange(rowId, 'localStatusLabel', 'Unknown');
//       } else if (field === 'to') {
//         onChange(rowId, 'toName', '');
//       }
//     }
//   };

//   const handleLocationSelect = (rowId, field, location) => {
//     if (location) {
//       onChange(rowId, field, location._id);
//       if (field === 'from') {
//         onChange(rowId, 'fromName', location.name);
//         onChange(rowId, 'fromState', location.state || '');
//         updateLocalStatus(rowId);
//       } else if (field === 'to') {
//         onChange(rowId, 'toName', location.name);
//       }
//     } else {
//       onChange(rowId, field, null);
//       if (field === 'from') {
//         onChange(rowId, 'fromName', '');
//         onChange(rowId, 'fromState', '');
//         onChange(rowId, 'localStatus', 'unknown');
//         onChange(rowId, 'localStatusLabel', 'Unknown');
//       } else if (field === 'to') {
//         onChange(rowId, 'toName', '');
//       }
//     }
//   };

//   const updateLocalStatus = (rowId) => {
//     const row = rows.find(r => r._id === rowId);
//     if (row) {
//       const fromState = row.fromState?.trim().toUpperCase() || '';
//       const toState = row.stateName?.trim().toUpperCase() || '';
      
//       if (!fromState || !toState) {
//         onChange(rowId, 'localStatus', 'unknown');
//         onChange(rowId, 'localStatusLabel', 'Unknown');
//       } else if (fromState === toState) {
//         onChange(rowId, 'localStatus', 'local');
//         onChange(rowId, 'localStatusLabel', 'Local');
//       } else {
//         onChange(rowId, 'localStatus', 'not-local');
//         onChange(rowId, 'localStatusLabel', 'Not Local');
//       }
//     }
//   };

//   const handleCityInputClick = (event, rowId) => {
//     const cityOptions = cityOptionsByRow[rowId];
//     if (cityOptions && cityOptions.length > 0) {
//       const rect = event.target.getBoundingClientRect();
//       setCityDropdownPosition({
//         top: rect.bottom + window.scrollY,
//         left: rect.left + window.scrollX,
//         width: rect.width
//       });
//       setActiveCityRowId(rowId);
//     }
//   };

//   const cols = [
//     { key: "plantCode", label: "Plant Code *", width: "200px" },
//     { key: "plantName", label: "Plant Name", width: "200px" },
//     { key: "orderType", label: "Order Type", width: "150px" },
//     { key: "pinCode", label: "Pin Code", width: "120px" },
//     { key: "from", label: "From", width: "250px" },
//     { key: "to", label: "To / City", width: "220px" },
//     { key: "taluka", label: "Taluka", width: "150px" },
//     { key: "district", label: "District", width: "150px" },
//     { key: "state", label: "State", width: "150px" },
//     { key: "localStatus", label: "Local/Not Local", width: "140px" },
//     { key: "country", label: "Country", width: "150px" },
//     { key: "weight", label: "Weight", width: "100px" },
//     { key: "status", label: "Status", width: "120px" },
//   ];

//   if (showCharges) {
//     cols.push(
//       { key: "collectionCharges", label: "Collection Charges", width: "130px" },
//       { key: "cancellationCharges", label: "Cancellation Charges", width: "140px" },
//       { key: "loadingCharges", label: "Loading Charges", width: "120px" },
//       { key: "otherCharges", label: "Other Charges", width: "120px" }
//     );
//   }

//   // Close dropdown when clicking outside
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (activeCityRowId && !event.target.closest('.city-dropdown-container') && !event.target.closest('.city-input-field')) {
//         setActiveCityRowId(null);
//       }
//     };
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, [activeCityRowId]);

//   // Update dropdown position on scroll
//   useEffect(() => {
//     const handleScroll = () => {
//       if (activeCityRowId && inputRefs.current[activeCityRowId]) {
//         const rect = inputRefs.current[activeCityRowId].getBoundingClientRect();
//         setCityDropdownPosition({
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
//   }, [activeCityRowId]);

//   return (
//     <>
//       <div className="rounded-xl border border-yellow-300 overflow-x-auto">
//         <table className="min-w-max w-full text-sm">
//           <thead className="sticky top-0 bg-yellow-400 z-10">
//             <tr>
//               {cols.map((c) => (
//                 <th
//                   key={c.key}
//                   style={{ minWidth: c.width, width: c.width }}
//                   className="border border-yellow-500 px-3 py-3 text-xs font-extrabold text-slate-900 text-center"
//                 >
//                   {c.label}
//                   {(c.key === "plantName" || c.key === "taluka" || c.key === "district" || c.key === "state" || c.key === "country") && 
//                     <span className="ml-1 text-xs text-blue-600">*Auto</span>
//                   }
//                 </th>
//               ))}
//               <th style={{ minWidth: "100px", width: "100px" }} className="border border-yellow-500 px-3 py-3 text-xs font-extrabold text-slate-900 text-center">
//                 Action
//               </th>
//             </tr>
//           </thead>

//           <tbody>
//             {rows.map((r) => {
//               const isPincodeLoading = pincodeAPI.loading && pincodeInput[r._id]?.length === 6;
//               const cityOptions = cityOptionsByRow[r._id] || [];
//               const hasCities = cityOptions.length > 0;
              
//               return (
//                 <tr key={r._id} className="hover:bg-yellow-50 even:bg-slate-50">
//                   {/* Plant Code */}
//                   <td className="border border-yellow-300 px-2 py-2">
//                     <TableSearchableDropdown
//                       items={plants}
//                       selectedId={r.plantCode}
//                       onSelect={(plant) => {
//                         if (plant) {
//                           onPlantChange(r._id, plant._id);
//                         } else {
//                           onChange(r._id, 'plantCode', '');
//                           onChange(r._id, 'plantName', '');
//                           onChange(r._id, 'plantCodeValue', '');
//                         }
//                       }}
//                       placeholder="Search plant..."
//                       required={true}
//                       displayField="name"
//                       codeField="code"
//                       inputRef={(el) => plantCodeRefs.current[r._id] = el}
//                       onKeyDown={(e) => {
//                         if (e.key === 'Enter') {
//                           e.preventDefault();
//                           focusNextPlantField(r._id, 'plantCode');
//                         }
//                       }}
//                     />
//                   </td>

//                   {/* Plant Name */}
//                   <td className="border border-yellow-300 px-2 py-2">
//                     <input
//                       ref={(el) => plantNameRefs.current[r._id] = el}
//                       type="text"
//                       value={r.plantName || ""}
//                       readOnly
//                       className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm outline-none"
//                       placeholder="Auto-filled"
//                       onKeyDown={(e) => {
//                         if (e.key === 'Enter') {
//                           e.preventDefault();
//                           focusNextPlantField(r._id, 'plantName');
//                         }
//                       }}
//                     />
//                   </td>

//                   {/* Order Type */}
//                   <td className="border border-yellow-300 px-2 py-2">
//                     <select
//                       ref={(el) => orderTypeRefs.current[r._id] = el}
//                       value={r.orderType || ""}
//                       onChange={(e) => onChange(r._id, 'orderType', e.target.value)}
//                       className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//                       onKeyDown={(e) => {
//                         if (e.key === 'Enter') {
//                           e.preventDefault();
//                           focusNextPlantField(r._id, 'orderType');
//                         }
//                       }}
//                     >
//                       <option value="">Select Order Type</option>
//                       {ORDER_TYPES.map((opt) => (
//                         <option key={opt} value={opt}>
//                           {opt}
//                         </option>
//                       ))}
//                     </select>
//                   </td>

//                   {/* Pin Code */}
//                   <td className="border border-yellow-300 px-2 py-2">
//                     <div className="relative">
//                       <input
//                         ref={(el) => pinCodeRefs.current[r._id] = el}
//                         type="text"
//                         value={r.pinCode || ""}
//                         onChange={(e) => onPincodeChange(r._id, e.target.value)}
//                         className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//                         placeholder="Enter 6-digit pincode"
//                         maxLength="6"
//                         onKeyDown={(e) => {
//                           if (e.key === 'Enter') {
//                             e.preventDefault();
//                             focusNextPlantField(r._id, 'pinCode');
//                           }
//                         }}
//                       />
//                       {isPincodeLoading && (
//                         <div className="absolute right-2 top-2">
//                           <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-500"></div>
//                         </div>
//                       )}
//                     </div>
//                     {pincodeAPI.error && r.pinCode?.length === 6 && (
//                       <div className="text-xs text-red-500 mt-1">{pincodeAPI.error}</div>
//                     )}
//                   </td>

//                   {/* From - Now shows Location Master data with State */}
//                   <td className="border border-yellow-300 px-2 py-2">
//                     <div className="flex flex-col gap-1">
//                       <TableSearchableDropdown
//                         items={locations}
//                         selectedId={r.from}
//                         onSelect={(location) => handleLocationSelect(r._id, 'from', location)}
//                         placeholder="Search location..."
//                         displayField="name"
//                         codeField="code"
//                         renderItem={(item) => (
//                           <div>
//                             <div className="font-medium text-slate-800 text-sm">
//                               {item.name}
//                             </div>
//                             <div className="text-xs text-slate-500 mt-0.5">
//                               State: {item.state || 'Unknown'}
//                             </div>
//                           </div>
//                         )}
//                         inputRef={(el) => fromRefs.current[r._id] = el}
//                         onKeyDown={(e) => {
//                           if (e.key === 'Enter') {
//                             e.preventDefault();
//                             focusNextPlantField(r._id, 'from');
//                           }
//                         }}
//                       />
//                       {r.fromState && (
//                         <div className="text-xs text-blue-600 font-medium px-1">
//                           State: {r.fromState}
//                         </div>
//                       )}
//                     </div>
//                   </td>

//                   {/* To / City */}
//                   <td className="border border-yellow-300 px-2 py-2">
//                     <div className="relative city-dropdown-container">
//                       <input
//                         ref={el => {
//                           inputRefs.current[r._id] = el;
//                           toRefs.current[r._id] = el;
//                         }}
//                         type="text"
//                         value={r.toName || ""}
//                         readOnly={hasCities}
//                         onChange={(e) => {
//                           if (!hasCities) {
//                             onChange(r._id, 'toName', e.target.value);
//                             onChange(r._id, 'to', null);
//                           }
//                         }}
//                         onClick={(e) => {
//                           if (hasCities) {
//                             handleCityInputClick(e, r._id);
//                           }
//                         }}
//                         onKeyDown={(e) => {
//                           if (e.key === 'Enter') {
//                             e.preventDefault();
//                             if (hasCities && cityOptions.length > 0) {
//                               // If has cities, trigger dropdown
//                               handleCityInputClick(e, r._id);
//                             } else {
//                               focusNextPlantField(r._id, 'to');
//                             }
//                           }
//                         }}
//                         className={`city-input-field w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
//                           hasCities ? 'cursor-pointer bg-yellow-50 hover:bg-yellow-100' : ''
//                         }`}
//                         placeholder={hasCities ? "Click to select city/area" : "Enter city name"}
//                       />
//                       {hasCities && (
//                         <div className="absolute right-2 top-2 text-gray-400 pointer-events-none">
//                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//                           </svg>
//                         </div>
//                       )}
//                     </div>
//                   </td>

//                   {/* Taluka */}
//                   <td className="border border-yellow-300 px-2 py-2">
//                     <input
//                       type="text"
//                       value={r.talukaName || r.taluka || ""}
//                       readOnly
//                       className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm outline-none"
//                       placeholder="Auto-filled"
//                       onKeyDown={(e) => {
//                         if (e.key === 'Enter') {
//                           e.preventDefault();
//                           focusNextPlantField(r._id, 'taluka');
//                         }
//                       }}
//                     />
//                   </td>

//                   {/* District */}
//                   <td className="border border-yellow-300 px-2 py-2">
//                     <input
//                       type="text"
//                       value={r.districtName || r.district || ""}
//                       readOnly
//                       className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm outline-none"
//                       placeholder="Auto-filled"
//                       onKeyDown={(e) => {
//                         if (e.key === 'Enter') {
//                           e.preventDefault();
//                           focusNextPlantField(r._id, 'district');
//                         }
//                       }}
//                     />
//                   </td>

//                   {/* State */}
//                   <td className="border border-yellow-300 px-2 py-2">
//                     <input
//                       type="text"
//                       value={r.stateName || r.state || ""}
//                       readOnly
//                       className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm outline-none"
//                       placeholder="Auto-filled"
//                       onKeyDown={(e) => {
//                         if (e.key === 'Enter') {
//                           e.preventDefault();
//                           focusNextPlantField(r._id, 'state');
//                         }
//                       }}
//                     />
//                   </td>

//                   {/* Local Status - NEW COLUMN */}
//                   <td className="border border-yellow-300 px-2 py-2 text-center">
//                     {r.fromState && r.stateName ? (
//                       <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
//                         r.fromState.trim().toUpperCase() === r.stateName.trim().toUpperCase()
//                           ? 'bg-green-100 text-green-800 border border-green-300'
//                           : 'bg-red-100 text-red-800 border border-red-300'
//                       }`}>
//                         {r.fromState.trim().toUpperCase() === r.stateName.trim().toUpperCase() ? '✅ Local' : '❌ Not Local'}
//                       </span>
//                     ) : (
//                       <span className="text-xs text-gray-400">-</span>
//                     )}
//                   </td>

//                   {/* Country */}
//                   <td className="border border-yellow-300 px-2 py-2">
//                     <input
//                       type="text"
//                       value={r.countryName || r.country || ""}
//                       readOnly
//                       className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm outline-none"
//                       placeholder="Auto-filled"
//                       onKeyDown={(e) => {
//                         if (e.key === 'Enter') {
//                           e.preventDefault();
//                           focusNextPlantField(r._id, 'country');
//                         }
//                       }}
//                     />
//                   </td>

//                   {/* Weight */}
//                   <td className="border border-yellow-300 px-2 py-2">
//                     <input
//                       ref={(el) => weightRefs.current[r._id] = el}
//                       type="number"
//                       value={r.weight || ""}
//                       onChange={(e) => onChange(r._id, 'weight', e.target.value)}
//                       className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//                       placeholder="Weight"
//                       onKeyDown={(e) => {
//                         if (e.key === 'Enter') {
//                           e.preventDefault();
//                           focusNextPlantField(r._id, 'weight');
//                         }
//                       }}
//                     />
//                   </td>

//                   {/* Status */}
//                   <td className="border border-yellow-300 px-2 py-2">
//                     <select
//                       ref={(el) => statusRefs.current[r._id] = el}
//                       value={r.status || ""}
//                       onChange={(e) => onChange(r._id, 'status', e.target.value)}
//                       className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//                       onKeyDown={(e) => {
//                         if (e.key === 'Enter') {
//                           e.preventDefault();
//                           focusNextPlantField(r._id, 'status');
//                         }
//                       }}
//                     >
//                       <option value="">Select Status</option>
//                       {STATUSES.map((opt) => (
//                         <option key={opt} value={opt}>
//                           {opt}
//                         </option>
//                       ))}
//                     </select>
//                   </td>

//                   {/* Charges Columns */}
//                   {showCharges && (
//                     <>
//                       <td className="border border-yellow-300 px-2 py-2">
//                         <input
//                           type="number"
//                           value={r.collectionCharges || ""}
//                           onChange={(e) => onChange(r._id, 'collectionCharges', e.target.value)}
//                           className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//                           placeholder="Collection Charges"
//                         />
//                       </td>
//                       <td className="border border-yellow-300 px-2 py-2">
//                         <input
//                           type="text"
//                           value={r.cancellationCharges || ""}
//                           onChange={(e) => onChange(r._id, 'cancellationCharges', e.target.value)}
//                           className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//                           placeholder="Cancellation Charges"
//                         />
//                       </td>
//                       <td className="border border-yellow-300 px-2 py-2">
//                         <input
//                           type="text"
//                           value={r.loadingCharges || ""}
//                           onChange={(e) => onChange(r._id, 'loadingCharges', e.target.value)}
//                           className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//                           placeholder="Loading Charges"
//                         />
//                       </td>
//                       <td className="border border-yellow-300 px-2 py-2">
//                         <input
//                           type="number"
//                           value={r.otherCharges || ""}
//                           onChange={(e) => onChange(r._id, 'otherCharges', e.target.value)}
//                           className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//                           placeholder="Other Charges"
//                         />
//                       </td>
//                     </>
//                   )}

//                   {/* Action */}
//                   <td className="border border-yellow-300 px-2 py-2 text-center">
//                     <button
//                       onClick={() => onRemove(r._id)}
//                       className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-600 transition whitespace-nowrap"
//                     >
//                       Remove
//                     </button>
//                   </td>
//                 </tr>
//               );
//             })}
            
//             {rows.length === 0 && (
//               <tr>
//                 <td colSpan={cols.length + 1} className="border border-yellow-300 px-4 py-8 text-center text-slate-400">
//                   No plant routes added. Click "+ Add Row" to add a new route.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* City Dropdown - Portal style positioning */}
//       {activeCityRowId && cityOptionsByRow[activeCityRowId] && cityOptionsByRow[activeCityRowId].length > 0 && (
//         <div 
//           className="fixed z-[99999] bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto"
//           style={{
//             position: 'fixed',
//             top: `${cityDropdownPosition.top}px`,
//             left: `${cityDropdownPosition.left}px`,
//             width: `${cityDropdownPosition.width}px`,
//             maxHeight: '300px',
//             minWidth: '200px'
//           }}
//         >
//           <div className="sticky top-0 bg-gray-50 px-3 py-2 text-xs font-semibold text-slate-600 border-b">
//             Select Area/City
//           </div>
//           {cityOptionsByRow[activeCityRowId].map((loc, idx) => (
//             <div
//               key={idx}
//               onMouseDown={(e) => {
//                 e.preventDefault();
//                 e.stopPropagation();
//                 onSelectCity(activeCityRowId, loc);
//                 setActiveCityRowId(null);
//               }}
//               className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
//             >
//               <div className="font-medium text-slate-800 text-sm">
//                 {loc.cityName}
//               </div>
//               <div className="text-xs text-slate-500 mt-0.5">
//                 {loc.districtName}, {loc.stateName}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </>
//   );
// }

// /** =========================
//  * Table Searchable Dropdown Component
//  ========================= */
// function TableSearchableDropdown({ 
//   items, 
//   selectedId, 
//   onSelect, 
//   placeholder = "Search...",
//   required = false,
//   displayField = 'name',
//   codeField = 'code',
//   disabled = false,
//   loading = false,
//   renderItem = null,
//   inputRef,
//   onKeyDown
// }) {
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filteredItems, setFilteredItems] = useState([]);
//   const [showDropdown, setShowDropdown] = useState(false);
//   const [selectedItem, setSelectedItem] = useState(null);
//   const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, direction: 'down' });
//   const ref = useRef(null);
//   const dropdownRef = useRef(null);

//   const getDisplayValue = useCallback((item) => {
//     if (!item) return "";
//     const display = item[displayField] || "";
//     const code = item[codeField] ? `(${item[codeField]})` : "";
//     return `${display} ${code}`.trim();
//   }, [displayField, codeField]);

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
//   }, [items, selectedId, getDisplayValue]);

//   const handleSearch = (query) => {
//     setSearchQuery(query);
    
//     if (!query.trim()) {
//       setFilteredItems(items);
//     } else {
//       const filtered = items.filter(item => {
//         const searchLower = query.toLowerCase();
//         return (
//           (item[displayField] && item[displayField].toLowerCase().includes(searchLower)) ||
//           (item[codeField] && item[codeField].toLowerCase().includes(searchLower))
//         );
//       });
//       setFilteredItems(filtered);
//     }
    
//     if (selectedItem && query !== getDisplayValue(selectedItem)) {
//       setSelectedItem(null);
//       onSelect?.(null);
//     }
//   };

//   const handleSelectItem = (item) => {
//     setSelectedItem(item);
//     setSearchQuery(getDisplayValue(item));
//     setShowDropdown(false);
//     onSelect?.(item);
//   };

//   const handleInputFocus = () => {
//     if (!showDropdown && ref.current) {
//       setFilteredItems(items);
      
//       const rect = ref.current.getBoundingClientRect();
//       const viewportHeight = window.innerHeight;
//       const spaceBelow = viewportHeight - rect.bottom;
//       const dropdownHeight = 300;
//       const direction = spaceBelow < dropdownHeight ? 'up' : 'down';
      
//       setDropdownPosition({
//         top: direction === 'down' ? rect.bottom + window.scrollY : rect.top + window.scrollY - dropdownHeight,
//         left: rect.left + window.scrollX,
//         width: rect.width,
//         direction: direction
//       });
      
//       setShowDropdown(true);
//     }
//   };

//   const handleInputBlur = () => {
//     setTimeout(() => {
//       if (dropdownRef.current && !dropdownRef.current.contains(document.activeElement)) {
//         setShowDropdown(false);
//         if (selectedItem) {
//           setSearchQuery(getDisplayValue(selectedItem));
//         }
//       }
//     }, 200);
//   };

//   // Set the ref
//   useEffect(() => {
//     if (inputRef) {
//       inputRef(ref.current);
//     }
//   }, [inputRef]);

//   return (
//     <>
//       <div className="relative w-full">
//         <input
//           ref={ref}
//           type="text"
//           value={searchQuery}
//           onChange={(e) => handleSearch(e.target.value)}
//           onFocus={handleInputFocus}
//           onBlur={handleInputBlur}
//           onKeyDown={onKeyDown}
//           className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:opacity-50"
//           placeholder={placeholder}
//           required={required}
//           disabled={disabled}
//           autoComplete="off"
//         />
//         {loading && (
//           <div className="absolute right-2 top-2">
//             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-500"></div>
//           </div>
//         )}
//       </div>
      
//       {showDropdown && (
//         <div 
//           ref={dropdownRef}
//           className="fixed z-[100000] bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto"
//           style={{
//             top: `${dropdownPosition.top}px`,
//             left: `${dropdownPosition.left}px`,
//             width: `${dropdownPosition.width}px`,
//             maxHeight: '300px',
//             minWidth: '200px'
//           }}
//         >
//           {loading ? (
//             <div className="p-3 text-center text-sm text-slate-500">
//               <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500 mx-auto"></div>
//               <p className="mt-1">Loading...</p>
//             </div>
//           ) : filteredItems.length > 0 ? (
//             filteredItems.map((item) => (
//               <div
//                 key={item._id}
//                 onMouseDown={(e) => {
//                   e.preventDefault();
//                   handleSelectItem(item);
//                 }}
//                 className={`p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
//                   selectedItem?._id === item._id ? 'bg-sky-50' : ''
//                 }`}
//               >
//                 {renderItem ? (
//                   renderItem(item)
//                 ) : (
//                   <>
//                     <div className="font-medium text-slate-800 text-sm">
//                       {item[displayField]}
//                     </div>
//                     {item[codeField] && (
//                       <div className="text-xs text-slate-500 mt-0.5">
//                         Code: {item[codeField]}
//                       </div>
//                     )}
//                   </>
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
//     </>
//   );
// }

// /** ===== Pack Type Table Component - Single Table with all rows ===== */
// function PackTypeTable({ 
//   rows, 
//   onChange, 
//   onRemove, 
//   onDuplicate, 
//   pkgTypes = [], 
//   uoms = [], 
//   skuSizes = [], 
//   items = [],
//   onNavigateToCreate, 
//   onNavigateToCreateUOM, 
//   onNavigateToCreateSKUSize,
//   onNavigateToCreateItem
// }) {
  
//   const [showItemDropdown, setShowItemDropdown] = useState({});
//   const [itemSearchQuery, setItemSearchQuery] = useState({});
//   const [filteredItems, setFilteredItems] = useState({});
//   const [itemDropdownPosition, setItemDropdownPosition] = useState({ top: 0, left: 0, width: 0, direction: 'down' });
//   const [activeItemRowId, setActiveItemRowId] = useState(null);
//   const itemInputRefs = useRef({});
//   const itemDropdownRef = useRef({});

//   // Update item search when rows change
//   useEffect(() => {
//     rows.forEach(row => {
//       if (row.productName && !itemSearchQuery[row._id]) {
//         setItemSearchQuery(prev => ({ ...prev, [row._id]: row.productName }));
//       }
//       if (!filteredItems[row._id]) {
//         setFilteredItems(prev => ({ ...prev, [row._id]: items }));
//       }
//     });
//   }, [rows, items]);

//   // Get columns based on pack type
//   const getColumnsForRow = (packType) => {
//     if (packType === "PALLETIZATION") {
//       return [
//         { key: "noOfPallets", label: "NO OF PALLETS", type: "number" },
//         { key: "unitPerPallets", label: "UNIT PER PALLETS", type: "number" },
//         { key: "totalPkgs", label: "TOTAL PKGS", type: "number", readOnly: true },
//         { key: "pkgsType", label: "PKG TYPE", type: "select", options: pkgTypes, isDynamic: true },
//         { key: "uom", label: "UOM", type: "select", options: uoms, isUOM: true },
//         { key: "skuSize", label: "SKU - SIZE", type: "select", options: skuSizes, isSKUSize: true },
//         { key: "packWeight", label: "PACK - WEIGHT", type: "number" },
//         { key: "productName", label: "PRODUCT NAME", type: "select", options: items, isItem: true },
//         { key: "wtLtr", label: "WT (LTR)", type: "number", readOnly: true },
//         { key: "actualWt", label: "ACTUAL - WT", type: "number", readOnly: true },
//         { key: "chargedWt", label: "CHARGED - WT", type: "number" },
//         { key: "wtUom", label: "WT UOM", type: "text", readOnly: true, defaultValue: "MT" },
//       ];
//     }

//     if (packType === "UNIFORM - BAGS/BOXES") {
//       return [
//         { key: "totalPkgs", label: "TOTAL PKGS", type: "number" },
//         { key: "pkgsType", label: "PKG TYPE", type: "select", options: pkgTypes, isDynamic: true },
//         { key: "uom", label: "UOM", type: "select", options: uoms, isUOM: true },
//         { key: "skuSize", label: "SKU - SIZE", type: "select", options: skuSizes, isSKUSize: true },
//         { key: "packWeight", label: "PACK - WEIGHT", type: "number" },
//         { key: "productName", label: "PRODUCT NAME", type: "select", options: items, isItem: true },
//         { key: "wtLtr", label: "WT (LTR)", type: "number", readOnly: true },
//         { key: "actualWt", label: "ACTUAL - WT", type: "number", readOnly: true },
//         { key: "chargedWt", label: "CHARGED - WT", type: "number" },
//         { key: "wtUom", label: "WT UOM", type: "text", readOnly: true, defaultValue: "MT" },
//       ];
//     }

//     if (packType === "LOOSE - CARGO") {
//       return [
//         { key: "uom", label: "UOM", type: "select", options: uoms, isUOM: true },
//         { key: "productName", label: "PRODUCT NAME", type: "select", options: items, isItem: true },
//         { key: "actualWt", label: "ACTUAL - WT", type: "number" },
//         { key: "chargedWt", label: "CHARGED - WT", type: "number" },
//       ];
//     }

//     // NON-UNIFORM - GENERAL CARGO
//     return [
//       { key: "nos", label: "NOS", type: "number" },
//       { key: "productName", label: "PRODUCT NAME", type: "select", options: items, isItem: true },
//       { key: "uom", label: "UOM", type: "select", options: uoms, isUOM: true },
//       { key: "length", label: "LENGTH", type: "number" },
//       { key: "width", label: "WIDTH", type: "number" },
//       { key: "height", label: "HEIGHT", type: "number" },
//       { key: "actualWt", label: "ACTUAL - WT", type: "number" },
//       { key: "chargedWt", label: "CHARGED - WT", type: "number" },
//     ];
//   };

//   const handleChange = (rowId, key, value) => {
//     onChange(rowId, key, value);
//   };

//   // Handle item search
//   const handleItemSearch = (rowId, query) => {
//     setItemSearchQuery(prev => ({ ...prev, [rowId]: query }));
    
//     if (!query.trim()) {
//       setFilteredItems(prev => ({ ...prev, [rowId]: items }));
//     } else {
//       const filtered = items.filter(item =>
//         item.itemName.toLowerCase().includes(query.toLowerCase()) ||
//         (item.itemCode && item.itemCode.toLowerCase().includes(query.toLowerCase()))
//       );
//       setFilteredItems(prev => ({ ...prev, [rowId]: filtered }));
//     }
//   };

//   const handleSelectItem = (rowId, item) => {
//     onChange(rowId, 'productName', item.itemName);
//     setItemSearchQuery(prev => ({ ...prev, [rowId]: item.itemName }));
//     setShowItemDropdown(prev => ({ ...prev, [rowId]: false }));
//     setActiveItemRowId(null);
//   };

//   const handleItemInputFocus = (rowId, event) => {
//     if (!showItemDropdown[rowId]) {
//       setFilteredItems(prev => ({ ...prev, [rowId]: items }));
      
//       const rect = event.target.getBoundingClientRect();
//       const viewportHeight = window.innerHeight;
//       const spaceBelow = viewportHeight - rect.bottom;
//       const dropdownHeight = 300;
//       const direction = spaceBelow < dropdownHeight ? 'up' : 'down';
      
//       setItemDropdownPosition({
//         top: direction === 'down' ? rect.bottom + window.scrollY : rect.top + window.scrollY - dropdownHeight,
//         left: rect.left + window.scrollX,
//         width: rect.width,
//         direction: direction
//       });
      
//       setShowItemDropdown(prev => ({ ...prev, [rowId]: true }));
//       setActiveItemRowId(rowId);
//     }
//   };

//   const handleItemInputBlur = (rowId) => {
//     setTimeout(() => {
//       if (itemDropdownRef.current[rowId] && !itemDropdownRef.current[rowId].contains(document.activeElement)) {
//         setShowItemDropdown(prev => ({ ...prev, [rowId]: false }));
//         setActiveItemRowId(null);
//       }
//     }, 200);
//   };

//   // Update dropdown position on scroll
//   useEffect(() => {
//     const handleScroll = () => {
//       if (activeItemRowId && itemInputRefs.current[activeItemRowId]) {
//         const rect = itemInputRefs.current[activeItemRowId].getBoundingClientRect();
//         const viewportHeight = window.innerHeight;
//         const spaceBelow = viewportHeight - rect.bottom;
//         const dropdownHeight = 300;
//         const direction = spaceBelow < dropdownHeight ? 'up' : 'down';
        
//         setItemDropdownPosition({
//           top: direction === 'down' ? rect.bottom + window.scrollY : rect.top + window.scrollY - dropdownHeight,
//           left: rect.left + window.scrollX,
//           width: rect.width,
//           direction: direction
//         });
//       }
//     };
    
//     window.addEventListener('scroll', handleScroll, true);
//     window.addEventListener('resize', handleScroll);
    
//     return () => {
//       window.removeEventListener('scroll', handleScroll, true);
//       window.removeEventListener('resize', handleScroll);
//     };
//   }, [activeItemRowId]);

//   // Close dropdown when clicking outside
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (activeItemRowId) {
//         const isClickInside = itemDropdownRef.current[activeItemRowId]?.contains(event.target) ||
//                              itemInputRefs.current[activeItemRowId]?.contains(event.target);
//         if (!isClickInside) {
//           setShowItemDropdown(prev => ({ ...prev, [activeItemRowId]: false }));
//           setActiveItemRowId(null);
//         }
//       }
//     };
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, [activeItemRowId]);

//   return (
//     <div className="overflow-auto rounded-xl border border-yellow-300">
//       <table className="min-w-max w-full text-sm">
//         <thead className="sticky top-0 bg-yellow-400 z-10">
//           <tr>
//             <th className="border border-yellow-500 px-3 py-3 text-xs font-extrabold text-slate-900 text-center bg-yellow-400">
//               Pack Type
//             </th>
//             {rows.length > 0 && getColumnsForRow(rows[0].packType).map((c) => (
//               <th
//                 key={c.key}
//                 className="border border-yellow-500 px-3 py-3 text-xs font-extrabold text-slate-900 text-center"
//               >
//                 {c.label}
//                 {c.readOnly && <span className="ml-1 text-xs text-blue-600">*Auto</span>}
//               </th>
//             ))}
//             <th className="border border-yellow-500 px-3 py-3 text-xs font-extrabold text-slate-900 text-center">
//               Actions
//             </th>
//           </tr>
//         </thead>

//         <tbody>
//           {rows.length > 0 ? (
//             rows.map((r) => {
//               const cols = getColumnsForRow(r.packType);
              
//               return (
//                 <tr key={r._id} className="hover:bg-yellow-50 even:bg-slate-50">
//                   <td className="border border-yellow-300 px-2 py-2 text-center font-semibold bg-yellow-50 text-xs">
//                     {r.packType === "PALLETIZATION" ? "Palletization" :
//                      r.packType === "UNIFORM - BAGS/BOXES" ? "Uniform" :
//                      r.packType === "LOOSE - CARGO" ? "Loose Cargo" :
//                      "Non-uniform"}
//                   </td>
                  
//                   {cols.map((c) => {
//                     // Handle WT UOM field - always show MT as readonly
//                     if (c.key === "wtUom") {
//                       return (
//                         <td key={c.key} className="border border-yellow-300 px-2 py-2">
//                           <input
//                             type="text"
//                             value="MT"
//                             readOnly
//                             className="w-full rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm text-slate-700 font-medium"
//                           />
//                         </td>
//                       );
//                     }
                    
//                     // For read-only calculated fields
//                     if (c.readOnly && (c.key === "actualWt" || c.key === "totalPkgs" || c.key === "wtLtr")) {
//                       return (
//                         <td key={c.key} className="border border-yellow-300 px-2 py-2">
//                           <input
//                             type="text"
//                             value={r[c.key] || ""}
//                             readOnly
//                             className="w-full rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm text-slate-700 font-medium"
//                             placeholder="Auto"
//                           />
//                         </td>
//                       );
//                     }
                    
//                     return (
//                       <td key={c.key} className="border border-yellow-300 px-2 py-2">
//                         {c.isDynamic ? (
//                           <select
//                             value={r[c.key] || ""}
//                             onChange={(e) => handleChange(r._id, c.key, e.target.value)}
//                             className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//                           >
//                             <option value="">Select</option>
//                             {c.options && c.options.map((opt) => (
//                               <option key={opt._id} value={opt.name}>
//                                 {opt.name}
//                               </option>
//                             ))}
//                           </select>
//                         ) : c.isUOM ? (
//                           <select
//                             value={r[c.key] || ""}
//                             onChange={(e) => handleChange(r._id, c.key, e.target.value)}
//                             className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//                           >
//                             <option value="">Select</option>
//                             {c.options && c.options.map((opt) => (
//                               <option key={opt._id} value={opt.name}>
//                                 {opt.name}
//                               </option>
//                             ))}
//                           </select>
//                         ) : c.isSKUSize ? (
//                           <select
//                             value={r[c.key] || ""}
//                             onChange={(e) => handleChange(r._id, c.key, e.target.value)}
//                             className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//                           >
//                             <option value="">Select</option>
//                             {c.options && c.options.map((opt) => (
//                               <option key={opt._id} value={opt.display}>
//                                 {opt.display}
//                               </option>
//                             ))}
//                           </select>
//                         ) : c.isItem ? (
//                           <div className="relative w-full">
//                             <div className="flex-1 relative">
//                               <input
//                                 ref={el => itemInputRefs.current[r._id] = el}
//                                 type="text"
//                                 value={itemSearchQuery[r._id] || r[c.key] || ""}
//                                 onChange={(e) => handleItemSearch(r._id, e.target.value)}
//                                 onFocus={(e) => handleItemInputFocus(r._id, e)}
//                                 onBlur={() => handleItemInputBlur(r._id)}
//                                 className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//                                 placeholder="Search product..."
//                                 autoComplete="off"
//                               />
//                               {showItemDropdown[r._id] && (
//                                 <div 
//                                   ref={el => itemDropdownRef.current[r._id] = el}
//                                   className="fixed z-[100000] bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto"
//                                   style={{
//                                     top: `${itemDropdownPosition.top}px`,
//                                     left: `${itemDropdownPosition.left}px`,
//                                     width: `${itemDropdownPosition.width}px`,
//                                     maxHeight: '300px',
//                                     minWidth: '200px'
//                                   }}
//                                 >
//                                   <div className="sticky top-0 bg-gray-50 px-3 py-2 text-xs font-semibold text-slate-600 border-b">
//                                     Select Product
//                                   </div>
//                                   {(filteredItems[r._id] || items).length > 0 ? (
//                                     (filteredItems[r._id] || items).map((item) => (
//                                       <div
//                                         key={item._id}
//                                         onMouseDown={(e) => {
//                                           e.preventDefault();
//                                           handleSelectItem(r._id, item);
//                                         }}
//                                         className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
//                                       >
//                                         <div className="font-medium text-slate-800 text-sm">
//                                           {item.itemName}
//                                         </div>
//                                         <div className="text-xs text-slate-500 mt-0.5">
//                                           Code: {item.itemCode}
//                                         </div>
//                                       </div>
//                                     ))
//                                   ) : (
//                                     <div className="p-3 text-center text-sm text-slate-500">
//                                       No items found
//                                     </div>
//                                   )}
//                                 </div>
//                               )}
//                             </div>
//                           </div>
//                         ) : c.options && !c.isDynamic && !c.isUOM && !c.isSKUSize && !c.isItem ? (
//                           <select
//                             value={r[c.key] || ""}
//                             onChange={(e) => handleChange(r._id, c.key, e.target.value)}
//                             className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//                           >
//                             <option value="">Select</option>
//                             {c.options.map((opt) => (
//                               <option key={opt} value={opt}>
//                                 {opt}
//                               </option>
//                             ))}
//                           </select>
//                         ) : (
//                           <input
//                             type={c.type || "text"}
//                             value={r[c.key] || ""}
//                             readOnly={c.readOnly}
//                             onChange={(e) => handleChange(r._id, c.key, e.target.value)}
//                             className={`w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
//                               c.readOnly 
//                                 ? 'bg-slate-100 text-slate-700' 
//                                 : 'bg-white'
//                             }`}
//                             placeholder={c.readOnly ? "Auto" : `Enter`}
//                             step={c.type === "number" ? "0.001" : undefined}
//                           />
//                         )}
//                       </td>
//                     );
//                   })}
//                   <td className="border border-yellow-300 px-2 py-2">
//                     <div className="flex gap-1 justify-center">
//                       <button
//                         onClick={() => onDuplicate(r._id)}
//                         className="rounded-lg border border-yellow-500 bg-yellow-100 px-2 py-1.5 text-xs font-bold text-yellow-800 hover:bg-yellow-200 transition"
//                       >
//                         Duplicate
//                       </button>
//                       <button
//                         onClick={() => onRemove(r._id)}
//                         className="rounded-lg bg-red-500 px-2 py-1.5 text-xs font-bold text-white hover:bg-red-600 transition"
//                       >
//                         Remove
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               );
//             })
//           ) : (
//             <tr>
//               <td
//                 colSpan={100}
//                 className="border border-yellow-300 px-4 py-10 text-center text-slate-400 font-semibold"
//               >
//                 No rows yet. Select a pack type and click <b>Add Row</b> to add data.
//               </td>
//             </tr>
//           )}
//         </tbody>
//       </table>
//     </div>
//   );
// }

"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { subscribeToMasterDataChanges } from "@/utils/masterDataEvents";

/** =========================
 * CONSTANTS
 ========================= */
const PACK_TYPES = [
  { key: "PALLETIZATION", label: "Palletization" },
  { key: "UNIFORM - BAGS/BOXES", label: "Uniform - Bags/Boxes" },
  { key: "LOOSE - CARGO", label: "Loose - Cargo" },
  { key: "NON-UNIFORM - GENERAL CARGO", label: "Non-uniform - General Cargo" },
];

const ORDER_TYPES = ["Sales", "STO Order", "Export", "Import"];
const STATUSES = ["Open", "Hold", "Cancelled"];
const DELIVERY_OPTIONS = ["Urgent", "Normal", "Express", "Scheduled"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function hasNumericValue(v) {
  return v !== "" && v !== null && v !== undefined && Number.isFinite(Number(v));
}

/** =========================
 * DEFAULT EMPTY ROWS
 ========================= */
function defaultRow(packType) {
  if (packType === "PALLETIZATION") {
    return {
      _id: uid(),
      packType: "PALLETIZATION",
      noOfPallets: "",
      unitPerPallets: "",
      totalPkgs: "",
      pkgsType: "",
      uom: "MT",
      skuSize: "",
      packWeight: "",
      productId: "",
      productName: "",
      wtLtr: "",
      actualWt: "",
      chargedWt: "",
      wtUom: "MT",
      isUniform: false,
    };
  }

  if (packType === "UNIFORM - BAGS/BOXES") {
    return {
      _id: uid(),
      packType: "UNIFORM - BAGS/BOXES",
      totalPkgs: "",
      pkgsType: "",
      uom: "",
      skuSize: "",
      packWeight: "",
      productId: "",
      productName: "",
      wtLtr: "",
      actualWt: "",
      chargedWt: "",
      wtUom: "MT",
    };
  }

  if (packType === "LOOSE - CARGO") {
    return {
      _id: uid(),
      packType: "LOOSE - CARGO",
      uom: "MT",
      productId: "",
      productName: "",
      actualWt: "",
      chargedWt: "",
    };
  }

  // NON-UNIFORM - GENERAL CARGO
  return {
    _id: uid(),
    packType: "NON-UNIFORM - GENERAL CARGO",
    nos: "",
    productId: "",
    productName: "",
    uom: "MT",
    length: "",
    width: "",
    height: "",
    actualWt: "",
    chargedWt: "",
  };
}

function defaultPlantRow() {
  return {
    _id: uid(),
    plantCode: "",
    plantName: "",
    plantCodeValue: "",
    orderType: "",
    pinCode: "",
    from: null,
    fromName: "",
    fromState: "",
    to: null,
    toName: "",
    taluka: "",
    talukaName: "",
    district: "",
    districtName: "",
    state: "",
    stateName: "",
    country: "",
    countryName: "",
    weight: "",
    status: "",
    collectionCharges: "",
    cancellationCharges: "",
    loadingCharges: "",
    otherCharges: "",
    localStatus: "unknown", 
    localStatusLabel: "Unknown" 
  };
}

/** =========================
 * Customer Search Hook
 ========================= */
function useCustomerSearch() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchCustomers = async (query = "") => {
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

/** =========================
 * External Pincode API Hook with Multiple Cities Support
 ========================= */
function useExternalPincodeAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pincodeData, setPincodeData] = useState(null);
  const [multipleCities, setMultipleCities] = useState([]);

  const fetchPincodeDetails = async (pincode) => {
    if (!pincode || pincode.length !== 6) {
      return null;
    }

    setLoading(true);
    setError(null);
    setMultipleCities([]);
    
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();
      
      if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
        const postOffices = data[0].PostOffice;
        
        const uniqueLocations = [];
        const seen = new Set();
        
        postOffices.forEach(po => {
          const cityName = po.Name;
          const key = `${po.Name}-${po.District}-${po.State}`;
          
          if (!seen.has(key)) {
            seen.add(key);
            uniqueLocations.push({
              taluka: po.Block || po.Taluk || po.District,
              talukaName: po.Block || po.Taluk || po.District,
              district: po.District,
              districtName: po.District,
              state: po.State,
              stateName: po.State,
              country: po.Country,
              countryName: po.Country,
              city: cityName,
              cityName: cityName,
              pincode: pincode,
              postOffice: po.Name,
              block: po.Block,
              division: po.Division
            });
          }
        });
        
        if (uniqueLocations.length > 1) {
          setMultipleCities(uniqueLocations);
        }
        
        const firstLocation = uniqueLocations[0];
        const result = {
          taluka: firstLocation.taluka,
          talukaName: firstLocation.talukaName,
          district: firstLocation.district,
          districtName: firstLocation.districtName,
          state: firstLocation.state,
          stateName: firstLocation.stateName,
          country: firstLocation.country,
          countryName: firstLocation.countryName,
          city: firstLocation.city,
          cityName: firstLocation.cityName,
          pincode: pincode,
          hasMultiple: uniqueLocations.length > 1,
          allLocations: uniqueLocations
        };
        
        setPincodeData(result);
        return result;
      } else {
        setError('Invalid pincode or no data found');
        return null;
      }
    } catch (err) {
      console.error('Error fetching pincode details:', err);
      setError('Failed to fetch pincode details');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, pincodeData, multipleCities, fetchPincodeDetails };
}

export default function CreateOrderPanel() {
  const router = useRouter();

  // ✅ Refs for Enter/Backspace navigation - Header fields
  const branchRef = useRef(null);
  const subCompanyRef = useRef(null);
  const deliveryRef = useRef(null);
  const dateRef = useRef(null);
  const partyNameRef = useRef(null);
  
  // ✅ Refs for plant rows - ALL fields
  const plantCodeRefs = useRef({});
  const plantNameRefs = useRef({});
  const orderTypeRefs = useRef({});
  const pinCodeRefs = useRef({});
  const fromRefs = useRef({});
  const toRefs = useRef({});
  const talukaRefs = useRef({});
  const districtRefs = useRef({});
  const stateRefs = useRef({});
  const countryRefs = useRef({});
  const weightRefs = useRef({});
  const statusRefs = useRef({});
  const collectionChargesRefs = useRef({});
  const cancellationChargesRefs = useRef({});
  const loadingChargesRefs = useRef({});
  const otherChargesRefs = useRef({});

  // ✅ Refs for pack rows - ALL fields
  const packInputRefs = useRef({});

  /** =========================
   * STATE FOR API DATA
   ========================= */
  const [branches, setBranches] = useState([]);
  const [subCompanies, setSubCompanies] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [locations, setLocations] = useState([]);
  const [pkgTypes, setPkgTypes] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [skuSizes, setSkuSizes] = useState([]);
  
  /** =========================
   * CUSTOMER SEARCH STATE
   ========================= */
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const customerSearch = useCustomerSearch();

  /** =========================
   * PINCODE API STATE
   ========================= */
  const pincodeAPI = useExternalPincodeAPI();
  const [pincodeInput, setPincodeInput] = useState({});
  const [showCityDropdown, setShowCityDropdown] = useState({});
  const [cityOptionsByRow, setCityOptionsByRow] = useState({});
  const [items, setItems] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState({});

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/items?activeOnly=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setItems(data.data);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Error fetching items:', error.message);
      setItems([]);
    }
  };

  /** =========================
   * CHARGES VISIBILITY STATE
   ========================= */
  const [showCharges, setShowCharges] = useState(false);

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/locations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLocations(data.data);
      } else {
        setLocations([]);
      }
    } catch (error) {
      console.error('Error fetching locations:', error.message);
      setLocations([]);
    }
  };

  const fetchPkgTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/pkg-types', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPkgTypes(data.data);
      } else {
        setPkgTypes([]);
      }
    } catch (error) {
      console.error('Error fetching PKG types:', error.message);
      setPkgTypes([]);
    }
  };

  const fetchUOMs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/uoms', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setUoms(data.data);
      } else {
        setUoms([]);
      }
    } catch (error) {
      console.error('Error fetching UOMs:', error.message);
      setUoms([]);
    }
  };

  const fetchSKUSizes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/sku-sizes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSkuSizes(data.data);
      } else {
        setSkuSizes([]);
      }
    } catch (error) {
      console.error('Error fetching SKU sizes:', error.message);
      setSkuSizes([]);
    }
  };

  /** =========================
   * HEADER - EMPTY INITIAL STATE
   ========================= */
  const [top, setTop] = useState({
    orderNo: "",
    branch: "",
    branchName: "",
    branchCode: "",
    subCompanyId: "",
    subCompanyName: "",
    subCompanyCode: "",
    delivery: "Normal",
    date: new Date().toISOString().split('T')[0],
    partyName: "",
    collectionCharges: "",
    cancellationCharges: "",
    loadingCharges: "",
    otherCharges: "",
    customerId: "",
    customerCode: "",
    customerName: "",
    contactPerson: "",
  });

  /** =========================
   * PLANT GRID TABLE DATA
   ========================= */
  const [plantRows, setPlantRows] = useState([defaultPlantRow()]);

  /** =========================
   * PACK DATA - Single array for all pack types
   ========================= */
  const [activePack, setActivePack] = useState("PALLETIZATION");
  const [packRows, setPackRows] = useState([
    { ...defaultRow("PALLETIZATION"), packType: "PALLETIZATION" }
  ]);
  const [hasReplacedInitialPackRow, setHasReplacedInitialPackRow] = useState(false);

  /** =========================
   * FETCH DATA FROM APIs
   ========================= */
  useEffect(() => {
    fetchBranches();
    fetchSubCompanies();
    fetchCountries();
    fetchPlants();
    fetchLocations();
    fetchPkgTypes();
    fetchUOMs();
    fetchSKUSizes();
    fetchItems(); 
  }, []);

  useEffect(() => {
    const refreshers = {
      items: fetchItems,
      locations: fetchLocations,
      'pkg-types': fetchPkgTypes,
      uoms: fetchUOMs,
      'sku-sizes': fetchSKUSizes,
      branches: fetchBranches,
      plants: fetchPlants,
      countries: fetchCountries,
      subcompanies: fetchSubCompanies,
    };

    return subscribeToMasterDataChanges(Object.keys(refreshers), (master) => {
      refreshers[master]?.();
    });
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
      } else {
        setBranches([]);
      }
    } catch (error) {
      console.error('Error fetching branches:', error.message);
      setBranches([]);
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

  const fetchCountries = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/countries', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCountries(data.data);
      } else {
        setCountries([]);
      }
    } catch (error) {
      console.error('Error fetching countries:', error.message);
      setCountries([]);
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
      } else {
        setPlants([]);
      }
    } catch (error) {
      console.error('Error fetching plants:', error.message);
      setPlants([]);
    }
  };

  /** =========================
   * CUSTOMER SEARCH FUNCTIONS
   ========================= */
  const handleCustomerSearch = (query) => {
    setCustomerSearchQuery(query);
    
    if (query.trim() === "") {
      setFilteredCustomers(customerSearch.customers);
    } else {
      const filtered = customerSearch.customers.filter(customer =>
        customer.customerName.toLowerCase().includes(query.toLowerCase()) ||
        customer.customerCode.toLowerCase().includes(query.toLowerCase()) ||
        (customer.contactPersonName && customer.contactPersonName.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredCustomers(filtered);
    }
    
    if (selectedCustomer && query !== selectedCustomer.customerName) {
      setSelectedCustomer(null);
      setTop(prev => ({
        ...prev,
        customerId: "",
        customerCode: "",
        customerName: "",
        contactPerson: "",
        partyName: ""
      }));
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchQuery(customer.customerName);
    setShowCustomerDropdown(false);
    
    setTop(prev => ({
      ...prev,
      customerId: customer._id,
      customerCode: customer.customerCode,
      customerName: customer.customerName,
      contactPerson: customer.contactPersonName || "",
      partyName: customer.customerName
    }));
  };

  const handleCustomerInputFocus = async () => {
    if (!showCustomerDropdown) {
      if (customerSearch.customers.length === 0) {
        await customerSearch.searchCustomers("");
      }
      setFilteredCustomers(customerSearch.customers);
      setShowCustomerDropdown(true);
    }
  };

  const handleCustomerInputBlur = () => {
    setTimeout(() => {
      setShowCustomerDropdown(false);
    }, 200);
  };

  useEffect(() => {
    if (customerSearch.customers.length > 0) {
      setFilteredCustomers(customerSearch.customers);
    }
  }, [customerSearch.customers]);

  /** =========================
   * BRANCH SELECTION
   ========================= */
  const handleBranchSelect = (branch) => {
    if (branch) {
      setTop(prev => ({
        ...prev,
        branch: branch._id,
        branchName: branch.name,
        branchCode: branch.code || ''
      }));
    } else {
      setTop(prev => ({
        ...prev,
        branch: "",
        branchName: "",
        branchCode: ""
      }));
    }
  };

  /** =========================
   * PLANT SELECTION
   ========================= */
  const handlePlantChange = (rowId, plantId) => {
    const selectedPlant = plants.find(p => p._id === plantId);
    if (selectedPlant) {
      updatePlantRow(rowId, 'plantCode', plantId);
      updatePlantRow(rowId, 'plantName', selectedPlant.name);
      updatePlantRow(rowId, 'plantCodeValue', selectedPlant.code);
    } else {
      updatePlantRow(rowId, 'plantCode', '');
      updatePlantRow(rowId, 'plantName', '');
      updatePlantRow(rowId, 'plantCodeValue', '');
    }
  };

  /** =========================
   * PINCODE API INTEGRATION with Multiple Cities Support
   ========================= */
  const handlePincodeChange = async (rowId, pincode) => {
    updatePlantRow(rowId, 'pinCode', pincode);
    setPincodeInput(prev => ({ ...prev, [rowId]: pincode }));
    
    if (pincode && pincode.length === 6) {
      const result = await pincodeAPI.fetchPincodeDetails(pincode);
      
      if (result) {
        if (result.hasMultiple && result.allLocations && result.allLocations.length > 0) {
          setCityOptionsByRow(prev => ({ 
            ...prev, 
            [rowId]: result.allLocations 
          }));
        } else {
          setCityOptionsByRow(prev => ({ ...prev, [rowId]: [] }));
          updatePlantRow(rowId, 'taluka', result.taluka);
          updatePlantRow(rowId, 'talukaName', result.talukaName);
          updatePlantRow(rowId, 'district', result.district);
          updatePlantRow(rowId, 'districtName', result.districtName);
          updatePlantRow(rowId, 'state', result.state);
          updatePlantRow(rowId, 'stateName', result.stateName);
          updatePlantRow(rowId, 'country', result.country);
          updatePlantRow(rowId, 'countryName', result.countryName);
          updatePlantRow(rowId, 'toName', result.cityName);
          updatePlantRow(rowId, 'to', null);
          updateLocalStatus(rowId);
        }
      }
    } else {
      setCityOptionsByRow(prev => ({ ...prev, [rowId]: [] }));
    }
  };

  const handleSelectCity = (rowId, location) => {
    updatePlantRow(rowId, 'taluka', location.taluka);
    updatePlantRow(rowId, 'talukaName', location.talukaName);
    updatePlantRow(rowId, 'district', location.district);
    updatePlantRow(rowId, 'districtName', location.districtName);
    updatePlantRow(rowId, 'state', location.state);
    updatePlantRow(rowId, 'stateName', location.stateName);
    updatePlantRow(rowId, 'country', location.country);
    updatePlantRow(rowId, 'countryName', location.countryName);
    updatePlantRow(rowId, 'toName', location.cityName);
    updatePlantRow(rowId, 'to', null);
    setShowCityDropdown(prev => ({ ...prev, [rowId]: false }));
    updateLocalStatus(rowId);
  };

  const updateLocalStatus = (rowId) => {
    const row = plantRows.find(r => r._id === rowId);
    if (row) {
      const fromState = row.fromState?.trim().toUpperCase() || '';
      const toState = row.stateName?.trim().toUpperCase() || '';
      
      if (!fromState || !toState) {
        updatePlantRow(rowId, 'localStatus', 'unknown');
        updatePlantRow(rowId, 'localStatusLabel', 'Unknown');
      } else if (fromState === toState) {
        updatePlantRow(rowId, 'localStatus', 'local');
        updatePlantRow(rowId, 'localStatusLabel', 'Local');
      } else {
        updatePlantRow(rowId, 'localStatus', 'not-local');
        updatePlantRow(rowId, 'localStatusLabel', 'Not Local');
      }
    }
  };

  /** =========================
   * PLANT ROW FUNCTIONS
   ========================= */
  const addPlantRow = () => {
    const newRow = defaultPlantRow();
    setPlantRows((p) => [...p, newRow]);
    setTimeout(() => {
      if (plantCodeRefs.current[newRow._id]) {
        plantCodeRefs.current[newRow._id].focus();
      }
    }, 100);
  };

  const updatePlantRow = (rowId, key, value) => {
    setPlantRows((prev) =>
      prev.map((r) => (r._id === rowId ? { ...r, [key]: value } : r))
    );
  };

  const removePlantRow = (rowId) => {
    if (plantRows.length > 1) {
      setPlantRows((prev) => prev.filter((r) => r._id !== rowId));
    } else {
      alert("At least one plant row is required");
    }
  };

  // ✅ Navigation helpers for plant rows
  const getAllPlantFields = (rowId) => {
    const fields = ['plantCode', 'plantName', 'orderType', 'pinCode', 'from', 'to', 'taluka', 'district', 'state', 'country', 'weight', 'status'];
    if (showCharges) {
      fields.push('collectionCharges', 'cancellationCharges', 'loadingCharges', 'otherCharges');
    }
    return fields;
  };

  const getPlantRefMap = (rowId) => {
    return {
      plantCode: plantCodeRefs.current[rowId],
      plantName: plantNameRefs.current[rowId],
      orderType: orderTypeRefs.current[rowId],
      pinCode: pinCodeRefs.current[rowId],
      from: fromRefs.current[rowId],
      to: toRefs.current[rowId],
      taluka: talukaRefs.current[rowId],
      district: districtRefs.current[rowId],
      state: stateRefs.current[rowId],
      country: countryRefs.current[rowId],
      weight: weightRefs.current[rowId],
      status: statusRefs.current[rowId],
      collectionCharges: collectionChargesRefs.current[rowId],
      cancellationCharges: cancellationChargesRefs.current[rowId],
      loadingCharges: loadingChargesRefs.current[rowId],
      otherCharges: otherChargesRefs.current[rowId]
    };
  };

  const focusNextPlantField = (rowId, currentField) => {
    const fields = getAllPlantFields(rowId);
    const currentIndex = fields.indexOf(currentField);
    const rowIndex = plantRows.findIndex(r => r._id === rowId);
    
    if (currentIndex !== -1 && currentIndex < fields.length - 1) {
      const nextField = fields[currentIndex + 1];
      const refMap = getPlantRefMap(rowId);
      const nextRef = refMap[nextField];
      if (nextRef) {
        setTimeout(() => nextRef.focus(), 50);
      }
    } else if (currentIndex === fields.length - 1) {
      const nextRowIndex = rowIndex + 1;
      if (nextRowIndex < plantRows.length) {
        const nextRowId = plantRows[nextRowIndex]._id;
        if (plantCodeRefs.current[nextRowId]) {
          setTimeout(() => plantCodeRefs.current[nextRowId].focus(), 50);
        }
      } else {
        const newRow = defaultPlantRow();
        setPlantRows((p) => [...p, newRow]);
        setTimeout(() => {
          if (plantCodeRefs.current[newRow._id]) {
            plantCodeRefs.current[newRow._id].focus();
          }
        }, 100);
      }
    }
  };

  const focusPrevPlantField = (rowId, currentField) => {
    const fields = getAllPlantFields(rowId);
    const currentIndex = fields.indexOf(currentField);
    const rowIndex = plantRows.findIndex(r => r._id === rowId);
    
    if (currentIndex > 0) {
      const prevField = fields[currentIndex - 1];
      const refMap = getPlantRefMap(rowId);
      const prevRef = refMap[prevField];
      if (prevRef) {
        setTimeout(() => prevRef.focus(), 50);
      }
    } else if (currentIndex === 0) {
      if (rowIndex > 0) {
        const prevRowId = plantRows[rowIndex - 1]._id;
        const prevFields = getAllPlantFields(prevRowId);
        const lastField = prevFields[prevFields.length - 1];
        const refMap = getPlantRefMap(prevRowId);
        const prevRef = refMap[lastField];
        if (prevRef) {
          setTimeout(() => prevRef.focus(), 50);
        }
      } else {
        if (partyNameRef.current) {
          setTimeout(() => partyNameRef.current.focus(), 50);
        }
      }
    }
  };

  /** =========================
   * PACK DATA FUNCTIONS
   ========================= */
  const recalculatePalletizationWeights = (row) => {
    const updatedRow = { ...row };
    
    const noOfPallets = num(updatedRow.noOfPallets);
    const unitPerPallets = num(updatedRow.unitPerPallets);
    const packWeight = num(updatedRow.packWeight);
    const uom = (updatedRow.uom || "").toUpperCase().trim();
    
    const hasPalletInputs = hasNumericValue(updatedRow.noOfPallets) && hasNumericValue(updatedRow.unitPerPallets);
    const hasPackWeight = hasNumericValue(updatedRow.packWeight);
    let totalPkgs = 0;

    if (hasPalletInputs) {
      totalPkgs = noOfPallets * unitPerPallets;
      updatedRow.totalPkgs = String(totalPkgs);
    } else {
      updatedRow.totalPkgs = "";
    }

    if (hasPalletInputs && hasPackWeight) {
      const isLTR = uom === "LTR" || uom === "L" || uom === "LITRE" || uom === "LITRES";
      
      if (isLTR) {
        const wtLtr = totalPkgs * packWeight;
        updatedRow.wtLtr = wtLtr.toFixed(2);
        const actualWt = (wtLtr / 1000) * 2;
        updatedRow.actualWt = actualWt.toFixed(3);
      } else {
        const actualWt = (totalPkgs * packWeight) / 1000;
        updatedRow.actualWt = actualWt.toFixed(3);
        updatedRow.wtLtr = "";
      }
    } else {
      updatedRow.wtLtr = "";
      updatedRow.actualWt = "";
    }
    
    return updatedRow;
  };
  
  const recalculateUniformWeights = (row) => {
    const updatedRow = { ...row };
    
    const totalPkgs = num(updatedRow.totalPkgs);
    const packWeight = num(updatedRow.packWeight);
    const uom = (updatedRow.uom || "").toUpperCase().trim();
    const hasTotalPkgs = hasNumericValue(updatedRow.totalPkgs);
    const hasPackWeight = hasNumericValue(updatedRow.packWeight);

    if (hasTotalPkgs && hasPackWeight) {
      const isLTR = uom === "LTR" || uom === "L" || uom === "LITRE" || uom === "LITRES";
      
      if (isLTR) {
        const wtLtr = totalPkgs * packWeight;
        updatedRow.wtLtr = wtLtr.toFixed(2);
        const actualWt = (wtLtr / 1000) * 2;
        updatedRow.actualWt = actualWt.toFixed(3);
      } else {
        const actualWt = (totalPkgs * packWeight) / 1000;
        updatedRow.actualWt = actualWt.toFixed(3);
        updatedRow.wtLtr = "";
      }
    } else {
      updatedRow.wtLtr = "";
      updatedRow.actualWt = "";
    }
    
    return updatedRow;
  };

  const updatePackRow = (rowId, key, value) => {
    setPackRows((prev) =>
      prev.map((r) => {
        if (r._id === rowId) {
          let updatedRow = { ...r, [key]: value };
          
          if (r.packType === "PALLETIZATION") {
            updatedRow = recalculatePalletizationWeights(updatedRow);
          } else if (r.packType === "UNIFORM - BAGS/BOXES") {
            updatedRow = recalculateUniformWeights(updatedRow);
          }
          
          return updatedRow;
        }
        return r;
      })
    );
  };
  
  const addRow = () => {
    const newRow = { ...defaultRow(activePack), packType: activePack };
    setPackRows((prev) => [...prev, newRow]);
    setTimeout(() => {
      const firstKey = getPackColumns(newRow.packType)[0]?.key;
      packInputRefs.current[newRow._id]?.[firstKey]?.focus();
    }, 100);
  };

  // The initial palletization row is only a starter row.  The first non-default
  // pack choice replaces it; every later choice is added explicitly as a new row.
  const handlePackTypeChange = (packType) => {
    setActivePack(packType);
    if (!hasReplacedInitialPackRow && packType !== "PALLETIZATION") {
      setPackRows([{ ...defaultRow(packType), packType }]);
      setHasReplacedInitialPackRow(true);
    }
  };

  const removeRow = (id) => {
    if (packRows.length > 1) {
      setPackRows((prev) => prev.filter((r) => r._id !== id));
    } else {
      alert("At least one row is required");
    }
  };

  const duplicateRow = (id) => {
    const row = packRows.find((r) => r._id === id);
    if (!row) return;
    const newRow = { ...row, _id: uid() };
    setPackRows((prev) => [...prev, newRow]);
    setTimeout(() => {
      const firstKey = getPackColumns(newRow.packType)[0]?.key;
      packInputRefs.current[newRow._id]?.[firstKey]?.focus();
    }, 100);
  };

  // ✅ Pack row navigation helpers
  const getPackColumns = (packType) => {
    if (packType === "PALLETIZATION") {
      return [
        { key: "noOfPallets" },
        { key: "unitPerPallets" },
        { key: "pkgsType" },
        { key: "uom" },
        { key: "skuSize" },
        { key: "packWeight" },
        { key: "productName" },
        { key: "chargedWt" },
      ];
    }
    if (packType === "UNIFORM - BAGS/BOXES") {
      return [
        { key: "totalPkgs" },
        { key: "pkgsType" },
        { key: "uom" },
        { key: "skuSize" },
        { key: "packWeight" },
        { key: "productName" },
        { key: "chargedWt" },
      ];
    }
    if (packType === "LOOSE - CARGO") {
      return [
        { key: "uom" },
        { key: "productName" },
        { key: "actualWt" },
        { key: "chargedWt" },
      ];
    }
    // NON-UNIFORM - GENERAL CARGO
    return [
      { key: "nos" },
      { key: "productName" },
      { key: "uom" },
      { key: "length" },
      { key: "width" },
      { key: "height" },
      { key: "actualWt" },
      { key: "chargedWt" },
    ];
  };

  const focusNextPackField = (rowId, currentFieldKey) => {
    const row = packRows.find(r => r._id === rowId);
    if (!row) return;
    
    const columns = getPackColumns(row.packType);
    const currentIndex = columns.findIndex(c => c.key === currentFieldKey);
    const rowIndex = packRows.findIndex(r => r._id === rowId);
    
    if (currentIndex !== -1 && currentIndex < columns.length - 1) {
      const nextKey = columns[currentIndex + 1].key;
      const refs = packInputRefs.current[rowId];
      if (refs && refs[nextKey]) {
        setTimeout(() => refs[nextKey].focus(), 50);
      }
    } else if (currentIndex === columns.length - 1) {
      if (rowIndex < packRows.length - 1) {
        const nextRowId = packRows[rowIndex + 1]._id;
        const nextRowColumns = getPackColumns(packRows[rowIndex + 1].packType);
        const firstKey = nextRowColumns[0]?.key;
        const refs = packInputRefs.current[nextRowId];
        if (refs && refs[firstKey]) {
          setTimeout(() => refs[firstKey].focus(), 50);
        }
      } else {
        addRow();
      }
    }
  };

  const focusPrevPackField = (rowId, currentFieldKey) => {
    const row = packRows.find(r => r._id === rowId);
    if (!row) return;
    
    const columns = getPackColumns(row.packType);
    const currentIndex = columns.findIndex(c => c.key === currentFieldKey);
    const rowIndex = packRows.findIndex(r => r._id === rowId);
    
    if (currentIndex > 0) {
      const prevKey = columns[currentIndex - 1].key;
      const refs = packInputRefs.current[rowId];
      if (refs && refs[prevKey]) {
        setTimeout(() => refs[prevKey].focus(), 50);
      }
    } else if (currentIndex === 0) {
      if (rowIndex > 0) {
        const prevRowId = packRows[rowIndex - 1]._id;
        const prevRowColumns = getPackColumns(packRows[rowIndex - 1].packType);
        const lastKey = prevRowColumns[prevRowColumns.length - 1]?.key;
        const refs = packInputRefs.current[prevRowId];
        if (refs && refs[lastKey]) {
          setTimeout(() => refs[lastKey].focus(), 50);
        }
      }
    }
  };

  /** =========================
   * SAVE ORDER FUNCTION
   ========================= */
  const handleSave = async () => {
    if (!top.branch) {
      alert("Please select a branch");
      return;
    }
    
    const hasInvalidPlantRows = plantRows.some(row => !row.plantCode);
    if (hasInvalidPlantRows) {
      alert("Please select plant for all plant rows");
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
      
      const packDataGrouped = {
        PALLETIZATION: [],
        'UNIFORM - BAGS/BOXES': [],
        'LOOSE - CARGO': [],
        'NON-UNIFORM - GENERAL CARGO': []
      };
      
      packRows.forEach(row => {
        if (row.packType === "PALLETIZATION") {
          packDataGrouped.PALLETIZATION.push({
            noOfPallets: num(row.noOfPallets),
            unitPerPallets: num(row.unitPerPallets),
            totalPkgs: num(row.totalPkgs),
            pkgsType: row.pkgsType || "",
            uom: row.uom || "MT",
            skuSize: row.skuSize || "",
            packWeight: num(row.packWeight),
            productId: row.productId || null,
            productName: row.productName || "",
            wtLtr: num(row.wtLtr),
            actualWt: num(row.actualWt),
            chargedWt: num(row.chargedWt),
            wtUom: row.wtUom || "MT",
            isUniform: row.isUniform || false
          });
        } else if (row.packType === "UNIFORM - BAGS/BOXES") {
          packDataGrouped['UNIFORM - BAGS/BOXES'].push({
            totalPkgs: num(row.totalPkgs),
            pkgsType: row.pkgsType || "",
            uom: row.uom || "MT",
            skuSize: row.skuSize || "",
            packWeight: num(row.packWeight),
            productId: row.productId || null,
            productName: row.productName || "",
            wtLtr: num(row.wtLtr),
            actualWt: num(row.actualWt),
            chargedWt: num(row.chargedWt),
            wtUom: row.wtUom || "MT"
          });
        } else if (row.packType === "LOOSE - CARGO") {
          packDataGrouped['LOOSE - CARGO'].push({
            uom: row.uom || "MT",
            productId: row.productId || null,
            productName: row.productName || "",
            actualWt: num(row.actualWt),
            chargedWt: num(row.chargedWt)
          });
        } else if (row.packType === "NON-UNIFORM - GENERAL CARGO") {
          packDataGrouped['NON-UNIFORM - GENERAL CARGO'].push({
            nos: num(row.nos),
            productId: row.productId || null,
            productName: row.productName || "",
            uom: row.uom || "MT",
            length: num(row.length),
            width: num(row.width),
            height: num(row.height),
            actualWt: num(row.actualWt),
            chargedWt: num(row.chargedWt)
          });
        }
      });
      
      Object.keys(packDataGrouped).forEach(key => {
        if (packDataGrouped[key].length === 0) {
          delete packDataGrouped[key];
        }
      });

      const payload = {
        branch: top.branch,
        branchName: top.branchName,
        branchCode: top.branchCode,
        subCompanyId: top.subCompanyId || null,
        subCompanyName: top.subCompanyName || '',
        subCompanyCode: top.subCompanyCode || '',
        delivery: top.delivery,
        date: top.date,
        customerId: selectedCustomer?._id || null,
        customerCode: selectedCustomer?.customerCode || '',
        customerName: selectedCustomer?.customerName || '',
        contactPerson: selectedCustomer?.contactPersonName || '',
        partyName: selectedCustomer?.customerName || top.partyName || '',
        
        plantRows: plantRows.map(row => ({
          plantCode: row.plantCode || '',
          plantName: row.plantName || '',
          plantCodeValue: row.plantCodeValue || '',
          orderType: row.orderType || "Sales",
          pinCode: row.pinCode || "",
          from: row.from || null,
          fromName: row.fromName || "",
          fromState: row.fromState || "",
          to: row.to || null,
          toName: row.toName || "",
          taluka: row.taluka || "",
          talukaName: row.talukaName || "",
          district: row.district || "",
          districtName: row.districtName || "",
          state: row.state || "",
          stateName: row.stateName || "",
          country: row.country || "",
          countryName: row.countryName || "",
          weight: num(row.weight) || 0,
          status: row.status || "Open",
          rate: 0,
          locationRate: 0,
          collectionCharges: num(row.collectionCharges) || 0,
          cancellationCharges: row.cancellationCharges || 'Nil',
          loadingCharges: row.loadingCharges || 'Nil',
          otherCharges: num(row.otherCharges) || 0,
          localStatus: row.localStatus || 'unknown',
          localStatusLabel: row.localStatusLabel || 'Unknown'
        })),
        
        packData: packDataGrouped,
        branches: branches,
        plants: plants,
        countries: countries,
        states: states,
        districts: districts
      };
      
      const res = await fetch('/api/order-panel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Failed to save order: ${res.status}`);
      }

      setSaveSuccess(true);
      setOrderNumber(data.data?.orderPanelNo || "Generated");
      
      const orderPanelNo = data.data?.orderPanelNo || data.data?.orderNo || "Generated";
      alert(`✅ Order saved successfully!\nOrder Panel Number: ${orderPanelNo}`);
      
      resetForm();
      
    } catch (error) {
      console.error('Error saving order:', error);
      setSaveError(error.message || 'Failed to save order');
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  /** =========================
   * RESET FORM FUNCTION
   ========================= */
  const resetForm = () => {
    setTop({
      orderNo: "",
      branch: "",
      branchName: "",
      branchCode: "",
      subCompanyId: "",
      subCompanyName: "",
      subCompanyCode: "",
      delivery: "Normal",
      date: new Date().toISOString().split('T')[0],
      partyName: "",
      collectionCharges: "",
      cancellationCharges: "",
      loadingCharges: "",
      otherCharges: "",
      customerId: "",
      customerCode: "",
      customerName: "",
      contactPerson: "",
    });
    
    setPlantRows([defaultPlantRow()]);
    
    setPackRows([{ ...defaultRow("PALLETIZATION"), packType: "PALLETIZATION" }]);
    setHasReplacedInitialPackRow(false);
    
    setSelectedCustomer(null);
    setCustomerSearchQuery("");
    setFilteredCustomers([]);
    setPincodeInput({});
    setShowCityDropdown({});
    setCityOptionsByRow({});
    setShowCharges(false);
    
    setActivePack("PALLETIZATION");
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ Register refs for plant rows
  useEffect(() => {
    plantRows.forEach(row => {
      const refs = [
        { key: 'plantCode', ref: plantCodeRefs },
        { key: 'plantName', ref: plantNameRefs },
        { key: 'orderType', ref: orderTypeRefs },
        { key: 'pinCode', ref: pinCodeRefs },
        { key: 'from', ref: fromRefs },
        { key: 'to', ref: toRefs },
        { key: 'taluka', ref: talukaRefs },
        { key: 'district', ref: districtRefs },
        { key: 'state', ref: stateRefs },
        { key: 'country', ref: countryRefs },
        { key: 'weight', ref: weightRefs },
        { key: 'status', ref: statusRefs },
        { key: 'collectionCharges', ref: collectionChargesRefs },
        { key: 'cancellationCharges', ref: cancellationChargesRefs },
        { key: 'loadingCharges', ref: loadingChargesRefs },
        { key: 'otherCharges', ref: otherChargesRefs }
      ];
      refs.forEach(({ key, ref }) => {
        if (!ref.current[row._id]) {
          ref.current[row._id] = null;
        }
      });
    });
  }, [plantRows]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* ===== Top Bar ===== */}
      <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-full px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/order-panel')}
                className="text-sky-600 hover:text-sky-800 font-medium text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to List
              </button>
              <div className="text-lg font-extrabold text-slate-900">
                Create New Order Panel
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              ⚡ Press <kbd className="px-1 py-0.5 bg-slate-200 rounded text-xs">Enter</kbd> to move to next field, 
              <kbd className="px-1 py-0.5 bg-slate-200 rounded text-xs ml-1">Backspace</kbd> (empty) to go back
            </div>
            {saveSuccess && (
              <div className="text-sm text-green-600 font-medium">
                ✅ Order saved successfully! Order Number: {orderNumber}
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
              onClick={handleSave}
              disabled={saving}
              className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition ${
                saving 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-700'
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
              ) : 'Save Order'}
            </button>
          </div>
        </div>
      </div>

      {/* ===== Main Layout ===== */}
      <div className="mx-auto max-w-full p-4">
        {/* Header info */}
        <Card title="Order Details">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-4">
              <label className="text-xs font-bold text-slate-600">Order No</label>
              <div className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                {orderNumber || "Auto-generated on save"}
              </div>
            </div>
            
            <div className="col-span-12 md:col-span-4 relative">
              <label className="text-xs font-bold text-slate-600">Branch *</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SearchableDropdown
                    items={branches}
                    selectedId={top.branch}
                    onSelect={handleBranchSelect}
                    placeholder="Search branch... *"
                    required={true}
                    displayField="name"
                    codeField="code"
                    onOpen={fetchBranches}
                    inputRef={(el) => { branchRef.current = el; }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (subCompanyRef.current) subCompanyRef.current.focus();
                      } else if (e.key === 'Backspace' && e.target.value === '') {
                        e.preventDefault();
                        // Stay on current field
                      }
                    }}
                  />
                </div>
                <button
                  onClick={() => router.push('/admin/branches2')}
                  className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 transition whitespace-nowrap"
                  title="Create New Branch"
                >
                  Create
                </button>
              </div>
            </div>

            {/* Sub-Company Dropdown */}
            <div className="col-span-12 md:col-span-4">
              <label className="text-xs font-bold text-slate-600">Sub-Company</label>
              <select
                ref={subCompanyRef}
                value={top.subCompanyId || ''}
                onFocus={fetchSubCompanies}
                onChange={(e) => {
                  const subCompanyId = e.target.value;
                  const selected = subCompanies.find(sc => sc._id === subCompanyId);
                  setTop(prev => ({
                    ...prev,
                    subCompanyId: subCompanyId,
                    subCompanyName: selected?.name || '',
                    subCompanyCode: selected?.code || ''
                  }));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (deliveryRef.current) deliveryRef.current.focus();
                  } else if (e.key === 'Backspace' && e.target.value === '') {
                    e.preventDefault();
                    if (branchRef.current) branchRef.current.focus();
                  }
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
            </div>
            
            <div className="col-span-12 md:col-span-4">
              <SelectWithRef
                ref={deliveryRef}
                label="Delivery"
                value={top.delivery}
                onChange={(v) => setTop((p) => ({ ...p, delivery: v }))}
                options={DELIVERY_OPTIONS}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (dateRef.current) dateRef.current.focus();
                  } else if (e.key === 'Backspace' && e.target.value === '') {
                    e.preventDefault();
                    if (subCompanyRef.current) subCompanyRef.current.focus();
                  }
                }}
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <InputWithRef
                ref={dateRef}
                type="date"
                label="Date"
                value={top.date}
                onChange={(v) => setTop((p) => ({ ...p, date: v }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (partyNameRef.current) partyNameRef.current.focus();
                  } else if (e.key === 'Backspace' && e.target.value === '') {
                    e.preventDefault();
                    if (deliveryRef.current) deliveryRef.current.focus();
                  }
                }}
              />
            </div>
            
            <div className="col-span-12 md:col-span-8 relative">
              <label className="text-xs font-bold text-slate-600">Party Name *</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    ref={partyNameRef}
                    type="text"
                    value={selectedCustomer ? selectedCustomer.customerName : customerSearchQuery}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                    onFocus={handleCustomerInputFocus}
                    onBlur={handleCustomerInputBlur}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                    placeholder="Search customer by name... *"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const firstRowId = plantRows[0]?._id;
                        if (firstRowId && plantCodeRefs.current[firstRowId]) {
                          plantCodeRefs.current[firstRowId].focus();
                        }
                      } else if (e.key === 'Backspace' && e.target.value === '') {
                        e.preventDefault();
                        if (dateRef.current) dateRef.current.focus();
                      }
                    }}
                  />
                  
                  {showCustomerDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {customerSearch.loading ? (
                        <div className="p-3 text-center text-sm text-slate-500">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500 mx-auto"></div>
                          <p className="mt-1">Loading customers...</p>
                        </div>
                      ) : filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => (
                          <div
                            key={customer._id}
                            onMouseDown={() => handleSelectCustomer(customer)}
                            className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
                          >
                            <div className="font-medium text-slate-800">
                              {customer.customerName}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Code: {customer.customerCode}
                              {customer.contactPersonName && ` • Contact: ${customer.contactPersonName}`}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-sm text-slate-500">
                          {customerSearchQuery.trim() ? 
                            `No customers found for "${customerSearchQuery}"` : 
                            "No customers available"
                          }
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-4">
          <Card title="Plant Code / Route">
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-slate-600">
                Manage plant routes and distribution - Enter pincode to auto-fill location fields
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCharges(!showCharges)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    showCharges 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {showCharges ? 'Hide Charges' : 'Charges'}
                </button>
                <button
                  onClick={addPlantRow}
                  className="rounded-xl bg-yellow-600 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-700 transition"
                >
                  + Add Row
                </button>
              </div>
            </div>
            <PlantGridTable
              rows={plantRows}
              onChange={updatePlantRow}
              onRemove={removePlantRow}
              onPlantChange={handlePlantChange}
              onPincodeChange={handlePincodeChange}
              onSelectCity={handleSelectCity}
              plants={plants}
              branches={branches}
              locations={locations}
              onRefreshPlants={fetchPlants}
              onRefreshLocations={fetchLocations}
              pincodeAPI={pincodeAPI}
              pincodeInput={pincodeInput}
              showCityDropdown={showCityDropdown}
              setShowCityDropdown={setShowCityDropdown}
              cityOptionsByRow={cityOptionsByRow}
              showCharges={showCharges}
              plantCodeRefs={plantCodeRefs}
              plantNameRefs={plantNameRefs}
              orderTypeRefs={orderTypeRefs}
              pinCodeRefs={pinCodeRefs}
              fromRefs={fromRefs}
              toRefs={toRefs}
              talukaRefs={talukaRefs}
              districtRefs={districtRefs}
              stateRefs={stateRefs}
              countryRefs={countryRefs}
              weightRefs={weightRefs}
              statusRefs={statusRefs}
              collectionChargesRefs={collectionChargesRefs}
              cancellationChargesRefs={cancellationChargesRefs}
              loadingChargesRefs={loadingChargesRefs}
              otherChargesRefs={otherChargesRefs}
              focusNextPlantField={focusNextPlantField}
              focusPrevPlantField={focusPrevPlantField}
            />
          </Card>
          
          {/* PACK TYPE SECTIONS - Single table with all rows */}
          <div className="mt-4">
            <Card title="Pack Type">
              {/* Pack Type Selector for adding new rows */}
              <div className="mb-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold text-slate-700">Select Pack Type to Add:</div>
                  <div className="flex items-center gap-2">
                    <select
                      value={activePack}
                      onChange={(e) => handlePackTypeChange(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                    >
                      {PACK_TYPES.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={addRow}
                      className="rounded-xl bg-yellow-600 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-700 transition whitespace-nowrap"
                    >
                      + Add Row
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Single Table showing ALL rows with Pack Type column */}
              <PackTypeTable
                rows={packRows}
                onChange={updatePackRow}
                onRemove={removeRow}
                onDuplicate={duplicateRow}
                pkgTypes={pkgTypes}
                uoms={uoms}
                skuSizes={skuSizes}
                items={items}
                onRefreshItems={fetchItems}
                onRefreshPkgTypes={fetchPkgTypes}
                onRefreshUOMs={fetchUOMs}
                onRefreshSKUSizes={fetchSKUSizes}
                packInputRefs={packInputRefs}
                focusNextPackField={focusNextPackField}
                focusPrevPackField={focusPrevPackField}
                onNavigateToCreate={() => router.push('/admin/pkg-type?returnUrl=/admin/order-panel/create')}
                onNavigateToCreateUOM={() => router.push('/admin/uoms?returnUrl=/admin/order-panel/create')}
                onNavigateToCreateSKUSize={() => router.push('/admin/sku-sizes?returnUrl=/admin/order-panel/create')}
                onNavigateToCreateItem={() => router.push('/admin/items?returnUrl=/admin/order-panel/create')}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/** =========================
 * COMPONENTS
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

// ✅ Input with ref forwarding and Enter/Backspace key support
const InputWithRef = React.forwardRef(({ label, value, onChange, col = "", type = "text", required = false, onKeyDown }, ref) => {
  return (
    <div className={col}>
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={onKeyDown}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        required={required}
      />
    </div>
  );
});
InputWithRef.displayName = 'InputWithRef';

// ✅ Select with ref forwarding and Enter/Backspace key support
const SelectWithRef = React.forwardRef(({ label, value, onChange, options = [], col = "", onKeyDown }, ref) => {
  return (
    <div className={col}>
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <select
        ref={ref}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={onKeyDown}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
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
});
SelectWithRef.displayName = 'SelectWithRef';

/** =========================
 * Searchable Dropdown Component with Keyboard Navigation
 ========================= */
function SearchableDropdown({ 
  items, 
  selectedId, 
  onSelect, 
  placeholder = "Search...",
  required = false,
  displayField = 'name',
  codeField = 'code',
  disabled = false,
  inputRef,
  onOpen,
  onKeyDown
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, direction: 'down' });
  const ref = useRef(null);
  const dropdownRef = useRef(null);

  const getDisplayValue = useCallback((item) => {
    if (!item) return "";
    const display = item[displayField] || "";
    const code = item[codeField] ? `(${item[codeField]})` : "";
    return `${display} ${code}`.trim();
  }, [displayField, codeField]);

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
  }, [items, selectedId, getDisplayValue]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setHighlightedIndex(-1);
    
    if (!query.trim()) {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item => {
        const searchLower = query.toLowerCase();
        return (
          (item[displayField] && item[displayField].toLowerCase().includes(searchLower)) ||
          (item[codeField] && item[codeField].toLowerCase().includes(searchLower))
        );
      });
      setFilteredItems(filtered);
    }
    
    if (selectedItem && query !== getDisplayValue(selectedItem)) {
      setSelectedItem(null);
      onSelect?.(null);
    }
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setSearchQuery(getDisplayValue(item));
    setShowDropdown(false);
    onSelect?.(item);
  };

  const handleKeyboardNavigation = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!showDropdown) handleInputFocus();
      if (filteredItems.length) {
        setHighlightedIndex((index) => event.key === 'ArrowDown'
          ? (index + 1) % filteredItems.length
          : (index <= 0 ? filteredItems.length - 1 : index - 1));
      }
      return;
    }
    if ((event.key === 'Enter' || event.key === 'Tab') && showDropdown && filteredItems.length) {
      if (event.key === 'Enter') event.preventDefault();
      handleSelectItem(filteredItems[highlightedIndex >= 0 ? highlightedIndex : 0]);
      return;
    }
    if (event.key === 'Escape' && showDropdown) {
      event.preventDefault();
      setShowDropdown(false);
      return;
    }
    onKeyDown?.(event);
  };

  const handleInputFocus = () => {
    onOpen?.();
    if (!showDropdown && ref.current) {
      setFilteredItems(items);
      
      const rect = ref.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const dropdownHeight = 300;
      const direction = spaceBelow < dropdownHeight ? 'up' : 'down';
      
      setDropdownPosition({
        top: direction === 'down' ? rect.bottom + window.scrollY : rect.top + window.scrollY - dropdownHeight,
        left: rect.left + window.scrollX,
        width: rect.width,
        direction: direction
      });
      
      setShowDropdown(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (dropdownRef.current && !dropdownRef.current.contains(document.activeElement)) {
        setShowDropdown(false);
        if (selectedItem) {
          setSearchQuery(getDisplayValue(selectedItem));
        }
      }
    }, 200);
  };

  // Set the ref
  useEffect(() => {
    if (inputRef) {
      inputRef(ref.current);
    }
  }, [inputRef]);

  return (
    <>
      <div className="relative w-full">
        <input
          ref={ref}
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyboardNavigation}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:opacity-50"
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
        />
      </div>
      
      {showDropdown && (
        <div 
          ref={dropdownRef}
          className="fixed z-[100000] bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxHeight: '300px',
            minWidth: '200px'
          }}
        >
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item._id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectItem(item);
                }}
                className={`p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
                  selectedItem?._id === item._id || highlightedIndex === filteredItems.indexOf(item) ? 'bg-sky-100' : ''
                }`}
              >
                <div className="font-medium text-slate-800 text-sm">
                  {item[displayField]}
                </div>
                {item[codeField] && (
                  <div className="text-xs text-slate-500 mt-0.5">
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
    </>
  );
}

// ============================================================
// PLANT GRID TABLE COMPONENT (with Enter/Backspace key support)
// ============================================================
function PlantGridTable({ 
  rows, 
  onChange, 
  onRemove, 
  onPlantChange,
  onPincodeChange,
  onSelectCity,
  plants,
  branches,
  locations,
  onRefreshPlants,
  onRefreshLocations,
  pincodeAPI,
  pincodeInput,
  showCityDropdown,
  setShowCityDropdown,
  cityOptionsByRow,
  showCharges = false,
  plantCodeRefs,
  plantNameRefs,
  orderTypeRefs,
  pinCodeRefs,
  fromRefs,
  toRefs,
  talukaRefs,
  districtRefs,
  stateRefs,
  countryRefs,
  weightRefs,
  statusRefs,
  collectionChargesRefs,
  cancellationChargesRefs,
  loadingChargesRefs,
  otherChargesRefs,
  focusNextPlantField,
  focusPrevPlantField
}) {
  const [cityDropdownPosition, setCityDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [activeCityRowId, setActiveCityRowId] = useState(null);
  const inputRefs = useRef({});

  const handleBranchSelect = (rowId, field, branch) => {
    if (branch) {
      onChange(rowId, field, branch._id);
      if (field === 'from') {
        onChange(rowId, 'fromName', branch.name);
        onChange(rowId, 'fromState', branch.state || '');
        updateLocalStatus(rowId);
      } else if (field === 'to') {
        onChange(rowId, 'toName', branch.name);
      }
    } else {
      onChange(rowId, field, null);
      if (field === 'from') {
        onChange(rowId, 'fromName', '');
        onChange(rowId, 'fromState', '');
      } else if (field === 'to') {
        onChange(rowId, 'toName', '');
      }
    }
  };

  const handleLocationSelect = (rowId, field, location) => {
    if (location) {
      onChange(rowId, field, location._id);
      if (field === 'from') {
        onChange(rowId, 'fromName', location.name);
        onChange(rowId, 'fromState', location.state || '');
        updateLocalStatus(rowId);
      } else if (field === 'to') {
        onChange(rowId, 'toName', location.name);
      }
    } else {
      onChange(rowId, field, null);
      if (field === 'from') {
        onChange(rowId, 'fromName', '');
        onChange(rowId, 'fromState', '');
      } else if (field === 'to') {
        onChange(rowId, 'toName', '');
      }
    }
  };

  const updateLocalStatus = (rowId) => {
    const row = rows.find(r => r._id === rowId);
    if (row) {
      const fromState = row.fromState?.trim().toUpperCase() || '';
      const toState = row.stateName?.trim().toUpperCase() || '';
      
      if (!fromState || !toState) {
        onChange(rowId, 'localStatus', 'unknown');
        onChange(rowId, 'localStatusLabel', 'Unknown');
      } else if (fromState === toState) {
        onChange(rowId, 'localStatus', 'local');
        onChange(rowId, 'localStatusLabel', 'Local');
      } else {
        onChange(rowId, 'localStatus', 'not-local');
        onChange(rowId, 'localStatusLabel', 'Not Local');
      }
    }
  };

  const handleCityInputClick = (event, rowId) => {
    const cityOptions = cityOptionsByRow[rowId];
    if (cityOptions && cityOptions.length > 0) {
      const rect = event.target.getBoundingClientRect();
      setCityDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
      setActiveCityRowId(rowId);
    }
  };

  const cols = [
    { key: "plantCode", label: "Plant Code *", width: "200px" },
    { key: "plantName", label: "Plant Name", width: "200px" },
    { key: "orderType", label: "Order Type", width: "150px" },
    { key: "pinCode", label: "Pin Code", width: "120px" },
    { key: "from", label: "From", width: "250px" },
    { key: "to", label: "To / City", width: "220px" },
    { key: "taluka", label: "Taluka", width: "150px" },
    { key: "district", label: "District", width: "150px" },
    { key: "state", label: "State", width: "150px" },
    { key: "localStatus", label: "Local/Not Local", width: "140px" },
    { key: "country", label: "Country", width: "150px" },
    { key: "weight", label: "Weight", width: "100px" },
    { key: "status", label: "Status", width: "120px" },
  ];

  if (showCharges) {
    cols.push(
      { key: "collectionCharges", label: "Collection Charges", width: "130px" },
      { key: "cancellationCharges", label: "Cancellation Charges", width: "140px" },
      { key: "loadingCharges", label: "Loading Charges", width: "120px" },
      { key: "otherCharges", label: "Other Charges", width: "120px" }
    );
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeCityRowId && !event.target.closest('.city-dropdown-container') && !event.target.closest('.city-input-field')) {
        setActiveCityRowId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeCityRowId]);

  // Update dropdown position on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (activeCityRowId && inputRefs.current[activeCityRowId]) {
        const rect = inputRefs.current[activeCityRowId].getBoundingClientRect();
        setCityDropdownPosition({
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
  }, [activeCityRowId]);

  return (
    <>
      <div className="rounded-xl border border-yellow-300 overflow-x-auto">
        <table className="min-w-max w-full text-sm">
          <thead className="sticky top-0 bg-yellow-400 z-10">
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  style={{ minWidth: c.width, width: c.width }}
                  className="border border-yellow-500 px-3 py-3 text-xs font-extrabold text-slate-900 text-center"
                >
                  {c.label}
                  {(c.key === "plantName" || c.key === "taluka" || c.key === "district" || c.key === "state" || c.key === "country") && 
                    <span className="ml-1 text-xs text-blue-600">*Auto</span>
                  }
                </th>
              ))}
              <th style={{ minWidth: "100px", width: "100px" }} className="border border-yellow-500 px-3 py-3 text-xs font-extrabold text-slate-900 text-center">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const isPincodeLoading = pincodeAPI.loading && pincodeInput[r._id]?.length === 6;
              const cityOptions = cityOptionsByRow[r._id] || [];
              const hasCities = cityOptions.length > 0;
              
              return (
                <tr key={r._id} className="hover:bg-yellow-50 even:bg-slate-50">
                  {/* Plant Code */}
                  <td className="border border-yellow-300 px-2 py-2">
                    <TableSearchableDropdown
                      items={plants}
                      selectedId={r.plantCode}
                      onSelect={(plant) => {
                        if (plant) {
                          onPlantChange(r._id, plant._id);
                        } else {
                          onChange(r._id, 'plantCode', '');
                          onChange(r._id, 'plantName', '');
                          onChange(r._id, 'plantCodeValue', '');
                        }
                      }}
                      placeholder="Search plant..."
                      required={true}
                      displayField="name"
                      codeField="code"
                      onOpen={onRefreshPlants}
                      inputRef={(el) => { plantCodeRefs.current[r._id] = el; }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          focusNextPlantField(r._id, 'plantCode');
                        } else if (e.key === 'Backspace' && e.target.value === '') {
                          e.preventDefault();
                          focusPrevPlantField(r._id, 'plantCode');
                        }
                      }}
                    />
                  </td>

                  {/* Plant Name */}
                  <td className="border border-yellow-300 px-2 py-2">
                    <input
                      ref={(el) => plantNameRefs.current[r._id] = el}
                      type="text"
                      value={r.plantName || ""}
                      readOnly
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm outline-none"
                      placeholder="Auto-filled"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          focusNextPlantField(r._id, 'plantName');
                        } else if (e.key === 'Backspace' && e.target.value === '') {
                          e.preventDefault();
                          focusPrevPlantField(r._id, 'plantName');
                        }
                      }}
                    />
                  </td>

                  {/* Order Type */}
                  <td className="border border-yellow-300 px-2 py-2">
                    <select
                      ref={(el) => orderTypeRefs.current[r._id] = el}
                      value={r.orderType || ""}
                      onChange={(e) => onChange(r._id, 'orderType', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          focusNextPlantField(r._id, 'orderType');
                        } else if (e.key === 'Backspace' && e.target.value === '') {
                          e.preventDefault();
                          focusPrevPlantField(r._id, 'orderType');
                        }
                      }}
                    >
                      <option value="">Select Order Type</option>
                      {ORDER_TYPES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Pin Code */}
                  <td className="border border-yellow-300 px-2 py-2">
                    <div className="relative">
                      <input
                        ref={(el) => pinCodeRefs.current[r._id] = el}
                        type="text"
                        value={r.pinCode || ""}
                        onChange={(e) => onPincodeChange(r._id, e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        placeholder="Enter 6-digit pincode"
                        maxLength="6"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            focusNextPlantField(r._id, 'pinCode');
                          } else if (e.key === 'Backspace' && e.target.value === '') {
                            e.preventDefault();
                            focusPrevPlantField(r._id, 'pinCode');
                          }
                        }}
                      />
                      {isPincodeLoading && (
                        <div className="absolute right-2 top-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-500"></div>
                        </div>
                      )}
                    </div>
                    {pincodeAPI.error && r.pinCode?.length === 6 && (
                      <div className="text-xs text-red-500 mt-1">{pincodeAPI.error}</div>
                    )}
                  </td>

                  {/* From */}
                  <td className="border border-yellow-300 px-2 py-2">
                    <div className="flex flex-col gap-1">
                      <TableSearchableDropdown
                        items={locations}
                        selectedId={r.from}
                        onSelect={(location) => handleLocationSelect(r._id, 'from', location)}
                        placeholder="Search location..."
                        displayField="name"
                        codeField="code"
                        onOpen={onRefreshLocations}
                        renderItem={(item) => (
                          <div>
                            <div className="font-medium text-slate-800 text-sm">
                              {item.name}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              State: {item.state || 'Unknown'}
                            </div>
                          </div>
                        )}
                        inputRef={(el) => { fromRefs.current[r._id] = el; }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            focusNextPlantField(r._id, 'from');
                          } else if (e.key === 'Backspace' && e.target.value === '') {
                            e.preventDefault();
                            focusPrevPlantField(r._id, 'from');
                          }
                        }}
                      />
                      {r.fromState && (
                        <div className="text-xs text-blue-600 font-medium px-1">
                          State: {r.fromState}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* To / City */}
                  <td className="border border-yellow-300 px-2 py-2">
                    <div className="relative city-dropdown-container">
                      <input
                        ref={el => {
                          inputRefs.current[r._id] = el;
                          toRefs.current[r._id] = el;
                        }}
                        type="text"
                        value={r.toName || ""}
                        readOnly={hasCities}
                        onChange={(e) => {
                          if (!hasCities) {
                            onChange(r._id, 'toName', e.target.value);
                            onChange(r._id, 'to', null);
                          }
                        }}
                        onClick={(e) => {
                          if (hasCities) {
                            handleCityInputClick(e, r._id);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (hasCities && cityOptions.length > 0) {
                              handleCityInputClick(e, r._id);
                            } else {
                              focusNextPlantField(r._id, 'to');
                            }
                          } else if (e.key === 'Backspace' && e.target.value === '') {
                            e.preventDefault();
                            focusPrevPlantField(r._id, 'to');
                          }
                        }}
                        className={`city-input-field w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
                          hasCities ? 'cursor-pointer bg-yellow-50 hover:bg-yellow-100' : ''
                        }`}
                        placeholder={hasCities ? "Click to select city/area" : "Enter city name"}
                      />
                      {hasCities && (
                        <div className="absolute right-2 top-2 text-gray-400 pointer-events-none">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Taluka */}
                  <td className="border border-yellow-300 px-2 py-2">
                    <input
                      ref={(el) => talukaRefs.current[r._id] = el}
                      type="text"
                      value={r.talukaName || r.taluka || ""}
                      readOnly
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm outline-none"
                      placeholder="Auto-filled"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          focusNextPlantField(r._id, 'taluka');
                        } else if (e.key === 'Backspace' && e.target.value === '') {
                          e.preventDefault();
                          focusPrevPlantField(r._id, 'taluka');
                        }
                      }}
                    />
                  </td>

                  {/* District */}
                  <td className="border border-yellow-300 px-2 py-2">
                    <input
                      ref={(el) => districtRefs.current[r._id] = el}
                      type="text"
                      value={r.districtName || r.district || ""}
                      readOnly
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm outline-none"
                      placeholder="Auto-filled"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          focusNextPlantField(r._id, 'district');
                        } else if (e.key === 'Backspace' && e.target.value === '') {
                          e.preventDefault();
                          focusPrevPlantField(r._id, 'district');
                        }
                      }}
                    />
                  </td>

                  {/* State */}
                  <td className="border border-yellow-300 px-2 py-2">
                    <input
                      ref={(el) => stateRefs.current[r._id] = el}
                      type="text"
                      value={r.stateName || r.state || ""}
                      readOnly
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm outline-none"
                      placeholder="Auto-filled"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          focusNextPlantField(r._id, 'state');
                        } else if (e.key === 'Backspace' && e.target.value === '') {
                          e.preventDefault();
                          focusPrevPlantField(r._id, 'state');
                        }
                      }}
                    />
                  </td>

                  {/* Local Status */}
                  <td className="border border-yellow-300 px-2 py-2 text-center">
                    {r.fromState && r.stateName ? (
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        r.fromState.trim().toUpperCase() === r.stateName.trim().toUpperCase()
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}>
                        {r.fromState.trim().toUpperCase() === r.stateName.trim().toUpperCase() ? '✅ Local' : '❌ Not Local'}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>

                  {/* Country */}
                  <td className="border border-yellow-300 px-2 py-2">
                    <input
                      ref={(el) => countryRefs.current[r._id] = el}
                      type="text"
                      value={r.countryName || r.country || ""}
                      readOnly
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm outline-none"
                      placeholder="Auto-filled"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          focusNextPlantField(r._id, 'country');
                        } else if (e.key === 'Backspace' && e.target.value === '') {
                          e.preventDefault();
                          focusPrevPlantField(r._id, 'country');
                        }
                      }}
                    />
                  </td>

                  {/* Weight */}
                  <td className="border border-yellow-300 px-2 py-2">
                    <input
                      ref={(el) => weightRefs.current[r._id] = el}
                      type="number"
                      value={r.weight || ""}
                      onChange={(e) => onChange(r._id, 'weight', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                      placeholder="Weight"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          focusNextPlantField(r._id, 'weight');
                        } else if (e.key === 'Backspace' && e.target.value === '') {
                          e.preventDefault();
                          focusPrevPlantField(r._id, 'weight');
                        }
                      }}
                    />
                  </td>

                  {/* Status */}
                  <td className="border border-yellow-300 px-2 py-2">
                    <select
                      ref={(el) => statusRefs.current[r._id] = el}
                      value={r.status || ""}
                      onChange={(e) => onChange(r._id, 'status', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          focusNextPlantField(r._id, 'status');
                        } else if (e.key === 'Backspace' && e.target.value === '') {
                          e.preventDefault();
                          focusPrevPlantField(r._id, 'status');
                        }
                      }}
                    >
                      <option value="">Select Status</option>
                      {STATUSES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Charges Columns */}
                  {showCharges && (
                    <>
                      <td className="border border-yellow-300 px-2 py-2">
                        <input
                          ref={(el) => collectionChargesRefs.current[r._id] = el}
                          type="number"
                          value={r.collectionCharges || ""}
                          onChange={(e) => onChange(r._id, 'collectionCharges', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                          placeholder="Collection Charges"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              focusNextPlantField(r._id, 'collectionCharges');
                            } else if (e.key === 'Backspace' && e.target.value === '') {
                              e.preventDefault();
                              focusPrevPlantField(r._id, 'collectionCharges');
                            }
                          }}
                        />
                      </td>
                      <td className="border border-yellow-300 px-2 py-2">
                        <input
                          ref={(el) => cancellationChargesRefs.current[r._id] = el}
                          type="text"
                          value={r.cancellationCharges || ""}
                          onChange={(e) => onChange(r._id, 'cancellationCharges', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                          placeholder="Cancellation Charges"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              focusNextPlantField(r._id, 'cancellationCharges');
                            } else if (e.key === 'Backspace' && e.target.value === '') {
                              e.preventDefault();
                              focusPrevPlantField(r._id, 'cancellationCharges');
                            }
                          }}
                        />
                      </td>
                      <td className="border border-yellow-300 px-2 py-2">
                        <input
                          ref={(el) => loadingChargesRefs.current[r._id] = el}
                          type="text"
                          value={r.loadingCharges || ""}
                          onChange={(e) => onChange(r._id, 'loadingCharges', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                          placeholder="Loading Charges"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              focusNextPlantField(r._id, 'loadingCharges');
                            } else if (e.key === 'Backspace' && e.target.value === '') {
                              e.preventDefault();
                              focusPrevPlantField(r._id, 'loadingCharges');
                            }
                          }}
                        />
                      </td>
                      <td className="border border-yellow-300 px-2 py-2">
                        <input
                          ref={(el) => otherChargesRefs.current[r._id] = el}
                          type="number"
                          value={r.otherCharges || ""}
                          onChange={(e) => onChange(r._id, 'otherCharges', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                          placeholder="Other Charges"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              focusNextPlantField(r._id, 'otherCharges');
                            } else if (e.key === 'Backspace' && e.target.value === '') {
                              e.preventDefault();
                              focusPrevPlantField(r._id, 'otherCharges');
                            }
                          }}
                        />
                      </td>
                    </>
                  )}

                  {/* Action */}
                  <td className="border border-yellow-300 px-2 py-2 text-center">
                    <button
                      onClick={() => onRemove(r._id)}
                      className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-600 transition whitespace-nowrap"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
            
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols.length + 1} className="border border-yellow-300 px-4 py-8 text-center text-slate-400">
                  No plant routes added. Click "+ Add Row" to add a new route.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* City Dropdown - Portal style positioning */}
      {activeCityRowId && cityOptionsByRow[activeCityRowId] && cityOptionsByRow[activeCityRowId].length > 0 && (
        <div 
          className="fixed z-[99999] bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto"
          style={{
            position: 'fixed',
            top: `${cityDropdownPosition.top}px`,
            left: `${cityDropdownPosition.left}px`,
            width: `${cityDropdownPosition.width}px`,
            maxHeight: '300px',
            minWidth: '200px'
          }}
        >
          <div className="sticky top-0 bg-gray-50 px-3 py-2 text-xs font-semibold text-slate-600 border-b">
            Select Area/City
          </div>
          {cityOptionsByRow[activeCityRowId].map((loc, idx) => (
            <div
              key={idx}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelectCity(activeCityRowId, loc);
                setActiveCityRowId(null);
              }}
              className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
            >
              <div className="font-medium text-slate-800 text-sm">
                {loc.cityName}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {loc.districtName}, {loc.stateName}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** =========================
 * Table Searchable Dropdown Component
 ========================= */
function TableSearchableDropdown({ 
  items, 
  selectedId, 
  onSelect, 
  placeholder = "Search...",
  required = false,
  displayField = 'name',
  codeField = 'code',
  disabled = false,
  loading = false,
  renderItem = null,
  inputRef,
  onOpen,
  onKeyDown
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, direction: 'down' });
  const ref = useRef(null);
  const dropdownRef = useRef(null);

  const getDisplayValue = useCallback((item) => {
    if (!item) return "";
    const display = item[displayField] || "";
    const code = item[codeField] ? `(${item[codeField]})` : "";
    return `${display} ${code}`.trim();
  }, [displayField, codeField]);

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
  }, [items, selectedId, getDisplayValue]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setHighlightedIndex(-1);
    
    if (!query.trim()) {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item => {
        const searchLower = query.toLowerCase();
        return (
          (item[displayField] && item[displayField].toLowerCase().includes(searchLower)) ||
          (item[codeField] && item[codeField].toLowerCase().includes(searchLower))
        );
      });
      setFilteredItems(filtered);
    }
    
    if (selectedItem && query !== getDisplayValue(selectedItem)) {
      setSelectedItem(null);
      onSelect?.(null);
    }
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setSearchQuery(getDisplayValue(item));
    setShowDropdown(false);
    onSelect?.(item);
  };

  const handleKeyboardNavigation = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!showDropdown) handleInputFocus();
      if (filteredItems.length) {
        setHighlightedIndex((index) => event.key === 'ArrowDown'
          ? (index + 1) % filteredItems.length
          : (index <= 0 ? filteredItems.length - 1 : index - 1));
      }
      return;
    }
    if ((event.key === 'Enter' || event.key === 'Tab') && showDropdown && filteredItems.length) {
      if (event.key === 'Enter') event.preventDefault();
      handleSelectItem(filteredItems[highlightedIndex >= 0 ? highlightedIndex : 0]);
      return;
    }
    if (event.key === 'Escape' && showDropdown) {
      event.preventDefault();
      setShowDropdown(false);
      return;
    }
    onKeyDown?.(event);
  };

  const handleInputFocus = () => {
    onOpen?.();
    if (!showDropdown && ref.current) {
      setFilteredItems(items);
      
      const rect = ref.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const dropdownHeight = 300;
      const direction = spaceBelow < dropdownHeight ? 'up' : 'down';
      
      setDropdownPosition({
        top: direction === 'down' ? rect.bottom + window.scrollY : rect.top + window.scrollY - dropdownHeight,
        left: rect.left + window.scrollX,
        width: rect.width,
        direction: direction
      });
      
      setShowDropdown(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (dropdownRef.current && !dropdownRef.current.contains(document.activeElement)) {
        setShowDropdown(false);
        if (selectedItem) {
          setSearchQuery(getDisplayValue(selectedItem));
        }
      }
    }, 200);
  };

  // Set the ref
  useEffect(() => {
    if (inputRef) {
      inputRef(ref.current);
    }
  }, [inputRef]);

  return (
    <>
      <div className="relative w-full">
        <input
          ref={ref}
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyboardNavigation}
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:opacity-50"
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-2 top-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-500"></div>
          </div>
        )}
      </div>
      
      {showDropdown && (
        <div 
          ref={dropdownRef}
          className="fixed z-[100000] bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxHeight: '300px',
            minWidth: '200px'
          }}
        >
          {loading ? (
            <div className="p-3 text-center text-sm text-slate-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500 mx-auto"></div>
              <p className="mt-1">Loading...</p>
            </div>
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item._id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectItem(item);
                }}
                className={`p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
                  selectedItem?._id === item._id || highlightedIndex === filteredItems.indexOf(item) ? 'bg-sky-100' : ''
                }`}
              >
                {renderItem ? (
                  renderItem(item)
                ) : (
                  <>
                    <div className="font-medium text-slate-800 text-sm">
                      {item[displayField]}
                    </div>
                    {item[codeField] && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        Code: {item[codeField]}
                      </div>
                    )}
                  </>
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
    </>
  );
}

/** ===== Pack Type Table Component - Single Table with all rows ===== */
function PackTypeTable({ 
  rows, 
  onChange, 
  onRemove, 
  onDuplicate, 
  pkgTypes = [], 
  uoms = [], 
  skuSizes = [], 
  items = [],
  onRefreshItems,
  onRefreshPkgTypes,
  onRefreshUOMs,
  onRefreshSKUSizes,
  packInputRefs,
  focusNextPackField,
  focusPrevPackField,
  onNavigateToCreate, 
  onNavigateToCreateUOM, 
  onNavigateToCreateSKUSize,
  onNavigateToCreateItem
}) {
  
  const [showItemDropdown, setShowItemDropdown] = useState({});
  const [itemHighlightedIndex, setItemHighlightedIndex] = useState({});
  const [itemSearchQuery, setItemSearchQuery] = useState({});
  const [filteredItems, setFilteredItems] = useState({});
  const [itemDropdownPosition, setItemDropdownPosition] = useState({ top: 0, left: 0, width: 0, direction: 'down' });
  const [activeItemRowId, setActiveItemRowId] = useState(null);
  const itemInputRefs = useRef({});
  const itemDropdownRef = useRef({});

  // Keep each row's search result in sync with its current Item Master data.
  useEffect(() => {
    setItemSearchQuery(prev => {
      const next = { ...prev };
      rows.forEach(row => {
        const selectedItem = items.find((item) => item._id === row.productId);
        const displayName = selectedItem?.itemName || row.productName;
        if (displayName && (!next[row._id] || row.productId)) next[row._id] = displayName;
      });
      return next;
    });

    setFilteredItems(prev => {
      const next = {};
      rows.forEach(row => {
        const query = itemSearchQuery[row._id] || row.productName || "";
        const searchLower = query.toLowerCase();
        next[row._id] = !searchLower
          ? items
          : items.filter(item =>
              item.itemName?.toLowerCase().includes(searchLower) ||
              item.itemCode?.toLowerCase().includes(searchLower)
            );
      });
      return next;
    });
  }, [rows, items]);

  // Get columns based on pack type
  const getColumnsForRow = (packType) => {
    if (packType === "PALLETIZATION") {
      return [
        { key: "noOfPallets", label: "NO OF PALLETS", type: "number" },
        { key: "unitPerPallets", label: "UNIT PER PALLETS", type: "number" },
        { key: "totalPkgs", label: "TOTAL PKGS", type: "number", readOnly: true },
        { key: "pkgsType", label: "PKG TYPE", type: "select", options: pkgTypes, isDynamic: true },
        { key: "uom", label: "UOM", type: "select", options: uoms, isUOM: true },
        { key: "skuSize", label: "SKU - SIZE", type: "select", options: skuSizes, isSKUSize: true },
        { key: "packWeight", label: "PACK - WEIGHT", type: "number" },
        { key: "productName", label: "PRODUCT NAME", type: "select", options: items, isItem: true },
        { key: "wtLtr", label: "WT (LTR)", type: "number", readOnly: true },
        { key: "actualWt", label: "ACTUAL - WT", type: "number", readOnly: true },
        { key: "chargedWt", label: "CHARGED - WT", type: "number" },
        { key: "wtUom", label: "WT UOM", type: "text", readOnly: true, defaultValue: "MT" },
      ];
    }

    if (packType === "UNIFORM - BAGS/BOXES") {
      return [
        { key: "totalPkgs", label: "TOTAL PKGS", type: "number" },
        { key: "pkgsType", label: "PKG TYPE", type: "select", options: pkgTypes, isDynamic: true },
        { key: "uom", label: "UOM", type: "select", options: uoms, isUOM: true },
        { key: "skuSize", label: "SKU - SIZE", type: "select", options: skuSizes, isSKUSize: true },
        { key: "packWeight", label: "PACK - WEIGHT", type: "number" },
        { key: "productName", label: "PRODUCT NAME", type: "select", options: items, isItem: true },
        { key: "wtLtr", label: "WT (LTR)", type: "number", readOnly: true },
        { key: "actualWt", label: "ACTUAL - WT", type: "number", readOnly: true },
        { key: "chargedWt", label: "CHARGED - WT", type: "number" },
        { key: "wtUom", label: "WT UOM", type: "text", readOnly: true, defaultValue: "MT" },
      ];
    }

    if (packType === "LOOSE - CARGO") {
      return [
        { key: "uom", label: "UOM", type: "select", options: uoms, isUOM: true },
        { key: "productName", label: "PRODUCT NAME", type: "select", options: items, isItem: true },
        { key: "actualWt", label: "ACTUAL - WT", type: "number" },
        { key: "chargedWt", label: "CHARGED - WT", type: "number" },
      ];
    }

    // NON-UNIFORM - GENERAL CARGO
    return [
      { key: "nos", label: "NOS", type: "number" },
      { key: "productName", label: "PRODUCT NAME", type: "select", options: items, isItem: true },
      { key: "uom", label: "UOM", type: "select", options: uoms, isUOM: true },
      { key: "length", label: "LENGTH", type: "number" },
      { key: "width", label: "WIDTH", type: "number" },
      { key: "height", label: "HEIGHT", type: "number" },
      { key: "actualWt", label: "ACTUAL - WT", type: "number" },
      { key: "chargedWt", label: "CHARGED - WT", type: "number" },
    ];
  };

  const handleChange = (rowId, key, value) => {
    onChange(rowId, key, value);
  };

  // Handle item search
  const handleItemSearch = (rowId, query) => {
    setItemSearchQuery(prev => ({ ...prev, [rowId]: query }));
    setItemHighlightedIndex(prev => ({ ...prev, [rowId]: -1 }));
    // Free text is only a search term.  A row is linked only after a user
    // chooses an Item Master record from the result list.
    onChange(rowId, 'productId', '');
    onChange(rowId, 'productName', '');
    
    if (!query.trim()) {
      setFilteredItems(prev => ({ ...prev, [rowId]: items }));
    } else {
      const filtered = items.filter(item =>
        item.itemName?.toLowerCase().includes(query.toLowerCase()) ||
        item.itemCode?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredItems(prev => ({ ...prev, [rowId]: filtered }));
    }
  };

  const handleSelectItem = (rowId, item) => {
    onChange(rowId, 'productId', item._id);
    onChange(rowId, 'productName', item.itemName);
    setItemSearchQuery(prev => ({ ...prev, [rowId]: item.itemName }));
    setShowItemDropdown(prev => ({ ...prev, [rowId]: false }));
    setActiveItemRowId(null);
  };

  const handleItemInputFocus = (rowId, event) => {
    onRefreshItems?.();
    if (!showItemDropdown[rowId]) {
      setFilteredItems(prev => ({ ...prev, [rowId]: items }));
      
      const rect = event.target.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const dropdownHeight = 300;
      const direction = spaceBelow < dropdownHeight ? 'up' : 'down';
      
      setItemDropdownPosition({
        top: direction === 'down' ? rect.bottom + window.scrollY : rect.top + window.scrollY - dropdownHeight,
        left: rect.left + window.scrollX,
        width: rect.width,
        direction: direction
      });
      
      setShowItemDropdown(prev => ({ ...prev, [rowId]: true }));
      setActiveItemRowId(rowId);
    }
  };

  const handleItemInputBlur = (rowId) => {
    setTimeout(() => {
      if (itemDropdownRef.current[rowId] && !itemDropdownRef.current[rowId].contains(document.activeElement)) {
        setShowItemDropdown(prev => ({ ...prev, [rowId]: false }));
        setActiveItemRowId(null);
      }
    }, 200);
  };

  // Update dropdown position on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (activeItemRowId && itemInputRefs.current[activeItemRowId]) {
        const rect = itemInputRefs.current[activeItemRowId].getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const dropdownHeight = 300;
        const direction = spaceBelow < dropdownHeight ? 'up' : 'down';
        
        setItemDropdownPosition({
          top: direction === 'down' ? rect.bottom + window.scrollY : rect.top + window.scrollY - dropdownHeight,
          left: rect.left + window.scrollX,
          width: rect.width,
          direction: direction
        });
      }
    };
    
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [activeItemRowId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeItemRowId) {
        const isClickInside = itemDropdownRef.current[activeItemRowId]?.contains(event.target) ||
                             itemInputRefs.current[activeItemRowId]?.contains(event.target);
        if (!isClickInside) {
          setShowItemDropdown(prev => ({ ...prev, [activeItemRowId]: false }));
          setActiveItemRowId(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeItemRowId]);

  return (
    <div className="overflow-auto rounded-xl border border-yellow-300">
      <table className="min-w-max w-full text-sm">
        <thead className="sticky top-0 bg-yellow-400 z-10">
          <tr>
            <th className="border border-yellow-500 px-3 py-3 text-xs font-extrabold text-slate-900 text-center bg-yellow-400">
              Pack Type
            </th>
            <th colSpan={100} className="border border-yellow-500 px-3 py-3 text-xs font-extrabold text-slate-900 text-left">
              Packing Details
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.length > 0 ? (
            rows.map((r) => {
              const cols = getColumnsForRow(r.packType);
              
              // Initialize refs for this row if not exists
              if (!packInputRefs.current[r._id]) {
                packInputRefs.current[r._id] = {};
              }
              
              return (
                <React.Fragment key={r._id}>
                  <tr className="bg-yellow-50">
                    <th className="border border-yellow-300 px-2 py-2 text-center text-xs font-extrabold text-slate-900">
                      Pack Type
                    </th>
                    {cols.map((c) => (
                      <th key={c.key} className="border border-yellow-300 px-2 py-2 text-center text-xs font-extrabold text-slate-900">
                        {c.label}
                        {c.readOnly && <span className="ml-1 text-xs text-blue-600">*Auto</span>}
                      </th>
                    ))}
                    <th className="sticky right-0 z-10 border border-yellow-300 bg-yellow-50 px-2 py-2 text-center text-xs font-extrabold text-slate-900">
                      Actions
                    </th>
                  </tr>
                  <tr className="hover:bg-yellow-50 even:bg-slate-50">
                  <td className="border border-yellow-300 px-2 py-2 text-center font-semibold bg-yellow-50 text-xs">
                    {r.packType === "PALLETIZATION" ? "Palletization" :
                     r.packType === "UNIFORM - BAGS/BOXES" ? "Uniform" :
                     r.packType === "LOOSE - CARGO" ? "Loose Cargo" :
                     "Non-uniform"}
                  </td>
                  
                  {cols.map((c) => {
                    // Handle WT UOM field - always show MT as readonly
                    if (c.key === "wtUom") {
                      return (
                        <td key={c.key} className="border border-yellow-300 px-2 py-2">
                          <input
                            type="text"
                            value="MT"
                            readOnly
                            className="w-full rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm text-slate-700 font-medium"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                focusNextPackField(r._id, c.key);
                              } else if (e.key === 'Backspace') {
                                e.preventDefault();
                                focusPrevPackField(r._id, c.key);
                              }
                            }}
                          />
                        </td>
                      );
                    }
                    
                    // For read-only calculated fields
                    if (c.readOnly && (c.key === "actualWt" || c.key === "totalPkgs" || c.key === "wtLtr")) {
                      return (
                        <td key={c.key} className="border border-yellow-300 px-2 py-2">
                          <input
                            type="text"
                            value={r[c.key] ?? ""}
                            readOnly
                            className="w-full rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm text-slate-700 font-medium"
                            placeholder="Auto"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                focusNextPackField(r._id, c.key);
                              } else if (e.key === 'Backspace') {
                                e.preventDefault();
                                focusPrevPackField(r._id, c.key);
                              }
                            }}
                          />
                        </td>
                      );
                    }
                    
                    return (
                      <td key={c.key} className="border border-yellow-300 px-2 py-2">
                        {c.isDynamic ? (
                          <select
                            ref={el => {
                              if (!packInputRefs.current[r._id]) {
                                packInputRefs.current[r._id] = {};
                              }
                              packInputRefs.current[r._id][c.key] = el;
                            }}
                            value={r[c.key] ?? ""}
                            onFocus={onRefreshPkgTypes}
                            onChange={(e) => handleChange(r._id, c.key, e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                focusNextPackField(r._id, c.key);
                              } else if (e.key === 'Backspace' && e.target.value === '') {
                                e.preventDefault();
                                focusPrevPackField(r._id, c.key);
                              }
                            }}
                          >
                            <option value="">Select</option>
                            {c.options && c.options.map((opt) => (
                              <option key={opt._id} value={opt.name}>
                                {opt.name}
                              </option>
                            ))}
                          </select>
                        ) : c.isUOM ? (
                          <select
                            ref={el => {
                              if (!packInputRefs.current[r._id]) {
                                packInputRefs.current[r._id] = {};
                              }
                              packInputRefs.current[r._id][c.key] = el;
                            }}
                            value={r[c.key] ?? ""}
                            onFocus={onRefreshUOMs}
                            onChange={(e) => handleChange(r._id, c.key, e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                focusNextPackField(r._id, c.key);
                              } else if (e.key === 'Backspace' && e.target.value === '') {
                                e.preventDefault();
                                focusPrevPackField(r._id, c.key);
                              }
                            }}
                          >
                            <option value="">Select</option>
                            {c.options && c.options.map((opt) => (
                              <option key={opt._id} value={opt.name}>
                                {opt.name}
                              </option>
                            ))}
                          </select>
                        ) : c.isSKUSize ? (
                          <select
                            ref={el => {
                              if (!packInputRefs.current[r._id]) {
                                packInputRefs.current[r._id] = {};
                              }
                              packInputRefs.current[r._id][c.key] = el;
                            }}
                            value={r[c.key] ?? ""}
                            onFocus={onRefreshSKUSizes}
                            onChange={(e) => handleChange(r._id, c.key, e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                focusNextPackField(r._id, c.key);
                              } else if (e.key === 'Backspace' && e.target.value === '') {
                                e.preventDefault();
                                focusPrevPackField(r._id, c.key);
                              }
                            }}
                          >
                            <option value="">Select</option>
                            {c.options && c.options.map((opt) => (
                              <option key={opt._id} value={opt.display}>
                                {opt.display}
                              </option>
                            ))}
                          </select>
                        ) : c.isItem ? (
                          <div className="relative w-full">
                            <div className="flex-1 relative">
                              <input
                                ref={el => {
                                  itemInputRefs.current[r._id] = el;
                                  if (!packInputRefs.current[r._id]) {
                                    packInputRefs.current[r._id] = {};
                                  }
                                  packInputRefs.current[r._id][c.key] = el;
                                }}
                                type="text"
                                value={itemSearchQuery[r._id] ?? r[c.key] ?? ""}
                                onChange={(e) => handleItemSearch(r._id, e.target.value)}
                                onFocus={(e) => handleItemInputFocus(r._id, e)}
                                onBlur={() => handleItemInputBlur(r._id)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                                placeholder="Search product..."
                                autoComplete="off"
                                onKeyDown={(e) => {
                                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    const options = filteredItems[r._id] || items;
                                    if (!showItemDropdown[r._id]) handleItemInputFocus(r._id, e);
                                    if (options.length) {
                                      setItemHighlightedIndex(prev => {
                                        const index = prev[r._id] ?? -1;
                                        return { ...prev, [r._id]: e.key === 'ArrowDown'
                                          ? (index + 1) % options.length
                                          : (index <= 0 ? options.length - 1 : index - 1) };
                                      });
                                    }
                                  } else if (e.key === 'Enter' || e.key === 'Tab') {
                                    if (e.key === 'Enter') e.preventDefault();
                                    const options = filteredItems[r._id] || items;
                                    if (showItemDropdown[r._id] && options.length > 0) {
                                      handleSelectItem(r._id, options[itemHighlightedIndex[r._id] >= 0 ? itemHighlightedIndex[r._id] : 0]);
                                    } else {
                                      focusNextPackField(r._id, c.key);
                                    }
                                  } else if (e.key === 'Backspace' && e.target.value === '') {
                                    e.preventDefault();
                                    focusPrevPackField(r._id, c.key);
                                  }
                                }}
                              />
                              {showItemDropdown[r._id] && (
                                <div 
                                  ref={el => itemDropdownRef.current[r._id] = el}
                                  className="fixed z-[100000] bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto"
                                  style={{
                                    top: `${itemDropdownPosition.top}px`,
                                    left: `${itemDropdownPosition.left}px`,
                                    width: `${itemDropdownPosition.width}px`,
                                    maxHeight: '300px',
                                    minWidth: '200px'
                                  }}
                                >
                                  <div className="sticky top-0 bg-gray-50 px-3 py-2 text-xs font-semibold text-slate-600 border-b">
                                    Select Product
                                  </div>
                                  {(filteredItems[r._id] || items).length > 0 ? (
                                    (filteredItems[r._id] || items).map((item) => (
                                      <div
                                        key={item._id}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          handleSelectItem(r._id, item);
                                        }}
                                        className={`px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${itemHighlightedIndex[r._id] === (filteredItems[r._id] || items).indexOf(item) ? 'bg-sky-100' : ''}`}
                                      >
                                        <div className="font-medium text-slate-800 text-sm">
                                          {item.itemName}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                          Code: {item.itemCode}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-3 text-center text-sm text-slate-500">
                                      No items found
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : c.options && !c.isDynamic && !c.isUOM && !c.isSKUSize && !c.isItem ? (
                          <select
                            ref={el => {
                              if (!packInputRefs.current[r._id]) {
                                packInputRefs.current[r._id] = {};
                              }
                              packInputRefs.current[r._id][c.key] = el;
                            }}
                            value={r[c.key] ?? ""}
                            onChange={(e) => handleChange(r._id, c.key, e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                focusNextPackField(r._id, c.key);
                              } else if (e.key === 'Backspace' && e.target.value === '') {
                                e.preventDefault();
                                focusPrevPackField(r._id, c.key);
                              }
                            }}
                          >
                            <option value="">Select</option>
                            {c.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            ref={el => {
                              if (!packInputRefs.current[r._id]) {
                                packInputRefs.current[r._id] = {};
                              }
                              packInputRefs.current[r._id][c.key] = el;
                            }}
                            type={c.type || "text"}
                            value={r[c.key] ?? ""}
                            readOnly={c.readOnly}
                            onChange={(e) => handleChange(r._id, c.key, e.target.value)}
                            className={`w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
                              c.readOnly 
                                ? 'bg-slate-100 text-slate-700' 
                                : 'bg-white'
                            }`}
                            placeholder={c.readOnly ? "Auto" : `Enter`}
                            step={c.type === "number" ? "0.001" : undefined}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                focusNextPackField(r._id, c.key);
                              } else if (e.key === 'Backspace' && e.target.value === '') {
                                e.preventDefault();
                                focusPrevPackField(r._id, c.key);
                              }
                            }}
                          />
                        )}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 border border-yellow-300 bg-white px-2 py-2">
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => onDuplicate(r._id)}
                        className="rounded-lg border border-yellow-500 bg-yellow-100 px-2 py-1.5 text-xs font-bold text-yellow-800 hover:bg-yellow-200 transition"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => onRemove(r._id)}
                        className="rounded-lg bg-red-500 px-2 py-1.5 text-xs font-bold text-white hover:bg-red-600 transition"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                  </tr>
                </React.Fragment>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={100}
                className="border border-yellow-300 px-4 py-10 text-center text-slate-400 font-semibold"
              >
                No rows yet. Select a pack type and click <b>Add Row</b> to add data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
