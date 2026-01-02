/**
 * Middleware for schema-based request validation using Zod.
 */

const { AppError } = require("../utils/AppError");

/**
 * Creates a validation middleware for a specific Zod schema.
 */
module.exports = (schema, target = "body") => {
  return async (req, res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      // Map Zod errors to a readable string
      const message = result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");

      // Handle HTML redirect for standard forms
      if (req.accepts("html") && req.method === "POST") {
        req.session.flash = {
          type: "error",
          message: "Data validation failed: " + message,
        };
        return res.redirect("back");
      }

      // Throw operational error for API consumers
      throw new AppError(message, 400);
    }

    // Replace original target with the validated/sanitized data from Zod
    req[target] = result.data;
    next();
  };
};
