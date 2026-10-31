const Mock = require("../../models/Mock");
const lib = require("../../utils/dateHelpers");
const { MOCK_FIELDS } = require("../../constants");
const { pick } = require("../../utils/helpers");

exports.list = async (req, res) => {
  const mocks = await Mock.find({ userId: req.user._id }).sort({ date: -1, createdAt: -1 }).limit(200).lean();
  res.json(mocks);
};

exports.create = async (req, res) => {
  const data = pick(req.body, MOCK_FIELDS);
  data.userId = req.user._id;
  if (!lib.isDateStr(data.date)) data.date = lib.todayOr(req.query.today);
  data.rating = Number(data.rating);
  const mock = await Mock.create(data);
  res.status(201).json(mock);
};

exports.remove = async (req, res) => {
  const mock = await Mock.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!mock) return res.status(404).json({ error: "Mock interview not found." });
  res.json({ ok: true });
};
