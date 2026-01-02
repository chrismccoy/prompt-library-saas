/**
 * Routing for Commerce, Payments, and asynchronous Provider Webhooks.
 */

const router = require("express").Router();
const express = require("express");
const { requireAuth } = require("../middleware/auth");

/**
 * Defines routes for the purchases
 */
module.exports = (c) => {
  router.post(
    "/webhook/stripe",
    express.raw({ type: "application/json" }),
    c.handleStripeWebhook
  );

  router.use(requireAuth);

  router.post("/", c.initiate);

  router.get("/return", c.handleReturn);

  router.get("/success", (req, res) =>
    res.render("pages/checkout-success", { title: "Success" })
  );
  router.get("/cancel", c.handleCancel);

  router.get("/validate-coupon", c.validateCoupon);

  return router;
};
