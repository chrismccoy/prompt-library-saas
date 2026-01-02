/**
 * CRUD for prompts, engines, categories, users, and coupons, as well as system-wide analytics.
 */

const fs = require("fs");
const { slugify } = require("../utils/helpers");
const cache = require("../utils/cache");

class AdminController {
  constructor(promptRepo, categoryRepo, userRepo, salesRepo, engineRepo) {
    this.prompts = promptRepo;
    this.categories = categoryRepo;
    this.users = userRepo;
    this.sales = salesRepo;
    this.engines = engineRepo;
  }

  /**
   * Renders the admin overview dashboard.
   */
  index = (req, res) => {
    res.render("pages/admin/index", {
      title: "Admin Overview",
    });
  };

  /**
   * Lists all AI Engines configured in the system.
   */
  listEngines = async (req, res) => {
    const engines = await this.engines.listAll();
    res.render("pages/admin/engines", {
      title: "AI Engines",
      engines,
    });
  };

  /**
   * Creates a new AI Engine configuration.
   */
  createEngine = async (req, res) => {
    const { name, color_hex } = req.body;

    try {
      await this.engines.create(name, slugify(name), color_hex);
      cache.clear();

      req.session.flash = {
        type: "success",
        message: "Engine added.",
      };
    } catch (e) {
      req.session.flash = {
        type: "error",
        message: "Engine already exists.",
      };
    }

    res.redirect("/admin/engines");
  };

  /**
   * Deletes an AI Engine configuration.
   */
  deleteEngine = async (req, res) => {
    await this.engines.delete(req.params.id);
    cache.clear();

    res.redirect("/admin/engines");
  };

  /**
   * Lists prompts with pagination and status filters.
   */
  listPrompts = async (req, res) => {
    const { page = 1, status } = req.query;

    const result = await this.prompts.list({
      limit: 30,
      offset: (page - 1) * 30,
      status: status || undefined,
    });

    res.render("pages/admin/prompts", {
      title: "Admin Prompts",
      prompts: result.data,
      total: result.total,
      page: Number(page),
      status,
    });
  };

  /**
   * Renders the creation form for a new prompt.
   */
  formNew = async (req, res) => {
    const [categories, engines] = await Promise.all([
      this.categories.listAll(),
      this.engines.listAll(),
    ]);

    res.render("pages/admin/prompt-form", {
      title: "New Prompt",
      categories,
      engines,
      prompt: null,
      action: "/admin/prompts/new",
    });
  };

  /**
   * Handles the creation of a new prompt.
   */
  create = async (req, res) => {
    try {
      const promptId = await this.prompts.save(req.body);

      // Handle standard file uploads (Multiple images allowed on Create)
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await this.prompts.addImage(promptId, file);
        }
      }

      cache.clear();

      req.session.flash = {
        type: "success",
        message: "Created successfully",
      };

      res.redirect(`/admin/prompts/${promptId}/edit`);
    } catch (e) {
      req.session.flash = {
        type: "error",
        message: e.message,
      };

      res.redirect("/admin/prompts/new");
    }
  };

  /**
   * Renders the editing form for an existing prompt.
   */
  formEdit = async (req, res) => {
    const prompt = await this.prompts.getById(req.params.id);

    if (!prompt) {
      return res.redirect("/admin/prompts");
    }

    const [categories, engines] = await Promise.all([
      this.categories.listAll(),
      this.engines.listAll(),
    ]);

    res.render("pages/admin/prompt-form", {
      title: "Edit Prompt",
      categories,
      engines,
      prompt,
      action: `/admin/prompts/${prompt.id}/edit`,
    });
  };

  /**
   * Handles the update of an existing catalog prompt.
   */
  update = async (req, res) => {
    try {
      await this.prompts.save({
        ...req.body,
        id: req.params.id,
      });

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await this.prompts.addImage(req.params.id, file);
        }
      }

      cache.clear();

      req.session.flash = {
        type: "success",
        message: "Catalog updated",
      };

      res.redirect(`/admin/prompts/${req.params.id}/edit`);
    } catch (e) {
      req.session.flash = {
        type: "error",
        message: e.message,
      };

      res.redirect(`/admin/prompts/${req.params.id}/edit`);
    }
  };

  /**
   * Deletes a prompt from the catalog.
   */
  delete = async (req, res) => {
    await this.prompts.delete(req.params.id);
    cache.clear();

    req.session.flash = {
      type: "success",
      message: "Removed from catalog",
    };

    res.redirect("/admin/prompts");
  };

  /**
   * AJAX Asset Upload (Single).
   */
  uploadImage = async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: "No file provided",
      });
    }

    try {
      await this.prompts.addImage(req.params.id, req.file);

      res.json({
        success: true,
      });
    } catch (e) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        error: e.message,
      });
    }
  };

  /**
   * Deletes an associated image.
   */
  deleteImage = async (req, res) => {
    await this.prompts.deleteImage(req.params.imageId);

    req.session.flash = {
      type: "success",
      message: "Image removed",
    };

    res.redirect(`/admin/prompts/${req.params.id}/edit`);
  };

  /**
   * Lists all categories.
   */
  listCategories = async (req, res) => {
    const categories = await this.categories.listAll();

    res.render("pages/admin/categories", {
      title: "Categories",
      categories,
    });
  };

  /**
   * Handles creation of a new category.
   */
  createCategory = async (req, res) => {
    const slug = slugify(req.body.name);

    await this.categories.db("categories").insert({
      name: req.body.name,
      slug,
    });

    cache.clear();

    res.redirect("/admin/categories");
  };

  /**
   * Handles deletion of a category.
   */
  deleteCategory = async (req, res) => {
    await this.categories.db("categories").where("id", req.params.id).del();

    cache.clear();

    res.redirect("/admin/categories");
  };

  /**
   * Lists all registered users with pagination.
   */
  listUsers = async (req, res) => {
    const { page = 1 } = req.query;

    const users = await this.users.list({
      limit: 50,
      offset: (page - 1) * 50,
    });

    res.render("pages/admin/users", {
      title: "Users",
      users,
    });
  };

  /**
   * Manually grants full library access to a user.
   */
  grantAccess = async (req, res) => {
    await this.users.grantEntitlement(req.params.id, "ALL_LIBRARY");

    res.redirect("/admin/users");
  };

  /**
   * Manually revokes full library access from a user.
   */
  revokeAccess = async (req, res) => {
    await this.users.revokeEntitlement(req.params.id, "ALL_LIBRARY");

    res.redirect("/admin/users");
  };

  /**
   * Lists all promo coupons.
   */
  listCoupons = async (req, res) => {
    const coupons = await this.sales.listCoupons();

    res.render("pages/admin/coupons", {
      title: "Coupons",
      coupons,
    });
  };

  /**
   * Handles creation of a new coupon.
   */
  createCoupon = async (req, res) => {
    await this.sales.createCoupon(req.body);

    res.redirect("/admin/coupons");
  };

  /**
   * Handles deletion of a coupon.
   */
  deleteCoupon = async (req, res) => {
    await this.sales.deleteCoupon(req.params.id);

    res.redirect("/admin/coupons");
  };

  /**
   * Aggregates and displays platform revenue and usage metrics.
   */
  analytics = async (req, res) => {
    const revenue = await this.users
      .db("purchases")
      .sum("amount_cents as total")
      .where("status", "COMPLETED")
      .first();

    const sales = await this.users
      .db("purchases")
      .count("* as count")
      .where("status", "COMPLETED")
      .first();

    const userCount = await this.users.count();

    const topMisses = await this.users
      .db("search_logs")
      .where("results_count", 0)
      .select("query")
      .count("query as count")
      .groupBy("query")
      .orderBy("count", "desc")
      .limit(10);

    res.render("pages/admin/analytics", {
      title: "Analytics",
      analytics: {
        total_revenue_cents: revenue.total || 0,
        sales_count: sales.count,
        user_count: userCount,
        top_misses: topMisses,
      },
    });
  };
}

module.exports = AdminController;
