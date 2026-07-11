// cache/CacheWarming.js
/**
 * CacheWarming — ARGUS v1.1
 *
 * Warms the cache with frequently accessed data at startup and on schedule.
 */

const CacheProvider = require('../utils/cacheProvider');

class CacheWarming {
  /**
   * Warm the cache with pre-defined frequent lookups.
   * Override this method in production to add domain-specific warming logic.
   */
  static async warm() {
    const start = Date.now();
    let warmed = 0;

    try {
      // 1. Warm trending reports (most accessed in last 24h)
      try {
        const db = require('../utils/db');
        const trending = await db.query(`
          SELECT target_hash, target_type FROM fraud_events
          WHERE event_type = 'report' AND created_at > NOW() - INTERVAL '24 hours'
          GROUP BY target_hash, target_type
          ORDER BY COUNT(*) DESC
          LIMIT 20
        `);
        for (const row of trending.rows) {
          const cacheKey = `trending:${row.target_type}:${row.target_hash}`;
          await CacheProvider.set(cacheKey, row, 300); // 5 min cache
          warmed++;
        }
      } catch { /* non-critical */ }

      // 2. Warm active blacklists
      try {
        const { flags } = require('../config/featureFlags');
        const cacheKey = 'feature_flags';
        await CacheProvider.set(cacheKey, flags, 600);
        warmed++;
      } catch { /* non-critical */ }

      // 3. Warm reputation thresholds
      try {
        const config = require('../config/reputationConfig');
        const cacheKey = 'reputation_config';
        await CacheProvider.set(cacheKey, config, 3600);
        warmed++;
      } catch { /* non-critical */ }
    } catch (err) {
      console.warn('CacheWarming: Error during warm-up:', err.message);
    }

    if (warmed > 0) {
      console.log(`CacheWarming: Warmed ${warmed} entries in ${Date.now() - start}ms`);
    }
  }
}

module.exports = CacheWarming;