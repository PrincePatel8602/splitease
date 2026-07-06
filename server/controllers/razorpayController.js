const Razorpay = require("razorpay");
const crypto   = require("crypto");
const Payment  = require("../models/Payment");
const Expense  = require("../models/Expense");
const User     = require("../models/User");
const { sendSettlementReceipt } = require("../utils/emailService");

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── Step 1: Create Razorpay Order ───────────────────────────────────────────
exports.createOrder = async (req, res) => {
  try {
    const { amount, toUserId, expenseIds } = req.body;

    // Razorpay amount is in paise (₹1 = 100 paise)
    const order = await razorpay.orders.create({
      amount:   Math.round(amount * 100),
      currency: "INR",
      receipt:  `receipt_${Date.now()}`,
      notes: {
        fromUserId: req.user._id.toString(),
        toUserId,
        expenseIds: JSON.stringify(expenseIds || []),
      },
    });

    res.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Step 2: Verify Payment Signature (security check) ───────────────────────
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, toUserId, amount, expenseIds, paymentMode, note } = req.body;

    // Verify signature using HMAC SHA256
    const body      = razorpay_order_id + "|" + razorpay_payment_id;
    const expected  = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body).digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: "Payment verification failed — invalid signature" });
    }

 // ✅ Payment is genuine — save to DB
const payment = await Payment.create({
  from:            req.user._id,
  to:              toUserId,
  amount,
  paymentMode:     "Razorpay",
  transactionNote: note || razorpay_payment_id,
  expenses:        expenseIds || [],
  razorpayOrderId:   razorpay_order_id,
  razorpayPaymentId: razorpay_payment_id,
  status:      "approved",
  approvedAt:  new Date(),
});

// Lock ALL expenses between these two users (not just expenseIds)
// Only lock expenses created BEFORE this payment
const fromId = req.user._id.toString();
const paymentTime = new Date();

await Expense.updateMany(
  { 
    settled: false, 
    paidBy: toUserId, 
    splitBetween: fromId,
    createdAt: { $lte: paymentTime }  // ← only old expenses
  },
  { $set: { settled: true, locked: true } }
);
await Expense.updateMany(
  { 
    settled: false, 
    paidBy: fromId, 
    splitBetween: toUserId,
    createdAt: { $lte: paymentTime }  // ← only old expenses
  },
  { $set: { settled: true, locked: true } }
);

    // Send email receipts
    const [fromUser, toUser] = await Promise.all([
      User.findById(req.user._id),
      User.findById(toUserId),
    ]);
    const expenses = expenseIds ? await Expense.find({ _id: { $in: expenseIds } }) : [];

    await Promise.allSettled([
      sendSettlementReceipt({ toEmail: fromUser.email, fromName: fromUser.name, toName: toUser.name, amount, paymentMode: "Razorpay", transactionNote: razorpay_payment_id, expenses: expenses.map(e => ({ description: e.description, amount: e.amount, yourShare: Math.round(e.amount / e.splitBetween.length) })) }),
      sendSettlementReceipt({ toEmail: toUser.email,  fromName: fromUser.name, toName: toUser.name, amount, paymentMode: "Razorpay", transactionNote: razorpay_payment_id, expenses: expenses.map(e => ({ description: e.description, amount: e.amount, yourShare: Math.round(e.amount / e.splitBetween.length) })) }),
    ]);

    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Webhook (optional — for auto-capture from Razorpay dashboard) ────────────
exports.webhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const body      = JSON.stringify(req.body);
    const expected  = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex");

    if (signature !== expected) return res.status(400).json({ error: "Invalid webhook signature" });

    const { event, payload } = req.body;
    if (event === "payment.captured") {
      console.log("✅ Payment captured via webhook:", payload.payment.entity.id);
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
