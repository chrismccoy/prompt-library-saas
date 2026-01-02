/**
 * Centralized Application Configuration.
 */

const { z } = require("zod");
require("dotenv").config();

/**
 * Validation Schema for Environment Variables.
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  SESSION_SECRET: z
    .string()
    .min(32, "Session secret must be at least 32 characters"),
  APP_URL: z.string().url(),

  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),

  PRODUCT_PRICE: z.string().regex(/^\d+\.\d{2}$/),
  CURRENCY: z.string().length(3).default("USD"),

  PAYPAL_CLIENT_ID: z.string().min(1),
  PAYPAL_CLIENT_SECRET: z.string().min(1),
  PAYPAL_WEBHOOK_ID: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),

  UPLOAD_MAX_SIZE_MB: z.coerce.number().default(5),
  BACKUP_PATH: z.string().default("./storage/backups"),

  ENABLE_ADVANCED_FILTERING: z
    .string()
    .transform((val) => val === "true")
    .default("true"),
});

/**
 * Executes the validation against the current process environment.
 */
const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ CONFIGURATION_ERROR: Environment validation failed:",
    JSON.stringify(parsed.error.format(), null, 2)
  );
  process.exit(1);
}

/**
 * The consolidated Configuration Object.
 */
const config = {
  ...parsed.data,

  /**
   * Environment Flags
   */
  isProd: parsed.data.NODE_ENV === "production",
  isDev: parsed.data.NODE_ENV === "development",

  /**
   * Commerce Configuration
   * Derived from PRODUCT_PRICE for use in different payment gateway formats.
   */
  product: {
    name: "Prompt Library Lifetime",
    priceDecimal: parsed.data.PRODUCT_PRICE,
    priceCents: Math.round(parseFloat(parsed.data.PRODUCT_PRICE) * 100),
    currency: parsed.data.CURRENCY,
  },

  /**
   * Converts Megabytes to Bytes for Multer consumption.
   */
  upload: {
    maxSize: parsed.data.UPLOAD_MAX_SIZE_MB * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png"],
  },
};

module.exports = config;
