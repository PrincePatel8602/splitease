const express = require("express");
const router  = express.Router();
const { createOrder, verifyPayment, webhook } = require("../controllers/razorpayController");
const { protect } = require("../middleware/authMiddleware");

router.post("/create-order", protect, createOrder);
router.post("/verify",       protect, verifyPayment);
router.post("/webhook",      webhook); // no auth — called by Razorpay servers

module.exports = router;
