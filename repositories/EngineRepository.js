/**
 * Configuration of target AI models (e.g., GPT-4, Claude, Midjourney).
 */

class EngineRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Retrieves all configured AI Engines sorted alphabetically by name.
   */
  async listAll() {
    return this.db("engines")
      .orderBy("name", "asc");
  }

  /**
   * Creates a new AI Engine configuration to the database.
   */
  async create(name, slug, color) {
    return this.db("engines")
      .insert({
        name: name,
        slug: slug,
        color_hex: color,
      });
  }

  /**
   * Removes an AI Engine configuration from the system.
   */
  async delete(id) {
    return this.db("engines")
      .where({
        id: id,
      })
      .del();
  }
}

module.exports = EngineRepository;
