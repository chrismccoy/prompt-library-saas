/**
 * Enforce session and role-based access control
 */

/**
 * Ensures a user session exists before allowing access to a route.
 * If unauthenticated, redirects to login with a flash message.
 */
const requireAuth = (req, res, next) => {
  if (!res.locals.currentUser) {
    req.session.flash = {
      type: "info",
      message: "Please log in to access this feature.",
    };
    return res.redirect("/login");
  }
  next();
};

/**
 * Restricts access to users with the 'ADMIN' role.
 * Returns a 403 Forbidden response if the user is not authorized.
 */
const requireAdmin = (req, res, next) => {
  if (!res.locals.currentUser || res.locals.currentUser.role !== "ADMIN") {
    return res.status(403).send("Forbidden: Administrative access required.");
  }
  next();
};

module.exports = { requireAuth, requireAdmin };
