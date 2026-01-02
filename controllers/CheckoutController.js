/**
 * Payment, sessions, and secure gateway webhooks.
 */

const { AppError } = require("../utils/AppError");
const logger = require("../utils/logger");

class CheckoutController {
  constructor(orderService, salesRepo) {
    this.orderService = orderService;
    this.sales = salesRepo;
  }

  /**
   * AJAX endpoint to validate a coupon code for real-time pricing.
   */
  validateCoupon = async (req, res) => {
    const { code } = req.query;

    const coupon = await this.sales.findValidCoupon(code);
    if (!coupon) {
      return res.status(404).json({ error: "Invalid or expired coupon" });
    }

    res.json({
      discount_percent: coupon.discount_percent,
    });
  };

  /**
   * Initiates the hosted checkout session.
   */
  initiate = async (req, res) => {
    const { provider, coupon_code } = req.body;
    const userId = res.locals.currentUser.id;

    try {
      const checkout = await this.orderService.createCheckout(
        userId,
        provider || "paypal",
        coupon_code
      );

      res.redirect(checkout.approveUrl);
    } catch (error) {
      logger.error(error, "Checkout Initiation Failed");

      req.session.flash = {
        type: "error",
        message: "We couldn't start the checkout process. Please try again.",
      };

      res.redirect("/pricing");
    }
  };

  /**
   * Handles the redirect back from PayPal.
   */
  handleReturn = async (req, res) => {
    const { token } = req.query;
    const userId = res.locals.currentUser.id;

    try {
      await this.orderService.processPaypalCapture(token, userId);

      req.session.flash = {
        type: "success",
        message: "Account upgraded successfully!",
      };

      res.redirect("/checkout/success");
    } catch (error) {
      logger.error(error, "PayPal Return Processing Failed");

      req.session.flash = {
        type: "error",
        message: error.message || "Payment verification failed.",
      };

      res.redirect("/library");
    }
  };

  /**
   * Stripe webhook notification.
   */
  handleStripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];

    const event = this.orderService.stripe.verifyWebhook(req.body, sig);
    if (!event) {
      return res.status(400).send("Webhook Error: Invalid Signature");
    }

    try {
      await this.orderService.processStripeWebhook(event);
      res.json({ received: true });
    } catch (error) {
      logger.error(error, "Stripe Webhook Processing Error");
      res.status(500).send("Internal Server Error");
    }
  };

  /**
   * Handles checkout cancellation
   */
  handleCancel = (req, res) => {
    req.session.flash = {
      type: "info",
      message: "Checkout was cancelled.",
    };

    res.redirect("/library");
  };
}

module.exports = CheckoutController;
