/**
 * Routing for user, and sessions
 */

const router = require("express").Router();

module.exports = (c) => {
  router.get("/login", c.renderLogin);
  router.post("/login", c.login);

  router.get("/register", c.renderRegister);
  router.post("/register", c.register);

  router.post("/logout", c.logout);

  router.get("/forgot-password", c.renderForgotPassword);
  router.post("/forgot-password", c.sendResetLink);

  router.get("/reset-password", c.renderResetPassword);
  router.post("/reset-password", c.resetPassword);

  return router;
};
