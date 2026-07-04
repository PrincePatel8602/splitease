const Payment  = require("../models/Payment");
const Expense  = require("../models/Expense");
const User     = require("../models/User");
const path     = require("path");
const { sendSettlementReceipt } = require("../utils/emailService");
const { generateReceiptPDF }    = require("../utils/pdfGenerator");

// ─── Record Payment ───────────────────────────────────────────────────────────
exports.recordPayment = async (req, res) => {
  try {
    const { fromUserId, toUserId, amount, paymentMode, transactionNote, expenseIds, razorpayOrderId, razorpayPaymentId } = req.body;

    const payment = await Payment.create({
      from:  fromUserId,
      to:    toUserId,
      amount,
      paymentMode:     paymentMode || "UPI",
      transactionNote: transactionNote || "",
      expenses:        expenseIds || [],
      razorpayOrderId:   razorpayOrderId || "",
      razorpayPaymentId: razorpayPaymentId || "",
      status:     paymentMode === "Razorpay" ? "approved" : "pending_receipt",
      approvedAt: paymentMode === "Razorpay" ? new Date() : null,
    });

    // Razorpay = lock immediately
    if (paymentMode === "Razorpay") {
      await settleExpensesBetweenUsers(fromUserId, toUserId, expenseIds);
    }

    res.status(201).json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Payments ─────────────────────────────────────────────────────────────
exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      $or: [{ from: req.user._id }, { to: req.user._id }]
    }).populate("from to", "name email").sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Download PDF Receipt ─────────────────────────────────────────────────────
exports.downloadReceipt = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate("from to expenses");
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    if (payment.status !== "approved")
      return res.status(400).json({ error: "Receipt only available after approval" });
    await generateReceiptPDF(res, { payment, fromUser: payment.from, toUser: payment.to, expenses: payment.expenses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Submit Receipt ───────────────────────────────────────────────────────────
exports.submitReceipt = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    if (payment.from.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Only payer can submit receipt" });

    payment.receiptUrl  = req.file ? `/uploads/${req.file.filename}` : "";
    payment.receiptNote = req.body.note || "";
    payment.status      = "receipt_submitted";
    await payment.save();

    const [payer, receiver] = await Promise.all([
      User.findById(payment.from),
      User.findById(payment.to),
    ]);
    await sendSettlementReceipt({
      toEmail: receiver.email, fromName: payer.name, toName: receiver.name,
      amount: payment.amount, paymentMode: payment.paymentMode,
      transactionNote: `Receipt submitted. Note: ${payment.receiptNote || "none"}. Please approve in SplitEase.`,
      expenses: [],
    }).catch(console.error);

    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Approve Payment ──────────────────────────────────────────────────────────
exports.approvePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate("from to", "name email");
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    if (payment.to._id.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Only receiver can approve" });

    payment.status     = "approved";
    payment.approvedAt = new Date();
    await payment.save();

    // ── Settle all unsettled expenses between these two users ──────────────
    // This works even when expenseIds array is empty
    await settleExpensesBetweenUsers(
      payment.from._id.toString(),
      payment.to._id.toString(),
      payment.expenses || []
    );

    // Send receipt emails
    const expenses = payment.expenses?.length
      ? await Expense.find({ _id: { $in: payment.expenses } })
      : [];

    await Promise.allSettled([
      sendSettlementReceipt({ toEmail: payment.from.email, fromName: payment.from.name, toName: payment.to.name, amount: payment.amount, paymentMode: payment.paymentMode, transactionNote: "Payment approved ✅", expenses: expenses.map(e => ({ description: e.description, amount: e.amount, yourShare: Math.round(e.amount / (e.splitBetween?.length||1)) })) }),
      sendSettlementReceipt({ toEmail: payment.to.email,  fromName: payment.from.name, toName: payment.to.name, amount: payment.amount, paymentMode: payment.paymentMode, transactionNote: "Payment approved ✅", expenses: expenses.map(e => ({ description: e.description, amount: e.amount, yourShare: Math.round(e.amount / (e.splitBetween?.length||1)) })) }),
    ]);

    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Reject Payment ───────────────────────────────────────────────────────────
exports.rejectPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate("from to", "name email");
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    if (payment.to._id.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Only receiver can reject" });

    payment.rejectedReason = req.body.reason || "Receipt not valid";
    payment.receiptUrl     = "";
    payment.status         = "pending_receipt";
    await payment.save();

    await sendSettlementReceipt({
      toEmail: payment.from.email, fromName: payment.from.name, toName: payment.to.name,
      amount: payment.amount, paymentMode: payment.paymentMode,
      transactionNote: `❌ Receipt rejected. Reason: ${payment.rejectedReason}. Please resubmit.`,
      expenses: [],
    }).catch(console.error);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Helper: settle all expenses between two users ────────────────────────────
// Finds all unsettled expenses where fromUser owes toUser and marks them settled+locked
async function settleExpensesBetweenUsers(fromUserId, toUserId, expenseIds = []) {
  if (expenseIds.length > 0) {
    // If specific expenses provided, lock those
    await Expense.updateMany(
      { _id: { $in: expenseIds } },
      { settled: true, locked: true }
    );
  } else {
    // Otherwise find all unsettled expenses between these two users
    // Expenses where toUser paid and fromUser is in splitBetween
    await Expense.updateMany(
      {
        settled: false,
        paidBy: toUserId,
        splitBetween: fromUserId,
      },
      { settled: true, locked: true }
    );
    // Also expenses where fromUser paid and toUser is in splitBetween
    await Expense.updateMany(
      {
        settled: false,
        paidBy: fromUserId,
        splitBetween: toUserId,
      },
      { settled: true, locked: true }
    );
  }
}
