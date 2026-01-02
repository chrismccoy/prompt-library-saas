/**
 * Ensures template locals are always defined to prevent EJS ReferenceErrors.
 */

/**
 * Sets initial default values for template variables.
 */
module.exports = (config) => {
  return (req, res, next) => {
    res.locals.csrfToken = "";
    res.locals.currentUser = null;
    res.locals.hasAccess = false;
    res.locals.path = req.path;
    res.locals.config = config;
    res.locals.product = config.product;
    res.locals.uploadConfig = config.upload;
    res.locals.flash = null;
    next();
  };
};
