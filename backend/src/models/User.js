const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["student", "admin"], default: "student" },
  college: { type: String, default: "", maxlength: 120 },
  graduationYear: { type: Number, default: null },
  targetRole: { type: String, default: "", maxlength: 120 },
  skills: { type: [String], default: [] },
  bio: { type: String, default: "", maxlength: 500 },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
