// lib/podAcknowledgementEmail.js
const esc = (v) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

const inr = (v) =>
    "₹" + n(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    if (isNaN(d.getTime())) return esc(v);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
};

export function podAckSubject(pod) {
    return `Proof of Delivery Acknowledgement - ${pod.podNo} (Purchase ${pod.purchaseNo})`;
}

export function buildPodAcknowledgementEmail(pod, { supplierName, companyName } = {}) {
    const vf = pod.vendorFinancial || {};
    const sec = pod.podStatusSection || {};
    const orders = pod.purchaseOrders || [];
    const lrs = pod.lrEntries || [];
    const products = pod.products || [];

    const vehicleNos = [...new Set(orders.map((o) => o.vehicleNo).filter(Boolean))].join(", ") || "-";
    const podDeduction = n(pod.podDeduction || vf.podDeduction);
    const finalBalance = n(pod.finalBalance || vf.finalBalance);
    const vendor = supplierName || vf.vendorName || "Vendor";
    const from = companyName || pod.companyName || "Accounts Team";

    const lrRows = lrs.map((lr) => `<tr>
        <td>${esc(lr.lrNo) || "-"}</td><td>${fmtDate(lr.lrDate)}</td>
        <td>${esc(lr.orderNo) || "-"}</td><td>${fmtDate(lr.podDate)}</td>
      </tr>`).join("");

    const productRows = products.map((p) => `<tr>
        <td>${esc(p.productName) || "-"}</td>
        <td style="text-align:right">${esc(p.totalPkgs) || "0"}</td>
        <td style="text-align:right">${esc(p.actualWt) || "0"}</td>
        <td>${esc(p.deliveryStatus) || "-"}</td>
        <td style="text-align:right">${n(p.value) > 0 ? inr(p.value) : "-"}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${esc(podAckSubject(pod))}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;margin:0;padding:16px;color:#222}
  .box{max-width:720px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden}
  .hd{background:#f0b90b;padding:16px 20px}
  .hd h1{margin:0;font-size:20px;color:#1a1a1a}
  .hd p{margin:4px 0 0;font-size:13px;color:#333}
  .bd{padding:20px;font-size:14px;line-height:1.55}
  h2{font-size:15px;margin:22px 0 8px;border-left:4px solid #f0b90b;padding-left:8px}
  table{border-collapse:collapse;width:100%;font-size:13px}
  th,td{border:1px solid #ddd;padding:7px 8px;text-align:left;vertical-align:top}
  th{background:#f3f3f3}
  .kv th{width:42%}
  .big{font-weight:bold;font-size:15px;color:#6d28d9}
  .note{background:#fff8e1;border:1px solid #ffe08a;border-radius:6px;padding:10px 12px;font-size:13px;margin-top:14px}
  .ft{background:#fafafa;border-top:1px solid #eee;padding:12px 20px;font-size:11px;color:#666;text-align:center}
</style></head>
<body><div class="box">
  <div class="hd"><h1>Proof of Delivery Acknowledgement</h1><p>${esc(pod.podNo)}</p></div>
  <div class="bd">
    <p>Dear ${esc(vendor)},</p>
    <p>We acknowledge receipt of the proof of delivery for the consignment below. Please review the details and the payment schedule.</p>

    <h2>Reference</h2>
    <table class="kv">
      <tr><th>POD No.</th><td>${esc(pod.podNo)}</td></tr>
      <tr><th>Purchase No.</th><td>${esc(pod.purchaseNo)}</td></tr>
      <tr><th>Order No(s).</th><td>${esc(orders.map((o) => o.orderNo).filter(Boolean).join(", ")) || "-"}</td></tr>
      <tr><th>Vehicle No(s).</th><td>${esc(vehicleNos)}</td></tr>
      <tr><th>Vendor Code</th><td>${esc(vf.vendorCode) || "-"}</td></tr>
    </table>

    <h2>Lorry Receipts &amp; POD Received</h2>
    <table>
      <thead><tr><th>LR No.</th><th>LR Date</th><th>Order No.</th><th>POD Received On</th></tr></thead>
      <tbody>${lrRows || '<tr><td colspan="4">-</td></tr>'}</tbody>
    </table>

    <h2>Delivered Material</h2>
    <table>
      <thead><tr><th>Product</th><th style="text-align:right">Packages</th><th style="text-align:right">Actual Wt</th><th>Delivery Status</th><th style="text-align:right">Deduction</th></tr></thead>
      <tbody>${productRows || '<tr><td colspan="5">-</td></tr>'}</tbody>
    </table>

    <h2>Amount Summary</h2>
    <table class="kv">
      <tr><th>Total Amount</th><td>${inr(vf.total)}</td></tr>
      <tr><th>Advance Paid</th><td>${inr(vf.advance)}</td></tr>
      <tr><th>POD Deduction</th><td>${inr(podDeduction)}</td></tr>
      <tr><th>Final Balance Payable</th><td class="big">${inr(finalBalance)}</td></tr>
    </table>
    ${podDeduction > 0 ? '<div class="note">A deduction has been applied against this delivery as shown above. Please contact us if you wish to dispute it.</div>' : ""}

    <h2>Payment Schedule</h2>
    <table class="kv">
      <tr><th>Payment Due Date</th><td>${fmtDate(sec.dueDate)}</td></tr>
      <tr><th>Payment Window</th><td>${sec.dueDate ? `${fmtDate(sec.dueDate)} to ${fmtDate(sec.paymentDate)}` : "-"}</td></tr>
    </table>

    <p style="margin-top:18px">If any detail above is incorrect, please reply to this email within 2 working days.</p>
    <p>Regards,<br>${esc(from)}</p>
  </div>
  <div class="ft">This is an auto-generated acknowledgement from the ERP system.</div>
</div></body></html>`;

    return { subject: podAckSubject(pod), html };
}

// Statuses at which the acknowledgement may be sent (figures are final).
export const ACK_ALLOWED_STATUSES = ["Received", "Clear & Ok", "Deductions", "Partial", "Completed"];