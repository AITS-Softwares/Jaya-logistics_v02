
// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";

// function Card({ title, children, className = "" }) {
//   return (
//     <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm mb-6 ${className}`}>
//       <div className="border-b border-slate-100 px-5 py-3">
//         <div className="text-base font-bold text-slate-900">{title}</div>
//       </div>
//       <div className="p-5">{children}</div>
//     </div>
//   );
// }

// // Branch Selector
// function BranchSelector({ value, onChange, label = "Branch", branches = [], loading = false }) {
//   return (
//     <div>
//       <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
//       <select
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
//         disabled={loading}
//       >
//         <option value="">Select Branch</option>
//         {branches.map((branch) => (
//           <option key={branch._id} value={branch._id}>
//             {branch.name} {branch.code ? `(${branch.code})` : ""}
//           </option>
//         ))}
//       </select>
//     </div>
//   );
// }

// // Client Selector
// function ClientSelector({ value, onChange, label = "Client Name", clients = [], loading = false }) {
//   return (
//     <div>
//       <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
//       <select
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
//         disabled={loading}
//       >
//         <option value="">Select Client</option>
//         {clients.map((client) => (
//           <option key={client._id} value={client._id}>
//             {client.customerName} {client.customerCode ? `(${client.customerCode})` : ""}
//           </option>
//         ))}
//       </select>
//     </div>
//   );
// }

// function MonthSelector({ value, onChange, label = "Month" }) {
//   const months = [
//     "January",
//     "February",
//     "March",
//     "April",
//     "May",
//     "June",
//     "July",
//     "August",
//     "September",
//     "October",
//     "November",
//     "December",
//   ];

//   return (
//     <div>
//       <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
//       <select
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
//       >
//         <option value="">Select Month</option>
//         {months.map((month) => (
//           <option key={month} value={month}>
//             {month}
//           </option>
//         ))}
//       </select>
//     </div>
//   );
// }

// function OrderTypeSelector({ value, onChange, label = "Order Type" }) {
//   const types = ["NA", "Sales", "STO Order", "Export", "Import", "Purchase", "Return"];

//   return (
//     <div>
//       <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
//       <select
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
//       >
//         {types.map((type) => (
//           <option key={type} value={type}>
//             {type === "NA" ? "All Order Types" : type}
//           </option>
//         ))}
//       </select>
//     </div>
//   );
// }

// function ProductCategorySelector({ value, onChange, label = "Product Categories" }) {
//   const categories = ["Biological", "Premium Product", "Standard", "Economy", "Specialty"];

//   return (
//     <div>
//       <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
//       <select
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
//       >
//         <option value="">Select Category</option>
//         {categories.map((category) => (
//           <option key={category} value={category}>
//             {category}
//           </option>
//         ))}
//       </select>
//     </div>
//   );
// }

// function PlantCodeSelector({ value, onChange, label = "Plant Code", plants = [], loading = false }) {
//   return (
//     <div>
//       <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
//       <select
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
//         disabled={loading}
//       >
//         <option value="">Select Plant Code</option>
//         {plants.map((plant) => (
//           <option key={plant._id} value={plant._id}>
//             {plant.code} - {plant.name}
//           </option>
//         ))}
//       </select>
//     </div>
//   );
// }

// // Billing Type Dropdown Component
// function BillingTypeSelector({ value, onChange, label = "Select Billing Type" }) {
//   const billingTypes = [
//     { value: "product-wise", label: "Yara - Product-Wise Billing" },
//     { value: "general", label: "General - Billing" },
//     { value: "detention", label: "Detention - Billing" },
//     { value: "cancellation", label: "Cancellation - Billing" },
//     { value: "other", label: "Other - Billing" },
//   ];

//   return (
//     <div className="mb-6">
//       <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
//       <select
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         className="w-full md:w-96 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 font-medium"
//       >
//         <option value="">-- Select Billing Type --</option>
//         {billingTypes.map((type) => (
//           <option key={type.value} value={type.value}>
//             {type.label}
//           </option>
//         ))}
//       </select>
//     </div>
//   );
// }

// // Safe date formatter
// function safeFormatDate(dateStr) {
//   if (!dateStr) return "";
//   try {
//     const date = new Date(dateStr);
//     if (isNaN(date.getTime())) return dateStr;
//     const day = String(date.getDate()).padStart(2, "0");
//     const month = String(date.getMonth() + 1).padStart(2, "0");
//     const year = date.getFullYear();
//     return `${day}.${month}.${year}`;
//   } catch (error) {
//     return dateStr;
//   }
// }

// // Save report to backend and generate PDF
// async function generateAndSaveReport(reportData, type, filters, onSuccess) {
//   try {
//     const token = localStorage.getItem("token");

//     const saveResponse = await fetch("/api/saved-reports", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify(reportData),
//     });
//     const saveData = await saveResponse.json();

//     if (!saveData.success) {
//       alert("Failed to save report");
//       return false;
//     }

//     const currentDate = new Date().toLocaleString();
//     const billNumber = `BILL/${Date.now()}/${Math.floor(Math.random() * 1000)}`;
//     const html = generatePDFHTML(reportData, currentDate, type, filters, billNumber);

//     const printWindow = window.open("", "_blank");
//     printWindow.document.write(html);
//     printWindow.document.close();
//     printWindow.print();

//     alert(`✅ Bill generated successfully!\nBill No: ${billNumber}\nSaved ${reportData.selectedRecords} records`);

//     if (onSuccess) onSuccess();
//     return true;
//   } catch (error) {
//     console.error("Error:", error);
//     alert("Failed to generate report");
//     return false;
//   }
// }

// function generatePDFHTML(reportData, currentDate, type, filters, billNumber) {
//   let title = "";
//   let headers = [];
//   let rows = [];
//   let totalAmount = reportData.summary.totalAmount;
//   let totalWeight = reportData.summary.totalWeight || 0;

//   const clientName = filters.clientName || "Client Name";
//   const clientGST = filters.clientGST || "GST Number";
//   const clientState = filters.clientState || "State";
//   const clientStateCode = filters.clientStateCode || "Code";

//   switch (type) {
//     case "product-wise":
//       title = "Yara - Product-Wise Billing Report";
//       headers = ["S.No", "LR No", "Date", "Vehicle No", "From", "To", "Product", "Weight (MT)", "Rate (₹)", "Amount (₹)"];
//       rows = reportData.data.map((item, idx) => [
//         idx + 1,
//         item.lrNo || "-",
//         safeFormatDate(item.date),
//         item.vehicleNo || "-",
//         item.fromLocation || item.from || "-",
//         item.toLocation || item.to || "-",
//         item.productName || "-",
//         (item.weight || 0).toFixed(2),
//         (item.rate || 0).toFixed(2),
//         (item.amount || 0).toFixed(2),
//       ]);
//       break;
//     case "general":
//       title = "General Billing Report";
//       headers = ["S.No", "LR No", "Date", "Vehicle No", "From", "To", "Product", "Weight (MT)", "Rate (₹)", "Amount (₹)"];
//       rows = reportData.data.map((item, idx) => [
//         idx + 1,
//         item.lrNo || "-",
//         safeFormatDate(item.date),
//         item.vehicleNo || "-",
//         item.from || "-",
//         item.to || "-",
//         item.productName || "-",
//         (item.weight || 0).toFixed(2),
//         (item.rate || 0).toFixed(2),
//         (item.amount || 0).toFixed(2),
//       ]);
//       break;
//     case "detention":
//       title = "Detention Billing Report";
//       headers = ["S.No", "LR No", "Date", "Vehicle No", "From", "To", "Detention Type", "Amount (₹)"];
//       rows = reportData.data.map((item, idx) => [
//         idx + 1,
//         item.lrNo || "-",
//         safeFormatDate(item.date),
//         item.vehicleNo || "-",
//         item.from || "-",
//         item.to || "-",
//         item.detentionType || "-",
//         (item.amount || 0).toFixed(2),
//       ]);
//       break;
//     case "cancellation":
//       title = "Cancellation Billing Report";
//       headers = ["S.No", "LR No", "Date", "Vehicle No", "From", "To", "Cancellation Type", "Amount (₹)"];
//       rows = reportData.data.map((item, idx) => [
//         idx + 1,
//         item.lrNo || "-",
//         safeFormatDate(item.date),
//         item.vehicleNo || "-",
//         item.from || "-",
//         item.to || "-",
//         item.cancellationType || "-",
//         (item.amount || 0).toFixed(2),
//       ]);
//       break;
//     default:
//       title = "Billing Report";
//       headers = ["S.No", "LR No", "Date", "Vehicle No", "Amount (₹)"];
//       rows = reportData.data.map((item, idx) => [
//         idx + 1,
//         item.lrNo || "-",
//         safeFormatDate(item.date),
//         item.vehicleNo || "-",
//         (item.amount || 0).toFixed(2),
//       ]);
//   }

//   const periodText = filters.startDate && filters.endDate ? `${filters.startDate} to ${filters.endDate}` : "Selected Period";

//   return `
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <meta charset="UTF-8">
//       <title>${title}</title>
//       <style>
//         * { margin: 0; padding: 0; box-sizing: border-box; }
//         body { font-family: 'Times New Roman', Arial, sans-serif; padding: 20px; background: white; font-size: 12px; }
//         .bill-container { max-width: 1100px; margin: 0 auto; background: white; }
//         .header-section { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #000; }
//         .company-details { flex: 1; }
//         .company-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
//         .company-address { font-size: 10px; line-height: 1.4; color: #333; }
//         .bill-details { text-align: right; flex: 1; }
//         .bill-title { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
//         .party-section { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb; }
//         .bill-to, .ship-to { flex: 1; }
//         .section-title { font-weight: bold; margin-bottom: 5px; font-size: 12px; }
//         .party-address { font-size: 10px; line-height: 1.4; }
//         .terms-section { margin: 15px 0; padding: 8px; background: #fef3c7; border: 1px solid #f59e0b; font-size: 10px; }
//         .terms-title { font-weight: bold; margin-bottom: 5px; }
//         table { width: 100%; border-collapse: collapse; margin: 15px 0; }
//         th, td { border: 1px solid #000; padding: 6px; text-align: left; font-size: 10px; }
//         th { background-color: #d1fae5; font-weight: bold; text-align: center; }
//         .text-right { text-align: right; }
//         .total-row { background-color: #fef3c7; font-weight: bold; }
//         .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 9px; text-align: center; }
//         .amount-in-words { margin-top: 10px; font-size: 10px; font-weight: bold; }
//         @media print { body { padding: 0; margin: 0; } }
//       </style>
//     </head>
//     <body>
//       <div class="bill-container">
//         <div class="header-section">
//           <div class="company-details">
//             <div class="company-name">JAYA GLOBAL LOGISTICS</div>
//             <div class="company-address">
//               Office - 404, A - Wing 4th Floor,<br>
//               Shelton Sapphire, Sector - 15<br>
//               Belapur Navi Mumbai - 400614.<br>
//               GSTIN/UIN: 27HEVPS8463H1ZC<br>
//               State Name: Maharashtra, Code: 27<br>
//               E-Mail: jayagloballogistics@gmail.com<br>
//               PAN No: HEVPS8463H
//             </div>
//           </div>
//           <div class="bill-details">
//             <div class="bill-title">TAX INVOICE</div>
//             <div class="bill-no"><strong>BILL No:</strong> ${billNumber}</div>
//             <div class="bill-no"><strong>BILL DATE:</strong> ${currentDate.split(",")[0]}</div>
//             <div class="bill-no"><strong>Period:</strong> ${periodText}</div>
//           </div>
//         </div>

//         <div class="party-section">
//           <div class="bill-to">
//             <div class="section-title">Bill To:</div>
//             <div class="party-address">
//               ${clientName}<br>
//               ${filters.clientAddress || "Warehousing complex, Chukkavanipalem Village"}<br>
//               ${filters.clientCity || "Visakhapatnam, Andhra Pradesh, 530012"}<br>
//               GST No: ${clientGST}<br>
//               ${clientState}, Code: ${clientStateCode}
//             </div>
//           </div>
//           <div class="ship-to">
//             <div class="section-title">Ship To:</div>
//             <div class="party-address">Same as Bill To</div>
//           </div>
//         </div>

//         <div class="terms-section">
//           <div class="terms-title">Terms of Payment:</div>
//           <div>Within 30 Days of receiving Invoice</div>
//           <div style="margin-top: 5px;"><strong>Note:</strong></div>
//           <div>1) Please pay by A/c Payee Cheque / DD favouring 'JAYA LOGISTICS' Only.</div>
//           <div>2) 18% interest will be charged, if the bill is not settled within 30 Days.</div>
//         </div>

//         <table>
//           <thead>
//             <tr>
//               ${headers.map((h) => `<th>${h}</th>`).join("")}
//             </tr>
//           </thead>
//           <tbody>
//             ${rows.map(
//               (row) => `
//               <tr>
//                 ${row.map((cell) => `<td>${cell}</td>`).join("")}
//               </tr>
//             `
//             ).join("")}
//           </tbody>
//           <tfoot>
//             <tr class="total-row">
//               <td colspan="${headers.length - 1}" class="text-right"><strong>TOTAL AMOUNT</strong></td>
//               <td class="text-right"><strong>₹ ${totalAmount.toFixed(2)}</strong></td>
//             </tr>
//           </tfoot>
//         </table>

//         <div class="amount-in-words">
//           <strong>Amount in Words:</strong> Rupees ${Math.floor(totalAmount).toLocaleString()} Only
//         </div>
//         <div class="footer">
//           <p>This is a computer generated invoice - No signature required</p>
//           <p>For JAYA GLOBAL LOGISTICS</p>
//           <p style="margin-top: 30px;">Authorized Signatory</p>
//         </div>
//       </div>
//     </body>
//     </html>
//   `;
// }

// // Get already generated LR numbers from saved reports
// async function getGeneratedLRNumbers() {
//   try {
//     const token = localStorage.getItem("token");
//     const response = await fetch("/api/saved-reports", {
//       headers: { Authorization: `Bearer ${token}` },
//     });
//     const data = await response.json();
//     if (data.success && data.data) {
//       const lrNumbers = new Set();
//       data.data.forEach((report) => {
//         if (report.data && Array.isArray(report.data)) {
//           report.data.forEach((item) => {
//             if (item.lrNo) {
//               lrNumbers.add(item.lrNo);
//             }
//           });
//         }
//       });
//       return Array.from(lrNumbers);
//     }
//     return [];
//   } catch (error) {
//     console.error("Error fetching generated LR numbers:", error);
//     return [];
//   }
// }

// // ==================== PRODUCT WISE BILLING COMPONENT ====================
// function ProductWiseBillingComponent({ branches, clients, plants, loadingBranches, loadingClients, loadingPlants }) {
//   const [loading, setLoading] = useState(false);
//   const [billData, setBillData] = useState([]);
//   const [summary, setSummary] = useState({ totalWeight: 0, totalAmount: 0, totalRecords: 0 });
//   const [selectedRows, setSelectedRows] = useState({});
//   const [selectAll, setSelectAll] = useState(false);
//   const [generating, setGenerating] = useState(false);
//   const [generatedLRs, setGeneratedLRs] = useState([]);

//   const [filters, setFilters] = useState({
//     branchId: "",
//     clientId: "",
//     clientName: "",
//     clientGST: "",
//     clientState: "",
//     clientStateCode: "",
//     clientAddress: "",
//     clientCity: "",
//     productCategories: "",
//     plantId: "",
//     orderType: "NA",
//     startDate: "",
//     endDate: "",
//   });

//   useEffect(() => {
//     const today = new Date();
//     const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
//     const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
//     const formatDate = (date) => date.toISOString().split("T")[0];
//     setFilters((prev) => ({
//       ...prev,
//       startDate: formatDate(firstDayOfMonth),
//       endDate: formatDate(lastDayOfMonth),
//     }));
//     loadGeneratedLRs();
//   }, []);

//   useEffect(() => {
//     if (filters.clientId && filters.startDate && filters.endDate) {
//       fetchData();
//     }
//   }, [filters.clientId, filters.branchId, filters.productCategories, filters.plantId, filters.orderType, filters.startDate, filters.endDate]);

//   const loadGeneratedLRs = async () => {
//     const lrs = await getGeneratedLRNumbers();
//     setGeneratedLRs(lrs);
//   };

//   const fetchData = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       // Convert "NA" to empty string for API
//       const orderTypeValue = filters.orderType === "NA" ? "" : filters.orderType;
//       const payload = {
//         type: "product-wise",
//         branchId: filters.branchId,
//         branchName: branches.find((b) => b._id === filters.branchId)?.name || "",
//         clientId: filters.clientId,
//         clientName: filters.clientName,
//         productCategories: filters.productCategories,
//         plantId: filters.plantId,
//         plantCode: plants.find((p) => p._id === filters.plantId)?.code || "",
//         orderType: orderTypeValue,
//         startDate: filters.startDate,
//         endDate: filters.endDate,
//         excludeLRs: generatedLRs,
//       };

//       const response = await fetch("/api/billing/product-wise", {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
//         body: JSON.stringify(payload),
//       });
//       const data = await response.json();
//       if (data.success) {
//         const filteredData = (data.data || []).filter((item) => !generatedLRs.includes(item.lrNo));
//         setBillData(filteredData);
//         setSummary({
//           totalWeight: filteredData.reduce((sum, item) => sum + (item.weight || 0), 0),
//           totalAmount: filteredData.reduce((sum, item) => sum + (item.amount || 0), 0),
//           totalRecords: filteredData.length,
//         });
//         setSelectedRows({});
//         setSelectAll(false);
//       }
//     } catch (error) {
//       console.error("Error:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSelectRow = (index) => {
//     setSelectedRows((prev) => ({ ...prev, [index]: !prev[index] }));
//   };

//   const handleSelectAll = () => {
//     if (selectAll) {
//       setSelectedRows({});
//     } else {
//       const newSelected = {};
//       billData.forEach((_, idx) => {
//         newSelected[idx] = true;
//       });
//       setSelectedRows(newSelected);
//     }
//     setSelectAll(!selectAll);
//   };

//   const getSelectedData = () => billData.filter((_, idx) => selectedRows[idx]);

//   const getSelectedSummary = () => {
//     const selected = getSelectedData();
//     const totalWeight = selected.reduce((sum, item) => sum + (item.weight || 0), 0);
//     const totalAmount = selected.reduce((sum, item) => sum + (item.amount || 0), 0);
//     return { totalWeight, totalAmount, totalRecords: selected.length };
//   };

//   const handleGenerateReport = async () => {
//     const selected = getSelectedData();
//     if (selected.length === 0) {
//       alert("Please select at least one record to generate report");
//       return;
//     }
//     setGenerating(true);
//     const selectedSummary = getSelectedSummary();
//     const reportData = {
//       reportId: `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//       type: "product-wise",
//       filters: {
//         clientName: filters.clientName,
//         clientGST: filters.clientGST,
//         clientState: filters.clientState,
//         clientStateCode: filters.clientStateCode,
//         clientAddress: filters.clientAddress,
//         clientCity: filters.clientCity,
//         branchName: branches.find((b) => b._id === filters.branchId)?.name || "N/A",
//         startDate: filters.startDate,
//         endDate: filters.endDate,
//         orderType: filters.orderType === "NA" ? "All Types" : filters.orderType,
//         productCategories: filters.productCategories,
//       },
//       data: selected,
//       summary: selectedSummary,
//       totalRecords: billData.length,
//       selectedRecords: selected.length,
//     };
//     await generateAndSaveReport(reportData, "product-wise", filters, async () => {
//       await loadGeneratedLRs();
//       await fetchData();
//     });
//     setGenerating(false);
//   };

//   const handleClientChange = (clientId) => {
//     const selectedClient = clients.find((c) => c._id === clientId);
//     setFilters((prev) => ({
//       ...prev,
//       clientId: clientId,
//       clientName: selectedClient?.customerName || "",
//       clientGST: selectedClient?.gstNumber || "",
//       clientState: selectedClient?.state || "",
//       clientStateCode: selectedClient?.stateCode || "",
//       clientAddress: selectedClient?.address || "",
//       clientCity: selectedClient?.city || "",
//     }));
//   };

//   const selectedCount = Object.keys(selectedRows).filter((key) => selectedRows[key]).length;

//   return (
//     <Card title="Yara - Product-Wise Billing">
//       <div className="grid grid-cols-12 gap-5">
//         <div className="col-span-12 md:col-span-3">
//           <ClientSelector value={filters.clientId} onChange={handleClientChange} clients={clients} loading={loadingClients} />
//         </div>
//         <div className="col-span-12 md:col-span-3">
//           <BranchSelector value={filters.branchId} onChange={(val) => setFilters((prev) => ({ ...prev, branchId: val }))} branches={branches} loading={loadingBranches} />
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <ProductCategorySelector value={filters.productCategories} onChange={(val) => setFilters((prev) => ({ ...prev, productCategories: val }))} />
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <PlantCodeSelector value={filters.plantId} onChange={(val) => setFilters((prev) => ({ ...prev, plantId: val }))} plants={plants} loading={loadingPlants} />
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <MonthSelector value={""} onChange={() => {}} />
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <OrderTypeSelector value={filters.orderType} onChange={(val) => setFilters((prev) => ({ ...prev, orderType: val }))} />
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <input
//             type="date"
//             value={filters.startDate}
//             onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
//             className="rounded-xl border p-2 w-full"
//           />
//           <p className="text-xs mt-1">Start Date</p>
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <input
//             type="date"
//             value={filters.endDate}
//             onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
//             className="rounded-xl border p-2 w-full"
//           />
//           <p className="text-xs mt-1">End Date</p>
//         </div>
//       </div>

//       {generatedLRs.length > 0 && (
//         <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
//           ℹ️ Already billed LR numbers: {generatedLRs.slice(0, 10).join(", ")}
//           {generatedLRs.length > 10 ? ` and ${generatedLRs.length - 10} more` : ""}
//         </div>
//       )}

//       {billData.length > 0 && (
//         <div className="mt-4">
//           <button
//             onClick={handleGenerateReport}
//             disabled={generating || selectedCount === 0}
//             className={`bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition ${
//               generating || selectedCount === 0 ? "opacity-50 cursor-not-allowed" : ""
//             }`}
//           >
//             {generating ? "Generating..." : `📄 Generate Bill (${selectedCount} Selected)`}
//           </button>
//         </div>
//       )}

//       {loading && (
//         <div className="text-center py-8">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
//           <p>Loading...</p>
//         </div>
//       )}

//       {!loading && billData.length > 0 && (
//         <div className="mt-6 overflow-x-auto">
//           <div className="mb-2 flex justify-between">
//             <span>✅ {summary.totalRecords} records</span>
//             <span className="text-blue-600">Selected: {selectedCount}</span>
//           </div>
//           <table className="min-w-full border">
//             <thead className="bg-emerald-50">
//               <tr>
//                 <th className="px-3 py-2 border w-10">
//                   <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
//                 </th>
//                 <th className="px-3 py-2 border">S.No</th>
//                 <th className="px-3 py-2 border">Date</th>
//                 <th className="px-3 py-2 border">LR No</th>
//                 <th className="px-3 py-2 border">Vehicle No</th>
//                 <th className="px-3 py-2 border">From</th>
//                 <th className="px-3 py-2 border">To</th>
//                 <th className="px-3 py-2 border">Product</th>
//                 <th className="px-3 py-2 border text-right">Weight</th>
//                 <th className="px-3 py-2 border text-right">Rate</th>
//                 <th className="px-3 py-2 border text-right">Amount</th>
//               </tr>
//             </thead>
//             <tbody>
//               {billData.map((item, idx) => (
//                 <tr key={idx} className={selectedRows[idx] ? "bg-blue-50" : ""}>
//                   <td className="px-3 py-2 border text-center">
//                     <input type="checkbox" checked={!!selectedRows[idx]} onChange={() => handleSelectRow(idx)} />
//                   </td>
//                   <td className="px-3 py-2 border">{idx + 1}</td>
//                   <td className="px-3 py-2 border">{safeFormatDate(item.date)}</td>
//                   <td className="px-3 py-2 border font-medium text-emerald-700">{item.lrNo || "-"}</td>
//                   <td className="px-3 py-2 border">{item.vehicleNo || "-"}</td>
//                   <td className="px-3 py-2 border">{item.from || "-"}</td>
//                   <td className="px-3 py-2 border">{item.to || "-"}</td>
//                   <td className="px-3 py-2 border">{item.productName || "-"}</td>
//                   <td className="px-3 py-2 border text-right">{item.weight?.toFixed(2) || "0.00"}</td>
//                   <td className="px-3 py-2 border text-right">{item.rate?.toFixed(2) || "0.00"}</td>
//                   <td className="px-3 py-2 border text-right">₹ {item.amount?.toFixed(2) || "0.00"}</td>
//                 </tr>
//               ))}
//             </tbody>
//             <tfoot className="bg-emerald-100 font-bold">
//               <tr>
//                 <td colSpan="8" className="px-3 py-2 border text-right">
//                   TOTAL
//                 </td>
//                 <td className="px-3 py-2 border text-right">{summary.totalWeight.toFixed(2)}</td>
//                 <td className="px-3 py-2 border text-right"></td>
//                 <td className="px-3 py-2 border text-right">₹ {summary.totalAmount.toFixed(2)}</td>
//               </tr>
//             </tfoot>
//           </table>
//         </div>
//       )}

//       {!loading && !filters.clientId && <div className="text-center py-8">Select a client to view data</div>}
//       {!loading && filters.clientId && billData.length === 0 && (
//         <div className="text-center py-8">
//           <p>No pending records found</p>
//           {generatedLRs.length > 0 && <p className="text-sm text-gray-500 mt-2">All LR numbers have been billed already</p>}
//         </div>
//       )}
//     </Card>
//   );
// }

// // ==================== GENERAL BILLING COMPONENT ====================
// function GeneralBillingComponent({ branches, clients, loadingBranches, loadingClients }) {
//   const [loading, setLoading] = useState(false);
//   const [billData, setBillData] = useState([]);
//   const [summary, setSummary] = useState({ totalWeight: 0, totalAmount: 0, totalRecords: 0 });
//   const [selectedRows, setSelectedRows] = useState({});
//   const [selectAll, setSelectAll] = useState(false);
//   const [generating, setGenerating] = useState(false);
//   const [generatedLRs, setGeneratedLRs] = useState([]);

//   const [filters, setFilters] = useState({
//     branchId: "",
//     clientId: "",
//     clientName: "",
//     clientGST: "",
//     clientState: "",
//     clientStateCode: "",
//     clientAddress: "",
//     clientCity: "",
//     orderType: "NA",
//     startDate: "",
//     endDate: "",
//   });

//   useEffect(() => {
//     const today = new Date();
//     const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
//     const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
//     const formatDate = (date) => date.toISOString().split("T")[0];
//     setFilters((prev) => ({ ...prev, startDate: formatDate(firstDayOfMonth), endDate: formatDate(lastDayOfMonth) }));
//     loadGeneratedLRs();
//   }, []);

//   useEffect(() => {
//     if (filters.clientId && filters.startDate && filters.endDate) fetchData();
//   }, [filters.clientId, filters.branchId, filters.orderType, filters.startDate, filters.endDate]);

//   const loadGeneratedLRs = async () => {
//     const lrs = await getGeneratedLRNumbers();
//     setGeneratedLRs(lrs);
//   };

//   const fetchData = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       // Convert "NA" to empty string for API
//       const orderTypeValue = filters.orderType === "NA" ? "" : filters.orderType;
//       const payload = {
//         type: "general",
//         branchId: filters.branchId,
//         branchName: branches.find((b) => b._id === filters.branchId)?.name || "",
//         clientId: filters.clientId,
//         clientName: filters.clientName,
//         orderType: orderTypeValue,
//         startDate: filters.startDate,
//         endDate: filters.endDate,
//         excludeLRs: generatedLRs,
//       };
//       const response = await fetch("/api/billing/general", {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
//         body: JSON.stringify(payload),
//       });
//       const data = await response.json();
//       if (data.success) {
//         const filteredData = (data.data || []).filter((item) => !generatedLRs.includes(item.lrNo));
//         setBillData(filteredData);
//         setSummary({
//           totalWeight: filteredData.reduce((s, i) => s + (i.weight || 0), 0),
//           totalAmount: filteredData.reduce((s, i) => s + (i.amount || 0), 0),
//           totalRecords: filteredData.length,
//         });
//         setSelectedRows({});
//         setSelectAll(false);
//       }
//     } catch (error) {
//       console.error("Error:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSelectRow = (index) => setSelectedRows((prev) => ({ ...prev, [index]: !prev[index] }));
//   const handleSelectAll = () => {
//     if (selectAll) {
//       setSelectedRows({});
//     } else {
//       const newSelected = {};
//       billData.forEach((_, idx) => (newSelected[idx] = true));
//       setSelectedRows(newSelected);
//     }
//     setSelectAll(!selectAll);
//   };
//   const getSelectedData = () => billData.filter((_, idx) => selectedRows[idx]);
//   const getSelectedSummary = () => {
//     const selected = getSelectedData();
//     return {
//       totalWeight: selected.reduce((s, i) => s + (i.weight || 0), 0),
//       totalAmount: selected.reduce((s, i) => s + (i.amount || 0), 0),
//       totalRecords: selected.length,
//     };
//   };

//   const handleClientChange = (clientId) => {
//     const selectedClient = clients.find((c) => c._id === clientId);
//     setFilters((prev) => ({
//       ...prev,
//       clientId: clientId,
//       clientName: selectedClient?.customerName || "",
//       clientGST: selectedClient?.gstNumber || "",
//       clientState: selectedClient?.state || "",
//       clientStateCode: selectedClient?.stateCode || "",
//       clientAddress: selectedClient?.address || "",
//       clientCity: selectedClient?.city || "",
//     }));
//   };

//   const handleGenerateReport = async () => {
//     const selected = getSelectedData();
//     if (selected.length === 0) return alert("Please select at least one record to generate report");
//     setGenerating(true);
//     const selectedSummary = getSelectedSummary();
//     const reportData = {
//       reportId: `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//       type: "general",
//       filters: {
//         clientName: filters.clientName,
//         clientGST: filters.clientGST,
//         clientState: filters.clientState,
//         clientStateCode: filters.clientStateCode,
//         clientAddress: filters.clientAddress,
//         clientCity: filters.clientCity,
//         branchName: branches.find((b) => b._id === filters.branchId)?.name || "N/A",
//         startDate: filters.startDate,
//         endDate: filters.endDate,
//         orderType: filters.orderType === "NA" ? "All Types" : filters.orderType,
//       },
//       data: selected,
//       summary: selectedSummary,
//       totalRecords: billData.length,
//       selectedRecords: selected.length,
//     };
//     await generateAndSaveReport(reportData, "general", filters, async () => {
//       await loadGeneratedLRs();
//       await fetchData();
//     });
//     setGenerating(false);
//   };

//   const selectedCount = Object.keys(selectedRows).filter((k) => selectedRows[k]).length;

//   return (
//     <Card title="General - Billing">
//       <div className="grid grid-cols-12 gap-5">
//         <div className="col-span-12 md:col-span-3">
//           <ClientSelector value={filters.clientId} onChange={handleClientChange} clients={clients} loading={loadingClients} />
//         </div>
//         <div className="col-span-12 md:col-span-3">
//           <BranchSelector value={filters.branchId} onChange={(val) => setFilters((prev) => ({ ...prev, branchId: val }))} branches={branches} loading={loadingBranches} />
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <MonthSelector value={""} onChange={() => {}} />
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <OrderTypeSelector value={filters.orderType} onChange={(val) => setFilters((prev) => ({ ...prev, orderType: val }))} />
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <input
//             type="date"
//             value={filters.startDate}
//             onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
//             className="rounded-xl border p-2 w-full"
//           />
//           <p className="text-xs mt-1">Start Date</p>
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <input
//             type="date"
//             value={filters.endDate}
//             onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
//             className="rounded-xl border p-2 w-full"
//           />
//           <p className="text-xs mt-1">End Date</p>
//         </div>
//       </div>

//       {generatedLRs.length > 0 && (
//         <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
//           ℹ️ Already billed LR numbers: {generatedLRs.slice(0, 10).join(", ")}
//           {generatedLRs.length > 10 ? ` and ${generatedLRs.length - 10} more` : ""}
//         </div>
//       )}

//       {billData.length > 0 && (
//         <div className="mt-4">
//           <button
//             onClick={handleGenerateReport}
//             disabled={generating || selectedCount === 0}
//             className={`bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition ${
//               generating || selectedCount === 0 ? "opacity-50 cursor-not-allowed" : ""
//             }`}
//           >
//             {generating ? "Generating..." : `📄 Generate Bill (${selectedCount} Selected)`}
//           </button>
//         </div>
//       )}

//       {loading && (
//         <div className="text-center py-8">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
//           <p>Loading...</p>
//         </div>
//       )}

//       {!loading && billData.length > 0 && (
//         <div className="mt-6 overflow-x-auto">
//           <div className="mb-2 flex justify-between">
//             <span>✅ {summary.totalRecords} records</span>
//             <span className="text-blue-600">Selected: {selectedCount}</span>
//           </div>
//           <table className="min-w-full border">
//             <thead className="bg-emerald-50">
//               <tr>
//                 <th className="px-3 py-2 border w-10">
//                   <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
//                 </th>
//                 <th className="px-3 py-2 border">S.No</th>
//                 <th className="px-3 py-2 border">Date</th>
//                 <th className="px-3 py-2 border">LR No</th>
//                 <th className="px-3 py-2 border">Vehicle No</th>
//                 <th className="px-3 py-2 border">From</th>
//                 <th className="px-3 py-2 border">To</th>
//                 <th className="px-3 py-2 border">Product</th>
//                 <th className="px-3 py-2 border text-right">Weight</th>
//                 <th className="px-3 py-2 border text-right">Rate</th>
//                 <th className="px-3 py-2 border text-right">Amount</th>
//               </tr>
//             </thead>
//             <tbody>
//               {billData.map((item, idx) => (
//                 <tr key={idx} className={selectedRows[idx] ? "bg-blue-50" : ""}>
//                   <td className="px-3 py-2 border text-center">
//                     <input type="checkbox" checked={!!selectedRows[idx]} onChange={() => handleSelectRow(idx)} />
//                   </td>
//                   <td className="px-3 py-2 border">{idx + 1}</td>
//                   <td className="px-3 py-2 border">{safeFormatDate(item.date)}</td>
//                   <td className="px-3 py-2 border font-medium text-emerald-700">{item.lrNo || "-"}</td>
//                   <td className="px-3 py-2 border">{item.vehicleNo || "-"}</td>
//                   <td className="px-3 py-2 border">{item.from || "-"}</td>
//                   <td className="px-3 py-2 border">{item.to || "-"}</td>
//                   <td className="px-3 py-2 border">{item.productName || "-"}</td>
//                   <td className="px-3 py-2 border text-right">{item.weight?.toFixed(2) || "0.00"}</td>
//                   <td className="px-3 py-2 border text-right">{item.rate?.toFixed(2) || "0.00"}</td>
//                   <td className="px-3 py-2 border text-right">₹ {item.amount?.toFixed(2) || "0.00"}</td>
//                 </tr>
//               ))}
//             </tbody>
//             <tfoot className="bg-emerald-100 font-bold">
//               <tr>
//                 <td colSpan="8" className="px-3 py-2 border text-right">
//                   TOTAL
//                 </td>
//                 <td className="px-3 py-2 border text-right">{summary.totalWeight.toFixed(2)}</td>
//                 <td className="px-3 py-2 border text-right"></td>
//                 <td className="px-3 py-2 border text-right">₹ {summary.totalAmount.toFixed(2)}</td>
//               </tr>
//             </tfoot>
//           </table>
//         </div>
//       )}
//       {!loading && !filters.clientId && <div className="text-center py-8">Select a client to view data</div>}
//       {!loading && filters.clientId && billData.length === 0 && (
//         <div className="text-center py-8">
//           <p>No pending records found</p>
//           {generatedLRs.length > 0 && <p className="text-sm text-gray-500 mt-2">All LR numbers have been billed already</p>}
//         </div>
//       )}
//     </Card>
//   );
// }

// // ==================== DETENTION BILLING COMPONENT ====================
// function DetentionBillingComponent({ branches, clients, loadingBranches, loadingClients }) {
//   const [loading, setLoading] = useState(false);
//   const [billData, setBillData] = useState([]);
//   const [summary, setSummary] = useState({ totalAmount: 0, totalRecords: 0 });
//   const [selectedRows, setSelectedRows] = useState({});
//   const [selectAll, setSelectAll] = useState(false);
//   const [generating, setGenerating] = useState(false);
//   const [generatedLRs, setGeneratedLRs] = useState([]);

//   const [filters, setFilters] = useState({
//     branchId: "",
//     clientId: "",
//     clientName: "",
//     clientGST: "",
//     clientState: "",
//     clientStateCode: "",
//     clientAddress: "",
//     clientCity: "",
//     detention: "",
//     startDate: "",
//     endDate: "",
//   });

//   useEffect(() => {
//     const today = new Date();
//     const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
//     const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
//     const formatDate = (date) => date.toISOString().split("T")[0];
//     setFilters((prev) => ({ ...prev, startDate: formatDate(firstDayOfMonth), endDate: formatDate(lastDayOfMonth) }));
//     loadGeneratedLRs();
//   }, []);

//   useEffect(() => {
//     if (filters.clientId && filters.startDate && filters.endDate) fetchData();
//   }, [filters.clientId, filters.branchId, filters.detention, filters.startDate, filters.endDate]);

//   const loadGeneratedLRs = async () => {
//     const lrs = await getGeneratedLRNumbers();
//     setGeneratedLRs(lrs);
//   };

//   const fetchData = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const payload = {
//         type: "detention",
//         branchId: filters.branchId,
//         branchName: branches.find((b) => b._id === filters.branchId)?.name || "",
//         clientId: filters.clientId,
//         clientName: filters.clientName,
//         detention: filters.detention,
//         startDate: filters.startDate,
//         endDate: filters.endDate,
//         excludeLRs: generatedLRs,
//       };
//       const response = await fetch("/api/billing/detention", {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
//         body: JSON.stringify(payload),
//       });
//       const data = await response.json();
//       if (data.success) {
//         const filteredData = (data.data || []).filter((item) => !generatedLRs.includes(item.lrNo));
//         setBillData(filteredData);
//         setSummary({
//           totalAmount: filteredData.reduce((s, i) => s + (i.amount || 0), 0),
//           totalRecords: filteredData.length,
//         });
//         setSelectedRows({});
//         setSelectAll(false);
//       }
//     } catch (error) {
//       console.error("Error:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSelectRow = (index) => setSelectedRows((prev) => ({ ...prev, [index]: !prev[index] }));
//   const handleSelectAll = () => {
//     if (selectAll) {
//       setSelectedRows({});
//     } else {
//       const newSelected = {};
//       billData.forEach((_, idx) => (newSelected[idx] = true));
//       setSelectedRows(newSelected);
//     }
//     setSelectAll(!selectAll);
//   };
//   const getSelectedData = () => billData.filter((_, idx) => selectedRows[idx]);
//   const getSelectedSummary = () => {
//     const selected = getSelectedData();
//     return {
//       totalAmount: selected.reduce((s, i) => s + (i.amount || 0), 0),
//       totalRecords: selected.length,
//     };
//   };

//   const handleClientChange = (clientId) => {
//     const selectedClient = clients.find((c) => c._id === clientId);
//     setFilters((prev) => ({
//       ...prev,
//       clientId: clientId,
//       clientName: selectedClient?.customerName || "",
//       clientGST: selectedClient?.gstNumber || "",
//       clientState: selectedClient?.state || "",
//       clientStateCode: selectedClient?.stateCode || "",
//       clientAddress: selectedClient?.address || "",
//       clientCity: selectedClient?.city || "",
//     }));
//   };

//   const handleGenerateReport = async () => {
//     const selected = getSelectedData();
//     if (selected.length === 0) return alert("Please select at least one record to generate report");
//     setGenerating(true);
//     const selectedSummary = getSelectedSummary();
//     const reportData = {
//       reportId: `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//       type: "detention",
//       filters: {
//         clientName: filters.clientName,
//         clientGST: filters.clientGST,
//         clientState: filters.clientState,
//         clientStateCode: filters.clientStateCode,
//         clientAddress: filters.clientAddress,
//         clientCity: filters.clientCity,
//         branchName: branches.find((b) => b._id === filters.branchId)?.name || "N/A",
//         startDate: filters.startDate,
//         endDate: filters.endDate,
//         detention: filters.detention,
//       },
//       data: selected,
//       summary: selectedSummary,
//       totalRecords: billData.length,
//       selectedRecords: selected.length,
//     };
//     await generateAndSaveReport(reportData, "detention", filters, async () => {
//       await loadGeneratedLRs();
//       await fetchData();
//     });
//     setGenerating(false);
//   };

//   const selectedCount = Object.keys(selectedRows).filter((k) => selectedRows[k]).length;

//   return (
//     <Card title="Detention - Billing">
//       <div className="grid grid-cols-12 gap-5">
//         <div className="col-span-12 md:col-span-3">
//           <ClientSelector value={filters.clientId} onChange={handleClientChange} clients={clients} loading={loadingClients} />
//         </div>
//         <div className="col-span-12 md:col-span-3">
//           <BranchSelector value={filters.branchId} onChange={(val) => setFilters((prev) => ({ ...prev, branchId: val }))} branches={branches} loading={loadingBranches} />
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <label className="block text-xs font-bold mb-1">Detention</label>
//           <input
//             type="text"
//             value={filters.detention}
//             onChange={(e) => setFilters((prev) => ({ ...prev, detention: e.target.value }))}
//             className="rounded-xl border p-2 w-full"
//             placeholder="Detention Type"
//           />
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <MonthSelector value={""} onChange={() => {}} />
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <input
//             type="date"
//             value={filters.startDate}
//             onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
//             className="rounded-xl border p-2 w-full"
//           />
//           <p className="text-xs mt-1">Start Date</p>
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <input
//             type="date"
//             value={filters.endDate}
//             onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
//             className="rounded-xl border p-2 w-full"
//           />
//           <p className="text-xs mt-1">End Date</p>
//         </div>
//       </div>

//       {billData.length > 0 && (
//         <div className="mt-4">
//           <button
//             onClick={handleGenerateReport}
//             disabled={generating || selectedCount === 0}
//             className={`bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition ${
//               generating || selectedCount === 0 ? "opacity-50 cursor-not-allowed" : ""
//             }`}
//           >
//             {generating ? "Generating..." : `📄 Generate Bill (${selectedCount} Selected)`}
//           </button>
//         </div>
//       )}

//       {loading && (
//         <div className="text-center py-8">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
//           <p>Loading...</p>
//         </div>
//       )}

//       {!loading && billData.length > 0 && (
//         <div className="mt-6 overflow-x-auto">
//           <div className="mb-2 flex justify-between">
//             <span>✅ {summary.totalRecords} records</span>
//             <span className="text-blue-600">Selected: {selectedCount}</span>
//           </div>
//           <table className="min-w-full border">
//             <thead className="bg-emerald-50">
//               <tr>
//                 <th className="px-3 py-2 border w-10">
//                   <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
//                 </th>
//                 <th className="px-3 py-2 border">S.No</th>
//                 <th className="px-3 py-2 border">Date</th>
//                 <th className="px-3 py-2 border">LR No</th>
//                 <th className="px-3 py-2 border">Vehicle No</th>
//                 <th className="px-3 py-2 border">From</th>
//                 <th className="px-3 py-2 border">To</th>
//                 <th className="px-3 py-2 border">Detention Type</th>
//                 <th className="px-3 py-2 border text-right">Amount</th>
//               </tr>
//             </thead>
//             <tbody>
//               {billData.map((item, idx) => (
//                 <tr key={idx} className={selectedRows[idx] ? "bg-blue-50" : ""}>
//                   <td className="px-3 py-2 border text-center">
//                     <input type="checkbox" checked={!!selectedRows[idx]} onChange={() => handleSelectRow(idx)} />
//                   </td>
//                   <td className="px-3 py-2 border">{idx + 1}</td>
//                   <td className="px-3 py-2 border">{safeFormatDate(item.date)}</td>
//                   <td className="px-3 py-2 border font-medium text-emerald-700">{item.lrNo || "-"}</td>
//                   <td className="px-3 py-2 border">{item.vehicleNo || "-"}</td>
//                   <td className="px-3 py-2 border">{item.from || "-"}</td>
//                   <td className="px-3 py-2 border">{item.to || "-"}</td>
//                   <td className="px-3 py-2 border">{item.detentionType || filters.detention || "-"}</td>
//                   <td className="px-3 py-2 border text-right">₹ {item.amount?.toFixed(2) || "0.00"}</td>
//                 </tr>
//               ))}
//             </tbody>
//             <tfoot className="bg-emerald-100 font-bold">
//               <tr>
//                 <td colSpan="8" className="px-3 py-2 border text-right">
//                   TOTAL
//                 </td>
//                 <td className="px-3 py-2 border text-right">₹ {summary.totalAmount.toFixed(2)}</td>
//               </tr>
//             </tfoot>
//           </table>
//         </div>
//       )}
//       {!loading && !filters.clientId && <div className="text-center py-8">Select a client to view data</div>}
//       {!loading && filters.clientId && billData.length === 0 && (
//         <div className="text-center py-8">
//           <p>No pending records found</p>
//           {generatedLRs.length > 0 && <p className="text-sm text-gray-500 mt-2">All LR numbers have been billed already</p>}
//         </div>
//       )}
//     </Card>
//   );
// }

// // ==================== CANCELLATION BILLING COMPONENT ====================
// function CancellationBillingComponent({ branches, clients, loadingBranches, loadingClients }) {
//   const [loading, setLoading] = useState(false);
//   const [billData, setBillData] = useState([]);
//   const [summary, setSummary] = useState({ totalAmount: 0, totalRecords: 0 });
//   const [selectedRows, setSelectedRows] = useState({});
//   const [selectAll, setSelectAll] = useState(false);
//   const [generating, setGenerating] = useState(false);
//   const [generatedLRs, setGeneratedLRs] = useState([]);

//   const [filters, setFilters] = useState({
//     branchId: "",
//     clientId: "",
//     clientName: "",
//     clientGST: "",
//     clientState: "",
//     clientStateCode: "",
//     clientAddress: "",
//     clientCity: "",
//     cancellation: "",
//     startDate: "",
//     endDate: "",
//   });

//   useEffect(() => {
//     const today = new Date();
//     const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
//     const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
//     const formatDate = (date) => date.toISOString().split("T")[0];
//     setFilters((prev) => ({ ...prev, startDate: formatDate(firstDayOfMonth), endDate: formatDate(lastDayOfMonth) }));
//     loadGeneratedLRs();
//   }, []);

//   useEffect(() => {
//     if (filters.clientId && filters.startDate && filters.endDate) fetchData();
//   }, [filters.clientId, filters.branchId, filters.cancellation, filters.startDate, filters.endDate]);

//   const loadGeneratedLRs = async () => {
//     const lrs = await getGeneratedLRNumbers();
//     setGeneratedLRs(lrs);
//   };

//   const fetchData = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const payload = {
//         type: "cancellation",
//         branchId: filters.branchId,
//         branchName: branches.find((b) => b._id === filters.branchId)?.name || "",
//         clientId: filters.clientId,
//         clientName: filters.clientName,
//         cancellation: filters.cancellation,
//         startDate: filters.startDate,
//         endDate: filters.endDate,
//         excludeLRs: generatedLRs,
//       };
//       const response = await fetch("/api/billing/cancellation", {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
//         body: JSON.stringify(payload),
//       });
//       const data = await response.json();
//       if (data.success) {
//         const filteredData = (data.data || []).filter((item) => !generatedLRs.includes(item.lrNo));
//         setBillData(filteredData);
//         setSummary({
//           totalAmount: filteredData.reduce((s, i) => s + (i.amount || 0), 0),
//           totalRecords: filteredData.length,
//         });
//         setSelectedRows({});
//         setSelectAll(false);
//       }
//     } catch (error) {
//       console.error("Error:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSelectRow = (index) => setSelectedRows((prev) => ({ ...prev, [index]: !prev[index] }));
//   const handleSelectAll = () => {
//     if (selectAll) {
//       setSelectedRows({});
//     } else {
//       const newSelected = {};
//       billData.forEach((_, idx) => (newSelected[idx] = true));
//       setSelectedRows(newSelected);
//     }
//     setSelectAll(!selectAll);
//   };
//   const getSelectedData = () => billData.filter((_, idx) => selectedRows[idx]);
//   const getSelectedSummary = () => {
//     const selected = getSelectedData();
//     return {
//       totalAmount: selected.reduce((s, i) => s + (i.amount || 0), 0),
//       totalRecords: selected.length,
//     };
//   };

//   const handleClientChange = (clientId) => {
//     const selectedClient = clients.find((c) => c._id === clientId);
//     setFilters((prev) => ({
//       ...prev,
//       clientId: clientId,
//       clientName: selectedClient?.customerName || "",
//       clientGST: selectedClient?.gstNumber || "",
//       clientState: selectedClient?.state || "",
//       clientStateCode: selectedClient?.stateCode || "",
//       clientAddress: selectedClient?.address || "",
//       clientCity: selectedClient?.city || "",
//     }));
//   };

//   const handleGenerateReport = async () => {
//     const selected = getSelectedData();
//     if (selected.length === 0) return alert("Please select at least one record to generate report");
//     setGenerating(true);
//     const selectedSummary = getSelectedSummary();
//     const reportData = {
//       reportId: `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//       type: "cancellation",
//       filters: {
//         clientName: filters.clientName,
//         clientGST: filters.clientGST,
//         clientState: filters.clientState,
//         clientStateCode: filters.clientStateCode,
//         clientAddress: filters.clientAddress,
//         clientCity: filters.clientCity,
//         branchName: branches.find((b) => b._id === filters.branchId)?.name || "N/A",
//         startDate: filters.startDate,
//         endDate: filters.endDate,
//         cancellation: filters.cancellation,
//       },
//       data: selected,
//       summary: selectedSummary,
//       totalRecords: billData.length,
//       selectedRecords: selected.length,
//     };
//     await generateAndSaveReport(reportData, "cancellation", filters, async () => {
//       await loadGeneratedLRs();
//       await fetchData();
//     });
//     setGenerating(false);
//   };

//   const selectedCount = Object.keys(selectedRows).filter((k) => selectedRows[k]).length;

//   return (
//     <Card title="Cancellation - Billing">
//       <div className="grid grid-cols-12 gap-5">
//         <div className="col-span-12 md:col-span-3">
//           <ClientSelector value={filters.clientId} onChange={handleClientChange} clients={clients} loading={loadingClients} />
//         </div>
//         <div className="col-span-12 md:col-span-3">
//           <BranchSelector value={filters.branchId} onChange={(val) => setFilters((prev) => ({ ...prev, branchId: val }))} branches={branches} loading={loadingBranches} />
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <label className="block text-xs font-bold mb-1">Cancellation</label>
//           <input
//             type="text"
//             value={filters.cancellation}
//             onChange={(e) => setFilters((prev) => ({ ...prev, cancellation: e.target.value }))}
//             className="rounded-xl border p-2 w-full"
//             placeholder="Cancellation Type"
//           />
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <MonthSelector value={""} onChange={() => {}} />
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <input
//             type="date"
//             value={filters.startDate}
//             onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
//             className="rounded-xl border p-2 w-full"
//           />
//           <p className="text-xs mt-1">Start Date</p>
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <input
//             type="date"
//             value={filters.endDate}
//             onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
//             className="rounded-xl border p-2 w-full"
//           />
//           <p className="text-xs mt-1">End Date</p>
//         </div>
//       </div>

//       {billData.length > 0 && (
//         <div className="mt-4">
//           <button
//             onClick={handleGenerateReport}
//             disabled={generating || selectedCount === 0}
//             className={`bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition ${
//               generating || selectedCount === 0 ? "opacity-50 cursor-not-allowed" : ""
//             }`}
//           >
//             {generating ? "Generating..." : `📄 Generate Bill (${selectedCount} Selected)`}
//           </button>
//         </div>
//       )}

//       {loading && (
//         <div className="text-center py-8">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
//           <p>Loading...</p>
//         </div>
//       )}

//       {!loading && billData.length > 0 && (
//         <div className="mt-6 overflow-x-auto">
//           <div className="mb-2 flex justify-between">
//             <span>✅ {summary.totalRecords} records</span>
//             <span className="text-blue-600">Selected: {selectedCount}</span>
//           </div>
//           <table className="min-w-full border">
//             <thead className="bg-emerald-50">
//               <tr>
//                 <th className="px-3 py-2 border w-10">
//                   <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
//                 </th>
//                 <th className="px-3 py-2 border">S.No</th>
//                 <th className="px-3 py-2 border">Date</th>
//                 <th className="px-3 py-2 border">LR No</th>
//                 <th className="px-3 py-2 border">Vehicle No</th>
//                 <th className="px-3 py-2 border">From</th>
//                 <th className="px-3 py-2 border">To</th>
//                 <th className="px-3 py-2 border">Cancellation Type</th>
//                 <th className="px-3 py-2 border text-right">Amount</th>
//               </tr>
//             </thead>
//             <tbody>
//               {billData.map((item, idx) => (
//                 <tr key={idx} className={selectedRows[idx] ? "bg-blue-50" : ""}>
//                   <td className="px-3 py-2 border text-center">
//                     <input type="checkbox" checked={!!selectedRows[idx]} onChange={() => handleSelectRow(idx)} />
//                   </td>
//                   <td className="px-3 py-2 border">{idx + 1}</td>
//                   <td className="px-3 py-2 border">{safeFormatDate(item.date)}</td>
//                   <td className="px-3 py-2 border font-medium text-emerald-700">{item.lrNo || "-"}</td>
//                   <td className="px-3 py-2 border">{item.vehicleNo || "-"}</td>
//                   <td className="px-3 py-2 border">{item.from || "-"}</td>
//                   <td className="px-3 py-2 border">{item.to || "-"}</td>
//                   <td className="px-3 py-2 border">{item.cancellationType || filters.cancellation || "-"}</td>
//                   <td className="px-3 py-2 border text-right">₹ {item.amount?.toFixed(2) || "0.00"}</td>
//                 </tr>
//               ))}
//             </tbody>
//             <tfoot className="bg-emerald-100 font-bold">
//               <tr>
//                 <td colSpan="8" className="px-3 py-2 border text-right">
//                   TOTAL
//                 </td>
//                 <td className="px-3 py-2 border text-right">₹ {summary.totalAmount.toFixed(2)}</td>
//               </tr>
//             </tfoot>
//           </table>
//         </div>
//       )}
//       {!loading && !filters.clientId && <div className="text-center py-8">Select a client to view data</div>}
//       {!loading && filters.clientId && billData.length === 0 && (
//         <div className="text-center py-8">
//           <p>No pending records found</p>
//           {generatedLRs.length > 0 && <p className="text-sm text-gray-500 mt-2">All LR numbers have been billed already</p>}
//         </div>
//       )}
//     </Card>
//   );
// }

// // ==================== OTHER BILLING COMPONENT ====================
// function OtherBillingComponent({ branches, clients, loadingBranches, loadingClients }) {
//   const [loading, setLoading] = useState(false);
//   const [billData, setBillData] = useState([]);
//   const [summary, setSummary] = useState({ totalAmount: 0, totalRecords: 0 });
//   const [selectedRows, setSelectedRows] = useState({});
//   const [selectAll, setSelectAll] = useState(false);
//   const [generating, setGenerating] = useState(false);
//   const [generatedLRs, setGeneratedLRs] = useState([]);

//   const [filters, setFilters] = useState({
//     branchId: "",
//     clientId: "",
//     clientName: "",
//     clientGST: "",
//     clientState: "",
//     clientStateCode: "",
//     clientAddress: "",
//     clientCity: "",
//     type: "Cancellation",
//     startDate: "",
//     endDate: "",
//   });

//   useEffect(() => {
//     const today = new Date();
//     const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
//     const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
//     const formatDate = (date) => date.toISOString().split("T")[0];
//     setFilters((prev) => ({ ...prev, startDate: formatDate(firstDayOfMonth), endDate: formatDate(lastDayOfMonth) }));
//     loadGeneratedLRs();
//   }, []);

//   useEffect(() => {
//     if (filters.clientId && filters.startDate && filters.endDate) fetchData();
//   }, [filters.clientId, filters.branchId, filters.type, filters.startDate, filters.endDate]);

//   const loadGeneratedLRs = async () => {
//     const lrs = await getGeneratedLRNumbers();
//     setGeneratedLRs(lrs);
//   };

//   const fetchData = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const payload = {
//         type: "other",
//         branchId: filters.branchId,
//         branchName: branches.find((b) => b._id === filters.branchId)?.name || "",
//         clientId: filters.clientId,
//         clientName: filters.clientName,
//         billingType: filters.type,
//         startDate: filters.startDate,
//         endDate: filters.endDate,
//         excludeLRs: generatedLRs,
//       };
//       const response = await fetch("/api/billing/other", {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
//         body: JSON.stringify(payload),
//       });
//       const data = await response.json();
//       if (data.success) {
//         const filteredData = (data.data || []).filter((item) => !generatedLRs.includes(item.lrNo));
//         setBillData(filteredData);
//         setSummary({
//           totalAmount: filteredData.reduce((s, i) => s + (i.amount || 0), 0),
//           totalRecords: filteredData.length,
//         });
//         setSelectedRows({});
//         setSelectAll(false);
//       }
//     } catch (error) {
//       console.error("Error:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSelectRow = (index) => setSelectedRows((prev) => ({ ...prev, [index]: !prev[index] }));
//   const handleSelectAll = () => {
//     if (selectAll) {
//       setSelectedRows({});
//     } else {
//       const newSelected = {};
//       billData.forEach((_, idx) => (newSelected[idx] = true));
//       setSelectedRows(newSelected);
//     }
//     setSelectAll(!selectAll);
//   };
//   const getSelectedData = () => billData.filter((_, idx) => selectedRows[idx]);
//   const getSelectedSummary = () => {
//     const selected = getSelectedData();
//     return {
//       totalAmount: selected.reduce((s, i) => s + (i.amount || 0), 0),
//       totalRecords: selected.length,
//     };
//   };

//   const handleClientChange = (clientId) => {
//     const selectedClient = clients.find((c) => c._id === clientId);
//     setFilters((prev) => ({
//       ...prev,
//       clientId: clientId,
//       clientName: selectedClient?.customerName || "",
//       clientGST: selectedClient?.gstNumber || "",
//       clientState: selectedClient?.state || "",
//       clientStateCode: selectedClient?.stateCode || "",
//       clientAddress: selectedClient?.address || "",
//       clientCity: selectedClient?.city || "",
//     }));
//   };

//   const handleGenerateReport = async () => {
//     const selected = getSelectedData();
//     if (selected.length === 0) return alert("Please select at least one record to generate report");
//     setGenerating(true);
//     const selectedSummary = getSelectedSummary();
//     const reportData = {
//       reportId: `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//       type: "other",
//       filters: {
//         clientName: filters.clientName,
//         clientGST: filters.clientGST,
//         clientState: filters.clientState,
//         clientStateCode: filters.clientStateCode,
//         clientAddress: filters.clientAddress,
//         clientCity: filters.clientCity,
//         branchName: branches.find((b) => b._id === filters.branchId)?.name || "N/A",
//         startDate: filters.startDate,
//         endDate: filters.endDate,
//         billingType: filters.type,
//       },
//       data: selected,
//       summary: selectedSummary,
//       totalRecords: billData.length,
//       selectedRecords: selected.length,
//     };
//     await generateAndSaveReport(reportData, "other", filters, async () => {
//       await loadGeneratedLRs();
//       await fetchData();
//     });
//     setGenerating(false);
//   };

//   const selectedCount = Object.keys(selectedRows).filter((k) => selectedRows[k]).length;

//   return (
//     <Card title="Other - Billing">
//       <div className="grid grid-cols-12 gap-5">
//         <div className="col-span-12 md:col-span-3">
//           <ClientSelector value={filters.clientId} onChange={handleClientChange} clients={clients} loading={loadingClients} />
//         </div>
//         <div className="col-span-12 md:col-span-3">
//           <BranchSelector value={filters.branchId} onChange={(val) => setFilters((prev) => ({ ...prev, branchId: val }))} branches={branches} loading={loadingBranches} />
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <label className="block text-xs font-bold mb-1">Type</label>
//           <select
//             value={filters.type}
//             onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
//             className="rounded-xl border p-2 w-full"
//           >
//             <option value="Cancellation">Cancellation</option>
//             <option value="Detention">Detention</option>
//             <option value="Demurrage">Demurrage</option>
//             <option value="Other Charges">Other Charges</option>
//           </select>
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <MonthSelector value={""} onChange={() => {}} />
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <input
//             type="date"
//             value={filters.startDate}
//             onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
//             className="rounded-xl border p-2 w-full"
//           />
//           <p className="text-xs mt-1">Start Date</p>
//         </div>
//         <div className="col-span-12 md:col-span-2">
//           <input
//             type="date"
//             value={filters.endDate}
//             onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
//             className="rounded-xl border p-2 w-full"
//           />
//           <p className="text-xs mt-1">End Date</p>
//         </div>
//       </div>

//       {billData.length > 0 && (
//         <div className="mt-4">
//           <button
//             onClick={handleGenerateReport}
//             disabled={generating || selectedCount === 0}
//             className={`bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition ${
//               generating || selectedCount === 0 ? "opacity-50 cursor-not-allowed" : ""
//             }`}
//           >
//             {generating ? "Generating..." : `📄 Generate Bill (${selectedCount} Selected)`}
//           </button>
//         </div>
//       )}

//       {loading && (
//         <div className="text-center py-8">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
//           <p>Loading...</p>
//         </div>
//       )}

//       {!loading && billData.length > 0 && (
//         <div className="mt-6 overflow-x-auto">
//           <div className="mb-2 flex justify-between">
//             <span>✅ {summary.totalRecords} records</span>
//             <span className="text-blue-600">Selected: {selectedCount}</span>
//           </div>
//           <table className="min-w-full border">
//             <thead className="bg-emerald-50">
//               <tr>
//                 <th className="px-3 py-2 border w-10">
//                   <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
//                 </th>
//                 <th className="px-3 py-2 border">S.No</th>
//                 <th className="px-3 py-2 border">Date</th>
//                 <th className="px-3 py-2 border">LR No</th>
//                 <th className="px-3 py-2 border">Vehicle No</th>
//                 <th className="px-3 py-2 border">From</th>
//                 <th className="px-3 py-2 border">To</th>
//                 <th className="px-3 py-2 border">Bill Type</th>
//                 <th className="px-3 py-2 border text-right">Amount</th>
//               </tr>
//             </thead>
//             <tbody>
//               {billData.map((item, idx) => (
//                 <tr key={idx} className={selectedRows[idx] ? "bg-blue-50" : ""}>
//                   <td className="px-3 py-2 border text-center">
//                     <input type="checkbox" checked={!!selectedRows[idx]} onChange={() => handleSelectRow(idx)} />
//                   </td>
//                   <td className="px-3 py-2 border">{idx + 1}</td>
//                   <td className="px-3 py-2 border">{safeFormatDate(item.date)}</td>
//                   <td className="px-3 py-2 border font-medium text-emerald-700">{item.lrNo || "-"}</td>
//                   <td className="px-3 py-2 border">{item.vehicleNo || "-"}</td>
//                   <td className="px-3 py-2 border">{item.from || "-"}</td>
//                   <td className="px-3 py-2 border">{item.to || "-"}</td>
//                   <td className="px-3 py-2 border">{item.billingType || filters.type || "-"}</td>
//                   <td className="px-3 py-2 border text-right">₹ {item.amount?.toFixed(2) || "0.00"}</td>
//                 </tr>
//               ))}
//             </tbody>
//             <tfoot className="bg-emerald-100 font-bold">
//               <tr>
//                 <td colSpan="8" className="px-3 py-2 border text-right">
//                   TOTAL
//                 </td>
//                 <td className="px-3 py-2 border text-right">₹ {summary.totalAmount.toFixed(2)}</td>
//               </tr>
//             </tfoot>
//           </table>
//         </div>
//       )}
//       {!loading && !filters.clientId && <div className="text-center py-8">Select a client to view data</div>}
//       {!loading && filters.clientId && billData.length === 0 && (
//         <div className="text-center py-8">
//           <p>No pending records found</p>
//           {generatedLRs.length > 0 && <p className="text-sm text-gray-500 mt-2">All LR numbers have been billed already</p>}
//         </div>
//       )}
//     </Card>
//   );
// }

// // ==================== MAIN BILLING PAGE ====================
// export default function BillingPage() {
//   const router = useRouter();
//   const [loadingBranches, setLoadingBranches] = useState(false);
//   const [loadingClients, setLoadingClients] = useState(false);
//   const [loadingPlants, setLoadingPlants] = useState(false);
//   const [selectedBillingType, setSelectedBillingType] = useState("");
//   const [branches, setBranches] = useState([]);
//   const [clients, setClients] = useState([]);
//   const [plants, setPlants] = useState([]);

//   const fetchBranches = async () => {
//     setLoadingBranches(true);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/branches', { headers: { Authorization: `Bearer ${token}` } });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) setBranches(data.data);
//     } catch (error) { console.error(error); } finally { setLoadingBranches(false); }
//   };

//   const fetchClients = async () => {
//     setLoadingClients(true);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/customers', { headers: { Authorization: `Bearer ${token}` } });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) setClients(data.data);
//     } catch (error) { console.error(error); } finally { setLoadingClients(false); }
//   };

//   const fetchPlants = async () => {
//     setLoadingPlants(true);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/plants', { headers: { Authorization: `Bearer ${token}` } });
//       const data = await res.json();
//       if (data.success && Array.isArray(data.data)) setPlants(data.data);
//     } catch (error) { console.error(error); } finally { setLoadingPlants(false); }
//   };

//   useEffect(() => { fetchBranches(); fetchClients(); fetchPlants(); }, []);

//   const renderSelectedBillingCard = () => {
//     switch(selectedBillingType) {
//       case "product-wise": 
//         return <ProductWiseBillingComponent branches={branches} clients={clients} plants={plants} loadingBranches={loadingBranches} loadingClients={loadingClients} loadingPlants={loadingPlants} />;
//       case "general": 
//         return <GeneralBillingComponent branches={branches} clients={clients} loadingBranches={loadingBranches} loadingClients={loadingClients} />;
//       case "detention": 
//         return <DetentionBillingComponent branches={branches} clients={clients} loadingBranches={loadingBranches} loadingClients={loadingClients} />;
//       case "cancellation": 
//         return <CancellationBillingComponent branches={branches} clients={clients} loadingBranches={loadingBranches} loadingClients={loadingClients} />;
//       case "other": 
//         return <OtherBillingComponent branches={branches} clients={clients} loadingBranches={loadingBranches} loadingClients={loadingClients} />;
//       default: 
//         return (
//           <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
//             <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//             </svg>
//             <p className="text-slate-500 text-lg">Please select a billing type from the dropdown above</p>
//             <p className="text-slate-400 text-sm mt-2">Choose Yara Product-Wise, General, Detention, Cancellation, or Other Billing</p>
//           </div>
//         );
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
//       <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
//         <div className="mx-auto max-w-full px-6 py-4">
//           <div className="flex items-center gap-3">
//             <button onClick={() => router.push('/admin/dashboard')} className="text-emerald-600 hover:text-emerald-800 font-medium text-sm flex items-center gap-1">
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
//               </svg>
//               Back to Dashboard
//             </button>
//             <div className="text-xl font-extrabold text-slate-900">Billing Reports</div>
//           </div>
//         </div>
//       </div>
//       <div className="mx-auto max-w-7xl p-6">
//         <BillingTypeSelector value={selectedBillingType} onChange={setSelectedBillingType} />
//         {renderSelectedBillingCard()}
//       </div>
//     </div>
//   );
// }

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermission } from "../hooks/usePermission";
import Link from "next/link";

function Card({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm mb-6 ${className}`}>
      <div className="border-b border-slate-100 px-5 py-3">
        <div className="text-base font-bold text-slate-900">{title}</div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// Branch Selector
function BranchSelector({ value, onChange, label = "Branch", branches = [], loading = false }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        disabled={loading}
      >
        <option value="">Select Branch</option>
        {branches.map((branch) => (
          <option key={branch._id} value={branch._id}>
            {branch.name} {branch.code ? `(${branch.code})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

// Client Selector
function ClientSelector({ value, onChange, label = "Client Name", clients = [], loading = false }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        disabled={loading}
      >
        <option value="">Select Client</option>
        {clients.map((client) => (
          <option key={client._id} value={client._id}>
            {client.customerName} {client.customerCode ? `(${client.customerCode})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function MonthSelector({ value, onChange, label = "Month" }) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
      >
        <option value="">Select Month</option>
        {months.map((month) => (
          <option key={month} value={month}>
            {month}
          </option>
        ))}
      </select>
    </div>
  );
}

function OrderTypeSelector({ value, onChange, label = "Order Type" }) {
  const types = ["NA", "Sales", "STO Order", "Export", "Import", "Purchase", "Return"];

  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
      >
        {types.map((type) => (
          <option key={type} value={type}>
            {type === "NA" ? "All Order Types" : type}
          </option>
        ))}
      </select>
    </div>
  );
}

function ProductCategorySelector({ value, onChange, label = "Product Categories", categories = [], loading = false }) {

  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
      >
        <option value="">{loading ? "Loading subgroups…" : "Select Category"}</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </div>
  );
}

function PlantCodeSelector({ value, onChange, label = "Plant Code", plants = [], loading = false }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        disabled={loading}
      >
        <option value="">Select Plant Code</option>
        {plants.map((plant) => (
          <option key={plant._id} value={plant._id}>
            {plant.code} - {plant.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// Billing Type Dropdown Component
function BillingTypeSelector({ value, onChange, label = "Select Billing Type" }) {
  const billingTypes = [
    { value: "product-wise", label: "Yara · Product-wise" },
    { value: "general", label: "General" },
    { value: "detention", label: "Detention" },
    { value: "cancellation", label: "Cancellation" },
    { value: "other", label: "Other charges" },
  ];

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="block text-sm font-bold text-slate-800 mb-1">{label}</label>
      <p className="mb-3 text-sm text-slate-500">Choose the charge type, then review eligible consignment records before generating a report.</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full md:w-[28rem] rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
      >
        <option value="">-- Select Billing Type --</option>
        {billingTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Safe date formatter
function safeFormatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch (error) {
    return dateStr;
  }
}

// Save report to backend and generate PDF
async function generateAndSaveReport(reportData, type, filters, onSuccess) {
  try {
    const token = localStorage.getItem("token");
    const requestedBillNumber = reportData.billNumber || (type === "product-wise" ? "" : `BILL/${Date.now()}/${Math.floor(Math.random() * 1000)}`);
    const savedReportData = { ...reportData, billNumber: requestedBillNumber };

    const saveResponse = await fetch("/api/saved-reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(savedReportData),
    });
    const saveData = await saveResponse.json();

    if (!saveData.success) {
      alert("Failed to save report");
      return false;
    }

    const saved = saveData.data || savedReportData;
    const billNumber = saved.billNumber || requestedBillNumber;
    const currentDate = saved.generatedAt || new Date().toISOString();
    const html = generatePDFHTML(saved, currentDate, type, saved.filters || filters, billNumber);

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      alert("Bill saved successfully. Allow pop-ups to open the print view.");
    }

    window.dispatchEvent(new Event("billing-report-saved"));
    if (onSuccess) onSuccess();
    if (printWindow) alert(`✅ Bill generated successfully!\nBill No: ${billNumber}\nSaved ${reportData.selectedRecords} records`);
    return true;
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to generate report");
    return false;
  }
}

function generateYaraProductWisePDFHTML(reportData, currentDate, billNumber) {
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));
  const issuer = reportData.issuer || {};
  const client = reportData.clientSnapshot || {};
  const filters = reportData.filters || {};
  const data = Array.isArray(reportData.data) ? reportData.data : [];
  const formatMoney = (value) => (Number(value) || 0).toFixed(3);
  const formatQty = (value) => (Number(value) || 0).toFixed(2);
  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? escapeHtml(value) : date.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
  };
  const billDate = formatDate(reportData.generatedAt || currentDate);
  const months = [...new Set(data.map((item) => {
    const date = new Date(item.lrCreatedAt || item.date);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  }).filter(Boolean))];
  const monthLabel = months.length === 1 ? months[0] : months.length ? "Multiple months" : "—";
  const issuerGST = issuer.gstNumber || "";
  const issuerStateCode = issuerGST.slice(0, 2);
  const issuerAddress = [issuer.address, issuer.state, issuer.pinCode].filter(Boolean).join(", ");
  const clientAddress = [client.address, client.city, client.state, client.pinCode, client.country].filter(Boolean).join(", ");
  const selectedOrderType = String(filters.orderType || "").trim();
  const rowOrderTypes = [...new Set(data.map((item) => String(item.orderType || "").trim()).filter(Boolean))];
  const orderTypeLabel = !selectedOrderType || ["NA", "All Types", "All Order Types"].includes(selectedOrderType)
    ? (rowOrderTypes.length === 1 ? rowOrderTypes[0] : rowOrderTypes.length > 1 ? "Multiple Order Types" : "All Order Types")
    : selectedOrderType;
  const title = `${issuer.name || issuer.subCompanyName || "Operating Company"} ( ${orderTypeLabel.toUpperCase()} )`;
  const grouped = new Map();
  data.forEach((item) => {
    const district = String(item.district || "Unspecified").trim() || "Unspecified";
    const key = district.toLocaleLowerCase();
    if (!grouped.has(key)) grouped.set(key, { district, rows: [], quantity: 0, billQuantity: 0, amount: 0 });
    const group = grouped.get(key);
    group.rows.push(item);
    group.quantity += Number(item.quantity ?? item.weight) || 0;
    group.billQuantity += Number(item.billQuantity ?? item.weight) || 0;
    group.amount += Number(item.amount) || 0;
  });
  const districtGroups = [...grouped.values()].sort((a, b) => a.district.localeCompare(b.district));
  let serial = 0;
  const bodyRows = districtGroups.map((group) => {
    const rows = group.rows.map((item) => {
      serial += 1;
      return `<tr>
        <td>${serial}</td><td>${escapeHtml(item.invoiceNo || item.lrNo || "—")}</td><td>${formatDate(item.date)}</td>
        <td>${escapeHtml(item.consigneeName || "—")}</td><td>${escapeHtml(item.to || item.city || "—")}</td>
        <td>${escapeHtml(item.district || "—")}</td><td>${escapeHtml(item.state || "—")}</td>
        <td class="number">${formatQty(item.quantity ?? item.weight)}</td><td class="number">${formatQty(item.billQuantity ?? item.weight)}</td>
        <td>${escapeHtml(item.unit || "MT")}</td><td class="number">${formatMoney(item.rate)}</td><td class="number">${formatMoney(item.amount)}</td>
      </tr>`;
    }).join("");
    return `${rows}<tr class="subtotal">
      <td colspan="5"></td><td>Sub Total</td><td></td>
      <td class="number">${formatQty(group.quantity)}</td><td class="number">${formatQty(group.billQuantity)}</td>
      <td></td><td></td><td class="number">${formatMoney(group.amount)}</td>
    </tr>`;
  }).join("");
  const totals = data.reduce((sum, item) => ({
    quantity: sum.quantity + (Number(item.quantity ?? item.weight) || 0),
    billQuantity: sum.billQuantity + (Number(item.billQuantity ?? item.weight) || 0),
    amount: sum.amount + (Number(item.amount) || 0),
  }), { quantity: 0, billQuantity: 0, amount: 0 });
  const serviceCode = data.find((item) => item.serviceCode)?.serviceCode || filters.serviceCode || "";
  const taxDescription = "GST Declaration as per Notification no.5/2017 - Central Tax Dated 19th June 2017. G.S.R. (E) In exercise of the powers conferred by sub-section(2) of section 23 of the Central Goods and Services Tax Act, 2017 (12 of 2017), the Central Government hereby specifies the persons who are only engaged in making supplies of taxable goods or services or both, the total tax on which is liable to be paid on reverse charge basis by the recipient of such goods or services or both under sub-section(3) of section 9 of the said Act as the category of persons exempted from obtaining registration under the aforesaid Act.";
  const header = `<thead><tr><th colspan="12" class="table-title">${escapeHtml(title)}</th></tr><tr>
    <th>S.No</th><th>Invoice No.</th><th>Date</th><th>BHA Name</th><th>Location</th><th>District</th><th>State</th>
    <th>Qty</th><th>Bill Qty</th><th>Unit</th><th>Rate</th><th>Amount</th>
  </tr></thead>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(billNumber)}</title><style>
    *{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;color:#111;font-size:11px}
    @page{size:A4 landscape;margin:9mm}@page invoice{size:A4 portrait;margin:12mm}@page details{size:A4 landscape;margin:9mm}
    .page{width:100%;break-after:page}.invoice-page{page:invoice}.details-page{page:details;break-after:auto}
    .invoice-frame{border:1px solid #222}.title{font-size:20px;text-align:center;font-weight:700;padding:7px;border-bottom:1px solid #222}
    .parties{display:grid;grid-template-columns:1fr 1fr}.party{padding:8px;border-right:1px solid #222;min-height:125px;line-height:1.45}.party:last-child{border-right:0}
    .party-title{font-weight:700;margin-bottom:5px}.party-name{font-size:14px;font-weight:700;margin-bottom:4px}.metadata{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #222}
    .meta{display:grid;grid-template-columns:120px 12px 1fr;padding:8px;border-right:1px solid #222;border-bottom:1px solid #222}.meta:nth-child(2n){border-right:0}
    .invoice-charges{width:100%;border-collapse:collapse;table-layout:fixed}.invoice-charges th,.invoice-charges td{border:1px solid #222;padding:5px 4px;font-size:9px}.invoice-charges th{text-align:left}.invoice-charges td.num{text-align:right;white-space:nowrap}.invoice-charges .charge-main{height:110px;vertical-align:middle}.invoice-charges .tax-row{height:18px;font-weight:700}.invoice-charges .charge-total{font-weight:700}
    .tax-notice{display:grid;grid-template-columns:70% 30%;border:1px solid #222;border-top:0;min-height:120px}.tax-copy{padding:6px;line-height:1.35;border-right:1px solid #222}.tax-signature{padding:6px}.eoe{font-weight:700;margin-top:22px}
    .details-table{width:100%;border-collapse:collapse;table-layout:fixed}.details-table th,.details-table td{border:1px solid #111;padding:4px 3px;font-size:8px;overflow-wrap:anywhere}
    .details-table th{text-align:center;font-weight:700}.details-table .table-title{font-size:17px;padding:8px}.details-table td{text-align:center}.details-table td.number{text-align:right;white-space:nowrap}
    .subtotal,.grand-total{font-weight:700}.details-heading{font-size:16px;text-align:center;font-weight:700;margin:0 0 6px;display:none}
    @media print{.page{break-after:page}.details-page{break-after:auto}.details-table thead{display:table-header-group}.details-table tr{break-inside:avoid}}
  </style></head><body>
    <section class="page invoice-page"><div class="invoice-frame">
      <div class="title">${escapeHtml(title)}</div>
      <div class="parties">
        <div class="party"><div class="party-title">Bill From:</div><div class="party-name">${escapeHtml(issuer.name || issuer.subCompanyName || "Operating Company")}</div>
          ${escapeHtml(issuerAddress || "Address not configured")}<br>${issuer.phone ? `Tel: ${escapeHtml(issuer.phone)}<br>` : ""}
          ${issuer.email ? `Email: ${escapeHtml(issuer.email)}<br>` : ""}${issuerGST ? `GSTIN/UIN: ${escapeHtml(issuerGST)}<br>` : ""}
          ${issuer.state ? `State Name: ${escapeHtml(issuer.state)}, Code: ${escapeHtml(issuerStateCode)}<br>` : ""}${issuer.pan ? `PAN No: ${escapeHtml(issuer.pan)}` : ""}
        </div>
        <div class="party"><div class="party-title">Bill To:</div><div class="party-name">${escapeHtml(client.name || filters.clientName || "Client")}</div>
          ${escapeHtml(clientAddress || "Address not available")}<br>${client.gstNumber ? `GST No: ${escapeHtml(client.gstNumber)}<br>` : ""}
          ${client.pan ? `PAN No: ${escapeHtml(client.pan)}` : ""}
        </div>
      </div>
      <div class="metadata">
        <div class="meta"><span>Bill No</span><span>:</span><strong>${escapeHtml(billNumber)}</strong></div>
        <div class="meta"><span>Month</span><span>:</span><strong>${escapeHtml(monthLabel)}</strong></div>
        <div class="meta"><span>Bill Date</span><span>:</span><strong>${escapeHtml(billDate)}</strong></div>
        <div class="meta"><span>Product</span><span>:</span><strong>${escapeHtml(filters.productCategories || filters.productCode || "—")}</strong></div>
        <div class="meta"><span>Plant Code</span><span>:</span><strong>${escapeHtml(filters.plantCode || "—")}</strong></div>
        <div class="meta"><span>Location</span><span>:</span><strong>${escapeHtml(filters.branchName || "—")}</strong></div>
      </div>
      <table class="invoice-charges"><colgroup><col style="width:12%"><col style="width:50%"><col style="width:14%"><col style="width:10%"><col style="width:14%"></colgroup>
        <thead><tr><th>Sr.No.</th><th>Description</th><th>Service Code</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead>
        <tbody>
          <tr class="charge-main"><td>1</td><td>Transportation Charges</td><td>${escapeHtml(serviceCode)}</td><td class="num">${formatQty(totals.billQuantity)}</td><td class="num">${formatMoney(totals.amount)}</td></tr>
          <tr class="tax-row"><td></td><td>CGST @ 9%</td><td></td><td></td><td></td></tr>
          <tr class="tax-row"><td></td><td>SGST @ 9%</td><td></td><td></td><td></td></tr>
          <tr class="charge-total"><td>1</td><td colspan="2">TOTAL</td><td class="num">${formatQty(totals.billQuantity)}</td><td class="num">${formatMoney(totals.amount)}</td></tr>
        </tbody>
      </table>
      <div class="tax-notice"><div class="tax-copy">GST Should be paid by Consignor / Consignee to Government Directly.<br>${escapeHtml(taxDescription)}<div class="eoe">E &amp; O.E.</div></div><div class="tax-signature"></div></div>
    </div></section>
    <section class="page details-page"><h2 class="details-heading">${escapeHtml(title)}</h2>
      <table class="details-table">${header}<tbody>${bodyRows}
        <tr class="grand-total"><td colspan="5"></td><td>Total</td><td></td><td class="number">${formatQty(totals.quantity)}</td>
        <td class="number">${formatQty(totals.billQuantity)}</td><td></td><td></td><td class="number">${formatMoney(totals.amount)}</td></tr>
      </tbody></table>
    </section>
  </body></html>`;
}

function generatePDFHTML(reportData, currentDate, type, filters, billNumber) {
  if (type === "product-wise") return generateYaraProductWisePDFHTML(reportData, currentDate, billNumber);
  let title = "";
  let headers = [];
  let rows = [];
  let totalAmount = reportData.summary.totalAmount;
  let totalWeight = reportData.summary.totalWeight || 0;

  const clientName = filters.clientName || "Client Name";
  const clientGST = filters.clientGST || "GST Number";
  const clientState = filters.clientState || "State";
  const clientStateCode = filters.clientStateCode || "Code";

  switch (type) {
    case "product-wise":
      title = "Yara - Product-Wise Billing Report";
      headers = ["S.No", "LR No", "Date", "Vehicle No", "From", "To", "Product", "Weight (MT)", "Rate (₹)", "Amount (₹)"];
      rows = reportData.data.map((item, idx) => [
        idx + 1,
        item.lrNo || "-",
        safeFormatDate(item.date),
        item.vehicleNo || "-",
        item.fromLocation || item.from || "-",
        item.toLocation || item.to || "-",
        item.productName || "-",
        (item.weight || 0).toFixed(2),
        (item.rate || 0).toFixed(2),
        (item.amount || 0).toFixed(2),
      ]);
      break;
    case "general":
      title = "General Billing Report";
      headers = ["S.No", "LR No", "Date", "Vehicle No", "From", "To", "Product", "Weight (MT)", "Rate (₹)", "Amount (₹)"];
      rows = reportData.data.map((item, idx) => [
        idx + 1,
        item.lrNo || "-",
        safeFormatDate(item.date),
        item.vehicleNo || "-",
        item.from || "-",
        item.to || "-",
        item.productName || "-",
        (item.weight || 0).toFixed(2),
        (item.rate || 0).toFixed(2),
        (item.amount || 0).toFixed(2),
      ]);
      break;
    case "detention":
      title = "Detention Billing Report";
      headers = ["S.No", "LR No", "Date", "Vehicle No", "From", "To", "Detention Type", "Amount (₹)"];
      rows = reportData.data.map((item, idx) => [
        idx + 1,
        item.lrNo || "-",
        safeFormatDate(item.date),
        item.vehicleNo || "-",
        item.from || "-",
        item.to || "-",
        item.detentionType || "-",
        (item.amount || 0).toFixed(2),
      ]);
      break;
    case "cancellation":
      title = "Cancellation Billing Report";
      headers = ["S.No", "LR No", "Date", "Vehicle No", "From", "To", "Cancellation Type", "Amount (₹)"];
      rows = reportData.data.map((item, idx) => [
        idx + 1,
        item.lrNo || "-",
        safeFormatDate(item.date),
        item.vehicleNo || "-",
        item.from || "-",
        item.to || "-",
        item.cancellationType || "-",
        (item.amount || 0).toFixed(2),
      ]);
      break;
    default:
      title = "Billing Report";
      headers = ["S.No", "LR No", "Date", "Vehicle No", "Amount (₹)"];
      rows = reportData.data.map((item, idx) => [
        idx + 1,
        item.lrNo || "-",
        safeFormatDate(item.date),
        item.vehicleNo || "-",
        (item.amount || 0).toFixed(2),
      ]);
  }

  const periodText = filters.startDate && filters.endDate ? `${filters.startDate} to ${filters.endDate}` : "Selected Period";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', Arial, sans-serif; padding: 20px; background: white; font-size: 12px; }
        .bill-container { max-width: 1100px; margin: 0 auto; background: white; }
        .header-section { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #000; }
        .company-details { flex: 1; }
        .company-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
        .company-address { font-size: 10px; line-height: 1.4; color: #333; }
        .bill-details { text-align: right; flex: 1; }
        .bill-title { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
        .party-section { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb; }
        .bill-to, .ship-to { flex: 1; }
        .section-title { font-weight: bold; margin-bottom: 5px; font-size: 12px; }
        .party-address { font-size: 10px; line-height: 1.4; }
        .terms-section { margin: 15px 0; padding: 8px; background: #fef3c7; border: 1px solid #f59e0b; font-size: 10px; }
        .terms-title { font-weight: bold; margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #000; padding: 6px; text-align: left; font-size: 10px; }
        th { background-color: #d1fae5; font-weight: bold; text-align: center; }
        .text-right { text-align: right; }
        .total-row { background-color: #fef3c7; font-weight: bold; }
        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 9px; text-align: center; }
        .amount-in-words { margin-top: 10px; font-size: 10px; font-weight: bold; }
        @media print { body { padding: 0; margin: 0; } }
      </style>
    </head>
    <body>
      <div class="bill-container">
        <div class="header-section">
          <div class="company-details">
            <div class="company-name">JAYA GLOBAL LOGISTICS</div>
            <div class="company-address">
              Office - 404, A - Wing 4th Floor,<br>
              Shelton Sapphire, Sector - 15<br>
              Belapur Navi Mumbai - 400614.<br>
              GSTIN/UIN: 27HEVPS8463H1ZC<br>
              State Name: Maharashtra, Code: 27<br>
              E-Mail: jayagloballogistics@gmail.com<br>
              PAN No: HEVPS8463H
            </div>
          </div>
          <div class="bill-details">
            <div class="bill-title">TAX INVOICE</div>
            <div class="bill-no"><strong>BILL No:</strong> ${billNumber}</div>
            <div class="bill-no"><strong>BILL DATE:</strong> ${currentDate.split(",")[0]}</div>
            <div class="bill-no"><strong>Period:</strong> ${periodText}</div>
          </div>
        </div>
        
        <div class="party-section">
          <div class="bill-to">
            <div class="section-title">Bill To:</div>
            <div class="party-address">
              ${clientName}<br>
              ${filters.clientAddress || "Warehousing complex, Chukkavanipalem Village"}<br>
              ${filters.clientCity || "Visakhapatnam, Andhra Pradesh, 530012"}<br>
              GST No: ${clientGST}<br>
              ${clientState}, Code: ${clientStateCode}
            </div>
          </div>
          <div class="ship-to">
            <div class="section-title">Ship To:</div>
            <div class="party-address">Same as Bill To</div>
          </div>
        </div>
        
        <div class="terms-section">
          <div class="terms-title">Terms of Payment:</div>
          <div>Within 30 Days of receiving Invoice</div>
          <div style="margin-top: 5px;"><strong>Note:</strong></div>
          <div>1) Please pay by A/c Payee Cheque / DD favouring 'JAYA LOGISTICS' Only.</div>
          <div>2) 18% interest will be charged, if the bill is not settled within 30 Days.</div>
        </div>
        
        <table>
          <thead>
            <tr>
              ${headers.map((h) => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map(
    (row) => `
              <tr>
                ${row.map((cell) => `<td>${cell}</td>`).join("")}
              </tr>
            `
  ).join("")}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="${headers.length - 1}" class="text-right"><strong>TOTAL AMOUNT</strong></td>
              <td class="text-right"><strong>₹ ${totalAmount.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
        
        <div class="amount-in-words">
          <strong>Amount in Words:</strong> Rupees ${Math.floor(totalAmount).toLocaleString()} Only
        </div>
        <div class="footer">
          <p>This is a computer generated invoice - No signature required</p>
          <p>For JAYA GLOBAL LOGISTICS</p>
          <p style="margin-top: 30px;">Authorized Signatory</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Get already generated LR numbers from saved reports
async function getGeneratedLRNumbers() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch("/api/saved-reports?type=product-wise", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (data.success && data.data) {
      const lrNumbers = new Set();
      data.data.forEach((report) => {
        if (report.data && Array.isArray(report.data)) {
          report.data.forEach((item) => {
            if (item.lrNo) {
              lrNumbers.add(item.lrNo);
            }
          });
        }
      });
      return Array.from(lrNumbers);
    }
    return [];
  } catch (error) {
    console.error("Error fetching generated LR numbers:", error);
    return [];
  }
}

// ==================== PRODUCT WISE BILLING COMPONENT ====================
async function createTemporaryBillingPreview({ type, data, summary, filters, branches, clients, clientId }) {
  const selectedClient = clients.find((client) => String(client._id) === String(clientId));
  const billingAddress = selectedClient?.billingAddresses?.[0] || {};
  let issuer = {};
  try {
    const token = localStorage.getItem("token");
    const localUser = JSON.parse(localStorage.getItem("user") || "{}");
    const response = await fetch("/api/subcompanies?operatingOnly=true&limit=100", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    const activeCompany = (result.data || []).find((company) => String(company._id) === String(localUser.activeOperatingCompanyId));
    issuer = activeCompany
      ? { ...(activeCompany.legalProfile || {}), name: activeCompany.legalProfile?.legalName || activeCompany.name, subCompanyName: activeCompany.name, subCompanyCode: activeCompany.code }
      : { name: localUser.activeOperatingCompanyName || "Operating Company" };
  } catch (error) {
    console.error("Failed to load operating company details for preview:", error);
  }

  const branch = branches.find((item) => String(item._id) === String(filters.branchId));
  const reportFilters = {
    ...filters,
    clientName: selectedClient?.customerName || filters.clientName || "",
    clientGST: selectedClient?.gstNumber || filters.clientGST || "",
    clientState: selectedClient?.state || filters.clientState || "",
    clientStateCode: selectedClient?.stateCode || filters.clientStateCode || "",
    clientAddress: selectedClient?.address || filters.clientAddress || "",
    clientCity: selectedClient?.city || filters.clientCity || "",
    branchName: branch?.name || "N/A",
  };
  const report = {
    generatedAt: new Date().toISOString(),
    issuer,
    clientSnapshot: selectedClient ? {
      name: selectedClient.customerName || reportFilters.clientName,
      gstNumber: billingAddress.gstNumber || selectedClient.gstNumber || "",
      pan: selectedClient.pan || "",
      address: [billingAddress.address1, billingAddress.address2].filter(Boolean).join(", ") || selectedClient.address || "",
      city: billingAddress.city || selectedClient.city || "",
      state: billingAddress.state || selectedClient.state || "",
      pinCode: billingAddress.pin || "",
      country: billingAddress.country || "",
    } : {},
    filters: reportFilters,
    data,
    summary,
  };
  return generatePDFHTML(report, report.generatedAt, type, reportFilters, "PREVIEW - NOT SAVED");
}

function BillingPreviewModal({ html, onClose }) {
  useEffect(() => {
    if (!html) return undefined;
    const blockPrint = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") event.preventDefault();
    };
    window.addEventListener("keydown", blockPrint);
    return () => window.removeEventListener("keydown", blockPrint);
  }, [html]);

  if (!html) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Bill preview">
      <div className="flex h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
          <div>
            <h2 className="font-bold text-slate-900">Bill Preview</h2>
            <p className="text-xs text-slate-500">Temporary preview only. It is not saved, and printing is disabled.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
        </div>
        <iframe title="Non-printable billing preview" srcDoc={html} sandbox="" className="min-h-0 w-full flex-1 bg-slate-100" />
      </div>
    </div>
  );
}

function ProductWiseBillingComponent({ branches, clients, plants, loadingBranches, loadingClients, loadingPlants, canGenerate }) {
  const [loading, setLoading] = useState(false);
  const [billData, setBillData] = useState([]);
  const [summary, setSummary] = useState({ totalWeight: 0, totalAmount: 0, totalRecords: 0 });
  const [selectedRows, setSelectedRows] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [generatedLRs, setGeneratedLRs] = useState([]);
  const [productSubgroups, setProductSubgroups] = useState([]);
  const [loadingSubgroups, setLoadingSubgroups] = useState(false);
  const [branchPlants, setBranchPlants] = useState([]);
  const [loadingBranchPlants, setLoadingBranchPlants] = useState(false);
  const [filters, setFilters] = useState({
    branchId: "",
    clientId: "",
    clientName: "",
    clientGST: "",
    clientState: "",
    clientStateCode: "",
    clientAddress: "",
    clientCity: "",
    productCategories: "",
    plantId: "",
    orderType: "NA",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    let active = true;
    const loadSubgroups = async () => {
      setLoadingSubgroups(true);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/itemGroups", { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json();
        if (active && result.success) {
          const names = [...new Set((result.data || []).flatMap(group => group.subgroups || []).map(name => name.trim()).filter(Boolean))];
          setProductSubgroups(names.sort((a, b) => a.localeCompare(b)));
        }
      } catch (error) {
        console.error("Failed to load item subgroups for billing:", error);
      } finally {
        if (active) setLoadingSubgroups(false);
      }
    };
    loadSubgroups();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadBranchPlants = async () => {
      if (!filters.branchId) {
        setBranchPlants([]);
        setLoadingBranchPlants(false);
        return;
      }
      setLoadingBranchPlants(true);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/plants?branchId=${encodeURIComponent(filters.branchId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (active && result.success) setBranchPlants(result.data || []);
        else if (active) setBranchPlants([]);
      } catch (error) {
        console.error("Failed to load plants for selected branch:", error);
        if (active) setBranchPlants([]);
      } finally {
        if (active) setLoadingBranchPlants(false);
      }
    };
    loadBranchPlants();
    return () => { active = false; };
  }, [filters.branchId]);

  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const formatDate = (date) => date.toISOString().split("T")[0];
    setFilters((prev) => ({
      ...prev,
      startDate: formatDate(firstDayOfMonth),
      endDate: formatDate(lastDayOfMonth),
    }));
    loadGeneratedLRs();
  }, []);

  useEffect(() => {
    const filtersReady = Boolean(
      filters.clientId && filters.branchId && filters.productCategories && filters.plantId &&
      filters.orderType && filters.startDate && filters.endDate && filters.startDate <= filters.endDate
    );
    if (filtersReady) {
      fetchData();
    } else {
      setBillData([]);
      setSummary({ totalWeight: 0, totalAmount: 0, totalRecords: 0 });
      setSelectedRows({});
      setSelectAll(false);
    }
  }, [filters.clientId, filters.branchId, filters.productCategories, filters.plantId, filters.orderType, filters.startDate, filters.endDate]);

  const filtersReady = Boolean(
    filters.clientId && filters.branchId && filters.productCategories && filters.plantId &&
    filters.orderType && filters.startDate && filters.endDate && filters.startDate <= filters.endDate
  );

  const loadGeneratedLRs = async () => {
    const lrs = await getGeneratedLRNumbers();
    setGeneratedLRs(lrs);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const orderTypeValue = filters.orderType === "NA" ? "" : filters.orderType;
      const payload = {
        type: "product-wise",
        branchId: filters.branchId,
        branchName: branches.find((b) => b._id === filters.branchId)?.name || "",
        clientId: filters.clientId,
        clientName: filters.clientName,
        productCategories: filters.productCategories,
        plantId: filters.plantId,
        plantCode: plants.find((p) => p._id === filters.plantId)?.code || "",
        orderType: orderTypeValue,
        startDate: filters.startDate,
        endDate: filters.endDate,
        excludeLRs: generatedLRs,
      };

      const response = await fetch("/api/billing/product-wise", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        const filteredData = (data.data || []).filter((item) => !generatedLRs.includes(item.lrNo));
        setBillData(filteredData);
        setSummary({
          totalWeight: filteredData.reduce((sum, item) => sum + (item.weight || 0), 0),
          totalAmount: filteredData.reduce((sum, item) => sum + (item.amount || 0), 0),
          totalRecords: filteredData.length,
        });
        setSelectedRows({});
        setSelectAll(false);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRow = (index) => {
    setSelectedRows((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows({});
    } else {
      const newSelected = {};
      billData.forEach((_, idx) => {
        newSelected[idx] = true;
      });
      setSelectedRows(newSelected);
    }
    setSelectAll(!selectAll);
  };

  const getSelectedData = () => billData.filter((_, idx) => selectedRows[idx]);

  const getSelectedSummary = () => {
    const selected = getSelectedData();
    const totalWeight = selected.reduce((sum, item) => sum + (item.weight || 0), 0);
    const totalAmount = selected.reduce((sum, item) => sum + (item.amount || 0), 0);
    return { totalWeight, totalAmount, totalRecords: selected.length };
  };

  const handleGenerateReport = async () => {
    if (!canGenerate) {
      alert("You don't have permission to generate bills");
      return;
    }
    const selected = getSelectedData();
    if (selected.length === 0) {
      alert("Please select at least one record to generate report");
      return;
    }
    setGenerating(true);
    const selectedSummary = getSelectedSummary();
    const reportData = {
      reportId: `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "product-wise",
      filters: {
        clientId: filters.clientId,
        clientName: filters.clientName,
        clientGST: filters.clientGST,
        clientState: filters.clientState,
        clientStateCode: filters.clientStateCode,
        clientAddress: filters.clientAddress,
        clientCity: filters.clientCity,
        branchName: branches.find((b) => b._id === filters.branchId)?.name || "N/A",
        branchId: filters.branchId,
        branchCode: branches.find((b) => b._id === filters.branchId)?.code || "",
        plantId: filters.plantId,
        plantCode: plants.find((p) => p._id === filters.plantId)?.code || "",
        startDate: filters.startDate,
        endDate: filters.endDate,
        orderType: filters.orderType === "NA" ? "All Types" : filters.orderType,
        productCategories: filters.productCategories,
      },
      data: selected,
      summary: selectedSummary,
      totalRecords: billData.length,
      selectedRecords: selected.length,
    };
    await generateAndSaveReport(reportData, "product-wise", filters, async () => {
      await loadGeneratedLRs();
      setSelectedRows({});
      setSelectAll(false);
    });
    setGenerating(false);
  };

  const handleClientChange = (clientId) => {
    const selectedClient = clients.find((c) => c._id === clientId);
    setFilters((prev) => ({
      ...prev,
      clientId: clientId,
      clientName: selectedClient?.customerName || "",
      clientGST: selectedClient?.gstNumber || "",
      clientState: selectedClient?.state || "",
      clientStateCode: selectedClient?.stateCode || "",
      clientAddress: selectedClient?.address || "",
      clientCity: selectedClient?.city || "",
    }));
  };

  const selectedCount = Object.keys(selectedRows).filter((key) => selectedRows[key]).length;

  const handlePreviewBill = async () => {
    const selected = canGenerate ? getSelectedData() : billData;
    if (!selected.length) {
      alert("Select at least one billing row to preview.");
      return;
    }

    const selectedClient = clients.find((client) => client._id === filters.clientId);
    const billingAddress = selectedClient?.billingAddresses?.[0] || {};
    let issuer = {};
    try {
      const token = localStorage.getItem("token");
      const localUser = JSON.parse(localStorage.getItem("user") || "{}");
      const response = await fetch("/api/subcompanies?operatingOnly=true&limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      const activeCompany = (result.data || []).find((company) => String(company._id) === String(localUser.activeOperatingCompanyId));
      if (activeCompany) {
        issuer = {
          ...(activeCompany.legalProfile || {}),
          name: activeCompany.legalProfile?.legalName || activeCompany.name,
          subCompanyName: activeCompany.name,
          subCompanyCode: activeCompany.code,
        };
      } else {
        issuer = { name: localUser.activeOperatingCompanyName || "Operating Company" };
      }
    } catch (error) {
      console.error("Failed to load operating company details for preview:", error);
    }

    const branch = branches.find((item) => item._id === filters.branchId);
    const plant = branchPlants.find((item) => item._id === filters.plantId);
    const previewReport = {
      generatedAt: new Date().toISOString(),
      issuer,
      clientSnapshot: selectedClient ? {
        name: selectedClient.customerName || filters.clientName,
        gstNumber: billingAddress.gstNumber || selectedClient.gstNumber || "",
        pan: selectedClient.pan || "",
        address: [billingAddress.address1, billingAddress.address2].filter(Boolean).join(", "),
        city: billingAddress.city || "",
        state: billingAddress.state || "",
        pinCode: billingAddress.pin || "",
        country: billingAddress.country || "",
      } : {},
      filters: {
        ...filters,
        branchName: branch?.name || "",
        branchCode: branch?.code || "",
        plantCode: plant?.code || "",
        orderType: filters.orderType === "NA" ? "All Types" : filters.orderType,
      },
      data: selected,
      summary: getSelectedSummary(),
    };
    setPreviewHtml(generatePDFHTML(previewReport, previewReport.generatedAt, "product-wise", previewReport.filters, "PREVIEW - NOT SAVED"));
  };

  useEffect(() => {
    if (!previewHtml) return;
    const preventPrintShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("keydown", preventPrintShortcut, true);
    return () => window.removeEventListener("keydown", preventPrintShortcut, true);
  }, [previewHtml]);

  return (
    <Card title="Yara - Product-Wise Billing">
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 md:col-span-3">
          <ClientSelector value={filters.clientId} onChange={handleClientChange} clients={clients} loading={loadingClients} />
        </div>
        <div className="col-span-12 md:col-span-3">
          <BranchSelector value={filters.branchId} onChange={(val) => setFilters((prev) => ({ ...prev, branchId: val, plantId: "" }))} branches={branches} loading={loadingBranches} />
        </div>
        <div className="col-span-12 md:col-span-2">
          <ProductCategorySelector value={filters.productCategories} onChange={(val) => setFilters((prev) => ({ ...prev, productCategories: val }))} categories={productSubgroups} loading={loadingSubgroups} />
        </div>
        <div className="col-span-12 md:col-span-2">
          <PlantCodeSelector value={filters.plantId} onChange={(val) => setFilters((prev) => ({ ...prev, plantId: val }))} plants={branchPlants} loading={loadingBranchPlants || loadingPlants} />
        </div>
        <div className="col-span-12 md:col-span-2">
          <OrderTypeSelector value={filters.orderType} onChange={(val) => setFilters((prev) => ({ ...prev, orderType: val }))} />
        </div>
        <div className="col-span-12 md:col-span-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            className="rounded-xl border p-2 w-full"
          />
          <p className="text-xs mt-1">Start Date</p>
        </div>
        <div className="col-span-12 md:col-span-2">
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            className="rounded-xl border p-2 w-full"
          />
          <p className="text-xs mt-1">End Date</p>
        </div>
      </div>

      {generatedLRs.length > 0 && (
        <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
          ℹ️ Already billed LR numbers: {generatedLRs.slice(0, 10).join(", ")}
          {generatedLRs.length > 10 ? ` and ${generatedLRs.length - 10} more` : ""}
        </div>
      )}

      {!filtersReady && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Select a client, branch, product category, plant code, order type, and valid date range to view pending records.
        </div>
      )}

      {billData.length > 0 && canGenerate && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePreviewBill}
              disabled={selectedCount === 0}
              className={`rounded-xl border border-emerald-600 px-5 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 ${selectedCount === 0 ? "cursor-not-allowed opacity-50" : ""}`}
            >
              Preview Selected Bill (No Print)
            </button>
            <button
              onClick={handleGenerateReport}
              disabled={generating || selectedCount === 0}
              className={`bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition ${generating || selectedCount === 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
              {generating ? "Generating..." : `📄 Generate Bill (${selectedCount} Selected)`}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
          <p>Loading...</p>
        </div>
      )}

      {!loading && filtersReady && (
        <div className="mt-6 overflow-x-auto">
          <div className="mb-2 flex justify-between">
            <span>✅ {summary.totalRecords} records</span>
            {canGenerate && <span className="text-blue-600">Selected: {selectedCount}</span>}
          </div>
          <table className="min-w-full border">
            <thead className="bg-emerald-50">
              <tr>
                {canGenerate && (
                  <th className="px-3 py-2 border w-10">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                  </th>
                )}
                <th className="px-3 py-2 border">S.No</th>
                <th className="px-3 py-2 border">Date</th>
                <th className="px-3 py-2 border">LR No</th>
                <th className="px-3 py-2 border">Vehicle No</th>
                <th className="px-3 py-2 border">From</th>
                <th className="px-3 py-2 border">To</th>
                <th className="px-3 py-2 border">Product</th>
                <th className="px-3 py-2 border text-right">Weight</th>
                <th className="px-3 py-2 border text-right">Rate</th>
                <th className="px-3 py-2 border text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {billData.length === 0 ? (
                <tr><td colSpan={canGenerate ? 11 : 10} className="px-3 py-8 border text-center text-slate-600">
                  <p>No pending records found</p>
                  {generatedLRs.length > 0 && <p className="text-sm text-slate-500 mt-2">All LR numbers have been billed already</p>}
                </td></tr>
              ) : billData.map((item, idx) => (
                <tr key={idx} className={selectedRows[idx] && canGenerate ? "bg-blue-50" : ""}>
                  {canGenerate && (
                    <td className="px-3 py-2 border text-center">
                      <input type="checkbox" checked={!!selectedRows[idx]} onChange={() => handleSelectRow(idx)} />
                    </td>
                  )}
                  <td className="px-3 py-2 border">{idx + 1}</td>
                  <td className="px-3 py-2 border">{safeFormatDate(item.date)}</td>
                  <td className="px-3 py-2 border font-medium text-emerald-700">{item.lrNo || "-"}</td>
                  <td className="px-3 py-2 border">{item.vehicleNo || "-"}</td>
                  <td className="px-3 py-2 border">{item.from || "-"}</td>
                  <td className="px-3 py-2 border">{item.to || "-"}</td>
                  <td className="px-3 py-2 border">{item.productName || "-"}</td>
                  <td className="px-3 py-2 border text-right">{item.weight?.toFixed(2) || "0.00"}</td>
                  <td className="px-3 py-2 border text-right">{item.rate?.toFixed(2) || "0.00"}</td>
                  <td className="px-3 py-2 border text-right">₹ {item.amount?.toFixed(2) || "0.00"}</td>
                </tr>
              ))}
            </tbody>
            {billData.length > 0 && <tfoot className="bg-emerald-100 font-bold">
              <tr>
                <td colSpan={canGenerate ? 8 : 7} className="px-3 py-2 border text-right">TOTAL</td>
                <td className="px-3 py-2 border text-right">{summary.totalWeight.toFixed(2)}</td>
                <td className="px-3 py-2 border text-right"></td>
                <td className="px-3 py-2 border text-right">₹ {summary.totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>}
          </table>
        </div>
      )}

      {!loading && !filters.clientId && <div className="text-center py-8">Select a client to view data</div>}

      <BillingPreviewModal html={previewHtml} onClose={() => setPreviewHtml("")} />
    </Card>
  );
}

// ==================== GENERAL BILLING COMPONENT ====================
function GeneralBillingComponent({ branches, clients, loadingBranches, loadingClients, canGenerate }) {
  const [loading, setLoading] = useState(false);
  const [billData, setBillData] = useState([]);
  const [summary, setSummary] = useState({ totalWeight: 0, totalAmount: 0, totalRecords: 0 });
  const [selectedRows, setSelectedRows] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [generatedLRs, setGeneratedLRs] = useState([]);

  const [filters, setFilters] = useState({
    branchId: "",
    clientId: "",
    clientName: "",
    clientGST: "",
    clientState: "",
    clientStateCode: "",
    clientAddress: "",
    clientCity: "",
    orderType: "NA",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const formatDate = (date) => date.toISOString().split("T")[0];
    setFilters((prev) => ({ ...prev, startDate: formatDate(firstDayOfMonth), endDate: formatDate(lastDayOfMonth) }));
    loadGeneratedLRs();
  }, []);

  useEffect(() => {
    if (filters.clientId && filters.startDate && filters.endDate) fetchData();
  }, [filters.clientId, filters.branchId, filters.orderType, filters.startDate, filters.endDate]);

  const loadGeneratedLRs = async () => {
    const lrs = await getGeneratedLRNumbers();
    setGeneratedLRs(lrs);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const orderTypeValue = filters.orderType === "NA" ? "" : filters.orderType;
      const payload = {
        type: "general",
        branchId: filters.branchId,
        branchName: branches.find((b) => b._id === filters.branchId)?.name || "",
        clientId: filters.clientId,
        clientName: filters.clientName,
        orderType: orderTypeValue,
        startDate: filters.startDate,
        endDate: filters.endDate,
        excludeLRs: generatedLRs,
      };
      const response = await fetch("/api/billing/general", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        const filteredData = (data.data || []).filter((item) => !generatedLRs.includes(item.lrNo));
        setBillData(filteredData);
        setSummary({
          totalWeight: filteredData.reduce((s, i) => s + (i.weight || 0), 0),
          totalAmount: filteredData.reduce((s, i) => s + (i.amount || 0), 0),
          totalRecords: filteredData.length,
        });
        setSelectedRows({});
        setSelectAll(false);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRow = (index) => setSelectedRows((prev) => ({ ...prev, [index]: !prev[index] }));
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows({});
    } else {
      const newSelected = {};
      billData.forEach((_, idx) => (newSelected[idx] = true));
      setSelectedRows(newSelected);
    }
    setSelectAll(!selectAll);
  };
  const getSelectedData = () => billData.filter((_, idx) => selectedRows[idx]);
  const getSelectedSummary = () => {
    const selected = getSelectedData();
    return {
      totalWeight: selected.reduce((s, i) => s + (i.weight || 0), 0),
      totalAmount: selected.reduce((s, i) => s + (i.amount || 0), 0),
      totalRecords: selected.length,
    };
  };

  const handleClientChange = (clientId) => {
    const selectedClient = clients.find((c) => c._id === clientId);
    setFilters((prev) => ({
      ...prev,
      clientId: clientId,
      clientName: selectedClient?.customerName || "",
      clientGST: selectedClient?.gstNumber || "",
      clientState: selectedClient?.state || "",
      clientStateCode: selectedClient?.stateCode || "",
      clientAddress: selectedClient?.address || "",
      clientCity: selectedClient?.city || "",
    }));
  };

  const handleGenerateReport = async () => {
    if (!canGenerate) {
      alert("You don't have permission to generate bills");
      return;
    }
    const selected = getSelectedData();
    if (selected.length === 0) return alert("Please select at least one record to generate report");
    setGenerating(true);
    const selectedSummary = getSelectedSummary();
    const reportData = {
      reportId: `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "general",
      filters: {
        clientName: filters.clientName,
        clientGST: filters.clientGST,
        clientState: filters.clientState,
        clientStateCode: filters.clientStateCode,
        clientAddress: filters.clientAddress,
        clientCity: filters.clientCity,
        branchName: branches.find((b) => b._id === filters.branchId)?.name || "N/A",
        startDate: filters.startDate,
        endDate: filters.endDate,
        orderType: filters.orderType === "NA" ? "All Types" : filters.orderType,
      },
      data: selected,
      summary: selectedSummary,
      totalRecords: billData.length,
      selectedRecords: selected.length,
    };
    await generateAndSaveReport(reportData, "general", filters, async () => {
      await loadGeneratedLRs();
      setSelectedRows({});
      setSelectAll(false);
    });
    setGenerating(false);
  };

  const handlePreviewBill = async () => {
    const selected = getSelectedData();
    if (!selected.length) return alert("Select at least one billing row to preview.");
    const branch = branches.find((item) => item._id === filters.branchId);
    const previewFilters = { ...filters, branchName: branch?.name || "N/A", orderType: filters.orderType === "NA" ? "All Types" : filters.orderType };
    setPreviewHtml(await createTemporaryBillingPreview({ type: "general", data: selected, summary: getSelectedSummary(), filters: previewFilters, branches, clients, clientId: filters.clientId }));
  };

  const selectedCount = Object.keys(selectedRows).filter((k) => selectedRows[k]).length;

  return (
    <Card title="General - Billing">
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 md:col-span-3">
          <ClientSelector value={filters.clientId} onChange={handleClientChange} clients={clients} loading={loadingClients} />
        </div>
        <div className="col-span-12 md:col-span-3">
          <BranchSelector value={filters.branchId} onChange={(val) => setFilters((prev) => ({ ...prev, branchId: val }))} branches={branches} loading={loadingBranches} />
        </div>
        <div className="col-span-12 md:col-span-2">
          <OrderTypeSelector value={filters.orderType} onChange={(val) => setFilters((prev) => ({ ...prev, orderType: val }))} />
        </div>
        <div className="col-span-12 md:col-span-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            className="rounded-xl border p-2 w-full"
          />
          <p className="text-xs mt-1">Start Date</p>
        </div>
        <div className="col-span-12 md:col-span-2">
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            className="rounded-xl border p-2 w-full"
          />
          <p className="text-xs mt-1">End Date</p>
        </div>
      </div>

      {generatedLRs.length > 0 && (
        <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
          ℹ️ Already billed LR numbers: {generatedLRs.slice(0, 10).join(", ")}
          {generatedLRs.length > 10 ? ` and ${generatedLRs.length - 10} more` : ""}
        </div>
      )}

      {billData.length > 0 && canGenerate && (
        <div className="mt-4">
          <button type="button" onClick={handlePreviewBill} disabled={selectedCount === 0} className={`mr-2 rounded-xl border border-emerald-600 px-5 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 ${selectedCount === 0 ? "cursor-not-allowed opacity-50" : ""}`}>
            Preview Selected Bill (No Print)
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={generating || selectedCount === 0}
            className={`bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition ${generating || selectedCount === 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
          >
            {generating ? "Generating..." : `📄 Generate Bill (${selectedCount} Selected)`}
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
          <p>Loading...</p>
        </div>
      )}

      {!loading && billData.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <div className="mb-2 flex justify-between">
            <span>✅ {summary.totalRecords} records</span>
            {canGenerate && <span className="text-blue-600">Selected: {selectedCount}</span>}
          </div>
          <table className="min-w-full border">
            <thead className="bg-emerald-50">
              <tr>
                {canGenerate && (
                  <th className="px-3 py-2 border w-10">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                  </th>
                )}
                <th className="px-3 py-2 border">S.No</th>
                <th className="px-3 py-2 border">Date</th>
                <th className="px-3 py-2 border">LR No</th>
                <th className="px-3 py-2 border">Vehicle No</th>
                <th className="px-3 py-2 border">From</th>
                <th className="px-3 py-2 border">To</th>
                <th className="px-3 py-2 border">Product</th>
                <th className="px-3 py-2 border text-right">Weight</th>
                <th className="px-3 py-2 border text-right">Rate</th>
                <th className="px-3 py-2 border text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {billData.map((item, idx) => (
                <tr key={idx} className={selectedRows[idx] && canGenerate ? "bg-blue-50" : ""}>
                  {canGenerate && (
                    <td className="px-3 py-2 border text-center">
                      <input type="checkbox" checked={!!selectedRows[idx]} onChange={() => handleSelectRow(idx)} />
                    </td>
                  )}
                  <td className="px-3 py-2 border">{idx + 1}</td>
                  <td className="px-3 py-2 border">{safeFormatDate(item.date)}</td>
                  <td className="px-3 py-2 border font-medium text-emerald-700">{item.lrNo || "-"}</td>
                  <td className="px-3 py-2 border">{item.vehicleNo || "-"}</td>
                  <td className="px-3 py-2 border">{item.from || "-"}</td>
                  <td className="px-3 py-2 border">{item.to || "-"}</td>
                  <td className="px-3 py-2 border">{item.productName || "-"}</td>
                  <td className="px-3 py-2 border text-right">{item.weight?.toFixed(2) || "0.00"}</td>
                  <td className="px-3 py-2 border text-right">{item.rate?.toFixed(2) || "0.00"}</td>
                  <td className="px-3 py-2 border text-right">₹ {item.amount?.toFixed(2) || "0.00"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-emerald-100 font-bold">
              <tr>
                <td colSpan={canGenerate ? 8 : 7} className="px-3 py-2 border text-right">TOTAL</td>
                <td className="px-3 py-2 border text-right">{summary.totalWeight.toFixed(2)}</td>
                <td className="px-3 py-2 border text-right"></td>
                <td className="px-3 py-2 border text-right">₹ {summary.totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {!loading && !filters.clientId && <div className="text-center py-8">Select a client to view data</div>}
      {!loading && filters.clientId && billData.length === 0 && (
        <div className="text-center py-8">
          <p>No pending records found</p>
          {generatedLRs.length > 0 && <p className="text-sm text-gray-500 mt-2">All LR numbers have been billed already</p>}
        </div>
      )}

      <BillingPreviewModal html={previewHtml} onClose={() => setPreviewHtml("")} />
    </Card>
  );
}

// ==================== DETENTION BILLING COMPONENT ====================
function DetentionBillingComponent({ branches, clients, loadingBranches, loadingClients, canGenerate }) {
  const [loading, setLoading] = useState(false);
  const [billData, setBillData] = useState([]);
  const [summary, setSummary] = useState({ totalAmount: 0, totalRecords: 0 });
  const [selectedRows, setSelectedRows] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [generatedLRs, setGeneratedLRs] = useState([]);

  const [filters, setFilters] = useState({
    branchId: "",
    clientId: "",
    clientName: "",
    clientGST: "",
    clientState: "",
    clientStateCode: "",
    clientAddress: "",
    clientCity: "",
    detention: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const formatDate = (date) => date.toISOString().split("T")[0];
    setFilters((prev) => ({ ...prev, startDate: formatDate(firstDayOfMonth), endDate: formatDate(lastDayOfMonth) }));
    loadGeneratedLRs();
  }, []);

  useEffect(() => {
    if (filters.clientId && filters.startDate && filters.endDate) fetchData();
  }, [filters.clientId, filters.branchId, filters.detention, filters.startDate, filters.endDate]);

  const loadGeneratedLRs = async () => {
    const lrs = await getGeneratedLRNumbers();
    setGeneratedLRs(lrs);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        type: "detention",
        branchId: filters.branchId,
        branchName: branches.find((b) => b._id === filters.branchId)?.name || "",
        clientId: filters.clientId,
        clientName: filters.clientName,
        detention: filters.detention,
        startDate: filters.startDate,
        endDate: filters.endDate,
        excludeLRs: generatedLRs,
      };
      const response = await fetch("/api/billing/detention", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        const filteredData = (data.data || []).filter((item) => !generatedLRs.includes(item.lrNo));
        setBillData(filteredData);
        setSummary({
          totalAmount: filteredData.reduce((s, i) => s + (i.amount || 0), 0),
          totalRecords: filteredData.length,
        });
        setSelectedRows({});
        setSelectAll(false);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRow = (index) => setSelectedRows((prev) => ({ ...prev, [index]: !prev[index] }));
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows({});
    } else {
      const newSelected = {};
      billData.forEach((_, idx) => (newSelected[idx] = true));
      setSelectedRows(newSelected);
    }
    setSelectAll(!selectAll);
  };
  const getSelectedData = () => billData.filter((_, idx) => selectedRows[idx]);
  const getSelectedSummary = () => {
    const selected = getSelectedData();
    return {
      totalAmount: selected.reduce((s, i) => s + (i.amount || 0), 0),
      totalRecords: selected.length,
    };
  };

  const handleClientChange = (clientId) => {
    const selectedClient = clients.find((c) => c._id === clientId);
    setFilters((prev) => ({
      ...prev,
      clientId: clientId,
      clientName: selectedClient?.customerName || "",
      clientGST: selectedClient?.gstNumber || "",
      clientState: selectedClient?.state || "",
      clientStateCode: selectedClient?.stateCode || "",
      clientAddress: selectedClient?.address || "",
      clientCity: selectedClient?.city || "",
    }));
  };

  const handleGenerateReport = async () => {
    if (!canGenerate) {
      alert("You don't have permission to generate bills");
      return;
    }
    const selected = getSelectedData();
    if (selected.length === 0) return alert("Please select at least one record to generate report");
    setGenerating(true);
    const selectedSummary = getSelectedSummary();
    const reportData = {
      reportId: `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "detention",
      filters: {
        clientName: filters.clientName,
        clientGST: filters.clientGST,
        clientState: filters.clientState,
        clientStateCode: filters.clientStateCode,
        clientAddress: filters.clientAddress,
        clientCity: filters.clientCity,
        branchName: branches.find((b) => b._id === filters.branchId)?.name || "N/A",
        startDate: filters.startDate,
        endDate: filters.endDate,
        detention: filters.detention,
      },
      data: selected,
      summary: selectedSummary,
      totalRecords: billData.length,
      selectedRecords: selected.length,
    };
    await generateAndSaveReport(reportData, "detention", filters, async () => {
      await loadGeneratedLRs();
      setSelectedRows({});
      setSelectAll(false);
    });
    setGenerating(false);
  };

  const handlePreviewBill = async () => {
    const selected = getSelectedData();
    if (!selected.length) return alert("Select at least one billing row to preview.");
    const branch = branches.find((item) => item._id === filters.branchId);
    setPreviewHtml(await createTemporaryBillingPreview({ type: "detention", data: selected, summary: getSelectedSummary(), filters: { ...filters, branchName: branch?.name || "N/A" }, branches, clients, clientId: filters.clientId }));
  };

  const selectedCount = Object.keys(selectedRows).filter((k) => selectedRows[k]).length;

  return (
    <Card title="Detention - Billing">
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 md:col-span-3">
          <ClientSelector value={filters.clientId} onChange={handleClientChange} clients={clients} loading={loadingClients} />
        </div>
        <div className="col-span-12 md:col-span-3">
          <BranchSelector value={filters.branchId} onChange={(val) => setFilters((prev) => ({ ...prev, branchId: val }))} branches={branches} loading={loadingBranches} />
        </div>
        <div className="col-span-12 md:col-span-2">
          <label className="block text-xs font-bold mb-1">Detention</label>
          <input
            type="text"
            value={filters.detention}
            onChange={(e) => setFilters((prev) => ({ ...prev, detention: e.target.value }))}
            className="rounded-xl border p-2 w-full"
            placeholder="Detention Type"
          />
        </div>
        <div className="col-span-12 md:col-span-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            className="rounded-xl border p-2 w-full"
          />
          <p className="text-xs mt-1">Start Date</p>
        </div>
        <div className="col-span-12 md:col-span-2">
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            className="rounded-xl border p-2 w-full"
          />
          <p className="text-xs mt-1">End Date</p>
        </div>
      </div>

      {billData.length > 0 && canGenerate && (
        <div className="mt-4">
          <button type="button" onClick={handlePreviewBill} disabled={selectedCount === 0} className={`mr-2 rounded-xl border border-emerald-600 px-5 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 ${selectedCount === 0 ? "cursor-not-allowed opacity-50" : ""}`}>
            Preview Selected Bill (No Print)
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={generating || selectedCount === 0}
            className={`bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition ${generating || selectedCount === 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
          >
            {generating ? "Generating..." : `📄 Generate Bill (${selectedCount} Selected)`}
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
          <p>Loading...</p>
        </div>
      )}

      {!loading && billData.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <div className="mb-2 flex justify-between">
            <span>✅ {summary.totalRecords} records</span>
            {canGenerate && <span className="text-blue-600">Selected: {selectedCount}</span>}
          </div>
          <table className="min-w-full border">
            <thead className="bg-emerald-50">
              <tr>
                {canGenerate && (
                  <th className="px-3 py-2 border w-10">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                  </th>
                )}
                <th className="px-3 py-2 border">S.No</th>
                <th className="px-3 py-2 border">Date</th>
                <th className="px-3 py-2 border">LR No</th>
                <th className="px-3 py-2 border">Vehicle No</th>
                <th className="px-3 py-2 border">From</th>
                <th className="px-3 py-2 border">To</th>
                <th className="px-3 py-2 border">Detention Type</th>
                <th className="px-3 py-2 border text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {billData.map((item, idx) => (
                <tr key={idx} className={selectedRows[idx] && canGenerate ? "bg-blue-50" : ""}>
                  {canGenerate && (
                    <td className="px-3 py-2 border text-center">
                      <input type="checkbox" checked={!!selectedRows[idx]} onChange={() => handleSelectRow(idx)} />
                    </td>
                  )}
                  <td className="px-3 py-2 border">{idx + 1}</td>
                  <td className="px-3 py-2 border">{safeFormatDate(item.date)}</td>
                  <td className="px-3 py-2 border font-medium text-emerald-700">{item.lrNo || "-"}</td>
                  <td className="px-3 py-2 border">{item.vehicleNo || "-"}</td>
                  <td className="px-3 py-2 border">{item.from || "-"}</td>
                  <td className="px-3 py-2 border">{item.to || "-"}</td>
                  <td className="px-3 py-2 border">{item.detentionType || filters.detention || "-"}</td>
                  <td className="px-3 py-2 border text-right">₹ {item.amount?.toFixed(2) || "0.00"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-emerald-100 font-bold">
              <tr>
                <td colSpan={canGenerate ? 7 : 6} className="px-3 py-2 border text-right">TOTAL</td>
                <td className="px-3 py-2 border text-right">₹ {summary.totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {!loading && !filters.clientId && <div className="text-center py-8">Select a client to view data</div>}
      {!loading && filters.clientId && billData.length === 0 && (
        <div className="text-center py-8">
          <p>No pending records found</p>
          {generatedLRs.length > 0 && <p className="text-sm text-gray-500 mt-2">All LR numbers have been billed already</p>}
        </div>
      )}
      <BillingPreviewModal html={previewHtml} onClose={() => setPreviewHtml("")} />
    </Card>
  );
}

// ==================== CANCELLATION BILLING COMPONENT ====================
function CancellationBillingComponent({ branches, clients, loadingBranches, loadingClients, canGenerate }) {
  const [loading, setLoading] = useState(false);
  const [billData, setBillData] = useState([]);
  const [summary, setSummary] = useState({ totalAmount: 0, totalRecords: 0 });
  const [selectedRows, setSelectedRows] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [generatedLRs, setGeneratedLRs] = useState([]);

  const [filters, setFilters] = useState({
    branchId: "",
    clientId: "",
    clientName: "",
    clientGST: "",
    clientState: "",
    clientStateCode: "",
    clientAddress: "",
    clientCity: "",
    cancellation: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const formatDate = (date) => date.toISOString().split("T")[0];
    setFilters((prev) => ({ ...prev, startDate: formatDate(firstDayOfMonth), endDate: formatDate(lastDayOfMonth) }));
    loadGeneratedLRs();
  }, []);

  useEffect(() => {
    if (filters.clientId && filters.startDate && filters.endDate) fetchData();
  }, [filters.clientId, filters.branchId, filters.cancellation, filters.startDate, filters.endDate]);

  const loadGeneratedLRs = async () => {
    const lrs = await getGeneratedLRNumbers();
    setGeneratedLRs(lrs);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        type: "cancellation",
        branchId: filters.branchId,
        branchName: branches.find((b) => b._id === filters.branchId)?.name || "",
        clientId: filters.clientId,
        clientName: filters.clientName,
        cancellation: filters.cancellation,
        startDate: filters.startDate,
        endDate: filters.endDate,
        excludeLRs: generatedLRs,
      };
      const response = await fetch("/api/billing/cancellation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        const filteredData = (data.data || []).filter((item) => !generatedLRs.includes(item.lrNo));
        setBillData(filteredData);
        setSummary({
          totalAmount: filteredData.reduce((s, i) => s + (i.amount || 0), 0),
          totalRecords: filteredData.length,
        });
        setSelectedRows({});
        setSelectAll(false);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRow = (index) => setSelectedRows((prev) => ({ ...prev, [index]: !prev[index] }));
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows({});
    } else {
      const newSelected = {};
      billData.forEach((_, idx) => (newSelected[idx] = true));
      setSelectedRows(newSelected);
    }
    setSelectAll(!selectAll);
  };
  const getSelectedData = () => billData.filter((_, idx) => selectedRows[idx]);
  const getSelectedSummary = () => {
    const selected = getSelectedData();
    return {
      totalAmount: selected.reduce((s, i) => s + (i.amount || 0), 0),
      totalRecords: selected.length,
    };
  };

  const handleClientChange = (clientId) => {
    const selectedClient = clients.find((c) => c._id === clientId);
    setFilters((prev) => ({
      ...prev,
      clientId: clientId,
      clientName: selectedClient?.customerName || "",
      clientGST: selectedClient?.gstNumber || "",
      clientState: selectedClient?.state || "",
      clientStateCode: selectedClient?.stateCode || "",
      clientAddress: selectedClient?.address || "",
      clientCity: selectedClient?.city || "",
    }));
  };

  const handleGenerateReport = async () => {
    if (!canGenerate) {
      alert("You don't have permission to generate bills");
      return;
    }
    const selected = getSelectedData();
    if (selected.length === 0) return alert("Please select at least one record to generate report");
    setGenerating(true);
    const selectedSummary = getSelectedSummary();
    const reportData = {
      reportId: `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "cancellation",
      filters: {
        clientName: filters.clientName,
        clientGST: filters.clientGST,
        clientState: filters.clientState,
        clientStateCode: filters.clientStateCode,
        clientAddress: filters.clientAddress,
        clientCity: filters.clientCity,
        branchName: branches.find((b) => b._id === filters.branchId)?.name || "N/A",
        startDate: filters.startDate,
        endDate: filters.endDate,
        cancellation: filters.cancellation,
      },
      data: selected,
      summary: selectedSummary,
      totalRecords: billData.length,
      selectedRecords: selected.length,
    };
    await generateAndSaveReport(reportData, "cancellation", filters, async () => {
      await loadGeneratedLRs();
      setSelectedRows({});
      setSelectAll(false);
    });
    setGenerating(false);
  };

  const handlePreviewBill = async () => {
    const selected = getSelectedData();
    if (!selected.length) return alert("Select at least one billing row to preview.");
    const branch = branches.find((item) => item._id === filters.branchId);
    setPreviewHtml(await createTemporaryBillingPreview({ type: "cancellation", data: selected, summary: getSelectedSummary(), filters: { ...filters, branchName: branch?.name || "N/A" }, branches, clients, clientId: filters.clientId }));
  };

  const selectedCount = Object.keys(selectedRows).filter((k) => selectedRows[k]).length;

  return (
    <Card title="Cancellation - Billing">
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 md:col-span-3">
          <ClientSelector value={filters.clientId} onChange={handleClientChange} clients={clients} loading={loadingClients} />
        </div>
        <div className="col-span-12 md:col-span-3">
          <BranchSelector value={filters.branchId} onChange={(val) => setFilters((prev) => ({ ...prev, branchId: val }))} branches={branches} loading={loadingBranches} />
        </div>
        <div className="col-span-12 md:col-span-2">
          <label className="block text-xs font-bold mb-1">Cancellation</label>
          <input
            type="text"
            value={filters.cancellation}
            onChange={(e) => setFilters((prev) => ({ ...prev, cancellation: e.target.value }))}
            className="rounded-xl border p-2 w-full"
            placeholder="Cancellation Type"
          />
        </div>
        <div className="col-span-12 md:col-span-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            className="rounded-xl border p-2 w-full"
          />
          <p className="text-xs mt-1">Start Date</p>
        </div>
        <div className="col-span-12 md:col-span-2">
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            className="rounded-xl border p-2 w-full"
          />
          <p className="text-xs mt-1">End Date</p>
        </div>
      </div>

      {billData.length > 0 && canGenerate && (
        <div className="mt-4">
          <button type="button" onClick={handlePreviewBill} disabled={selectedCount === 0} className={`mr-2 rounded-xl border border-emerald-600 px-5 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 ${selectedCount === 0 ? "cursor-not-allowed opacity-50" : ""}`}>
            Preview Selected Bill (No Print)
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={generating || selectedCount === 0}
            className={`bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition ${generating || selectedCount === 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
          >
            {generating ? "Generating..." : `📄 Generate Bill (${selectedCount} Selected)`}
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
          <p>Loading...</p>
        </div>
      )}

      {!loading && billData.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <div className="mb-2 flex justify-between">
            <span>✅ {summary.totalRecords} records</span>
            {canGenerate && <span className="text-blue-600">Selected: {selectedCount}</span>}
          </div>
          <table className="min-w-full border">
            <thead className="bg-emerald-50">
              <tr>
                {canGenerate && (
                  <th className="px-3 py-2 border w-10">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                  </th>
                )}
                <th className="px-3 py-2 border">S.No</th>
                <th className="px-3 py-2 border">Date</th>
                <th className="px-3 py-2 border">LR No</th>
                <th className="px-3 py-2 border">Vehicle No</th>
                <th className="px-3 py-2 border">From</th>
                <th className="px-3 py-2 border">To</th>
                <th className="px-3 py-2 border">Cancellation Type</th>
                <th className="px-3 py-2 border text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {billData.map((item, idx) => (
                <tr key={idx} className={selectedRows[idx] && canGenerate ? "bg-blue-50" : ""}>
                  {canGenerate && (
                    <td className="px-3 py-2 border text-center">
                      <input type="checkbox" checked={!!selectedRows[idx]} onChange={() => handleSelectRow(idx)} />
                    </td>
                  )}
                  <td className="px-3 py-2 border">{idx + 1}</td>
                  <td className="px-3 py-2 border">{safeFormatDate(item.date)}</td>
                  <td className="px-3 py-2 border font-medium text-emerald-700">{item.lrNo || "-"}</td>
                  <td className="px-3 py-2 border">{item.vehicleNo || "-"}</td>
                  <td className="px-3 py-2 border">{item.from || "-"}</td>
                  <td className="px-3 py-2 border">{item.to || "-"}</td>
                  <td className="px-3 py-2 border">{item.cancellationType || filters.cancellation || "-"}</td>
                  <td className="px-3 py-2 border text-right">₹ {item.amount?.toFixed(2) || "0.00"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-emerald-100 font-bold">
              <tr>
                <td colSpan={canGenerate ? 7 : 6} className="px-3 py-2 border text-right">TOTAL</td>
                <td className="px-3 py-2 border text-right">₹ {summary.totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {!loading && !filters.clientId && <div className="text-center py-8">Select a client to view data</div>}
      {!loading && filters.clientId && billData.length === 0 && (
        <div className="text-center py-8">
          <p>No pending records found</p>
          {generatedLRs.length > 0 && <p className="text-sm text-gray-500 mt-2">All LR numbers have been billed already</p>}
        </div>
      )}
      <BillingPreviewModal html={previewHtml} onClose={() => setPreviewHtml("")} />
    </Card>
  );
}

// ==================== OTHER BILLING COMPONENT ====================
function OtherBillingComponent({ branches, clients, loadingBranches, loadingClients, canGenerate }) {
  const [loading, setLoading] = useState(false);
  const [billData, setBillData] = useState([]);
  const [summary, setSummary] = useState({ totalAmount: 0, totalRecords: 0 });
  const [selectedRows, setSelectedRows] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [generatedLRs, setGeneratedLRs] = useState([]);

  const [filters, setFilters] = useState({
    branchId: "",
    clientId: "",
    clientName: "",
    clientGST: "",
    clientState: "",
    clientStateCode: "",
    clientAddress: "",
    clientCity: "",
    type: "Cancellation",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const formatDate = (date) => date.toISOString().split("T")[0];
    setFilters((prev) => ({ ...prev, startDate: formatDate(firstDayOfMonth), endDate: formatDate(lastDayOfMonth) }));
    loadGeneratedLRs();
  }, []);

  useEffect(() => {
    if (filters.clientId && filters.startDate && filters.endDate) fetchData();
  }, [filters.clientId, filters.branchId, filters.type, filters.startDate, filters.endDate]);

  const loadGeneratedLRs = async () => {
    const lrs = await getGeneratedLRNumbers();
    setGeneratedLRs(lrs);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        type: "other",
        branchId: filters.branchId,
        branchName: branches.find((b) => b._id === filters.branchId)?.name || "",
        clientId: filters.clientId,
        clientName: filters.clientName,
        billingType: filters.type,
        startDate: filters.startDate,
        endDate: filters.endDate,
        excludeLRs: generatedLRs,
      };
      const response = await fetch("/api/billing/other", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        const filteredData = (data.data || []).filter((item) => !generatedLRs.includes(item.lrNo));
        setBillData(filteredData);
        setSummary({
          totalAmount: filteredData.reduce((s, i) => s + (i.amount || 0), 0),
          totalRecords: filteredData.length,
        });
        setSelectedRows({});
        setSelectAll(false);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRow = (index) => setSelectedRows((prev) => ({ ...prev, [index]: !prev[index] }));
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows({});
    } else {
      const newSelected = {};
      billData.forEach((_, idx) => (newSelected[idx] = true));
      setSelectedRows(newSelected);
    }
    setSelectAll(!selectAll);
  };
  const getSelectedData = () => billData.filter((_, idx) => selectedRows[idx]);
  const getSelectedSummary = () => {
    const selected = getSelectedData();
    return {
      totalAmount: selected.reduce((s, i) => s + (i.amount || 0), 0),
      totalRecords: selected.length,
    };
  };

  const handleClientChange = (clientId) => {
    const selectedClient = clients.find((c) => c._id === clientId);
    setFilters((prev) => ({
      ...prev,
      clientId: clientId,
      clientName: selectedClient?.customerName || "",
      clientGST: selectedClient?.gstNumber || "",
      clientState: selectedClient?.state || "",
      clientStateCode: selectedClient?.stateCode || "",
      clientAddress: selectedClient?.address || "",
      clientCity: selectedClient?.city || "",
    }));
  };

  const handleGenerateReport = async () => {
    if (!canGenerate) {
      alert("You don't have permission to generate bills");
      return;
    }
    const selected = getSelectedData();
    if (selected.length === 0) return alert("Please select at least one record to generate report");
    setGenerating(true);
    const selectedSummary = getSelectedSummary();
    const reportData = {
      reportId: `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "other",
      filters: {
        clientName: filters.clientName,
        clientGST: filters.clientGST,
        clientState: filters.clientState,
        clientStateCode: filters.clientStateCode,
        clientAddress: filters.clientAddress,
        clientCity: filters.clientCity,
        branchName: branches.find((b) => b._id === filters.branchId)?.name || "N/A",
        startDate: filters.startDate,
        endDate: filters.endDate,
        billingType: filters.type,
      },
      data: selected,
      summary: selectedSummary,
      totalRecords: billData.length,
      selectedRecords: selected.length,
    };
    await generateAndSaveReport(reportData, "other", filters, async () => {
      await loadGeneratedLRs();
      setSelectedRows({});
      setSelectAll(false);
    });
    setGenerating(false);
  };

  const handlePreviewBill = async () => {
    const selected = getSelectedData();
    if (!selected.length) return alert("Select at least one billing row to preview.");
    const branch = branches.find((item) => item._id === filters.branchId);
    setPreviewHtml(await createTemporaryBillingPreview({ type: "other", data: selected, summary: getSelectedSummary(), filters: { ...filters, branchName: branch?.name || "N/A", billingType: filters.type }, branches, clients, clientId: filters.clientId }));
  };

  const selectedCount = Object.keys(selectedRows).filter((k) => selectedRows[k]).length;

  return (
    <Card title="Other - Billing">
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 md:col-span-3">
          <ClientSelector value={filters.clientId} onChange={handleClientChange} clients={clients} loading={loadingClients} />
        </div>
        <div className="col-span-12 md:col-span-3">
          <BranchSelector value={filters.branchId} onChange={(val) => setFilters((prev) => ({ ...prev, branchId: val }))} branches={branches} loading={loadingBranches} />
        </div>
        <div className="col-span-12 md:col-span-2">
          <label className="block text-xs font-bold mb-1">Type</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
            className="rounded-xl border p-2 w-full"
          >
            <option value="Cancellation">Cancellation</option>
            <option value="Detention">Detention</option>
            <option value="Demurrage">Demurrage</option>
            <option value="Other Charges">Other Charges</option>
          </select>
        </div>
        <div className="col-span-12 md:col-span-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            className="rounded-xl border p-2 w-full"
          />
          <p className="text-xs mt-1">Start Date</p>
        </div>
        <div className="col-span-12 md:col-span-2">
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            className="rounded-xl border p-2 w-full"
          />
          <p className="text-xs mt-1">End Date</p>
        </div>
      </div>

      {billData.length > 0 && canGenerate && (
        <div className="mt-4">
          <button type="button" onClick={handlePreviewBill} disabled={selectedCount === 0} className={`mr-2 rounded-xl border border-emerald-600 px-5 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 ${selectedCount === 0 ? "cursor-not-allowed opacity-50" : ""}`}>
            Preview Selected Bill (No Print)
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={generating || selectedCount === 0}
            className={`bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition ${generating || selectedCount === 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
          >
            {generating ? "Generating..." : `📄 Generate Bill (${selectedCount} Selected)`}
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
          <p>Loading...</p>
        </div>
      )}

      {!loading && billData.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <div className="mb-2 flex justify-between">
            <span>✅ {summary.totalRecords} records</span>
            {canGenerate && <span className="text-blue-600">Selected: {selectedCount}</span>}
          </div>
          <table className="min-w-full border">
            <thead className="bg-emerald-50">
              <tr>
                {canGenerate && (
                  <th className="px-3 py-2 border w-10">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                  </th>
                )}
                <th className="px-3 py-2 border">S.No</th>
                <th className="px-3 py-2 border">Date</th>
                <th className="px-3 py-2 border">LR No</th>
                <th className="px-3 py-2 border">Vehicle No</th>
                <th className="px-3 py-2 border">From</th>
                <th className="px-3 py-2 border">To</th>
                <th className="px-3 py-2 border">Bill Type</th>
                <th className="px-3 py-2 border text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {billData.map((item, idx) => (
                <tr key={idx} className={selectedRows[idx] && canGenerate ? "bg-blue-50" : ""}>
                  {canGenerate && (
                    <td className="px-3 py-2 border text-center">
                      <input type="checkbox" checked={!!selectedRows[idx]} onChange={() => handleSelectRow(idx)} />
                    </td>
                  )}
                  <td className="px-3 py-2 border">{idx + 1}</td>
                  <td className="px-3 py-2 border">{safeFormatDate(item.date)}</td>
                  <td className="px-3 py-2 border font-medium text-emerald-700">{item.lrNo || "-"}</td>
                  <td className="px-3 py-2 border">{item.vehicleNo || "-"}</td>
                  <td className="px-3 py-2 border">{item.from || "-"}</td>
                  <td className="px-3 py-2 border">{item.to || "-"}</td>
                  <td className="px-3 py-2 border">{item.billingType || filters.type || "-"}</td>
                  <td className="px-3 py-2 border text-right">₹ {item.amount?.toFixed(2) || "0.00"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-emerald-100 font-bold">
              <tr>
                <td colSpan={canGenerate ? 7 : 6} className="px-3 py-2 border text-right">TOTAL</td>
                <td className="px-3 py-2 border text-right">₹ {summary.totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {!loading && !filters.clientId && <div className="text-center py-8">Select a client to view data</div>}
      {!loading && filters.clientId && billData.length === 0 && (
        <div className="text-center py-8">
          <p>No pending records found</p>
          {generatedLRs.length > 0 && <p className="text-sm text-gray-500 mt-2">All LR numbers have been billed already</p>}
        </div>
      )}
      <BillingPreviewModal html={previewHtml} onClose={() => setPreviewHtml("")} />
    </Card>
  );
}

// ==================== MAIN BILLING PAGE ====================
function PreviousBills() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    const loadReports = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/saved-reports", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (live && response.ok && result.success) setReports(result.data || []);
      } catch (error) {
        console.error("Failed to load previous bills:", error);
      } finally {
        if (live) setLoading(false);
      }
    };

    loadReports();
    window.addEventListener("billing-report-saved", loadReports);
    return () => {
      live = false;
      window.removeEventListener("billing-report-saved", loadReports);
    };
  }, []);

  const printReport = (report) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print a previous bill.");
      return;
    }
    const billNumber = report.billNumber || report.reportId;
    const generatedAt = report.generatedAt ? new Date(report.generatedAt).toLocaleString() : "";
    printWindow.document.write(generatePDFHTML(report, generatedAt, report.type, report.filters || {}, billNumber));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const typeLabels = {
    "product-wise": "Yara Product-Wise",
    general: "General",
    detention: "Detention",
    cancellation: "Cancellation",
    other: "Other",
  };

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Previous Bills</h2>
          <p className="text-sm text-slate-500">Open a previously generated bill in print view.</p>
        </div>
        <span className="text-sm text-slate-500">{reports.length} saved</span>
      </div>
      {loading ? (
        <p className="py-5 text-center text-sm text-slate-500">Loading previous bills…</p>
      ) : reports.length === 0 ? (
        <p className="py-5 text-center text-sm text-slate-500">No bills have been generated yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Bill No.</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2 text-right">LRs</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-right">Print</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.reportId} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold text-slate-800">{report.billNumber || report.reportId}</td>
                  <td className="px-3 py-2 text-slate-600">{report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{typeLabels[report.type] || report.type}</td>
                  <td className="px-3 py-2 text-slate-600">{report.filters?.clientName || "—"}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{report.selectedRecords ?? report.data?.length ?? 0}</td>
                  <td className="px-3 py-2 text-right text-slate-600">₹ {Number(report.summary?.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => printReport(report)} className="rounded-lg border border-emerald-300 px-3 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-50">
                      Print View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function BillingPage() {
  const router = useRouter();
  const { canView, canCreate, loading: permissionLoading } = usePermission();
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingPlants, setLoadingPlants] = useState(false);
  const [selectedBillingType, setSelectedBillingType] = useState("");
  const [branches, setBranches] = useState([]);
  const [clients, setClients] = useState([]);
  const [plants, setPlants] = useState([]);

  const MODULE_NAME = 'Billing';

  // Find the fetchClients function and update it
  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Fetching clients...');
      const res = await fetch('/api/customers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      console.log('📊 Clients response:', JSON.stringify(data, null, 2));

      if (data.success && Array.isArray(data.data)) {
        console.log('✅ Number of clients found:', data.data.length);
        if (data.data.length > 0) {
          console.log('📋 First client:', data.data[0]);
          console.log('📋 Client field names:', Object.keys(data.data[0]));
        }
        setClients(data.data);
      } else if (Array.isArray(data)) {
        console.log('✅ Number of clients found (array):', data.length);
        if (data.length > 0) {
          console.log('📋 First client:', data[0]);
        }
        setClients(data);
      } else {
        console.warn('⚠️ No clients found');
        setClients([]);
      }
    } catch (error) {
      console.error('❌ Error fetching clients:', error);
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  // Also update fetchBranches
  const fetchBranches = async () => {
    setLoadingBranches(true);
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Fetching branches...');
      const res = await fetch('/api/branches', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      console.log('📊 Branches response:', data);

      if (data.success && Array.isArray(data.data)) {
        console.log('✅ Number of branches found:', data.data.length);
        if (data.data.length > 0) {
          console.log('📋 First branch:', data.data[0]);
        }
        setBranches(data.data);
      } else {
        console.warn('⚠️ No branches found');
        setBranches([]);
      }
    } catch (error) {
      console.error('❌ Error fetching branches:', error);
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  };

  // Also update fetchPlants
  const fetchPlants = async () => {
    setLoadingPlants(true);
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Fetching plants...');
      const res = await fetch('/api/plants', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      console.log('📊 Plants response:', data);

      if (data.success && Array.isArray(data.data)) {
        console.log('✅ Number of plants found:', data.data.length);
        if (data.data.length > 0) {
          console.log('📋 First plant:', data.data[0]);
        }
        setPlants(data.data);
      } else {
        console.warn('⚠️ No plants found');
        setPlants([]);
      }
    } catch (error) {
      console.error('❌ Error fetching plants:', error);
      setPlants([]);
    } finally {
      setLoadingPlants(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchClients();
    fetchPlants();
  }, []);

  const canGenerate = canCreate && canView;

  if (permissionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access Billing.
            Please contact your administrator.
          </p>
          <Link
            href="/admin"
            className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const renderSelectedBillingCard = () => {
    switch (selectedBillingType) {
      case "product-wise":
        return <ProductWiseBillingComponent branches={branches} clients={clients} plants={plants} loadingBranches={loadingBranches} loadingClients={loadingClients} loadingPlants={loadingPlants} canGenerate={canGenerate} />;
      case "general":
        return <GeneralBillingComponent branches={branches} clients={clients} loadingBranches={loadingBranches} loadingClients={loadingClients} canGenerate={canGenerate} />;
      case "detention":
        return <DetentionBillingComponent branches={branches} clients={clients} loadingBranches={loadingBranches} loadingClients={loadingClients} canGenerate={canGenerate} />;
      case "cancellation":
        return <CancellationBillingComponent branches={branches} clients={clients} loadingBranches={loadingBranches} loadingClients={loadingClients} canGenerate={canGenerate} />;
      case "other":
        return <OtherBillingComponent branches={branches} clients={clients} loadingBranches={loadingBranches} loadingClients={loadingClients} canGenerate={canGenerate} />;
      default:
        return (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-500 text-lg">Please select a billing type from the dropdown above</p>
            <p className="text-slate-400 text-sm mt-2">Choose Yara Product-Wise, General, Detention, Cancellation, or Other Billing</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-full px-6 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className="text-emerald-600 hover:text-emerald-800 font-medium text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Billing</h1>
              <p className="mt-0.5 text-sm text-slate-500">Review transport charges and generate billing reports.</p>
            </div>
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-7xl p-6">
        <BillingTypeSelector value={selectedBillingType} onChange={setSelectedBillingType} />
        {renderSelectedBillingCard()}
        <PreviousBills />
      </main>
    </div>
  );
}
