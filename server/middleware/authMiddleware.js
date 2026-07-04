const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;

  if (!token) return res.status(401).json({ error: "Not authorized, no token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    next();
  } catch {
    res.status(401).json({ error: "Token invalid or expired" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.userRole !== "Admin")
    return res.status(403).json({ error: "Admin access required" });
  next();
};

module.exports = { protect, adminOnly };
