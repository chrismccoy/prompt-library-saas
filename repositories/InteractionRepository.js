/**
 * Reputation awarded via voting, and search analytics tracking.
 */

class InteractionRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Increments view count for social proof.
   */
  async incrementView(promptId) {
    return this.db("prompts").where("id", promptId).increment("views_count", 1);
  }

  /**
   * Toggles bookmark for a user.
   */
  async toggleFavorite(userId, promptId) {
    const existing = await this.db("prompt_favorites")
      .where({
        user_id: userId,
        prompt_id: promptId,
      })
      .first();

    if (existing) {
      await this.db("prompt_favorites")
        .where({
          user_id: userId,
          prompt_id: promptId,
        })
        .del();
      return false;
    }

    await this.db("prompt_favorites").insert({
      user_id: userId,
      prompt_id: promptId,
    });
    return true;
  }

  /**
   * Retrieves favorites for profile views.
   */
  async getFavoritesByUser(userId) {
    return this.db("prompts as p")
      .join("prompt_favorites as pf", "pf.prompt_id", "p.id")
      .leftJoin("categories as c", "c.id", "p.category_id")
      .where("pf.user_id", userId)
      .select("p.*", "c.name as category_name", "c.slug as category_slug")
      .orderBy("pf.created_at", "desc");
  }

  /**
   * Votes and awards 5 reputation points for an upvote.
   */
  async vote(userId, promptId, value) {
    const safeValue = value > 0 ? 1 : -1;
    const existing = await this.db("prompt_votes")
      .where({
        user_id: userId,
        prompt_id: promptId,
      })
      .first();

    if (existing) {
      if (existing.value === safeValue) {
        await this.db("prompt_votes")
          .where({
            user_id: userId,
            prompt_id: promptId,
          })
          .del();
        return 0;
      }
      await this.db("prompt_votes")
        .where({
          user_id: userId,
          prompt_id: promptId,
        })
        .update({
          value: safeValue,
          updated_at: new Date(),
        });
      return safeValue;
    }

    await this.db("prompt_votes").insert({
      user_id: userId,
      prompt_id: promptId,
      value: safeValue,
    });

    if (safeValue === 1) {
      await this.db("users").where({ id: userId }).increment("reputation_score", 5);
    }

    return safeValue;
  }

  /**
   * Aggregates social stats for a prompt.
   */
  async getPromptStats(promptId, currentUserId = null) {
    const [stats] = await this.db("prompt_votes")
      .where("prompt_id", promptId)
      .select(
        this.db.raw(
          "COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0) as upvotes",
        ),
        this.db.raw(
          "COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0) as downvotes",
        ),
      );

    let userState = {
      liked: false,
      disliked: false,
      favorited: false,
    };

    if (currentUserId) {
      const vote = await this.db("prompt_votes")
        .where({
          prompt_id: promptId,
          user_id: currentUserId,
        })
        .first();
      const fav = await this.db("prompt_favorites")
        .where({
          prompt_id: promptId,
          user_id: currentUserId,
        })
        .first();
      userState = {
        liked: vote?.value === 1,
        disliked: vote?.value === -1,
        favorited: !!fav,
      };
    }

    return {
      upvotes: Number(stats.upvotes),
      downvotes: Number(stats.downvotes),
      ...userState,
    };
  }

  /**
   * Logs query analytics.
   */
  async logSearch(query, resultsCount, userId = null) {
    if (!query || query.length < 2) return;
    await this.db("search_logs").insert({
      query: query.toLowerCase().trim(),
      results_count: resultsCount,
      user_id: userId,
      created_at: new Date(),
    });
  }

  /**
   * Identifies trending terms from the last 7 days.
   */
  async getTrendingSearches(limit = 5) {
    return this.db("search_logs")
      .select("query")
      .count("query as count")
      .where("results_count", ">", 0)
      .where(
        "created_at",
        ">",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      )
      .groupBy("query")
      .orderBy("count", "desc")
      .limit(limit);
  }

  /**
   * Audit log for secure prompt downloads.
   */
  async recordDownload(userId, promptId, format) {
    await this.db("downloads").insert({
      user_id: userId,
      prompt_id: promptId,
      format,
      created_at: new Date(),
    });
  }
}
module.exports = InteractionRepository;
