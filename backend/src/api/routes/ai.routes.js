const router = require("express").Router();
const asyncHandler = require("../../utils/asyncHandler");
const { auth } = require("../../middleware/auth");
const c = require("../controllers/ai.controller");

router.post("/ai/assistant", auth, asyncHandler(c.assistant));
router.post("/ai/study-plan", auth, asyncHandler(c.studyPlan));

module.exports = router;
