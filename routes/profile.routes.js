/**
 * Community social routing for public profiles and leaderboards.
 */

const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");

module.exports = (controller) => {
  router.get("/leaderboard", controller.leaderboard);
  router.get("/u/:username", controller.show);

  router.post("/settings/profile", requireAuth, controller.update);

  return router;
};
