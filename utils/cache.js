/**
 * High-performance in-memory caching mechanism with TTL
 */

const logger = require("./logger");

class CacheService {
  constructor(ttl = 300000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * Persists a value in the cache with a set expiration.
   */
  set(key, value) {
    const expiresAt = Date.now() + this.ttl;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Retrieves data from the cache. Returns null if the key is missing or expired.
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Clears all entries from the cache.
   */
  clear() {
    this.cache.clear();
    logger.info("SYSTEM_CACHE: Flushed and cleared");
  }
}

module.exports = new CacheService();
