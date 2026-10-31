const Problem = require("../../models/Problem");
const Mock = require("../../models/Mock");
const { askAssistant, buildStudyPlan } = require("../../services/ai.service");

// Quick readiness estimate used only as context for the assistant
const quickReadiness = async (userId) => {
  try {
    const [problems] = await Promise.all([
      Problem.find({ userId }).lean(),
      Mock.find({ userId }).lean(),
    ]);
    return {
      overall: Math.min(100, problems.filter((x) => x.status === "solved").length * 5),
      weakTopics: [],
    };
  } catch {
    return null;
  }
};

exports.assistant = async (req, res) => {
  const message = String(req.body.message || "").trim();
  if (!message) return res.status(400).json({ error: "Message is required." });

  const readiness = await quickReadiness(req.user._id);
  res.json(await askAssistant(message, req.user, readiness));
};

exports.studyPlan = async (req, res) => {
  const days = Math.max(1, Math.min(30, Number(req.body.days) || 14));
  res.json({ days, plan: buildStudyPlan(days) });
};
