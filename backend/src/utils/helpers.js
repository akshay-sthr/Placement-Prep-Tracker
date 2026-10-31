const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) if (obj && obj[k] !== undefined) out[k] = obj[k];
  return out;
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const safeUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  college: u.college,
  graduationYear: u.graduationYear,
  targetRole: u.targetRole,
  skills: u.skills,
  bio: u.bio,
});

module.exports = { pick, escapeRegex, safeUser };
