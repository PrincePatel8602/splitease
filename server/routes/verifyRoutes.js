const express  = require("express");
const router   = express.Router();
const Payment  = require("../models/Payment");

// QR code scans this URL — return a nice HTML verification page
router.get("/:paymentId", async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate("from to", "name email");
    if (!payment) {
      return res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invalid Receipt</title>
        <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8f7f4}
        .box{text-align:center;padding:32px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08)}</style></head>
        <body><div class="box"><div style="font-size:48px">❌</div><h2 style="color:#a32d2d;margin:12px 0">Receipt Not Found</h2>
        <p style="color:#898781">This receipt ID is invalid or has been removed.</p></div></body></html>`);
    }

    const statusColor = payment.status === "approved" ? "#0ca30c" : "#eda100";
    const statusText  = payment.status === "approved" ? "✅ Verified & Approved" : "⏳ Pending Approval";

    res.send(`<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SplitEase Receipt Verification</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f7f4;padding:20px;min-height:100vh;display:flex;align-items:center;justify-content:center}
    .card{background:#fff;border-radius:16px;overflow:hidden;max-width:420px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,0.1)}
    .header{background:#2a78d6;padding:24px;color:#fff;text-align:center}
    .header h1{font-size:20px;font-weight:600}
    .header p{font-size:12px;opacity:0.85;margin-top:4px}
    .body{padding:24px}
    .amount{font-size:40px;font-weight:600;color:#2a78d6;text-align:center;padding:16px 0}
    .status{text-align:center;margin-bottom:16px}
    .badge{display:inline-block;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;background:${statusColor}22;color:${statusColor}}
    .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f0ec;font-size:14px}
    .row:last-child{border-bottom:none}
    .label{color:#898781}
    .value{font-weight:500}
    .footer{background:#f8f7f4;padding:14px 24px;text-align:center;font-size:11px;color:#898781;border-top:1px solid #f1f0ec}
    .verified{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:#3B6D11;background:#eaf3de;padding:10px;border-radius:8px;margin-top:16px}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>💸 SplitEase</h1>
      <p>Payment Receipt Verification</p>
    </div>
    <div class="body">
      <div class="amount">₹${payment.amount?.toLocaleString("en-IN")}</div>
      <div class="status"><span class="badge">${statusText}</span></div>
      <div class="row"><span class="label">From</span><span class="value">${payment.from?.name || "—"}</span></div>
      <div class="row"><span class="label">To</span><span class="value">${payment.to?.name || "—"}</span></div>
      <div class="row"><span class="label">Payment mode</span><span class="value">${payment.paymentMode}</span></div>
      <div class="row"><span class="label">Receipt ID</span><span class="value" style="font-size:11px;color:#898781">${payment._id}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${new Date(payment.createdAt).toLocaleDateString("en-IN",{dateStyle:"long"})}</span></div>
      ${payment.approvedAt ? `<div class="row"><span class="label">Approved on</span><span class="value">${new Date(payment.approvedAt).toLocaleDateString("en-IN",{dateStyle:"long"})}</span></div>` : ""}
      <div class="verified">🔐 This receipt was digitally verified by SplitEase</div>
    </div>
    <div class="footer">Scan QR code from the PDF receipt to verify · SplitEase</div>
  </div>
</body></html>`);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

module.exports = router;
