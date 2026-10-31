const router = require("express").Router();
const asyncHandler = require("../../utils/asyncHandler");
const { auth } = require("../../middleware/auth");
const c = require("../controllers/stats.controller");

router.get("/stats", auth, asyncHandler(c.stats));
router.get("/readiness", auth, asyncHandler(c.readiness));

module.exports = router;
