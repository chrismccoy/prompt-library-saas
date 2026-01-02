/**
 * Wrapper for the PayPal REST v2 API. Manages OAuth2 token caching
 * and communication with PayPal's sandbox/live environments.
 */

const config = require("../config");
const logger = require("../utils/logger");

class PayPalService {
  constructor() {
    this.baseUrl = config.isProd
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Manages OAuth2 bearer token
   */
  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    const authBuffer = Buffer.from(
      `${config.PAYPAL_CLIENT_ID}:${config.PAYPAL_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${authBuffer}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PayPal Auth Failure: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;

    return this.accessToken;
  }

  /**
   * Creates an order with PayPal and retrieves approval links.
   */
  async createOrder(customId, amount) {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            custom_id: String(customId),
            amount: {
              currency_code: config.product.currency,
              value: amount,
            },
            description: config.product.name,
          },
        ],
        application_context: {
          return_url: `${config.APP_URL}/checkout/return`,
          cancel_url: `${config.APP_URL}/checkout/cancel`,
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error(data, "PAYPAL_CREATE_ORDER_ERROR");
      throw new Error("Failed to initialize PayPal order session");
    }

    return {
      orderId: data.id,
      approveUrl: data.links.find((l) => l.rel === "approve").href,
    };
  }

  /**
   * Captures the funds for an authorized PayPal transaction.
   */
  async captureOrder(orderId) {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error(data, "PAYPAL_CAPTURE_ERROR");
      throw new Error("Failed to capture funds from PayPal session");
    }

    return data;
  }
}

module.exports = PayPalService;
