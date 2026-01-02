/**
 * Library Routes
 */

const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");

/**
 * Defines routes for prompt exploration, social interactions, and community playlists.
 */
module.exports = (c, collectionController) => {
  router.get("/api/search", c.apiSearch);

  router.get("/playlists", collectionController.listPublic);
  router.get("/playlists/:slug", collectionController.showPublic);
  router.post(
    "/playlists/:id/follow",
    requireAuth,
    collectionController.toggleFollow
  );

  router.get("/", c.index);
  router.get("/free", c.index);
  router.get("/model/:model", c.index);
  router.get("/model/:model/free", c.index);
  router.get("/category/:category", c.index);
  router.get("/category/:category/free", c.index);
  router.get("/tag/:tag", c.index);
  router.get("/tag/:tag/free", c.index);
  router.get("/search/:q", c.index);

  router.get("/favorites", requireAuth, c.favorites);
  router.post("/prompts/:id/favorite", requireAuth, c.toggleFavorite);
  router.post("/prompts/:id/vote", requireAuth, c.vote);
  router.post("/:slug/remix", requireAuth, c.remix);
  router.post("/export/:slug", c.download);

  router.get("/:slug", c.show);

  return router;
};
