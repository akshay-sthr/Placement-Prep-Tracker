const QUESTION_BANK = [
  { category: "DSA", question: "Explain the time and space complexity of your solution to Two Sum." },
  { category: "OOP", question: "Explain encapsulation, inheritance, polymorphism, and abstraction with an example." },
  { category: "DBMS", question: "What is normalization and why is it used?" },
  { category: "OS", question: "What is the difference between a process and a thread?" },
  { category: "Networking", question: "Explain the difference between HTTP and HTTPS." },
  { category: "HR", question: "Tell me about a project you are proud of and the problem it solved." },
];

// Returns 5 random questions (shuffled copy so the bank itself is never mutated)
exports.questions = async (req, res) => {
  const shuffled = [...QUESTION_BANK].sort(() => Math.random() - 0.5);
  res.json({ questions: shuffled.slice(0, 5) });
};
