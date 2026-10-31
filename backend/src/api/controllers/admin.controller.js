const User = require("../../models/User");
const Problem = require("../../models/Problem");
const Mock = require("../../models/Mock");

exports.overview = async (req, res) => {
  const [students, problems, mocks] = await Promise.all([
    User.countDocuments({ role: "student" }),
    Problem.countDocuments(),
    Mock.countDocuments(),
  ]);
  const recentUsers = await User.find({ role: "student" })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("name email college targetRole createdAt")
    .lean();
  res.json({ students, problems, mocks, recentUsers });
};
