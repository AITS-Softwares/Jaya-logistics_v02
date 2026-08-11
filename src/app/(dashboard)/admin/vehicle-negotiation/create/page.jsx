
"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import mongoose from 'mongoose';
import TransactionFormKeyboardNavigation, { TransactionKeyboardTable, useKeyboardDropdown } from "@/components/TransactionFormKeyboardNavigation";

/* =======================
  HELPERS / CONSTANTS
======================= */
const ORDER_TYPES = ["Sales", "STO Order", "Export", "Import"];
const STATUSES = ["Open", "Hold", "Cancelled"];
const BILLING_TYPES = ["Multi - Order", "Single Order"];

const PURCHASE_TYPES = ["Loading & Unloading", "Unloading Only", "Safi Vehicle"];
const VENDOR_STATUS = ["Active", "Blacklisted"];
const RATE_TYPES = ["Per MT", "Fixed"];
const PAYMENT_TERMS = [
  "80 % Advance",
  "90 % Advance",
  "Rs.10,000/- Balance Only",
  "Rs. 5000/- Balance Only",
  "Full Payment after Delivery",
];
const APPROVALS = ["Approved", "Reject", "Pending"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isValidObjectId(id) {
  return id && mongoose.Types.ObjectId.isValid(id);
}

function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

/* =======================
  Supplier Search Hook
========================= */
function useSupplierSearch() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchSuppliers = async (query = "") => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const url = '/api/suppliers';
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSuppliers(data.data);
      } else {
        setSuppliers([]);
        setError(data.message || 'No suppliers found');
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setSuppliers([]);
      setError('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  return { suppliers, loading, error, searchSuppliers };
}

/* =======================
  Customer Search Hook
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
      const url = '/api/customers';
      
      const res = await fetch(url, {
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

/* =======================
  Vehicle Search Hook
========================= */
function useVehicleSearch() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchVehicles = async (query = "") => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const url = query ? `/api/vehicles?search=${encodeURIComponent(query)}` : '/api/vehicles';
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.success && Array.isArray(data.data)) {
        setVehicles(data.data);
      } else {
        setVehicles([]);
        setError(data.message || 'No vehicles found');
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setVehicles([]);
      setError('Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  };

  const getVehicleById = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/vehicles?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        setError(data.message || 'Vehicle not found');
        return null;
      }
    } catch (err) {
      console.error('Error fetching vehicle:', err);
      setError('Failed to fetch vehicle');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchVehicles();
  }, []);

  return { vehicles, loading, error, searchVehicles, getVehicleById };
}

/* =======================
  Order Panel Search Hook - Only Approved Orders
========================= */
function useOrderPanelSearch() {
  const [orderPanels, setOrderPanels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchOrderPanels = async (query = "") => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      // First, get used order panel IDs from vehicle negotiations
      const vehicleRes = await fetch('/api/vehicle-negotiation?format=table', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const vehicleData = await vehicleRes.json();
      
      const usedOrderPanelIds = new Set();
      if (vehicleData.success && Array.isArray(vehicleData.data)) {
        vehicleData.data.forEach(item => {
          if (item.order && item.order !== 'N/A') {
            const orderNo = item.order;
            usedOrderPanelIds.add(orderNo);
          }
        });
      }
      
      // Fetch order panels
      const res = await fetch('/api/order-panel', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.success && Array.isArray(data.data)) {
        // Filter: only Approved status and not used in vehicle negotiation
        const availablePanels = data.data.filter(panel => 
          panel.panelStatus === 'Approved' && 
          !usedOrderPanelIds.has(panel.orderPanelNo)
        );
        
        setOrderPanels(availablePanels);
      } else {
        setOrderPanels([]);
        setError(data.message || 'No order panels found');
      }
    } catch (err) {
      console.error('Error fetching order panels:', err);
      setOrderPanels([]);
      setError('Failed to fetch order panels');
    } finally {
      setLoading(false);
    }
  };

  const getOrderPanelById = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/order-panel?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.success && data.data) {
        return data.data;
      } else {
        setError(data.message || 'Order panel not found');
        return null;
      }
    } catch (err) {
      console.error('Error fetching order panel:', err);
      setError('Failed to fetch order panel');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchOrderPanels();
  }, []);

  return { orderPanels, loading, error, searchOrderPanels, getOrderPanelById };
}

/* =======================
  DEFAULT ROWS
======================= */
function defaultOrderRow(index = 1) {
  return {
    _id: uid(),
    orderNo: "",
    orderPanelId: "",
    partyName: "",
    customerId: null,
    customerCode: "",
    contactPerson: "",
    plantCode: null,
    plantName: "",
    plantCodeValue: "",
    orderType: "Sales",
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
    status: "Open",
    collectionCharges: "",
    cancellationCharges: "",
    loadingCharges: "",
    otherCharges: "",
    localStatus: "unknown",
    localStatusLabel: "Unknown",
    subCompanyId: null,
    subCompanyName: "",
    subCompanyCode: ""
  };
}

function defaultVendorRow() {
  return {
    _id: uid(),
    vendorName: "",
    vendorCode: "", 
    marketRate: "",
    purchaseType: "",
  };
}

/* =======================
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
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function TableSearchableDropdown({ 
  items, 
  selectedId, 
  onSelect, 
  placeholder = "Search...",
  required = false,
  displayField = 'name',
  codeField = 'code',
  disabled = false,
  showCode = true,
  cellId = ""
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (isUpdatingRef.current) return;
    
    if (selectedId && typeof selectedId === 'string') {
      const item = items.find(i => i._id === selectedId || i.code === selectedId || i.supplierName === selectedId);
      if (item) {
        setSelectedItem(item);
        setSearchQuery(getDisplayValue(item));
      } else {
        setSelectedItem(null);
        setSearchQuery("");
      }
    } else {
      setSelectedItem(null);
      setSearchQuery("");
    }
  }, [items, selectedId, displayField, codeField]);

  useEffect(() => {
    setFilteredItems(items);
  }, [items]);

  const getDisplayValue = (item) => {
    if (!item) return "";
    const display = item[displayField] || "";
    const code = item[codeField] && showCode ? ` (${item[codeField]})` : "";
    return `${display}${code}`;
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item => {
        const display = (item[displayField] || '').toLowerCase();
        const code = (item[codeField] || '').toLowerCase();
        const searchLower = query.toLowerCase();
        return display.includes(searchLower) || code.includes(searchLower);
      });
      setFilteredItems(filtered);
    }
    
    if (selectedItem && query !== getDisplayValue(selectedItem)) {
      setSelectedItem(null);
      isUpdatingRef.current = true;
      onSelect?.(null);
      setTimeout(() => { isUpdatingRef.current = false; }, 100);
    }
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setSearchQuery(getDisplayValue(item));
    setShowDropdown(false);
    setHighlightedIndex(-1);
    isUpdatingRef.current = true;
    onSelect?.(item);
    setTimeout(() => { isUpdatingRef.current = false; }, 100);
  };

  const handleInputFocus = () => {
    if (disabled) return;
    
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    
    setFilteredItems(items);
    setHighlightedIndex(-1);
    setShowDropdown(true);
  };

  const handleKeyboardNavigation = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!showDropdown) handleInputFocus();
      if (filteredItems.length) {
        setHighlightedIndex((index) => event.key === "ArrowDown"
          ? (index + 1) % filteredItems.length
          : (index <= 0 ? filteredItems.length - 1 : index - 1));
      }
      return;
    }

    if (event.key === "Enter" && showDropdown && filteredItems.length) {
      event.preventDefault();
      handleSelectItem(filteredItems[highlightedIndex >= 0 ? highlightedIndex : 0]);
      return;
    }

    if (event.key === "Escape" && showDropdown) {
      event.preventDefault();
      setShowDropdown(false);
      setHighlightedIndex(-1);
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

  return (
    <div className="relative w-full" data-keyboard-dropdown>
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyboardNavigation}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:opacity-50"
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
      />
      
      {showDropdown && !disabled && (
        <div 
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 9999
          }}
          className="bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          role="listbox"
        >
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item._id}
                data-keyboard-option
                role="option"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectItem(item);
                }}
                className={`p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
                  selectedItem?._id === item._id || highlightedIndex === filteredItems.indexOf(item) ? 'bg-sky-50' : ''
                }`}
              >
                <div className="font-medium text-slate-800 text-sm">
                  {item[displayField]}
                </div>
                {item[codeField] && showCode && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    Code: {item[codeField]}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-2 text-center text-sm text-slate-500">
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

function SearchableDropdown({ 
  items, 
  selectedId, 
  onSelect, 
  placeholder = "Search...",
  required = false,
  displayField = 'name',
  codeField = 'code',
  disabled = false
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setFilteredItems(items);
    if (selectedId) {
      const item = items.find(i => i._id === selectedId || i.code === selectedId);
      setSelectedItem(item);
      if (item) {
        setSearchQuery(getDisplayValue(item));
      }
    } else {
      setSelectedItem(null);
      setSearchQuery("");
    }
  }, [items, selectedId, displayField]);

  const getDisplayValue = (item) => {
    if (!item) return "";
    if (displayField === 'customerName') return item.customerName || "";
    if (displayField === 'supplierName') return `${item.supplierName || ''} (${item.supplierCode || ''})`;
    if (displayField === 'vehicleNumber') return `${item.vehicleNumber} - ${item.ownerName || ''}`;
    const display = item[displayField] || "";
    const code = item[codeField] ? `(${item[codeField]})` : "";
    return `${display} ${code}`.trim();
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item => {
        if (displayField === 'supplierName') {
          return (item.supplierName && item.supplierName.toLowerCase().includes(query.toLowerCase())) ||
                 (item.supplierCode && item.supplierCode.toLowerCase().includes(query.toLowerCase()));
        }
        if (displayField === 'vehicleNumber') {
          return (item.vehicleNumber && item.vehicleNumber.toLowerCase().includes(query.toLowerCase())) ||
                 (item.ownerName && item.ownerName.toLowerCase().includes(query.toLowerCase())) ||
                 (item.rcNumber && item.rcNumber.toLowerCase().includes(query.toLowerCase()));
        }
        return (item[displayField] && item[displayField].toLowerCase().includes(query.toLowerCase())) ||
               (item[codeField] && item[codeField].toLowerCase().includes(query.toLowerCase())) ||
               (item.customerName && item.customerName.toLowerCase().includes(query.toLowerCase()));
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

  const handleInputFocus = () => {
    if (!showDropdown && !disabled) {
      setFilteredItems(items);
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

  const { highlightedIndex, handleKeyDown: handleDropdownKeyDown } = useKeyboardDropdown({
    isOpen: showDropdown,
    options: filteredItems,
    open: handleInputFocus,
    close: () => setShowDropdown(false),
    onSelect: handleSelectItem,
  });

  return (
    <div className="relative" ref={dropdownRef} data-keyboard-dropdown data-managed-keyboard-dropdown>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleDropdownKeyDown}
        className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
          disabled ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
        }`}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
      />
      
      {showDropdown && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto" role="listbox">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item._id}
                data-keyboard-option
                role="option"
                onMouseDown={() => handleSelectItem(item)}
                className={`p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
                  selectedItem?._id === item._id || highlightedIndex === filteredItems.indexOf(item) ? 'bg-sky-50' : ''
                }`}
              >
                <div className="font-medium text-slate-800">
                  {displayField === 'supplierName' ? item.supplierName : 
                   displayField === 'vehicleNumber' ? item.vehicleNumber : 
                   (item[displayField] || item.customerName)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {displayField === 'supplierName' ? (
                    <>
                      Code: {item.supplierCode} | Status: {item.supplierStatus || 'Active'}
                    </>
                  ) : displayField === 'vehicleNumber' ? (
                    <>
                      Owner: {item.ownerName} | RC: {item.rcNumber}
                    </>
                  ) : (
                    item[codeField] && `Code: ${item[codeField]}`
                  )}
                </div>
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

function SupplierSearchDropdown({ 
  value, 
  onSelect,
  placeholder = "Search supplier...",
  readOnly = false,
  suppliers = [],
  loading = false
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const dropdownRef = useRef(null);

  // Update search query when value changes
  useEffect(() => {
    if (value) {
      setSearchQuery(value);
    } else {
      setSearchQuery("");
    }
  }, [value]);

  // Update filtered suppliers when suppliers prop changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = suppliers.filter(supplier =>
        supplier.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.supplierCode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSuppliers(filtered);
    } else {
      setFilteredSuppliers(suppliers);
    }
  }, [suppliers, searchQuery]);

  const handleSearch = (query) => {
    if (readOnly) return;
    setSearchQuery(query);
    
    if (!showDropdown) {
      setShowDropdown(true);
    }
    
    if (!query.trim()) {
      setFilteredSuppliers(suppliers);
    } else {
      const filtered = suppliers.filter(supplier =>
        supplier.supplierName?.toLowerCase().includes(query.toLowerCase()) ||
        supplier.supplierCode?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredSuppliers(filtered);
    }
  };

  const handleSelectItem = (supplier) => {
    if (readOnly) return;
    setSearchQuery(supplier.supplierName);
    setShowDropdown(false);
    onSelect(supplier);
  };

  const handleInputFocus = () => {
    if (readOnly) return;
    setFilteredSuppliers(suppliers);
    setShowDropdown(true);
  };

  const { highlightedIndex, handleKeyDown: handleDropdownKeyDown } = useKeyboardDropdown({
    isOpen: showDropdown,
    options: filteredSuppliers,
    open: handleInputFocus,
    close: () => setShowDropdown(false),
    onSelect: handleSelectItem,
  });

  return (
    <div className="relative" ref={dropdownRef} data-keyboard-dropdown data-managed-keyboard-dropdown>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={handleInputFocus}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        onKeyDown={handleDropdownKeyDown}
        readOnly={readOnly}
        className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
          readOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
        }`}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
      />
      
      {showDropdown && !readOnly && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto" role="listbox">
          {loading ? (
            <div className="p-3 text-center text-sm text-slate-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500 mx-auto"></div>
              <p className="mt-1">Loading suppliers...</p>
            </div>
          ) : filteredSuppliers.length > 0 ? (
            filteredSuppliers.map((supplier) => (
              <div
                key={supplier._id}
                data-keyboard-option
                role="option"
                onMouseDown={() => handleSelectItem(supplier)}
                className={`p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${highlightedIndex === filteredSuppliers.indexOf(supplier) ? 'bg-sky-50' : ''}`}
              >
                <div className="font-medium text-slate-800">
                  {supplier.supplierName}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Code: {supplier.supplierCode} | Status: {supplier.supplierStatus || 'Active'}
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-sm text-slate-500">
              {searchQuery.trim() ? "No suppliers found" : "No suppliers available"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MultiSelectOrderPanelDropdown({ 
  selectedPanels = [],
  onSelect,
  placeholder = "Search and select order panels..."
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [panels, setPanels] = useState([]);
  const [allPanels, setAllPanels] = useState([]);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const orderPanelSearch = useOrderPanelSearch();

  useEffect(() => {
    if (orderPanelSearch.orderPanels.length > 0) {
      setAllPanels(orderPanelSearch.orderPanels);
      
      const selectedIds = selectedPanels.map(p => p._id);
      
      const firstSelectedSubCompanyId = selectedPanels.length > 0 ? selectedPanels[0].subCompanyId : null;
      
      let filtered = orderPanelSearch.orderPanels.filter(
        panel => !selectedIds.includes(panel._id)
      );
      
      if (firstSelectedSubCompanyId) {
        filtered = filtered.filter(panel => 
          panel.subCompanyId === firstSelectedSubCompanyId
        );
      }
      
      setPanels(filtered);
    }
  }, [orderPanelSearch.orderPanels, selectedPanels]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    const selectedIds = selectedPanels.map(p => p._id);
    const firstSelectedSubCompanyId = selectedPanels.length > 0 ? selectedPanels[0].subCompanyId : null;
    
    if (!query.trim()) {
      let filtered = allPanels.filter(panel => !selectedIds.includes(panel._id));
      
      if (firstSelectedSubCompanyId) {
        filtered = filtered.filter(panel => 
          panel.subCompanyId === firstSelectedSubCompanyId
        );
      }
      
      setPanels(filtered);
    } else {
      let filtered = allPanels.filter(panel => 
        !selectedIds.includes(panel._id) && (
          panel.orderPanelNo?.toLowerCase().includes(query.toLowerCase()) ||
          panel.partyName?.toLowerCase().includes(query.toLowerCase()) ||
          panel.customerName?.toLowerCase().includes(query.toLowerCase()) ||
          panel.subCompanyName?.toLowerCase().includes(query.toLowerCase()) ||
          panel.subCompanyCode?.toLowerCase().includes(query.toLowerCase())
        )
      );
      
      if (firstSelectedSubCompanyId) {
        filtered = filtered.filter(panel => 
          panel.subCompanyId === firstSelectedSubCompanyId
        );
      }
      
      setPanels(filtered);
    }
  };

  const handleSelectPanel = async (panel) => {
    setSearchQuery("");
    
    if (selectedPanels.some(p => p._id === panel._id)) {
      alert("This order panel is already selected");
      return;
    }
    
    if (selectedPanels.length > 0) {
      const firstPanelSubCompanyId = selectedPanels[0].subCompanyId;
      if (panel.subCompanyId !== firstPanelSubCompanyId) {
        alert(`⚠️ You can only select orders from the same sub-company.\nCurrent: ${selectedPanels[0].subCompanyName || 'None'}\nSelected: ${panel.subCompanyName || 'None'}`);
        return;
      }
    }
    
    setLoading(true);
    try {
      const fullPanel = await orderPanelSearch.getOrderPanelById(panel._id);
      if (fullPanel) {
        onSelect(fullPanel);
        
        setPanels(prev => prev.filter(p => p._id !== panel._id));
        setSearchQuery("");
        setShowDropdown(true);
      }
    } catch (error) {
      console.error('Error fetching order panel details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePanel = (panelId) => {
    const removedPanel = selectedPanels.find(p => p._id === panelId);
    onSelect(null, panelId);
    
    if (removedPanel) {
      const panelToAdd = allPanels.find(p => p._id === panelId);
      if (panelToAdd) {
        setPanels(prev => {
          if (!prev.some(p => p._id === panelId)) {
            return [...prev, panelToAdd].sort((a, b) => 
              (a.orderPanelNo || '').localeCompare(b.orderPanelNo || '')
            );
          }
          return prev;
        });
      }
    }
    setShowDropdown(true);
  };

  const handleInputFocus = async () => {
    await orderPanelSearch.searchOrderPanels();
    
    const selectedIds = selectedPanels.map(p => p._id);
    const firstSelectedSubCompanyId = selectedPanels.length > 0 ? selectedPanels[0].subCompanyId : null;
    
    let filtered = orderPanelSearch.orderPanels.filter(
      panel => !selectedIds.includes(panel._id)
    );
    
    if (firstSelectedSubCompanyId) {
      filtered = filtered.filter(panel => 
        panel.subCompanyId === firstSelectedSubCompanyId
      );
    }
    
    setPanels(filtered);
    setShowDropdown(true);
  };

  const handleInputClick = () => {
    setShowDropdown(true);
  };

  const handleInputBlur = () => {};

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentSubCompany = selectedPanels.length > 0 ? selectedPanels[0] : null;

  const { highlightedIndex, handleKeyDown: handleDropdownKeyDown } = useKeyboardDropdown({
    isOpen: showDropdown,
    options: panels,
    open: handleInputFocus,
    close: () => setShowDropdown(false),
    onSelect: handleSelectPanel,
  });

  return (
    <div className="relative" ref={dropdownRef} data-keyboard-dropdown data-managed-keyboard-dropdown>
      {selectedPanels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 border border-yellow-200 rounded-lg bg-yellow-50">
          {currentSubCompany && currentSubCompany.subCompanyName && (
            <div className="w-full text-xs font-semibold text-blue-600 mb-1">
              Sub-Company: {currentSubCompany.subCompanyName} ({currentSubCompany.subCompanyCode})
            </div>
          )}
          {selectedPanels.map((panel) => (
            <div
              key={panel._id}
              className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-md text-sm"
            >
              <span className="font-medium">{panel.orderPanelNo}</span>
              {panel.subCompanyName && (
                <span className="text-xs text-gray-500 ml-1">
                  ({panel.subCompanyName})
                </span>
              )}
              <button
                onClick={() => handleRemovePanel(panel._id)}
                className="text-red-500 hover:text-red-700 font-bold ml-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={handleInputFocus}
        onClick={handleInputClick}
        onBlur={handleInputBlur}
        onKeyDown={handleDropdownKeyDown}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        placeholder={selectedPanels.length > 0 ? `Add more orders from same sub-company...` : placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
      />
      
      {showDropdown && (
        <div 
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
          role="listbox"
        >
          {loading || orderPanelSearch.loading ? (
            <div className="p-3 text-center text-sm text-slate-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500 mx-auto"></div>
              <p className="mt-1">Loading available order panels...</p>
            </div>
          ) : panels.length > 0 ? (
            panels.map((panel) => (
              <div
                key={panel._id}
                data-keyboard-option
                role="option"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectPanel(panel);
                }}
                className={`p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${highlightedIndex === panels.indexOf(panel) ? 'bg-sky-50' : ''}`}
              >
                <div className="font-medium text-slate-800">
                  {panel.orderPanelNo}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {panel.partyName || panel.customerName || 'N/A'} | 
                  Branch: {panel.branchName || panel.branchCode || 'N/A'} | 
                  Weight: {panel.totalWeight || 0}
                  {panel.subCompanyName && (
                    <span className="ml-2 text-blue-600">
                      Sub-Company: {panel.subCompanyName} ({panel.subCompanyCode})
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-sm text-slate-500">
              {searchQuery.trim() ? 
                `No matching order panels found for "${searchQuery}"` : 
                selectedPanels.length > 0 ? 
                  "No more order panels available from this sub-company" :
                  "No order panels available"
              }
              {selectedPanels.length > 0 && selectedPanels[0].subCompanyName && (
                <div className="text-xs text-blue-600 mt-1">
                  Currently selecting from: {selectedPanels[0].subCompanyName}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =======================
  Billing Type Table Component
========================= */
function BillingTypeTable({ header, setHeader, billingColumns, selectedOrderPanels, orders }) {
  const autoBillingType = selectedOrderPanels.length > 1 ? "Multi - Order" : "Single Order";

  return (
    <div className="overflow-auto rounded-xl border border-yellow-300">
      <TransactionKeyboardTable className="min-w-full w-full text-sm">
        <thead className="sticky top-0 bg-yellow-400">
          <tr>
            {billingColumns.map((col) => (
              <th
                key={col.key}
                className="border border-yellow-500 px-3 py-3 text-xs font-extrabold text-slate-900 text-center"
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
                {col.key === "billingType" ? (
                  <select
                    value={autoBillingType}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none cursor-not-allowed"
                    disabled={true}
                  >
                    <option value="Single Order">Single Order</option>
                    <option value="Multi - Order">Multi - Order</option>
                  </select>
                ) : col.key === "loadingPoints" || col.key === "dropPoints" ? (
                  <input
                    type={col.type || "text"}
                    value={header[col.key] || ""}
                    onChange={(e) => setHeader(prev => ({ ...prev, [col.key]: e.target.value }))}
                    readOnly={false}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                    placeholder={`Enter ${col.label}`}
                  />
                ) : (
                  <input
                    type={col.type || "text"}
                    value={header[col.key] || ""}
                    onChange={(e) => setHeader(prev => ({ ...prev, [col.key]: e.target.value }))}
                    readOnly={selectedOrderPanels.length > 0}
                    className={`w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${
                      selectedOrderPanels.length > 0 ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                    }`}
                    placeholder={`Enter ${col.label}`}
                  />
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </TransactionKeyboardTable>
    </div>
  );
}

/* =======================
  MAIN PAGE
========================= */
export default function VehicleNegotiationPanel() {
  const router = useRouter();
  
  const [branches, setBranches] = useState([]);
  const [subCompanies, setSubCompanies] = useState([]);
  const [countries, setCountries] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [vnnNumber, setVnnNumber] = useState("");
  const [stateData, setStateData] = useState({});
  const [districtData, setDistrictData] = useState({});
  const [purchaseTypes, setPurchaseTypes] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const vehicleSearch = useVehicleSearch();
  const supplierSearch = useSupplierSearch();
  
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const customerSearch = useCustomerSearch();

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedOrderPanels, setSelectedOrderPanels] = useState([]);
  const orderPanelSearch = useOrderPanelSearch();

  const handleOrderPanelSelect = useCallback(async (fullPanel, removePanelId = null) => {
    if (removePanelId) {
      const panelToRemove = selectedOrderPanels.find(p => p._id === removePanelId);
      
      setSelectedOrderPanels(prev => prev.filter(p => p._id !== removePanelId));
      setOrders(prev => prev.filter(order => order.orderPanelId !== removePanelId));
      
      if (panelToRemove) {
        setHeader(prev => ({
          ...prev,
          collectionCharges: String(Math.max(0, (Number(prev.collectionCharges) || 0) - (Number(panelToRemove.collectionCharges) || 0))),
          cancellationCharges: String(Math.max(0, (Number(prev.cancellationCharges) || 0) - (Number(panelToRemove.cancellationCharges) || 0))),
          loadingCharges: String(Math.max(0, (Number(prev.loadingCharges) || 0) - (Number(panelToRemove.loadingCharges) || 0))),
          otherCharges: String(Math.max(0, (Number(prev.otherCharges) || 0) - (Number(panelToRemove.otherCharges) || 0))),
          loadingPoints: String(Math.max(0, (Number(prev.loadingPoints) || 0) - (Number(panelToRemove.loadingPoints) || 0))),
          dropPoints: String(Math.max(0, (Number(prev.dropPoints) || 0) - (Number(panelToRemove.dropPoints) || 0)))
        }));
      }
      
      if (selectedOrderPanels.length === 1) {
        setOrders([defaultOrderRow()]);
        setHeader(prev => ({
          ...prev,
          branch: null,
          branchName: "",
          branchCode: "",
          subCompanyId: null,
          subCompanyName: "",
          subCompanyCode: "",
          partyName: "",
          customerId: null,
          collectionCharges: "",
          cancellationCharges: "",
          loadingCharges: "",
          otherCharges: "",
          loadingPoints: "",
          dropPoints: ""
        }));
        setSelectedCustomer(null);
        setCustomerSearchQuery("");
      }
    } else {
      if (selectedOrderPanels.some(p => p._id === fullPanel._id)) {
        console.log(`⚠️ Order ${fullPanel.orderPanelNo} already selected`);
        return;
      }
      
      if (selectedOrderPanels.length > 0) {
        const currentSubCompanyId = selectedOrderPanels[0].subCompanyId;
        const newSubCompanyId = fullPanel.subCompanyId;
        
        if (currentSubCompanyId && newSubCompanyId && currentSubCompanyId !== newSubCompanyId) {
          alert(`⚠️ You can only select orders from the same sub-company.\nCurrent: ${selectedOrderPanels[0].subCompanyName || 'None'}\nSelected: ${fullPanel.subCompanyName || 'None'}`);
          return;
        }
        
        if (currentSubCompanyId && !newSubCompanyId) {
          alert(`⚠️ This order has no sub-company. Please select orders from the same sub-company: ${selectedOrderPanels[0].subCompanyName}`);
          return;
        }
        
        if (!currentSubCompanyId && newSubCompanyId) {
          alert(`⚠️ This order has sub-company: ${fullPanel.subCompanyName}. Please select orders from the same sub-company or start fresh.`);
          return;
        }
      }
      
      console.log(`➕ Adding order: ${fullPanel.orderPanelNo}`);
      
      setSelectedOrderPanels(prev => [...prev, fullPanel]);
      
      if (fullPanel.plantRows && fullPanel.plantRows.length > 0) {
        const newOrders = fullPanel.plantRows.map((row) => {
          let plantId = null;
          let plantName = '';
          let plantCode = '';
          
          if (row.plantCode) {
            if (typeof row.plantCode === 'object' && row.plantCode._id) {
              plantId = row.plantCode._id;
              plantName = row.plantCode.name || '';
              plantCode = row.plantCode.code || '';
            } else if (typeof row.plantCode === 'string' && isValidObjectId(row.plantCode)) {
              plantId = row.plantCode;
              plantName = row.plantName || '';
              plantCode = row.plantCodeValue || '';
            }
          }
          
          if (!plantId && row.plantCodeValue) {
            const plant = plants.find(p => p.code === row.plantCodeValue);
            if (plant) {
              plantId = plant._id;
              plantName = plant.name;
              plantCode = plant.code;
            }
          }
          
          return {
            _id: uid(),
            orderNo: fullPanel.orderPanelNo,
            orderPanelId: fullPanel._id,
            partyName: fullPanel.partyName || fullPanel.customerName || "",
            customerId: fullPanel.customerId || null,
            customerCode: fullPanel.customerCode || "",
            contactPerson: fullPanel.contactPerson || "",
            plantCode: plantId,
            plantName: plantName || row.plantName || "",
            plantCodeValue: plantCode || row.plantCodeValue || "",
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
            weight: row.weight || "",
            status: row.status || "Open",
            collectionCharges: fullPanel.collectionCharges?.toString() || "",
            cancellationCharges: fullPanel.cancellationCharges?.toString() || "",
            loadingCharges: fullPanel.loadingCharges?.toString() || "",
            otherCharges: fullPanel.otherCharges?.toString() || "",
            localStatus: row.localStatus || "unknown",
            localStatusLabel: row.localStatusLabel || "Unknown",
            subCompanyId: fullPanel.subCompanyId || null,
            subCompanyName: fullPanel.subCompanyName || '',
            subCompanyCode: fullPanel.subCompanyCode || ''
          };
        });
        
        setOrders(prev => {
          const existingOrdersFromPanel = prev.filter(o => o.orderPanelId === fullPanel._id);
          if (existingOrdersFromPanel.length > 0) {
            const otherOrders = prev.filter(o => o.orderPanelId !== fullPanel._id);
            return [...otherOrders, ...newOrders];
          }
          return [...prev, ...newOrders];
        });
      }

      setHeader(prev => {
        const newHeader = { ...prev };
        
        if (selectedOrderPanels.length === 0) {
          newHeader.branch = fullPanel.branch || null;
          newHeader.branchName = fullPanel.branchName || "";
          newHeader.branchCode = fullPanel.branchCode || "";
          newHeader.subCompanyId = fullPanel.subCompanyId || null;
          newHeader.subCompanyName = fullPanel.subCompanyName || "";
          newHeader.subCompanyCode = fullPanel.subCompanyCode || "";
          newHeader.delivery = fullPanel.delivery || "Urgent";
          newHeader.date = fullPanel.date ? new Date(fullPanel.date).toISOString().split('T')[0] : prev.date;
          newHeader.partyName = fullPanel.partyName || fullPanel.customerName || "";
          newHeader.customerId = fullPanel.customerId || null;
          newHeader.collectionCharges = fullPanel.collectionCharges?.toString() || "0";
          newHeader.cancellationCharges = fullPanel.cancellationCharges?.toString() || "0";
          newHeader.loadingCharges = fullPanel.loadingCharges?.toString() || "0";
          newHeader.otherCharges = fullPanel.otherCharges?.toString() || "0";
          newHeader.loadingPoints = fullPanel.loadingPoints?.toString() || "0";
          newHeader.dropPoints = fullPanel.dropPoints?.toString() || "0";
        } else {
          newHeader.collectionCharges = String((Number(prev.collectionCharges) || 0) + (Number(fullPanel.collectionCharges) || 0));
          newHeader.cancellationCharges = String((Number(prev.cancellationCharges) || 0) + (Number(fullPanel.cancellationCharges) || 0));
          newHeader.loadingCharges = String((Number(prev.loadingCharges) || 0) + (Number(fullPanel.loadingCharges) || 0));
          newHeader.otherCharges = String((Number(prev.otherCharges) || 0) + (Number(fullPanel.otherCharges) || 0));
          newHeader.loadingPoints = String((Number(prev.loadingPoints) || 0) + (Number(fullPanel.loadingPoints) || 0));
          newHeader.dropPoints = String((Number(prev.dropPoints) || 0) + (Number(fullPanel.dropPoints) || 0));
          if (!prev.subCompanyId) {
            newHeader.subCompanyId = fullPanel.subCompanyId || null;
            newHeader.subCompanyName = fullPanel.subCompanyName || "";
            newHeader.subCompanyCode = fullPanel.subCompanyCode || "";
          }
        }
        
        return newHeader;
      });

      if (selectedOrderPanels.length === 0 && fullPanel.customerId) {
        const customer = customerSearch.customers.find(c => c._id === fullPanel.customerId);
        if (customer) {
          setSelectedCustomer(customer);
          setCustomerSearchQuery(customer.customerName);
        }
      }
    }
  }, [selectedOrderPanels, plants, customerSearch.customers]);

  const hasLoadedOrders = useRef(false);

  useEffect(() => {
    if (hasLoadedOrders.current) {
      console.log('⏭️ Orders already loaded, skipping...');
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const orderIds = urlParams.get('orderIds');
    const orderPanelNos = urlParams.get('orderPanelNos');
    
    if (!orderIds) {
      console.log('ℹ️ No order IDs found in URL');
      return;
    }

    const ids = orderIds.split(',').filter(id => id.trim() !== '');
    const panelNos = orderPanelNos ? orderPanelNos.split(',').filter(no => no.trim() !== '') : [];
    
    console.log(` Loading ${ids.length} order(s) from URL params`);
    
    hasLoadedOrders.current = true;

    const fetchAndSelectOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        const loadedPanels = [];
        
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          const panelNo = panelNos[i] || '';
          
          if (!id) continue;
          
          console.log(` Fetching order ${i + 1}/${ids.length}: ${id}`);
          
          const res = await fetch(`/api/order-panel?id=${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          
          if (data.success && data.data) {
            const panel = data.data;
            
            const formattedPanel = {
              _id: panel._id,
              orderPanelNo: panel.orderPanelNo || panelNo,
              branchName: panel.branchName || '',
              branchCode: panel.branchCode || '',
              branch: panel.branch || null,
              subCompanyId: panel.subCompanyId || null,
              subCompanyName: panel.subCompanyName || '',
              subCompanyCode: panel.subCompanyCode || '',
              customerId: panel.customerId || null,
              customerName: panel.customerName || '',
              customerCode: panel.customerCode || '',
              contactPerson: panel.contactPerson || '',
              partyName: panel.partyName || panel.customerName || '',
              collectionCharges: panel.collectionCharges || 0,
              cancellationCharges: panel.cancellationCharges || 'Nil',
              loadingCharges: panel.loadingCharges || 'Nil',
              otherCharges: panel.otherCharges || 0,
              loadingPoints: panel.loadingPoints || 0,
              dropPoints: panel.dropPoints || 0,
              delivery: panel.delivery || 'Normal',
              date: panel.date,
              plantRows: panel.plantRows || [],
              packData: panel.packData || {}
            };
            
            loadedPanels.push(formattedPanel);
            console.log(`✅ Loaded order: ${formattedPanel.orderPanelNo}`);
          } else {
            console.warn(`⚠️ Failed to load order ${id}:`, data.message);
          }
        }
        
        console.log(` Adding ${loadedPanels.length} panel(s) to the form`);
        for (const panel of loadedPanels) {
          await new Promise(resolve => setTimeout(resolve, 100));
          await handleOrderPanelSelect(panel);
        }
        
        console.log(`✅ Successfully loaded ${loadedPanels.length} order panel(s)`);
        
        if (loadedPanels.length === 0) {
          alert('No valid orders could be loaded. Please try selecting orders again.');
        }
        
      } catch (error) {
        console.error('Error loading selected orders:', error);
        alert('Error loading selected orders. Please try again.');
      }
    };
    
    fetchAndSelectOrders();
  }, [handleOrderPanelSelect]);

  const fetchPurchaseTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/purchase-type', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPurchaseTypes(data.data.map(item => item.name));
      } else {
        setPurchaseTypes([]);
      }
    } catch (error) {
      console.error('Error fetching purchase types:', error.message);
      setPurchaseTypes([]);
    }
  };

  const fetchPaymentTerms = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payment-terms', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPaymentTerms(data.data.map(item => item.name));
      } else {
        setPaymentTerms([]);
      }
    } catch (error) {
      console.error('Error fetching payment terms:', error.message);
      setPaymentTerms([]);
    }
  };

  const [header, setHeader] = useState({
    vnnNo: "",
    branch: null,
    branchName: "",
    branchCode: "",
    subCompanyId: null,
    subCompanyName: "",
    subCompanyCode: "",
    delivery: "Urgent",
    date: new Date().toISOString().split('T')[0],
    loadingPoints: "",
    dropPoints: "",
    collectionCharges: "",
    cancellationCharges: "",
    loadingCharges: "",
    otherCharges: "",
    partyName: "",
    customerId: null
  });

  const [orders, setOrders] = useState([]);
  const [voiceFileInfo, setVoiceFileInfo] = useState(null);
  const [memoFile, setMemoFile] = useState(null);
  const audioRef = useRef(null);

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

  useEffect(() => {
    fetchBranches();
    fetchCountries();
    fetchPlants();
    fetchSubCompanies();
    supplierSearch.searchSuppliers();
    fetchPurchaseTypes();
    fetchPaymentTerms();   
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
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchQuery(customer.customerName);
    setShowCustomerDropdown(false);
    
    setHeader(prev => ({
      ...prev,
      partyName: customer.customerName,
      customerId: customer._id
    }));
    
    setOrders(prevOrders => 
      prevOrders.map(order => ({
        ...order,
        partyName: customer.customerName,
        customerId: customer._id,
        customerCode: customer.customerCode,
        contactPerson: customer.contactPersonName || ""
      }))
    );
  };

  const handleCustomerInputFocus = async () => {
    if (!showCustomerDropdown && selectedOrderPanels.length === 0) {
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

const handleSupplierSelect = (supplier) => {
  if (!supplier) {
    setSelectedSupplier(null);

    setApproval(prev => ({
      ...prev,
      vendorName: "",
      vendorId: null,
      vendorCode: "",
      vendorStatus: "Active"
    }));
    return;
  }
  
  setSelectedSupplier(supplier);
  setApproval(prev => ({
    ...prev,
    vendorName: supplier.supplierName,
    vendorId: supplier._id,
    vendorCode: supplier.supplierCode,
    vendorStatus: supplier.supplierStatus || "Active"
  }));
};

  const updateOrder = (id, key, value) => {
    setOrders((prev) => prev.map((r) => (r._id === id ? { ...r, [key]: value } : r)));
  };

  const removeOrder = (id) => {
    if (orders.length > 1) {
      const orderToRemove = orders.find(o => o._id === id);
      if (orderToRemove && orderToRemove.orderPanelId) {
        const otherOrdersFromSamePanel = orders.filter(o => 
          o.orderPanelId === orderToRemove.orderPanelId && o._id !== id
        );
        
        if (otherOrdersFromSamePanel.length === 0) {
          setSelectedOrderPanels(prev => 
            prev.filter(p => p._id !== orderToRemove.orderPanelId)
          );
        }
      }
      
      setOrders((prev) => prev.filter((x) => x._id !== id));
    } else {
      alert("At least one order row is required");
    }
  };

  const totalWeight = useMemo(() => {
    return orders.reduce((acc, r) => acc + num(r.weight), 0);
  }, [orders]);

  const [negotiation, setNegotiation] = useState({
    maxRate: "",
    targetRate: "",
    purchaseType: "",
    oldRatePercent: "",
    remarks1: "",
  });

  const [vendors, setVendors] = useState([defaultVendorRow()]);

  const addVendor = () => setVendors((p) => [...p, defaultVendorRow()]);
  const removeVendor = (id) => {
    if (vendors.length > 1) {
      setVendors((p) => p.filter((x) => x._id !== id));
    } else {
      alert("At least one vendor row is required");
    }
  };
  const updateVendor = (id, key, value) =>
    setVendors((p) => p.map((v) => (v._id === id ? { ...v, [key]: value } : v)));

  const [voiceUrl, setVoiceUrl] = useState("");

  const [approval, setApproval] = useState({
    vendorName: "",
    vendorId: null,
    vendorCode: "",
    vendorStatus: "Active",
    rateType: "",
    finalPerMT: "",
    finalFix: "",
    vehicleNo: "",
    vehicleId: "",
    vehicleData: null,
    mobile: "",
    purchaseType: "",
    paymentTerms: "",
    approvalStatus: "",
    remarks: "",
    memoStatus: "Pending",
    memoFile: null
  });

  const purchaseAmount = useMemo(() => {
    if (approval.rateType === "Per MT") {
      return num(approval.finalPerMT) * totalWeight;
    }
    return num(approval.finalFix);
  }, [approval.rateType, approval.finalPerMT, approval.finalFix, totalWeight]);

  const reportRows = useMemo(() => {
    return orders.map((o) => ({
      _id: o._id,
      date: header.date,
      vnn: header.vnnNo,
      order: o.orderNo,
      partyName: o.partyName || "-",
      plantCode: o.plantName || "-",
      orderType: o.orderType,
      pinCode: o.pinCode || "-",
      from: o.fromName || "-",
      to: o.toName || "-",
      taluka: o.talukaName || "-",
      district: o.districtName || "-",
      state: o.stateName || "-",
      country: o.countryName || "-",
      weight: o.weight,
      orderStatus: o.status,
      approval: approval.approvalStatus || "Pending",
      memo: approval.memoStatus || "Pending",
    }));
  }, [orders, header.date, header.vnnNo, approval.approvalStatus, approval.memoStatus]);

  const handleMemoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert("❌ Please upload only PDF or image files (JPEG, PNG)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("❌ File size should be less than 5MB");
      return;
    }

    setMemoFile(file);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
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
        setApproval((p) => ({ 
          ...p, 
          memoStatus: "Uploaded",
          memoFile: {
            filePath: data.filePath,
            fullPath: data.fullPath,
            filename: data.filename,
            originalName: file.name,
            size: file.size,
            mimeType: file.type
          }
        }));
        alert("✅ Memo uploaded successfully!");
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading memo:", error);
      alert("❌ Failed to upload memo. Please try again.");
    }
  };

  const handleVoiceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/webm'];
    if (!allowedTypes.includes(file.type)) {
      alert("❌ Please upload only audio files (MP3, WAV, M4A)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("❌ Audio file size should be less than 10MB");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      
      const data = await res.json();
      
      if (data.success) {
        let audioUrl;
        if (process.env.NODE_ENV === 'development' && data.filePath) {
          audioUrl = data.filePath;
        } else {
          audioUrl = URL.createObjectURL(file);
        }
        
        setVoiceUrl(audioUrl);
        
        setVoiceFileInfo({
          filePath: data.filePath,
          fullPath: data.fullPath,
          filename: data.filename,
          originalName: file.name,
          size: file.size,
          mimeType: file.type
        });
        
        alert("✅ Voice note uploaded successfully!");
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading voice note:", error);
      alert("❌ Failed to upload voice note. Please try again.");
    }
  };

  const handleCreateVehicle = () => {
    router.push('/admin/vehicle2');
  };

  const handleSaveAll = async () => {
    if (!header.branch) {
      alert("Please select a branch");
      return;
    }
    
    if (orders.length === 0) {
      alert("Please add at least one order");
      return;
    }
    
    const hasInvalidOrders = orders.some(order => !order.plantCode);
    if (hasInvalidOrders) {
      const invalidCount = orders.filter(order => !order.plantCode).length;
      alert(`Please select plant for all order rows. ${invalidCount} row(s) missing plant code.`);
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
          customerName: selectedCustomer?.customerName || '',
          customerCode: selectedCustomer?.customerCode || '',
          contactPerson: selectedCustomer?.contactPersonName || '',
          customerId: selectedCustomer?._id || null
        },
        selectedOrderPanels: selectedOrderPanels.map(panel => ({
          _id: panel._id,
          orderPanelNo: panel.orderPanelNo,
          subCompanyId: panel.subCompanyId || header.subCompanyId || null,
          subCompanyName: panel.subCompanyName || header.subCompanyName || '',
          subCompanyCode: panel.subCompanyCode || header.subCompanyCode || ''
        })),
        orders: orders.map(order => ({
          orderNo: order.orderNo,
          orderPanelId: order.orderPanelId,
          partyName: order.partyName,
          customerId: order.customerId || null,
          customerCode: order.customerCode,
          contactPerson: order.contactPerson,
          plantCode: order.plantCode || null,
          plantName: order.plantName,
          plantCodeValue: order.plantCodeValue,
          orderType: order.orderType,
          pinCode: order.pinCode,
          from: order.from || null,
          fromName: order.fromName,
          fromState: order.fromState || '',
          to: order.to || null,
          toName: order.toName,
          taluka: order.taluka,
          talukaName: order.talukaName,
          district: order.district,
          districtName: order.districtName,
          state: order.state,
          stateName: order.stateName,
          country: order.country,
          countryName: order.countryName,
          weight: num(order.weight),
          status: order.status,
          collectionCharges: num(order.collectionCharges) || 0,
          cancellationCharges: order.cancellationCharges || 'Nil',
          loadingCharges: order.loadingCharges || 'Nil',
          otherCharges: num(order.otherCharges) || 0,
          localStatus: order.localStatus || 'unknown',
          localStatusLabel: order.localStatusLabel || 'Unknown',
          subCompanyId: order.subCompanyId || header.subCompanyId || null,
          subCompanyName: order.subCompanyName || header.subCompanyName || '',
          subCompanyCode: order.subCompanyCode || header.subCompanyCode || ''
        })),
        totalWeight,
        negotiation: {
          maxRate: num(negotiation.maxRate),
          targetRate: num(negotiation.targetRate),
          purchaseType: negotiation.purchaseType,
          oldRatePercent: negotiation.oldRatePercent,
          remarks1: negotiation.remarks1,
        },
        vendors: vendors.map(vendor => ({
          vendorName: vendor.vendorName,
          vendorCode: vendor.vendorCode || '',
          marketRate: num(vendor.marketRate),
          purchaseType: vendor.purchaseType || ''
        })),
        voiceUrl: voiceUrl || '',
        voiceFileInfo: voiceFileInfo,
        approval: {
          vendorName: approval.vendorName,
          vendorId: approval.vendorId,
          vendorCode: approval.vendorCode,
          vendorStatus: approval.vendorStatus,
          rateType: approval.rateType,
          finalPerMT: num(approval.finalPerMT),
          finalFix: num(approval.finalFix),
          vehicleNo: approval.vehicleNo,
          vehicleId: approval.vehicleId,
          vehicleData: approval.vehicleData,
          mobile: approval.mobile,
          purchaseType: approval.purchaseType,
          paymentTerms: approval.paymentTerms,
          approvalStatus: approval.approvalStatus,
          remarks: approval.remarks,
          memoStatus: approval.memoStatus,
          memoFile: approval.memoFile
        },
        reportRows: reportRows.map(row => ({
          ...row,
          weight: num(row.weight)
        })),
        branches: branches,
        plants: plants,
        countries: countries,
        states: Object.values(stateData).flat(),
        districts: Object.values(districtData).flat()
      };

      const res = await fetch('/api/vehicle-negotiation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Failed to save vehicle negotiation: ${res.status}`);
      }

      setSaveSuccess(true);
      setVnnNumber(data.data?.vnnNo || "Generated");
      
      alert(`✅ Vehicle negotiation saved successfully!\nVNN Number: ${data.data?.vnnNo}`);
      
      resetForm();
      
    } catch (error) {
      console.error('Error saving vehicle negotiation:', error);
      setSaveError(error.message || 'Failed to save vehicle negotiation');
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    const hasData = 
      header.branch || 
      selectedCustomer || 
      customerSearchQuery.trim() || 
      header.collectionCharges || 
      header.cancellationCharges || 
      header.loadingCharges || 
      header.otherCharges ||
      orders.length > 1 ||
      vendors.some(vendor => vendor.vendorName || vendor.marketRate) ||
      negotiation.maxRate !== "" ||
      negotiation.targetRate !== "" ||
      selectedVehicle ||
      selectedOrderPanels.length > 0;

    if (hasData) {
      const confirmReset = window.confirm(
        "Are you sure you want to reset the form? All unsaved data will be lost."
      );
      
      if (!confirmReset) {
        return;
      }
    }

    setHeader({
      vnnNo: "",
      branch: null,
      branchName: "",
      branchCode: "",
      subCompanyId: null,
      subCompanyName: "",
      subCompanyCode: "",
      delivery: "Urgent",
      date: new Date().toISOString().split('T')[0],
      loadingPoints: "",
      dropPoints: "",
      collectionCharges: "",
      cancellationCharges: "",
      loadingCharges: "",
      otherCharges: "",
      partyName: "",
      customerId: null
    });
    
    setOrders([defaultOrderRow()]);
    
    setNegotiation({
      maxRate: "",
      targetRate: "",
      purchaseType: "",
      oldRatePercent: "",
      remarks1: "",
    });
    
    setVendors([defaultVendorRow()]);
    
    setApproval({
      vendorName: "",
      vendorId: null,
      vendorCode: "",
      vendorStatus: "Active",
      rateType: "",
      finalPerMT: "",
      finalFix: "",
      vehicleNo: "",
      vehicleId: "",
      vehicleData: null,
      mobile: "",
      purchaseType: "",
      paymentTerms: "",
      approvalStatus: "",
      remarks: "",
      memoStatus: "Pending",
      memoFile: null,
    });
    
    setSelectedCustomer(null);
    setCustomerSearchQuery("");
    setFilteredCustomers([]);
    setSelectedSupplier(null);
    setSelectedOrderPanels([]);
    setSelectedVehicle(null);
    setVoiceUrl("");
    setVoiceFileInfo(null);
    setMemoFile(null);
    
    setStateData({});
    setDistrictData({});
    
    setSaveSuccess(false);
    setSaveError(null);
    setVnnNumber("");
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const ordersColumns = [
    { key: "orderNo", label: "Order No" },
    { key: "partyName", label: "Party Name" },
    { key: "plantCode", label: "Plant Code *" },
    { key: "plantName", label: "Plant Name" },
    { key: "orderType", label: "Order Type" },
    { key: "pinCode", label: "Pin Code" },
    { key: "from", label: "From" },
    { key: "to", label: "To" },
    { key: "taluka", label: "Taluka" },
    { key: "district", label: "District" },
    { key: "state", label: "State" },
    { key: "localStatus", label: "Local/Not Local" },
    { key: "country", label: "Country" },
    { key: "weight", label: "Weight" },
    { key: "status", label: "Status" },
    { key: "collectionCharges", label: "Collection Charges" },
    { key: "cancellationCharges", label: "Cancellation Charges" },
    { key: "loadingCharges", label: "Loading Charges" },
    { key: "otherCharges", label: "Other Charges" },
    { key: "subCompanyName", label: "Sub-Company" },
  ];

  const vendorColumns = [
    { key: "vendorName", label: "Supplier Name" },
    { key: "vendorCode", label: "Supplier Code" },
    { key: "purchaseType", label: "Purchase - Type", options: PURCHASE_TYPES },
    { key: "marketRate", label: "Market Rates", type: "number" },
  ];

  const reportColumns = [
    { key: "date", label: "Date" },
    { key: "vnn", label: "VNN" },
    { key: "order", label: "Order" },
    { key: "partyName", label: "Party Name" },
    { key: "plantCode", label: "Plant Code" },
    { key: "orderType", label: "Order Type" },
    { key: "pinCode", label: "Pin Code" },
    { key: "from", label: "From" },
    { key: "to", label: "To" },
    { key: "taluka", label: "Taluka" },
    { key: "district", label: "District" },
    { key: "state", label: "State" },
    { key: "country", label: "Country" },
    { key: "weight", label: "Weight" },
    { key: "orderStatus", label: "Order Status" },
    { key: "approval", label: "Approval" },
    { key: "memo", label: "Memo" },
  ];

  const billingColumns = [
    { key: "billingType", label: "Billing Type", options: BILLING_TYPES },
    { key: "loadingPoints", label: "No. of Loading Points", type: "number" },
    { key: "dropPoints", label: "No. of Droping Point", type: "number" },
  ];

  const OrdersTable = ({ rows, onChange, onRemove }) => {
    const columns = ordersColumns;
    const isReadOnlyMode = selectedOrderPanels.length > 0;

    return (
      <div className="overflow-auto rounded-xl border border-yellow-300 max-h-[500px]">
        <TransactionKeyboardTable className="min-w-max w-full text-sm">
          <thead className="sticky top-0 bg-yellow-400 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="border border-yellow-500 px-3 py-3 text-xs font-extrabold text-slate-900 text-center"
                  style={{ minWidth: col.key === "orderNo" ? "120px" : col.key === "partyName" ? "150px" : "120px" }}
                >
                  {col.label}
                </th>
              ))}
              <th className="border border-yellow-500 px-3 py-3 text-xs font-extrabold text-slate-900 text-center">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => {
                const isReadOnly = isReadOnlyMode || (row.orderPanelId && selectedOrderPanels.length > 0);
                
                return (
                  <tr key={row._id} className="hover:bg-yellow-50 even:bg-slate-50">
                    <td className="border border-yellow-300 px-2 py-2">
                      <input
                        value={row.orderNo || ""}
                        onChange={(e) => onChange(row._id, 'orderNo', e.target.value)}
                        readOnly={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        placeholder="Order No"
                      />
                    </td>
                    <td className="border border-yellow-300 px-2 py-2">
                      <input
                        value={row.partyName || ""}
                        onChange={(e) => onChange(row._id, 'partyName', e.target.value)}
                        readOnly={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        placeholder="Party Name"
                      />
                    </td>
                    <td className="border border-yellow-300 px-2 py-2">
                      <input
                        value={row.plantCode || ""}
                        onChange={(e) => onChange(row._id, 'plantCode', e.target.value)}
                        readOnly={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        placeholder="Plant Code"
                      />
                    </td>
                    <td className="border border-yellow-300 px-2 py-2">
                      <input
                        value={row.plantName || ""}
                        onChange={(e) => onChange(row._id, 'plantName', e.target.value)}
                        readOnly={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        placeholder="Plant Name"
                      />
                    </td>
                    <td className="border border-yellow-300 px-2 py-2">
                      <select
                        value={row.orderType || ""}
                        onChange={(e) => onChange(row._id, 'orderType', e.target.value)}
                        disabled={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                      >
                        <option value="">Select Order Type</option>
                        {ORDER_TYPES.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                    <td className="border border-yellow-300 px-2 py-2">
                      <input
                        value={row.pinCode || ""}
                        onChange={(e) => onChange(row._id, 'pinCode', e.target.value)}
                        readOnly={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        placeholder="Pin Code"
                      />
                    </td>
                    <td className="border border-yellow-300 px-2 py-2">
                      <input
                        value={row.fromName || ""}
                        onChange={(e) => onChange(row._id, 'fromName', e.target.value)}
                        readOnly={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        placeholder="From"
                      />
                    </td>
                    <td className="border border-yellow-300 px-2 py-2">
                      <input
                        value={row.toName || ""}
                        onChange={(e) => onChange(row._id, 'toName', e.target.value)}
                        readOnly={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        placeholder="To"
                      />
                    </td>
                    <td className="border border-yellow-300 px-2 py-2">
                      <input
                        value={row.talukaName || row.taluka || ""}
                        onChange={(e) => onChange(row._id, 'talukaName', e.target.value)}
                        readOnly={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        placeholder="Taluka"
                      />
                    </td>
                    <td className="border border-yellow-300 px-2 py-2">
                      <input
                        value={row.districtName || row.district || ""}
                        onChange={(e) => onChange(row._id, 'districtName', e.target.value)}
                        readOnly={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        placeholder="District"
                      />
                    </td>
                    <td className="border border-yellow-300 px-2 py-2">
                      <input
                        value={row.stateName || row.state || ""}
                        onChange={(e) => onChange(row._id, 'stateName', e.target.value)}
                        readOnly={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        placeholder="State"
                      />
                    </td>
                    <td className="border border-yellow-300 px-2 py-2 text-center">
                      {row.fromState && row.stateName ? (
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
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
                    <td className="border border-yellow-300 px-2 py-2">
                      <input
                        value={row.countryName || row.country || ""}
                        onChange={(e) => onChange(row._id, 'countryName', e.target.value)}
                        readOnly={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        placeholder="Country"
                      />
                    </td>
                    <td className="border border-yellow-300 px-2 py-2">
                      <input
                        type="number"
                        value={row.weight || ""}
                        onChange={(e) => onChange(row._id, 'weight', e.target.value)}
                        readOnly={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        placeholder="Weight"
                      />
                    </td>
                    <td className="border border-yellow-300 px-2 py-2">
                      <select
                        value={row.status || ""}
                        onChange={(e) => onChange(row._id, 'status', e.target.value)}
                        disabled={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                      >
                        <option value="">Select Status</option>
                        {STATUSES.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                    <td className="border border-yellow-300 px-2 py-2">
                      <input
                        type="number"
                        value={row.collectionCharges || ""}
                        onChange={(e) => onChange(row._id, 'collectionCharges', e.target.value)}
                        readOnly={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        placeholder="Collection Charges"
                      />
                    </td>
                    <td className="border border-yellow-300 px-2 py-2">
                      <input
                        value={row.cancellationCharges || ""}
                        onChange={(e) => onChange(row._id, 'cancellationCharges', e.target.value)}
                        readOnly={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        placeholder="Cancellation Charges"
                      />
                    </td>
                    <td className="border border-yellow-300 px-2 py-2">
                      <input
                        value={row.loadingCharges || ""}
                        onChange={(e) => onChange(row._id, 'loadingCharges', e.target.value)}
                        readOnly={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        placeholder="Loading Charges"
                      />
                    </td>
                    <td className="border border-yellow-300 px-2 py-2">
                      <input
                        type="number"
                        value={row.otherCharges || ""}
                        onChange={(e) => onChange(row._id, 'otherCharges', e.target.value)}
                        readOnly={isReadOnly}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                        placeholder="Other Charges"
                      />
                    </td>
                    <td className="border border-yellow-300 px-2 py-2">
                      <div className="text-sm">
                        <span className="font-medium">{row.subCompanyName || '-'}</span>
                        {row.subCompanyCode && (
                          <span className="text-xs text-gray-500 ml-1">({row.subCompanyCode})</span>
                        )}
                      </div>
                    </td>
                    <td className="border border-yellow-300 px-2 py-2 text-center">
                      {isReadOnly ? (
                        <span className="text-xs text-slate-400">Read Only</span>
                      ) : (
                        <button
                          onClick={() => onRemove(row._id)}
                          className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 transition"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="border border-yellow-300 px-4 py-8 text-center text-slate-400">
                  No orders added. Select order panels above to add orders.
                </td>
              </tr>
            )}
          </tbody>
        </TransactionKeyboardTable>
      </div>
    );
  };

  const VendorsTable = ({ rows, onChange, onRemove, onAdd }) => {
    const [selectedSupplierNames, setSelectedSupplierNames] = useState({});
    
    useEffect(() => {
      const names = {};
      rows.forEach(row => {
        if (row.vendorName) {
          names[row._id] = row.vendorName;
        }
      });
      setSelectedSupplierNames(names);
    }, [rows]);

    return (
      <div className="overflow-auto rounded-xl border border-yellow-300 max-h-[300px]">
        <TransactionKeyboardTable className="min-w-full w-full text-sm">
          <thead className="sticky top-0 bg-yellow-400">
            <tr>
              {vendorColumns.map((col) => (
                <th
                  key={col.key}
                  className="border border-yellow-500 px-3 py-3 text-xs font-extrabold text-slate-900 text-center"
                >
                  {col.label}
                </th>
              ))}
              <th className="border border-yellow-500 px-3 py-3 text-xs font-extrabold text-slate-900 text-center">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr key={row._id} className="hover:bg-yellow-50 even:bg-slate-50">
                <td className="border border-yellow-300 px-2 py-2">
                  <TableSearchableDropdown
                    items={supplierSearch?.suppliers || []}
                    selectedId={selectedSupplierNames[row._id] || row.vendorName}
                    onSelect={(supplier) => {
                      if (supplier) {
                        setSelectedSupplierNames(prev => ({
                          ...prev,
                          [row._id]: supplier.supplierName
                        }));
                        updateVendor(row._id, 'vendorName', supplier.supplierName);
                        updateVendor(row._id, 'vendorCode', supplier.supplierCode || '');
                      }
                    }}
                    placeholder="Select Supplier"
                    displayField="supplierName"
                    codeField="supplierCode"
                    cellId={`supplier-${row._id}`}
                  />
                </td>
                <td className="border border-yellow-300 px-2 py-2">
                  <input
                    type="text"
                    value={row.vendorCode || ""}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none cursor-not-allowed"
                    placeholder="Auto-filled"
                  />
                </td>
                <td className="border border-yellow-300 px-2 py-2">
                  <select
                    value={row.purchaseType || ""}
                    onChange={(e) => updateVendor(row._id, 'purchaseType', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  >
                    <option value="">Select Purchase Type</option>
                    {purchaseTypes.length > 0 ? (
                      purchaseTypes.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))
                    ) : (
                      <option value="" disabled>No purchase types available</option>
                    )}
                  </select>
                </td>
                <td className="border border-yellow-300 px-2 py-2">
                  <input
                    type="text"
                    defaultValue={row.marketRate || ""}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        updateVendor(row._id, 'marketRate', value);
                      } else {
                        e.target.value = row.marketRate || "";
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                    placeholder="Enter Market Rate"
                  />
                </td>
                <td className="border border-yellow-300 px-2 py-2 text-center">
                  {rows.length > 1 && (
                    <button
                      onClick={() => onRemove(row._id)}
                      className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 transition"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TransactionKeyboardTable>
      </div>
    );
  };

  return (
    <TransactionFormKeyboardNavigation>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-full px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-lg font-extrabold text-slate-900">Vehicle Negotiation Panel</div>
            {saveSuccess && (
              <div className="text-sm text-green-600 font-medium">
                ✅ Vehicle negotiation saved successfully! VNN Number: {vnnNumber}
              </div>
            )}
            {saveError && (
              <div className="text-sm text-red-600 font-medium">❌ {saveError}</div>
            )}
          </div>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition ${
              saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700'
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

      <div className="mx-auto max-w-full p-4 space-y-4">
        {/* PART 1: VEHICLE NEGOTIATION - PART 1 */}
        <Card title="Vehicle Negotiation - Panel - Part -1">
          <div className="grid grid-cols-12 gap-3 mb-4">
            <div className="col-span-12 md:col-span-3">
              <label className="text-xs font-bold text-slate-600">Vehicle Negotiation No</label>
              <div className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                {vnnNumber || "Auto-generated on save"}
              </div>
            </div>
            
            <div className="col-span-12 md:col-span-6">
              <label className="text-xs font-bold text-slate-600">Select Order Panels (Multi-Select)</label>
              <MultiSelectOrderPanelDropdown
                selectedPanels={selectedOrderPanels}
                onSelect={handleOrderPanelSelect}
                placeholder="Search and select order panels..."
              />
              {selectedOrderPanels.length > 0 && (
                <div className="text-xs text-slate-500 mt-1">
                  {selectedOrderPanels.length} order panel(s) selected • {orders.length} total order row(s)
                </div>
              )}
            </div>
            
            <div className="col-span-12 md:col-span-3">
              <label className="text-xs font-bold text-slate-600">Branch *</label>
              <SearchableDropdown
                items={branches}
                selectedId={header.branch}
                onSelect={(branch) => setHeader(p => ({ ...p, branch: branch?._id || null, branchName: branch?.name || '', branchCode: branch?.code || '' }))}
                placeholder="Search branch... *"
                required={true}
                displayField="name"
                codeField="code"
                disabled={selectedOrderPanels.length > 0}
              />
            </div>

            {/* Sub-Company Dropdown */}
            <div className="col-span-12 md:col-span-3">
              <label className="text-xs font-bold text-slate-600">Sub-Company</label>
              {selectedOrderPanels.length > 0 && selectedOrderPanels[0].subCompanyName ? (
                <div className="mt-1 w-full rounded-xl border border-slate-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
                  {selectedOrderPanels[0].subCompanyName} ({selectedOrderPanels[0].subCompanyCode})
                  <span className="ml-2 text-xs text-gray-500">(Locked - {selectedOrderPanels.length} order(s))</span>
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
                    setOrders(prevOrders => 
                      prevOrders.map(order => ({
                        ...order,
                        subCompanyId: subCompanyId,
                        subCompanyName: selected?.name || '',
                        subCompanyCode: selected?.code || ''
                      }))
                    );
                  }}
                  disabled={selectedOrderPanels.length > 0}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:bg-slate-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select Sub-Company</option>
                  {subCompanies.map((sc) => (
                    <option key={sc._id} value={sc._id}>
                      {sc.name} ({sc.code})
                    </option>
                  ))}
                </select>
              )}
              {selectedOrderPanels.length > 0 && selectedOrderPanels[0].subCompanyName && (
                <div className="text-xs text-green-600 mt-1">
                  ✅ All orders from same sub-company: {selectedOrderPanels[0].subCompanyName}
                </div>
              )}
            </div>

            <Select col="col-span-12 md:col-span-3" label="Delivery" value={header.delivery} onChange={(v) => setHeader((p) => ({ ...p, delivery: v }))} options={["Urgent", "Normal", "Express", "Scheduled"]} readOnly={selectedOrderPanels.length > 0} />
            <Input type="date" col="col-span-12 md:col-span-3" label="Date" value={header.date} onChange={(v) => setHeader((p) => ({ ...p, date: v }))} readOnly={selectedOrderPanels.length > 0} />
            
            <div className="col-span-12 md:col-span-3 relative" data-keyboard-dropdown>
              <label className="text-xs font-bold text-slate-600">Party Name</label>
              <input
                type="text"
                value={selectedCustomer ? selectedCustomer.customerName : header.partyName}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                onFocus={handleCustomerInputFocus}
                onBlur={handleCustomerInputBlur}
                readOnly={selectedOrderPanels.length > 0}
                className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 ${selectedOrderPanels.length > 0 ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'}`}
                placeholder="Search customer by name..."
                autoComplete="off"
                role="combobox"
                aria-expanded={showCustomerDropdown}
                aria-haspopup="listbox"
              />
              {showCustomerDropdown && selectedOrderPanels.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto" role="listbox">
                  {customerSearch.loading ? (
                    <div className="p-3 text-center text-sm text-slate-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500 mx-auto"></div>
                      <p className="mt-1">Loading customers...</p>
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <div key={customer._id} data-keyboard-option role="option" onMouseDown={() => handleSelectCustomer(customer)} className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0">
                        <div className="font-medium text-slate-800">{customer.customerName}</div>
                        <div className="text-xs text-slate-500 mt-1">Code: {customer.customerCode}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-sm text-slate-500">No customers found</div>
                  )}
                </div>
              )}
            </div>

          </div>

          <div className="mb-4">
            <div className="text-sm font-bold text-slate-700 mb-2">Billing Type / Charges</div>
            <BillingTypeTable header={header} setHeader={setHeader} billingColumns={billingColumns} selectedOrderPanels={selectedOrderPanels} orders={orders} />
          </div>

          {/* Orders Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-slate-700">
                Orders (Part-1) - {selectedOrderPanels.length > 0 ? "Multi - Order" : "Single Order"} - {orders.length} row{orders.length !== 1 ? 's' : ''}
              </div>
            </div>
            <OrdersTable rows={orders} onChange={updateOrder} onRemove={removeOrder} />
          </div>

          <div className="flex justify-end mt-4">
            <div className="flex items-center gap-3 border border-yellow-300 px-6 py-3 bg-yellow-50 rounded-xl">
              <div className="text-sm font-extrabold text-slate-900">Total Weight:</div>
              <div className="text-xl font-extrabold text-emerald-700">{totalWeight}</div>
            </div>
          </div>

          {/* Suppliers / Market Rates Section */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-slate-700">Suppliers / Market Rates</div>
              <button
                onClick={addVendor}
                className="rounded-xl bg-yellow-600 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-700"
              >
                + Add Supplier
              </button>
            </div>
            <VendorsTable rows={vendors} onChange={updateVendor} onRemove={removeVendor} onAdd={addVendor} />
          </div>
        </Card>

        {/* PART 2: RATE-TARGET - FULL SECTION READONLY */}
        <Card title="Rate-Target">
          <div className="grid grid-cols-12 gap-3 mb-4">
            <Input col="col-span-12 md:col-span-3" label="Max Rate" value={negotiation.maxRate} onChange={(v) => setNegotiation((p) => ({ ...p, maxRate: v }))} readOnly={true} />
            <Input col="col-span-12 md:col-span-3" label="Target Rate" value={negotiation.targetRate} onChange={(v) => setNegotiation((p) => ({ ...p, targetRate: v }))} readOnly={true} />
            <Input col="col-span-12 md:col-span-3" label="Old Rate %" value={negotiation.oldRatePercent} onChange={(v) => setNegotiation((p) => ({ ...p, oldRatePercent: v }))} readOnly={true} />

            {/* APPROVAL STATUS - READONLY IN RATE-TARGET */}
            <Select 
              col="col-span-12 md:col-span-3" 
              label="Approval Status" 
              value={approval.approvalStatus} 
              onChange={(v) => setApproval((p) => ({ ...p, approvalStatus: v }))} 
              options={APPROVALS} 
              readOnly={true} 
            />
          </div>

          {/* APPROVAL REMARKS - READONLY IN RATE-TARGET */}
          <div className="grid grid-cols-12 gap-3 mb-4">
            <div className="col-span-12 md:col-span-6">
              <label className="text-xs font-bold text-slate-600">Approval Remarks</label>
              <textarea
                value={approval.remarks}
                onChange={(e) => setApproval((p) => ({ ...p, remarks: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm outline-none cursor-not-allowed"
                rows={1}
                placeholder="Enter remarks..."
                readOnly={true}
              />
            </div>
          </div>

          {/* Remarks & Voice Note - READONLY */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-7">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-sm font-extrabold text-slate-900 mb-3">Remarks</div>
                <textarea
                  value={negotiation.remarks1}
                  onChange={(e) => setNegotiation((p) => ({ ...p, remarks1: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none cursor-not-allowed"
                  rows={2}
                  placeholder="Enter remarks..."
                  readOnly={true}
                />
              </div>
            </div>
            <div className="col-span-12 md:col-span-5">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-sm font-extrabold text-slate-900 mb-3">Voice Note</div>
                <input type="file" accept="audio/*" onChange={handleVoiceUpload} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none cursor-not-allowed" disabled={true} />
                {voiceUrl && (
                  <div className="mt-3">
                    <audio ref={audioRef} src={voiceUrl} controls className="w-full" />
                    {voiceFileInfo?.filePath && process.env.NODE_ENV === 'development' && (
                      <div className="mt-2 text-xs text-slate-500">File: {voiceFileInfo.originalName}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* PART 3: VEHICLE APPROVAL - FULL SECTION READONLY */}
        <Card title="Vehicle-Placement_Reat">
          <div className="grid grid-cols-12 gap-3 mb-4">
            <div className="col-span-12 md:col-span-4">
              <label className="text-xs font-bold text-slate-600">Supplier Name</label>
<SupplierSearchDropdown 
  value={selectedSupplier ? selectedSupplier.supplierName : approval.vendorName}
  onSelect={handleSupplierSelect}
  placeholder="Search supplier..."
  readOnly={true}
  suppliers={supplierSearch.suppliers}
  loading={supplierSearch.loading}
/>
            </div>
            <Select col="col-span-12 md:col-span-4" label="Supplier (Status)" value={approval.vendorStatus} onChange={(v) => setApproval((p) => ({ ...p, vendorStatus: v }))} options={VENDOR_STATUS} readOnly={true} />
            <Select 
              col="col-span-12 md:col-span-4" 
              label="Rate - Type" 
              value={approval.rateType} 
              onChange={(v) => {
                setApproval((p) => ({ ...p, rateType: v }));
                if (v === "Per MT") {
                  setApproval((p) => ({ ...p, finalFix: "" }));
                } else if (v === "Fixed") {
                  setApproval((p) => ({ ...p, finalPerMT: "" }));
                }
              }} 
              options={RATE_TYPES} 
              readOnly={true} 
            />
          </div>

          <div className="grid grid-cols-12 gap-3 mb-4">
            <Input 
              col="col-span-12 md:col-span-4" 
              label="Final - Per MT (A)" 
              value={approval.finalPerMT} 
              onChange={(v) => setApproval((p) => ({ ...p, finalPerMT: v }))} 
              readOnly={true} 
            />
            <div className="col-span-12 md:col-span-4 mt-2">
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-600">Weight (B)</label>
                <div className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-extrabold text-slate-900">{totalWeight}</div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-4 mt-2">
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-600">Purchase Amount (A x B)</label>
                <div className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-extrabold text-emerald-700">{purchaseAmount}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3 mb-4">
            <Input 
              col="col-span-12 md:col-span-4" 
              label="Final - Fix" 
              value={approval.finalFix} 
              onChange={(v) => setApproval((p) => ({ ...p, finalFix: v }))} 
              readOnly={true} 
            />
            <Select
              col="col-span-12 md:col-span-4"
              label="Approval Status"
              value={approval.approvalStatus}
              options={APPROVALS}
              readOnly={true}
            />
          </div>

          <div className="mb-4">
            <label className="text-xs font-bold text-slate-600">Approval Remarks</label>
            <textarea
              value={approval.remarks}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none cursor-not-allowed"
              rows={2}
              placeholder="Approval remarks"
              readOnly
            />
          </div>

          <div className="grid grid-cols-12 gap-3 mb-4">
            <div className="col-span-12 md:col-span-4">
              <label className="text-xs font-bold text-slate-600">Vehicle Number</label>
              <input type="text" value={approval.vehicleNo || ""} onChange={(e) => setApproval((p) => ({ ...p, vehicleNo: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none cursor-not-allowed" placeholder="Enter vehicle number..." readOnly={true} />
            </div>
            <Input col="col-span-12 md:col-span-4" label="Mobile" value={approval.mobile} onChange={(v) => setApproval((p) => ({ ...p, mobile: v }))} readOnly={true} />
          </div>

          <div className="grid grid-cols-12 gap-3 mb-4">
            <Select 
              col="col-span-12 md:col-span-4" 
              label="Purchase - Type" 
              value={approval.purchaseType} 
              onChange={(v) => setApproval((p) => ({ ...p, purchaseType: v }))} 
              options={purchaseTypes.length > 0 ? purchaseTypes : PURCHASE_TYPES}
              readOnly={true} 
            />
            <Select 
              col="col-span-12 md:col-span-4" 
              label="Payment - Terms" 
              value={approval.paymentTerms} 
              onChange={(v) => setApproval((p) => ({ ...p, paymentTerms: v }))} 
              options={paymentTerms.length > 0 ? paymentTerms : PAYMENT_TERMS}
              readOnly={true} 
            />
          </div>
        </Card>

        {/* MEMO UPLOAD */}
        <Card title="Memo - Upload">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-sm font-extrabold text-slate-900 mb-3">Memo Upload</div>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleMemoUpload}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
            <div className="mt-3 text-sm">
              Status:{" "}
              <span className={`font-extrabold ${approval.memoStatus === "Uploaded" ? "text-green-700" : "text-yellow-700"}`}>
                {approval.memoStatus || "Pending"}
              </span>
            </div>
            <div className="mt-3">
              <label className="text-xs font-bold text-slate-600">Memo Approval</label>
              <select
                value={approval.approvalStatus || ""}
                onChange={(e) => setApproval((p) => ({ ...p, approvalStatus: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none cursor-not-allowed"
                disabled={true}
              >
                <option value="">Select Approval</option>
                {APPROVALS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            {approval.memoFile && (
              <div className="mt-2 text-xs text-slate-600">
                File: {approval.memoFile.originalName}
                {approval.memoFile.filePath && process.env.NODE_ENV === 'development' && (
                  <a href={approval.memoFile.filePath} target="_blank" rel="noopener noreferrer" className="ml-2 text-sky-600 hover:underline">View</a>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
    </TransactionFormKeyboardNavigation>
  );
}
