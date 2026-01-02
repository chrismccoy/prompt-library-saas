/**
 * Non-authenticated routes for SEO, static pages, and health monitoring.
 */

class PublicController {
  constructor(db, promptRepo, categoryRepo) {
    this.db = db;
    this.prompts = promptRepo;
    this.categories = categoryRepo;
  }

  /**
   * Home page.
   */
  renderHome = (req, res) => res.render("pages/home", { title: "Home" });

  /**
   * Pricing page.
   */
  renderPricing = (req, res) =>
    res.render("pages/pricing", { title: "Pricing & Plans" });

  /**
   * System health check for observability tools.
   */
  health = async (req, res) => {
    try {
      await this.db.raw("SELECT 1");

      res.json({
        status: "up",
        timestamp: new Date().toISOString(),
        database: "connected",
        env: process.env.NODE_ENV,
      });
    } catch (err) {
      res.status(503).json({
        status: "down",
        timestamp: new Date().toISOString(),
        error: "Database connection failed",
      });
    }
  };

  /**
   * SEO XML Sitemap generator.
   */
  sitemap = async (req, res) => {
    const [prompts, categories] = await Promise.all([
      this.db("prompts")
        .where("status", "PUBLISHED")
        .select("slug", "updated_at"),
      this.db("categories").select("slug"),
    ]);

    const baseUrl = req.ctx?.config?.APP_URL || "http://localhost:3000";

    let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    xml += `<url><loc>${baseUrl}/</loc></url>`;
    xml += `<url><loc>${baseUrl}/library</loc></url>`;
    xml += `<url><loc>${baseUrl}/pricing</loc></url>`;

    categories.forEach((c) => {
      xml += `<url><loc>${baseUrl}/library/category/${c.slug}</loc></url>`;
    });

    prompts.forEach((p) => {
      const date = new Date(p.updated_at).toISOString().split("T")[0];
      xml += `<url><loc>${baseUrl}/library/${p.slug}</loc><lastmod>${date}</lastmod></url>`;
    });

    xml += `</urlset>`;

    res.header("Content-Type", "application/xml").send(xml);
  };
}

module.exports = PublicController;
