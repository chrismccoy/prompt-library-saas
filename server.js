/**
 * Prompt Library Pro
 */

require("express-async-errors");

const express = require("express");
const path = require("path");
const fs = require("fs");
const helmet = require("helmet");
const pinoHttp = require("pino-http");
const cron = require("node-cron");

const config = require("./config");
const logger = require("./utils/logger");
const db = require("./db");
const runBackup = require("./utils/backup");

/**
 * Middleware Layer Imports
 */
const viewGlobals = require("./middleware/viewGlobals");
const sessionMiddleware = require("./middleware/session");
const contextMiddleware = require("./middleware/context");
const errorHandler = require("./middleware/errorHandler");
const csrfProtection = require("./middleware/csrf");

/**
 * Layer Init
 */
const initRepos = require("./repositories");
const initServices = require("./services");
const initControllers = require("./controllers");
const registerRoutes = require("./routes");

/**
 * Dependency Injection Orchestration
 */
const repos = initRepos(db);
const services = initServices(repos, db, config);
const controllers = initControllers(services, repos, db, config);

const app = express();

/**
 * Configure Template Engine
 */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/**
 * Global Middleware Pipeline
 */
app.use(viewGlobals(config));
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

/**
 * Stripe Webhooks (Raw Body Required)
 */
app.post(
  "/checkout/webhook/stripe",
  express.raw({
    type: "application/json",
  }),
  controllers.checkout.handleStripeWebhook,
);

/**
 * Standard Body Parsing & Logging
 */
app.use(
  express.urlencoded({
    extended: false,
  }),
);

app.use(express.json());

app.use(
  pinoHttp({
    logger,
  }),
);

/**
 * Session Management & Identity Context
 */
app.use(sessionMiddleware(config));
app.use(contextMiddleware(repos, config));

/**
 * Security: CSRF Protection
 */
app.use(csrfProtection);

/**
 * Inject CSRF token into EJS Locals
 */
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

/**
 * Primary Route Registration
 */
registerRoutes(app, controllers);

/**
 * Catch-all: 404 Not Found
 */
app.use((req, res, next) => {
  const error = new Error("The requested resource was not found.");
  error.statusCode = 404;
  next(error);
});

/**
 * Global Error Orchestrator
 */
app.use(errorHandler);

/**
 * Woot
 */
const start = async () => {
  try {
    // Verify filesystem integrity
    const uploadDir = path.join(__dirname, "public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, {
        recursive: true,
      });
    }

    if (!fs.existsSync(config.BACKUP_PATH)) {
      fs.mkdirSync(config.BACKUP_PATH, {
        recursive: true,
      });
    }

    // Database schema synchronization
    if (config.isDev) {
      logger.info("DATABASE: Running migrations...");
      await db.migrate.latest();
    }

    const admin = await repos.users.findByEmail(config.ADMIN_EMAIL);

    if (!admin) {
      logger.info("SECURITY: Seeding root administrator...");
      const id = await repos.users.create({
        email: config.ADMIN_EMAIL,
        password: config.ADMIN_PASSWORD,
        role: "ADMIN",
      });
      await repos.users.grantEntitlement(id, "ALL_LIBRARY");
    } else {
      await db("users")
        .where({
          id: admin.id,
        })
        .update({
          role: "ADMIN",
        });
    }

    // Background task scheduling
    cron.schedule("0 0 * * *", () => {
      logger.info("MAINTENANCE: Executing scheduled backup...");
      runBackup();
    });

    if (config.isProd) {
      runBackup();
    }

    app.listen(config.PORT, () => {
      logger.info(`🚀 SaaS Active at: ${config.APP_URL}`);
      logger.info(`🔐 Admin Panel at: ${config.APP_URL}/admin`);
    });
  } catch (err) {
    logger.fatal(err, "BOOT_ERROR: Critical failure during startup");
    process.exit(1);
  }
};

start();
