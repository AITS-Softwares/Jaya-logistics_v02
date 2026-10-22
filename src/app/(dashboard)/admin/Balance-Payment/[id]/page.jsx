"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { usePermission } from "../../hooks/usePermission";

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
  const [searchQuery, setSearchQuery] = useState(selectedPodNo || "");
  const [showDropdown, setShowDropdown] = useState(false);
  const [podList, setPodList] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    fetchPODs();
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

  const q = searchQuery.toLowerCase();
  const filteredPODs = podList.filter(
    (pod) =>
      pod.podNo?.toLowerCase().includes(q) ||
      pod.purchaseNo?.toLowerCase().includes(q) ||
      pod.vendorName?.toLowerCase().includes(q) ||
      pod.companyName?.toLowerCase().includes(q)
  );

  const placeDropdown = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPosition({ top: rect.bottom, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (!showDropdown) return;
    window.addEventListener("scroll", placeDropdown, true);
    window.addEventListener("resize", placeDropdown);
    return () => {
      window.removeEventListener("scroll", placeDropdown, true);
      window.removeEventListener("resize", placeDropdown);
    };
  }, [showDropdown]);

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => { placeDropdown(); setShowDropdown(true); }}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        placeholder="Search POD No, Purchase No, Vendor, or Company..."
      />
      {showDropdown && (
        <div
          style={{ position: "fixed", top: dropdownPosition.top, left: dropdownPosition.left, width: dropdownPosition.width, zIndex: 9999, maxHeight: "300px" }}
          className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-y-auto"
        >
          {loading ? (
            <div className="p-4 text-center text-sm text-slate-500">Loading...</div>
          ) : filteredPODs.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredPODs.map((pod) => (
                <div
                  key={pod._id}
                  onMouseDown={() => { setSearchQuery(pod.podNo); setShowDropdown(false); onSelect(pod); }}
                  className="p-3 hover:bg-emerald-50 cursor-pointer"
                >
                  <div className="font-medium text-slate-800">{pod.podNo}</div>
                  <div className="text-xs text-slate-500">Purchase: {pod.purchaseNo} | Vendor: {pod.vendorName}</div>
                  <div className="text-xs text-slate-500">Company: {pod.companyName || "N/A"}</div>
                  <div className="text-xs text-slate-400">Total: ₹{pod.totalAmount?.toLocaleString()} | Balance: ₹{pod.finalBalance?.toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-slate-500">No PODs found</div>
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

const MODULE_NAME = "Balance-Payment";
const SETTLED_STATUSES = ["Paid", "Completed"];

const toDateInput = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
};

function PageMessage({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center p-6">
      {children}
    </div>
  );
}

export default function EditBalancePayment() {
  const router = useRouter();
  const params = useParams();
  const paymentId = params.id;

  const { hasPermission, loading: permissionLoading } = usePermission();
  const canEditHere = hasPermission(MODULE_NAME, "edit");
  const canGenerateQueue = hasPermission(MODULE_NAME, "approve");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadedMsg, setLoadedMsg] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notFound, setNotFound] = useState("");

  const [balancePaymentNo, setBalancePaymentNo] = useState("");
  const [queueGenerated, setQueueGenerated] = useState(false);
  const [queueDate, setQueueDate] = useState(null);
  const [isDraft, setIsDraft] = useState(false);

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

  // Money figures (same shape as the create page)
  const [figures, setFigures] = useState(EMPTY_FIGURES);
  const [breakdown, setBreakdown] = useState(EMPTY_BREAKDOWN);

  // Payment Transaction Details
  const [vendorNameDebit, setVendorNameDebit] = useState("");
  const [accountNoCredit, setAccountNoCredit] = useState("");
  const [finalAmount, setFinalAmount] = useState("");
  const [remarks, setRemarks] = useState("Balance Payment");
  const [transactionId, setTransactionId] = useState("");
  const [bankVendorCode, setBankVendorCode] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Pending"); // display only - status is changed on the Approve page

  const isSettled = SETTLED_STATUSES.includes(paymentStatus);

  useEffect(() => {
    if (paymentId) loadPayment();
  }, [paymentId]);

  const fetchPod = async (no) => {
    const token = localStorage.getItem("token");
    const r = await fetch(`/api/balance-payment/pod-lookup?podNo=${encodeURIComponent(no)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await r.json();
    if (j.success && j.data) return { pd: j.data };
    return { error: j.message || `POD data not found for POD No: ${no}` };
  };

  const figuresFromPod = (vf) => ({
    amount: num(vf.total || vf.amount),
    advance: num(vf.advance),
    totalAddition: num(vf.totalAddition),
    totalDeduction: num(vf.totalDeduction),
    poAddition: num(vf.poAddition),
    poDeduction: num(vf.poDeduction),
    podDeduction: num(vf.podDeduction),
    finalBalance: num(vf.finalBalance),
  });

  // Load the saved Balance Payment
  const loadPayment = async () => {
    setLoading(true);
    setNotFound("");
    setLoadError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/balance-payment?id=${paymentId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!(data.success && data.data)) {
        setNotFound(data.message || "Failed to load balance payment");
        return;
      }
      const p = data.data;

      setCompanyInfo({
        companyName: p.companyName || "",
        companyCode: p.companyCode || "",
        subCompanyId: p.subCompanyId || null,
        subCompanyName: p.subCompanyName || "",
        subCompanyCode: p.subCompanyCode || "",
      });

      setBalancePaymentNo(p.balancePaymentNo || "");
      setBranch(p.branch || "");
      setBranchCode(p.branchCode || "");
      setDate(toDateInput(p.date) || today());
      setVendorName(p.vendorName || p.vendorNamePayment || "");
      setPodNo(p.podNo || "");
      setPurchaseNo(p.purchaseNo || "");

      setVendorStatus(p.vendorStatus || "Active");
      setVendorCode(p.vendorCode || "");
      setVendorNamePayment(p.vendorNamePayment || p.vendorName || "");
      setVehicleNo(p.vehicleNo || "");
      setPurchaseType(p.purchaseType || "Loading & Unloading");
      setRateType(p.rateType || "Per MT");
      setRate(p.rate ? String(p.rate) : "");
      setWeight(p.weight ? String(p.weight) : "");
      setDueDate(p.dueDate || "");

      setOrderRows(
        (p.orderRows || []).map((row) => ({
          ...row,
          _id: row._id ? String(row._id) : uid(),
          stateName: row.stateName || row.state || "",
          fromState: row.fromState || "",
          fromName: row.fromName || row.from || "",
          toName: row.toName || row.to || "",
          localStatus: row.localStatus || "unknown",
          localStatusLabel: row.localStatusLabel || "Unknown",
        }))
      );

      setFigures({
        amount: num(p.amount),
        advance: num(p.advance),
        totalAddition: num(p.totalAddition),
        totalDeduction: num(p.totalDeduction),
        poAddition: num(p.poAddition),
        poDeduction: num(p.poDeduction),
        podDeduction: num(p.podDeduction),
        finalBalance: num(p.finalBalance),
      });
      setBreakdown({ ...EMPTY_BREAKDOWN, ...(p.breakdown || {}) });

      setVendorNameDebit(p.vendorNameDebit || "");
      setAccountNoCredit(p.accountNoCredit || "");
      setFinalAmount(num(p.finalAmount).toFixed(2));
      setRemarks(p.remarks || "Balance Payment");
      setTransactionId(p.transactionId || "");
      setBankVendorCode(p.bankVendorCode || "");
      setPaymentStatus(p.paymentStatus || "Pending");
      setQueueGenerated(!!p.queueGenerated);
      setQueueDate(p.queueDate || null);
      setIsDraft(!!p.isDraft || p.paymentStatus === 'Draft');

      // Unsettled payments are re-calculated by the server on save, so show the current POD figures
      // (exactly what will be saved). Paid / Completed payments keep their saved figures.
      if (!SETTLED_STATUSES.includes(p.paymentStatus) && p.podNo) {
        const { pd, error } = await fetchPod(p.podNo);
        if (pd) {
          const live = figuresFromPod(pd.vendorFinancial || {});
          setFigures(live);
          setBreakdown({ ...EMPTY_BREAKDOWN, ...(pd.breakdown || {}) });
          // A full payment follows the new final balance; a deliberate part payment is kept (never above the balance)
          const wasFull = num(p.finalAmount) >= num(p.finalBalance) - 0.005;
          const amt = wasFull ? live.finalBalance : Math.min(num(p.finalAmount), live.finalBalance);
          setFinalAmount(Math.max(amt, 0).toFixed(2));
        } else {
          setLoadError(`${error} Showing the saved figures.`);
        }
      }
    } catch (err) {
      console.error("Error fetching balance payment:", err);
      setNotFound("Failed to load balance payment data");
    } finally {
      setLoading(false);
    }
  };

  // Change the POD - loads everything from the new POD exactly like the create page
  const handlePODSelect = async (pod) => {
    setLoadingData(true);
    setLoadError("");
    setLoadedMsg("");
    try {
      const { pd, error } = await fetchPod(pod.podNo);
      if (!pd) {
        setLoadError(error);
        return;
      }

      const headerData = pd.header || {};
      const vf = pd.vendorFinancial || {};
      const purchaseOrders = pd.purchaseOrders || [];
      const firstOrder = purchaseOrders[0] || {};

      setPodNo(pd.podNo || pod.podNo);
      setPurchaseNo(pd.purchaseNo || pod.purchaseNo || "");

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

      setVendorStatus(vf.vendorStatus || "Active");
      setVendorCode(vf.vendorCode || "");
      setVendorNamePayment(vf.vendorName || pod.vendorName || "");
      const purchaseInfo = pd.purchaseDetails || {};
      setVehicleNo(purchaseInfo.vehicleNo || firstOrder.vehicleNo || vf.vehicleNo || "");
      setPurchaseType(pd.purchaseType || "Loading & Unloading");
      setRateType(purchaseInfo.rateType || pd.rateType || "Per MT");
      setRate(purchaseInfo.rate ? String(purchaseInfo.rate) : vf.rate?.toString() || "");
      setWeight(purchaseInfo.weight ? String(purchaseInfo.weight) : firstOrder.weight?.toString() || vf.weight?.toString() || "");
      setDueDate(pd.podStatusSection?.dueDate || "");

      const live = figuresFromPod(vf);
      setFigures(live);
      setBreakdown({ ...EMPTY_BREAKDOWN, ...(pd.breakdown || {}) });
      setFinalAmount(live.finalBalance.toFixed(2));

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

      const bank = pd.advanceBank || {};
      setVendorNameDebit(bank.vendorNameDebit || vf.vendorName || "");
      setAccountNoCredit(bank.accountNoCredit || "");
      setTransactionId("");
      setBankVendorCode(bank.bankVendorCode || vf.vendorCode || "");
      setRemarks("Balance Payment");

      setLoadedMsg(`Loaded POD ${pd.podNo || pod.podNo} · Purchase ${pd.purchaseNo || pod.purchaseNo}${pd.companyName ? ` · ${pd.companyName}` : ""}`);
    } catch (err) {
      console.error("Error loading POD data:", err);
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
  const overLimit = !isSettled && payNow > finalBalance + 0.005;
  const isPartial = !!podNo && unpaid > 0.005;

  const handleGenerateQueue = async () => {
    if (isDraft) return alert("Save this draft before generating its queue.");
    if (!canGenerateQueue) return alert("You need approval permission to generate the payment queue.");
    if (queueGenerated) return alert("Queue already generated for this payment.");
    if (["Rejected", "Completed", "Paid"].includes(paymentStatus)) {
      return alert(`Cannot generate a queue for a ${paymentStatus} payment.`);
    }
    if (!window.confirm(`Generate the payment queue for ${balancePaymentNo}?`)) return;

    setQueueLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/balance-payment?id=${paymentId}&action=generate-queue`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to generate payment queue");

      setQueueGenerated(true);
      setQueueDate(data.data?.queueDate || new Date().toISOString());
      setPaymentStatus(data.data?.paymentStatus || "Queued");
      alert(`✅ Payment queue generated for ${balancePaymentNo}\nAmount: ${inr(payNow)}`);
    } catch (error) {
      alert(`❌ ${error.message}`);
    } finally {
      setQueueLoading(false);
    }
  };

  const handleUpdate = async (saveMode = 'update') => {
    const isDraftSave = saveMode === 'draft';
    if (!canEditHere) return alert("You don't have permission to edit balance payments");
    if (queueGenerated) return alert("Cannot update payment after queue generation.");
    if (!isDraftSave && !podNo) return alert("Please select a POD No");
    if (!isDraftSave && overLimit) return alert(`Final amount cannot exceed the final balance (${inr(finalBalance)}).`);
    if (!isDraftSave && isPartial && !isSettled && (!remarks.trim() || remarks.trim() === "Balance Payment")) {
      return alert("You are paying less than the final balance. Please write the reason in Remarks.");
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      // The server re-derives every amount from the POD, Purchase Panel and paid advances.
      // paymentStatus is deliberately NOT sent: only an approver can change it (Approve page).
      const payload = {
        id: paymentId,
        ...(saveMode !== 'update' ? { saveMode } : {}),
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
      };

      const res = await fetch("/api/balance-payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        if (isDraftSave) {
          setIsDraft(true);
          alert(`✅ Balance Payment draft saved!\nPayment No: ${data.data?.balancePaymentNo || balancePaymentNo}`);
        } else {
          setIsDraft(false);
          alert(`✅ Balance Payment updated successfully!\nPayment No: ${data.data?.balancePaymentNo || balancePaymentNo}\nSub-Company: ${data.data?.subCompanyName || "N/A"}`);
          router.push("/admin/Balance-Payment");
        }
      } else {
        alert(data.message || "Failed to update balance payment");
      }
    } catch (err) {
      console.error("Error updating:", err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Table styles (same as create)
  const roCell = "w-full min-w-[110px] px-2 py-1 border rounded bg-gray-100";
  const numCell = "w-20 px-2 py-1 border rounded bg-gray-100";
  const td = "border border-slate-200 px-2 py-1";
  const th = "border border-yellow-500 px-3 py-2 text-xs font-extrabold text-slate-900 bg-yellow-400 whitespace-nowrap";

  if (permissionLoading || loading) {
    return (
      <PageMessage>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading payment data...</p>
        </div>
      </PageMessage>
    );
  }

  if (!canEditHere) {
    return (
      <PageMessage>
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <div className="text-lg font-extrabold text-red-700">Access denied</div>
          <p className="mt-2 text-sm text-slate-600">You don&apos;t have permission to edit Balance Payments.</p>
          <button onClick={() => router.push("/admin/Balance-Payment")} className="mt-4 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700">Back to List</button>
        </div>
      </PageMessage>
    );
  }

  if (notFound) {
    return (
      <PageMessage>
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <div className="text-lg font-extrabold text-red-700">Unable to open this payment</div>
          <p className="mt-2 text-sm text-slate-600">{notFound}</p>
          <button onClick={() => router.push("/admin/Balance-Payment")} className="mt-4 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700">Back to List</button>
        </div>
      </PageMessage>
    );
  }

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
              <div className="text-lg font-extrabold text-slate-900">Edit Balance Payment: {balancePaymentNo}</div>
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
            <button onClick={() => router.push("/admin/Balance-Payment")} className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
            {isDraft && <button
              type="button"
              onClick={() => handleUpdate('draft')}
              disabled={saving || queueGenerated}
              className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
            >Save as Draft</button>}
            <button
              onClick={() => handleUpdate(isDraft ? 'submit' : 'update')}
              disabled={saving || queueGenerated}
              className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition ${saving || queueGenerated ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {queueGenerated ? "Queue Generated" : saving ? "Updating..." : isDraft ? "Submit for Approval" : "Update Payment"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-full p-4">
        {/* Balance Payment Number + POD */}
        <Card title="Balance Payment Information">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-3">
              <label className="text-xs font-bold text-slate-600">Balance Payment No</label>
              <input type="text" value={balancePaymentNo} readOnly className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 cursor-not-allowed" />
            </div>
            {isSettled ? (
              <Field label="POD No" value={podNo} span="md:col-span-9" hint={`This payment is ${paymentStatus}, so its POD cannot be changed.`} />
            ) : (
              <div className="col-span-12 md:col-span-9">
                <label className="text-xs font-bold text-slate-600">Select POD No *</label>
                <PODDropdown onSelect={handlePODSelect} selectedPodNo={podNo} />
                <p className="text-xs text-slate-400 mt-1">Pick a different POD only if you want to replace the current one - all details are re-loaded from it</p>
              </div>
            )}
          </div>
          {isSettled && (
            <div className="mt-3 p-3 bg-amber-50 rounded-lg text-amber-700 text-sm">
              This payment is {paymentStatus}. Its figures are not recalculated when you save.
            </div>
          )}
          {queueGenerated && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Payment queue generated{queueDate ? ` on ${new Date(queueDate).toLocaleString("en-IN")}` : ""}. This payment is locked from further edits.
            </div>
          )}
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
          <p className="text-xs text-slate-400 mt-2">Company information is loaded from the payment / selected POD</p>
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
                      <td className={td}><input type="text" value={row.orderNo || ""} readOnly className={roCell} /></td>
                      <td className={td}><input type="text" value={row.partyName || ""} readOnly className={roCell} /></td>
                      <td className={td}><input type="text" value={row.plantCode || ""} readOnly className={`${roCell} min-w-[200px]`} /></td>
                      <td className={td}><input type="text" value={row.orderType || ""} readOnly className={roCell} /></td>
                      <td className={td}><input type="text" value={row.pinCode || ""} readOnly className={roCell} /></td>
                      <td className={td}><input type="text" value={row.state || ""} readOnly className={roCell} /></td>
                      <td className={td}><input type="text" value={row.fromState || ""} readOnly className={roCell} /></td>
                      <td className={`${td} text-center`}>
                        {row.fromState && row.state ? (
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${isLocal ? "bg-green-100 text-green-800 border border-green-300" : "bg-red-100 text-red-800 border border-red-300"}`}>
                            {isLocal ? "✅ Local" : "❌ Not Local"}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className={td}><input type="text" value={row.district || ""} readOnly className={roCell} /></td>
                      <td className={td}><input type="text" value={row.from || ""} readOnly className={roCell} /></td>
                      <td className={td}><input type="text" value={row.to || ""} readOnly className={roCell} /></td>
                      <td className={td}><input type="number" value={row.weight ?? ""} readOnly className={numCell} /></td>
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

        {/* 2. Balance Payment Panel */}
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
            <div className="col-span-12 md:col-span-2">
              <label className="text-xs font-bold text-slate-600">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500"
              />
            </div>
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
                className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm font-bold text-emerald-700 ${overLimit ? "border-red-400" : "border-slate-200"}`}
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className="text-xs font-bold text-slate-600">Remarks {isPartial && !isSettled && <span className="text-red-500">*</span>}</label>
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
            <div className="col-span-12 md:col-span-4">
              <label className="text-xs font-bold text-slate-600">Transaction ID</label>
              <input
                type="text"
                value={transactionId}
                onChange={(event) => setTransactionId(event.target.value)}
                readOnly={isSettled}
                className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm ${isSettled ? "border-slate-200 bg-gray-100 cursor-not-allowed" : "border-slate-200 bg-white focus:border-emerald-500"}`}
                placeholder="Enter bank transaction ID after payment"
              />
              <p className="mt-1 text-xs text-slate-400">Payment Date is recorded when this ID is entered or changed.</p>
            </div>
            <Field label="Bank Vendor Code" value={bankVendorCode} span="md:col-span-4" />
            <div className="col-span-12 md:col-span-4">
              <label className="text-xs font-bold text-slate-600">Payment Status</label>
              <select value={paymentStatus} disabled className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed">
                <option value="Draft">Draft</option>
                <option value="Pending">Pending</option>
                <option value="Queued">Queued</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Completed">Completed</option>
                <option value="Paid">Paid</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">Status is changed from the Approve page</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="text-sm text-slate-600">
              {queueGenerated ? `Queue generated${queueDate ? ` on ${new Date(queueDate).toLocaleString("en-IN")}` : ""}` : "Generate the payment queue after the payment details are ready."}
            </div>
            {canGenerateQueue && !queueGenerated && (
              <button
                onClick={handleGenerateQueue}
                disabled={queueLoading || isDraft || ["Rejected", "Completed", "Paid"].includes(paymentStatus)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {queueLoading ? "Generating..." : isDraft ? "Save Draft First" : "Generate Queue"}
              </button>
            )}
            {queueGenerated && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">✓ Queue Generated</span>}
          </div>
        </Card>
      </div>
    </div>
  );
}
// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import { useRouter, useParams } from "next/navigation";

// function uid() {
//   return Math.random().toString(36).slice(2, 10);
// }

// function num(v) {
//   const n = Number(v);
//   return Number.isFinite(n) ? n : 0;
// }

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

// function PODDropdown({ onSelect, podList, selectedPodNo }) {
//   const [searchQuery, setSearchQuery] = useState(selectedPodNo || "");
//   const [showDropdown, setShowDropdown] = useState(false);
//   const inputRef = useRef(null);
//   const dropdownRef = useRef(null);
//   const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

//   const filteredPODs = podList.filter(p =>
//     p.podNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//     p.purchaseNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//     p.vendorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//     p.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//     p.subCompanyName?.toLowerCase().includes(searchQuery.toLowerCase())
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
//       {showDropdown && filteredPODs.length > 0 && (
//         <div
//           ref={dropdownRef}
//           style={{ position: 'fixed', top: dropdownPosition.top, left: dropdownPosition.left, width: dropdownPosition.width, zIndex: 9999, maxHeight: '300px' }}
//           className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-y-auto"
//         >
//           {filteredPODs.map(p => (
//             <div key={p._id} onMouseDown={() => handleSelect(p)} className="p-3 hover:bg-emerald-50 cursor-pointer border-b border-slate-100">
//               <div className="font-medium text-slate-800">{p.podNo}</div>
//               <div className="text-xs text-slate-500">Purchase: {p.purchaseNo} | Vendor: {p.vendorName || p.vendorFinancial?.vendorName}</div>
//               <div className="text-xs text-slate-500">Company: {p.companyName || 'N/A'} | Sub: {p.subCompanyName || 'N/A'}</div>
//               <div className="text-xs text-slate-400">Total: ₹{num(p.totalAmount || p.vendorFinancial?.total).toLocaleString()} | Balance: ₹{num(p.finalBalance || p.vendorFinancial?.finalBalance).toLocaleString()}</div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// export default function EditBalancePayment() {
//   const router = useRouter();
//   const params = useParams();
//   const paymentId = params.id;

//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [podList, setPodList] = useState([]);
//   const [selectedPOD, setSelectedPOD] = useState(null);
//   const [loadingPOD, setLoadingPOD] = useState(false);
//   const [orderRows, setOrderRows] = useState([]);

//   // ✅ COMPANY INFO STATE
//   const [companyInfo, setCompanyInfo] = useState({
//     companyName: '',
//     companyCode: '',
//     subCompanyId: '',
//     subCompanyName: '',
//     subCompanyCode: ''
//   });

//   // Form State
//   const [formData, setFormData] = useState({
//     balancePaymentNo: "",
//     branch: "",
//     branchCode: "",
//     date: "",
//     podNo: "",
//     purchaseNo: "",
//     vendorName: "",
//     vendorCode: "",
//     from: "",
//     to: "",
//     weight: 0,
//     total: 0,
//     advance: 0,
//     poAddition: 0,
//     poDeduction: 0,
//     podDeduction: 0,
//     finalBalance: 0,
//     dueDate: "",
//     transactionId: "",
//     paymentDate: "",
//     paymentStatus: "Pending",
//     remarks: "",
//     vendorStatus: "Active",
//     vendorNamePayment: "",
//     vehicleNo: "",
//     purchaseType: "Loading & Unloading",
//     rateType: "Per MT",
//     rate: 0,
//     amount: 0,
//     totalAddition: 0,
//     totalDeduction: 0,
//     balance: 0,
//     vendorNameDebit: "",
//     accountNoCredit: "",
//     finalAmount: 0,
//     bankVendorCode: "",
//     delivery: "Normal",
//     pricingSerialNo: ""
//   });

//   // Fetch PODs
//   useEffect(() => {
//     fetchPODs();
//   }, []);

//   const fetchPODs = async () => {
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
//     }
//   };

//   // Fetch existing Balance Payment - UPDATED with fromState and Company Info
//   const fetchBalancePayment = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch(`/api/balance-payment?id=${paymentId}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();

//       if (data.success && data.data) {
//         const payment = data.data;

//         console.log('📋 Loaded Balance Payment Data:', payment);

//         // ✅ Set Company Info from payment data
//         setCompanyInfo({
//           companyName: payment.companyName || '',
//           companyCode: payment.companyCode || '',
//           subCompanyId: payment.subCompanyId || null,
//           subCompanyName: payment.subCompanyName || '',
//           subCompanyCode: payment.subCompanyCode || ''
//         });

//         setFormData({
//           balancePaymentNo: payment.balancePaymentNo || "",
//           branch: payment.branch || "",
//           branchCode: payment.branchCode || "",
//           date: payment.date ? new Date(payment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
//           podNo: payment.podNo || "",
//           purchaseNo: payment.purchaseNo || "",
//           vendorName: payment.vendorName || payment.vendorNamePayment || "",
//           vendorCode: payment.vendorCode || "",
//           from: payment.from || "",
//           to: payment.to || "",
//           weight: payment.weight || 0,
//           total: payment.total || payment.amount || 0,
//           advance: payment.advance || 0,
//           poAddition: payment.poAddition || payment.totalAddition || 0,
//           poDeduction: payment.poDeduction || payment.totalDeduction || 0,
//           podDeduction: payment.podDeduction || 0,
//           finalBalance: payment.finalBalance || payment.balance || 0,
//           dueDate: payment.dueDate || "",
//           transactionId: payment.transactionId || "",
//           paymentDate: payment.paymentDate || "",
//           paymentStatus: payment.paymentStatus || "Pending",
//           remarks: payment.remarks || "",
//           vendorStatus: payment.vendorStatus || "Active",
//           vendorNamePayment: payment.vendorNamePayment || payment.vendorName || "",
//           vehicleNo: payment.vehicleNo || "",
//           purchaseType: payment.purchaseType || "Loading & Unloading",
//           rateType: payment.rateType || "Per MT",
//           rate: payment.rate || 0,
//           amount: payment.amount || 0,
//           totalAddition: payment.totalAddition || 0,
//           totalDeduction: payment.totalDeduction || 0,
//           balance: payment.balance || 0,
//           vendorNameDebit: payment.vendorNameDebit || "",
//           accountNoCredit: payment.accountNoCredit || "",
//           finalAmount: payment.finalAmount || 0,
//           bankVendorCode: payment.bankVendorCode || "",
//           delivery: payment.delivery || "Normal",
//           pricingSerialNo: payment.pricingSerialNo || ""
//         });

//         // Set order rows - preserve fromState and local status
//         if (payment.orderRows && payment.orderRows.length > 0) {
//           const processedRows = payment.orderRows.map(row => ({
//             ...row,
//             stateName: row.stateName || row.state,
//             fromState: row.fromState || '',
//             fromName: row.fromName || row.from,
//             toName: row.toName || row.to,
//             localStatus: row.localStatus || 'unknown',
//             localStatusLabel: row.localStatusLabel || 'Unknown'
//           }));
//           setOrderRows(processedRows);
//         }

//         if (payment.podId) {
//           setSelectedPOD({ _id: payment.podId });
//         }
//       }
//     } catch (error) {
//       console.error('Error fetching balance payment:', error);
//       alert('Failed to load balance payment data');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Handle POD Selection - Load new data and update all fields - UPDATED with fromState and Company Info
//   const handlePODSelect = async (pod) => {
//     setSelectedPOD(pod);
//     setLoadingPOD(true);

//     try {
//       const token = localStorage.getItem('token');

//       // Fetch full POD data
//       const podRes = await fetch(`/api/balance-payment/pod-lookup?podNo=${encodeURIComponent(pod.podNo)}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const podData = await podRes.json();

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

//         const vendorFinancial = pd.vendorFinancial || {};
//         const headerData = pd.header || {};
//         const purchaseOrders = pd.purchaseOrders || [];
//         const firstOrder = purchaseOrders[0] || {};
//         const podStatusSection = pd.podStatusSection || {};

//         const totalAmount = vendorFinancial.total || vendorFinancial.amount || 0;
//         const advanceAmount = vendorFinancial.advance || 0;
//         const poDeductionValue = vendorFinancial.poDeduction || 0;
//         const podDeductionValue = vendorFinancial.podDeduction || 0;
//         const dueDateValue = podStatusSection.dueDate || "";
//         const finalBalanceValue = totalAmount - advanceAmount - poDeductionValue - podDeductionValue;

//         // Map order rows - UPDATED with fromState
//         const mappedOrders = purchaseOrders.map(order => ({
//           _id: order._id || uid(),
//           orderNo: order.orderNo || "",
//           partyName: order.partyName || "",
//           plantCode: order.plantCode || "",
//           plantName: order.plantName || "",
//           orderType: order.orderType || "Sales",
//           pinCode: order.pinCode || "",
//           state: order.state || "",
//           stateName: order.stateName || order.state || "",
//           fromState: order.fromState || "",
//           district: order.district || "",
//           from: order.from || "",
//           fromName: order.fromName || order.from || "",
//           to: order.to || "",
//           toName: order.toName || order.to || "",
//           locationRate: order.locationRate || "",
//           priceList: order.priceList || "",
//           weight: order.weight?.toString() || "0",
//           rate: order.rate?.toString() || "0",
//           totalAmount: order.totalAmount?.toString() || ((order.weight || 0) * (order.rate || 0)).toString(),
//           localStatus: order.localStatus || "unknown",
//           localStatusLabel: order.localStatusLabel || "Unknown"
//         }));
//         setOrderRows(mappedOrders);

//         setFormData(prev => ({
//           ...prev,
//           branch: headerData.branch || headerData.branchName || "",
//           branchCode: headerData.branchCode || "",
//           date: headerData.date ? new Date(headerData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
//           delivery: headerData.delivery || "Normal",
//           pricingSerialNo: pd.pricingSerialNo || "",
//           podNo: pod.podNo,
//           purchaseNo: pd.purchaseNo || pod.purchaseNo || "",
//           vendorName: vendorFinancial.vendorName || "",
//           vendorCode: vendorFinancial.vendorCode || "",
//           from: firstOrder.from || "",
//           to: firstOrder.to || "",
//           weight: firstOrder.weight || 0,
//           total: totalAmount,
//           amount: totalAmount,
//           advance: advanceAmount,
//           poAddition: 0,
//           poDeduction: poDeductionValue,
//           podDeduction: podDeductionValue,
//           finalBalance: finalBalanceValue,
//           dueDate: dueDateValue,
//           vendorStatus: vendorFinancial.vendorStatus || "Active",
//           vendorNamePayment: vendorFinancial.vendorName || "",
//           vehicleNo: firstOrder.vehicleNo || "",
//           purchaseType: pd.purchaseType || "Loading & Unloading",
//           rateType: pd.rateType || "Per MT",
//           rate: vendorFinancial.rate || 0,
//           totalAddition: 0,
//           totalDeduction: poDeductionValue,
//           balance: totalAmount - advanceAmount,
//           finalAmount: finalBalanceValue
//         }));

//         const companyMsg = companyName ? `\n🏢 Company: ${companyName}` : '';
//         const subCompanyMsg = subCompanyName ? `\n🏢 Sub-Company: ${subCompanyName}` : '';

//         alert(`✅ Loaded POD: ${pod.podNo}${companyMsg}${subCompanyMsg}\n💰 Total Amount: ₹${totalAmount.toLocaleString()}\n💵 Advance: ₹${advanceAmount.toLocaleString()}\n📊 Balance: ₹${(totalAmount - advanceAmount).toLocaleString()}\n📉 PO Deduction: ₹${poDeductionValue.toLocaleString()}\n🏦 POD Deduction: ₹${podDeductionValue.toLocaleString()}\n💎 Final Balance: ₹${finalBalanceValue.toLocaleString()}\n📅 Due Date: ${dueDateValue || 'N/A'}`);
//       }
//     } catch (error) {
//       console.error('Error loading POD:', error);
//       alert('Failed to load POD details');
//     } finally {
//       setLoadingPOD(false);
//     }
//   };

//   // Handle Update
//   const handleUpdate = async () => {
//     if (!formData.podNo) {
//       alert("Please select a POD No");
//       return;
//     }

//     setSaving(true);

//     try {
//       const token = localStorage.getItem('token');

//       const payload = {
//         id: paymentId,
//         // ✅ Company info at root level
//         companyName: companyInfo.companyName || '',
//         companyCode: companyInfo.companyCode || '',
//         subCompanyId: companyInfo.subCompanyId || null,
//         subCompanyName: companyInfo.subCompanyName || '',
//         subCompanyCode: companyInfo.subCompanyCode || '',
//         branch: formData.branch,
//         branchCode: formData.branchCode,
//         date: formData.date,
//         vendorName: formData.vendorName,
//         podNo: formData.podNo,
//         purchaseNo: formData.purchaseNo,
//         orderRows: orderRows, // Includes fromState and localStatus
//         vendorStatus: formData.vendorStatus,
//         vendorCode: formData.vendorCode,
//         vendorNamePayment: formData.vendorNamePayment,
//         vehicleNo: formData.vehicleNo,
//         purchaseType: formData.purchaseType,
//         rateType: formData.rateType,
//         rate: num(formData.rate),
//         weight: num(formData.weight),
//         amount: num(formData.amount),
//         advance: num(formData.advance),
//         totalAddition: num(formData.totalAddition),
//         totalDeduction: num(formData.totalDeduction),
//         poAddition: num(formData.poAddition),
//         poDeduction: num(formData.poDeduction),
//         podDeduction: num(formData.podDeduction),
//         finalBalance: num(formData.finalBalance),
//         dueDate: formData.dueDate,
//         vendorNameDebit: formData.vendorNameDebit,
//         accountNoCredit: formData.accountNoCredit,
//         finalAmount: num(formData.finalAmount),
//         remarks: formData.remarks,
//         transactionId: formData.transactionId,
//         bankVendorCode: formData.bankVendorCode,
//         paymentStatus: formData.paymentStatus,
//         paymentDate: formData.paymentDate,
//         balance: num(formData.balance),
//         delivery: formData.delivery,
//         pricingSerialNo: formData.pricingSerialNo,
//         from: formData.from,
//         to: formData.to,
//         podId: selectedPOD?._id
//       };

//       console.log("Updating with payload:", payload);

//       const res = await fetch('/api/balance-payment', {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();

//       if (data.success) {
//         alert(`✅ Balance Payment updated successfully!\nCompany: ${data.data?.companyName || 'N/A'}\nSub-Company: ${data.data?.subCompanyName || 'N/A'}`);
//         router.push('/admin/Balance-Payment');
//       } else {
//         alert(data.message || 'Failed to update balance payment');
//       }
//     } catch (error) {
//       console.error('Error updating balance payment:', error);
//       alert(`❌ Error: ${error.message}`);
//     } finally {
//       setSaving(false);
//     }
//   };

//   // Load existing data
//   useEffect(() => {
//     if (paymentId) {
//       fetchBalancePayment();
//     }
//   }, [paymentId]);

//   if (loading && !formData.balancePaymentNo) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
//         <p className="mt-4 text-slate-600 ml-3">Loading payment data...</p>
//       </div>
//     );
//   }

//   const calculateTotalOrderAmount = () => {
//     return orderRows.reduce((sum, row) => sum + num(row.totalAmount), 0);
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
//       {/* Sticky Top Bar */}
//       <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
//         <div className="mx-auto max-w-full px-4 py-3 flex items-center justify-between">
//           <div>
//             <div className="flex items-center gap-3">
//               <button
//                 onClick={() => router.push('/admin/Balance-Payment')}
//                 className="text-emerald-600 hover:text-emerald-800 font-medium text-sm flex items-center gap-1"
//               >
//                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
//                 </svg>
//                 Back to List
//               </button>
//               <div className="text-lg font-extrabold text-slate-900">Edit Balance Payment: {formData.balancePaymentNo}</div>
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
//             <button
//               onClick={handleUpdate}
//               disabled={saving}
//               className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
//                 }`}
//             >
//               {saving ? 'Updating...' : 'Update Payment'}
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="mx-auto max-w-full p-4">

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

//         {/* Balance Payment Information */}
//         <Card title="Balance Payment Information">
//           <div className="grid grid-cols-12 gap-4">
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Balance Payment No</label>
//               <input type="text" value={formData.balancePaymentNo} readOnly className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Pricing Serial No</label>
//               <input type="text" value={formData.pricingSerialNo} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-7">
//               <label className="text-xs font-bold text-slate-600">Select POD No *</label>
//               <PODDropdown
//                 onSelect={handlePODSelect}
//                 podList={podList}
//                 selectedPodNo={formData.podNo}
//               />
//               <p className="text-xs text-blue-500 mt-1">Only this field is editable - Select a different POD to update all details</p>
//             </div>
//           </div>
//           {loadingPOD && (
//             <div className="mt-3 p-3 bg-emerald-50 rounded-lg text-emerald-600 text-sm">
//               <svg className="animate-spin h-4 w-4 inline mr-2" viewBox="0 0 24 24">
//                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//               </svg>
//               Loading POD details...
//             </div>
//           )}
//         </Card>

//         {/* Basic Information - READ ONLY */}
//         <Card title="Basic Information">
//           <div className="grid grid-cols-12 gap-4">
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Branch</label>
//               <input type="text" value={formData.branch} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Branch Code</label>
//               <input type="text" value={formData.branchCode} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Date</label>
//               <input type="date" value={formData.date} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Vendor Name</label>
//               <input type="text" value={formData.vendorName} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Purchase No</label>
//               <input type="text" value={formData.purchaseNo} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//           </div>
//         </Card>

//         {/* Orders Table - READ ONLY WITH FROMSTATE AND LOCAL/NOT LOCAL */}
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

//         {/* Balance Payment Panel - READ ONLY */}
//         <Card title="Balance Payment - Panel">
//           <div className="grid grid-cols-12 gap-4 mb-4">
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Vendor Status</label>
//               <input type="text" value={formData.vendorStatus} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Vendor Code</label>
//               <input type="text" value={formData.vendorCode} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Vendor Name</label>
//               <input type="text" value={formData.vendorNamePayment} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Vehicle No</label>
//               <input type="text" value={formData.vehicleNo} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Purchase - Type</label>
//               <input type="text" value={formData.purchaseType} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//           </div>

//           <div className="grid grid-cols-12 gap-4 mb-4">
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Rate - Type</label>
//               <input type="text" value={formData.rateType} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Rate (₹)</label>
//               <input type="text" value={formData.rate} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Weight (MT)</label>
//               <input type="text" value={formData.weight} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Amount (A x B)</label>
//               <input type="text" value={`₹${num(formData.amount).toLocaleString()}`} readOnly className="mt-1 w-full rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-bold text-purple-700 cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Advance</label>
//               <input type="number" value={formData.advance} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//           </div>

//           <div className="grid grid-cols-12 gap-4">
//             <div className="col-span-12 md:col-span-4">
//               <label className="text-xs font-bold text-slate-600">Total - Addition</label>
//               <input type="number" value={formData.totalAddition} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-4">
//               <label className="text-xs font-bold text-slate-600">Total - Deduction</label>
//               <input type="number" value={formData.totalDeduction} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-4">
//               <label className="text-xs font-bold text-slate-600">Balance</label>
//               <input type="text" value={`₹${num(formData.balance).toLocaleString()}`} readOnly className="mt-1 w-full rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-bold text-purple-700 cursor-not-allowed" />
//             </div>
//           </div>
//         </Card>

//         {/* Financial Summary - READ ONLY */}
//         <Card title="Financial Summary">
//           <div className="grid grid-cols-12 gap-4">
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">PO - Addition (₹)</label>
//               <input type="number" value={formData.poAddition} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">PO - Deduction (₹)</label>
//               <input type="number" value={formData.poDeduction} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">POD - Deduction (₹)</label>
//               <input type="number" value={formData.podDeduction} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             {/* <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Due Date</label>
//               <input type="date" value={formData.dueDate} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div> */}
//           </div>
//         </Card>

//         {/* Payment Transaction Details - READ ONLY */}
//         <Card title="Payment Transaction Details">
//           <div className="grid grid-cols-12 gap-4 mb-4">
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Vendor Name (Debit)</label>
//               <input type="text" value={formData.vendorNameDebit} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Account No (Credit)</label>
//               <input type="text" value={formData.accountNoCredit} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Final Amount</label>
//               <input type="number" value={formData.finalAmount} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Payment Status</label>
//               <select value={formData.paymentStatus} disabled className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed">
//                 <option value="Pending">Pending</option>
//                 <option value="Queued">Queued</option>
//                 <option value="Approved">Approved</option>
//                 <option value="Rejected">Rejected</option>
//                 <option value="Completed">Completed</option>
//                 <option value="Paid">Paid</option>
//               </select>
//             </div>
//           </div>

//           <div className="grid grid-cols-12 gap-4">
//             <div className="col-span-12 md:col-span-4">
//               <label className="text-xs font-bold text-slate-600">Transaction ID</label>
//               <input type="text" value={formData.transactionId} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-4">
//               <label className="text-xs font-bold text-slate-600">Bank Vendor Code</label>
//               <input type="text" value={formData.bankVendorCode} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-4">
//               <label className="text-xs font-bold text-slate-600">Payment Date</label>
//               <input type="date" value={formData.paymentDate} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//           </div>

//           <div className="mt-4">
//             <label className="text-xs font-bold text-slate-600">Remarks / Notes</label>
//             <textarea
//               value={formData.remarks}
//               readOnly
//               rows={2}
//               className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed"
//             />
//           </div>
//         </Card>

//         {/* Summary Tables as per Image - READ ONLY */}
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
//               <div className="text-xl font-bold text-emerald-700">₹{num(formData.amount).toLocaleString()}</div>
//             </div>
//             <div className="px-4 py-4 text-center border-r border-slate-200">
//               <div className="text-xl font-bold text-blue-700">₹{num(formData.advance).toLocaleString()}</div>
//             </div>
//             <div className="px-4 py-4 text-center border-r border-slate-200">
//               <div className="text-xl font-bold text-orange-600">₹{num(formData.totalAddition).toLocaleString()}</div>
//             </div>
//             <div className="px-4 py-4 text-center border-r border-slate-200">
//               <div className="text-xl font-bold text-red-600">₹{num(formData.totalDeduction).toLocaleString()}</div>
//             </div>
//             <div className="px-4 py-4 text-center">
//               <div className="text-xl font-bold text-purple-700">₹{num(formData.balance).toLocaleString()}</div>
//             </div>
//           </div>
//         </div>

//         {/* Balance Breakdown Table as per Image - READ ONLY */}
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
//               <div className="text-xl font-bold text-emerald-700">₹{num(formData.balance).toLocaleString()}</div>
//             </div>
//             <div className="px-4 py-4 text-center border-r border-slate-200">
//               <div className="text-xl font-bold text-orange-600">₹{num(formData.poAddition).toLocaleString()}</div>
//             </div>
//             <div className="px-4 py-4 text-center border-r border-slate-200">
//               <div className="text-xl font-bold text-red-600">₹{num(formData.poDeduction).toLocaleString()}</div>
//             </div>
//             <div className="px-4 py-4 text-center">
//               <div className="text-xl font-bold text-purple-700">₹{num(formData.finalBalance).toLocaleString()}</div>
//             </div>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }
