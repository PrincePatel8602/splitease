const express  = require("express");
const router   = express.Router();
const multer   = require("multer");
const path     = require("path");
const { protect } = require("../middleware/authMiddleware");
const {
  recordPayment,
  submitReceipt,
  approvePayment,
  rejectPayment,
  getPayments,
  downloadReceipt,
} = require("../controllers/paymentController");

// Multer — save receipt screenshots to /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename:    (req, file, cb) => cb(null, `receipt_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    /jpeg|jpg|png|pdf/.test(path.extname(file.originalname).toLowerCase())
      ? cb(null, true)
      : cb(new Error("Only JPG, PNG, PDF allowed"));
  },
});

router.post("/",               protect, recordPayment);
router.get("/",                protect, getPayments);
router.post("/:id/receipt",    protect, upload.single("receipt"), submitReceipt);
router.post("/:id/approve",    protect, approvePayment);
router.post("/:id/reject",     protect, rejectPayment);
router.get("/:id/receipt",     protect, downloadReceipt);

module.exports = router;
