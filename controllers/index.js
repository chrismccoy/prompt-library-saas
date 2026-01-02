/**
 * Dependency Injection Layer. Ensures all controllers are loaded
 */

const AuthController = require("./AuthController");
const LibraryController = require("./LibraryController");
const CheckoutController = require("./CheckoutController");
const AdminController = require("./AdminController");
const DashboardController = require("./DashboardController");
const PublicController = require("./PublicController");
const UserPromptController = require("./UserPromptController");
const ProfileController = require("./ProfileController");
const NewsletterController = require("./NewsletterController");
const CollectionController = require("./CollectionController");

/**
 * Controller initialization.
 */
module.exports = (services, repos, db, config) => {
  return {
    auth: new AuthController(services.auth),
    library: new LibraryController(
      repos.prompts,
      repos.categories,
      repos.interactions,
      repos.userPrompts,
      repos.engines,
    ),
    checkout: new CheckoutController(services.order, repos.sales),
    admin: new AdminController(
      repos.prompts,
      repos.categories,
      repos.users,
      repos.sales,
      repos.engines,
    ),
    dashboard: new DashboardController(db, repos.purchases),
    public: new PublicController(db, repos.prompts, repos.categories),
    userPrompts: new UserPromptController(repos.userPrompts),
    profile: new ProfileController(
      repos.users,
      repos.interactions,
      repos.prompts,
    ),
    newsletter: new NewsletterController(repos.newsletter),
    collections: new CollectionController(repos.collections),
  };
};
