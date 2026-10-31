const router = require("express").Router();
const asyncHandler = require("../../utils/asyncHandler");
const { auth, adminOnly } = require("../../middleware/auth");
const c = require("../controllers/admin.controller");

router.get("/admin/overview", auth, adminOnly, asyncHandler(c.overview));

module.exports = router;
