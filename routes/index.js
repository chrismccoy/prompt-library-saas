/**
 * Centralized Route
 */

module.exports = (app, controllers) => {
  const authRoutes = require("./auth.routes")(controllers.auth);
  const profileRoutes = require("./profile.routes")(controllers.profile);
  const checkoutRoutes = require("./checkout.routes")(controllers.checkout);
  const adminRoutes = require("./admin.routes")(controllers.admin);

  /**
   * Library Routes
   * Maps global discovery, filtering, and community playlists.
   */
  const libraryRoutes = require("./library.routes")(
    controllers.library,
    controllers.collections
  );

  /**
   * Dashboard Routes
   * Maps user-specific tools, settings, and private libraries.
   */
  const dashboardRoutes = require("./dashboard.routes")(
    controllers.dashboard,
    controllers.userPrompts,
    controllers.collections,
    controllers.profile
  );

  // Top-Level Public & SEO Endpoints
  app.get("/", controllers.public.renderHome);
  app.get("/pricing", controllers.public.renderPricing);
  app.get("/health", controllers.public.health);
  app.get("/sitemap.xml", controllers.public.sitemap);

  // Lead Capture
  app.post("/newsletter/subscribe", controllers.newsletter.subscribe);

  // Sub-Module Mounting
  app.use("/", authRoutes);
  app.use("/", profileRoutes);
  app.use("/library", libraryRoutes);
  app.use("/dashboard", dashboardRoutes);
  app.use("/checkout", checkoutRoutes);
  app.use("/admin", adminRoutes);
};
