/**
 * Private user library management and IDE content.
 */

const { AppError } = require("../utils/AppError");

class UserPromptController {
  constructor(userPromptRepo) {
    this.repo = userPromptRepo;
  }

  /**
   * List all private prompts in user workspace.
   */
  index = async (req, res) => {
    const userId = res.locals.currentUser.id;
    const prompts = await this.repo.list(userId);

    res.render("pages/dashboard/private-library", {
      title: "My Private Prompts",
      prompts,
    });
  };

  /**
   * Renders the private creation form.
   */
  formNew = (req, res) => {
    res.render("pages/dashboard/private-form", {
      title: "New Private Prompt",
      prompt: null,
      action: "/dashboard/my-prompts/new",
    });
  };

  /**
   * Handles creation of a private prompt.
   */
  create = async (req, res) => {
    const userId = res.locals.currentUser.id;

    await this.repo.create(userId, req.body);

    req.session.flash = {
      type: "success",
      message: "Private prompt saved.",
    };

    res.redirect("/dashboard/my-prompts");
  };

  /**
   * Renders the private editing form.
   */
  formEdit = async (req, res) => {
    const userId = res.locals.currentUser.id;
    const prompt = await this.repo.getById(req.params.id, userId);

    if (!prompt) {
      throw new AppError("Not found", 404);
    }

    res.render("pages/dashboard/private-form", {
      title: "Edit Private Prompt",
      prompt,
      action: `/dashboard/my-prompts/${prompt.id}/edit`,
    });
  };

  /**
   * Handles update of a private prompt.
   */
  update = async (req, res) => {
    const userId = res.locals.currentUser.id;

    await this.repo.update(req.params.id, userId, req.body);

    req.session.flash = {
      type: "success",
      message: "Updated.",
    };

    res.redirect("/dashboard/my-prompts");
  };

  /**
   * Handles deletion of a private prompt.
   */
  delete = async (req, res) => {
    const userId = res.locals.currentUser.id;

    await this.repo.delete(req.params.id, userId);

    req.session.flash = {
      type: "success",
      message: "Deleted.",
    };

    res.redirect("/dashboard/my-prompts");
  };
}

module.exports = UserPromptController;
