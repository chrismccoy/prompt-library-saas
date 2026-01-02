/**
 * Subscriber and Leads
 */

const { z } = require("zod");

class NewsletterController {
  constructor(newsletterRepo) {
    this.repo = newsletterRepo;
  }

  /**
   * Handles landing page subscriber signups.
   */
  subscribe = async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      req.session.flash = {
        type: "error",
        message: "Please provide a valid email address.",
      };
      return res.redirect("back");
    }

    await this.repo.subscribe(result.data.email);

    req.session.flash = {
      type: "success",
      message: "Thanks for joining! Keep an eye on your inbox.",
    };

    res.redirect("back");
  };
}

module.exports = NewsletterController;
