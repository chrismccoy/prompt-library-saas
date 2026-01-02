/**
 * Configures cookie parsing and signed session storage.
 */

const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");

/**
 * Returns an array of middleware required to establish user sessions.
 */
module.exports = (config) => {
  return [
    cookieParser(config.SESSION_SECRET),
    cookieSession({
      name: "session",
      keys: [config.SESSION_SECRET],
      maxAge: 30 * 24 * 60 * 60 * 1000, // Duration: 30 Days
      httpOnly: true, // Prevents XSS-based cookie theft
      secure: config.isProd, // Enforces HTTPS in production
      sameSite: "lax", // Balance between security and UX
    }),
  ];
};
