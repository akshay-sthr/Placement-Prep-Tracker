// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
};
