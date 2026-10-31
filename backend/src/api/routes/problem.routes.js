const router = require("express").Router();
const asyncHandler = require("../../utils/asyncHandler");
const { auth } = require("../../middleware/auth");
const c = require("../controllers/problem.controller");

router.get("/problems", auth, asyncHandler(c.list));
router.post("/problems", auth, asyncHandler(c.create));
router.put("/problems/:id", auth, asyncHandler(c.update));
router.delete("/problems/:id", auth, asyncHandler(c.remove));

// Spaced repetition
router.get("/reviews/due", auth, asyncHandler(c.dueReviews));
router.post("/problems/:id/review", auth, asyncHandler(c.review));

// Demo data
router.post("/seed", auth, asyncHandler(c.seed));

module.exports = router;
