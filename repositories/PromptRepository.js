/**
 * Data access layer for the Global Prompt Catalog.
 */

const { slugify } = require("../utils/helpers");

class PromptRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Performs advanced queries with FTS5 ranking and relationships
   */
  async list({
    limit = 20,
    offset = 0,
    status,
    category,
    tag,
    search,
    isFree,
    targetModel,
  }) {
    let q = this.db("prompts as p")
      .leftJoin("categories as c", "c.id", "p.category_id")
      .leftJoin("engines as e", "e.id", "p.engine_id")
      .select(
        "p.*",
        "c.name as category_name",
        "c.slug as category_slug",
        "e.name as engine_name",
        "e.slug as engine_slug",
        "e.color_hex as engine_color"
      );

    if (search) {
      q = q
        .join("prompts_fts as fts", "fts.rowid", "p.id")
        .whereRaw("prompts_fts MATCH ?", [search])
        .orderByRaw("bm25(prompts_fts)");
    } else {
      q = q.orderBy("p.created_at", "desc");
    }

    if (status) {
      q = q.where("p.status", status);
    }

    if (category) {
      q = q.where("c.slug", category);
    }

    if (isFree === true) {
      q = q.where("p.is_free", true);
    }

    if (targetModel) {
      q = q.where("e.slug", targetModel);
    }

    if (tag) {
      q = q.whereExists(function () {
        this.select("*")
          .from("prompt_tags as pt")
          .join("tags as t", "t.id", "pt.tag_id")
          .whereRaw("pt.prompt_id = p.id")
          .where("t.slug", tag);
      });
    }

    const rows = await q.limit(limit).offset(offset);
    const [countResult] = await this.db("prompts").count("* as total");

    const promptIds = rows.map((r) => {
      return r.id;
    });

    const tags = await this.db("prompt_tags as pt")
      .join("tags as t", "t.id", "pt.tag_id")
      .whereIn("pt.prompt_id", promptIds)
      .select("pt.prompt_id", "t.name", "t.slug");

    return {
      data: rows.map((r) => {
        return {
          ...r,
          tags: tags.filter((t) => {
            return t.prompt_id === r.id;
          }) || [],
        };
      }),
      total: countResult.total,
    };
  }

  /**
   * Retrieves a prompt entity via its unique URL slug.
   */
  async getBySlug(slug) {
    const prompt = await this.db("prompts as p")
      .leftJoin("categories as c", "c.id", "p.category_id")
      .leftJoin("engines as e", "e.id", "p.engine_id")
      .select(
        "p.*",
        "c.name as category_name",
        "c.slug as category_slug",
        "e.name as engine_name",
        "e.slug as engine_slug",
        "e.color_hex as engine_color"
      )
      .where("p.slug", slug)
      .first();

    if (!prompt) {
      return null;
    }

    const [tagRows, imageRows] = await Promise.all([
      this.db("prompt_tags as pt")
        .join("tags as t", "t.id", "pt.tag_id")
        .where("pt.prompt_id", prompt.id)
        .select("t.name", "t.slug"),
      this.db("prompt_images")
        .where("prompt_id", prompt.id)
        .select("*"),
    ]);

    return {
      ...prompt,
      tags: tagRows || [],
      images: imageRows || [],
    };
  }

  /**
   * Saves a prompt entity.
   */
  async save(data) {
    const slug = data.slug || slugify(data.title);

    const payload = {
      title: data.title,
      slug: slug,
      summary: data.summary,
      content: data.content,
      status: data.status,
      is_free: Boolean(data.is_free),
      category_id: data.category_id ? Number(data.category_id) : null,
      engine_id: data.engine_id ? Number(data.engine_id) : null,
      target_model: data.target_model || "General",
      updated_at: new Date(),
    };

    let id;
    if (data.id) {
      await this.db("prompts")
        .where({ id: data.id })
        .update(payload);
      id = data.id;
    } else {
      const [newId] = await this.db("prompts")
        .insert({
          ...payload,
          created_at: new Date(),
        })
        .returning("id");
      id = typeof newId === "object" ? newId.id : newId;
    }

    /**
     * Search Index Maintenance:
     * Refreshes the FTS5 virtual table entries for the updated prompt.
     */
    await this.db("prompts_fts")
      .where({ rowid: id })
      .del();

    await this.db("prompts_fts").insert({
      rowid: id,
      title: payload.title,
      summary: payload.summary,
      content: payload.content,
    });

    /**
     * Taxonomy Synchronization:
     * Manages many-to-many relationships for subject vectors (tags).
     */
    if (typeof data.tags === "string") {
      await this.db("prompt_tags")
        .where({ prompt_id: id })
        .del();

      const tagNames = data.tags
        .split(",")
        .map((t) => {
          return t.trim();
        })
        .filter(Boolean);

      for (const name of tagNames) {
        const tSlug = slugify(name);
        let tagRecord = await this.db("tags")
          .where({ slug: tSlug })
          .first();

        if (!tagRecord) {
          const [tId] = await this.db("tags")
            .insert({ name, slug: tSlug })
            .returning("id");
          tagRecord = { id: typeof tId === "object" ? tId.id : tId };
        }

        await this.db("prompt_tags")
          .insert({
            prompt_id: id,
            tag_id: tagRecord.id,
          })
          .onConflict()
          .ignore();
      }
    }

    return id;
  }

  /**
   * Retrieves Contextually Related Prompts based on categorization.
   */
  async getRelated(promptId, categoryId, limit = 3) {
    return this.db("prompts")
      .where({
        category_id: categoryId,
        status: "PUBLISHED",
      })
      .andWhereNot("id", promptId)
      .limit(limit)
      .orderByRaw("RANDOM()");
  }

  /**
   * Get basic entity data and metadata for the admin area.
   */
  async getById(id) {
    const prompt = await this.db("prompts as p")
      .leftJoin("engines as e", "e.id", "p.engine_id")
      .where("p.id", id)
      .select(
        "p.*",
        "e.name as engine_name",
        "e.color_hex as engine_color"
      )
      .first();

    if (!prompt) {
      return null;
    }

    const [tagRows, images] = await Promise.all([
      this.db("prompt_tags as pt")
        .join("tags as t", "t.id", "pt.tag_id")
        .where("pt.prompt_id", prompt.id)
        .select("t.name"),
      this.db("prompt_images")
        .where("prompt_id", prompt.id)
        .select("*"),
    ]);

    return {
      ...prompt,
      tags: tagRows
        .map((t) => {
          return t.name;
        })
        .join(", "),
      images: images || [],
    };
  }

  /**
   * Deletes a prompt and purges its search index records.
   */
  async delete(id) {
    await this.db("prompts_fts")
      .where({ rowid: id })
      .del();

    return this.db("prompts")
      .where({ id: id })
      .del();
  }

  /**
   * Adds an image asset relationship.
   */
  async addImage(promptId, fileData) {
    return this.db("prompt_images").insert({
      prompt_id: promptId,
      filename: fileData.filename,
      path: `/public/uploads/${fileData.filename}`,
      original_name: fileData.originalname,
      size_bytes: fileData.size,
    });
  }

  /**
   * Removes an image asset metadata record.
   */
  async deleteImage(imageId) {
    return this.db("prompt_images")
      .where({ id: imageId })
      .del();
  }
}

module.exports = PromptRepository;
