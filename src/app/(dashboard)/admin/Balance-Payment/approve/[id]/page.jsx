"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { usePermission } from "../../../hooks/usePermission";

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

// status chosen on this page -> PATCH action understood by /api/balance-payment
const ACTION_BY_STATUS = {
  Approved: "approve",
  Rejected: "reject",
  Completed: "complete",
};

const STATUS_BADGE = {
  Approved: "bg-green-100 text-green-800 border border-green-300",
  Rejected: "bg-red-100 text-red-800 border border-red-300",
  Completed: "bg-blue-100 text-blue-800 border border-blue-300",
  Paid: "bg-purple-100 text-purple-800 border border-purple-300",
  Queued: "bg-yellow-100 text-yellow-800 border border-yellow-300",
};

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

export default function ApproveBalancePayment() {
  const router = useRouter();
  const params = useParams();
  const paymentId = params.id;

  const { hasPermission, loading: permissionLoading } = usePermission();
  const canApproveHere = hasPermission(MODULE_NAME, "approve");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueGenerated, setQueueGenerated] = useState(false);
  const [queueDate, setQueueDate] = useState(null);
  const [notFound, setNotFound] = useState("");

  const [balancePaymentNo, setBalancePaymentNo] = useState("");

  // Basic Info (all READ ONLY on this page)
  const [branch, setBranch] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [date, setDate] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [podNo, setPodNo] = useState("");
  const [purchaseNo, setPurchaseNo] = useState("");

  const [companyInfo, setCompanyInfo] = useState({ companyName: "", companyCode: "", subCompanyId: "", subCompanyName: "", subCompanyCode: "" });
  const [orderRows, setOrderRows] = useState([]);

  const [vendorStatus, setVendorStatus] = useState("");
  const [vendorCode, setVendorCode] = useState("");
  const [vendorNamePayment, setVendorNamePayment] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [purchaseType, setPurchaseType] = useState("");
  const [rateType, setRateType] = useState("");
  const [rate, setRate] = useState("");
  const [weight, setWeight] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [figures, setFigures] = useState(EMPTY_FIGURES);
  const [breakdown, setBreakdown] = useState(EMPTY_BREAKDOWN);

  const [vendorNameDebit, setVendorNameDebit] = useState("");
  const [accountNoCredit, setAccountNoCredit] = useState("");
  const [finalAmount, setFinalAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [bankVendorCode, setBankVendorCode] = useState("");

  // The ONLY editable thing on this page
  const [currentStatus, setCurrentStatus] = useState("Pending"); // as saved
  const [paymentStatus, setPaymentStatus] = useState("Pending"); // as chosen

  useEffect(() => {
    if (paymentId) loadPayment();
  }, [paymentId]);

  const loadPayment = async () => {
    setLoading(true);
    setNotFound("");
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
      setDate(toDateInput(p.date));
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
          fromState: row.fromState || "",
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
      setRemarks(p.remarks || "");
      setTransactionId(p.transactionId || "");
      setBankVendorCode(p.bankVendorCode || "");

      setCurrentStatus(p.paymentStatus || "Pending");
      setPaymentStatus(p.paymentStatus || "Pending");
      setQueueGenerated(!!p.queueGenerated);
      setQueueDate(p.queueDate || null);
    } catch (err) {
      console.error("Error fetching balance payment:", err);
      setNotFound("Failed to load payment details");
    } finally {
      setLoading(false);
    }
  };

  const finalBalance = num(figures.finalBalance);
  const payNow = num(finalAmount);
  const unpaid = Math.max(finalBalance - payNow, 0);
  const isPartial = !!podNo && unpaid > 0.005;

  const handleGenerateQueue = async () => {
    if (!canApproveHere) return alert("You don't have permission to generate the payment queue");
    if (queueGenerated) return alert("Queue already generated for this payment.");
    if (["Rejected", "Completed", "Paid"].includes(currentStatus)) {
      return alert(`Cannot generate a queue for a ${currentStatus} payment.`);
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

      const generatedAt = data.data?.queueDate || new Date().toISOString();
      setQueueGenerated(true);
      setQueueDate(generatedAt);
      setCurrentStatus(data.data?.paymentStatus || "Queued");
      setPaymentStatus(data.data?.paymentStatus || "Queued");
      alert(`✅ Payment queue generated for ${balancePaymentNo}\nAmount: ₹${payNow.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    } catch (error) {
      alert(`❌ ${error.message}`);
    } finally {
      setQueueLoading(false);
    }
  };

  // Approve / reject / queue / complete - uses PATCH (needs the *approve* permission, NOT edit).
  // Nothing but the status is sent, so an approver can never change amounts or details.
  const handleApprove = async () => {
    if (!canApproveHere) return alert("You don't have permission to approve balance payments");
    if (!paymentStatus) return alert("Please select a payment status");
    if (paymentStatus === "Queued") return handleGenerateQueue();

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const action = ACTION_BY_STATUS[paymentStatus] || "update-status";
      const res = await fetch(`/api/balance-payment?id=${paymentId}&action=${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Balance Payment ${paymentStatus === "Approved" ? "Approved" : paymentStatus === "Rejected" ? "Rejected" : "Updated"} successfully!\nPayment No: ${balancePaymentNo}\nStatus: ${paymentStatus}`);
        router.push("/admin/Balance-Payment");
      } else {
        alert(data.message || "Failed to update payment status");
      }
    } catch (err) {
      console.error("Error updating payment status:", err);
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
          <p className="mt-4 text-slate-600">Loading payment details...</p>
        </div>
      </PageMessage>
    );
  }

  if (!canApproveHere) {
    return (
      <PageMessage>
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <div className="text-lg font-extrabold text-red-700">Access denied</div>
          <p className="mt-2 text-sm text-slate-600">You don&apos;t have permission to approve Balance Payments.</p>
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
              <div className="text-lg font-extrabold text-slate-900">Approve Balance Payment: {balancePaymentNo}</div>
            </div>
            {companyInfo.companyName && (
              <div className="text-xs text-blue-600 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="font-medium">🏢 {companyInfo.companyName}</span>
                {companyInfo.companyCode && <span>({companyInfo.companyCode})</span>}
                {companyInfo.subCompanyName && <span className="text-emerald-600">| Sub: {companyInfo.subCompanyName}</span>}
                {companyInfo.subCompanyCode && <span className="text-emerald-600">({companyInfo.subCompanyCode})</span>}
              </div>
            )}
            <div className="text-xs text-slate-500 mt-0.5">Review all details before approving/rejecting</div>
          </div>
          <div className="flex items-center gap-3">
            {queueGenerated ? (
              <span className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800">
                ✓ Queue Generated{queueDate ? ` · ${new Date(queueDate).toLocaleDateString("en-IN")}` : ""}
              </span>
            ) : (
              <button
                onClick={handleGenerateQueue}
                disabled={queueLoading || saving || ["Rejected", "Completed", "Paid"].includes(currentStatus)}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {queueLoading ? "Generating..." : "Generate Queue"}
              </button>
            )}
            <button
              onClick={handleApprove}
              disabled={saving || queueLoading}
              className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition ${saving || queueLoading ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {saving ? "Processing..." : "Update Status"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-full p-4">
        {/* Approval Status - the only editable field on this page */}
        <div className="bg-yellow-50 rounded-2xl border-2 border-yellow-400 shadow-sm mb-4">
          <div className="border-b-2 border-yellow-400 px-4 py-3 bg-yellow-100">
            <div className="text-sm font-extrabold text-yellow-800">Approval Status</div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-4">
                <label className="text-xs font-bold text-slate-600">Payment Status *</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-yellow-400 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="Pending">Pending</option>
                  <option value="Queued">Queued</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Completed">Completed</option>
                  <option value="Paid">Paid</option>
                </select>
                <p className="text-xs text-blue-500 mt-1">Only this field is editable for approval</p>
                {queueGenerated && (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    Queue generated{queueDate ? ` on ${new Date(queueDate).toLocaleString("en-IN")}` : ""}. The queue cannot be generated again.
                  </p>
                )}
              </div>
              <div className="col-span-12 md:col-span-8">
                <label className="text-xs font-bold text-slate-600">Current Status</label>
                <div className="mt-1">
                  <span className={`inline-block px-4 py-2 rounded-xl text-sm font-bold ${STATUS_BADGE[currentStatus] || "bg-gray-100 text-gray-800 border border-gray-300"}`}>
                    {currentStatus || "Pending"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Payment Number */}
        <Card title="Balance Payment Information">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-3">
              <label className="text-xs font-bold text-slate-600">Balance Payment No</label>
              <input type="text" value={balancePaymentNo} readOnly className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 cursor-not-allowed" />
            </div>
            <Field label="POD No" value={podNo} span="md:col-span-9" />
          </div>
        </Card>

        {/* Company Information */}
        <Card title="Company Information">
          <div className="grid grid-cols-12 gap-3">
            <Field label="Sub-Company Name" value={companyInfo.subCompanyName || "-"} span="md:col-span-3" tone="emerald" />
            <Field label="Sub-Company Code" value={companyInfo.subCompanyCode || "-"} span="md:col-span-2" tone="emerald" />
          </div>
          <p className="text-xs text-slate-400 mt-2">Company information is loaded from the payment data</p>
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

        {/* 1. Orders Table - READ ONLY (no row actions on the approve page) */}
        <Card title="Order Details">
          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-max w-full text-sm">
              <thead>
                <tr>
                  {["Order No", "Party Name", "Plant", "Order Type", "Pin Code", "State", "From State", "Local/Not Local", "District", "From", "To", "Weight"].map((h) => (
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 2. Balance Payment Panel - READ ONLY */}
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
            <Field label="Due Date" value={dueDate} type="date" span="md:col-span-2" />
          </div>
        </Card>

        {/* 3. Calculation: Balance -> Additions & Deductions -> Final Balance */}
        <SummaryCards figures={figures} breakdown={breakdown} finalAmount={finalAmount} isPartial={isPartial} unpaid={unpaid} />

        {/* 4. Payment Transaction Details - READ ONLY */}
        <Card title="Payment Transaction Details">
          <div className="grid grid-cols-12 gap-4 mb-4">
            <Field label="Vendor Name (Debit)" value={vendorNameDebit} span="md:col-span-3" />
            <Field label="Account No (Credit)" value={accountNoCredit} span="md:col-span-3" />
            <Field label="Final Amount" value={finalAmount} type="number" span="md:col-span-3" tone="emerald" />
            <Field label="Remarks" value={remarks} span="md:col-span-3" />
          </div>

          <div className="grid grid-cols-12 gap-4">
            <Field label="Transaction ID" value={transactionId} span="md:col-span-4" />
            <Field label="Bank Vendor Code" value={bankVendorCode} span="md:col-span-4" />
            <div className="col-span-12 md:col-span-4">
              <label className="text-xs font-bold text-slate-600">Payment Status</label>
              <select value={currentStatus} disabled className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed">
                <option value="Pending">Pending</option>
                <option value="Queued">Queued</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
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


// "use client";

// import React, { useState, useEffect } from "react";
// import { useRouter, useParams } from "next/navigation";

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

// export default function ApproveBalancePayment() {
//   const router = useRouter();
//   const params = useParams();
//   const paymentId = params.id;
  
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [orderRows, setOrderRows] = useState([]);
  
//   // ✅ COMPANY INFO STATE
//   const [companyInfo, setCompanyInfo] = useState({
//     companyName: '',
//     companyCode: '',
//     subCompanyId: '',
//     subCompanyName: '',
//     subCompanyCode: ''
//   });
  
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

//   // Fetch Balance Payment data - UPDATED with fromState and Company Info
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
        
//         console.log('📋 Loaded Balance Payment Data for Approval:', payment);
        
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
//       }
//     } catch (error) {
//       console.error('Error fetching balance payment:', error);
//       alert('Failed to load balance payment data');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Update payment status only
//   const updateField = (field, value) => {
//     setFormData(prev => ({ ...prev, [field]: value }));
//   };

//   // Handle Approve/Reject
//   const handleApprove = async () => {
//     if (!formData.paymentStatus) {
//       alert("Please select a payment status");
//       return;
//     }

//     setSaving(true);
//     try {
//       const token = localStorage.getItem('token');
      
//       const payload = {
//         id: paymentId,
//         paymentStatus: formData.paymentStatus,
//         // ✅ Keep company info in payload
//         companyName: companyInfo.companyName || '',
//         companyCode: companyInfo.companyCode || '',
//         subCompanyId: companyInfo.subCompanyId || null,
//         subCompanyName: companyInfo.subCompanyName || '',
//         subCompanyCode: companyInfo.subCompanyCode || ''
//       };

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
//         alert(`✅ Balance Payment ${formData.paymentStatus === 'Approved' ? 'Approved' : formData.paymentStatus === 'Rejected' ? 'Rejected' : 'Updated'} successfully!\nCompany: ${companyInfo.companyName || 'N/A'}\nSub-Company: ${companyInfo.subCompanyName || 'N/A'}`);
//         router.push('/admin/Balance-Payment');
//       } else {
//         alert(data.message || 'Failed to update payment status');
//       }
//     } catch (error) {
//       console.error('Error updating payment status:', error);
//       alert(`❌ Error: ${error.message}`);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleBack = () => {
//     router.push('/admin/Balance-Payment');
//   };

//   useEffect(() => {
//     if (paymentId) {
//       fetchBalancePayment();
//     }
//   }, [paymentId]);

//   const calculateTotalOrderAmount = () => {
//     return orderRows.reduce((sum, row) => sum + num(row.totalAmount), 0);
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
//           <p className="mt-4 text-slate-600">Loading payment details...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
//       {/* Sticky Top Bar */}
//       <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
//         <div className="mx-auto max-w-full px-4 py-3 flex items-center justify-between">
//           <div>
//             <div className="flex items-center gap-3">
//               <button
//                 onClick={handleBack}
//                 className="text-emerald-600 hover:text-emerald-800 font-medium text-sm flex items-center gap-1"
//               >
//                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
//                 </svg>
//                 Back to List
//               </button>
//               <div className="text-lg font-extrabold text-slate-900">Approve Balance Payment: {formData.balancePaymentNo}</div>
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
//             <div className="text-xs text-slate-500 mt-0.5">
//               Review all details before approving/rejecting
//             </div>
//           </div>

//           <div className="flex items-center gap-3">
//             <button
//               onClick={handleApprove}
//               disabled={saving}
//               className={`rounded-xl px-5 py-2 text-sm font-bold text-white transition ${
//                 saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
//               }`}
//             >
//               {saving ? 'Processing...' : 'Update Status'}
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="mx-auto max-w-full p-4">
        
//         {/* Approval Status Section - Only editable field */}
//         <div className="bg-yellow-50 rounded-2xl border-2 border-yellow-400 shadow-sm mb-4">
//           <div className="border-b-2 border-yellow-400 px-4 py-3 bg-yellow-100">
//             <div className="text-sm font-extrabold text-yellow-800">Approval Status</div>
//           </div>
//           <div className="p-4">
//             <div className="grid grid-cols-12 gap-4">
//               <div className="col-span-12 md:col-span-4">
//                 <label className="text-xs font-bold text-slate-600">Payment Status *</label>
//                 <select
//                   value={formData.paymentStatus}
//                   onChange={(e) => updateField('paymentStatus', e.target.value)}
//                   className="mt-1 w-full rounded-xl border border-yellow-400 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
//                 >
//                   <option value="Pending">Pending</option>
//                   <option value="Queued">Queued</option>
//                   <option value="Approved">Approved</option>
//                   <option value="Rejected">Rejected</option>
//                   <option value="Completed">Completed</option>
//                   <option value="Paid">Paid</option>
//                 </select>
//                 <p className="text-xs text-blue-500 mt-1">Only this field is editable for approval</p>
//               </div>
//               <div className="col-span-12 md:col-span-8">
//                 <label className="text-xs font-bold text-slate-600">Current Status</label>
//                 <div className="mt-1">
//                   <span className={`inline-block px-4 py-2 rounded-xl text-sm font-bold ${
//                     formData.paymentStatus === 'Approved' ? 'bg-green-100 text-green-800 border border-green-300' :
//                     formData.paymentStatus === 'Rejected' ? 'bg-red-100 text-red-800 border border-red-300' :
//                     formData.paymentStatus === 'Completed' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
//                     formData.paymentStatus === 'Paid' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
//                     formData.paymentStatus === 'Queued' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
//                     'bg-gray-100 text-gray-800 border border-gray-300'
//                   }`}>
//                     {formData.paymentStatus || 'Pending'}
//                   </span>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

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
//           <p className="text-xs text-slate-400 mt-2">Company information is auto-loaded from the payment data</p>
//         </Card>

//         {/* Balance Payment Information - READ ONLY */}
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
//               <label className="text-xs font-bold text-slate-600">POD No</label>
//               <input type="text" value={formData.podNo} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//           </div>
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

//         {/* Vendor Details - READ ONLY */}
//         <Card title="Vendor Details">
//           <div className="grid grid-cols-12 gap-4">
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Vendor Code</label>
//               <input type="text" value={formData.vendorCode} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">From</label>
//               <input type="text" value={formData.from} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">To</label>
//               <input type="text" value={formData.to} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Vehicle No</label>
//               <input type="text" value={formData.vehicleNo} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
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
//                   // Determine local status
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
//                           <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
//                             isLocal
//                               ? 'bg-green-100 text-green-800 border border-green-300'
//                               : 'bg-red-100 text-red-800 border border-red-300'
//                           }`}>
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
//                   <td colSpan="15" className="border border-slate-200 px-3 py-2 text-right font-bold">Total Order Amount:</td>
//                   <td className="border border-slate-200 px-3 py-2 font-bold text-emerald-800">
//                     ₹{calculateTotalOrderAmount().toLocaleString()}
//                   </td>
//                 </tr>
//               </tfoot>
//             </table>
//           </div>
//         </Card>

//         {/* Purchase Details - READ ONLY */}
//         <Card title="Purchase Details">
//           <div className="grid grid-cols-12 gap-4 mb-4">
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Vendor Status</label>
//               <input type="text" value={formData.vendorStatus} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Purchase - Type</label>
//               <input type="text" value={formData.purchaseType} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
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
//             {/* <div className="col-span-12 md:col-span-2">
//               <label className="text-xs font-bold text-slate-600">Due Date</label>
//               <input type="date" value={formData.dueDate} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div> */}
//           </div>

//           <div className="grid grid-cols-12 gap-4">
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Amount (A x B)</label>
//               <input type="text" value={`₹${num(formData.amount).toLocaleString()}`} readOnly className="mt-1 w-full rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-bold text-purple-700 cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Advance</label>
//               <input type="text" value={`₹${num(formData.advance).toLocaleString()}`} readOnly className="mt-1 w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Total - Addition</label>
//               <input type="text" value={`₹${num(formData.totalAddition).toLocaleString()}`} readOnly className="mt-1 w-full rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-bold text-green-700 cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Total - Deduction</label>
//               <input type="text" value={`₹${num(formData.totalDeduction).toLocaleString()}`} readOnly className="mt-1 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 cursor-not-allowed" />
//             </div>
//           </div>
//         </Card>

//         {/* Financial Summary - READ ONLY */}
//         <Card title="Financial Summary">
//           <div className="grid grid-cols-12 gap-4">
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">PO - Addition (₹)</label>
//               <input type="text" value={`₹${num(formData.poAddition).toLocaleString()}`} readOnly className="mt-1 w-full rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-bold text-green-700 cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">PO - Deduction (₹)</label>
//               <input type="text" value={`₹${num(formData.poDeduction).toLocaleString()}`} readOnly className="mt-1 w-full rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700 cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">POD - Deduction (₹)</label>
//               <input type="text" value={`₹${num(formData.podDeduction).toLocaleString()}`} readOnly className="mt-1 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Normal Balance (₹)</label>
//               <input type="text" value={`₹${num(formData.finalBalance).toLocaleString()}`} readOnly className="mt-1 w-full rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-bold text-purple-700 cursor-not-allowed" />
//               <p className="text-xs text-purple-500 mt-1">Total - Advance - PO Deduction - POD Deduction + PO Addition</p>
//             </div>
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
//               <label className="text-xs font-bold text-slate-600">Normal Amount (₹)</label>
//               <input type="text" value={`₹${num(formData.finalAmount).toLocaleString()}`} readOnly className="mt-1 w-full rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-bold text-purple-700 cursor-not-allowed" />
//             </div>
//             <div className="col-span-12 md:col-span-3">
//               <label className="text-xs font-bold text-slate-600">Payment Date</label>
//               <input type="date" value={formData.paymentDate} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
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
//               <label className="text-xs font-bold text-slate-600">Remarks</label>
//               <input type="text" value={formData.remarks} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-gray-100 px-3 py-2 text-sm cursor-not-allowed" />
//             </div>
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
