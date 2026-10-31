const Problem = require("../../models/Problem");
const Mock = require("../../models/Mock");
const lib = require("../../utils/dateHelpers");
const { TOPICS, DIFFICULTIES, STATUSES, PROBLEM_FIELDS } = require("../../constants");
const { pick, escapeRegex } = require("../../utils/helpers");

exports.list = async (req, res) => {
  const { q, topic, difficulty, status } = req.query;
  const filter = { userId: req.user._id };
  if (typeof q === "string" && q.trim()) filter.title = { $regex: escapeRegex(q.trim()), $options: "i" };
  if (TOPICS.includes(topic)) filter.topic = topic;
  if (DIFFICULTIES.includes(difficulty)) filter.difficulty = difficulty;
  if (STATUSES.includes(status)) filter.status = status;

  const problems = await Problem.find(filter).sort({ solvedDate: -1, createdAt: -1 }).limit(500).lean();
  res.json(problems);
};

exports.create = async (req, res) => {
  const data = pick(req.body, PROBLEM_FIELDS);
  data.userId = req.user._id;
  if (!lib.isDateStr(data.solvedDate)) data.solvedDate = lib.todayOr(req.query.today);
  data.reviewStage = 0;
  data.nextReview = lib.nextReviewFor(0, data.solvedDate);
  const problem = await Problem.create(data);
  res.status(201).json(problem);
};

exports.update = async (req, res) => {
  const data = pick(req.body, PROBLEM_FIELDS);
  if (data.solvedDate !== undefined && !lib.isDateStr(data.solvedDate)) delete data.solvedDate;
  const problem = await Problem.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    data,
    { new: true, runValidators: true }
  );
  if (!problem) return res.status(404).json({ error: "Problem not found." });
  res.json(problem);
};

exports.remove = async (req, res) => {
  const problem = await Problem.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!problem) return res.status(404).json({ error: "Problem not found." });
  res.json({ ok: true });
};

// ---------- Spaced repetition ----------
exports.dueReviews = async (req, res) => {
  const today = lib.todayOr(req.query.today);
  const due = await Problem.find({ userId: req.user._id, nextReview: { $ne: null, $lte: today } })
    .sort({ nextReview: 1 })
    .lean();
  res.json(due);
};

exports.review = async (req, res) => {
  const today = lib.todayOr(req.query.today);
  const problem = await Problem.findOne({ _id: req.params.id, userId: req.user._id });
  if (!problem) return res.status(404).json({ error: "Problem not found." });

  if (req.body && req.body.remembered) {
    problem.reviewStage += 1;
    problem.nextReview = lib.nextReviewFor(problem.reviewStage, today);
  } else {
    problem.reviewStage = 0;
    problem.nextReview = lib.addDays(today, lib.INTERVALS[0]);
  }
  problem.lastReviewed = today;
  await problem.save();
  res.json(problem);
};

// ---------- Sample data (only when the tracker is empty) ----------
exports.seed = async (req, res) => {
  const [pCount, mCount] = await Promise.all([
    Problem.countDocuments({ userId: req.user._id }),
    Mock.countDocuments({ userId: req.user._id }),
  ]);
  if (pCount > 0 || mCount > 0) {
    return res.status(409).json({ error: "Sample data can only be added to an empty tracker." });
  }
  const today = lib.todayOr(req.query.today);

  // [title, topic, difficulty, status, days ago, url]
  const samples = [
    ["Two Sum", "Hashing", "Easy", "solved", 0, "https://leetcode.com/problems/two-sum/"],
    ["Valid Parentheses", "Stack and Queue", "Easy", "solved", 0, "https://leetcode.com/problems/valid-parentheses/"],
    ["Reverse Linked List", "Linked List", "Easy", "solved", 1, "https://leetcode.com/problems/reverse-linked-list/"],
    ["Merge Intervals", "Arrays", "Medium", "solved", 2, "https://leetcode.com/problems/merge-intervals/"],
    ["Binary Tree Level Order Traversal", "Trees", "Medium", "solved", 2, "https://leetcode.com/problems/binary-tree-level-order-traversal/"],
    ["Number of Islands", "Graphs", "Medium", "solved", 3, "https://leetcode.com/problems/number-of-islands/"],
    ["Climbing Stairs", "Dynamic Programming", "Easy", "solved", 4, "https://leetcode.com/problems/climbing-stairs/"],
    ["Longest Substring Without Repeating Characters", "Strings", "Medium", "solved", 5, "https://leetcode.com/problems/longest-substring-without-repeating-characters/"],
    ["Coin Change", "Dynamic Programming", "Medium", "stuck", 6, "https://leetcode.com/problems/coin-change/"],
    ["Course Schedule", "Graphs", "Medium", "stuck", 8, "https://leetcode.com/problems/course-schedule/"],
    ["Kth Largest Element in an Array", "Heap", "Medium", "solved", 9, "https://leetcode.com/problems/kth-largest-element-in-an-array/"],
    ["Trapping Rain Water", "Arrays", "Hard", "stuck", 10, "https://leetcode.com/problems/trapping-rain-water/"],
    ["Group Anagrams", "Hashing", "Medium", "solved", 12, "https://leetcode.com/problems/group-anagrams/"],
    ["Binary Search", "Sorting and Searching", "Easy", "solved", 13, "https://leetcode.com/problems/binary-search/"],
  ];

  const docs = samples.map(([title, topic, difficulty, status, ago, url]) => {
    const solvedDate = lib.addDays(today, -ago);
    // Spread the review stages so the demo shows a mix of due and upcoming reviews
    const stage = ago <= 1 ? 0 : ago <= 5 ? 1 : 2;
    const lastReviewed = stage === 0 ? null : lib.addDays(solvedDate, 1);
    const nextReview = stage === 0 ? lib.addDays(solvedDate, 1) : lib.addDays(solvedDate, stage === 1 ? 4 : 11);
    return {
      userId: req.user._id,
      title,
      topic,
      difficulty,
      status,
      url,
      platform: "LeetCode",
      solvedDate,
      notes: status === "stuck" ? "Needed a hint. Redo without looking at the solution." : "",
      reviewStage: stage,
      nextReview,
      lastReviewed,
    };
  });
  await Problem.insertMany(docs);

  await Mock.insertMany([
    {
      userId: req.user._id,
      date: lib.addDays(today, -9),
      type: "DSA",
      company: "Practice with a friend",
      rating: 3,
      notes: "Solved the array question but ran out of time on the follow-up. Explain the approach before coding.",
    },
    {
      userId: req.user._id,
      date: lib.addDays(today, -2),
      type: "Technical",
      company: "College placement cell",
      rating: 4,
      notes: "Good answers on OOP and SQL joins. Revise indexing and normalization.",
    },
  ]);

  res.status(201).json({ ok: true, problems: docs.length, mocks: 2 });
};
