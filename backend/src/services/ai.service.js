const { OPENAI_API_KEY, OPENAI_MODEL } = require("../config/env");

const fallbackAI = (message, user, readiness) => {
  const m = message.toLowerCase();
  if (m.includes("plan") || m.includes("schedule")) return `For ${user.targetRole || "your target role"}, start with 60 minutes of DSA, 30 minutes of core CS, and 30 minutes of interview practice each day. Focus first on: ${(readiness?.weakTopics || []).map(x => x.topic).slice(0, 3).join(", ") || "Arrays, DBMS, OOP"}.`;
  if (m.includes("resume")) return "Keep your resume to one page, quantify project impact, and be ready to explain every technology and design decision listed.";
  if (m.includes("interview")) return "Use a simple interview loop: clarify the problem, explain the approach, analyze complexity, code, test edge cases, then summarize trade-offs.";
  return `Hi ${user.name}. Your current readiness is ${readiness?.overall ?? 0}%. Ask me for a study plan, interview practice, resume advice, or weak-topic revision.`;
};

// Returns { reply, provider }
const askAssistant = async (message, user, readiness) => {
  if (!OPENAI_API_KEY) return { reply: fallbackAI(message, user, readiness), provider: "local-fallback" };

  const prompt = `You are a placement preparation assistant. Be concise, practical, and factual. User profile: target role=${user.targetRole || "not set"}, skills=${(user.skills || []).join(", ")}. Readiness=${readiness?.overall || 0}%. User asks: ${message}`;
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: OPENAI_MODEL, input: prompt }),
  });
  if (!r.ok) return { reply: fallbackAI(message, user, readiness), provider: "local-fallback" };

  const data = await r.json();
  const reply =
    data.output_text ||
    data.output?.flatMap((x) => x.content || []).map((x) => x.text || "").join(" ") ||
    fallbackAI(message, user, readiness);
  return { reply, provider: "openai" };
};

const buildStudyPlan = (days) =>
  Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    focus: i % 3 === 0 ? "DSA + coding practice" : i % 3 === 1 ? "Core CS + SQL" : "Mock interview + revision",
    tasks:
      i % 3 === 0
        ? ["2 problems", "Review one weak topic"]
        : i % 3 === 1
        ? ["Revise OOP/DBMS/OS", "Solve 10 MCQs"]
        : ["Practice 3 interview questions", "Review mistakes"],
  }));

module.exports = { fallbackAI, askAssistant, buildStudyPlan };
