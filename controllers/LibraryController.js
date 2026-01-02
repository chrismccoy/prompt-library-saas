/**
 * Public Library including search, filtering, voting, favoriting, and secured prompt delivery.
 */

const { AppError } = require("../utils/AppError");
const cache = require("../utils/cache");
const exporter = require("../services/ExporterService");
const varParser = require("../utils/VariableParser");

class LibraryController {
  constructor(
    promptRepo,
    categoryRepo,
    interactionRepo,
    userPromptRepo,
    engineRepo,
  ) {
    this.prompts = promptRepo;
    this.categories = categoryRepo;
    this.interactions = interactionRepo;
    this.userPrompts = userPromptRepo;
    this.engines = engineRepo;
  }

  /**
   * AJAX endpoint for live global search API (Cmd+K).
   */
  apiSearch = async (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const result = await this.prompts.list({
      limit: 8,
      search: q,
      status: "PUBLISHED",
    });

    const mappedResults = result.data.map((p) => {
      return {
        title: p.title,
        slug: p.slug,
        category: p.category_name,
      };
    });

    res.json(mappedResults);
  };

  /**
   * Renders the prompt index with support for multiple filters
   */
  index = async (req, res) => {
    const isFreePath = req.path.includes("/free");

    const {
      page = 1,
      q,
      category: qCat,
      tag: qTag,
      type,
      model: qModel,
    } = req.query;

    const { category: pCat, tag: pTag, model: pModel } = req.params;

    const query = {
      q: q || "",
      category: pCat || qCat || "",
      tag: pTag || qTag || "",
      model: pModel || qModel || "",
      type: isFreePath || type === "free" ? "free" : "",
    };

    const isSearch = !!query.q;
    const cacheKey = `lib_${query.category}_${query.tag}_${query.model}_${query.type}_${page}`;

    let result, categories, trending, engines;

    if (!isSearch && cache.get(cacheKey)) {
      const cached = cache.get(cacheKey);
      result = cached.result;
      categories = cached.categories;
      trending = cached.trending;
      engines = cached.engines;
    } else {
      const results = await Promise.all([
        this.prompts.list({
          limit: 20,
          offset: (page - 1) * 20,
          search: query.q,
          category: query.category,
          tag: query.tag,
          targetModel: query.model,
          isFree: query.type === "free" ? true : undefined,
        }),
        this.categories.listAll(),
        this.interactions.getTrendingSearches(6),
        this.engines.listAll(),
      ]);

      result = results[0];
      categories = results[1];
      trending = results[2];
      engines = results[3];

      if (!isSearch) {
        cache.set(cacheKey, {
          result,
          categories,
          trending,
          engines,
        });
      }
    }

    if (query.q) {
      this.interactions
        .logSearch(query.q, result.total, res.locals.currentUser?.id)
        .catch(() => {});
    }

    res.render("pages/library", {
      title: "Prompt Library",
      prompts: result.data,
      total: result.total,
      categories,
      trending,
      engines,
      query,
      page: Number(page),
      currentPath: req.path,
    });
  };

  /**
   * Renders the single prompt detail page.
   */
  show = async (req, res) => {
    const { slug } = req.params;
    const prompt = await this.prompts.getBySlug(slug);

    if (!prompt) {
      throw new AppError("Prompt not found.", 404);
    }

    this.interactions.incrementView(prompt.id).catch(() => {});
    const currentUserId = res.locals.currentUser?.id;

    const [stats, related] = await Promise.all([
      this.interactions.getPromptStats(prompt.id, currentUserId),
      this.prompts.getRelated(prompt.id, prompt.category_id, 3),
    ]);

    const canView = res.locals.hasAccess || prompt.is_free;
    const variableSpecs = varParser.parse(prompt.content);

    const safePrompt = {
      ...prompt,
      content: canView ? prompt.content : null,
      preview: prompt.content.slice(0, 400) + "...",
      isUnlocked: canView,
      views_count: prompt.views_count + 1,
      variableSpecs,
    };

    res.render("pages/prompt", {
      title: prompt.title,
      prompt: safePrompt,
      stats,
      related,
    });
  };

  /**
   * Handles cloning a public prompt to user's private library.
   */
  remix = async (req, res) => {
    const { slug } = req.params;
    const userId = res.locals.currentUser.id;

    const prompt = await this.prompts.getBySlug(slug);

    if (!prompt) {
      throw new AppError("Original not found", 404);
    }

    const privateId = await this.user_prompts.remix(userId, prompt);

    req.session.flash = {
      type: "success",
      message: "Prompt remixed to your library!",
    };

    res.redirect(`/dashboard/my-prompts/${privateId}/edit`);
  };

  /**
   * Renders user favorites library.
   */
  favorites = async (req, res) => {
    const favorites = await this.interactions.getFavoritesByUser(
      res.locals.currentUser.id,
    );

    res.render("pages/favorites", {
      title: "My Favorites",
      prompts: favorites,
    });
  };

  /**
   * Toggles prompt favorite status.
   */
  toggleFavorite = async (req, res) => {
    const isFavorited = await this.interactions.toggleFavorite(
      res.locals.currentUser.id,
      req.params.id,
    );

    res.json({
      isFavorited,
    });
  };

  /**
   * Records a user vote for a prompt.
   */
  vote = async (req, res) => {
    if (!res.locals.hasAccess) {
      throw new AppError("Upgrade required.", 403);
    }

    const newStatus = await this.interactions.vote(
      res.locals.currentUser.id,
      req.params.id,
      req.body.value,
    );

    const stats = await this.interactions.getPromptStats(
      req.params.id,
      res.locals.currentUser.id,
    );

    res.json({
      newStatus,
      stats,
    });
  };

  /**
   * Handles prompt download export.
   */
  download = async (req, res) => {
    const { slug } = req.params;
    const { variables } = req.body;

    const prompt = await this.prompts.getBySlug(slug);

    if (!prompt) {
      throw new AppError("Not found", 404);
    }

    if (!res.locals.hasAccess && !prompt.is_free) {
      throw new AppError("Denied", 403);
    }

    const buffer = exporter.generateTextBuffer(prompt, variables);

    if (res.locals.currentUser) {
      await this.interactions.recordDownload(
        res.locals.currentUser.id,
        prompt.id,
        "txt",
      );
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${prompt.slug}.txt"`,
    );

    res.type("text/plain").send(buffer);
  };
}

module.exports = LibraryController;
