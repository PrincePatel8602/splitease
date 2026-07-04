const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  from:            { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  to:              { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount:          { type: Number, required: true },
  paymentMode:     { type: String, default: "UPI", enum: ["UPI","Cash","Bank transfer","Partial payment"] },
  transactionNote: { type: String, default: "" },
  expenses:        [{ type: mongoose.Schema.Types.ObjectId, ref: "Expense" }],
  group:              { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
  razorpayOrderId:    { type: String, default: "" },
  razorpayPaymentId:  { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);