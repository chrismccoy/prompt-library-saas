/**
 * Manages email dispatch and transactional templates.
 */

const nodemailer = require("nodemailer");
const config = require("../config");
const logger = require("../utils/logger");

class MailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      auth: {
        user: config.SMTP_USER,
        password: config.SMTP_PASS,
      },
    });
  }

  /**
   * SMTP delivery.
   */
  async send({ to, subject, text, html }) {
    try {
      await this.transporter.sendMail({
        from: `"${config.product.name}" <${config.FROM_EMAIL}>`,
        to,
        subject,
        text,
        html,
      });

      logger.info({ to, subject }, "MAIL_DISPATCH_SUCCESS");
    } catch (err) {
      logger.error(err, "MAIL_DISPATCH_FAILURE");
    }
  }

  /**
   * Welcome to new subscribers.
   */
  async sendWelcome(email) {
    await this.send({
      to: email,
      subject: `Welcome to ${config.product.name}`,
      text: `We are glad to have you! Start browsing professional prompts here: ${config.APP_URL}/library`,
      html: `<h1>Welcome!</h1><p>Start browsing: <a href="${config.APP_URL}/library">Prompt Library</a></p>`,
    });
  }

  /**
   * Send the digital receipt upon successful purchase
   */
  async sendReceipt(email, amount) {
    await this.send({
      to: email,
      subject: "Your Purchase Receipt",
      text: `Thank you for your support! Your lifetime license is now active. Total: ${amount}`,
      html: `<h2>Success!</h2><p>Your payment was verified. Access to the full library is now active on your account.</p>`,
    });
  }

  /**
   * Sends a time-sensitive secure link for password recovery.
   */
  async sendPasswordReset(email, token) {
    const url = `${config.APP_URL}/reset-password?token=${token}&email=${email}`;

    await this.send({
      to: email,
      subject: "Account Password Recovery",
      html: `<p>A password reset was requested. Click below to proceed. (Valid for 1 hour).</p><a href="${url}">${url}</a>`,
    });
  }
}

module.exports = new MailService();
