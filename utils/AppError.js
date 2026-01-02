/**
 * Custom Error class for application failures.
 */

class AppError extends Error {
  constructor(message, statusCode = 400, code = "APP_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    // Capture the stack trace while excluding the constructor from the trace.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { AppError };
