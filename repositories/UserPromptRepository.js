/**
 * Private prompts and remix management.
 */

class UserPromptRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Lists user's personal prompts.
   */
  async list(userId) {
    return this.db("user_prompts")
      .where({
        user_id: userId,
      })
      .orderBy("created_at", "desc");
  }

  /**
   * Gets a specific private prompt.
   */
  async getById(id, userId) {
    return this.db("user_prompts")
      .where({
        id,
        user_id: userId,
      })
      .first();
  }

  /**
   * Clones a public prompt for private modification.
   */
  async remix(userId, parentPrompt) {
    const [id] = await this.db("user_prompts")
      .insert({
        user_id: userId,
        parent_prompt_id: parentPrompt.id,
        title: `Remix: ${parentPrompt.title}`,
        content: parentPrompt.content,
        summary: parentPrompt.summary,
      })
      .returning("id");

    await this.db("prompts")
      .where({
        id: parentPrompt.id,
      })
      .increment("remix_count", 1);

    return typeof id === "object" ? id.id : id;
  }

  /**
   * Standard Create.
   */
  async create(userId, data) {
    const [id] = await this.db("user_prompts")
      .insert({
        user_id: userId,
        title: data.title,
        content: data.content,
        summary: data.summary || null,
      })
      .returning("id");
    return typeof id === "object" ? id.id : id;
  }

  /**
   * Standard Update.
   */
  async update(id, userId, data) {
    return this.db("user_prompts")
      .where({
        id,
        user_id: userId,
      })
      .update({
        title: data.title,
        content: data.content,
        summary: data.summary || null,
        updated_at: new Date(),
      });
  }

  /**
   * Standard Delete.
   */
  async delete(id, userId) {
    return this.db("user_prompts")
      .where({
        id,
        user_id: userId,
      })
      .del();
  }
}

module.exports = UserPromptRepository;
