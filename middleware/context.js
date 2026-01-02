/**
 * Hydrates the request/response context with user data, entitlements, and flash messages.
 */

/**
 * Middleware factory that generates the context hydration function.
 */
module.exports = (repos, config) => {
  /**
   * Hydrates res.locals with currentUser and entitlement status.
   */
  return async (req, res, next) => {
    res.locals.path = req.path;
    res.locals.product = config.product;
    res.locals.uploadConfig = config.upload;
    res.locals.config = config;

    res.locals.currentUser = null;
    res.locals.hasAccess = false;

    res.locals.flash = req.session.flash;
    delete req.session.flash;

    if (req.session.userId) {
      try {
        const user = await repos.users.findById(req.session.userId);
        if (user) {
          res.locals.currentUser = user;

          // Check for administrative role or specific lifetime entitlement
          const hasEntitlement = await repos.users.hasEntitlement(
            user.id,
            "ALL_LIBRARY",
          );
          res.locals.hasAccess = user.role === "ADMIN" || hasEntitlement;
        }
      } catch (err) {
        req.log.error(err, "CONTEXT_HYDRATION_FAILURE: Database error");
      }
    }
    next();
  };
};
