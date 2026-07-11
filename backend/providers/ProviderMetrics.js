// providers/ProviderMetrics.js
/**
 * ProviderMetrics — ARGUS v1.2
 *
 * Tracks performance metrics for every provider: latency, success rate, error count, usage.
 */

class ProviderMetrics {
  constructor() {
    this._metrics = new Map(); // providerId -> { latencies[], successes, failures, ... }
  }

  /**
   * Record a successful provider call.
   * @param {string} providerId
   * @param {number} latencyMs
   * @param {string} [capability]
   */
  recordSuccess(providerId, latencyMs, capability = 'generic') {
    this._ensure(providerId);
    const m = this._metrics.get(providerId);
    m.totalCalls++;
    m.successes++;
    m.latencies.push(latencyMs);
    if (m.latencies.length > 1000) m.latencies.shift();
    m.lastSuccess = new Date().toISOString();
    if (capability) {
      m.byCapability[capability] = (m.byCapability[capability] || 0) + 1;
    }
  }

  /**
   * Record a failed provider call.
   */
  recordFailure(providerId, error, latencyMs, capability = 'generic') {
    this._ensure(providerId);
    const m = this._metrics.get(providerId);
    m.totalCalls++;
    m.failures++;
    m.lastError = error;
    m.lastErrorAt = new Date().toISOString();
    m.latencies.push(latencyMs);
    if (m.latencies.length > 1000) m.latencies.shift();
  }

  /**
   * Get metrics snapshot for a provider.
   */
  getSnapshot(providerId) {
    const m = this._metrics.get(providerId);
    if (!m) return null;

    const sorted = [...m.latencies].sort((a, b) => a - b);
    const len = sorted.length;
    const successRate = m.totalCalls > 0 ? (m.successes / m.totalCalls) * 100 : 0;

    return {
      providerId,
      totalCalls: m.totalCalls,
      successes: m.successes,
      failures: m.failures,
      successRate: Math.round(successRate * 100) / 100,
      avgLatency: len > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / len) : 0,
      p50Latency: len > 0 ? sorted[Math.floor(len * 0.5)] : 0,
      p95Latency: len > 0 ? sorted[Math.floor(len * 0.95)] : 0,
      p99Latency: len > 0 ? sorted[Math.floor(len * 0.99)] : 0,
      lastSuccess: m.lastSuccess,
      lastError: m.lastError,
      lastErrorAt: m.lastErrorAt,
      byCapability: m.byCapability,
    };
  }

  /**
   * Get metrics for all providers.
   */
  getAllSnapshots() {
    const result = {};
    for (const [id] of this._metrics) {
      result[id] = this.getSnapshot(id);
    }
    return result;
  }

  /**
   * Reset metrics for a provider.
   */
  reset(providerId) {
    this._metrics.delete(providerId);
  }

  _ensure(providerId) {
    if (!this._metrics.has(providerId)) {
      this._metrics.set(providerId, {
        totalCalls: 0,
        successes: 0,
        failures: 0,
        latencies: [],
        lastSuccess: null,
        lastError: null,
        lastErrorAt: null,
        byCapability: {},
      });
    }
  }
}

module.exports = new ProviderMetrics();