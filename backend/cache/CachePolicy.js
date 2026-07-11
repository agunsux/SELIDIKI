// cache/CachePolicy.js
/**
 * CachePolicy — ARGUS v1.1
 *
 * Defines cache policies including TTL, LRU, warm cache, and negative cache strategies.
 * Supports per-key policies and global defaults.
 */

class CachePolicy {
  /**
   * @param {Object} options
   * @param {number} [options.defaultTTL=600] - Default TTL in seconds
   * @param {number} [options.negativeCacheTTL=60] - TTL for negative cache entries (not found)
   * @param {number} [options.maxEntries=10000] - Maximum cache entries before eviction
   * @param {boolean} [options.useLRU=true] - Enable LRU eviction
   */
  constructor(options = {}) {
    this.defaultTTL = options.defaultTTL || 600;
    this.negativeCacheTTL = options.negativeCacheTTL || 60;
    this.maxEntries = options.maxEntries || 10000;
    this.useLRU = options.useLRU !== false;

    // Per-key policy overrides
    this._keyPolicies = new Map();
    this._accessOrder = [];
  }

  /**
   * Set a custom policy for a specific key pattern.
   * @param {RegExp|string} pattern - Key pattern or exact key
   * @param {Object} policy
   * @param {number} [policy.ttl] - TTL in seconds
   * @param {boolean} [policy.negativeCache] - Enable negative caching for this pattern
   * @param {number} [policy.negativeTTL] - Negative cache TTL
   */
  setKeyPolicy(pattern, policy) {
    this._keyPolicies.set(pattern, policy);
  }

  /**
   * Get effective TTL for a key.
   * @param {string} key
   * @param {boolean} [isNegative=false] - Whether this is a negative cache entry
   * @returns {number} TTL in seconds
   */
  getTTL(key, isNegative = false) {
    const policy = this._getMatchingPolicy(key);
    if (isNegative) {
      return policy?.negativeTTL || this.negativeCacheTTL;
    }
    return policy?.ttl || this.defaultTTL;
  }

  /**
   * Check if negative cache is enabled for a key.
   * @param {string} key
   * @returns {boolean}
   */
  shouldCacheNegative(key) {
    const policy = this._getMatchingPolicy(key);
    if (policy?.negativeCache !== undefined) return policy.negativeCache;
    return true; // Default: enable negative cache
  }

  /**
   * Record a cache access (for LRU tracking).
   * @param {string} key
   */
  recordAccess(key) {
    if (!this.useLRU) return;
    const idx = this._accessOrder.indexOf(key);
    if (idx > -1) {
      this._accessOrder.splice(idx, 1);
    }
    this._accessOrder.push(key);

    // Evict oldest if over limit
    if (this._accessOrder.length > this.maxEntries) {
      this._accessOrder.shift();
    }
  }

  /**
   * Get keys eligible for eviction (LRU).
   * @param {number} count - Number of keys to evict
   * @returns {string[]}
   */
  getEvictionCandidates(count = 1) {
    if (!this.useLRU) return [];
    return this._accessOrder.splice(0, count);
  }

  /**
   * Get the current access order length.
   * @returns {number}
   */
  get size() {
    return this._accessOrder.length;
  }

  _getMatchingPolicy(key) {
    for (const [pattern, policy] of this._keyPolicies) {
      if (typeof pattern === 'string' && key === pattern) return policy;
      if (pattern instanceof RegExp && pattern.test(key)) return policy;
      if (typeof pattern === 'function' && pattern(key)) return policy;
    }
    return null;
  }
}

module.exports = CachePolicy;