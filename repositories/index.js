/**
 * Dependency injection of the Repositories
 */

const UserRepository = require("./UserRepository");
const PromptRepository = require("./PromptRepository");
const PurchaseRepository = require("./PurchaseRepository");
const InteractionRepository = require("./InteractionRepository");
const SalesRepository = require("./SalesRepository");
const UserPromptRepository = require("./UserPromptRepository");
const CollectionRepository = require("./CollectionRepository");
const NewsletterRepository = require("./NewsletterRepository");
const EngineRepository = require("./EngineRepository");

const CategoryRepository = class {
  constructor(db) {
    this.db = db;
  }

  /**
   * Retrieves all categories sorted by name.
   */
  async listAll() {
    return this.db("categories").orderBy("name");
  }
};

module.exports = (db) => {
  return {
    users: new UserRepository(db),
    prompts: new PromptRepository(db),
    purchases: new PurchaseRepository(db),
    interactions: new InteractionRepository(db),
    sales: new SalesRepository(db),
    userPrompts: new UserPromptRepository(db),
    collections: new CollectionRepository(db),
    newsletter: new NewsletterRepository(db),
    engines: new EngineRepository(db),
    categories: new CategoryRepository(db),
  };
};
