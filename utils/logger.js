/**
 * Standardized logging interface using Pino.
 */

const pino = require("pino");
const config = require("../config");

/**
 * Configures the Pino logger instance.
 */
const logger = pino({
  level: config.isProd ? "info" : "debug",
  transport: config.isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      },
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "password",
    "req.body.password",
  ],
});

module.exports = logger;
