/**
 * Wrapper for the Stripe Node SDK
 */

const stripe = require("stripe");
const config = require("../config");
const logger = require("../utils/logger");

class StripeService {
  constructor() {
    this.client = stripe(config.STRIPE_SECRET_KEY);
  }

  /**
   * Generates a Hosted Stripe Checkout Session.
   */
  async createCheckoutSession(userId, amountDecimal) {
    const session = await this.client.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: config.product.currency.toLowerCase(),
            product_data: {
              name: config.product.name,
              description: "Lifetime access to the professional prompt library",
            },
            unit_amount: Math.round(parseFloat(amountDecimal) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${config.APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.APP_URL}/checkout/cancel`,
      client_reference_id: String(userId),
      metadata: {
        userId: String(userId),
      },
    });

    return {
      orderId: session.id,
      approveUrl: session.url,
    };
  }

  /**
   * Validates that an incoming request payload originated from Stripe servers.
   */
  verifyWebhook(payload, signature) {
    try {
      return this.client.webhooks.constructEvent(
        payload,
        signature,
        config.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      logger.error(err, "STRIPE_WEBHOOK_INTEGRITY_FAILURE");
      return null;
    }
  }

  /**
   * Retrieves specific session details from the Stripe API.
   */
  async getSession(sessionId) {
    return this.client.checkout.sessions.retrieve(sessionId);
  }
}

module.exports = StripeService;
