const mongoose = require("mongoose");
const { TOPICS, DIFFICULTIES, STATUSES } = require("../constants");

const problemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    platform: { type: String, trim: true, default: "LeetCode", maxlength: 40 },
    url: { type: String, trim: true, default: "", maxlength: 500 },
    topic: { type: String, enum: TOPICS, default: "Other" },
    difficulty: { type: String, enum: DIFFICULTIES, default: "Medium" },
    status: { type: String, enum: STATUSES, default: "solved" },
    solvedDate: { type: String, required: true }, // "YYYY-MM-DD"
    notes: { type: String, default: "", maxlength: 2000 },
    // spaced repetition
    reviewStage: { type: Number, default: 0 },
    nextReview: { type: String, default: null }, // null = mastered
    lastReviewed: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Problem", problemSchema);
