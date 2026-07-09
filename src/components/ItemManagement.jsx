// "use client";

// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import {
//   FaEdit, FaTrash, FaPlus, FaSearch, FaArrowLeft,
//   FaChevronLeft, FaChevronRight, FaCheck, FaFileUpload,
//   FaDownload, FaExclamationCircle, FaBoxOpen, FaTag,
//   FaShieldAlt, FaCashRegister, FaRuler, FaClipboardCheck,
//   FaListUl
// } from "react-icons/fa";
// import { HiOutlineDocumentText } from "react-icons/hi";
// import ItemGroupSearch from "./ItemGroupSearch";
// import { toast } from "react-toastify";

// // ── 6 Steps ──
// const STEPS = [
//   { id: 1, label: "Basic Info",     icon: FaBoxOpen },
//   { id: 2, label: "Tax & GST",      icon: HiOutlineDocumentText },
//   { id: 3, label: "POS Settings",   icon: FaCashRegister },
//   { id: 4, label: "Quality",        icon: FaShieldAlt },
//   { id: 5, label: "Dimensions",     icon: FaRuler },
//   { id: 6, label: "Review",         icon: FaClipboardCheck },
// ];

// const INITIAL = {
//   itemCode: "", itemName: "", description: "", category: "",
//   unitPrice: "", quantity: "", reorderLevel: "", leadTime: "",
//   itemType: "", uom: "", managedBy: "", managedValue: "",
//   batchNumber: "", expiryDate: "", manufacturer: "",
//   length: "", width: "", height: "", weight: "",
//   gnr: false, delivery: false, productionProcess: false,
//   includeQualityCheck: false, qualityCheckDetails: [],
//   includeGST: true, includeIGST: true,
//   gstCode: "", gstName: "", gstRate: "", cgstRate: "", sgstRate: "",
//   igstCode: "", igstName: "", igstRate: "",
//   status: "active", active: true,
//   posEnabled: false,
//   posConfig: {
//     barcode: "", posPrice: "", allowDiscount: true,
//     maxDiscountPercent: 100, taxableInPOS: true, showInPOS: true,
//   },
// };

// const VALIDATORS = {
//   1: (d) => {
//     const e = {};
//     if (!d.itemName?.trim()) e.itemName  = "Item Name is required";
//     if (!d.category?.trim()) e.category  = "Category is required";
    
    
//     if (!d.uom)     e.uom     = "Unit of Measure is required";
//     if (!d.itemType) e.itemType = "Item Type is required";
//     return e;
//   },
//   2: () => ({}),
//   3: () => ({}),
//   4: () => ({}),
//   5: () => ({}),
//   6: () => ({}),
// };

// export default function ItemManagement() {
//   const [view,      setView]      = useState("list");
//   const [items,     setItems]     = useState([]);
//   const [searchTerm,setSearchTerm]= useState("");
//   const [filterType,setFilterType]= useState("All");
//   const [loading,   setLoading]   = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const [submitting,setSubmitting]= useState(false);
//   const [step,      setStep]      = useState(1);
//   const [id,        setId]        = useState({ ...INITIAL });  // id = itemDetails
//   const [errs,      setErrs]      = useState({});

//   useEffect(() => { fetchItems(); }, []);

//   const fetchItems = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const res   = await axios.get("/api/items", { headers: { Authorization: `Bearer ${token}` } });
//       if (res.data.success) setItems(res.data.data || []);
//     } catch { toast.error("Failed to load items"); }
//     setLoading(false);
//   };

//   const generateCode = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       const res   = await axios.get("/api/lastItemCode", { headers: { Authorization: `Bearer ${token}` } });
//       const last  = res.data.lastItemCode || "ITEM-0000";
//       const num   = parseInt(last.split("-")[1] || "0", 10) + 1;
//       setId(p => ({ ...p, itemCode: `ITEM-${String(num).padStart(4, "0")}` }));
//     } catch { }
//   };

//   // ── Handlers ──
//   const clearErr = (k) => setErrs(p => { const n = { ...p }; delete n[k]; return n; });

//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;

//     if (name.startsWith("posConfig.")) {
//       const key = name.split(".")[1];
//       setId(p => ({ ...p, posConfig: { ...(p.posConfig || {}), [key]: type === "checkbox" ? checked : value } }));
//       return;
//     }
//     if (type === "checkbox") { setId(p => ({ ...p, [name]: checked })); return; }
//     if (name === "gstRate") {
//       const rate = parseFloat(value) || 0;
//       setId(p => ({ ...p, gstRate: value, cgstRate: rate / 2, sgstRate: rate / 2 }));
//       return;
//     }
//     setId(p => ({ ...p, [name]: value }));
//     clearErr(name);
//   };

//   const handleQCChange = (i, e) => {
//     const { name, value } = e.target;
//     setId(p => { const q = [...p.qualityCheckDetails]; q[i] = { ...q[i], [name]: value }; return { ...p, qualityCheckDetails: q }; });
//   };

//   const addQC    = ()  => setId(p => ({ ...p, qualityCheckDetails: [...p.qualityCheckDetails, { srNo: "", parameter: "", min: "", max: "" }] }));
//   const removeQC = (i) => setId(p => ({ ...p, qualityCheckDetails: p.qualityCheckDetails.filter((_, j) => j !== i) }));

//   // ── Navigation ──
//   const goNext = () => {
//     const v = VALIDATORS[step];
//     if (v) {
//       const e = v(id);
//       if (Object.keys(e).length) { setErrs(e); toast.error(Object.values(e)[0]); return; }
//     }
//     setErrs({});
//     setStep(s => s + 1);
//   };

//   const goPrev = () => { setErrs({}); setStep(s => s - 1); };

//   // ── Submit ──
//   const handleSubmit = async () => {
//     // Final validation before submit
    
//     const allE = VALIDATORS[1](id);
//     if (Object.keys(allE).length) { setErrs(allE); toast.error("Fix required fields"); return; }

//     setSubmitting(true);
//     const token   = localStorage.getItem("token");
//     const toNum   = (v) => (v === "" || v == null ? undefined : Number(v));
//     const payload = {
//       ...id,
//       unitPrice: Number(id.unitPrice || 0),
//       quantity:  Number(id.quantity  || 0),
//       reorderLevel: toNum(id.reorderLevel),
//       leadTime:  toNum(id.leadTime),
//       length: toNum(id.length), width: toNum(id.width),
//       height: toNum(id.height), weight: toNum(id.weight),
//       gstRate: toNum(id.gstRate), cgstRate: toNum(id.cgstRate),
//       sgstRate: toNum(id.sgstRate), igstRate: toNum(id.igstRate),
//       posEnabled: !!id.posEnabled,
//       posConfig: {
//         ...id.posConfig,
//         posPrice: toNum(id.posConfig?.posPrice),
//         maxDiscountPercent: id.posConfig?.maxDiscountPercent === "" ? 100 : Number(id.posConfig?.maxDiscountPercent ?? 100),
//         allowDiscount: id.posConfig?.allowDiscount ?? true,
//         taxableInPOS:  id.posConfig?.taxableInPOS  ?? true,
//         showInPOS:     id.posConfig?.showInPOS      ?? true,
//       },
//     };

//     try {
//       if (id._id) {
//         const res = await axios.put(`/api/items/${id._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
//         if (res.data.success) { setItems(p => p.map(it => it._id === id._id ? res.data.data : it)); toast.success("Item updated!"); }
//         else toast.error(res.data.message || "Update failed");
//       } else {
//         const res = await axios.post("/api/items", payload, { headers: { Authorization: `Bearer ${token}` } });
//         if (res.data.success) { setItems(p => [...p, res.data.data]); toast.success("Item created!"); }
//         else toast.error(res.data.message || "Create failed");
//       }
//       reset();
//     } catch (err) { toast.error(err.response?.data?.message || "Something went wrong"); }
//     setSubmitting(false);
//   };

//   const reset = () => { setId({ ...INITIAL }); setStep(1); setErrs({}); setView("list"); };

//   const handleEdit = (item) => { setId(item); setStep(1); setErrs({}); setView("form"); };

//   const handleDelete = async (itemId) => {
//     if (!confirm("Delete this item?")) return;
//     try {
//       const token = localStorage.getItem("token");
//       await axios.delete(`/api/items/${itemId}`, { headers: { Authorization: `Bearer ${token}` } });
//       setItems(p => p.filter(it => it._id !== itemId));
//       toast.success("Item deleted");
//     } catch { toast.error("Delete failed"); }
//   };

//   // ── Bulk ──
//   const downloadTemplate = async () => {
//     try {
//       const res  = await fetch("/api/items/template");
//       if (!res.ok) throw new Error();
//       const blob = await res.blob();
//       const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "item_template.csv"; a.click();
//     } catch { toast.error("Error downloading template"); }
//   };

//   const handleBulk = async (e) => {
//     const file = e.target.files[0]; if (!file) return;
//     setUploading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const text  = await file.text();
//       const lines = text.split("\n").filter(l => l.trim());
//       const hdrs  = lines[0].split(",").map(h => h.trim());
//       const jsonData = lines.slice(1).map(line => { const v = line.split(","); const o = {}; hdrs.forEach((k, i) => (o[k] = v[i]?.trim() || "")); return o; });
//       const res = await axios.post("/api/items/bulk", { items: jsonData }, { headers: { Authorization: `Bearer ${token}` } });
//       const { success, results } = res.data;
//       if (success) {
//         const cr = results.filter(r => r.success && r.action === "created").length;
//         const up = results.filter(r => r.success && r.action === "updated").length;
//         const sk = results.filter(r => !r.success).length;
//         toast.success(`${cr} created · ${up} updated · ${sk} skipped`);
//         results.filter(r => r.warnings?.length).forEach(r => toast.warn(`Row ${r.row}: ${r.warnings.join(", ")}`));
//         fetchItems();
//       } else toast.error(res.data.message || "Bulk upload failed");
//     } catch { toast.error("Invalid CSV or server error"); }
//     finally { setUploading(false); e.target.value = ""; }
//   };

//   // ── Derived ──
//   const filtered = items.filter(it => {
//     const q  = searchTerm.toLowerCase();
//     const mQ = [it.itemCode, it.itemName, it.category, it.itemType].some(v => v?.toLowerCase().includes(q));
//     const mT = filterType === "All" || it.itemType === filterType;
//     return mQ && mT;
//   }).slice().reverse();

//   const stats = {
//     total:    items.length,
//     product:  items.filter(it => it.itemType === "Product").length,
//     service:  items.filter(it => it.itemType === "Service").length,
//     rawMat:   items.filter(it => it.itemType === "Raw Material").length,
//   };

//   // ── UI Helpers ──
//   const Err = ({ k }) => errs[k]
//     ? <p className="flex items-center gap-1 mt-1 text-xs text-red-500 font-medium"><FaExclamationCircle className="text-[10px] shrink-0" />{errs[k]}</p>
//     : null;

//   const fi = (k, extra = "") =>
//     `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none ${extra}
//      ${errs[k] ? "border-red-400 ring-2 ring-red-100 bg-red-50 placeholder:text-red-300" : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"}`;

//   const Lbl = ({ text, req }) => (
//     <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
//       {text}{req && <span className="text-red-500 ml-0.5">*</span>}
//     </label>
//   );

//   const Toggle = ({ name, checked, label, nested }) => (
//     <label className="flex items-center gap-2.5 cursor-pointer group">
//       <div className={`relative w-9 h-5 rounded-full transition-all ${checked ? "bg-indigo-500" : "bg-gray-200"}`}
//         onClick={() => nested
//           ? setId(p => ({ ...p, posConfig: { ...(p.posConfig || {}), [name.split(".")[1]]: !checked } }))
//           : setId(p => ({ ...p, [name]: !checked }))}>
//         <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? "translate-x-4" : "translate-x-0"}`} />
//       </div>
//       <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
//     </label>
//   );

//   const RRow = ({ l, v }) => (
//     <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
//       <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{l}</span>
//       <span className="text-sm font-semibold text-gray-800 text-right max-w-[60%] truncate">{v || <span className="text-gray-300 font-normal italic text-xs">—</span>}</span>
//     </div>
//   );

//   // ── Step Content ──
//   const renderStep = () => {
//     switch (step) {

//       // ── Step 1: Basic Info ──
//       case 1: return (
//         <div className="space-y-4">
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <div>
//               <Lbl text="Item Code" />
//               <input className={`${fi("")} bg-gray-100 cursor-not-allowed text-gray-400`} value={id.itemCode || ""} readOnly />
//               <p className="text-[11px] text-gray-400 mt-1">Auto-generated</p>
//             </div>
//             <div>
//               <Lbl text="Item Name" req />
//               <input className={fi("itemName")} name="itemName" value={id.itemName || ""} onChange={handleChange} placeholder="e.g. Steel Rod 10mm" />
//               <Err k="itemName" />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <div>
//               <Lbl text="Category" req />
//               <ItemGroupSearch onSelectItemGroup={g => { setId(p => ({ ...p, category: g.name })); clearErr("category"); }} />
//               {id.category && <p className="text-xs text-indigo-600 font-semibold mt-1.5 flex items-center gap-1"><FaTag className="text-[10px]" /> {id.category}</p>}
//               <Err k="category" />
//             </div>
//             <div>
//               <Lbl text="Item Type" req />
//               <select className={fi("itemType")} name="itemType" value={id.itemType || ""} onChange={handleChange}>
//                 <option value="">Select type…</option>
//                 <option>Product</option>
//                 <option>Service</option>
//                 <option>Raw Material</option>
//               </select>
//               <Err k="itemType" />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//             <div>
//               <Lbl text="Unit Price (₹)" req />
//               <input className={fi("unitPrice")} name="unitPrice" type="number" min="0" step="0.01" placeholder="0.00" value={id.unitPrice || ""} onChange={handleChange} />
//               <Err k="unitPrice" />
//             </div>
//             <div>
//               <Lbl text="Min. Stock" req />
//               <input className={fi("quantity")} name="quantity" type="number" min="0" placeholder="0" value={id.quantity || ""} onChange={handleChange} />
//               <Err k="quantity" />
//             </div>
//             <div>
//               <Lbl text="Reorder Level" />
//               <input className={fi("")} name="reorderLevel" type="number" min="0" placeholder="0" value={id.reorderLevel || ""} onChange={handleChange} />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//             <div>
//               <Lbl text="Lead Time (Days)" />
//               <input className={fi("")} name="leadTime" type="number" min="1" placeholder="7" value={id.leadTime || ""} onChange={handleChange} />
//             </div>
//             <div>
//               <Lbl text="Unit of Measure" req />
//               <select className={fi("uom")} name="uom" value={id.uom || ""} onChange={handleChange}>
//                 <option value="">Select UOM…</option>
//                 <option value="KG">Kilogram (KG)</option>
//                 <option value="MTP">Metric Ton (MTP)</option>
//                 <option value="PC">Piece (PC)</option>
//                 <option value="LTR">Liter (LTR)</option>
//                 <option value="MTR">Meter (MTR)</option>
//               </select>
//               <Err k="uom" />
//             </div>
//             <div>
//               <Lbl text="Managed By" />
//               <select className={fi("")} name="managedBy" value={id.managedBy || ""} onChange={handleChange}>
//                 <option value="">Select method…</option>
//                 <option value="batch">Batch</option>
//                 <option value="serial">Serial Number</option>
//                 <option value="none">Not Managed</option>
//               </select>
//             </div>
//           </div>

//           <div>
//             <Lbl text="Description" />
//             <textarea className={`${fi("")} resize-none`} name="description" rows={3} placeholder="Brief description of this item…" value={id.description || ""} onChange={handleChange} />
//           </div>

//           <div className="flex items-center gap-4 pt-2">
//             <Lbl text="Status" />
//             <select className={`${fi("")} w-auto`} name="status" value={id.status || "active"} onChange={handleChange}>
//               <option value="active">Active</option>
//               <option value="inactive">Inactive</option>
//             </select>
//           </div>
//         </div>
//       );

//       // ── Step 2: Tax & GST ──
//       case 2: return (
//         <div className="space-y-5">
//           <div className="flex gap-6">
//             <Toggle name="includeGST"  checked={id.includeGST}  label="Include GST"  />
//             <Toggle name="includeIGST" checked={id.includeIGST} label="Include IGST" />
//           </div>

//           {id.includeGST && (
//             <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
//               <p className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">
//                 <HiOutlineDocumentText /> GST Details
//               </p>
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div>
//                   <Lbl text="GST Code" />
//                   <input className={fi("")} name="gstCode" value={id.gstCode || ""} onChange={handleChange} placeholder="e.g. GST18" />
//                 </div>
//                 <div>
//                   <Lbl text="GST Name" />
//                   <input className={fi("")} name="gstName" value={id.gstName || ""} onChange={handleChange} placeholder="e.g. GST 18%" />
//                 </div>
//                 <div>
//                   <Lbl text="GST Rate (%)" />
//                   <input className={fi("")} name="gstRate" type="number" min="0" max="100" step="0.1" placeholder="0" value={id.gstRate || ""} onChange={handleChange} />
//                   <p className="text-[11px] text-blue-500 mt-1">CGST & SGST will be auto-split (half each)</p>
//                 </div>
//                 <div className="grid grid-cols-2 gap-3">
//                   <div>
//                     <Lbl text="CGST (%)" />
//                     <input className={`${fi("")} bg-gray-100 cursor-not-allowed text-gray-400`} value={id.cgstRate || ""} readOnly />
//                   </div>
//                   <div>
//                     <Lbl text="SGST (%)" />
//                     <input className={`${fi("")} bg-gray-100 cursor-not-allowed text-gray-400`} value={id.sgstRate || ""} readOnly />
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}

//           {id.includeIGST && (
//             <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
//               <p className="text-sm font-bold text-purple-800 mb-4 flex items-center gap-2">
//                 <HiOutlineDocumentText /> IGST Details
//               </p>
//               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//                 <div>
//                   <Lbl text="IGST Code" />
//                   <input className={fi("")} name="igstCode" value={id.igstCode || ""} onChange={handleChange} placeholder="e.g. IGST18" />
//                 </div>
//                 <div>
//                   <Lbl text="IGST Name" />
//                   <input className={fi("")} name="igstName" value={id.igstName || ""} onChange={handleChange} placeholder="e.g. IGST 18%" />
//                 </div>
//                 <div>
//                   <Lbl text="IGST Rate (%)" />
//                   <input className={fi("")} name="igstRate" type="number" min="0" max="100" step="0.1" placeholder="0" value={id.igstRate || ""} onChange={handleChange} />
//                 </div>
//               </div>
//             </div>
//           )}

//           {!id.includeGST && !id.includeIGST && (
//             <div className="text-center py-8 text-gray-300">
//               <HiOutlineDocumentText className="text-5xl mx-auto mb-2 opacity-30" />
//               <p className="text-sm font-medium">Enable GST or IGST above to configure tax details</p>
//             </div>
//           )}
//         </div>
//       );

//       // ── Step 3: POS Settings ──
//       case 3: return (
//         <div className="space-y-5">
//           <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
//             <FaCashRegister className="text-orange-500 text-xl mt-0.5 shrink-0" />
//             <div>
//               <p className="text-sm font-bold text-orange-800 mb-0.5">POS (Point of Sale)</p>
//               <p className="text-xs text-orange-600">Enable this item to be sold through the POS system. Configure barcode, pricing, and discount rules.</p>
//             </div>
//           </div>

//           <Toggle name="posEnabled" checked={id.posEnabled} label="Enable this item for POS (Sellable)" />

//           {id.posEnabled && (
//             <div className="border border-gray-200 rounded-xl p-5 space-y-5">
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div>
//                   <Lbl text="Barcode" />
//                   <input className={fi("")} name="posConfig.barcode" value={id.posConfig?.barcode || ""} onChange={handleChange} placeholder="Scan or enter barcode" />
//                 </div>
//                 <div>
//                   <Lbl text="POS Price (Optional override)" />
//                   <input className={fi("")} name="posConfig.posPrice" type="number" min="0" step="0.01" placeholder={`Leave blank → uses ₹${id.unitPrice || 0}`} value={id.posConfig?.posPrice ?? ""} onChange={handleChange} />
//                   <p className="text-[11px] text-gray-400 mt-1">Empty = uses Unit Price: <strong>₹{id.unitPrice || 0}</strong></p>
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div className="space-y-3">
//                   <Toggle name="posConfig.allowDiscount"  checked={id.posConfig?.allowDiscount  ?? true} label="Allow Discount in POS" nested />
//                   <Toggle name="posConfig.taxableInPOS"   checked={id.posConfig?.taxableInPOS   ?? true} label="Taxable in POS"         nested />
//                   <Toggle name="posConfig.showInPOS"      checked={id.posConfig?.showInPOS      ?? true} label="Show in POS list"       nested />
//                 </div>
//                 <div>
//                   <Lbl text="Max Discount (%)" />
//                   <input className={fi("")} name="posConfig.maxDiscountPercent" type="number" min="0" max="100"
//                     value={id.posConfig?.maxDiscountPercent ?? 100} onChange={handleChange}
//                     disabled={!(id.posConfig?.allowDiscount ?? true)} />
//                   {!(id.posConfig?.allowDiscount ?? true) && <p className="text-[11px] text-gray-400 mt-1">Enable discount to set max %</p>}
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       );

//       // ── Step 4: Quality ──
//       case 4: return (
//         <div className="space-y-4">
//           <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
//             <FaShieldAlt className="text-emerald-500 mt-0.5 shrink-0" />
//             <p className="text-xs text-emerald-700 font-medium">Define quality parameters for inspection during GRN or production. Each parameter needs a min and max acceptable value.</p>
//           </div>

//           <Toggle name="includeQualityCheck" checked={id.includeQualityCheck} label="Include Quality Checks" />

//           {id.includeQualityCheck && (
//             <div>
//               {/* Header row */}
//               <div className="grid grid-cols-12 gap-2 mb-2 px-1">
//                 {["Sr.", "Parameter", "Min", "Max", ""].map((h, i) => (
//                   <div key={i} className={`text-[10px] font-bold uppercase tracking-wider text-gray-400 ${i === 0 ? "col-span-1" : i === 1 ? "col-span-5" : i === 4 ? "col-span-1" : "col-span-2"}`}>{h}</div>
//                 ))}
//               </div>

//               <div className="space-y-2">
//                 {id.qualityCheckDetails.map((qc, i) => (
//                   <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg px-2 py-1.5">
//                     <div className="col-span-1">
//                       <input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400 text-center font-mono" name="srNo" placeholder="#" value={qc.srNo} onChange={e => handleQCChange(i, e)} />
//                     </div>
//                     <div className="col-span-5">
//                       <input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400" name="parameter" placeholder="e.g. Tensile Strength" value={qc.parameter} onChange={e => handleQCChange(i, e)} />
//                     </div>
//                     <div className="col-span-2">
//                       <input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400" name="min" placeholder="Min" value={qc.min} onChange={e => handleQCChange(i, e)} />
//                     </div>
//                     <div className="col-span-2">
//                       <input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400" name="max" placeholder="Max" value={qc.max} onChange={e => handleQCChange(i, e)} />
//                     </div>
//                     <div className="col-span-2 flex justify-end">
//                       <button type="button" onClick={() => removeQC(i)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
//                         <FaTrash className="text-xs" />
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//               </div>

//               <button type="button" onClick={addQC}
//                 className="mt-3 w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-indigo-500 font-semibold text-sm flex items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50 transition-all">
//                 <FaPlus className="text-xs" /> Add Quality Parameter
//               </button>
//             </div>
//           )}
//         </div>
//       );

//       // ── Step 5: Dimensions ──
//       case 5: return (
//         <div className="space-y-5">
//           <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
//             <FaRuler className="text-blue-500 mt-0.5 shrink-0" />
//             <p className="text-xs text-blue-700 font-medium">Physical dimensions and weight are used for logistics, shipping calculations, and warehouse management. All fields are optional.</p>
//           </div>

//           <div>
//             <p className="text-sm font-bold text-gray-700 mb-3">Dimensions</p>
//             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
//               {[
//                 { n: "length", l: "Length (cm)", ph: "0" },
//                 { n: "width",  l: "Width (cm)",  ph: "0" },
//                 { n: "height", l: "Height (cm)", ph: "0" },
//                 { n: "weight", l: "Weight (kg)", ph: "0.00", step: "0.01" },
//               ].map(f => (
//                 <div key={f.n}>
//                   <Lbl text={f.l} />
//                   <input className={fi("")} name={f.n} type="number" min="0" step={f.step || "1"} placeholder={f.ph} value={id[f.n] || ""} onChange={handleChange} />
//                 </div>
//               ))}
//             </div>
//           </div>

//           <div className="border-t border-gray-100 pt-5">
//             <p className="text-sm font-bold text-gray-700 mb-3">Additional Details</p>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//               <div>
//                 <Lbl text="Manufacturer" />
//                 <input className={fi("")} name="manufacturer" value={id.manufacturer || ""} onChange={handleChange} placeholder="e.g. Tata Steel" />
//               </div>
//               <div>
//                 <Lbl text="Expiry Date" />
//                 <input className={fi("")} name="expiryDate" type="date" value={id.expiryDate || ""} onChange={handleChange} />
//               </div>
//               <div>
//                 <Lbl text="Batch Number" />
//                 <input className={fi("")} name="batchNumber" value={id.batchNumber || ""} onChange={handleChange} placeholder="e.g. BATCH-2024-001" />
//               </div>
//             </div>

//             <div className="mt-4 flex flex-wrap gap-4">
//               <Toggle name="gnr"               checked={id.gnr}               label="GNR Applicable" />
//               <Toggle name="delivery"           checked={id.delivery}           label="Delivery Item" />
//               <Toggle name="productionProcess"  checked={id.productionProcess}  label="Production Process" />
//             </div>
//           </div>
//         </div>
//       );

//       // ── Step 6: Review ──
//       case 6: return (
//         <div className="space-y-4">
//           <p className="text-sm text-gray-500">Review all details before saving.</p>

//           <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
//             <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaBoxOpen className="text-indigo-400" /> Basic Info</p>
//             <RRow l="Code"       v={id.itemCode} />
//             <RRow l="Name"       v={id.itemName} />
//             <RRow l="Category"   v={id.category} />
//             <RRow l="Type"       v={id.itemType} />
//             <RRow l="Unit Price" v={id.unitPrice ? `₹${Number(id.unitPrice).toFixed(2)}` : ""} />
//             <RRow l="Min. Stock" v={id.quantity} />
//             <RRow l="UOM"        v={id.uom} />
//             <RRow l="Reorder Level" v={id.reorderLevel} />
//             <RRow l="Lead Time"  v={id.leadTime ? `${id.leadTime} days` : ""} />
//             <RRow l="Status"     v={id.status} />
//           </div>

//           <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
//             <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><HiOutlineDocumentText className="text-indigo-400" /> Tax</p>
//             <RRow l="Include GST"  v={id.includeGST  ? "Yes" : "No"} />
//             <RRow l="GST Rate"     v={id.gstRate ? `${id.gstRate}%` : ""} />
//             <RRow l="Include IGST" v={id.includeIGST ? "Yes" : "No"} />
//             <RRow l="IGST Rate"    v={id.igstRate ? `${id.igstRate}%` : ""} />
//           </div>

//           {id.posEnabled && (
//             <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
//               <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaCashRegister className="text-orange-400" /> POS</p>
//               <RRow l="POS Price"    v={id.posConfig?.posPrice ? `₹${id.posConfig.posPrice}` : `₹${id.unitPrice} (unit price)`} />
//               <RRow l="Barcode"      v={id.posConfig?.barcode} />
//               <RRow l="Discount"     v={id.posConfig?.allowDiscount ? `Allowed (max ${id.posConfig.maxDiscountPercent}%)` : "Not allowed"} />
//               <RRow l="Taxable"      v={id.posConfig?.taxableInPOS ? "Yes" : "No"} />
//             </div>
//           )}

//           {id.includeQualityCheck && id.qualityCheckDetails?.length > 0 && (
//             <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
//               <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaShieldAlt className="text-emerald-400" /> Quality ({id.qualityCheckDetails.length} parameters)</p>
//               {id.qualityCheckDetails.map((q, i) => <RRow key={i} l={q.parameter || `Param ${i+1}`} v={`Min: ${q.min || "—"} · Max: ${q.max || "—"}`} />)}
//             </div>
//           )}

//           {(id.length || id.weight || id.manufacturer) && (
//             <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
//               <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaRuler className="text-blue-400" /> Dimensions</p>
//               {id.length && <RRow l="L × W × H" v={`${id.length} × ${id.width || 0} × ${id.height || 0} cm`} />}
//               {id.weight       && <RRow l="Weight"       v={`${id.weight} kg`} />}
//               {id.manufacturer && <RRow l="Manufacturer" v={id.manufacturer} />}
//             </div>
//           )}
//         </div>
//       );

//       default: return null;
//     }
//   };

//   // ════════════════════════════════════════
//   // ── LIST VIEW ──
//   // ════════════════════════════════════════
//   if (view === "list") return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

//         {/* Header */}
//         <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
//           <div>
//             <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Item Management</h1>
//             <p className="text-sm text-gray-400 mt-0.5">{items.length} total items</p>
//           </div>
//           <div className="flex flex-wrap gap-2">
//             <button onClick={downloadTemplate}
//               className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-all">
//               <FaDownload className="text-xs" /> Template
//             </button>
//             <label className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 cursor-pointer transition-all">
//               {uploading ? "Uploading…" : <><FaFileUpload className="text-xs" /> Bulk Upload</>}
//               <input type="file" hidden accept=".csv" onChange={handleBulk} />
//             </label>
//             <button onClick={() => { generateCode(); setView("form"); }}
//               className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
//               <FaPlus className="text-xs" /> Create Item
//             </button>
//           </div>
//         </div>

//         {/* Stat cards */}
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
//           {[
//             { label: "Total",        value: stats.total,   emoji: "📦", filter: "All" },
//             { label: "Product",      value: stats.product, emoji: "🛍️", filter: "Product" },
//             { label: "Service",      value: stats.service, emoji: "🔧", filter: "Service" },
//             { label: "Raw Material", value: stats.rawMat,  emoji: "⚙️",  filter: "Raw Material" },
//           ].map(s => (
//             <div key={s.label} onClick={() => setFilterType(s.filter)}
//               className={`bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer border-2 transition-all
//                 ${filterType === s.filter ? "border-indigo-400 shadow-md shadow-indigo-100" : "border-transparent shadow-sm hover:border-indigo-200 hover:-translate-y-0.5"}`}>
//               <span className="text-2xl">{s.emoji}</span>
//               <div>
//                 <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
//                 <p className="text-2xl font-extrabold tracking-tight text-gray-900 leading-none mt-0.5">{s.value}</p>
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* Table card */}
//         <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
//           <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
//             <div className="relative flex-1 min-w-[180px] max-w-xs">
//               <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
//               <input className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-gray-300"
//                 value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search items…" />
//             </div>
//             <div className="flex gap-2 flex-wrap ml-auto">
//               {["All","Product","Service","Raw Material"].map(t => (
//                 <button key={t} onClick={() => setFilterType(t)}
//                   className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
//                     ${filterType === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"}`}>
//                   {t}
//                 </button>
//               ))}
//             </div>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full text-sm border-collapse">
//               <thead>
//                 <tr className="bg-gray-50 border-b border-gray-100">
//                   {["Code","Item","Category","Type","Price","UOM","Status","POS","Actions"].map(h => (
//                     <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {loading ? (
//                   Array(5).fill(0).map((_, i) => (
//                     <tr key={i} className="border-b border-gray-50">
//                       {Array(9).fill(0).map((__, j) => (
//                         <td key={j} className="px-4 py-3"><div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" /></td>
//                       ))}
//                     </tr>
//                   ))
//                 ) : filtered.length === 0 ? (
//                   <tr><td colSpan={9} className="text-center py-16">
//                     <div className="text-4xl mb-2 opacity-20">📦</div>
//                     <p className="text-sm font-medium text-gray-300">No items found</p>
//                   </td></tr>
//                 ) : filtered.map(it => (
//                   <tr key={it._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
//                     <td className="px-4 py-3">
//                       <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{it.itemCode}</span>
//                     </td>
//                     <td className="px-4 py-3">
//                       <p className="font-semibold text-gray-900 text-sm leading-tight">{it.itemName}</p>
//                       {it.manufacturer && <p className="text-xs text-gray-400">{it.manufacturer}</p>}
//                     </td>
//                     <td className="px-4 py-3 text-xs text-gray-500 font-medium">{it.category || <span className="text-gray-200">—</span>}</td>
//                     <td className="px-4 py-3">
//                       <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full
//                         ${it.itemType === "Product"      ? "bg-blue-50 text-blue-600"
//                           : it.itemType === "Service"    ? "bg-purple-50 text-purple-600"
//                           : it.itemType === "Raw Material" ? "bg-amber-50 text-amber-600"
//                           : "bg-gray-100 text-gray-500"}`}>
//                         {it.itemType || "—"}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3 font-mono text-sm font-bold text-gray-700">₹{Number(it.unitPrice || 0).toFixed(2)}</td>
//                     <td className="px-4 py-3 text-xs text-gray-500">{it.uom || <span className="text-gray-200">—</span>}</td>
//                     <td className="px-4 py-3">
//                       <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${it.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
//                         {it.status}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3">
//                       {it.posEnabled
//                         ? <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-500">POS</span>
//                         : <span className="text-gray-200 text-xs">—</span>}
//                     </td>
//                     <td className="px-4 py-3">
//                       <div className="flex gap-1.5">
//                         <button onClick={() => handleEdit(it)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all">
//                           <FaEdit className="text-xs" />
//                         </button>
//                         <button onClick={() => handleDelete(it._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
//                           <FaTrash className="text-xs" />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//       <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
//     </div>
//   );

//   // ════════════════════════════════════════
//   // ── FORM VIEW ──
//   // ════════════════════════════════════════
//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

//         <button onClick={reset} className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4 hover:text-indigo-800 transition-colors">
//           <FaArrowLeft className="text-xs" /> Back to Items
//         </button>

//         <h2 className="text-xl font-extrabold tracking-tight text-gray-900 mb-0.5">
//           {id._id ? "Edit Item" : "New Item"}
//         </h2>
//         <p className="text-sm text-gray-400 mb-6">
//           Step {step} of {STEPS.length} — <span className="font-semibold text-gray-600">{STEPS[step - 1].label}</span>
//         </p>

//         {/* Stepper */}
//         <div className="flex items-start mb-7">
//           {STEPS.map((s, i) => {
//             const Icon  = s.icon;
//             const done   = step > s.id;
//             const active = step === s.id;
//             return (
//               <React.Fragment key={s.id}>
//                 <div className="flex flex-col items-center shrink-0">
//                   <button type="button" onClick={() => done && setStep(s.id)}
//                     className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all
//                       ${done   ? "bg-emerald-500 border-emerald-500 text-white cursor-pointer hover:bg-emerald-600"
//                         : active ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
//                         : "bg-white border-gray-200 text-gray-300 cursor-default"}`}>
//                     {done ? <FaCheck style={{ fontSize: 12 }} /> : <Icon style={{ fontSize: 12 }} />}
//                   </button>
//                   <span className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 whitespace-nowrap hidden sm:block
//                     ${done ? "text-emerald-500" : active ? "text-indigo-600" : "text-gray-300"}`}>
//                     {s.label}
//                   </span>
//                 </div>
//                 {i < STEPS.length - 1 && (
//                   <div className={`flex-1 h-0.5 mt-[18px] mx-1 transition-all ${done ? "bg-emerald-400" : "bg-gray-200"}`} />
//                 )}
//               </React.Fragment>
//             );
//           })}
//         </div>

//         {/* Card */}
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-4">
//           <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
//             <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
//               {React.createElement(STEPS[step - 1].icon, { className: "text-base" })}
//             </div>
//             <div>
//               <h3 className="text-base font-bold text-gray-900">{STEPS[step - 1].label}</h3>
//               <p className="text-xs text-gray-400">Fill in the details below</p>
//             </div>
//             <span className="ml-auto text-xs font-bold text-gray-300 font-mono">{step}/{STEPS.length}</span>
//           </div>

//           {renderStep()}
//         </div>

//         {/* Navigation */}
//         <div className="flex items-center justify-between">
//           <button type="button" onClick={step > 1 ? goPrev : reset}
//             className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-all border border-gray-200">
//             <FaChevronLeft className="text-xs" /> {step > 1 ? "Previous" : "Cancel"}
//           </button>

//           <span className="text-xs font-bold text-gray-300 font-mono">{step} / {STEPS.length}</span>

//           {step < STEPS.length ? (
//             <button type="button" onClick={goNext}
//               className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
//               Next <FaChevronRight className="text-xs" />
//             </button>
//           ) : (
//             <button type="button" onClick={handleSubmit} disabled={submitting}
//               className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed">
//               {submitting
//                 ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
//                 : <><FaCheck className="text-xs" /> {id._id ? "Update Item" : "Create Item"}</>}
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FaEdit, FaTrash, FaPlus, FaSearch, FaArrowLeft,
  FaChevronLeft, FaChevronRight, FaCheck, FaFileUpload,
  FaDownload, FaExclamationCircle, FaBoxOpen, FaTag,
  FaShieldAlt, FaCashRegister, FaRuler, FaClipboardCheck,
  FaListUl, FaFolder
} from "react-icons/fa";
import { HiOutlineDocumentText } from "react-icons/hi";
import ItemGroupSearch from "./ItemGroupSearch";
import { toast } from "react-toastify";

// ── 6 Steps ──
const STEPS = [
  { id: 1, label: "Basic Info",     icon: FaBoxOpen },
  { id: 2, label: "Tax & GST",      icon: HiOutlineDocumentText },
  { id: 3, label: "POS Settings",   icon: FaCashRegister },
  { id: 4, label: "Quality",        icon: FaShieldAlt },
  { id: 5, label: "Dimensions",     icon: FaRuler },
  { id: 6, label: "Review",         icon: FaClipboardCheck },
];

const INITIAL = {
  itemCode: "", itemName: "", description: "", category: "",
  subgroup: "",
  unitPrice: "", quantity: "", reorderLevel: "", leadTime: "",
  itemType: "", uom: "", managedBy: "", managedValue: "",
  batchNumber: "", expiryDate: "", manufacturer: "",
  length: "", width: "", height: "", weight: "",
  gnr: false, delivery: false, productionProcess: false,
  includeQualityCheck: false, qualityCheckDetails: [],
  includeGST: true, includeIGST: true,
  gstCode: "", gstName: "", gstRate: "", cgstRate: "", sgstRate: "",
  igstCode: "", igstName: "", igstRate: "",
  status: "active", active: true,
  posEnabled: false,
  posConfig: {
    barcode: "", posPrice: "", allowDiscount: true,
    maxDiscountPercent: 100, taxableInPOS: true, showInPOS: true,
  },
};

const VALIDATORS = {
  1: (d) => {
    const e = {};
    if (!d.itemName?.trim()) e.itemName  = "Item Name is required";
    if (!d.category?.trim()) e.category  = "Category is required";
    if (!d.uom)     e.uom     = "Unit of Measure is required";
    if (!d.itemType) e.itemType = "Item Type is required";
    return e;
  },
  2: () => ({}),
  3: () => ({}),
  4: () => ({}),
  5: () => ({}),
  6: () => ({}),
};

export default function ItemManagement() {
  const [view,      setView]      = useState("list");
  const [items,     setItems]     = useState([]);
  const [searchTerm,setSearchTerm]= useState("");
  const [filterType,setFilterType]= useState("All");
  const [loading,   setLoading]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting,setSubmitting]= useState(false);
  const [step,      setStep]      = useState(1);
  const [id,        setId]        = useState({ ...INITIAL });
  const [errs,      setErrs]      = useState({});
  
  // State for subgroups based on selected category
  const [availableSubgroups, setAvailableSubgroups] = useState([]);
  const [itemGroups, setItemGroups] = useState([]);

  useEffect(() => { fetchItems(); fetchItemGroups(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await axios.get("/api/items", { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) setItems(res.data.data || []);
    } catch { toast.error("Failed to load items"); }
    setLoading(false);
  };

  // Fetch item groups to get subgroups
  const fetchItemGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/itemGroups", { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setItemGroups(res.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching item groups:", error);
    }
  };

  // Update available subgroups when category changes
  useEffect(() => {
    if (id.category) {
      const selectedGroup = itemGroups.find(g => g.name === id.category);
      if (selectedGroup && selectedGroup.subgroups && selectedGroup.subgroups.length > 0) {
        setAvailableSubgroups(selectedGroup.subgroups);
        // If current subgroup is not in the new list, clear it
        if (id.subgroup && !selectedGroup.subgroups.includes(id.subgroup)) {
          setId(p => ({ ...p, subgroup: "" }));
        }
      } else {
        setAvailableSubgroups([]);
        setId(p => ({ ...p, subgroup: "" }));
      }
    } else {
      setAvailableSubgroups([]);
      setId(p => ({ ...p, subgroup: "" }));
    }
  }, [id.category, itemGroups]);

  const generateCode = async () => {
    try {
      const token = localStorage.getItem("token");
      const res   = await axios.get("/api/lastItemCode", { headers: { Authorization: `Bearer ${token}` } });
      const last  = res.data.lastItemCode || "ITEM-0000";
      const num   = parseInt(last.split("-")[1] || "0", 10) + 1;
      setId(p => ({ ...p, itemCode: `ITEM-${String(num).padStart(4, "0")}` }));
    } catch { }
  };

  // ── Handlers ──
  const clearErr = (k) => setErrs(p => { const n = { ...p }; delete n[k]; return n; });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith("posConfig.")) {
      const key = name.split(".")[1];
      setId(p => ({ ...p, posConfig: { ...(p.posConfig || {}), [key]: type === "checkbox" ? checked : value } }));
      return;
    }
    if (type === "checkbox") { setId(p => ({ ...p, [name]: checked })); return; }
    if (name === "gstRate") {
      const rate = parseFloat(value) || 0;
      setId(p => ({ ...p, gstRate: value, cgstRate: rate / 2, sgstRate: rate / 2 }));
      return;
    }
    setId(p => ({ ...p, [name]: value }));
    clearErr(name);
  };

  const handleQCChange = (i, e) => {
    const { name, value } = e.target;
    setId(p => { const q = [...p.qualityCheckDetails]; q[i] = { ...q[i], [name]: value }; return { ...p, qualityCheckDetails: q }; });
  };

  const addQC    = ()  => setId(p => ({ ...p, qualityCheckDetails: [...p.qualityCheckDetails, { srNo: "", parameter: "", min: "", max: "" }] }));
  const removeQC = (i) => setId(p => ({ ...p, qualityCheckDetails: p.qualityCheckDetails.filter((_, j) => j !== i) }));

  // ── Navigation ──
  const goNext = () => {
    const v = VALIDATORS[step];
    if (v) {
      const e = v(id);
      if (Object.keys(e).length) { setErrs(e); toast.error(Object.values(e)[0]); return; }
    }
    setErrs({});
    setStep(s => s + 1);
  };

  const goPrev = () => { setErrs({}); setStep(s => s - 1); };

  // ── Submit ──
  const handleSubmit = async () => {
    const allE = VALIDATORS[1](id);
    if (Object.keys(allE).length) { setErrs(allE); toast.error("Fix required fields"); return; }

    setSubmitting(true);
    const token   = localStorage.getItem("token");
    const toNum   = (v) => (v === "" || v == null ? undefined : Number(v));
    const payload = {
      ...id,
      unitPrice: Number(id.unitPrice || 0),
      quantity:  Number(id.quantity  || 0),
      reorderLevel: toNum(id.reorderLevel),
      leadTime:  toNum(id.leadTime),
      length: toNum(id.length), width: toNum(id.width),
      height: toNum(id.height), weight: toNum(id.weight),
      gstRate: toNum(id.gstRate), cgstRate: toNum(id.cgstRate),
      sgstRate: toNum(id.sgstRate), igstRate: toNum(id.igstRate),
      posEnabled: !!id.posEnabled,
      posConfig: {
        ...id.posConfig,
        posPrice: toNum(id.posConfig?.posPrice),
        maxDiscountPercent: id.posConfig?.maxDiscountPercent === "" ? 100 : Number(id.posConfig?.maxDiscountPercent ?? 100),
        allowDiscount: id.posConfig?.allowDiscount ?? true,
        taxableInPOS:  id.posConfig?.taxableInPOS  ?? true,
        showInPOS:     id.posConfig?.showInPOS      ?? true,
      },
    };

    try {
      if (id._id) {
        const res = await axios.put(`/api/items/${id._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) { setItems(p => p.map(it => it._id === id._id ? res.data.data : it)); toast.success("Item updated!"); }
        else toast.error(res.data.message || "Update failed");
      } else {
        const res = await axios.post("/api/items", payload, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) { setItems(p => [...p, res.data.data]); toast.success("Item created!"); }
        else toast.error(res.data.message || "Create failed");
      }
      reset();
    } catch (err) { toast.error(err.response?.data?.message || "Something went wrong"); }
    setSubmitting(false);
  };

  const reset = () => { 
    setId({ ...INITIAL }); 
    setStep(1); 
    setErrs({}); 
    setView("list"); 
    setAvailableSubgroups([]); 
  };

  const handleEdit = (item) => { 
    setId(item); 
    setStep(1); 
    setErrs({}); 
    setView("form");
    // Fetch subgroups for the category
    if (item.category) {
      const selectedGroup = itemGroups.find(g => g.name === item.category);
      if (selectedGroup && selectedGroup.subgroups) {
        setAvailableSubgroups(selectedGroup.subgroups);
      }
    }
  };

  const handleDelete = async (itemId) => {
    if (!confirm("Delete this item?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/items/${itemId}`, { headers: { Authorization: `Bearer ${token}` } });
      setItems(p => p.filter(it => it._id !== itemId));
      toast.success("Item deleted");
    } catch { toast.error("Delete failed"); }
  };

  // ── Bulk ──
  const downloadTemplate = async () => {
    try {
      const res  = await fetch("/api/items/template");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "item_template.csv"; a.click();
    } catch { toast.error("Error downloading template"); }
  };

  const handleBulk = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const text  = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      const hdrs  = lines[0].split(",").map(h => h.trim());
      const jsonData = lines.slice(1).map(line => { const v = line.split(","); const o = {}; hdrs.forEach((k, i) => (o[k] = v[i]?.trim() || "")); return o; });
      const res = await axios.post("/api/items/bulk", { items: jsonData }, { headers: { Authorization: `Bearer ${token}` } });
      const { success, results } = res.data;
      if (success) {
        const cr = results.filter(r => r.success && r.action === "created").length;
        const up = results.filter(r => r.success && r.action === "updated").length;
        const sk = results.filter(r => !r.success).length;
        toast.success(`${cr} created · ${up} updated · ${sk} skipped`);
        results.filter(r => r.warnings?.length).forEach(r => toast.warn(`Row ${r.row}: ${r.warnings.join(", ")}`));
        fetchItems();
      } else toast.error(res.data.message || "Bulk upload failed");
    } catch { toast.error("Invalid CSV or server error"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  // ── Derived ──
  const filtered = items.filter(it => {
    const q  = searchTerm.toLowerCase();
    const mQ = [it.itemCode, it.itemName, it.category, it.itemType, it.subgroup].some(v => v?.toLowerCase().includes(q));
    const mT = filterType === "All" || it.itemType === filterType;
    return mQ && mT;
  }).slice().reverse();

  const stats = {
    total:    items.length,
    product:  items.filter(it => it.itemType === "Product").length,
    service:  items.filter(it => it.itemType === "Service").length,
    rawMat:   items.filter(it => it.itemType === "Raw Material").length,
  };

  // ── UI Helpers ──
  const Err = ({ k }) => errs[k]
    ? <p className="flex items-center gap-1 mt-1 text-xs text-red-500 font-medium"><FaExclamationCircle className="text-[10px] shrink-0" />{errs[k]}</p>
    : null;

  const fi = (k, extra = "") =>
    `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none ${extra}
     ${errs[k] ? "border-red-400 ring-2 ring-red-100 bg-red-50 placeholder:text-red-300" : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"}`;

  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const Toggle = ({ name, checked, label, nested }) => (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <div className={`relative w-9 h-5 rounded-full transition-all ${checked ? "bg-indigo-500" : "bg-gray-200"}`}
        onClick={() => nested
          ? setId(p => ({ ...p, posConfig: { ...(p.posConfig || {}), [name.split(".")[1]]: !checked } }))
          : setId(p => ({ ...p, [name]: !checked }))}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </div>
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
    </label>
  );

  const RRow = ({ l, v }) => (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{l}</span>
      <span className="text-sm font-semibold text-gray-800 text-right max-w-[60%] truncate">{v || <span className="text-gray-300 font-normal italic text-xs">—</span>}</span>
    </div>
  );

  // ── Step Content ──
  const renderStep = () => {
    switch (step) {

      // ── Step 1: Basic Info ──
      case 1: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Lbl text="Item Code" />
              <input className={`${fi("")} bg-gray-100 cursor-not-allowed text-gray-400`} value={id.itemCode || ""} readOnly />
              <p className="text-[11px] text-gray-400 mt-1">Auto-generated</p>
            </div>
            <div>
              <Lbl text="Item Name" req />
              <input className={fi("itemName")} name="itemName" value={id.itemName || ""} onChange={handleChange} placeholder="e.g. Steel Rod 10mm" />
              <Err k="itemName" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Lbl text="Category" req />
              <ItemGroupSearch 
                onSelectItemGroup={g => { 
                  setId(p => ({ ...p, category: g.name, subgroup: "" })); 
                  clearErr("category"); 
                }}
                onSelectSubGroup={s => {
                  setId(p => ({ ...p, subgroup: s?.name || "" }));
                }}
                availableSubgroups={availableSubgroups}
              />
              {id.category && <p className="text-xs text-indigo-600 font-semibold mt-1.5 flex items-center gap-1"><FaTag className="text-[10px]" /> {id.category}</p>}
              <Err k="category" />
            </div>
            
            {/* Subgroup Dropdown - Populates from selected Category */}
            <div>
              <Lbl text="Subgroup" />
              <select 
                className={fi("subgroup")} 
                name="subgroup" 
                value={id.subgroup || ""} 
                onChange={handleChange}
                disabled={availableSubgroups.length === 0}
              >
                <option value="">
                  {!id.category 
                    ? "Select category first…" 
                    : availableSubgroups.length === 0 
                      ? "No subgroups available" 
                      : "Select subgroup…"
                  }
                </option>
                {availableSubgroups.map((sg, idx) => (
                  <option key={idx} value={sg}>{sg}</option>
                ))}
              </select>
              {id.category && availableSubgroups.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                  <FaExclamationCircle className="text-[10px]" /> No subgroups defined for this category
                </p>
              )}
              {id.category && availableSubgroups.length > 0 && (
                <p className="text-[11px] text-gray-400 mt-1">{availableSubgroups.length} subgroup(s) available</p>
              )}
              <Err k="subgroup" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Lbl text="Item Type" req />
              <select className={fi("itemType")} name="itemType" value={id.itemType || ""} onChange={handleChange}>
                <option value="">Select type…</option>
                <option>Product</option>
                <option>Service</option>
                <option>Raw Material</option>
              </select>
              <Err k="itemType" />
            </div>
            <div>
              <Lbl text="Unit Price (₹)" req />
              <input className={fi("unitPrice")} name="unitPrice" type="number" min="0" step="0.01" placeholder="0.00" value={id.unitPrice || ""} onChange={handleChange} />
              <Err k="unitPrice" />
            </div>
            <div>
              <Lbl text="Min. Stock" req />
              <input className={fi("quantity")} name="quantity" type="number" min="0" placeholder="0" value={id.quantity || ""} onChange={handleChange} />
              <Err k="quantity" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Lbl text="Reorder Level" />
              <input className={fi("")} name="reorderLevel" type="number" min="0" placeholder="0" value={id.reorderLevel || ""} onChange={handleChange} />
            </div>
            <div>
              <Lbl text="Lead Time (Days)" />
              <input className={fi("")} name="leadTime" type="number" min="1" placeholder="7" value={id.leadTime || ""} onChange={handleChange} />
            </div>
            <div>
              <Lbl text="Unit of Measure" req />
              <select className={fi("uom")} name="uom" value={id.uom || ""} onChange={handleChange}>
                <option value="">Select UOM…</option>
                <option value="KG">Kilogram (KG)</option>
                <option value="MTP">Metric Ton (MTP)</option>
                <option value="PC">Piece (PC)</option>
                <option value="LTR">Liter (LTR)</option>
                <option value="MTR">Meter (MTR)</option>
              </select>
              <Err k="uom" />
            </div>
          </div>

          <div>
            <Lbl text="Description" />
            <textarea className={`${fi("")} resize-none`} name="description" rows={3} placeholder="Brief description of this item…" value={id.description || ""} onChange={handleChange} />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <Lbl text="Status" />
            <select className={`${fi("")} w-auto`} name="status" value={id.status || "active"} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      );

      // ── Step 2: Tax & GST ──
      case 2: return (
        <div className="space-y-5">
          <div className="flex gap-6">
            <Toggle name="includeGST"  checked={id.includeGST}  label="Include GST"  />
            <Toggle name="includeIGST" checked={id.includeIGST} label="Include IGST" />
          </div>

          {id.includeGST && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <p className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">
                <HiOutlineDocumentText /> GST Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Lbl text="GST Code" />
                  <input className={fi("")} name="gstCode" value={id.gstCode || ""} onChange={handleChange} placeholder="e.g. GST18" />
                </div>
                <div>
                  <Lbl text="GST Name" />
                  <input className={fi("")} name="gstName" value={id.gstName || ""} onChange={handleChange} placeholder="e.g. GST 18%" />
                </div>
                <div>
                  <Lbl text="GST Rate (%)" />
                  <input className={fi("")} name="gstRate" type="number" min="0" max="100" step="0.1" placeholder="0" value={id.gstRate || ""} onChange={handleChange} />
                  <p className="text-[11px] text-blue-500 mt-1">CGST & SGST will be auto-split (half each)</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Lbl text="CGST (%)" />
                    <input className={`${fi("")} bg-gray-100 cursor-not-allowed text-gray-400`} value={id.cgstRate || ""} readOnly />
                  </div>
                  <div>
                    <Lbl text="SGST (%)" />
                    <input className={`${fi("")} bg-gray-100 cursor-not-allowed text-gray-400`} value={id.sgstRate || ""} readOnly />
                  </div>
                </div>
              </div>
            </div>
          )}

          {id.includeIGST && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
              <p className="text-sm font-bold text-purple-800 mb-4 flex items-center gap-2">
                <HiOutlineDocumentText /> IGST Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Lbl text="IGST Code" />
                  <input className={fi("")} name="igstCode" value={id.igstCode || ""} onChange={handleChange} placeholder="e.g. IGST18" />
                </div>
                <div>
                  <Lbl text="IGST Name" />
                  <input className={fi("")} name="igstName" value={id.igstName || ""} onChange={handleChange} placeholder="e.g. IGST 18%" />
                </div>
                <div>
                  <Lbl text="IGST Rate (%)" />
                  <input className={fi("")} name="igstRate" type="number" min="0" max="100" step="0.1" placeholder="0" value={id.igstRate || ""} onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

          {!id.includeGST && !id.includeIGST && (
            <div className="text-center py-8 text-gray-300">
              <HiOutlineDocumentText className="text-5xl mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Enable GST or IGST above to configure tax details</p>
            </div>
          )}
        </div>
      );

      // ── Step 3: POS Settings ──
      case 3: return (
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <FaCashRegister className="text-orange-500 text-xl mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-orange-800 mb-0.5">POS (Point of Sale)</p>
              <p className="text-xs text-orange-600">Enable this item to be sold through the POS system. Configure barcode, pricing, and discount rules.</p>
            </div>
          </div>

          <Toggle name="posEnabled" checked={id.posEnabled} label="Enable this item for POS (Sellable)" />

          {id.posEnabled && (
            <div className="border border-gray-200 rounded-xl p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Barcode" />
                  <input className={fi("")} name="posConfig.barcode" value={id.posConfig?.barcode || ""} onChange={handleChange} placeholder="Scan or enter barcode" />
                </div>
                <div>
                  <Lbl text="POS Price (Optional override)" />
                  <input className={fi("")} name="posConfig.posPrice" type="number" min="0" step="0.01" placeholder={`Leave blank → uses ₹${id.unitPrice || 0}`} value={id.posConfig?.posPrice ?? ""} onChange={handleChange} />
                  <p className="text-[11px] text-gray-400 mt-1">Empty = uses Unit Price: <strong>₹{id.unitPrice || 0}</strong></p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Toggle name="posConfig.allowDiscount"  checked={id.posConfig?.allowDiscount  ?? true} label="Allow Discount in POS" nested />
                  <Toggle name="posConfig.taxableInPOS"   checked={id.posConfig?.taxableInPOS   ?? true} label="Taxable in POS"         nested />
                  <Toggle name="posConfig.showInPOS"      checked={id.posConfig?.showInPOS      ?? true} label="Show in POS list"       nested />
                </div>
                <div>
                  <Lbl text="Max Discount (%)" />
                  <input className={fi("")} name="posConfig.maxDiscountPercent" type="number" min="0" max="100"
                    value={id.posConfig?.maxDiscountPercent ?? 100} onChange={handleChange}
                    disabled={!(id.posConfig?.allowDiscount ?? true)} />
                  {!(id.posConfig?.allowDiscount ?? true) && <p className="text-[11px] text-gray-400 mt-1">Enable discount to set max %</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      );

      // ── Step 4: Quality ──
      case 4: return (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
            <FaShieldAlt className="text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-700 font-medium">Define quality parameters for inspection during GRN or production. Each parameter needs a min and max acceptable value.</p>
          </div>

          <Toggle name="includeQualityCheck" checked={id.includeQualityCheck} label="Include Quality Checks" />

          {id.includeQualityCheck && (
            <div>
              <div className="grid grid-cols-12 gap-2 mb-2 px-1">
                {["Sr.", "Parameter", "Min", "Max", ""].map((h, i) => (
                  <div key={i} className={`text-[10px] font-bold uppercase tracking-wider text-gray-400 ${i === 0 ? "col-span-1" : i === 1 ? "col-span-5" : i === 4 ? "col-span-1" : "col-span-2"}`}>{h}</div>
                ))}
              </div>

              <div className="space-y-2">
                {id.qualityCheckDetails.map((qc, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg px-2 py-1.5">
                    <div className="col-span-1">
                      <input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400 text-center font-mono" name="srNo" placeholder="#" value={qc.srNo} onChange={e => handleQCChange(i, e)} />
                    </div>
                    <div className="col-span-5">
                      <input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400" name="parameter" placeholder="e.g. Tensile Strength" value={qc.parameter} onChange={e => handleQCChange(i, e)} />
                    </div>
                    <div className="col-span-2">
                      <input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400" name="min" placeholder="Min" value={qc.min} onChange={e => handleQCChange(i, e)} />
                    </div>
                    <div className="col-span-2">
                      <input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400" name="max" placeholder="Max" value={qc.max} onChange={e => handleQCChange(i, e)} />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button type="button" onClick={() => removeQC(i)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addQC}
                className="mt-3 w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-indigo-500 font-semibold text-sm flex items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                <FaPlus className="text-xs" /> Add Quality Parameter
              </button>
            </div>
          )}
        </div>
      );

      // ── Step 5: Dimensions ──
      case 5: return (
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <FaRuler className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 font-medium">Physical dimensions and weight are used for logistics, shipping calculations, and warehouse management. All fields are optional.</p>
          </div>

          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">Dimensions</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { n: "length", l: "Length (cm)", ph: "0" },
                { n: "width",  l: "Width (cm)",  ph: "0" },
                { n: "height", l: "Height (cm)", ph: "0" },
                { n: "weight", l: "Weight (kg)", ph: "0.00", step: "0.01" },
              ].map(f => (
                <div key={f.n}>
                  <Lbl text={f.l} />
                  <input className={fi("")} name={f.n} type="number" min="0" step={f.step || "1"} placeholder={f.ph} value={id[f.n] || ""} onChange={handleChange} />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <p className="text-sm font-bold text-gray-700 mb-3">Additional Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Lbl text="Manufacturer" />
                <input className={fi("")} name="manufacturer" value={id.manufacturer || ""} onChange={handleChange} placeholder="e.g. Tata Steel" />
              </div>
              <div>
                <Lbl text="Expiry Date" />
                <input className={fi("")} name="expiryDate" type="date" value={id.expiryDate || ""} onChange={handleChange} />
              </div>
              <div>
                <Lbl text="Batch Number" />
                <input className={fi("")} name="batchNumber" value={id.batchNumber || ""} onChange={handleChange} placeholder="e.g. BATCH-2024-001" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
              <Toggle name="gnr"               checked={id.gnr}               label="GNR Applicable" />
              <Toggle name="delivery"           checked={id.delivery}           label="Delivery Item" />
              <Toggle name="productionProcess"  checked={id.productionProcess}  label="Production Process" />
            </div>
          </div>
        </div>
      );

      // ── Step 6: Review ──
      case 6: return (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Review all details before saving.</p>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaBoxOpen className="text-indigo-400" /> Basic Info</p>
            <RRow l="Code"       v={id.itemCode} />
            <RRow l="Name"       v={id.itemName} />
            <RRow l="Category"   v={id.category} />
            <RRow l="Subgroup"   v={id.subgroup || "—"} />
            <RRow l="Type"       v={id.itemType} />
            <RRow l="Unit Price" v={id.unitPrice ? `₹${Number(id.unitPrice).toFixed(2)}` : ""} />
            <RRow l="Min. Stock" v={id.quantity} />
            <RRow l="UOM"        v={id.uom} />
            <RRow l="Reorder Level" v={id.reorderLevel} />
            <RRow l="Lead Time"  v={id.leadTime ? `${id.leadTime} days` : ""} />
            <RRow l="Status"     v={id.status} />
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><HiOutlineDocumentText className="text-indigo-400" /> Tax</p>
            <RRow l="Include GST"  v={id.includeGST  ? "Yes" : "No"} />
            <RRow l="GST Rate"     v={id.gstRate ? `${id.gstRate}%` : ""} />
            <RRow l="Include IGST" v={id.includeIGST ? "Yes" : "No"} />
            <RRow l="IGST Rate"    v={id.igstRate ? `${id.igstRate}%` : ""} />
          </div>

          {id.posEnabled && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaCashRegister className="text-orange-400" /> POS</p>
              <RRow l="POS Price"    v={id.posConfig?.posPrice ? `₹${id.posConfig.posPrice}` : `₹${id.unitPrice} (unit price)`} />
              <RRow l="Barcode"      v={id.posConfig?.barcode} />
              <RRow l="Discount"     v={id.posConfig?.allowDiscount ? `Allowed (max ${id.posConfig.maxDiscountPercent}%)` : "Not allowed"} />
              <RRow l="Taxable"      v={id.posConfig?.taxableInPOS ? "Yes" : "No"} />
            </div>
          )}

          {id.includeQualityCheck && id.qualityCheckDetails?.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaShieldAlt className="text-emerald-400" /> Quality ({id.qualityCheckDetails.length} parameters)</p>
              {id.qualityCheckDetails.map((q, i) => <RRow key={i} l={q.parameter || `Param ${i+1}`} v={`Min: ${q.min || "—"} · Max: ${q.max || "—"}`} />)}
            </div>
          )}

          {(id.length || id.weight || id.manufacturer) && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaRuler className="text-blue-400" /> Dimensions</p>
              {id.length && <RRow l="L × W × H" v={`${id.length} × ${id.width || 0} × ${id.height || 0} cm`} />}
              {id.weight       && <RRow l="Weight"       v={`${id.weight} kg`} />}
              {id.manufacturer && <RRow l="Manufacturer" v={id.manufacturer} />}
            </div>
          )}
        </div>
      );

      default: return null;
    }
  };

  // ════════════════════════════════════════
  // ── LIST VIEW ──
  // ════════════════════════════════════════
  if (view === "list") return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Item Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">{items.length} total items</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadTemplate}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-all">
              <FaDownload className="text-xs" /> Template
            </button>
            <label className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 cursor-pointer transition-all">
              {uploading ? "Uploading…" : <><FaFileUpload className="text-xs" /> Bulk Upload</>}
              <input type="file" hidden accept=".csv" onChange={handleBulk} />
            </label>
            <button onClick={() => { generateCode(); setView("form"); }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
              <FaPlus className="text-xs" /> Create Item
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total",        value: stats.total,   emoji: "📦", filter: "All" },
            { label: "Product",      value: stats.product, emoji: "🛍️", filter: "Product" },
            { label: "Service",      value: stats.service, emoji: "🔧", filter: "Service" },
            { label: "Raw Material", value: stats.rawMat,  emoji: "⚙️",  filter: "Raw Material" },
          ].map(s => (
            <div key={s.label} onClick={() => setFilterType(s.filter)}
              className={`bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer border-2 transition-all
                ${filterType === s.filter ? "border-indigo-400 shadow-md shadow-indigo-100" : "border-transparent shadow-sm hover:border-indigo-200 hover:-translate-y-0.5"}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="text-2xl font-extrabold tracking-tight text-gray-900 leading-none mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
              <input className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-gray-300"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search items…" />
            </div>
            <div className="flex gap-2 flex-wrap ml-auto">
              {["All","Product","Service","Raw Material"].map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${filterType === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Code","Item","Category","Subgroup","Type","Price","UOM","Status","POS","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array(10).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-16">
                    <div className="text-4xl mb-2 opacity-20">📦</div>
                    <p className="text-sm font-medium text-gray-300">No items found</p>
                  </td></tr>
                ) : filtered.map(it => (
                  <tr key={it._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{it.itemCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{it.itemName}</p>
                      {it.manufacturer && <p className="text-xs text-gray-400">{it.manufacturer}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-medium">{it.category || <span className="text-gray-200">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-medium">
                      {it.subgroup ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                          <FaFolder className="text-[9px]" /> {it.subgroup}
                        </span>
                      ) : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full
                        ${it.itemType === "Product"      ? "bg-blue-50 text-blue-600"
                          : it.itemType === "Service"    ? "bg-purple-50 text-purple-600"
                          : it.itemType === "Raw Material" ? "bg-amber-50 text-amber-600"
                          : "bg-gray-100 text-gray-500"}`}>
                        {it.itemType || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-bold text-gray-700">₹{Number(it.unitPrice || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{it.uom || <span className="text-gray-200">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${it.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                        {it.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {it.posEnabled
                        ? <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-500">POS</span>
                        : <span className="text-gray-200 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => handleEdit(it)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all">
                          <FaEdit className="text-xs" />
                        </button>
                        <button onClick={() => handleDelete(it._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );

  // ════════════════════════════════════════
  // ── FORM VIEW ──
  // ════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

        <button onClick={reset} className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4 hover:text-indigo-800 transition-colors">
          <FaArrowLeft className="text-xs" /> Back to Items
        </button>

        <h2 className="text-xl font-extrabold tracking-tight text-gray-900 mb-0.5">
          {id._id ? "Edit Item" : "New Item"}
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Step {step} of {STEPS.length} — <span className="font-semibold text-gray-600">{STEPS[step - 1].label}</span>
        </p>

        {/* Stepper */}
        <div className="flex items-start mb-7">
          {STEPS.map((s, i) => {
            const Icon  = s.icon;
            const done   = step > s.id;
            const active = step === s.id;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center shrink-0">
                  <button type="button" onClick={() => done && setStep(s.id)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all
                      ${done   ? "bg-emerald-500 border-emerald-500 text-white cursor-pointer hover:bg-emerald-600"
                        : active ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                        : "bg-white border-gray-200 text-gray-300 cursor-default"}`}>
                    {done ? <FaCheck style={{ fontSize: 12 }} /> : <Icon style={{ fontSize: 12 }} />}
                  </button>
                  <span className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 whitespace-nowrap hidden sm:block
                    ${done ? "text-emerald-500" : active ? "text-indigo-600" : "text-gray-300"}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mt-[18px] mx-1 transition-all ${done ? "bg-emerald-400" : "bg-gray-200"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-4">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
              {React.createElement(STEPS[step - 1].icon, { className: "text-base" })}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{STEPS[step - 1].label}</h3>
              <p className="text-xs text-gray-400">Fill in the details below</p>
            </div>
            <span className="ml-auto text-xs font-bold text-gray-300 font-mono">{step}/{STEPS.length}</span>
          </div>

          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={step > 1 ? goPrev : reset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-all border border-gray-200">
            <FaChevronLeft className="text-xs" /> {step > 1 ? "Previous" : "Cancel"}
          </button>

          <span className="text-xs font-bold text-gray-300 font-mono">{step} / {STEPS.length}</span>

          {step < STEPS.length ? (
            <button type="button" onClick={goNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
              Next <FaChevronRight className="text-xs" />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                : <><FaCheck className="text-xs" /> {id._id ? "Update Item" : "Create Item"}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}