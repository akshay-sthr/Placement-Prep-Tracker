const User = require("../models/User");
const { verifyToken } = require("../services/token.service");

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Please log in." });
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "User no longer exists." });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
};

const adminOnly = (req, res, next) =>
  req.user?.role === "admin" ? next() : res.status(403).json({ error: "Admin access required." });

module.exports = { auth, adminOnly };
