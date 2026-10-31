const router = require("express").Router();
const asyncHandler = require("../../utils/asyncHandler");
const { auth } = require("../../middleware/auth");
const c = require("../controllers/interview.controller");

router.get("/interviews/questions", auth, asyncHandler(c.questions));

module.exports = router;
