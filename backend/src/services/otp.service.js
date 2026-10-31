// Temporary in-memory OTP storage: email -> { otp, expiresAt }
// (Resets when the server restarts. Move to MongoDB/Redis if you scale to many servers.)
const otpStore = new Map();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

const generateOtp = (email) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { otp, expiresAt: Date.now() + OTP_TTL_MS });
  return otp;
};

// Returns { ok: true } or { ok: false, error: "message" }
const checkOtp = (email, otp) => {
  const record = otpStore.get(email);
  if (!record) return { ok: false, error: "No OTP requested for this email or it has expired" };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return { ok: false, error: "OTP has expired. Please request a new one." };
  }
  if (record.otp !== otp) return { ok: false, error: "Invalid OTP code" };
  return { ok: true };
};

const clearOtp = (email) => otpStore.delete(email);

module.exports = { generateOtp, checkOtp, clearOtp };
