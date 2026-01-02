/**
 * User registration, authentication, session, and password recovery.
 */

const { z } = require("zod");

class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  // Renders Login
  renderLogin = (req, res) => res.render("pages/login", { title: "Login" });

  // Renders Signup.
  renderRegister = (req, res) =>
    res.render("pages/register", { title: "Register" });

  /**
   * Registering
   */
  register = async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) {
      req.session.flash = {
        type: "error",
        message: "Password must be at least 8 characters.",
      };
      return res.redirect("/register");
    }

    try {
      await this.authService.register(result.data);

      req.session.flash = {
        type: "success",
        message: "Welcome! You can now log in.",
      };

      res.redirect("/login");
    } catch (e) {
      req.session.flash = { type: "error", message: e.message };
      res.redirect("/register");
    }
  };

  /**
   * Login
   */
  login = async (req, res) => {
    try {
      const user = await this.authService.login(
        req.body.email,
        req.body.password
      );

      req.session.userId = user.id;

      req.session.flash = {
        type: "success",
        message: "Welcome back!",
      };

      res.redirect("/library");
    } catch (e) {
      req.session.flash = { type: "error", message: e.message };
      res.redirect("/login");
    }
  };

  // Logout
  logout = (req, res) => {
    req.session = null;
    res.redirect("/");
  };

  // Forgot Password
  renderForgotPassword = (req, res) => {
    res.render("pages/forgot-password", { title: "Forgot Password" });
  };

  // Reset Password
  sendResetLink = async (req, res) => {
    const { email } = req.body;

    await this.authService.requestPasswordReset(email);

    req.session.flash = {
      type: "success",
      message: "A reset link has been sent if that email exists.",
    };

    res.redirect("/forgot-password");
  };

  // Renders reset password.
  renderResetPassword = (req, res) => {
    const { token, email } = req.query;
    res.render("pages/reset-password", {
      title: "Reset Password",
      token,
      email,
    });
  };

  // Completes Reset
  resetPassword = async (req, res) => {
    const { email, token, password } = req.body;

    try {
      await this.authService.completePasswordReset(email, token, password);

      req.session.flash = {
        type: "success",
        message: "Password updated! You can now log in.",
      };

      res.redirect("/login");
    } catch (e) {
      req.session.flash = { type: "error", message: e.message };
      res.redirect(`/reset-password?token=${token}&email=${email}`);
    }
  };
}

module.exports = AuthController;
