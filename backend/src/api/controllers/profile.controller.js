const User = require("../../models/User");
const { PROFILE_FIELDS } = require("../../constants");
const { pick, safeUser } = require("../../utils/helpers");

exports.getProfile = async (req, res) => res.json({ user: safeUser(req.user) });

exports.updateProfile = async (req, res) => {
  const allowed = pick(req.body, PROFILE_FIELDS);
  if (allowed.skills !== undefined) {
    allowed.skills = Array.isArray(allowed.skills)
      ? allowed.skills.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 20)
      : [];
  }
  if (allowed.graduationYear !== undefined) allowed.graduationYear = Number(allowed.graduationYear) || null;
  const user = await User.findByIdAndUpdate(req.user._id, allowed, { new: true, runValidators: true });
  res.json({ user: safeUser(user) });
};
