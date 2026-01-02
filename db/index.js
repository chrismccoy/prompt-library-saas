/**
 * Database Initialization
 */

const knex = require("knex");
const config = require("../knexfile");

/**
 * Determines the current environment.
 */
const env = process.env.NODE_ENV || "development";

/**
 * The initialized Knex instance.
 */
const db = knex(config[env]);

module.exports = db;
