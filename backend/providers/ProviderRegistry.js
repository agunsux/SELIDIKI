// providers/ProviderRegistry.js
/**
 * ProviderRegistry — ARGUS v1.2
 *
 * Central registry for all external providers.
 * Every provider registers: id, version, category, capabilities, timeout, rate limit, health, priority.
 * Providers can be enabled/disabled without code changes.
 */

const ConfigLoader = require('../config/ConfigLoader');

class ProviderRegistry {
  constructor() {
    this._providers = new Map();
    this._categories = new Map();
    this._initialized = false;
  }

  /**
   * Register a provider.
   * @param {Object} spec
   * @param {string} spec.id - Unique provider ID (e.g., "google_safe_browsing")
   * @param {string} spec.version - Provider version
   * @param {string} spec.category - "threat_intel" | "phone" | "bank" | "identity" | "communication" | "payment"
   * @param {string[]} spec.capabilities - ["url_check", "domain_check", "phone_lookup", ...]
   * @param {number} spec.timeout - Default timeout in ms
   * @param {number} spec.rateLimit - Max requests per minute
   * @param {boolean} spec.enabled - Start enabled
   * @param {number} spec.priority - Priority (higher = preferred)
   * @param {Object} spec.adapter - Provider adapter instance
   */
  register(spec) {
    const entry = {
      id: spec.id,
      version: spec.version || '1.0.0',
      category: spec.category || 'generic',
      capabilities: spec.capabilities || [],
      timeout: spec.timeout || 5000,
      rateLimit: spec.rateLimit || 60,
      enabled: spec.enabled !== false,
      priority: spec.priority || 0,
      adapter: spec.adapter,
      status: 'unregistered',
      lastHealth: null,
      errorCount: 0,
      registeredAt: new Date().toISOString(),
    };

    this._providers.set(spec.id, entry);

    // Index by category
    if (!this._categories.has(spec.category)) {
      this._categories.set(spec.category, []);
    }
    this._categories.get(spec.category).push(spec.id);

    return entry;
  }

  /**
   * Get a provider by ID.
   */
  get(id) {
    return this._providers.get(id) || null;
  }

  /**
   * Enable or disable a provider.
   */
  setEnabled(id, enabled) {
    const provider = this._providers.get(id);
    if (provider) {
      provider.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Check if a provider is enabled.
   */
  isEnabled(id) {
    const provider = this._providers.get(id);
    return provider ? provider.enabled : false;
  }

  /**
   * Find best provider for a capability within a category.
   */
  resolve(capability, category = null) {
    let candidates = [];

    if (category) {
      const ids = this._categories.get(category) || [];
      candidates = ids.map(id => this._providers.get(id)).filter(p => p && p.enabled);
    } else {
      candidates = Array.from(this._providers.values()).filter(p => p.enabled);
    }

    // Filter by capability
    candidates = candidates.filter(p => p.capabilities.includes(capability));

    // Sort by priority descending, then error count ascending
    candidates.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return (a.errorCount || 0) - (b.errorCount || 0);
    });

    return candidates[0] || null;
  }

  /**
   * Get all providers in a category.
   */
  getByCategory(category) {
    const ids = this._categories.get(category) || [];
    return ids.map(id => this._providers.get(id)).filter(Boolean);
  }

  /**
   * List all registered providers.
   */
  list() {
    return Array.from(this._providers.values()).map(p => ({
      id: p.id,
      version: p.version,
      category: p.category,
      capabilities: p.capabilities,
      enabled: p.enabled,
      priority: p.priority,
      status: p.status,
      lastHealth: p.lastHealth,
      errorCount: p.errorCount,
    }));
  }

  /**
   * Get all registered categories.
   */
  getCategories() {
    return Array.from(this._categories.keys());
  }
}

module.exports = new ProviderRegistry();