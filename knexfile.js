/**
 * Database configuration file for Knex.js.
 */

require("dotenv").config();
const path = require("path");

/**
 * Core Database Configuration.
 */
const config = {
  client: "better-sqlite3",

  /**
   * Database Connection Settings.
   */
  connection: {
    filename: path.join(__dirname, "storage", "app.sqlite"),
  },

  /**
   * SQLite Requirement: Required for default value handling in
   * SQLite-specific column additions.
   */
  useNullAsDefault: true,

  /**
   * Migration Registry.
   */
  migrations: {
    directory: path.join(__dirname, "db", "migrations"),
  },

  /**
   * Connection Pool & Driver Hooks.
   */
  pool: {
    /**
     * Activates Foreign Key constraints and Write-Ahead Logging (WAL)
     * mode for high-concurrency performance.
     */
    afterCreate: (conn, cb) => {
      conn.pragma("foreign_keys = ON");
      conn.pragma("journal_mode = WAL");
      cb();
    },
  },
};

module.exports = {
  development: config,
  production: config,
};
