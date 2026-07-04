const Group   = require("../models/Group");
const User    = require("../models/User");
const Expense = require("../models/Expense");

exports.createGroup = async (req, res) => {
  try {
    const { name, icon, type, memberEmails } = req.body;
    const members = await User.find({ email: { $in: memberEmails || [] } });
    const memberIds = [req.user._id, ...members.map(m => m._id)];
    const roles = memberIds.map((id, i) => ({ user: id, role: i === 0 ? "Admin" : "Member" }));
    const group = await Group.create({ name, icon, type, members: memberIds, roles, createdBy: req.user._id });
    res.status(201).json(await group.populate("members", "name email"));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id }).populate("members", "name email");
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("members", "name email");
    if (!group) return res.status(404).json({ error: "Group not found" });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { email, role = "Member" } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });
    const group = await Group.findById(req.params.id);
    if (group.members.includes(user._id)) return res.status(400).json({ error: "Already a member" });
    group.members.push(user._id);
    group.roles.push({ user: user._id, role });
    await group.save();
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    group.members = group.members.filter(m => m.toString() !== req.params.userId);
    group.roles   = group.roles.filter(r => r.user.toString() !== req.params.userId);
    await group.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    await Group.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
