const User = require("../../models/User");
const { ADMIN_EMAIL } = require("../../config/env");
const { signToken } = require("../../services/token.service");
const { hashPassword, verifyPassword } = require("../../services/password.service");
const { generateOtp, checkOtp, clearOtp } = require("../../services/otp.service");
const { sendOtpEmail } = require("../../services/email.service");
const { safeUser } = require("../../utils/helpers");

exports.register = async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!name || !email || password.length < 8) {
    return res.status(400).json({ error: "Name, valid email, and password of at least 8 characters are required." });
  }
  if (await User.findOne({ email })) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }
  const passwordHash = await hashPassword(password);
  const role = ADMIN_EMAIL && email === ADMIN_EMAIL ? "admin" : "student";
  const user = await User.create({ name, email, passwordHash, role });
  res.status(201).json({ token: signToken(user), user: safeUser(user) });
};

exports.login = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = await User.findOne({ email });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  res.json({ token: signToken(user), user: safeUser(user) });
};

exports.me = async (req, res) => res.json({ user: safeUser(req.user) });

// Step 1 of password reset: email a 6-digit OTP
exports.sendOtp = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "No account found with this email" });

    const otp = generateOtp(email);
    await sendOtpEmail(email, otp);

    return res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("OTP send error:", err);
    return res.status(500).json({ error: "Failed to send email. Check your SMTP settings." });
  }
};

// Step 2: verify the OTP without resetting the password yet
exports.verifyOtp = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const otp = String(req.body.otp || "").trim();
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

  const result = checkOtp(email, otp);
  if (!result.ok) return res.status(400).json({ error: result.error });
  return res.json({ message: "OTP verified successfully" });
};

// Step 3: reset the password (OTP is checked again here)
exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();
    const newPassword = String(req.body.newPassword || "");

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, OTP, and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const result = checkOtp(email, otp);
    if (!result.ok) return res.status(400).json({ error: result.error });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    user.passwordHash = await hashPassword(newPassword);
    await user.save();
    clearOtp(email);

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Password reset error:", err);
    return res.status(500).json({ error: "Something went wrong while resetting the password" });
  }
};
