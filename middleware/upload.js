/**
 * Configuration for Multer to handle disk storage and file validation.
 */

const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const config = require("../config");
const { AppError } = require("../utils/AppError");

/**
 * Defines storage strategy for uploaded assets.
 */
const storage = multer.diskStorage({
  /**
   * Determines target directory for uploads.
   */
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  /**
   * Generates a unique, non-colliding filename.
   */
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString("hex");
    cb(
      null,
      `${Date.now()}-${uniqueSuffix}${path.extname(file.originalname)}`,
    );
  },
});

/**
 * Validates files based on MIME type.
 */
const fileFilter = (req, file, cb) => {
  if (config.upload.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Invalid file type. Only JPEG and PNG are allowed.",
        400,
      ),
      false,
    );
  }
};

/**
 * Multer upload instance.
 */
const upload = multer({
  storage: storage,
  limits: { fileSize: config.upload.maxSize },
  fileFilter: fileFilter,
});

module.exports = upload;
