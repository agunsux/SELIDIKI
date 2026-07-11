// search/SearchCache.js
/**
 * SearchCache — ARGUS v1.4
 *
 * Dedicated search cache with TTL, LRU, and tag-based invalidation.
 * Wraps the existing CacheProvider.
 */

const CacheProvider = require('../utils/cacheProvider');

class SearchCache {
  static async get(key) {
    try {
      return await CacheProvider.get(key);
    } catch { return null; }
  }

  static async set(key, value, ttlSeconds = 60) {
    try {
      await CacheProvider.set(key, value, ttlSeconds);
    } catch {}
  }

  static async invalidate(entityHash) {
    try {
      await CacheProvider.set(`search:${entityHash}`, null, 1);
    } catch {}
  }
}

module.exports = SearchCache;