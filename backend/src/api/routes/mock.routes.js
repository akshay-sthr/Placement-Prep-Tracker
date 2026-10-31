const router = require("express").Router();
const asyncHandler = require("../../utils/asyncHandler");
const { auth } = require("../../middleware/auth");
const c = require("../controllers/mock.controller");

router.get("/mocks", auth, asyncHandler(c.list));
router.post("/mocks", auth, asyncHandler(c.create));
router.delete("/mocks/:id", auth, asyncHandler(c.remove));

module.exports = router;
