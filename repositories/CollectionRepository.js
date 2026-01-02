/**
 * User folders, public playlists, and follows.
 */

const { slugify } = require("../utils/helpers");

class CollectionRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Lists all collections owned by a specific user.
   */
  async listByUser(userId) {
    return this.db("collections as c")
      .where({
        user_id: userId,
      })
      .leftJoin("collection_items as ci", "ci.collection_id", "c.id")
      .select("c.*")
      .count("ci.prompt_id as item_count")
      .groupBy("c.id")
      .orderBy("c.created_at", "desc");
  }

  /**
   * Retrieves public playlists
   */
  async listPublic(limit = 10) {
    return this.db("collections as c")
      .join("users as u", "u.id", "c.user_id")
      .leftJoin("collection_follows as cf", "cf.collection_id", "c.id")
      .where("c.is_public", true)
      .select("c.*", "u.username as creator_handle")
      .count("cf.user_id as follow_count")
      .groupBy("c.id")
      .orderBy("follow_count", "desc")
      .limit(limit);
  }

  /**
   * Gets a collection by slug for the owner.
   */
  async getBySlug(userId, slug) {
    const collection = await this.db("collections")
      .where({
        user_id: userId,
        slug: slug,
      })
      .first();

    if (!collection) {
      return null;
    }

    const items = await this.db("prompts as p")
      .join("collection_items as ci", "ci.prompt_id", "p.id")
      .leftJoin("categories as c", "c.id", "p.category_id")
      .where("ci.collection_id", collection.id)
      .select("p.*", "c.name as category_name", "c.slug as category_slug");

    return {
      ...collection,
      items,
    };
  }

  /**
   * Gets a collection by slug for public view.
   */
  async getPublicBySlug(slug) {
    const collection = await this.db("collections as c")
      .join("users as u", "u.id", "c.user_id")
      .where({
        "c.slug": slug,
        "c.is_public": true,
      })
      .select("c.*", "u.username as creator_handle", "u.bio as creator_bio")
      .first();

    if (!collection) {
      return null;
    }

    const items = await this.db("prompts as p")
      .join("collection_items as ci", "ci.prompt_id", "p.id")
      .where("ci.collection_id", collection.id)
      .select("p.title", "p.slug", "p.summary", "p.is_free", "p.target_model");

    return {
      ...collection,
      items,
    };
  }

  /**
   * Create a new collection.
   */
  async create(userId, name, isPublic = false) {
    const slug = slugify(name);
    const [id] = await this.db("collections")
      .insert({
        user_id: userId,
        name: name,
        slug: slug,
        is_public: isPublic,
        created_at: new Date(),
      })
      .returning("id");

    return typeof id === "object" ? id.id : id;
  }

  /**
   * Updates privacy settings for a folder.
   */
  async updatePrivacy(userId, id, isPublic) {
    return this.db("collections")
      .where({
        user_id: userId,
        id: id,
      })
      .update({
        is_public: isPublic,
      });
  }

  /**
   * Toggles Follow to a collection.
   */
  async toggleFollow(userId, collectionId) {
    const existing = await this.db("collection_follows")
      .where({
        user_id: userId,
        collection_id: collectionId,
      })
      .first();

    if (existing) {
      await this.db("collection_follows")
        .where({
          user_id: userId,
          collection_id: collectionId,
        })
        .del();
      return false;
    }

    await this.db("collection_follows").insert({
      user_id: userId,
      collection_id: collectionId,
    });
    return true;
  }

  /**
   * Retrieves collections followed by a user.
   */
  async getFollowedByUser(userId) {
    return this.db("collections as c")
      .join("collection_follows as cf", "cf.collection_id", "c.id")
      .join("users as u", "u.id", "c.user_id")
      .where("cf.user_id", userId)
      .select("c.*", "u.username as creator_handle");
  }

  /**
   * Adds a prompt to a collection.
   */
  async addItem(collectionId, promptId) {
    return this.db("collection_items")
      .insert({
        collection_id: collectionId,
        prompt_id: promptId,
      })
      .onConflict()
      .ignore();
  }

  /**
   * Removes a prompt from a collection.
   */
  async removeItem(collectionId, promptId) {
    return this.db("collection_items")
      .where({
        collection_id: collectionId,
        prompt_id: promptId,
      })
      .del();
  }

  /**
   * Deletes a folder.
   */
  async delete(userId, id) {
    return this.db("collections")
      .where({
        user_id: userId,
        id: id,
      })
      .del();
  }
}

module.exports = CollectionRepository;
