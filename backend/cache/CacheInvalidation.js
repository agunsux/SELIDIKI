// cache/CacheInvalidation.js
/**
 * CacheInvalidation — ARGUS v1.1
 *
 * Manages cache invalidation strategies.
 * Supports pattern-based, tag-based, and time-based invalidation.
 * Works with both Redis and in-memory caches.
 */

class CacheInvalidation {
  /**
   * @param {Object} cacheProvider - The cache store (get/set/del methods)
   */
  constructor(cacheProvider) {
    this._cache = cacheProvider;
    this._tags = new Map(); // tag -> Set of keys
  }

  /**
   * Tag a cache key for group invalidation.
   * @param {string} key - Cache key
   * @param {string|string[]} tags - Tags to associate
   */
  tag(key, tags) {
    const tagList = Array.isArray(tags) ? tags : [tags];
    for (const tag of tagList) {
      if (!this._tags.has(tag)) {
        this._tags.set(tag, new Set());
      }
      this._tags.get(tag).add(key);
    }
  }

  /**
   * Invalidate all keys associated with a tag.
   * @param {string} tag
   * @returns {Promise<number>} Number of invalidated keys
   */
  async invalidateByTag(tag) {
    const keys = this._tags.get(tag);
    if (!keys || keys.size === 0) return 0;

    const promises = [];
    for (const key of keys) {
      promises.push(this._cache.del(key));
    }
    await Promise.allSettled(promises);
    this._tags.delete(tag);
    return keys.size;
  }

  /**
   * Invalidate a specific key.
   * @param {string} key
   */
  async invalidateKey(key) {
    await this._cache.del(key);
    // Also clean up tag references
    for (const [, keys] of this._tags) {
      keys.delete(key);
    }
  }

  /**
   * Invalidate keys matching a pattern.
   * @param {string} pattern - Glob pattern (e.g. "lookup:*")
   * @returns {Promise<number>}
   */
  async invalidateByPattern(pattern) {
    // Convert glob to regex
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const allKeys = await this._cache.keys();
    const matching = allKeys.filter(k => regex.test(k));

    const promises = matching.map(k => this._cache.del(k));
    await Promise.allSettled(promises);
    return matching.length;
  }

  /**
   * Invalidate all cache entries.
   * @returns {Promise<number>}
   */
  async invalidateAll() {
    const allKeys = await this._cache.keys();
    const promises = allKeys.map(k => this._cache.del(k));
    await Promise.allSettled(promises);
    this._tags.clear();
    return allKeys.length;
  }

  /**
   * Get all registered tags.
   * @returns {string[]}
   */
  getTags() {
    return Array.from(this._tags.keys());
  }
}

module.exports = CacheInvalidation;