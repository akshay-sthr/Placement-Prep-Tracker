const Problem = require("../models/Problem");
const Mock = require("../models/Mock");
const User = require("../models/User");

// Combines DSA progress, mock interviews, profile and consistency into one 0-100 score.
const computeReadiness = async (userId) => {
  const [problems, mocks, user] = await Promise.all([
    Problem.find({ userId }, "difficulty status topic").lean(),
    Mock.find({ userId }, "rating").lean(),
    User.findById(userId).lean(),
  ]);
  const solved = problems.filter((p) => p.status === "solved").length;
  const dsa = Math.min(100, solved * 5 + problems.filter((p) => p.difficulty === "Hard" && p.status === "solved").length * 3);
  const mock = mocks.length ? Math.round((mocks.reduce((a, b) => a + b.rating, 0) / (mocks.length * 5)) * 100) : 0;
  const profile = [user.college, user.graduationYear, user.targetRole, user.skills?.length].filter(Boolean).length;
  const profileScore = Math.min(100, profile * 25);
  const consistency = Math.min(100, new Set(problems.map((p) => p.topic)).size * 7 + solved);
  const overall = Math.round(dsa * 0.45 + mock * 0.25 + profileScore * 0.15 + consistency * 0.15);

  const topics = {};
  for (const p of problems) {
    topics[p.topic] ||= { total: 0, stuck: 0 };
    topics[p.topic].total++;
    if (p.status === "stuck") topics[p.topic].stuck++;
  }
  const weakTopics = Object.entries(topics).filter(([, v]) => v.stuck > 0).sort((a, b) => b[1].stuck - a[1].stuck).slice(0, 5).map(([topic, v]) => ({ topic, stuck: v.stuck, total: v.total }));

  return {
    overall,
    components: { dsa, mock, profile: profileScore, consistency },
    weakTopics,
    counts: { solved, mocks: mocks.length },
  };
};

module.exports = { computeReadiness };
