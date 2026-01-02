/**
 * Configuration for Cross-Site Request Forgery (CSRF) protection.
 */

const csurf = require("csurf");

/**
 * Initializes csurf middleware with multi-source token extraction.
 */
module.exports = csurf({
  value: (req) => {
    return (
      req.headers["x-csrf-token"] || req.body._csrf || req.query._csrf
    );
  },
});
