const mongoose = require("mongoose");
const { MOCK_TYPES } = require("../constants");

const mockSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true },
    type: { type: String, enum: MOCK_TYPES, default: "DSA" },
    company: { type: String, trim: true, default: "", maxlength: 80 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    notes: { type: String, default: "", maxlength: 3000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Mock", mockSchema);
