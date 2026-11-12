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
      .skip((page - 1) * limit).limit(Number(limit))
      .lean();
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
    }).populate("paidBy splitBetween", "name email").lean();

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

// ─── Spending stats for chart (last 12 months, my share per month/category/group) ─────────
exports.getStats = async (req, res) => {
  try {
    const since = new Date();
    since.setMonth(since.getMonth() - 11);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const rows = await Expense.aggregate([
      { $match: { createdAt: { $gte: since }, splitBetween: req.user._id } },
      { $group: {
          _id: {
            m: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            c: "$category",
            g: "$group",
          },
          total: { $sum: { $divide: ["$amount", { $size: "$splitBetween" }] } },
      } },
      { $sort: { "_id.m": 1 } },
    ]);

    res.json(rows.map(r => ({ month: r._id.m, category: r._id.c, group: String(r._id.g), total: Math.round(r.total) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Optimized Settlements (debt simplification) ───────────────────────────
// Uses ALL unsettled expenses of every group I belong to (not only my own),
// so the minimum number of payments can really be found.
exports.getOptimizedSettlements = async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const { groupId } = req.query;

    // 1. Groups I am a member of
    const groupFilter = { members: req.user._id };
    if (groupId) groupFilter._id = groupId;
    const groups = await Group.find(groupFilter).select("_id").lean();
    if (!groups.length) return res.json([]);

    // 2. Every open expense in those groups
    const expenses = await Expense.find({
      group:   { $in: groups.map(g => g._id) },
      settled: false,
      locked:  false,
    }).lean();
    if (!expenses.length) return res.json([]);

    // 3. Minimum payments for everyone
    const allPayments = simplifyDebts(expenses);
    if (!allPayments.length) return res.json([]);

    // 4. Names
    const userIds = [...new Set(allPayments.flatMap(p => [p.from, p.to]))];
    const users   = await User.find({ _id: { $in: userIds } }, "name").lean();
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u.name]));

    // 5. Payments still waiting for receipt / approval → mark as "pending"
    //    (approved ones are NOT hidden: their expenses are already locked,
    //     so they never appear here again, and new debts must still show)
    const pendingPayments = await Payment.find({
      status: { $in: ["pending_receipt", "receipt_submitted"] },
      $or: [{ from: req.user._id }, { to: req.user._id }],
    }).lean();
    const pendingPairs = new Set();
    pendingPayments.forEach(p => {
      pendingPairs.add(`${p.from}_${p.to}`);
      pendingPairs.add(`${p.to}_${p.from}`);
    });

    // 6. Only the transactions that involve me
    const result = allPayments
      .filter(p => p.from === myId || p.to === myId)
      .map(p => ({
        from:     p.from,
        to:       p.to,
        fromName: userMap[p.from] || "Unknown",
        toName:   userMap[p.to]   || "Unknown",
        amount:   p.amount,
        pending:  pendingPairs.has(`${p.from}_${p.to}`),
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