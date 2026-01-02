/**
 * Authenticated user overview and activity history.
 */

class DashboardController {
  constructor(db, purchaseRepo) {
    this.db = db;
    this.purchases = purchaseRepo;
  }

  /**
   * Renders the account dashboard summary view.
   */
  index = async (req, res) => {
    const userId = res.locals.currentUser.id;

    const [purchases, downloads] = await Promise.all([
      this.purchases.listByUser(userId),
      this.db("downloads")
        .join("prompts", "prompts.id", "downloads.prompt_id")
        .where("downloads.user_id", userId)
        .select("downloads.*", "prompts.title", "prompts.slug")
        .limit(10)
        .orderBy("created_at", "desc"),
    ]);

    res.render("pages/dashboard", {
      title: "Account Overview",
      purchases,
      downloads,
    });
  };
}

module.exports = DashboardController;
