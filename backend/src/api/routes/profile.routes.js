const router = require("express").Router();
const asyncHandler = require("../../utils/asyncHandler");
const { auth } = require("../../middleware/auth");
const c = require("../controllers/profile.controller");

router.get("/profile", auth, asyncHandler(c.getProfile));
router.put("/profile", auth, asyncHandler(c.updateProfile));

module.exports = router;
