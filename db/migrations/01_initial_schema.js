/**
 * Initial Schema Migration.
 */

/**
 * Executes the schema
 */
exports.up = async (knex) => {
  await knex.schema
    // ENGINES: Metadata for AI Model categorization and UI branding.
    .createTable("engines", (t) => {
      t.increments("id").primary();
      t.string("name").notNullable();
      t.string("slug").unique().notNullable();
      t.string("color_hex").defaultTo("#4f46e5").notNullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })

    // USERS: Identity management and community profile.
    .createTable("users", (t) => {
      t.increments("id").primary();
      t.string("email").unique().notNullable();
      t.string("password_hash").notNullable();
      t.string("role").defaultTo("USER").notNullable();
      t.string("username").unique().notNullable();
      t.text("bio");
      t.string("website");
      t.boolean("profile_public").defaultTo(false).notNullable();
      t.integer("reputation_score").defaultTo(0).notNullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })

    // CATEGORIES: Primary taxonomy for the global library.
    .createTable("categories", (t) => {
      t.increments("id").primary();
      t.string("name").unique().notNullable();
      t.string("slug").unique().notNullable();
    })

    // PROMPTS: The core catalog.
    .createTable("prompts", (t) => {
      t.increments("id").primary();
      t.string("title").notNullable();
      t.string("slug").unique().notNullable();
      t.text("summary");
      t.text("content").notNullable();
      t.string("status").defaultTo("DRAFT").notNullable();
      t.boolean("is_free").defaultTo(false).notNullable();
      t.string("target_model").defaultTo("General").notNullable();
      t.integer("views_count").defaultTo(0).notNullable();
      t.integer("remix_count").defaultTo(0).notNullable();
      t.string("meta_keywords");
      t.integer("category_id")
        .references("id")
        .inTable("categories")
        .onDelete("SET NULL");
      t.integer("engine_id")
        .references("id")
        .inTable("engines")
        .onDelete("SET NULL");
      t.timestamps(true, true);

      t.index(["status", "created_at"]);
      t.index(["is_free"]);
      t.index(["target_model"]);
    })

    // USER_PROMPTS: Personal library and remix
    .createTable("user_prompts", (t) => {
      t.increments("id").primary();
      t.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
      t.integer("parent_prompt_id")
        .references("id")
        .inTable("prompts")
        .onDelete("SET NULL");
      t.string("title").notNullable();
      t.text("content").notNullable();
      t.text("summary");
      t.timestamps(true, true);
    })

    // COLLECTIONS: Personal folders and community playlists.
    .createTable("collections", (t) => {
      t.increments("id").primary();
      t.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
      t.string("name").notNullable();
      t.string("slug").notNullable();
      t.boolean("is_public").defaultTo(false).notNullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.unique(["user_id", "slug"]);
    })

    // COLLECTION_ITEMS: Relationship mapping for playlists.
    .createTable("collection_items", (t) => {
      t.integer("collection_id")
        .references("id")
        .inTable("collections")
        .onDelete("CASCADE");
      t.integer("prompt_id")
        .references("id")
        .inTable("prompts")
        .onDelete("CASCADE");
      t.primary(["collection_id", "prompt_id"]);
    })

    // COLLECTION_FOLLOWS: Subscription state for playlists.
    .createTable("collection_follows", (t) => {
      t.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
      t.integer("collection_id")
        .references("id")
        .inTable("collections")
        .onDelete("CASCADE");
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.primary(["user_id", "collection_id"]);
    })

    // TAGS: Many-to-Many metadata taxonomy.
    .createTable("tags", (t) => {
      t.increments("id").primary();
      t.string("name").unique().notNullable();
      t.string("slug").unique().notNullable();
    })
    .createTable("prompt_tags", (t) => {
      t.integer("prompt_id")
        .references("id")
        .inTable("prompts")
        .onDelete("CASCADE");
      t.integer("tag_id").references("id").inTable("tags").onDelete("CASCADE");
      t.primary(["prompt_id", "tag_id"]);
    })

    // COMMERCE: Order and coupon management.
    .createTable("purchases", (t) => {
      t.increments("id").primary();
      t.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
      t.string("provider").notNullable();
      t.string("provider_order_id").unique().notNullable();
      t.string("provider_capture_id");
      t.integer("amount_cents").notNullable();
      t.string("currency").notNullable();
      t.string("status").defaultTo("COMPLETED").notNullable();
      t.string("coupon_code");
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })
    .createTable("coupons", (t) => {
      t.increments("id").primary();
      t.string("code").unique().notNullable();
      t.integer("discount_percent").notNullable();
      t.boolean("active").defaultTo(true).notNullable();
      t.timestamp("expires_at");
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })

    // SOCIAL: Feedback, bookmarking, and reputation
    .createTable("prompt_favorites", (t) => {
      t.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
      t.integer("prompt_id")
        .references("id")
        .inTable("prompts")
        .onDelete("CASCADE");
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.primary(["user_id", "prompt_id"]);
    })
    .createTable("prompt_votes", (t) => {
      t.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
      t.integer("prompt_id")
        .references("id")
        .inTable("prompts")
        .onDelete("CASCADE");
      t.integer("value").notNullable(); // +1 (upvote) or -1 (downvote)
      t.timestamp("updated_at").defaultTo(knex.fn.now());
      t.primary(["user_id", "prompt_id"]);
    })

    // ANALYTICS & AUDIT: Search logs and fulfillment tracking.
    .createTable("downloads", (t) => {
      t.increments("id").primary();
      t.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
      t.integer("prompt_id")
        .references("id")
        .inTable("prompts")
        .onDelete("CASCADE");
      t.string("format").notNullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })
    .createTable("search_logs", (t) => {
      t.increments("id").primary();
      t.string("query").notNullable();
      t.integer("results_count").defaultTo(0).notNullable();
      t.integer("user_id").references("id").inTable("users").onDelete("SET NULL");
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })

    // SECURITY & SUBSCRIPTION
    .createTable("password_resets", (t) => {
      t.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
      t.string("token").notNullable();
      t.timestamp("expires_at").notNullable();
      t.primary(["user_id", "token"]);
    })
    .createTable("newsletter_subscribers", (t) => {
      t.increments("id").primary();
      t.string("email").unique().notNullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })

    // ASSETS: Image gallery association.
    .createTable("prompt_images", (t) => {
      t.increments("id").primary();
      t.integer("prompt_id")
        .references("id")
        .inTable("prompts")
        .onDelete("CASCADE");
      t.string("filename").notNullable();
      t.string("path").notNullable();
      t.string("original_name").notNullable();
      t.integer("size_bytes").notNullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
    })

    // ACL: Entitlement management.
    .createTable("entitlements", (t) => {
      t.increments("id").primary();
      t.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
      t.string("key").notNullable(); // e.g. 'ALL_LIBRARY'
      t.boolean("active").defaultTo(true).notNullable();
      t.timestamp("created_at").defaultTo(knex.fn.now());
      t.unique(["user_id", "key"]);
    });

  /**
   * SQLite FTS5 Search Initialization
   * Creates a virtual table for optimized full-text search
   */
  await knex.raw(`
    CREATE VIRTUAL TABLE prompts_fts USING fts5(
      title,
      summary,
      content,
      tokenize='porter unicode61'
    );
  `);

  /**
   * Seed Primary Engine Data
   */
  await knex("engines").insert([
    { name: "GPT-4o", slug: "gpt-4o", color_hex: "#10a37f" },
    { name: "Claude 3.5", slug: "claude-3-5", color_hex: "#d97757" },
    { name: "Midjourney", slug: "midjourney", color_hex: "#5865f2" },
    { name: "General", slug: "general", color_hex: "#6b7280" }
  ]);
};

/**
 * Reverts the schema
 */
exports.down = async (knex) => {
  // Drop Virtual Table first
  await knex.raw(`DROP TABLE IF EXISTS prompts_fts`);

  await knex.schema
    .dropTableIfExists("entitlements")
    .dropTableIfExists("prompt_images")
    .dropTableIfExists("newsletter_subscribers")
    .dropTableIfExists("password_resets")
    .dropTableIfExists("search_logs")
    .dropTableIfExists("downloads")
    .dropTableIfExists("prompt_votes")
    .dropTableIfExists("prompt_favorites")
    .dropTableIfExists("coupons")
    .dropTableIfExists("purchases")
    .dropTableIfExists("prompt_tags")
    .dropTableIfExists("tags")
    .dropTableIfExists("collection_follows")
    .dropTableIfExists("collection_items")
    .dropTableIfExists("collections")
    .dropTableIfExists("user_prompts")
    .dropTableIfExists("prompts")
    .dropTableIfExists("categories")
    .dropTableIfExists("users")
    .dropTableIfExists("engines");
};
