require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const cron      = require("node-cron");
const path      = require("path");
const connectDB = require("./config/db");

const app = express();
app.use(cors({ origin: process.env.APP_URL, credentials: true }));
app.use(express.json());

// Serve uploaded receipt screenshots
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth",     require("./routes/authRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));
app.use("/api/groups",   require("./routes/groupRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/razorpay", require("./routes/razorpayRoutes"));

// QR code verification page (opens in browser when QR is scanned)
app.use("/verify", require("./routes/verifyRoutes"));

// Daily reminders at 9 AM
cron.schedule("0 9 * * *", async () => {
  console.log("⏰ Running daily owing reminders...");
  try {
    const resp = await fetch(`http://localhost:${process.env.PORT || 5000}/api/expenses/reminders`, {
      method: "POST", headers: { "Content-Type": "application/json" }
    });
    const data = await resp.json();
    console.log(`✅ Sent ${data.reminders} reminders`);
  } catch (err) { console.error("Cron error:", err.message); }
});

connectDB().then(() => {
  app.listen(process.env.PORT || 5000, () =>
    console.log(`🚀 SplitEase server running on port ${process.env.PORT || 5000}`)
  );
});
