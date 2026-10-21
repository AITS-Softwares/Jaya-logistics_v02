// // "use client";

// // import { useState, useEffect, useRef } from "react";
// // import { useRouter } from "next/navigation";

// // function uid() {
// //   return Math.random().toString(36).slice(2, 10);
// // }

// // function num(v) {
// //   const n = Number(v);
// //   return Number.isFinite(n) ? n : 0;
// // }

// // function Card({ title, children }) {
// //   return (
// //     <div className="rounded-2xl border border-slate-200 bg-white shadow-sm mb-4">
// //       <div className="border-b border-slate-100 px-4 py-3">
// //         <div className="text-sm font-extrabold text-slate-900">{title}</div>
// //       </div>
// //       <div className="p-4">{children}</div>
// //     </div>
// //   );
// // }

// // // POD Dropdown Component
// // function PODDropdown({ onSelect, selectedPodNo }) {
// //   const [searchQuery, setSearchQuery] = useState(selectedPodNo || "");
// //   const [showDropdown, setShowDropdown] = useState(false);
// //   const [podList, setPodList] = useState([]);
// //   const [loading, setLoading] = useState(false);
// //   const inputRef = useRef(null);
// //   const dropdownRef = useRef(null);
// //   const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

// //   useEffect(() => {
// //     fetchPODs();
// //   }, []);

// //   const fetchPODs = async () => {
// //     setLoading(true);
// //     try {
// //       const token = localStorage.getItem('token');
// //       const res = await fetch('/api/balance-payment/pod-lookup?format=table', {
// //         headers: { Authorization: `Bearer ${token}` },
// //       });
// //       const data = await res.json();
// //       if (data.success) {
// //         setPodList(data.data || []);
// //       }
// //     } catch (error) {
// //       console.error('Error fetching PODs:', error);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const filteredPODs = podList.filter(pod =>
// //     pod.podNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
// //     pod.purchaseNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
// //     pod.vendorName?.toLowerCase().includes(searchQuery.toLowerCase())
// //   );

// //   const handleSelect = (pod) => {
// //     setSearchQuery(pod.podNo);
// //     setShowDropdown(false);
// //     onSelect(pod);
// //   };

// //   const handleInputFocus = () => {
// //     if (inputRef.current) {
// //       const rect = inputRef.current.getBoundingClientRect();
// //       setDropdownPosition({
// //         top: rect.bottom + window.scrollY,
// //         left: rect.left + window.scrollX,
// //         width: rect.width
// //       });
// //     }
// //     setShowDropdown(true);
// //   };

// //   const handleInputBlur = () => {
// //     setTimeout(() => setShowDropdown(false), 200);
// //   };

// //   useEffect(() => {
// //     const handleScroll = () => {
// //       if (showDropdown && inputRef.current) {
// //         const rect = inputRef.current.getBoundingClientRect();
// //         setDropdownPosition({
// //           top: rect.bottom + window.scrollY,
// //           left: rect.left + window.scrollX,
// //           width: rect.width
// //         });
// //       }
// //     };
// //     window.addEventListener('scroll', handleScroll, true);
// //     window.addEventListener('resize', handleScroll);
// //     return () => {
// //       window.removeEventListener('scroll', handleScroll, true);
// //       window.removeEventListener('resize', handleScroll);
// //     };
// //   }, [showDropdown]);

// //   return (
// //     <div className="relative w-full">
// //       <input
// //         ref={inputRef}
// //         type="text"
// //         value={searchQuery}
// //         onChange={(e) => setSearchQuery(e.target.value)}
// //         onFocus={handleInputFocus}
// //         onBlur={handleInputBlur}
// //         className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
// //         placeholder="Search POD No, Purchase No, or Vendor..."
// //       />
// //       {showDropdown && (
// //         <div
// //           ref={dropdownRef}
// //           style={{ 
// //             position: 'fixed', 
// //             top: dropdownPosition.top, 
// //             left: dropdownPosition.left, 
// //             width: dropdownPosition.width, 
// //             zIndex: 9999, 
// //             maxHeight: '300px' 
// //           }}
// //           className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-y-auto"
// //         >
// //           {loading ? (
// //             <div className="p-4 text-center text-sm text-slate-500">Loading...</div>
// //           ) : filteredPODs.length > 0 ? (
// //             <div className="divide-y divide-slate-100">
// //               {filteredPODs.map(pod => (
// //                 <div 
// //                   key={pod._id} 
// //                   onMouseDown={() => handleSelect(pod)} 
// //                   className="p-3 hover:bg-emerald-50 cursor-pointer"
// //                 >
// //                   <div className="font-medium text-slate-800">{pod.podNo}</div>
// //                   <div className="text-xs text-slate-500">Purchase: {pod.purchaseNo} | Vendor: {pod.vendorName}</div>
// //                   <div className="text-xs text-slate-400">Total: ₹{pod.totalAmount?.toLocaleString()} | Balance: ₹{pod.finalBalance?.toLocaleString()}</div>
// //                 </div>
// //               ))}
// //             </div>
// //           ) : (
// //             <div className="p-4 text-center text-sm text-slate-500">No PODs found</div>
// //           )}
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // export default function CreateBalancePayment() {
// //   const router = useRouter();
// //   const [saving, setSaving] = useState(false);
// //   const [loadingData, setLoadingData] = useState(false);

// //   // Auto-generated payment number
// //   const [balancePaymentNo, setBalancePaymentNo] = useState("");

// //   // Basic Info
// //   const [branch, setBranch] = useState("");
// //   const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
// //   const [vendorName, setVendorName] = useState("");
// //   const [podNo, setPodNo] = useState("");
// //   const [purchaseNo, setPurchaseNo] = useState("");

// //   // Order Rows
// //   const [orderRows, setOrderRows] = useState([]);

// //   // Balance Payment Panel Fields
// //   const [vendorStatus, setVendorStatus] = useState("Active");
// //   const [vendorCode, setVendorCode] = useState("");
// //   const [vendorNamePayment, setVendorNamePayment] = useState("");
// //   const [vehicleNo, setVehicleNo] = useState("");
// //   const [purchaseType, setPurchaseType] = useState("Loading & Unloading");
// //   const [rateType, setRateType] = useState("Per MT");
// //   const [rate, setRate] = useState("");
// //   const [weight, setWeight] = useState("");
// //   const [amount, setAmount] = useState("");
// //   const [advance, setAdvance] = useState("");
// //   const [totalAddition, setTotalAddition] = useState("");
// //   const [totalDeduction, setTotalDeduction] = useState("");
// //   const [balance, setBalance] = useState("");

// //   // Financial Summary Fields
// //   const [poAddition, setPoAddition] = useState("");
// //   const [poDeduction, setPoDeduction] = useState("");
// //   const [podDeduction, setPodDeduction] = useState("");
// //   const [finalBalance, setFinalBalance] = useState("");
// //   const [dueDate, setDueDate] = useState("");

// //   // Payment Transaction Details
// //   const [vendorNameDebit, setVendorNameDebit] = useState("");
// //   const [accountNoCredit, setAccountNoCredit] = useState("");
// //   const [finalAmount, setFinalAmount] = useState("");
// //   const [remarks, setRemarks] = useState("Balance Payment");
// //   const [transactionId, setTransactionId] = useState("");
// //   const [bankVendorCode, setBankVendorCode] = useState("");
// //   const [paymentStatus, setPaymentStatus] = useState("Pending");

// // const defaultOrderRow = () => ({
// //   _id: uid(),
// //   orderNo: "",
// //   partyName: "",
// //   plantCode: "",
// //   orderType: "",
// //   pinCode: "",
// //   state: "",
// //   stateName: "", // ✅ ADD THIS
// //   fromState: "", // ✅ ADD THIS
// //   district: "",
// //   from: "",
// //   fromName: "", // ✅ ADD THIS
// //   to: "",
// //   toName: "", // ✅ ADD THIS
// //   locationRate: "",
// //   priceList: "",
// //   weight: "",
// //   rate: "",
// //   totalAmount: "",
// //   localStatus: "unknown", // ✅ ADD THIS
// //   localStatusLabel: "Unknown" // ✅ ADD THIS
// // });

// //   useEffect(() => {
// //     fetchAutoPaymentNumber();
// //     setOrderRows([defaultOrderRow()]);
// //   }, []);

// //   const fetchAutoPaymentNumber = async () => {
// //     try {
// //       const token = localStorage.getItem('token');
// //       const res = await fetch('/api/balance-payment/generate-number', {
// //         headers: { Authorization: `Bearer ${token}` }
// //       });
// //       const data = await res.json();
// //       if (data.success) {
// //         setBalancePaymentNo(data.paymentNo);
// //       }
// //     } catch (error) {
// //       console.error('Error fetching payment number:', error);
// //     }
// //   };

// //   // Handle POD Selection - Load data from POD directly
// //  // Handle POD Selection - Load data from POD directly
// // const handlePODSelect = async (pod) => {
// //   setLoadingData(true);
// //   setPodNo(pod.podNo);
// //   setPurchaseNo(pod.purchaseNo);

// //   try {
// //     const token = localStorage.getItem('token');

// //     // Fetch full POD data
// //     const podRes = await fetch(`/api/balance-payment/pod-lookup?podNo=${encodeURIComponent(pod.podNo)}`, {
// //       headers: { Authorization: `Bearer ${token}` },
// //     });
// //     const podData = await podRes.json();

// //     console.log("📦 Full POD Data:", podData);

// //     if (podData.success && podData.data) {
// //       const pd = podData.data;

// //       // Extract data from POD structure
// //       const headerData = pd.header || {};
// //       const vendorFinancial = pd.vendorFinancial || {};
// //       const purchaseOrders = pd.purchaseOrders || [];
// //       const firstOrder = purchaseOrders[0] || {};
// //       const podStatusSection = pd.podStatusSection || {};

// //       // Basic Info
// //       setBranch(headerData.branch || headerData.branchName || "");
// //       setDate(headerData.date ? new Date(headerData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
// //       setVendorName(vendorFinancial.vendorName || pod.vendorName || "");
// //       setPurchaseNo(pd.purchaseNo || pod.purchaseNo || "");

// //       // Purchase Details
// //       setVendorStatus(vendorFinancial.vendorStatus || "Active");
// //       setVendorCode(vendorFinancial.vendorCode || "");
// //       setVendorNamePayment(vendorFinancial.vendorName || pod.vendorName || "");
// //       setVehicleNo(firstOrder.vehicleNo || vendorFinancial.vehicleNo || "");
// //       setPurchaseType(pd.purchaseType || "Loading & Unloading");
// //       setRateType(pd.rateType || "Per MT");
// //       setRate(vendorFinancial.rate?.toString() || firstOrder.rate?.toString() || "");
// //       setWeight(firstOrder.weight?.toString() || vendorFinancial.weight?.toString() || "");

// //       // Financial Values from Vendor Financial
// //       const totalAmount = vendorFinancial.total || vendorFinancial.amount || 0;
// //       const advanceAmount = vendorFinancial.advance || 0;
// //       const totalAdditionsValue = vendorFinancial.totalAdditions || 0;
// //       const totalDeductionsValue = vendorFinancial.totalDeductions || 0;
// //       const poDeductionValue = vendorFinancial.poDeduction || 0;
// //       const podDeductionValue = vendorFinancial.podDeduction || 0;
// //       const finalBalanceValue = vendorFinancial.finalBalance || (totalAmount - advanceAmount - poDeductionValue - podDeductionValue);
// //       const dueDateValue = podStatusSection.dueDate || "";

// //       setAmount(totalAmount.toString());
// //       setAdvance(advanceAmount.toString());
// //       setTotalAddition(totalAdditionsValue.toString());
// //       setTotalDeduction(totalDeductionsValue.toString());
// //       setPoAddition("0");
// //       setPoDeduction(poDeductionValue.toString());
// //       setPodDeduction(podDeductionValue.toString());
// //       setFinalBalance(finalBalanceValue.toString());
// //       setDueDate(dueDateValue);

// //       const calculatedBalance = totalAmount - advanceAmount;
// //       setBalance(calculatedBalance.toFixed(2));
// //       setFinalAmount(finalBalanceValue.toString());

// //       // Set Order Rows from purchaseOrders - UPDATED with fromState
// //       if (purchaseOrders.length > 0) {
// //         const mappedOrders = purchaseOrders.map(order => ({
// //           _id: uid(),
// //           orderNo: order.orderNo || "",
// //           partyName: order.partyName || "",
// //           plantCode: order.plantCode || "",
// //           orderType: order.orderType || "Sales",
// //           pinCode: order.pinCode || "",
// //           state: order.state || "",
// //           stateName: order.stateName || order.state || "", // ✅ ADDED
// //           fromState: order.fromState || "", // ✅ ADDED
// //           district: order.district || "",
// //           from: order.from || "",
// //           fromName: order.fromName || order.from || "", // ✅ ADDED
// //           to: order.to || "",
// //           toName: order.toName || order.to || "", // ✅ ADDED
// //           locationRate: order.locationRate || "",
// //           priceList: order.priceList || "",
// //           weight: order.weight?.toString() || "0",
// //           rate: order.rate?.toString() || "0",
// //           totalAmount: order.totalAmount?.toString() || ((order.weight || 0) * (order.rate || 0)).toString(),
// //           localStatus: order.localStatus || "unknown", // ✅ ADDED
// //           localStatusLabel: order.localStatusLabel || "Unknown" // ✅ ADDED
// //         }));
// //         setOrderRows(mappedOrders);
// //       }

// //       // Set Payment Details from Advance Payment if available
// //       let paymentDetailsAdv = {};
// //       let vendorDetailsAdv = {};

// //       try {
// //         const advanceRes = await fetch(`/api/Advance-Payment?purchaseNo=${pd.purchaseNo || pod.purchaseNo}`, {
// //           headers: { Authorization: `Bearer ${token}` },
// //         });
// //         const advanceData = await advanceRes.json();

// //         if (advanceData && advanceData.success && advanceData.data) {
// //           const advPayment = advanceData.data;
// //           paymentDetailsAdv = advPayment.paymentDetails || {};
// //           vendorDetailsAdv = advPayment.vendorDetails || {};
// //         }
// //       } catch (err) {
// //         console.log("No advance payment found");
// //       }

// //       setVendorNameDebit(paymentDetailsAdv.vendorNameDebit || vendorFinancial.vendorName || "");
// //       setAccountNoCredit(paymentDetailsAdv.accountNoCredit || vendorDetailsAdv.accountNo || "");
// //       setTransactionId("");
// //       setBankVendorCode(paymentDetailsAdv.bankVendorCode || vendorDetailsAdv.vendorCode || vendorFinancial.vendorCode || "");
// //       setRemarks("Balance Payment");

// //       alert(`✅ Loaded POD: ${pd.podNo || pod.podNo}\n✅ Purchase: ${pd.purchaseNo || pod.purchaseNo}\n💰 Total Amount: ₹${totalAmount.toLocaleString()}\n💵 Advance: ₹${advanceAmount.toLocaleString()}\n📊 Balance: ₹${calculatedBalance.toLocaleString()}\n📉 PO Deduction: ₹${poDeductionValue.toLocaleString()}\n🏦 POD Deduction: ₹${podDeductionValue.toLocaleString()}\n💎 Final Balance: ₹${finalBalanceValue.toLocaleString()}\n📅 Due Date: ${dueDateValue || 'N/A'}`);

// //     } else {
// //       alert(`⚠️ POD data not found for POD No: ${pod.podNo}`);
// //     }
// //   } catch (error) {
// //     console.error('Error loading POD data:', error);
// //     alert('Failed to load POD details');
// //   } finally {
// //     setLoadingData(false);
// //   }
// // };

// //   // Recalculate final balance when related fields change
// //   useEffect(() => {
// //     const amountValue = num(amount);
// //     const advanceValue = num(advance);
// //     const poAdditionValue = num(poAddition);
// //     const poDeductionValue = num(poDeduction);
// //     const podDeductionValue = num(podDeduction);

// //     const calculatedBalance = amountValue - advanceValue + num(totalAddition) - num(totalDeduction);
// //     setBalance(calculatedBalance.toFixed(2));

// //     const calculatedFinalBalance = amountValue - advanceValue - poDeductionValue - podDeductionValue + poAdditionValue;
// //     setFinalBalance(calculatedFinalBalance.toFixed(2));
// //     setFinalAmount(calculatedFinalBalance.toFixed(2));
// //   }, [amount, advance, totalAddition, totalDeduction, poAddition, poDeduction, podDeduction]);

// //   const updateOrderRow = (rowId, key, value) => {
// //     setOrderRows((prev) =>
// //       prev.map((r) => {
// //         if (r._id === rowId) {
// //           const updatedRow = { ...r, [key]: value };
// //           if (key === "weight" || key === "rate") {
// //             const weightVal = num(updatedRow.weight);
// //             const rateVal = num(updatedRow.rate);
// //             updatedRow.totalAmount = (weightVal * rateVal).toString();
// //           }
// //           return updatedRow;
// //         }
// //         return r;
// //       })
// //     );
// //   };

// //   const addOrderRow = () => {
// //     setOrderRows([...orderRows, defaultOrderRow()]);
// //   };

// //   const removeOrderRow = (rowId) => {
// //     if (orderRows.length > 1) {
// //       setOrderRows((prev) => prev.filter((r) => r._id !== rowId));
// //     }
// //   };

// //   const calculateTotalOrderAmount = () => {
// //     return orderRows.reduce((sum, row) => sum + num(row.totalAmount), 0);
// //   };

// //   const handleSave = async () => {
// //     if (!podNo) {
// //       alert("Please select a POD No");
// //       return;
// //     }

// //     setSaving(true);
// //     try {
// //       const token = localStorage.getItem('token');
// //       const payload = {
// //         branch,
// //         date,
// //         vendorName,
// //         podNo,
// //         purchaseNo,
// //         orderRows,
// //         vendorStatus,
// //         vendorCode,
// //         vendorNamePayment,
// //         vehicleNo,
// //         purchaseType,
// //         rateType,
// //         rate: num(rate),
// //         weight: num(weight),
// //         amount: num(amount),
// //         advance: num(advance),
// //         totalAddition: num(totalAddition),
// //         totalDeduction: num(totalDeduction),
// //         poAddition: num(poAddition),
// //         poDeduction: num(poDeduction),
// //         podDeduction: num(podDeduction),
// //         finalBalance: num(finalBalance),
// //         dueDate: dueDate,
// //         vendorNameDebit,
// //         accountNoCredit,
// //         finalAmount: num(finalAmount),
// //         remarks,
// //         transactionId,
// //         bankVendorCode,
// //         paymentStatus,
// //         paymentDate: new Date().toISOString().split('T')[0]
// //       };

// //       console.log("Saving payload:", payload);

// //       const res = await fetch('/api/balance-payment', {
// //         method: 'POST',
// //         headers: {
// //           'Content-Type': 'application/json',
// //           Authorization: `Bearer ${token}`,
// //         },
// //         body: JSON.stringify(payload),
// //       });

// //       const data = await res.json();

// //       if (data.success) {
// //         alert(`✅ Balance Payment saved successfully!\nPayment No: ${data.data.balancePaymentNo}`);
// //         router.push('/admin/Balance-Payment');
// //       } else {
// //         alert(data.message || 'Failed to save balance payment');
// //       }
// //     } catch (error) {
// //       console.error('Error saving:', error);
// //       alert(`❌ Error: ${error.message}`);
// //     } finally {
// //       setSaving(false);
// //     }
// //   };

// //   const resetForm = () => {
// //     setBranch("");
// //     setDate(new Date().toISOString().split('T')[0]);
// //     setVendorName("");
// //     setPodNo("");
// //     setPurchaseNo("");
// //     setOrderRows([defaultOrderRow()]);
// //     setVendorStatus("Active");
// //     setVendorCode("");
// //     setVendorNamePayment("");
// //     setVehicleNo("");
// //     setPurchaseType("Loading & Unloading");
// //     setRateType("Per MT");
// //     setRate("");
// //     setWeight("");
// //     setAmount("");
// //     setAdvance("");
// //     setTotalAddition("");
// //     setTotalDeduction("");
// //     setBalance("");
// //     setPoAddition("");
// //     setPoDeduction("");
// //     setPodDeduction("");
// //     setFinalBalance("");
// //     setDueDate("");
// //     setVendorNameDebit("");
// //     setAccountNoCredit("");
// //     setFinalAmount("");
// //     setRemarks("Balance Payment");
// //     setTransactionId("");
// //     setBankVendorCode("");
// //     setPaymentStatus("Pending");
// //   };

// //   return (
// //     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
// //       <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
// //         <div className="mx-auto max-w-full px-4 py-3 flex items-center justify-between">
// //           <div>
// //             <div className="flex items-center gap-3">
// //               <button onClick={() => router.push('/admin/Balance-Payment')} className="text-emerald-600 hover:text-emerald-800 font-medium text-sm flex items-center gap-1">
// //                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
// //                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
// //                 </svg>
// //                 Back to List
// //               </button>
// //               <div className="text-lg font-extrabold text-slate-900">Create Balance Payment</div>
// //             </div>
// //           </div>
// //           <div className="flex items-center gap-3">
// //             <button onClick={resetForm} className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">Reset</button>
// //             <button onClick={handleSave} disabled={saving} className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
// //               {saving ? 'Saving...' : 'Save Payment'}
// //             </button>
// //           </div>
// //         </div>
// //       </div>

// //       <div className="mx-auto max-w-full p-4">
// //         {/* Balance Payment Number - Auto Generated */}
// //         <Card title="Balance Payment Information">
// //           <div className="grid grid-cols-12 gap-4">
// //             <div className="col-span-12 md:col-span-3">
// //               <label className="text-xs font-bold text-slate-600">Balance Payment No</label>
// //               <input type="text" value={balancePaymentNo} readOnly className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700" />
// //               <p className="text-xs text-slate-400 mt-1">Auto-generated</p>
// //             </div>
// //             <div className="col-span-12 md:col-span-9">
// //               <label className="text-xs font-bold text-slate-600">Select POD No *</label>
// //               <PODDropdown onSelect={handlePODSelect} selectedPodNo={podNo} />
// //               <p className="text-xs text-slate-400 mt-1">Select a POD to auto-fill all details</p>
// //             </div>
// //           </div>
// //           {loadingData && (
// //             <div className="mt-3 p-3 bg-emerald-50 rounded-lg text-emerald-600 text-sm">
// //               <svg className="animate-spin h-4 w-4 inline mr-2" viewBox="0 0 24 24">
// //                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
// //                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
// //               </svg>
// //               Loading details...
// //             </div>
// //           )}
// //         </Card>

// //         {/* Basic Information - READ ONLY */}
// //         <Card title="Basic Information">
// //           <div className="grid grid-cols-12 gap-4">
// //             <div className="col-span-12 md:col-span-3">
// //               <label className="text-xs font-bold text-slate-600">Branch</label>
// //               <input type="text" value={branch} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
// //             </div>
// //             <div className="col-span-12 md:col-span-3">
// //               <label className="text-xs font-bold text-slate-600">Date</label>
// //               <input type="date" value={date} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
// //             </div>
// //             <div className="col-span-12 md:col-span-3">
// //               <label className="text-xs font-bold text-slate-600">Vendor Name</label>
// //               <input type="text" value={vendorName} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
// //             </div>
// //             <div className="col-span-12 md:col-span-3">
// //               <label className="text-xs font-bold text-slate-600">Purchase No</label>
// //               <input type="text" value={purchaseNo} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
// //             </div>
// //           </div>
// //         </Card>

// //         {/* Orders Table - READ ONLY */}
// //         <Card title="Order Details">
// //           <div className="overflow-auto rounded-xl border border-slate-200">
// //             <table className="min-w-max w-full text-sm">
// //              <thead className="bg-slate-100">
// //   <tr>
// //     <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Order No</th>
// //     <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Party Name</th>
// //     <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Plant Code</th>
// //     <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Order Type</th>
// //     <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Pin Code</th>
// //     <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">State</th>
// //     <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">From State</th> {/* ✅ ADDED */}
// //     <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Local/Not Local</th> {/* ✅ ADDED */}
// //     <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">District</th>
// //     <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">From</th>
// //     <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">To</th>
// //     <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Location Rate</th>
// //     <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Weight</th>
// //     <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Rate</th>
// //     <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Total Amount</th>
// //     <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Actions</th>
// //   </tr>
// // </thead>
// //             <tbody>
// //   {orderRows.map((row) => {
// //     // Determine local status
// //     const isLocal = row.fromState && row.state && 
// //       row.fromState.trim().toUpperCase() === row.state.trim().toUpperCase();

// //     return (
// //       <tr key={row._id} className="hover:bg-slate-50">
// //         <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.orderNo} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
// //         <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.partyName} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
// //         <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.plantCode} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
// //         <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.orderType} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
// //         <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.pinCode} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
// //         <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.state} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
// //         <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.fromState} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td> {/* ✅ ADDED */}
// //         <td className="border border-slate-200 px-2 py-1 text-center">
// //           {row.fromState && row.state ? (
// //             <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
// //               isLocal
// //                 ? 'bg-green-100 text-green-800 border border-green-300'
// //                 : 'bg-red-100 text-red-800 border border-red-300'
// //             }`}>
// //               {isLocal ? '✅ Local' : '❌ Not Local'}
// //             </span>
// //           ) : (
// //             <span className="text-xs text-gray-400">-</span>
// //           )}
// //         </td> {/* ✅ ADDED */}
// //         <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.district} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
// //         <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.from} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
// //         <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.to} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
// //         <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.locationRate} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
// //         <td className="border border-slate-200 px-2 py-1"><input type="number" value={row.weight} readOnly className="w-20 px-2 py-1 border rounded bg-gray-100" /></td>
// //         <td className="border border-slate-200 px-2 py-1"><input type="number" value={row.rate} readOnly className="w-20 px-2 py-1 border rounded bg-gray-100" /></td>
// //         <td className="border border-slate-200 px-2 py-1"><input type="number" value={row.totalAmount} readOnly className="w-24 px-2 py-1 bg-gray-100 rounded font-bold text-emerald-700" /></td>
// //         <td className="border border-slate-200 px-2 py-1 text-center">
// //           <button onClick={() => removeOrderRow(row._id)} className="text-red-600 hover:text-red-800">✕</button>
// //         </td>
// //       </tr>
// //     );
// //   })}
// // </tbody>
// //               <tfoot className="bg-slate-100">
// //                 <tr>
// //                   <td colSpan="14" className="border border-slate-200 px-3 py-2 text-right font-bold">Total Order Amount:</td>
// //                   <td className="border border-slate-200 px-3 py-2 font-bold text-emerald-800">
// //                     ₹{calculateTotalOrderAmount().toLocaleString()}
// //                   </td>
// //                 </tr>
// //               </tfoot>
// //             </table>
// //           </div>
// //         </Card>

// //         {/* Balance Payment Panel */}
// //         <Card title="Balance Payment - Panel">
// //           <div className="grid grid-cols-12 gap-4 mb-4">
// //             <div className="col-span-12 md:col-span-2">
// //               <label className="text-xs font-bold text-slate-600">Vendor Status</label>
// //               <input type="text" value={vendorStatus} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
// //             </div>
// //             <div className="col-span-12 md:col-span-2">
// //               <label className="text-xs font-bold text-slate-600">Vendor Code</label>
// //               <input type="text" value={vendorCode} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
// //             </div>
// //             <div className="col-span-12 md:col-span-3">
// //               <label className="text-xs font-bold text-slate-600">Vendor Name</label>
// //               <input type="text" value={vendorNamePayment} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
// //             </div>
// //             <div className="col-span-12 md:col-span-2">
// //               <label className="text-xs font-bold text-slate-600">Vehicle No</label>
// //               <input type="text" value={vehicleNo} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
// //             </div>
// //             <div className="col-span-12 md:col-span-3">
// //               <label className="text-xs font-bold text-slate-600">Purchase - Type</label>
// //               <input type="text" value={purchaseType} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
// //             </div>
// //           </div>

// //           <div className="grid grid-cols-12 gap-4 mb-4">
// //             <div className="col-span-12 md:col-span-2">
// //               <label className="text-xs font-bold text-slate-600">Rate - Type</label>
// //               <input type="text" value={rateType} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
// //             </div>
// //             <div className="col-span-12 md:col-span-2">
// //               <label className="text-xs font-bold text-slate-600">Rate (₹)</label>
// //               <input type="text" value={rate} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm text-right cursor-not-allowed" />
// //             </div>
// //             <div className="col-span-12 md:col-span-2">
// //               <label className="text-xs font-bold text-slate-600">Weight (MT)</label>
// //               <input type="text" value={weight} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm text-right cursor-not-allowed" />
// //             </div>
// //             <div className="col-span-12 md:col-span-3">
// //               <label className="text-xs font-bold text-slate-600">Amount (A x B)</label>
// //               <input type="text" value={`₹${num(amount).toLocaleString()}`} readOnly className="mt-1 w-full rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-bold text-purple-700 cursor-not-allowed" />
// //             </div>
// //             <div className="col-span-12 md:col-span-3">
// //               <label className="text-xs font-bold text-slate-600">Advance</label>
// //               <input type="text" value={advance} onChange={(e) => setAdvance(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500" />
// //               <p className="text-xs text-blue-500 mt-1">Editable</p>
// //             </div>
// //           </div>

// //           <div className="grid grid-cols-12 gap-4">
// //             <div className="col-span-12 md:col-span-4">
// //               <label className="text-xs font-bold text-slate-600">Total - Addition</label>
// //               <input type="number" value={totalAddition} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
// //             </div>
// //             <div className="col-span-12 md:col-span-4">
// //               <label className="text-xs font-bold text-slate-600">Total - Deduction</label>
// //               <input type="number" value={totalDeduction} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
// //             </div>
// //             <div className="col-span-12 md:col-span-4">
// //               <label className="text-xs font-bold text-slate-600">Balance</label>
// //               <input type="text" value={`₹${num(balance).toLocaleString()}`} readOnly className="mt-1 w-full rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-bold text-purple-700 cursor-not-allowed" />
// //             </div>
// //           </div>
// //         </Card>

// //         {/* Financial Summary Section - Editable */}
// //         <Card title="Financial Summary">
// //           <div className="grid grid-cols-12 gap-4">
// //             <div className="col-span-12 md:col-span-3">
// //               <label className="text-xs font-bold text-slate-600">PO - Addition (₹)</label>
// //               <input 
// //                 type="number" 
// //                 value={poAddition} 
// //                 onChange={(e) => setPoAddition(e.target.value)} 
// //                 className="mt-1 w-full rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm focus:border-emerald-500"
// //                 placeholder="PO Addition"
// //               />
// //             </div>
// //             <div className="col-span-12 md:col-span-3">
// //               <label className="text-xs font-bold text-slate-600">PO - Deduction (₹)</label>
// //               <input 
// //                 type="number" 
// //                 value={poDeduction} 
// //                 onChange={(e) => setPoDeduction(e.target.value)} 
// //                 className="mt-1 w-full rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm focus:border-emerald-500"
// //                 placeholder="PO Deduction"
// //               />
// //             </div>
// //             <div className="col-span-12 md:col-span-3">
// //               <label className="text-xs font-bold text-slate-600">POD - Deduction (₹)</label>
// //               <input 
// //                 type="number" 
// //                 value={podDeduction} 
// //                 onChange={(e) => setPodDeduction(e.target.value)} 
// //                 className="mt-1 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm focus:border-emerald-500"
// //                 placeholder="POD Deduction"
// //               />
// //             </div>
// //             <div className="col-span-12 md:col-span-3">
// //               <label className="text-xs font-bold text-slate-600">Due Date</label>
// //               <input 
// //                 type="date" 
// //                 value={dueDate} 
// //                 onChange={(e) => setDueDate(e.target.value)} 
// //                 className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500"
// //               />
// //             </div>
// //           </div>
// //         </Card>

// //         {/* Payment Transaction Details */}
// //         <Card title="Payment Transaction Details">
// //           <div className="grid grid-cols-12 gap-4 mb-4">
// //             <div className="col-span-12 md:col-span-3">
// //               <label className="text-xs font-bold text-slate-600">Vendor Name (Debit)</label>
// //               <input type="text" value={vendorNameDebit} onChange={(e) => setVendorNameDebit(e.target.value)} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
// //             </div>
// //             <div className="col-span-12 md:col-span-3">
// //               <label className="text-xs font-bold text-slate-600">Account No (Credit)</label>
// //               <input type="text" value={accountNoCredit} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
// //             </div>
// //             <div className="col-span-12 md:col-span-3">
// //               <label className="text-xs font-bold text-slate-600">Final Amount</label>
// //               <input type="number" value={finalAmount} onChange={(e) => setFinalAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-emerald-700 focus:border-emerald-500" />
// //               <p className="text-xs text-blue-500 mt-1">Editable</p>
// //             </div>
// //             <div className="col-span-12 md:col-span-3">
// //               <label className="text-xs font-bold text-slate-600">Remarks</label>
// //               <input type="text" value={remarks} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
// //             </div>
// //           </div>

// //           <div className="grid grid-cols-12 gap-4">
// //             <div className="col-span-12 md:col-span-4">
// //               <label className="text-xs font-bold text-slate-600">Transaction ID</label>
// //               <input type="text" value={transactionId} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
// //             </div>
// //             <div className="col-span-12 md:col-span-4">
// //               <label className="text-xs font-bold text-slate-600">Bank Vendor Code</label>
// //               <input type="text" value={bankVendorCode} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
// //             </div>
// //             <div className="col-span-12 md:col-span-4">
// //               <label className="text-xs font-bold text-slate-600">Payment Status</label>
// //               <select value={paymentStatus} disabled className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed">
// //                 <option value="Pending">Pending</option>
// //                 <option value="Queued">Queued</option>
// //                 <option value="Completed">Completed</option>
// //                 <option value="Paid">Paid</option>
// //               </select>
// //             </div>
// //           </div>
// //         </Card>

// //         {/* Summary Table as per Image */}
// //         <div className="overflow-hidden rounded-xl border border-slate-200 mb-4">
// //           <div className="grid grid-cols-5 bg-slate-100 border-b border-slate-200">
// //             <div className="px-4 py-3 text-center">
// //               <div className="text-xs font-bold text-slate-600">Total Amount</div>
// //             </div>
// //             <div className="px-4 py-3 text-center">
// //               <div className="text-xs font-bold text-slate-600">Advance</div>
// //             </div>
// //             <div className="px-4 py-3 text-center">
// //               <div className="text-xs font-bold text-slate-600">Total - Addition</div>
// //             </div>
// //             <div className="px-4 py-3 text-center">
// //               <div className="text-xs font-bold text-slate-600">Total - Deduction</div>
// //             </div>
// //             <div className="px-4 py-3 text-center">
// //               <div className="text-xs font-bold text-slate-600">Balance</div>
// //             </div>
// //           </div>
// //           <div className="grid grid-cols-5 bg-white">
// //             <div className="px-4 py-4 text-center border-r border-slate-200">
// //               <div className="text-xl font-bold text-emerald-700">₹{num(amount).toLocaleString()}</div>
// //             </div>
// //             <div className="px-4 py-4 text-center border-r border-slate-200">
// //               <div className="text-xl font-bold text-blue-700">₹{num(advance).toLocaleString()}</div>
// //             </div>
// //             <div className="px-4 py-4 text-center border-r border-slate-200">
// //               <div className="text-xl font-bold text-orange-600">₹{num(totalAddition).toLocaleString()}</div>
// //             </div>
// //             <div className="px-4 py-4 text-center border-r border-slate-200">
// //               <div className="text-xl font-bold text-red-600">₹{num(totalDeduction).toLocaleString()}</div>
// //             </div>
// //             <div className="px-4 py-4 text-center">
// //               <div className="text-xl font-bold text-purple-700">₹{num(balance).toLocaleString()}</div>
// //             </div>
// //           </div>
// //         </div>

// //         {/* Balance Breakdown Table as per Image */}
// //         <div className="overflow-hidden rounded-xl border border-slate-200 mb-4">
// //           <div className="grid grid-cols-4 bg-slate-100 border-b border-slate-200">
// //             <div className="px-4 py-3 text-center">
// //               <div className="text-xs font-bold text-slate-600">Balance to be Paid</div>
// //             </div>
// //             <div className="px-4 py-3 text-center">
// //               <div className="text-xs font-bold text-slate-600">PO - Addition</div>
// //             </div>
// //             <div className="px-4 py-3 text-center">
// //               <div className="text-xs font-bold text-slate-600">PO - Deduction</div>
// //             </div>
// //             <div className="px-4 py-3 text-center">
// //               <div className="text-xs font-bold text-slate-600">Final - Balance</div>
// //             </div>
// //           </div>
// //           <div className="grid grid-cols-4 bg-white">
// //             <div className="px-4 py-4 text-center border-r border-slate-200">
// //               <div className="text-xl font-bold text-emerald-700">₹{num(balance).toLocaleString()}</div>
// //             </div>
// //             <div className="px-4 py-4 text-center border-r border-slate-200">
// //               <div className="text-xl font-bold text-orange-600">₹{num(poAddition).toLocaleString()}</div>
// //             </div>
// //             <div className="px-4 py-4 text-center border-r border-slate-200">
// //               <div className="text-xl font-bold text-red-600">₹{num(poDeduction).toLocaleString()}</div>
// //             </div>
// //             <div className="px-4 py-4 text-center">
// //               <div className="text-xl font-bold text-purple-700">₹{num(finalBalance).toLocaleString()}</div>
// //             </div>
// //           </div>
// //         </div>

// //       </div>
// //     </div>
// //   );
// // }

// "use client";

// import { useState, useEffect, useRef } from "react";
// import { useRouter } from "next/navigation";

// function uid() {
//   return Math.random().toString(36).slice(2, 10);
// }

// function num(v) {
//   const n = Number(v);
//   return Number.isFinite(n) ? n : 0;
// }

// function Card({ title, children }) {
//   return (
//     <div className="rounded-2xl border border-slate-200 bg-white shadow-sm mb-4">
//       <div className="border-b border-slate-100 px-4 py-3">
//         <div className="text-sm font-extrabold text-slate-900">{title}</div>
//       </div>
//       <div className="p-4">{children}</div>
//     </div>
//   );
// }

// // POD Dropdown Component
// function PODDropdown({ onSelect, selectedPodNo }) {
//   const [searchQuery, setSearchQuery] = useState(selectedPodNo || "");
//   const [showDropdown, setShowDropdown] = useState(false);
//   const [podList, setPodList] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const inputRef = useRef(null);
//   const dropdownRef = useRef(null);
//   const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

//   useEffect(() => {
//     fetchPODs();
//   }, []);

//   const fetchPODs = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/balance-payment/pod-lookup?format=table', {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (data.success) {
//         setPodList(data.data || []);
//       }
//     } catch (error) {
//       console.error('Error fetching PODs:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const filteredPODs = podList.filter(pod =>
//     pod.podNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//     pod.purchaseNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//     pod.vendorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//     pod.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
//   );

//   const handleSelect = (pod) => {
//     setSearchQuery(pod.podNo);
//     setShowDropdown(false);
//     onSelect(pod);
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
//   };

//   const handleInputBlur = () => {
//     setTimeout(() => setShowDropdown(false), 200);
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
//     <div className="relative w-full">
//       <input
//         ref={inputRef}
//         type="text"
//         value={searchQuery}
//         onChange={(e) => setSearchQuery(e.target.value)}
//         onFocus={handleInputFocus}
//         onBlur={handleInputBlur}
//         className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
//         placeholder="Search POD No, Purchase No, Vendor, or Company..."
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
//             maxHeight: '300px'
//           }}
//           className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-y-auto"
//         >
//           {loading ? (
//             <div className="p-4 text-center text-sm text-slate-500">Loading...</div>
//           ) : filteredPODs.length > 0 ? (
//             <div className="divide-y divide-slate-100">
//               {filteredPODs.map(pod => (
//                 <div
//                   key={pod._id}
//                   onMouseDown={() => handleSelect(pod)}
//                   className="p-3 hover:bg-emerald-50 cursor-pointer"
//                 >
//                   <div className="font-medium text-slate-800">{pod.podNo}</div>
//                   <div className="text-xs text-slate-500">Purchase: {pod.purchaseNo} | Vendor: {pod.vendorName}</div>
//                   <div className="text-xs text-slate-500">Company: {pod.companyName || 'N/A'}</div>
//                   <div className="text-xs text-slate-400">Total: ₹{pod.totalAmount?.toLocaleString()} | Balance: ₹{pod.finalBalance?.toLocaleString()}</div>
//                 </div>
//               ))}
//             </div>
//           ) : (
//             <div className="p-4 text-center text-sm text-slate-500">No PODs found</div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// export default function CreateBalancePayment() {
//   const router = useRouter();
//   const [saving, setSaving] = useState(false);
//   const [loadingData, setLoadingData] = useState(false);

//   // Auto-generated payment number
//   const [balancePaymentNo, setBalancePaymentNo] = useState("");

//   // Basic Info
//   const [branch, setBranch] = useState("");
//   const [branchCode, setBranchCode] = useState("");
//   const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
//   const [vendorName, setVendorName] = useState("");
//   const [podNo, setPodNo] = useState("");
//   const [purchaseNo, setPurchaseNo] = useState("");

//   // ✅ COMPANY INFO STATE
//   const [companyInfo, setCompanyInfo] = useState({
//     companyName: '',
//     companyCode: '',
//     subCompanyId: '',
//     subCompanyName: '',
//     subCompanyCode: ''
//   });

//   // Order Rows
//   const [orderRows, setOrderRows] = useState([]);

//   // Balance Payment Panel Fields
//   const [vendorStatus, setVendorStatus] = useState("Active");
//   const [vendorCode, setVendorCode] = useState("");
//   const [vendorNamePayment, setVendorNamePayment] = useState("");
//   const [vehicleNo, setVehicleNo] = useState("");
//   const [purchaseType, setPurchaseType] = useState("Loading & Unloading");
//   const [rateType, setRateType] = useState("Per MT");
//   const [rate, setRate] = useState("");
//   const [weight, setWeight] = useState("");
//   const [amount, setAmount] = useState("");
//   const [advance, setAdvance] = useState("");
//   const [totalAddition, setTotalAddition] = useState("");
//   const [totalDeduction, setTotalDeduction] = useState("");
//   const [balance, setBalance] = useState("");

//   // Financial Summary Fields
//   const [poAddition, setPoAddition] = useState("");
//   const [poDeduction, setPoDeduction] = useState("");
//   const [podDeduction, setPodDeduction] = useState("");
//   const [finalBalance, setFinalBalance] = useState("");
//   const [dueDate, setDueDate] = useState("");

//   // Payment Transaction Details
//   const [vendorNameDebit, setVendorNameDebit] = useState("");
//   const [accountNoCredit, setAccountNoCredit] = useState("");
//   const [finalAmount, setFinalAmount] = useState("");
//   const [remarks, setRemarks] = useState("Balance Payment");
//   const [transactionId, setTransactionId] = useState("");
//   const [bankVendorCode, setBankVendorCode] = useState("");
//   const [paymentStatus, setPaymentStatus] = useState("Pending");

//   const defaultOrderRow = () => ({
//     _id: uid(),
//     orderNo: "",
//     partyName: "",
//     plantCode: "",
//     orderType: "",
//     pinCode: "",
//     state: "",
//     stateName: "",
//     fromState: "",
//     district: "",
//     from: "",
//     fromName: "",
//     to: "",
//     toName: "",
//     locationRate: "",
//     priceList: "",
//     weight: "",
//     rate: "",
//     totalAmount: "",
//     localStatus: "unknown",
//     localStatusLabel: "Unknown"
//   });

//   useEffect(() => {
//     fetchAutoPaymentNumber();
//     setOrderRows([defaultOrderRow()]);
//   }, []);

//   const fetchAutoPaymentNumber = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/balance-payment/generate-number', {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       const data = await res.json();
//       if (data.success) {
//         setBalancePaymentNo(data.paymentNo);
//       }
//     } catch (error) {
//       console.error('Error fetching payment number:', error);
//     }
//   };

//   // Handle POD Selection - Load data from POD directly
//   const handlePODSelect = async (pod) => {
//     setLoadingData(true);
//     setPodNo(pod.podNo);
//     setPurchaseNo(pod.purchaseNo);

//     try {
//       const token = localStorage.getItem('token');

//       // Fetch full POD data
//       const podRes = await fetch(`/api/balance-payment/pod-lookup?podNo=${encodeURIComponent(pod.podNo)}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const podData = await podRes.json();

//       console.log("📦 Full POD Data:", podData);

//       if (podData.success && podData.data) {
//         const pd = podData.data;

//         // ✅ Extract company information from POD data
//         const companyName = pd.companyName || pd.header?.companyName || '';
//         const companyCode = pd.companyCode || pd.header?.companyCode || '';
//         const subCompanyId = pd.subCompanyId || pd.header?.subCompanyId || null;
//         const subCompanyName = pd.subCompanyName || pd.header?.subCompanyName || '';
//         const subCompanyCode = pd.subCompanyCode || pd.header?.subCompanyCode || '';

//         console.log('🏢 Company Info from POD:', { companyName, companyCode, subCompanyName, subCompanyCode });

//         // ✅ Set company info
//         setCompanyInfo({
//           companyName: companyName || '',
//           companyCode: companyCode || '',
//           subCompanyId: subCompanyId || null,
//           subCompanyName: subCompanyName || '',
//           subCompanyCode: subCompanyCode || ''
//         });

//         // Extract data from POD structure
//         const headerData = pd.header || {};
//         const vendorFinancial = pd.vendorFinancial || {};
//         const purchaseOrders = pd.purchaseOrders || [];
//         const firstOrder = purchaseOrders[0] || {};
//         const podStatusSection = pd.podStatusSection || {};

//         // Basic Info
//         setBranch(headerData.branch || headerData.branchName || "");
//         setBranchCode(headerData.branchCode || "");
//         setDate(headerData.date ? new Date(headerData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
//         setVendorName(vendorFinancial.vendorName || pod.vendorName || "");
//         setPurchaseNo(pd.purchaseNo || pod.purchaseNo || "");

//         // Purchase Details
//         setVendorStatus(vendorFinancial.vendorStatus || "Active");
//         setVendorCode(vendorFinancial.vendorCode || "");
//         setVendorNamePayment(vendorFinancial.vendorName || pod.vendorName || "");
//         setVehicleNo(firstOrder.vehicleNo || vendorFinancial.vehicleNo || "");
//         setPurchaseType(pd.purchaseType || "Loading & Unloading");
//         setRateType(pd.rateType || "Per MT");
//         setRate(vendorFinancial.rate?.toString() || firstOrder.rate?.toString() || "");
//         setWeight(firstOrder.weight?.toString() || vendorFinancial.weight?.toString() || "");

//         // Financial Values from Vendor Financial
//         const totalAmount = vendorFinancial.total || vendorFinancial.amount || 0;
//         const advanceAmount = vendorFinancial.advance || 0;
//         const totalAdditionsValue = vendorFinancial.totalAdditions || 0;
//         const totalDeductionsValue = vendorFinancial.totalDeductions || 0;
//         const poDeductionValue = vendorFinancial.poDeduction || 0;
//         const podDeductionValue = vendorFinancial.podDeduction || 0;
//         const finalBalanceValue = vendorFinancial.finalBalance || (totalAmount - advanceAmount - poDeductionValue - podDeductionValue);
//         const dueDateValue = podStatusSection.dueDate || "";

//         setAmount(totalAmount.toString());
//         setAdvance(advanceAmount.toString());
//         setTotalAddition(totalAdditionsValue.toString());
//         setTotalDeduction(totalDeductionsValue.toString());
//         setPoAddition("0");
//         setPoDeduction(poDeductionValue.toString());
//         setPodDeduction(podDeductionValue.toString());
//         setFinalBalance(finalBalanceValue.toString());
//         setDueDate(dueDateValue);

//         const calculatedBalance = totalAmount - advanceAmount;
//         setBalance(calculatedBalance.toFixed(2));
//         setFinalAmount(finalBalanceValue.toString());

//         // Set Order Rows from purchaseOrders - UPDATED with fromState
//         if (purchaseOrders.length > 0) {
//           const mappedOrders = purchaseOrders.map(order => ({
//             _id: uid(),
//             orderNo: order.orderNo || "",
//             partyName: order.partyName || "",
//             plantCode: order.plantCode || "",
//             orderType: order.orderType || "Sales",
//             pinCode: order.pinCode || "",
//             state: order.state || "",
//             stateName: order.stateName || order.state || "",
//             fromState: order.fromState || "",
//             district: order.district || "",
//             from: order.from || "",
//             fromName: order.fromName || order.from || "",
//             to: order.to || "",
//             toName: order.toName || order.to || "",
//             locationRate: order.locationRate || "",
//             priceList: order.priceList || "",
//             weight: order.weight?.toString() || "0",
//             rate: order.rate?.toString() || "0",
//             totalAmount: order.totalAmount?.toString() || ((order.weight || 0) * (order.rate || 0)).toString(),
//             localStatus: order.localStatus || "unknown",
//             localStatusLabel: order.localStatusLabel || "Unknown"
//           }));
//           setOrderRows(mappedOrders);
//         }

//         // Payee details come from the lookup endpoint (no Advance Payment permission needed).
//         // The advance's UTR and remarks are deliberately NOT copied into a Balance Payment.
//         const paymentDetailsAdv = pd.advanceBank || {};
//         const vendorDetailsAdv = {};

//         setVendorNameDebit(paymentDetailsAdv.vendorNameDebit || vendorFinancial.vendorName || "");
//         setAccountNoCredit(paymentDetailsAdv.accountNoCredit || vendorDetailsAdv.accountNo || "");
//         setTransactionId("");
//         setBankVendorCode(paymentDetailsAdv.bankVendorCode || vendorDetailsAdv.vendorCode || vendorFinancial.vendorCode || "");
//         setRemarks("Balance Payment");

//         const companyMsg = companyName ? `\n🏢 Company: ${companyName}` : '';
//         const subCompanyMsg = subCompanyName ? `\n🏢 Sub-Company: ${subCompanyName}` : '';

//         alert(`✅ Loaded POD: ${pd.podNo || pod.podNo}\n✅ Purchase: ${pd.purchaseNo || pod.purchaseNo}${companyMsg}${subCompanyMsg}\n💰 Total Amount: ₹${totalAmount.toLocaleString()}\n💵 Advance: ₹${advanceAmount.toLocaleString()}\n📊 Balance: ₹${calculatedBalance.toLocaleString()}\n📉 PO Deduction: ₹${poDeductionValue.toLocaleString()}\n🏦 POD Deduction: ₹${podDeductionValue.toLocaleString()}\n💎 Final Balance: ₹${finalBalanceValue.toLocaleString()}\n📅 Due Date: ${dueDateValue || 'N/A'}`);

//       } else {
//         alert(`⚠️ POD data not found for POD No: ${pod.podNo}`);
//       }
//     } catch (error) {
//       console.error('Error loading POD data:', error);
//       alert('Failed to load POD details');
//     } finally {
//       setLoadingData(false);
//     }
//   };

//   // Recalculate final balance when related fields change
//   useEffect(() => {
//     const amountValue = num(amount);
//     const advanceValue = num(advance);
//     const poAdditionValue = num(poAddition);
//     const poDeductionValue = num(poDeduction);
//     const podDeductionValue = num(podDeduction);

//     const calculatedBalance = amountValue - advanceValue + num(totalAddition) - num(totalDeduction);
//     setBalance(calculatedBalance.toFixed(2));

//     const calculatedFinalBalance = amountValue - advanceValue - poDeductionValue - podDeductionValue + poAdditionValue;
//     setFinalBalance(calculatedFinalBalance.toFixed(2));
//     setFinalAmount(calculatedFinalBalance.toFixed(2));
//   }, [amount, advance, totalAddition, totalDeduction, poAddition, poDeduction, podDeduction]);

//   const updateOrderRow = (rowId, key, value) => {
//     setOrderRows((prev) =>
//       prev.map((r) => {
//         if (r._id === rowId) {
//           const updatedRow = { ...r, [key]: value };
//           if (key === "weight" || key === "rate") {
//             const weightVal = num(updatedRow.weight);
//             const rateVal = num(updatedRow.rate);
//             updatedRow.totalAmount = (weightVal * rateVal).toString();
//           }
//           return updatedRow;
//         }
//         return r;
//       })
//     );
//   };

//   const addOrderRow = () => {
//     setOrderRows([...orderRows, defaultOrderRow()]);
//   };

//   const removeOrderRow = (rowId) => {
//     if (orderRows.length > 1) {
//       setOrderRows((prev) => prev.filter((r) => r._id !== rowId));
//     }
//   };

//   const calculateTotalOrderAmount = () => {
//     return orderRows.reduce((sum, row) => sum + num(row.totalAmount), 0);
//   };

//   const handleSave = async () => {
//     if (!podNo) {
//       alert("Please select a POD No");
//       return;
//     }

//     setSaving(true);
//     try {
//       const token = localStorage.getItem('token');
//       const payload = {
//         // ✅ Company info at root level
//         companyName: companyInfo.companyName || '',
//         companyCode: companyInfo.companyCode || '',
//         subCompanyId: companyInfo.subCompanyId || null,
//         subCompanyName: companyInfo.subCompanyName || '',
//         subCompanyCode: companyInfo.subCompanyCode || '',
//         // Header info
//         branch,
//         branchCode,
//         date,
//         vendorName,
//         podNo,
//         purchaseNo,
//         orderRows,
//         vendorStatus,
//         vendorCode,
//         vendorNamePayment,
//         vehicleNo,
//         purchaseType,
//         rateType,
//         rate: num(rate),
//         weight: num(weight),
//         amount: num(amount),
//         advance: num(advance),
//         totalAddition: num(totalAddition),
//         totalDeduction: num(totalDeduction),
//         poAddition: num(poAddition),
//         poDeduction: num(poDeduction),
//         podDeduction: num(podDeduction),
//         finalBalance: num(finalBalance),
//         dueDate: dueDate,
//         vendorNameDebit,
//         accountNoCredit,
//         finalAmount: num(finalAmount),
//         remarks,
//         transactionId,
//         bankVendorCode,
//         paymentStatus,
//         paymentDate: new Date().toISOString().split('T')[0]
//       };

//       console.log("Saving payload with company info:", payload);

//       const res = await fetch('/api/balance-payment', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();

//       if (data.success) {
//         alert(`✅ Balance Payment saved successfully!\nPayment No: ${data.data.balancePaymentNo}\nSub-Company: ${data.data.subCompanyName || 'N/A'}`);
//         router.push('/admin/Balance-Payment');
//       } else {
//         alert(data.message || 'Failed to save balance payment');
//       }
//     } catch (error) {
//       console.error('Error saving:', error);
//       alert(`❌ Error: ${error.message}`);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const resetForm = () => {
//     setBranch("");
//     setBranchCode("");
//     setDate(new Date().toISOString().split('T')[0]);
//     setVendorName("");
//     setPodNo("");
//     setPurchaseNo("");
//     setCompanyInfo({
//       companyName: '',
//       companyCode: '',
//       subCompanyId: '',
//       subCompanyName: '',
//       subCompanyCode: ''
//     });
//     setOrderRows([defaultOrderRow()]);
//     setVendorStatus("Active");
//     setVendorCode("");
//     setVendorNamePayment("");
//     setVehicleNo("");
//     setPurchaseType("Loading & Unloading");
//     setRateType("Per MT");
//     setRate("");
//     setWeight("");
//     setAmount("");
//     setAdvance("");
//     setTotalAddition("");
//     setTotalDeduction("");
//     setBalance("");
//     setPoAddition("");
//     setPoDeduction("");
//     setPodDeduction("");
//     setFinalBalance("");
//     setDueDate("");
//     setVendorNameDebit("");
//     setAccountNoCredit("");
//     setFinalAmount("");
//     setRemarks("Balance Payment");
//     setTransactionId("");
//     setBankVendorCode("");
//     setPaymentStatus("Pending");
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
//       <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
//         <div className="mx-auto max-w-full px-4 py-3 flex items-center justify-between">
//           <div>
//             <div className="flex items-center gap-3">
//               <button onClick={() => router.push('/admin/Balance-Payment')} className="text-emerald-600 hover:text-emerald-800 font-medium text-sm flex items-center gap-1">
//                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
//                 </svg>
//                 Back to List
//               </button>
//               <div className="text-lg font-extrabold text-slate-900">Create Balance Payment</div>
//             </div>
//             {/* ✅ Display Company Info in Top Bar */}
//             {companyInfo.companyName && (
//               <div className="text-xs text-blue-600 mt-0.5 flex items-center gap-2 flex-wrap">
//                 <span className="font-medium">🏢 {companyInfo.companyName}</span>
//                 {companyInfo.companyCode && <span>({companyInfo.companyCode})</span>}
//                 {companyInfo.subCompanyName && (
//                   <span className="text-emerald-600">| Sub: {companyInfo.subCompanyName}</span>
//                 )}
//                 {companyInfo.subCompanyCode && (
//                   <span className="text-emerald-600">({companyInfo.subCompanyCode})</span>
//                 )}
//               </div>
//             )}
//           </div>
//           <div className="flex items-center gap-3">
//             <button onClick={resetForm} className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">Reset</button>
//             <button onClick={handleSave} disabled={saving} className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
//               {saving ? 'Saving...' : 'Save Payment'}
//             </button>
//           </div>
//         </div>
//       </div>

//       <div className="mx-auto max-w-full p-4">
//         {/* Balance Payment Number - Auto Generated */}
//         <Card title="Balance Payment Information">
//           <div className="grid grid-cols-12 gap-4">
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Balance Payment No</label>
//               <input type="text" value={balancePaymentNo} readOnly className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700" />
//               <p className="text-xs text-slate-400 mt-1">Auto-generated</p>
//             </div>
//             <div className="col-span-12 md:col-span-9">
//               <label className="text-xs font-bold text-slate-600">Select POD No *</label>
//               <PODDropdown onSelect={handlePODSelect} selectedPodNo={podNo} />
//               <p className="text-xs text-slate-400 mt-1">Select a POD to auto-fill all details</p>
//             </div>
//           </div>
//           {loadingData && (
//             <div className="mt-3 p-3 bg-emerald-50 rounded-lg text-emerald-600 text-sm">
//               <svg className="animate-spin h-4 w-4 inline mr-2" viewBox="0 0 24 24">
//                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//               </svg>
//               Loading details...
//             </div>
//           )}
//         </Card>

//         {/* ==================== COMPANY INFORMATION CARD (NEW) ==================== */}
//         <Card title="Company Information">
//           <div className="grid grid-cols-12 gap-3">


//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Sub-Company Name</label>
//               <input
//                 type="text"
//                 value={companyInfo.subCompanyName || '-'}
//                 readOnly
//                 className="mt-1 w-full rounded-xl border border-slate-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
//               />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Sub-Company Code</label>
//               <input
//                 type="text"
//                 value={companyInfo.subCompanyCode || '-'}
//                 readOnly
//                 className="mt-1 w-full rounded-xl border border-slate-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
//               />
//             </div>

//           </div>
//           <p className="text-xs text-slate-400 mt-2">Company information is auto-loaded from the selected POD</p>
//         </Card>

//         {/* Basic Information - READ ONLY */}
//         <Card title="Basic Information">
//           <div className="grid grid-cols-12 gap-4">
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Branch</label>
//               <input type="text" value={branch} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Branch Code</label>
//               <input type="text" value={branchCode} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Date</label>
//               <input type="date" value={date} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Vendor Name</label>
//               <input type="text" value={vendorName} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Purchase No</label>
//               <input type="text" value={purchaseNo} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//           </div>
//         </Card>

//         {/* Orders Table - READ ONLY */}
//         <Card title="Order Details">
//           <div className="overflow-auto rounded-xl border border-slate-200">
//             <table className="min-w-max w-full text-sm">
//               <thead className="bg-slate-100">
//                 <tr>
//                   <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Order No</th>
//                   <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Party Name</th>
//                   <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Plant Code</th>
//                   <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Order Type</th>
//                   <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Pin Code</th>
//                   <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">State</th>
//                   <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">From State</th>
//                   <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Local/Not Local</th>
//                   <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">District</th>
//                   <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">From</th>
//                   <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">To</th>
//                   <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Location Rate</th>
//                   <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Weight</th>
//                   <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Rate</th>
//                   <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Total Amount</th>
//                   <th className="border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {orderRows.map((row) => {
//                   const isLocal = row.fromState && row.state &&
//                     row.fromState.trim().toUpperCase() === row.state.trim().toUpperCase();

//                   return (
//                     <tr key={row._id} className="hover:bg-slate-50">
//                       <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.orderNo} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
//                       <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.partyName} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
//                       <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.plantCode} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
//                       <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.orderType} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
//                       <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.pinCode} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
//                       <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.state} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
//                       <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.fromState} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
//                       <td className="border border-slate-200 px-2 py-1 text-center">
//                         {row.fromState && row.state ? (
//                           <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${isLocal
//                             ? 'bg-green-100 text-green-800 border border-green-300'
//                             : 'bg-red-100 text-red-800 border border-red-300'
//                             }`}>
//                             {isLocal ? '✅ Local' : '❌ Not Local'}
//                           </span>
//                         ) : (
//                           <span className="text-xs text-gray-400">-</span>
//                         )}
//                       </td>
//                       <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.district} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
//                       <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.from} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
//                       <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.to} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
//                       <td className="border border-slate-200 px-2 py-1"><input type="text" value={row.locationRate} readOnly className="w-full px-2 py-1 border rounded bg-gray-100" /></td>
//                       <td className="border border-slate-200 px-2 py-1"><input type="number" value={row.weight} readOnly className="w-20 px-2 py-1 border rounded bg-gray-100" /></td>
//                       <td className="border border-slate-200 px-2 py-1"><input type="number" value={row.rate} readOnly className="w-20 px-2 py-1 border rounded bg-gray-100" /></td>
//                       <td className="border border-slate-200 px-2 py-1"><input type="number" value={row.totalAmount} readOnly className="w-24 px-2 py-1 bg-gray-100 rounded font-bold text-emerald-700" /></td>
//                       <td className="border border-slate-200 px-2 py-1 text-center">
//                         <button onClick={() => removeOrderRow(row._id)} className="text-red-600 hover:text-red-800">✕</button>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//               <tfoot className="bg-slate-100">
//                 <tr>
//                   <td colSpan="14" className="border border-slate-200 px-3 py-2 text-right font-bold">Total Order Amount:</td>
//                   <td className="border border-slate-200 px-3 py-2 font-bold text-emerald-800">
//                     ₹{calculateTotalOrderAmount().toLocaleString()}
//                   </td>
//                 </tr>
//               </tfoot>
//             </table>
//           </div>
//         </Card>

//         {/* Balance Payment Panel */}
//         <Card title="Balance Payment - Panel">
//           <div className="grid grid-cols-12 gap-4 mb-4">
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Vendor Status</label>
//               <input type="text" value={vendorStatus} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Vendor Code</label>
//               <input type="text" value={vendorCode} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Vendor Name</label>
//               <input type="text" value={vendorNamePayment} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Vehicle No</label>
//               <input type="text" value={vehicleNo} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Purchase - Type</label>
//               <input type="text" value={purchaseType} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//           </div>

//           <div className="grid grid-cols-12 gap-4 mb-4">
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Rate - Type</label>
//               <input type="text" value={rateType} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Rate (₹)</label>
//               <input type="text" value={rate} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm text-right cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Weight (MT)</label>
//               <input type="text" value={weight} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm text-right cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Amount (A x B)</label>
//               <input type="text" value={`₹${num(amount).toLocaleString()}`} readOnly className="mt-1 w-full rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-bold text-purple-700 cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Advance</label>
//               <input type="text" value={advance} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//               <p className="text-xs text-slate-400 mt-1">Paid advances only (from POD)</p>
//             </div>
//           </div>

//           <div className="grid grid-cols-12 gap-4">
//             <div className="col-span-12 md:col-span-4">
//               <label className="text-xs font-bold text-slate-600">Total - Addition</label>
//               <input type="number" value={totalAddition} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-4">
//               <label className="text-xs font-bold text-slate-600">Total - Deduction</label>
//               <input type="number" value={totalDeduction} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-4">
//               <label className="text-xs font-bold text-slate-600">Balance</label>
//               <input type="text" value={`₹${num(balance).toLocaleString()}`} readOnly className="mt-1 w-full rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-bold text-purple-700 cursor-not-allowed" />
//             </div>
//           </div>
//         </Card>

//         {/* Financial Summary Section - Editable */}
//         <Card title="Financial Summary">
//           <div className="grid grid-cols-12 gap-4">
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">PO - Addition (₹)</label>
//               <input
//                 type="number"
//                 value={poAddition}
//                 readOnly
//                 className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed"
//                 placeholder="PO Addition"
//               />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">PO - Deduction (₹)</label>
//               <input
//                 type="number"
//                 value={poDeduction}
//                 readOnly
//                 className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed"
//                 placeholder="PO Deduction"
//               />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">POD - Deduction (₹)</label>
//               <input
//                 type="number"
//                 value={podDeduction}
//                 readOnly
//                 className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed"
//                 placeholder="POD Deduction"
//               />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Due Date</label>
//               <input
//                 type="date"
//                 value={dueDate}
//                 onChange={(e) => setDueDate(e.target.value)}
//                 className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500"
//               />
//             </div>
//           </div>
//         </Card>

//         {/* Payment Transaction Details */}
//         <Card title="Payment Transaction Details">
//           <div className="grid grid-cols-12 gap-4 mb-4">
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Vendor Name (Debit)</label>
//               <input type="text" value={vendorNameDebit} onChange={(e) => setVendorNameDebit(e.target.value)} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Account No (Credit)</label>
//               <input type="text" value={accountNoCredit} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Final Amount</label>
//               <input type="number" value={finalAmount} onChange={(e) => setFinalAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-emerald-700 focus:border-emerald-500" />
//               <p className="text-xs text-blue-500 mt-1">Editable</p>
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Remarks</label>
//               <input type="text" value={remarks} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//           </div>

//           <div className="grid grid-cols-12 gap-4">
//             <div className="col-span-12 md:col-span-4">
//               <label className="text-xs font-bold text-slate-600">Transaction ID</label>
//               <input type="text" value={transactionId} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-4">
//               <label className="text-xs font-bold text-slate-600">Bank Vendor Code</label>
//               <input type="text" value={bankVendorCode} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-4">
//               <label className="text-xs font-bold text-slate-600">Payment Status</label>
//               <select value={paymentStatus} disabled className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed">
//                 <option value="Pending">Pending</option>
//                 <option value="Queued">Queued</option>
//                 <option value="Completed">Completed</option>
//                 <option value="Paid">Paid</option>
//               </select>
//             </div>
//           </div>
//         </Card>

//         {/* Summary Table */}
//         <div className="overflow-hidden rounded-xl border border-slate-200 mb-4">
//           <div className="grid grid-cols-5 bg-slate-100 border-b border-slate-200">
//             <div className="px-4 py-3 text-center">
//               <div className="text-xs font-bold text-slate-600">Total Amount</div>
//             </div>
//             <div className="px-4 py-3 text-center">
//               <div className="text-xs font-bold text-slate-600">Advance</div>
//             </div>
//             <div className="px-4 py-3 text-center">
//               <div className="text-xs font-bold text-slate-600">Total - Addition</div>
//             </div>
//             <div className="px-4 py-3 text-center">
//               <div className="text-xs font-bold text-slate-600">Total - Deduction</div>
//             </div>
//             <div className="px-4 py-3 text-center">
//               <div className="text-xs font-bold text-slate-600">Balance</div>
//             </div>
//           </div>
//           <div className="grid grid-cols-5 bg-white">
//             <div className="px-4 py-4 text-center border-r border-slate-200">
//               <div className="text-xl font-bold text-emerald-700">₹{num(amount).toLocaleString()}</div>
//             </div>
//             <div className="px-4 py-4 text-center border-r border-slate-200">
//               <div className="text-xl font-bold text-blue-700">₹{num(advance).toLocaleString()}</div>
//             </div>
//             <div className="px-4 py-4 text-center border-r border-slate-200">
//               <div className="text-xl font-bold text-orange-600">₹{num(totalAddition).toLocaleString()}</div>
//             </div>
//             <div className="px-4 py-4 text-center border-r border-slate-200">
//               <div className="text-xl font-bold text-red-600">₹{num(totalDeduction).toLocaleString()}</div>
//             </div>
//             <div className="px-4 py-4 text-center">
//               <div className="text-xl font-bold text-purple-700">₹{num(balance).toLocaleString()}</div>
//             </div>
//           </div>
//         </div>

//         {/* Balance Breakdown Table */}
//         <div className="overflow-hidden rounded-xl border border-slate-200 mb-4">
//           <div className="grid grid-cols-4 bg-slate-100 border-b border-slate-200">
//             <div className="px-4 py-3 text-center">
//               <div className="text-xs font-bold text-slate-600">Balance to be Paid</div>
//             </div>
//             <div className="px-4 py-3 text-center">
//               <div className="text-xs font-bold text-slate-600">PO - Addition</div>
//             </div>
//             <div className="px-4 py-3 text-center">
//               <div className="text-xs font-bold text-slate-600">PO - Deduction</div>
//             </div>
//             <div className="px-4 py-3 text-center">
//               <div className="text-xs font-bold text-slate-600">Final - Balance</div>
//             </div>
//           </div>
//           <div className="grid grid-cols-4 bg-white">
//             <div className="px-4 py-4 text-center border-r border-slate-200">
//               <div className="text-xl font-bold text-emerald-700">₹{num(balance).toLocaleString()}</div>
//             </div>
//             <div className="px-4 py-4 text-center border-r border-slate-200">
//               <div className="text-xl font-bold text-orange-600">₹{num(poAddition).toLocaleString()}</div>
//             </div>
//             <div className="px-4 py-4 text-center border-r border-slate-200">
//               <div className="text-xl font-bold text-red-600">₹{num(poDeduction).toLocaleString()}</div>
//             </div>
//             <div className="px-4 py-4 text-center">
//               <div className="text-xl font-bold text-purple-700">₹{num(finalBalance).toLocaleString()}</div>
//             </div>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const inr = (v) => `₹${num(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().split("T")[0];

const EMPTY_BREAKDOWN = {
  grossAdvance: 0,
  poAdditions: [],
  poDeductions: [],
  warehouse: [],
  podDeductions: [],
  podDeductionMode: "none",
};

const EMPTY_FIGURES = {
  amount: 0, advance: 0, totalAddition: 0, totalDeduction: 0,
  poAddition: 0, poDeduction: 0, podDeduction: 0, finalBalance: 0,
};

/* ---------- Layout helpers ---------- */

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm mb-4">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="text-sm font-extrabold text-slate-900">{title}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const FIELD_TONES = {
  gray: "border-slate-200 bg-gray-100 text-slate-800",
  purple: "border-purple-200 bg-purple-50 font-bold text-purple-700",
  emerald: "border-emerald-200 bg-emerald-50 font-bold text-emerald-700",
};

// Read-only field
function Field({ label, value, span = "md:col-span-3", type = "text", align = "", hint, tone = "gray" }) {
  return (
    <div className={`col-span-12 ${span}`}>
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        readOnly
        className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm cursor-not-allowed ${FIELD_TONES[tone] || FIELD_TONES.gray} ${align}`}
      />
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function PODDropdown({ onSelect, selectedPodNo }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [podList, setPodList] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    fetchPODs();
  }, []);

  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const fetchPODs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/balance-payment/pod-lookup?format=table", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setPodList(data.data || []);
    } catch (error) {
      console.error("Error fetching PODs:", error);
    } finally {
      setLoading(false);
    }
  };

  const q = query.trim().toLowerCase();
  const items = podList.filter(
    (pod) =>
      !q ||
      [pod.podNo, pod.orderNo, pod.purchaseNo, pod.vendorName, pod.companyName]
        .join(" ")
        .toLowerCase()
        .includes(q)
  );

  const selected = podList.find((p) => p.podNo === selectedPodNo);
  const selectedText = selected
    ? `${selected.podNo}${selected.orderNo ? ` | ${selected.orderNo}` : ""}`
    : selectedPodNo || "";

  return (
    <div ref={boxRef} className="relative mt-1">
      <input
        type="text"
        value={open ? query : selectedText}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        placeholder="Search POD no, order no, purchase no, vendor..."
        autoComplete="off"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
      />
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <div className="px-3 py-3 text-sm text-slate-400">Loading...</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-400">No POD found</div>
          ) : (
            items.map((pod) => (
              <button
                type="button"
                key={pod._id || pod.podNo}
                onClick={() => { onSelect(pod); setOpen(false); setQuery(""); }}
                className={`block w-full text-left px-3 py-2 border-b border-slate-100 last:border-b-0 hover:bg-yellow-50 ${pod.podNo === selectedPodNo ? "bg-yellow-50" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900">{pod.podNo}</span>
                  {pod.orderNo && (
                    <span className="text-xs font-semibold text-yellow-700">Order: {pod.orderNo}</span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {[pod.purchaseNo && `Purchase: ${pod.purchaseNo}`, pod.vendorName, pod.companyName]
                    .filter(Boolean)
                    .join(" • ")}
                </div>
                <div className="text-xs text-slate-400">
                  Total: ₹{pod.totalAmount?.toLocaleString("en-IN")} | Balance: ₹{pod.finalBalance?.toLocaleString("en-IN")}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Calculation cards ---------- */

function Line({ label, value, sign, tone = "text-slate-800", bold }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={`text-sm ${bold ? "font-bold text-slate-900" : "text-slate-600"}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-extrabold" : "font-semibold"} ${tone}`}>
        {sign ? `${sign} ` : ""}{inr(value)}
      </span>
    </div>
  );
}

// One block (Additions or Deductions) inside the Additions & Deductions card
function Section({ tone, title, total, sign, children }) {
  const t = tone === "green"
    ? { head: "bg-green-100 text-green-800", amt: "text-green-700", box: "border-green-200" }
    : { head: "bg-red-100 text-red-800", amt: "text-red-700", box: "border-red-200" };
  return (
    <div className={`rounded-xl border ${t.box} bg-white mb-3 overflow-hidden`}>
      <div className={`flex justify-between px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide ${t.head}`}>
        <span>{title}</span>
        <span className={t.amt}>{sign} {inr(total)}</span>
      </div>
      <div className="px-3 py-2 space-y-2">{children}</div>
    </div>
  );
}

// A source row (e.g. "At Warehouse") with its individual items underneath
function Row({ label, amount, items, empty, note }) {
  return (
    <div>
      <div className="flex justify-between text-sm text-slate-700">
        <span className="font-semibold">{label}</span>
        {amount !== undefined && <span className="font-semibold">{inr(amount)}</span>}
      </div>
      {items && items.length ? (
        items.map((r, i) => (
          <div key={i} className="flex justify-between gap-3 text-xs text-slate-500 pl-3">
            <span>
              {r.label}
              {r.note ? <span className="text-slate-400"> · {r.note}</span> : null}
            </span>
            <span className="whitespace-nowrap">{inr(r.amount)}</span>
          </div>
        ))
      ) : (
        <div className="text-xs text-slate-400 pl-3">{empty}</div>
      )}
      {note && <div className="text-xs text-amber-700 pl-3 mt-0.5">{note}</div>}
    </div>
  );
}

function SummaryCards({ figures, breakdown, finalAmount, isPartial, unpaid }) {
  const b = breakdown || EMPTY_BREAKDOWN;
  const r2 = (v) => Math.round(v * 100) / 100;
  const sum = (rows) => (rows || []).reduce((s, r) => s + num(r.amount), 0);

  const amount = num(figures.amount);
  const podDeduction = num(figures.podDeduction);
  const finalAdvance = num(figures.advance);          // cash actually paid = advance after additions/deductions
  const poAdditions = sum(b.poAdditions);
  const poDedOnly = sum(b.poDeductions);
  const whOnly = sum(b.warehouse);

  // Advance as entered in the Purchase Panel (before additions/deductions).
  // Derived from the server's final balance so the cards always reconcile with the saved figures.
  const grossAdvance = r2(amount - num(figures.finalBalance) - podDeduction);
  const balance = r2(amount - grossAdvance);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
      {/* 1. Balance Calculation (same as Purchase Panel: Purchase Amount - Advance Paid) */}
      <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
        <div className="text-sm font-extrabold text-purple-800 mb-2">Balance Calculation</div>
        <Line label="Purchase Amount (A x B):" value={amount} tone="text-purple-700" />
        <Line label="Advance Paid:" value={grossAdvance} sign="−" tone="text-blue-600" />
        <div className="text-xs text-slate-500 pb-1">
          Advance as entered in the Purchase Panel, before additions and deductions.
        </div>
        <div className="border-t border-purple-200 mt-2 pt-2">
          <Line label="Balance:" value={balance} tone="text-purple-700" bold />
          <div className="text-xs text-slate-500">Formula: Purchase Amount − Advance Paid</div>
        </div>
      </div>

      {/* 2. Advance Calculation (replaces the old repeated "Additions & Deductions" panel) */}
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
        <div className="text-sm font-extrabold text-amber-800 mb-2">Advance Calculation</div>
        <Line label="Advance Paid:" value={grossAdvance} tone="text-blue-600" />

        <Section tone="green" title="Additions (+)" total={poAdditions} sign="+">
          <Row label="At Purchase Order" items={b.poAdditions} empty="No additions in the Purchase Panel" />
        </Section>

        <Section tone="red" title="Deductions (−)" total={poDedOnly + whOnly} sign="−">
          <Row label="At Purchase Order" amount={poDedOnly} items={b.poDeductions} empty="No deductions in the Purchase Panel" />
          <Row label="At Warehouse" amount={whOnly} items={b.warehouse} empty="No warehouse deductions" />
        </Section>

        <div className="border-t border-yellow-300 mt-2 pt-2">
          <Line label="Final Advance (paid):" value={finalAdvance} tone="text-emerald-700" bold />
          <div className="text-xs text-slate-500">
            Formula: Advance Paid + Additions − Deductions − Warehouse Deductions
          </div>
        </div>
      </div>

      {/* 3. Final Balance */}
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
        <div className="text-sm font-extrabold text-indigo-800 mb-2">Final Balance</div>
        <Line label="Balance:" value={balance} tone="text-purple-700" />
        <Line label="POD Deduction:" value={podDeduction} sign="−" tone="text-red-600" />

        {(b.podDeductions?.length > 0 || b.podDeductionMode === "manual") && (
          <div className="rounded-xl border border-red-200 bg-white px-3 py-2 mt-1">
            <Row
              label="At POD"
              items={b.podDeductions}
              empty="No deduction on the POD"
              note={b.podDeductionMode === "manual" ? "Manual POD figure is used instead of the product values." : null}
            />
          </div>
        )}

        <div className="border-t border-indigo-200 mt-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">Final Balance:</span>
            <span className="text-2xl font-extrabold text-purple-700">{inr(figures.finalBalance)}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Formula: Balance − POD Deduction</div>
        </div>

        <div className="mt-3 rounded-xl bg-white border border-indigo-100 px-3 py-2">
          <div className="text-xs text-slate-500">Final Amount to be paid</div>
          <div className="text-lg font-extrabold text-emerald-700">{inr(finalAmount)}</div>
          {isPartial && <div className="text-xs text-amber-600">{inr(unpaid)} will remain unpaid</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function CreateBalancePayment() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadedMsg, setLoadedMsg] = useState("");
  const [loadError, setLoadError] = useState("");

  // Auto-generated payment number
  const [balancePaymentNo, setBalancePaymentNo] = useState("");

  // Basic Info
  const [branch, setBranch] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [date, setDate] = useState(today());
  const [vendorName, setVendorName] = useState("");
  const [podNo, setPodNo] = useState("");
  const [purchaseNo, setPurchaseNo] = useState("");

  // Company info
  const [companyInfo, setCompanyInfo] = useState({ companyName: "", companyCode: "", subCompanyId: "", subCompanyName: "", subCompanyCode: "" });

  // Order Rows
  const [orderRows, setOrderRows] = useState([]);

  // Balance Payment Panel Fields
  const [vendorStatus, setVendorStatus] = useState("Active");
  const [vendorCode, setVendorCode] = useState("");
  const [vendorNamePayment, setVendorNamePayment] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [purchaseType, setPurchaseType] = useState("Loading & Unloading");
  const [rateType, setRateType] = useState("Per MT");
  const [rate, setRate] = useState("");
  const [weight, setWeight] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Money figures: derived on the server (POD + Purchase Panel + paid advances)
  const [figures, setFigures] = useState(EMPTY_FIGURES);
  const [breakdown, setBreakdown] = useState(EMPTY_BREAKDOWN);

  // Payment Transaction Details
  const [vendorNameDebit, setVendorNameDebit] = useState("");
  const [accountNoCredit, setAccountNoCredit] = useState("");
  const [finalAmount, setFinalAmount] = useState("");
  const [remarks, setRemarks] = useState("Balance Payment");
  const [transactionId, setTransactionId] = useState("");
  const [bankVendorCode, setBankVendorCode] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Pending");

  const defaultOrderRow = () => ({
    _id: uid(),
    orderNo: "", partyName: "", plantCode: "", orderType: "", pinCode: "", state: "", stateName: "",
    fromState: "", district: "", from: "", fromName: "", to: "", toName: "",
    locationRate: "", priceList: "", weight: "", rate: "", totalAmount: "",
    localStatus: "unknown", localStatusLabel: "Unknown",
  });

  useEffect(() => {
    setOrderRows([defaultOrderRow()]);
  }, []);

  // Handle POD Selection - Load data from POD directly
  const handlePODSelect = async (pod) => {
    setLoadingData(true);
    setLoadError("");
    setLoadedMsg("");
    setPodNo(pod.podNo);
    setPurchaseNo(pod.purchaseNo);
    try {
      const token = localStorage.getItem("token");
      const podRes = await fetch(`/api/balance-payment/pod-lookup?podNo=${encodeURIComponent(pod.podNo)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const podData = await podRes.json();

      if (!(podData.success && podData.data)) {
        setLoadError(podData.message || `POD data not found for POD No: ${pod.podNo}`);
        return;
      }

      const pd = podData.data;
      const headerData = pd.header || {};
      const vf = pd.vendorFinancial || {};
      const purchaseOrders = pd.purchaseOrders || [];
      const firstOrder = purchaseOrders[0] || {};

      setCompanyInfo({
        companyName: pd.companyName || headerData.companyName || "",
        companyCode: pd.companyCode || headerData.companyCode || "",
        subCompanyId: pd.subCompanyId || headerData.subCompanyId || null,
        subCompanyName: pd.subCompanyName || headerData.subCompanyName || "",
        subCompanyCode: pd.subCompanyCode || headerData.subCompanyCode || "",
      });

      setBranch(headerData.branch || headerData.branchName || "");
      setBranchCode(headerData.branchCode || "");
      setDate(headerData.date ? new Date(headerData.date).toISOString().split("T")[0] : today());
      setVendorName(vf.vendorName || pod.vendorName || "");
      setPurchaseNo(pd.purchaseNo || pod.purchaseNo || "");

      setVendorStatus(vf.vendorStatus || "Active");
      setVendorCode(vf.vendorCode || "");
      setVendorNamePayment(vf.vendorName || pod.vendorName || "");
      // Vendor rate / weight / vehicle come from the Purchase Panel (the order-row rate is the customer's rate, not the vendor's)
      const purchaseInfo = pd.purchaseDetails || {};
      setVehicleNo(purchaseInfo.vehicleNo || firstOrder.vehicleNo || vf.vehicleNo || "");
      setPurchaseType(pd.purchaseType || "Loading & Unloading");
      setRateType(purchaseInfo.rateType || pd.rateType || "Per MT");
      setRate(purchaseInfo.rate ? String(purchaseInfo.rate) : vf.rate?.toString() || "");
      setWeight(purchaseInfo.weight ? String(purchaseInfo.weight) : firstOrder.weight?.toString() || vf.weight?.toString() || "");
      setDueDate(pd.podStatusSection?.dueDate || "");

      const fb = num(vf.finalBalance);
      setFigures({
        amount: num(vf.total || vf.amount),
        advance: num(vf.advance),
        totalAddition: num(vf.totalAddition),
        totalDeduction: num(vf.totalDeduction),
        poAddition: num(vf.poAddition),
        poDeduction: num(vf.poDeduction),
        podDeduction: num(vf.podDeduction),
        finalBalance: fb,
      });
      setBreakdown({ ...EMPTY_BREAKDOWN, ...(pd.breakdown || {}) });
      setFinalAmount(fb.toFixed(2));

      if (purchaseOrders.length > 0) {
        setOrderRows(
          purchaseOrders.map((order) => ({
            _id: uid(),
            orderNo: order.orderNo || "",
            partyName: order.partyName || "",
            plantCode: order.plantCode || "",
            orderType: order.orderType || "Sales",
            pinCode: order.pinCode || "",
            state: order.state || "",
            stateName: order.stateName || order.state || "",
            fromState: order.fromState || "",
            district: order.district || "",
            from: order.from || "",
            fromName: order.fromName || order.from || "",
            to: order.to || "",
            toName: order.toName || order.to || "",
            locationRate: order.locationRate || "",
            priceList: order.priceList || "",
            weight: order.weight?.toString() || "0",
            rate: order.rate?.toString() || "0",
            totalAmount: order.totalAmount?.toString() || ((order.weight || 0) * (order.rate || 0)).toString(),
            localStatus: order.localStatus || "unknown",
            localStatusLabel: order.localStatusLabel || "Unknown",
          }))
        );
      }

      // Payee details come from the lookup endpoint (no Advance Payment permission needed).
      // The advance's UTR and remarks are deliberately NOT copied into a Balance Payment.
      const bank = pd.advanceBank || {};
      setVendorNameDebit(bank.vendorNameDebit || vf.vendorName || "");
      setAccountNoCredit(bank.accountNoCredit || "");
      setTransactionId("");
      setBankVendorCode(bank.bankVendorCode || vf.vendorCode || "");
      setRemarks("Balance Payment");

      setLoadedMsg(`Loaded POD ${pd.podNo || pod.podNo} · Purchase ${pd.purchaseNo || pod.purchaseNo}${pd.companyName ? ` · ${pd.companyName}` : ""}`);
    } catch (error) {
      console.error("Error loading POD data:", error);
      setLoadError("Failed to load POD details");
    } finally {
      setLoadingData(false);
    }
  };

  const removeOrderRow = (rowId) => {
    if (orderRows.length > 1) setOrderRows((prev) => prev.filter((r) => r._id !== rowId));
  };

  const finalBalance = num(figures.finalBalance);
  const payNow = num(finalAmount);
  const unpaid = Math.max(finalBalance - payNow, 0);
  const overLimit = payNow > finalBalance + 0.005;
  const isPartial = !!podNo && unpaid > 0.005;

  const handleSave = async (saveMode = 'submit') => {
    const isDraftSave = saveMode === 'draft';
    if (!podNo) return alert("Please select a POD No");
    if (!isDraftSave && overLimit) return alert(`Final amount cannot exceed the final balance (${inr(finalBalance)}).`);
    if (!isDraftSave && isPartial && (!remarks.trim() || remarks.trim() === "Balance Payment")) {
      return alert("You are paying less than the final balance. Please write the reason in Remarks.");
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      // The server re-derives every amount from the POD, Purchase Panel and paid advances; only Final Amount is taken from here.
      const payload = {
        saveMode,
        companyName: companyInfo.companyName || "",
        companyCode: companyInfo.companyCode || "",
        subCompanyId: companyInfo.subCompanyId || null,
        subCompanyName: companyInfo.subCompanyName || "",
        subCompanyCode: companyInfo.subCompanyCode || "",
        branch,
        branchCode,
        date,
        vendorName,
        podNo,
        purchaseNo,
        orderRows,
        vendorStatus,
        vendorCode,
        vendorNamePayment,
        vehicleNo,
        purchaseType,
        rateType,
        rate: num(rate),
        weight: num(weight),
        amount: num(figures.amount),
        advance: num(figures.advance),
        totalAddition: num(figures.totalAddition),
        totalDeduction: num(figures.totalDeduction),
        poAddition: num(figures.poAddition),
        poDeduction: num(figures.poDeduction),
        podDeduction: num(figures.podDeduction),
        finalBalance,
        dueDate,
        vendorNameDebit,
        accountNoCredit,
        finalAmount: payNow,
        remarks,
        transactionId,
        bankVendorCode,
        paymentStatus,
        paymentDate: today(),
      };

      const res = await fetch("/api/balance-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setBalancePaymentNo(data.data?.balancePaymentNo || "");
        alert(isDraftSave
          ? `✅ Balance Payment saved as a draft.\nPayment No: ${data.data.balancePaymentNo}\nOpen it from the list to continue.`
          : `✅ Balance Payment saved successfully!\nPayment No: ${data.data.balancePaymentNo}\nSub-Company: ${data.data.subCompanyName || "N/A"}`);
        router.push("/admin/Balance-Payment");
      } else {
        alert(data.message || "Failed to save balance payment");
      }
    } catch (error) {
      console.error("Error saving:", error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setBranch(""); setBranchCode(""); setDate(today()); setVendorName(""); setPodNo(""); setPurchaseNo("");
    setCompanyInfo({ companyName: "", companyCode: "", subCompanyId: "", subCompanyName: "", subCompanyCode: "" });
    setOrderRows([defaultOrderRow()]);
    setVendorStatus("Active"); setVendorCode(""); setVendorNamePayment(""); setVehicleNo("");
    setPurchaseType("Loading & Unloading"); setRateType("Per MT"); setRate(""); setWeight(""); setDueDate("");
    setFigures(EMPTY_FIGURES);
    setBreakdown(EMPTY_BREAKDOWN);
    setVendorNameDebit(""); setAccountNoCredit(""); setFinalAmount(""); setRemarks("Balance Payment");
    setTransactionId(""); setBankVendorCode(""); setPaymentStatus("Pending");
    setLoadedMsg(""); setLoadError("");
  };

  // Table styles
  const roCell = "w-full min-w-[110px] px-2 py-1 border rounded bg-gray-100";
  const numCell = "w-20 px-2 py-1 border rounded bg-gray-100";
  const td = "border border-slate-200 px-2 py-1";
  const th = "border border-yellow-500 px-3 py-2 text-xs font-extrabold text-slate-900 bg-yellow-400 whitespace-nowrap";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-full px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/admin/Balance-Payment")} className="text-emerald-600 hover:text-emerald-800 font-medium text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to List
              </button>
              <div className="text-lg font-extrabold text-slate-900">Create Balance Payment</div>
            </div>
            {companyInfo.companyName && (
              <div className="text-xs text-blue-600 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="font-medium">🏢 {companyInfo.companyName}</span>
                {companyInfo.companyCode && <span>({companyInfo.companyCode})</span>}
                {companyInfo.subCompanyName && <span className="text-emerald-600">| Sub: {companyInfo.subCompanyName}</span>}
                {companyInfo.subCompanyCode && <span className="text-emerald-600">({companyInfo.subCompanyCode})</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => handleSave('draft')} disabled={saving} className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-60">Save as Draft</button>
            <button onClick={resetForm} className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">Reset</button>
            <button
              onClick={() => handleSave('submit')}
              disabled={saving}
              className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition ${saving ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {saving ? "Saving..." : "Save Payment"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-full p-4">
        {/* Balance Payment Number - Auto Generated */}
        <Card title="Balance Payment Information">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-3">
              <label className="text-xs font-bold text-slate-600">Balance Payment No</label>
              <input type="text" value={balancePaymentNo || "Assigned when saved"} readOnly className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700" />
              <p className="text-xs text-slate-400 mt-1">A number is assigned after the payment is created</p>
            </div>
            <div className="col-span-12 md:col-span-9">
              <label className="text-xs font-bold text-slate-600">Select POD No *</label>
              <PODDropdown onSelect={handlePODSelect} selectedPodNo={podNo} />
              <p className="text-xs text-slate-400 mt-1">Select a POD to auto-fill all details</p>
            </div>
          </div>
          {loadingData && <div className="mt-3 p-3 bg-emerald-50 rounded-lg text-emerald-600 text-sm">Loading details...</div>}
          {loadedMsg && !loadingData && <div className="mt-3 p-3 bg-emerald-50 rounded-lg text-emerald-700 text-sm">✅ {loadedMsg}</div>}
          {loadError && !loadingData && <div className="mt-3 p-3 bg-red-50 rounded-lg text-red-700 text-sm">⚠️ {loadError}</div>}
        </Card>

        {/* Company Information */}
        <Card title="Company Information">
          <div className="grid grid-cols-12 gap-3">
            <Field label="Sub-Company Name" value={companyInfo.subCompanyName || "-"} span="md:col-span-3" tone="emerald" />
            <Field label="Sub-Company Code" value={companyInfo.subCompanyCode || "-"} span="md:col-span-2" tone="emerald" />
          </div>
          <p className="text-xs text-slate-400 mt-2">Company information is auto-loaded from the selected POD</p>
        </Card>

        {/* Basic Information - READ ONLY */}
        <Card title="Basic Information">
          <div className="grid grid-cols-12 gap-4">
            <Field label="Branch" value={branch} span="md:col-span-3" />
            <Field label="Branch Code" value={branchCode} span="md:col-span-2" />
            <Field label="Date" value={date} type="date" span="md:col-span-2" />
            <Field label="POD No" value={podNo} span="md:col-span-2" />
            <Field label="Vendor Name" value={vendorName} span="md:col-span-3" />
            <Field label="Purchase No" value={purchaseNo} span="md:col-span-3" />
          </div>
        </Card>

        {/* 1. Orders Table - READ ONLY */}
        <Card title="Order Details">
          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-max w-full text-sm">
              <thead>
                <tr>
                  {["Order No", "Party Name", "Plant", "Order Type", "Pin Code", "State", "From State", "Local/Not Local", "District", "From", "To", "Weight", "Actions"].map((h) => (
                    <th key={h} className={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orderRows.map((row) => {
                  const isLocal = row.fromState && row.state && row.fromState.trim().toUpperCase() === row.state.trim().toUpperCase();
                  return (
                    <tr key={row._id} className="hover:bg-slate-50">
                      <td className={td}><input type="text" value={row.orderNo} readOnly className={roCell} /></td>
                      <td className={td}><input type="text" value={row.partyName} readOnly className={roCell} /></td>
                      <td className={td}><input type="text" value={row.plantCode} readOnly className={`${roCell} min-w-[200px]`} /></td>
                      <td className={td}><input type="text" value={row.orderType} readOnly className={roCell} /></td>
                      <td className={td}><input type="text" value={row.pinCode} readOnly className={roCell} /></td>
                      <td className={td}><input type="text" value={row.state} readOnly className={roCell} /></td>
                      <td className={td}><input type="text" value={row.fromState} readOnly className={roCell} /></td>
                      <td className={`${td} text-center`}>
                        {row.fromState && row.state ? (
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${isLocal ? "bg-green-100 text-green-800 border border-green-300" : "bg-red-100 text-red-800 border border-red-300"}`}>
                            {isLocal ? "✅ Local" : "❌ Not Local"}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className={td}><input type="text" value={row.district} readOnly className={roCell} /></td>
                      <td className={td}><input type="text" value={row.from} readOnly className={roCell} /></td>
                      <td className={td}><input type="text" value={row.to} readOnly className={roCell} /></td>
                      <td className={td}><input type="number" value={row.weight} readOnly className={numCell} /></td>
                      <td className={`${td} text-center`}>
                        <button onClick={() => removeOrderRow(row._id)} className="text-red-600 hover:text-red-800">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 2. Balance Payment Panel - inputs only (the calculation is shown in the cards below) */}
        <Card title="Balance Payment - Panel">
          <div className="grid grid-cols-12 gap-4 mb-4">
            <Field label="Vendor Status" value={vendorStatus} span="md:col-span-2" />
            <Field label="Vendor Code" value={vendorCode} span="md:col-span-2" />
            <Field label="Vendor Name" value={vendorNamePayment} span="md:col-span-3" />
            <Field label="Vehicle No" value={vehicleNo} span="md:col-span-2" />
            <Field label="Purchase - Type" value={purchaseType} span="md:col-span-3" />
          </div>

          <div className="grid grid-cols-12 gap-4">
            <Field label="Rate - Type" value={rateType} span="md:col-span-2" />
            <Field label="Rate (₹)" value={rate} span="md:col-span-2" align="text-right" hint="From Purchase Panel" />
            <Field label="Weight (MT)" value={weight} span="md:col-span-2" align="text-right" />
            <Field label="Amount (A x B)" value={inr(figures.amount)} span="md:col-span-2" tone="purple" />
            <Field label="Advance" value={inr(figures.advance)} span="md:col-span-2" hint="Paid advances With Additions & Deductions Applied " />
            {/* <div className="col-span-12 md:col-span-2">
              <label className="text-xs font-bold text-slate-600">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500"
              />
            </div> */}
          </div>
        </Card>

        {/* 3. Calculation: Balance -> Additions & Deductions -> Final Balance */}
        <SummaryCards figures={figures} breakdown={breakdown} finalAmount={finalAmount} isPartial={isPartial} unpaid={unpaid} />

        {/* 4. Payment Transaction Details */}
        <Card title="Payment Transaction Details">
          <div className="grid grid-cols-12 gap-4 mb-4">
            <Field label="Vendor Name (Debit)" value={vendorNameDebit} span="md:col-span-3" />
            <Field label="Account No (Credit)" value={accountNoCredit} span="md:col-span-3" />
            <div className="col-span-12 md:col-span-3">
              <label className="text-xs font-bold text-slate-600">Final Amount</label>
              <input
                type="number"
                readOnly
                value={finalAmount}
                onChange={(e) => setFinalAmount(e.target.value)}
                className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm font-bold text-emerald-700 focus:border-emerald-500 ${overLimit ? "border-red-400" : "border-slate-200"}`}
              />
              {/* {overLimit ? (
                <p className="text-xs text-red-600 mt-1">Cannot be more than the Final Balance ({inr(finalBalance)})</p>
              ) : isPartial ? (
                <p className="text-xs text-amber-600 mt-1">{inr(unpaid)} will remain unpaid. Please write the reason in Remarks.</p>
              ) : (
                <p className="text-xs text-blue-500 mt-1">Editable</p>
              )} */}
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className="text-xs font-bold text-slate-600">Remarks {isPartial && <span className="text-red-500">*</span>}</label>
              <input
                type="text"
                value={remarks}
                readOnly={!isPartial}
                onChange={(e) => setRemarks(e.target.value)}
                className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm ${isPartial ? "border-amber-400 bg-white focus:border-emerald-500" : "border-slate-200 bg-gray-100 cursor-not-allowed"}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <Field label="Transaction ID" value={transactionId} span="md:col-span-4" />
            <Field label="Bank Vendor Code" value={bankVendorCode} span="md:col-span-4" />
            <div className="col-span-12 md:col-span-4">
              <label className="text-xs font-bold text-slate-600">Payment Status</label>
              <select value={paymentStatus} disabled className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed">
                <option value="Pending">Pending</option>
                <option value="Queued">Queued</option>
                <option value="Completed">Completed</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
