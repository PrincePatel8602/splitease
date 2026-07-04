const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  icon:    { type: String, default: "👥" },
  type:    { type: String, default: "Other", enum: ["Trip","Home","Food","Work","Other"] },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  roles: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    role: { type: String, enum: ["Admin","Member","Viewer"], default: "Member" },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("Group", groupSchema);
