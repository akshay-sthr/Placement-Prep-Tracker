const Problem = require("../../models/Problem");
const Mock = require("../../models/Mock");
const lib = require("../../utils/dateHelpers");
const { computeReadiness } = require("../../services/readiness.service");

// Numbers for the dashboard
exports.stats = async (req, res) => {
  const today = lib.todayOr(req.query.today);

  const [problems, mocks, recent] = await Promise.all([
    Problem.find({ userId: req.user._id }, "topic difficulty status solvedDate nextReview").lean(),
    Mock.find({ userId: req.user._id }, "rating").lean(),
    Problem.find({ userId: req.user._id }).sort({ solvedDate: -1, createdAt: -1 }).limit(6).lean(),
  ]);

  const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
  const topicCounts = {};
  const perDay = {};
  let stuck = 0;
  let mastered = 0;
  let dueCount = 0;

  for (const p of problems) {
    byDifficulty[p.difficulty] = (byDifficulty[p.difficulty] || 0) + 1;
    topicCounts[p.topic] = (topicCounts[p.topic] || 0) + 1;
    perDay[p.solvedDate] = (perDay[p.solvedDate] || 0) + 1;
    if (p.status === "stuck") stuck++;
    if (p.nextReview == null) mastered++;
    else if (p.nextReview <= today) dueCount++;
  }

  const days = [];
  for (let i = lib.HEATMAP_DAYS - 1; i >= 0; i--) {
    const date = lib.addDays(today, -i);
    days.push({ date, count: perDay[date] || 0 });
  }
  const last7 = days.slice(-7).reduce((sum, d) => sum + d.count, 0);

  const ratings = mocks.map((m) => m.rating);
  const avgMock = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : null;

  res.json({
    today,
    total: problems.length,
    stuck,
    mastered,
    dueCount,
    last7,
    byDifficulty,
    byTopic: Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count),
    streak: lib.computeStreaks(Object.keys(perDay), today),
    days,
    mockCount: mocks.length,
    avgMock,
    recent,
    reviewSteps: lib.INTERVALS.length,
  });
};

exports.readiness = async (req, res) => {
  res.json(await computeReadiness(req.user._id));
};
