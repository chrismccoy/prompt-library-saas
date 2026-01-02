/**
 * Admin Routes
 */

const router = require("express").Router();
const { requireAdmin } = require("../middleware/auth");
const upload = require("../middleware/upload");

module.exports = (c) => {
  router.use(requireAdmin);

  // Dashboard
  router.get("/", c.index);
  router.get("/analytics", c.analytics);

  // AI Engines Management
  router.get("/engines", c.listEngines);
  router.post("/engines", c.createEngine);
  router.post("/engines/:id/delete", c.deleteEngine);

  // Taxonomy (Categories)
  router.get("/categories", c.listCategories);
  router.post("/categories", c.createCategory);
  router.post("/categories/:id/delete", c.deleteCategory);

  // User & Entitlement Management
  router.get("/users", c.listUsers);
  router.post("/users/:id/grant", c.grantAccess);
  router.post("/users/:id/revoke", c.revokeAccess);

  // Coupons
  router.get("/coupons", c.listCoupons);
  router.post("/coupons", c.createCoupon);
  router.post("/coupons/:id/delete", c.deleteCoupon);

  // Catalog Prompts
  router.get("/prompts", c.listPrompts);
  router.get("/prompts/new", c.formNew);
  router.post("/prompts/new", upload.array("images", 5), c.create);

  router.get("/prompts/:id/edit", c.formEdit);
  router.post("/prompts/:id/edit", upload.array("images", 5), c.update);
  router.post("/prompts/:id/delete", c.delete);

  // AJAX Asset Gallery Endpoints
  router.post("/prompts/:id/images", upload.single("file"), c.uploadImage);
  router.post("/prompts/:id/images/:imageId/delete", c.deleteImage);

  return router;
};
