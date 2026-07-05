const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  from:              { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  to:                { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount:            { type: Number, required: true },
  paymentMode:       { type: String, default: "Cash" },
  transactionNote:   { type: String, default: "" },
  expenses:          [{ type: mongoose.Schema.Types.ObjectId, ref: "Expense" }],
  group:             { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
  razorpayOrderId:   { type: String, default: "" },
  razorpayPaymentId: { type: String, default: "" },
  receiptUrl:        { type: String, default: "" },
  receiptNote:       { type: String, default: "" },
  rejectedReason:    { type: String, default: "" },
  approvedAt:        { type: Date },

  // ← NO enum restriction so it always saves correctly
  status: {
    type:    String,
    default: "pending_receipt",
  },

}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);
