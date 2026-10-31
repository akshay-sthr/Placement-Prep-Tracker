const router = require("express").Router();
const asyncHandler = require("../../utils/asyncHandler");
const { auth } = require("../../middleware/auth");
const c = require("../controllers/auth.controller");

router.post("/auth/register", asyncHandler(c.register));
router.post("/auth/login", asyncHandler(c.login));
router.post("/auth/send-otp", c.sendOtp);
router.post("/auth/verify-otp", asyncHandler(c.verifyOtp));
router.post("/auth/reset-password-otp", c.resetPasswordWithOtp);
router.get("/auth/me", auth, asyncHandler(c.me));

module.exports = router;
