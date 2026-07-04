const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  description:   { type: String, required: true, trim: true },
  amount:        { type: Number, required: true, min: 0 },
  category:      { type: String, default: "Other", enum: ["Food","Travel","Rent","Entertainment","Shopping","Utilities","Other"] },
  group:         { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  paidBy:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  splitBetween:  [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  paymentMode:   { type: String, default: "UPI", enum: ["UPI","Cash","Bank transfer","Partial payment","Pending"] },
  settled:       { type: Boolean, default: false },
  locked:        { type: Boolean, default: false },
  aiTagged:      { type: Boolean, default: false },
  notes:         { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Expense", expenseSchema);
