// providers/ProviderManager.js
/**
 * ProviderManager — ARGUS v1.1
 *
 * Manages all external providers as plug-in adapters.
 * Every external provider implements the same interface:
 *   initialize(), lookup(), health(), shutdown(), timeout()
 *
 * No provider-specific logic outside adapters.
 */

const { STATUS } = require('../runtime/DependencyChecker');

class ProviderManager {
  constructor() {
    this._providers = new Map();
    this._timeouts = new Map();
  }

  /**
   * Register a provider adapter.
   * @param {string} name - Provider name (e.g. "googleSafeBrowsing")
   * @param {Object} adapter - Must implement ProviderInterface
   * @param {Object} [options]
   * @param {number} [options.timeout=5000] - Default timeout in ms
   * @param {boolean} [options.autoInitialize=true] - Call initialize() on register
   */
  async register(name, adapter, options = {}) {
    const timeout = options.timeout || 5000;
    const autoInit = options.autoInitialize !== false;

    this._providers.set(name, {
      adapter,
      timeout,
      status: STATUS.UNKNOWN,
      lastHealth: null,
      errorCount: 0,
    });
    this._timeouts.set(name, timeout);

    if (autoInit && typeof adapter.initialize === 'function') {
      try {
        await this._withTimeout(adapter.initialize(), timeout);
        this._updateStatus(name, STATUS.AVAILABLE);
        console.log(`ProviderManager: Registered "${name}" (timeout: ${timeout}ms)`);
      } catch (err) {
        this._updateStatus(name, STATUS.UNAVAILABLE);
        console.warn(`ProviderManager: "${name}" init failed: ${err.message}`);
      }
    }
  }

  /**
   * Execute a lookup on a provider.
   * @param {string} name - Provider name
   * @param {*} query - Lookup parameters
   * @returns {Promise<*>}
   */
  async lookup(name, query) {
    const provider = this._getProvider(name);
    if (!provider) throw new Error(`Provider "${name}" not registered`);

    if (provider.status === STATUS.UNAVAILABLE) {
      return { error: 'provider_unavailable', provider: name };
    }

    try {
      const result = await this._withTimeout(
        provider.adapter.lookup(query),
        this._timeouts.get(name)
      );
      provider.errorCount = 0;
      return result;
    } catch (err) {
      provider.errorCount++;
      if (provider.errorCount >= 3) {
        this._updateStatus(name, STATUS.UNAVAILABLE);
      }
      throw err;
    }
  }

  /**
   * Check health of all providers.
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    const results = {};

    for (const [name, provider] of this._providers) {
      if (typeof provider.adapter.health === 'function') {
        try {
          const healthy = await this._withTimeout(
            provider.adapter.health(),
            this._timeouts.get(name)
          );
          results[name] = healthy ? STATUS.AVAILABLE : STATUS.DEGRADED;
          this._updateStatus(name, healthy ? STATUS.AVAILABLE : STATUS.DEGRADED);
        } catch {
          results[name] = STATUS.UNAVAILABLE;
          this._updateStatus(name, STATUS.UNAVAILABLE);
        }
      } else {
        results[name] = provider.status;
      }
    }

    return results;
  }

  /**
   * Shutdown all providers gracefully.
   */
  async shutdownAll() {
    for (const [name, provider] of this._providers) {
      if (typeof provider.adapter.shutdown === 'function') {
        try {
          await provider.adapter.shutdown();
          console.log(`ProviderManager: "${name}" shut down`);
        } catch (err) {
          console.warn(`ProviderManager: "${name}" shutdown error: ${err.message}`);
        }
      }
    }
  }

  /**
   * Get provider status.
   * @param {string} name
   * @returns {Object}
   */
  getStatus(name) {
    const provider = this._providers.get(name);
    if (!provider) return null;
    return {
      name,
      status: provider.status,
      lastHealth: provider.lastHealth,
      errorCount: provider.errorCount,
      timeout: this._timeouts.get(name),
      hasInitialize: typeof provider.adapter.initialize === 'function',
      hasLookup: typeof provider.adapter.lookup === 'function',
      hasHealth: typeof provider.adapter.health === 'function',
    };
  }

  /**
   * Get all provider statuses.
   * @returns {Object}
   */
  getAllStatus() {
    const result = {};
    for (const [name] of this._providers) {
      result[name] = this.getStatus(name);
    }
    return result;
  }

  /**
   * Check if a provider is available.
   * @param {string} name
   * @returns {boolean}
   */
  isAvailable(name) {
    const provider = this._providers.get(name);
    return provider && provider.status === STATUS.AVAILABLE;
  }

  /**
   * Set custom timeout for a provider.
   * @param {string} name
   * @param {number} ms
   */
  setTimeout(name, ms) {
    this._timeouts.set(name, ms);
  }

  // ── Private ──

  _getProvider(name) {
    const entry = this._providers.get(name);
    if (!entry) return null;
    return entry;
  }

  _updateStatus(name, status) {
    const provider = this._providers.get(name);
    if (provider) {
      provider.status = status;
      provider.lastHealth = new Date().toISOString();
    }
  }

  _withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Provider timeout after ${ms}ms`)), ms);
      promise
        .then((val) => { clearTimeout(timer); resolve(val); })
        .catch((err) => { clearTimeout(timer); reject(err); });
    });
  }
}

// Singleton
const providerManager = new ProviderManager();

module.exports = providerManager;