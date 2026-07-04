const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS },
});

transporter.verify((err) => {
  if (err) console.error("❌ Email service error:", err.message);
  else     console.log("✅ Email service ready (Gmail SMTP)");
});

function wrapHTML(content) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f7f4;margin:0;padding:24px;color:#0b0b0b}
.card{background:#fff;border-radius:12px;max-width:480px;margin:0 auto;overflow:hidden;border:1px solid #e8e7e4}
.header{background:#2a78d6;padding:20px 24px;color:#fff}
.header h1{margin:0;font-size:20px;font-weight:500}
.header p{margin:4px 0 0;font-size:13px;opacity:.85}
.body{padding:24px}
.amount{font-size:32px;font-weight:500;color:#2a78d6;text-align:center;padding:16px 0}
.row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f0ec;font-size:14px}
.row:last-child{border-bottom:none}
.label{color:#898781}
.value{font-weight:500}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500}
.badge-green{background:#eaf3de;color:#3B6D11}
.badge-red{background:#fcebeb;color:#a32d2d}
.badge-blue{background:#e6f1fb;color:#185fa5}
.btn{display:block;text-align:center;margin:20px 0 0;background:#2a78d6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500}
.footer{background:#f8f7f4;padding:14px 24px;font-size:11px;color:#898781;text-align:center}
table.split{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}
table.split th{background:#f1f0ec;padding:8px 10px;text-align:left;font-weight:500;font-size:11px;color:#52514e}
table.split td{padding:8px 10px;border-bottom:1px solid #f1f0ec}
</style></head><body>${content}</body></html>`;
}

async function sendExpenseAdded({ toEmail, toName, addedBy, description, amount, group, splitCount, yourShare }) {
  const html = wrapHTML(`<div class="card">
    <div class="header"><h1>💸 New expense added</h1><p>${addedBy} added an expense in <strong>${group}</strong></p></div>
    <div class="body">
      <div class="amount">₹${amount.toLocaleString()}</div>
      <div class="row"><span class="label">Description</span><span class="value">${description}</span></div>
      <div class="row"><span class="label">Paid by</span><span class="value">${addedBy}</span></div>
      <div class="row"><span class="label">Group</span><span class="value">${group}</span></div>
      <div class="row"><span class="label">Split between</span><span class="value">${splitCount} people</span></div>
      <div class="row"><span class="label">Your share</span><span class="badge badge-red">You owe ₹${yourShare.toLocaleString()}</span></div>
      <a class="btn" href="${process.env.APP_URL}">View in SplitEase →</a>
    </div>
    <div class="footer">SplitEase · You're in the ${group} group</div>
  </div>`);
  return transporter.sendMail({ from:`"SplitEase" <${process.env.GMAIL_USER}>`, to:toEmail, subject:`💸 ${addedBy} added "${description}" — you owe ₹${yourShare.toLocaleString()}`, html });
}

async function sendSettlementReceipt({ toEmail, fromName, toName, amount, paymentMode, transactionNote, expenses }) {
  const rows = (expenses||[]).map(e=>`<tr><td>${e.description}</td><td>₹${e.amount.toLocaleString()}</td><td>₹${e.yourShare.toLocaleString()}</td></tr>`).join("");
  const html = wrapHTML(`<div class="card">
    <div class="header" style="background:#0ca30c"><h1>✅ Payment received</h1><p>${fromName} has settled up with you</p></div>
    <div class="body">
      <div class="amount" style="color:#3B6D11">₹${amount.toLocaleString()}</div>
      <div class="row"><span class="label">From</span><span class="value">${fromName}</span></div>
      <div class="row"><span class="label">To</span><span class="value">${toName}</span></div>
      <div class="row"><span class="label">Payment mode</span><span class="badge badge-blue">${paymentMode}</span></div>
      ${transactionNote?`<div class="row"><span class="label">Note</span><span class="value">${transactionNote}</span></div>`:""}
      ${rows?`<table class="split"><thead><tr><th>Description</th><th>Total</th><th>Share</th></tr></thead><tbody>${rows}</tbody></table>`:""}
      <a class="btn" style="background:#0ca30c" href="${process.env.APP_URL}">View receipt →</a>
    </div>
    <div class="footer">SplitEase · Settled on ${new Date().toLocaleDateString("en-IN",{dateStyle:"long"})}</div>
  </div>`);
  return transporter.sendMail({ from:`"SplitEase" <${process.env.GMAIL_USER}>`, to:toEmail, subject:`✅ ${fromName} paid you ₹${amount.toLocaleString()}`, html });
}

async function sendOwingReminder({ toEmail, toName, owedTo, amount, dueExpenses }) {
  const rows = dueExpenses.map(e=>`<div class="row"><span class="label">${e.description} (${e.group})</span><span class="badge badge-red">₹${e.share.toLocaleString()}</span></div>`).join("");
  const html = wrapHTML(`<div class="card">
    <div class="header" style="background:#e34948"><h1>⏰ Friendly reminder</h1><p>You have a pending balance with ${owedTo}</p></div>
    <div class="body">
      <div class="amount" style="color:#a32d2d">₹${amount.toLocaleString()}</div>
      <p style="text-align:center;color:#52514e;font-size:13px;margin-top:0">total you owe ${owedTo}</p>
      ${rows}
      <a class="btn" style="background:#e34948" href="${process.env.APP_URL}">Settle up now →</a>
    </div>
    <div class="footer">SplitEase · Helping you stay on top of shared expenses</div>
  </div>`);
  return transporter.sendMail({ from:`"SplitEase" <${process.env.GMAIL_USER}>`, to:toEmail, subject:`⏰ Reminder: you owe ${owedTo} ₹${amount.toLocaleString()}`, html });
}

module.exports = { sendExpenseAdded, sendSettlementReceipt, sendOwingReminder };
