// providers/ProviderPriorityResolver.js
/**
 * ProviderPriorityResolver — ARGUS v1.2
 *
 * Resolves the best provider for a given task based on:
 * - Priority (configured per provider)
 * - Health status (healthy preferred over degraded)
 * - Latency (faster preferred)
 * - Error rate (lower preferred)
 * - Capability match
 */

const Registry = require('./ProviderRegistry');
const HealthManager = require('./ProviderHealthManager');
const Metrics = require('./ProviderMetrics');

class ProviderPriorityResolver {
  /**
   * Resolve the best provider for a capability.
   * @param {string} capability - e.g. "url_check", "phone_lookup"
   * @param {Object} [options]
   * @param {string} [options.category] - Limit to a category
   * @param {boolean} [options.failover=true] - Allow failover to next best provider
   * @returns {{provider: Object|null, failoverCandidates: Object[]}}
   */
  resolve(capability, options = {}) {
    const failover = options.failover !== false;
    const allProviders = Registry.list();
    let candidates = allProviders.filter(p => {
      if (!p.enabled) return false;
      if (!p.capabilities.includes(capability)) return false;
      if (options.category && p.category !== options.category) return false;
      return true;
    });

    // Score each candidate
    const scored = candidates.map(p => {
      const health = HealthManager.getCircuitState(p.id);
      const metrics = Metrics.getSnapshot(p.id);

      let score = p.priority * 10;

      // Health score
      if (health === 'closed') score += 50;
      else if (health === 'half_open') score += 10;
      else score -= 50;

      // Latency score (lower is better)
      if (metrics && metrics.avgLatency > 0) {
        if (metrics.avgLatency < 200) score += 30;
        else if (metrics.avgLatency < 500) score += 20;
        else if (metrics.avgLatency < 1000) score += 10;
      } else {
        score += 15; // No data yet, neutral
      }

      // Success rate score
      if (metrics && metrics.totalCalls > 0) {
        if (metrics.successRate >= 99) score += 20;
        else if (metrics.successRate >= 95) score += 10;
        else if (metrics.successRate >= 80) score += 5;
        else score -= 20;
      }

      return { provider: p, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return {
      provider: scored[0]?.provider || null,
      failoverCandidates: failover ? scored.slice(1).map(s => s.provider) : [],
      scored: scored.map(s => ({ id: s.provider.id, score: s.score })),
    };
  }

  /**
   * Get a ranked list of all providers for a capability.
   */
  rank(capability, category = null) {
    return this.resolve(capability, { category, failover: true });
  }
}

module.exports = new ProviderPriorityResolver();