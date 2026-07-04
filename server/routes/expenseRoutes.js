const express  = require("express");
const router   = express.Router();
const {
  addExpense, getExpenses, deleteExpense,
  getOptimizedSettlements, getMyBalances, sendReminders
} = require("../controllers/expenseController");
const { protect } = require("../middleware/authMiddleware");

router.post("/",           protect, addExpense);
router.get("/",            protect, getExpenses);
router.delete("/:id",      protect, deleteExpense);
router.get("/optimize",    protect, getOptimizedSettlements);
router.get("/balances",    protect, getMyBalances);
router.post("/reminders",  protect, sendReminders);

module.exports = router;
