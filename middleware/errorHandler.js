/**
 * Centralized error handler for HTML and JSON error responses.
 */

const logger = require("../utils/logger");

/**
 * Final error handling middleware in the pipeline.
 */
module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.isOperational
    ? err.message
    : "An unexpected error occurred. Please try again later.";

  let title = "Server Error";
  if (statusCode === 404) title = "Page Not Found";
  if (statusCode === 403) title = "Access Denied";
  if (statusCode === 401) title = "Unauthorized";

  /**
   * Handle CSRF Validation Failures
   */
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).render("pages/error", {
      status: 403,
      title: "Security Session Expired",
      message:
        "Your form session has timed out for security reasons. Please refresh the page and try again.",
      csrfToken: "",
      currentUser: res.locals.currentUser || null,
      hasAccess: res.locals.hasAccess || false,
    });
  }

  /**
   * Log critical server errors
   */
  if (statusCode === 500) {
    logger.error({ err, path: req.path }, "UNHANDLED_EXCEPTION");
  }

  /**
   * Content-Negotiation: Render HTML or return JSON
   */
  if (req.accepts("html")) {
    res.status(statusCode).render("pages/error", {
      status: statusCode,
      title,
      message,
      csrfToken: res.locals.csrfToken || "",
      currentUser: res.locals.currentUser || null,
      hasAccess: res.locals.hasAccess || false,
    });
  } else {
    res.status(statusCode).json({
      error: message,
      code: err.code || "INTERNAL_ERROR",
    });
  }
};
