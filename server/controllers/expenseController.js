const Expense  = require("../models/Expense");
const Group    = require("../models/Group");
const User     = require("../models/User");
const Payment  = require("../models/Payment");
const { sendExpenseAdded, sendOwingReminder } = require("../utils/emailService");
const { simplifyDebts } = require("../utils/debtSimplifier");

// ─── Add Expense ──────────────────────────────────────────────────────────────
exports.addExpense = async (req, res) => {
  try {
    const { description, amount, category, groupId, paidBy, splitBetween, paymentMode, notes } = req.body;
    const expense = await Expense.create({
      description, amount, category,
      group: groupId, paidBy, splitBetween, paymentMode, notes,
    });
    const populated = await expense.populate("paidBy splitBetween group", "name email");
    try {
      const group = await Group.findById(groupId).populate("members", "name email emailNotifications");
      const perShare = Math.round(amount / splitBetween.length);
      await Promise.allSettled(group.members
        .filter(m => splitBetween.includes(m._id.toString()) && m._id.toString() !== paidBy && m.emailNotifications !== "None")
        .map(member => sendExpenseAdded({ toEmail: member.email, toName: member.name, addedBy: req.user.name, description, amount, group: group.name, splitCount: splitBetween.length, yourShare: perShare }).catch(() => {}))
      );
    } catch {}
    res.status(201).json({ success: true, expense: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Expenses ─────────────────────────────────────────────────────────────
exports.getExpenses = async (req, res) => {
  try {
    const { groupId, category, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (groupId)  filter.group    = groupId;
    if (category) filter.category = category;
    filter.$or = [{ paidBy: req.user._id }, { splitBetween: req.user._id }];
    const expenses = await Expense.find(filter)
      .populate("paidBy splitBetween", "name email")
      .populate("group", "name icon")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit));
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Delete Expense ───────────────────────────────────────────────────────────
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: "Expense not found" });
    if (expense.locked) return res.status(403).json({ error: "Cannot delete a locked expense" });
    await expense.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get My Balances (per person) ─────────────────────────────────────────────
exports.getMyBalances = async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const expenses = await Expense.find({
      settled: false,
      locked:  false,
      $or: [{ paidBy: req.user._id }, { splitBetween: req.user._id }],
    }).populate("paidBy splitBetween", "name email");

    const balance = {};
    const names   = {};

    expenses.forEach(e => {
      const count   = e.splitBetween.length;
      const share   = e.amount / count;
      const payerId = e.paidBy._id.toString();

      e.splitBetween.forEach(member => {
        const mId = member._id.toString();
        names[mId] = member.name;
        if (mId === payerId) return;
        if (payerId === myId) {
          if (!balance[mId]) balance[mId] = 0;
          balance[mId] += share;
        } else if (mId === myId) {
          names[payerId] = e.paidBy.name;
          if (!balance[payerId]) balance[payerId] = 0;
          balance[payerId] -= share;
        }
      });
    });

    const result = Object.entries(balance)
      .filter(([, v]) => Math.abs(v) > 0.01)
      .map(([userId, amount]) => ({
        userId,
        name:   names[userId] || "Unknown",
        amount: Math.round(amount),
      }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Optimized Settlements ─────────────────────────────────────────────────
// Only show transactions where there is NO approved/pending payment already
exports.getOptimizedSettlements = async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const { groupId } = req.query;

    // Get unsettled expenses involving current user
    const filter = {
      settled: false,
      locked:  false,
      $or: [{ paidBy: req.user._id }, { splitBetween: req.user._id }],
    };
    if (groupId) filter.group = groupId;

    const expenses = await Expense.find(filter);
    if (!expenses.length) return res.json([]);

    const allPayments = simplifyDebts(expenses);
    if (!allPayments.length) return res.json([]);

    // Get names
    const userIds = [...new Set(allPayments.flatMap(p => [p.from, p.to]))];
    const users   = await User.find({ _id: { $in: userIds } }, "name");
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u.name]));

    // Get ALL non-rejected payments involving current user
    // (pending_receipt, receipt_submitted, approved all hide the transaction)
    const existingPayments = await Payment.find({
      status: { $in: ["pending_receipt", "receipt_submitted", "approved"] },
      $or: [{ from: req.user._id }, { to: req.user._id }],
    });

    // Build set of settled user pairs (both directions)
    const settledPairs = new Set();
    existingPayments.forEach(p => {
      const a = p.from.toString();
      const b = p.to.toString();
      settledPairs.add(`${a}_${b}`);
      settledPairs.add(`${b}_${a}`);
    });

    // Only show transactions involving current user AND not already paid
    const result = allPayments
      .filter(p => p.from === myId || p.to === myId)
      .filter(p => !settledPairs.has(`${p.from}_${p.to}`))
      .map(p => ({
        from:     p.from,
        to:       p.to,
        fromName: userMap[p.from] || "Unknown",
        toName:   userMap[p.to]   || "Unknown",
        amount:   p.amount,
      }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Send Reminders ───────────────────────────────────────────────────────────
exports.sendReminders = async (req, res) => {
  try {
    const expenses = await Expense.find({ settled: false })
      .populate("splitBetween paidBy", "name email emailNotifications");
    const owingMap = {};
    expenses.forEach(exp => {
      const share = Math.round(exp.amount / exp.splitBetween.length);
      exp.splitBetween.forEach(member => {
        if (member._id.toString() === exp.paidBy._id.toString()) return;
        if (member.emailNotifications === "None") return;
        const key = `${member._id}_${exp.paidBy._id}`;
        if (!owingMap[key]) owingMap[key] = { debtor: member, creditor: exp.paidBy, amount: 0, expenses: [] };
        owingMap[key].amount += share;
        owingMap[key].expenses.push({ description: exp.description, group: exp.group, share });
      });
    });
    await Promise.allSettled(
      Object.values(owingMap).map(({ debtor, creditor, amount, expenses: exps }) =>
        sendOwingReminder({ toEmail: debtor.email, toName: debtor.name, owedTo: creditor.name, amount, dueExpenses: exps })
      )
    );
    res.json({ success: true, reminders: Object.keys(owingMap).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
