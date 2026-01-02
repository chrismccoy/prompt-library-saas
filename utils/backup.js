/**
 * Maintenance utility for database snapshots
 */

const fs = require("fs");
const path = require("path");
const config = require("../config");
const logger = require("./logger");

/**
 * Performs a binary copy of the SQLite database and prunes old backups.
 */
module.exports = async () => {
  const dbFile = path.join(__dirname, "../../storage/app.sqlite");

  // Verify backup directory existence
  if (!fs.existsSync(config.BACKUP_PATH)) {
    fs.mkdirSync(config.BACKUP_PATH, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(
    config.BACKUP_PATH,
    `backup-${timestamp}.sqlite`,
  );

  try {
    // Perform synchronous copy to ensure file integrity
    fs.copyFileSync(dbFile, backupFile);
    logger.info(`💾 Database backup successful: ${backupFile}`);

    /**
     * Keep only the latest 10 snapshots.
     */
    const files = fs
      .readdirSync(config.BACKUP_PATH)
      .map((f) => ({
        name: f,
        time: fs.statSync(path.join(config.BACKUP_PATH, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 10) {
      files.slice(10).forEach((f) => {
        fs.unlinkSync(path.join(config.BACKUP_PATH, f.name));
      });
      logger.info("🗑️ Retention policy enforced: Old backups pruned");
    }
  } catch (err) {
    logger.error(err, "DATABASE_BACKUP_FAILED: IO Error during snapshot");
  }
};
