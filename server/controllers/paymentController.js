const Payment  = require("../models/Payment");
const Expense  = require("../models/Expense");
const User     = require("../models/User");
const { sendSettlementReceipt } = require("../utils/emailService");
const { generateReceiptPDF }    = require("../utils/pdfGenerator");

// ─── Record Payment ───────────────────────────────────────────────────────────
exports.recordPayment = async (req, res) => {
  try {
    const { fromUserId, toUserId, amount, paymentMode, expenseIds, razorpayOrderId, razorpayPaymentId } = req.body;
    const isRazorpay = paymentMode === "Razorpay";

    console.log(`[recordPayment] from=${fromUserId} to=${toUserId} mode=${paymentMode} isRazorpay=${isRazorpay}`);

    // Block duplicate pending payments
    const duplicate = await Payment.findOne({
      from:   fromUserId,
      to:     toUserId,
      status: { $in: ["pending_receipt", "receipt_submitted"] },
    });
    if (duplicate) {
      console.log(`[recordPayment] DUPLICATE FOUND: ${duplicate._id} status=${duplicate.status}`);
      return res.status(400).json({ error: "You already have a pending payment with this person. Upload your receipt first." });
    }

    const payment = await Payment.create({
      from:              fromUserId,
      to:                toUserId,
      amount,
      paymentMode:       paymentMode || "Cash",
      expenses:          expenseIds || [],
      razorpayOrderId:   razorpayOrderId || "",
      razorpayPaymentId: razorpayPaymentId || "",
      status:            isRazorpay ? "approved" : "pending_receipt",
      approvedAt:        isRazorpay ? new Date() : undefined,
    });

    console.log(`[recordPayment] Created payment ${payment._id} with status=${payment.status}`);

    if (isRazorpay) {
      await lockExpensesBetweenUsers(fromUserId, toUserId, expenseIds || []);
    }

    res.status(201).json({ success: true, payment });
  } catch (err) {
    console.error(`[recordPayment] ERROR:`, err.message);
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

// ─── Submit Receipt ───────────────────────────────────────────────────────────
exports.submitReceipt = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    console.log(`[submitReceipt] payment=${payment._id} status=${payment.status} from=${payment.from} requester=${req.user._id}`);

    if (payment.from.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Only the payer can submit a receipt" });

    if (payment.status !== "pending_receipt") {
      console.log(`[submitReceipt] BLOCKED - status is ${payment.status}, not pending_receipt`);
      return res.status(400).json({ error: `Cannot submit receipt - current status is: ${payment.status}` });
    }

    if (!req.file)
      return res.status(400).json({ error: "Please upload a receipt file" });

    payment.receiptUrl  = `/uploads/${req.file.filename}`;
    payment.receiptNote = req.body.note || "";
    payment.status      = "receipt_submitted";
    await payment.save();

    console.log(`[submitReceipt] Updated to receipt_submitted for payment ${payment._id}`);

    const [payer, receiver] = await Promise.all([
      User.findById(payment.from),
      User.findById(payment.to),
    ]);

    if (payer && receiver) {
      await sendSettlementReceipt({
        toEmail: receiver.email, fromName: payer.name, toName: receiver.name,
        amount: payment.amount, paymentMode: payment.paymentMode,
        transactionNote: `${payer.name} submitted a receipt. Note: "${payment.receiptNote || "none"}". Please log in to approve.`,
        expenses: [],
      }).catch(e => console.error("[submitReceipt] Email error:", e.message));
    }

    res.json({ success: true, payment });
  } catch (err) {
    console.error(`[submitReceipt] ERROR:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── Approve Payment ──────────────────────────────────────────────────────────
exports.approvePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate("from to", "name email");
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    console.log(`[approvePayment] payment=${payment._id} status=${payment.status} to=${payment.to._id} requester=${req.user._id}`);

    if (payment.to._id.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Only the receiver can approve" });

    if (payment.status !== "receipt_submitted") {
      console.log(`[approvePayment] BLOCKED - status is ${payment.status}`);
      return res.status(400).json({ error: `Cannot approve - status is: ${payment.status}. Receipt must be submitted first.` });
    }

    payment.status     = "approved";
    payment.approvedAt = new Date();
    await payment.save();

    console.log(`[approvePayment] APPROVED payment ${payment._id}`);

    await lockExpensesBetweenUsers(
      payment.from._id.toString(),
      payment.to._id.toString(),
      payment.expenses || []
    );

    const expenses = payment.expenses?.length
      ? await Expense.find({ _id: { $in: payment.expenses } })
      : [];

    await Promise.allSettled([
      sendSettlementReceipt({ toEmail: payment.from.email, fromName: payment.from.name, toName: payment.to.name, amount: payment.amount, paymentMode: payment.paymentMode, transactionNote: "Payment approved ✅", expenses: expenses.map(e => ({ description: e.description, amount: e.amount, yourShare: Math.round(e.amount / (e.splitBetween?.length || 1)) })) }),
      sendSettlementReceipt({ toEmail: payment.to.email,  fromName: payment.from.name, toName: payment.to.name, amount: payment.amount, paymentMode: payment.paymentMode, transactionNote: "Payment approved ✅", expenses: expenses.map(e => ({ description: e.description, amount: e.amount, yourShare: Math.round(e.amount / (e.splitBetween?.length || 1)) })) }),
    ]);

    res.json({ success: true, payment });
  } catch (err) {
    console.error(`[approvePayment] ERROR:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── Reject Payment ───────────────────────────────────────────────────────────
exports.rejectPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate("from to", "name email");
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    if (payment.to._id.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Only the receiver can reject" });

    payment.status         = "pending_receipt";
    payment.rejectedReason = req.body.reason || "Receipt not valid";
    payment.receiptUrl     = "";
    payment.receiptNote    = "";
    await payment.save();

    console.log(`[rejectPayment] REJECTED payment ${payment._id} - reset to pending_receipt`);

    await sendSettlementReceipt({
      toEmail: payment.from.email, fromName: payment.from.name, toName: payment.to.name,
      amount: payment.amount, paymentMode: payment.paymentMode,
      transactionNote: `❌ Receipt rejected. Reason: "${payment.rejectedReason}". Please upload again.`,
      expenses: [],
    }).catch(console.error);

    res.json({ success: true });
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

// ─── Helper ───────────────────────────────────────────────────────────────────
async function lockExpensesBetweenUsers(fromUserId, toUserId, expenseIds = []) {
  const now = new Date();
  if (expenseIds.length > 0) {
    await Expense.updateMany(
      { _id: { $in: expenseIds } },
      { $set: { settled: true, locked: true } }
    );
  } else {
    await Expense.updateMany(
      { settled: false, paidBy: toUserId, splitBetween: fromUserId, createdAt: { $lte: now } },
      { $set: { settled: true, locked: true } }
    );
    await Expense.updateMany(
      { settled: false, paidBy: fromUserId, splitBetween: toUserId, createdAt: { $lte: now } },
      { $set: { settled: true, locked: true } }
    );
  }
}