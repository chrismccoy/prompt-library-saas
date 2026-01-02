/**
 * Public Profiles and Ranking
 */

const { AppError } = require("../utils/AppError");

class ProfileController {
  constructor(userRepo, interactionRepo, promptRepo) {
    this.users = userRepo;
    this.interactions = interactionRepo;
    this.prompts = promptRepo;
  }

  /**
   * Renders the ranking leaderboard.
   */
  leaderboard = async (req, res) => {
    const topUsers = await this.users.getLeaderboard(20);

    res.render("pages/leaderboard", {
      title: "Community Leaderboard",
      topUsers,
    });
  };

  /**
   * Displays a user's public portfolio.
   */
  show = async (req, res) => {
    const { username } = req.params;
    const user = await this.users.findByUsername(username);

    if (!user || !user.profile_public) {
      throw new AppError("This profile is private or does not exist.", 404);
    }

    const favorites = await this.interactions.getFavoritesByUser(user.id);

    res.render("pages/profile", {
      title: `u/${user.username}`,
      profileUser: user,
      favorites,
    });
  };

  /**
   * Handles profile setting updates.
   */
  update = async (req, res) => {
    const userId = res.locals.currentUser.id;
    const { username, bio, website, profile_public } = req.body;

    // Check availability of new username
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
    const existing = await this.users.findByUsername(cleanUsername);

    if (existing && existing.id !== userId) {
      req.session.flash = {
        type: "error",
        message: "That username is already taken.",
      };
      return res.redirect("/dashboard/settings");
    }

    await this.users.updateProfile(userId, {
      username: cleanUsername,
      bio,
      website,
      profile_public: profile_public === "true",
    });

    req.session.flash = { type: "success", message: "Profile updated." };
    res.redirect("/dashboard/settings");
  };
}

module.exports = ProfileController;
