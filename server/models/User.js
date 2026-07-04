const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true, minlength: 6 },
  avatar:    { type: String, default: "" },
  phone:     { type: String, default: "" },
  defaultPaymentMode: { type: String, default: "UPI", enum: ["UPI","Cash","Bank transfer"] },
  emailNotifications: { type: String, default: "All expenses", enum: ["All expenses","Only settlements","None"] },
}, { timestamps: true });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("User", userSchema);
