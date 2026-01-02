/**
 * User management, registration, and verification
 */

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { AppError } = require("../utils/AppError");
const mailService = require("./MailService");

class AuthService {
  constructor(userRepo, db) {
    this.userRepo = userRepo;
    this.db = db;
  }

  /**
   * Handles the registration of new users and triggers onboarding communications.
   */
  async register(data) {
    const existing = await this.userRepo.findByEmail(data.email);

    if (existing) {
      throw new AppError("An account with this email already exists.", 400);
    }

    const user = await this.userRepo.create(data);

    mailService.sendWelcome(data.email).catch((err) => {
      console.error("FAILED_TO_SEND_WELCOME_EMAIL:", err);
    });

    return user;
  }

  /**
   * Validates user credentials for session establishment.
   */
  async login(email, password) {
    const user = await this.userRepo.findByEmail(email);

    const isValid = user && (await bcrypt.compare(password, user.password_hash));

    if (!isValid) {
      throw new AppError("Invalid email or password.", 401);
    }

    return user;
  }

  /**
   * Generates a recovery token and reset instructions.
   */
  async requestPasswordReset(email) {
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour window

    await this.userRepo.createResetToken(user.id, token, expiresAt);
    await mailService.sendPasswordReset(user.email, token);
  }

  /**
   * Verifies reset and updates the user's password.
   */
  async completePasswordReset(email, token, newPassword) {
    const resetEntry = await this.userRepo.findResetToken(email, token);

    if (!resetEntry) {
      throw new AppError("Invalid or expired reset token.", 400);
    }

    await this.userRepo.updatePassword(resetEntry.user_id, newPassword);
    await this.userRepo.deleteResetToken(resetEntry.user_id);
  }
}

module.exports = AuthService;
