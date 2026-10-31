const dbReady = require("../../middleware/dbReady");
const router = require("express").Router();

router.use(dbReady);

router.use(require("./auth.routes"));
router.use(require("./profile.routes"));
router.use(require("./problem.routes"));
router.use(require("./mock.routes"));
router.use(require("./stats.routes"));
router.use(require("./interview.routes"));
router.use(require("./ai.routes"));
router.use(require("./admin.routes"));

module.exports = router;
