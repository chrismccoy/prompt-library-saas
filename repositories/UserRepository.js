/**
 * User management, ACL, and status.
 */

const bcrypt = require("bcryptjs");

class UserRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Case-insensitive email lookup.
   */
  async findByEmail(email) {
    return this.db("users")
      .whereRaw("lower(email) = ?", [email.toLowerCase()])
      .first();
  }

  /**
   * Case-insensitive handle lookup.
   */
  async findByUsername(username) {
    return this.db("users")
      .whereRaw("lower(username) = ?", [username.toLowerCase()])
      .first();
  }

  /**
   * Primary Key lookup.
   */
  async findById(id) {
    return this.db("users").where({ id }).first();
  }

  /**
   * Registers a user with secure password hashing.
   * Generates a base handle from the email prefix.
   */
  async create({ email, password, role = "USER" }) {
    const hash = await bcrypt.hash(password, 12);
    const baseUsername = email
      .split("@")[0]
      .replace(/[^a-z0-9]/gi, "");
    const [id] = await this.db("users")
      .insert({
        email: email.toLowerCase(),
        username: `${baseUsername}_${Math.floor(Math.random() * 1000)}`,
        password_hash: hash,
        role,
      })
      .returning("id");
    return typeof id === "object" ? id.id : id;
  }

  /**
   * Profile metadata update.
   */
  async updateProfile(userId, data) {
    return this.db("users")
      .where({
        id: userId,
      })
      .update({
        username: data.username,
        bio: data.bio,
        website: data.website,
        profile_public: Boolean(data.profile_public),
      });
  }

  /**
   * Global Ranking for community.
   */
  async getLeaderboard(limit = 10) {
    return this.db("users")
      .where("profile_public", true)
      .orderBy("reputation_score", "desc")
      .limit(limit)
      .select("username", "reputation_score", "bio");
  }

  /**
   * Checks for specific features access.
   */
  async hasEntitlement(userId, key) {
    const row = await this.db("entitlements")
      .where({
        user_id: userId,
        key,
        active: true,
      })
      .first();
    return !!row;
  }

  /**
   * Grants feature access (Upsert pattern).
   */
  async grantEntitlement(userId, key, trx = this.db) {
    await trx("entitlements")
      .insert({
        user_id: userId,
        key,
        active: true,
      })
      .onConflict(["user_id", "key"])
      .merge({
        active: true,
      });
  }

  /**
   * Revokes access.
   */
  async revokeEntitlement(userId, key) {
    await this.db("entitlements")
      .where({
        user_id: userId,
        key,
      })
      .update({
        active: false,
      });
  }

  /**
   * Creates recovery token.
   */
  async createResetToken(userId, token, expiresAt) {
    await this.db("password_resets").where({ user_id: userId }).del();
    await this.db("password_resets").insert({
      user_id: userId,
      token,
      expires_at: expiresAt,
    });
  }

  /**
   * Pagination for Admin.
   */
  async list({ limit, offset }) {
    const users = await this.db("users")
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);
    for (const u of users) {
      u.has_access = await this.hasEntitlement(u.id, "ALL_LIBRARY");
    }
    return users;
  }

  /**
   * Total system users count.
   */
  async count() {
    const res = await this.db("users").count("* as count").first();
    return res.count;
  }
}

module.exports = UserRepository;
