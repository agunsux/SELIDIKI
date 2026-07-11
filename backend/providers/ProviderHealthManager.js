// providers/ProviderHealthManager.js
/**
 * ProviderHealthManager — ARGUS v1.2
 *
 * Manages health checking for all registered providers.
 * Supports scheduled health checks, circuit breaker, and auto-recovery.
 */

const Registry = require('./ProviderRegistry');

class ProviderHealthManager {
  constructor() {
    this._circuitBreakers = new Map();
    this._consecutiveFailures = new Map();
    this._recoveryTimers = new Map();
  }

  /**
   * Check health of a specific provider.
   * @param {string} providerId
   * @returns {Promise<{status: string, latency: number, error: string|null}>}
   */
  async check(providerId) {
    const provider = Registry.get(providerId);
    if (!provider) return { status: 'not_found', latency: 0, error: 'Provider not registered' };
    if (!provider.enabled) return { status: 'disabled', latency: 0, error: null };

    const start = Date.now();
    try {
      const healthy = await provider.adapter.health();
      const latency = Date.now() - start;

      if (healthy) {
        provider.status = 'healthy';
        provider.lastHealth = new Date().toISOString();
        this._consecutiveFailures.set(providerId, 0);
        // Close circuit breaker if previously open
        this._circuitBreakers.set(providerId, 'closed');
        return { status: 'healthy', latency, error: null };
      } else {
        return this._recordFailure(providerId, 'health_check_returned_unhealthy', Date.now() - start);
      }
    } catch (err) {
      return this._recordFailure(providerId, err.message, Date.now() - start);
    }
  }

  /**
   * Check health of all registered providers.
   * @returns {Promise<Object>}
   */
  async checkAll() {
    const providers = Registry.list();
    const results = {};

    for (const p of providers) {
      if (p.enabled && p.status !== 'unregistered') {
        results[p.id] = await this.check(p.id);
      }
    }

    return results;
  }

  /**
   * Get circuit breaker state for a provider.
   * @param {string} providerId
   * @returns {string} 'closed' | 'open' | 'half_open'
   */
  getCircuitState(providerId) {
    return this._circuitBreakers.get(providerId) || 'closed';
  }

  /**
   * Check if a provider is available (circuit closed + healthy status).
   */
  isAvailable(providerId) {
    const state = this._circuitBreakers.get(providerId);
    if (state === 'open') return false;

    const provider = Registry.get(providerId);
    return provider && provider.enabled && provider.status === 'healthy';
  }

  /**
   * Attempt to recover a failed provider.
   */
  async recover(providerId) {
    const provider = Registry.get(providerId);
    if (!provider) return false;

    try {
      const healthy = await provider.adapter.health();
      if (healthy) {
        provider.status = 'healthy';
        provider.lastHealth = new Date().toISOString();
        provider.errorCount = 0;
        this._consecutiveFailures.set(providerId, 0);
        this._circuitBreakers.set(providerId, 'closed');
        if (this._recoveryTimers.has(providerId)) {
          clearTimeout(this._recoveryTimers.get(providerId));
          this._recoveryTimers.delete(providerId);
        }
        return true;
      }
    } catch {}
    return false;
  }

  _recordFailure(providerId, error, latency) {
    const provider = Registry.get(providerId);
    if (provider) {
      provider.status = 'unhealthy';
      provider.errorCount = (provider.errorCount || 0) + 1;

      const failures = (this._consecutiveFailures.get(providerId) || 0) + 1;
      this._consecutiveFailures.set(providerId, failures);

      // Open circuit breaker after 3 consecutive failures
      if (failures >= 3) {
        this._circuitBreakers.set(providerId, 'open');
        // Schedule auto-recovery after 30 seconds
        if (!this._recoveryTimers.has(providerId)) {
          const timer = setTimeout(() => this.recover(providerId), 30000);
          this._recoveryTimers.set(providerId, timer);
        }
      }
    }

    return { status: 'unhealthy', latency, error };
  }
}

module.exports = new ProviderHealthManager();