/**
 * Manages cross-provider payment processing, discount, and orders
 */

const { AppError } = require("../utils/AppError");
const mailService = require("./MailService");
const logger = require("../utils/logger");

class OrderService {
  constructor(
    db,
    paypalService,
    stripeService,
    purchaseRepo,
    userRepo,
    salesRepo,
    config
  ) {
    this.db = db;
    this.paypal = paypalService;
    this.stripe = stripeService;
    this.purchases = purchaseRepo;
    this.users = userRepo;
    this.sales = salesRepo;
    this.config = config;
  }

  /**
   * Initiates a purchase session with calculation for active discounts.
   */
  async createCheckout(userId, provider = "paypal", couponCode = null) {
    let finalCents = this.config.product.priceCents;
    let finalDecimal = this.config.product.priceDecimal;

    if (couponCode) {
      const coupon = await this.sales.findValidCoupon(couponCode);

      if (coupon) {
        const multiplier = (100 - coupon.discount_percent) / 100;
        finalCents = Math.round(finalCents * multiplier);
        finalDecimal = (finalCents / 100).toFixed(2);

        logger.info(
          { userId, couponCode, finalDecimal },
          "Discount applied to checkout session"
        );
      }
    }

    if (provider === "stripe") {
      return this.stripe.createCheckoutSession(userId, finalDecimal);
    }

    return this.paypal.createOrder(userId, finalDecimal);
  }

  /**
   * Synchronously verifies and captures a PayPal transaction.
   */
  async processPaypalCapture(orderId, userId) {
    const existing = await this.purchases.getByProviderId(orderId);

    if (existing) {
      return { success: true };
    }

    const captureData = await this.paypal.captureOrder(orderId);
    const unit = captureData.purchase_units[0];
    const capture = unit.payments.captures[0];

    if (String(unit.custom_id) !== String(userId)) {
      throw new AppError("Payment ownership mismatch", 403);
    }

    if (capture.status !== "COMPLETED") {
      throw new AppError("PayPal payment not completed");
    }

    return this._fulfillOrder({
      userId,
      provider: "paypal",
      orderId,
      captureId: capture.id,
      amountCents: Math.round(parseFloat(capture.amount.value) * 100),
      currency: capture.amount.currency_code,
    });
  }

  /**
   * Processes a verified Stripe Webhook event.
   */
  async processStripeWebhook(event) {
    if (event.type !== "checkout.session.completed") {
      return { handled: false };
    }

    const session = event.data.object;
    const userId = session.client_reference_id || session.metadata.userId;

    if (!userId) {
      logger.error(session, "Stripe session missing critical UserID metadata");
      return { success: false };
    }

    return this._fulfillOrder({
      userId: parseInt(userId),
      provider: "stripe",
      orderId: session.id,
      captureId: session.payment_intent,
      amountCents: session.amount_total,
      currency: session.currency.toUpperCase(),
    });
  }

  /**
   * Finalizes the transaction
   */
  async _fulfillOrder({
    userId,
    provider,
    orderId,
    captureId,
    amountCents,
    currency,
  }) {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new AppError("User not found during fulfillment phase");
    }

    await this.db.transaction(async (trx) => {
      // Purchase creation
      await this.purchases.create(
        {
          user_id: userId,
          provider,
          provider_order_id: orderId,
          provider_capture_id: captureId,
          amount_cents: amountCents,
          currency,
          status: "COMPLETED",
        },
        trx
      );

      // Grant system-wide access
      await this.users.grantEntitlement(userId, "ALL_LIBRARY", trx);
    });

    const amountDisplay = (amountCents / 100).toFixed(2);
    await mailService.sendReceipt(user.email, `${amountDisplay} ${currency}`);

    logger.info({ userId, provider, orderId }, "COMMERCE_SUCCESS: Fulfillment complete");
    return { success: true };
  }
}

module.exports = OrderService;
