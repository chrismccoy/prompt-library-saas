/**
 * Private User Workspace and Workspace Routing
 */

const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");

module.exports = (
  controller,
  userPromptController,
  collectionController,
  profileController
) => {
  router.use(requireAuth);

  router.get("/", controller.index);

  router.get("/settings", (req, res) =>
    res.render("pages/dashboard/settings", { title: "Settings" })
  );
  router.post("/settings/profile", profileController.update);

  router.get("/my-prompts", userPromptController.index);
  router.get("/my-prompts/new", userPromptController.formNew);
  router.post("/my-prompts/new", userPromptController.create);
  router.get("/my-prompts/:id/edit", userPromptController.formEdit);
  router.post("/my-prompts/:id/edit", userPromptController.update);
  router.post("/my-prompts/:id/delete", userPromptController.delete);

  router.get("/collections", collectionController.index);
  router.post("/collections", collectionController.create);
  router.get("/collections/:slug", collectionController.show);
  router.post("/collections/add-item", collectionController.addItem);
  router.post(
    "/collections/:id/remove/:promptId",
    collectionController.removeItem
  );
  router.post("/collections/:id/delete", collectionController.delete);

  return router;
};
