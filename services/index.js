/**
 * Dependency Injection for all Services
 */

const PayPalService = require("./PayPalService");
const StripeService = require("./StripeService");
const OrderService = require("./OrderService");
const AuthService = require("./AuthService");
const ExporterService = require("./ExporterService");

/**
 * Initializes all application services.
 */
module.exports = (repos, db, config) => {
  const paypal = new PayPalService();
  const stripe = new StripeService();

  const auth = new AuthService(repos.users, db);
  const exporter = ExporterService;

  const order = new OrderService(
    db,
    paypal,
    stripe,
    repos.purchases,
    repos.users,
    repos.sales,
    config
  );

  return {
    paypal,
    stripe,
    auth,
    order,
    exporter,
  };
};
