require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const path = require("path");
const connectDB = require("./config/db");

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.APP_URL,
    credentials: true,
  })
);

app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Root Route
app.get("/", (req, res) => {
  res.send("🚀 SplitEase Backend is Running");
});

// Health Check Route
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
  });
});

// API Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));
app.use("/api/groups", require("./routes/groupRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/razorpay", require("./routes/razorpayRoutes"));
app.use("/verify", require("./routes/verifyRoutes"));

// Daily reminders at 9 AM
cron.schedule("0 9 * * *", async () => {
  console.log("⏰ Running daily owing reminders...");

  try {
    const response = await fetch(
      `${process.env.APP_URL}/api/expenses/reminders`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    console.log(`✅ Sent ${data.reminders} reminders`);
  } catch (err) {
    console.error("Cron Error:", err.message);
  }
});

// Connect Database & Start Server
connectDB()
  .then(() => {
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`🚀 SplitEase server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
  });