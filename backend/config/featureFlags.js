// config/FeatureFlags.js
/**
 * FeatureFlags — ARGUS v1.1
 *
 * Extends the existing featureFlags.js with profile-aware feature flag loading.
 * Uses ConfigLoader for environment profile support.
 *
 * This is a COMPLEMENT to the existing config/featureFlags.js, not a replacement.
 * It provides higher-level feature flags for the platform layer.
 */

const configLoader = require('./ConfigLoader');

class FeatureFlags {
  constructor() {
    this._flags = new Map();
    this._initialized = false;
  }

  /**
   * Initialize all feature flags from config profiles.
   */
  init() {
    if (this._initialized) return;
    const config = configLoader.getAll();

    // Platform feature flags
    this._flags.set('audit.enabled', true);
    this._flags.set('audit.exportJson', true);
    this._flags.set('audit.exportCsv', true);
    this._flags.set('cache.negativeCache', true);
    this._flags.set('cache.warmOnStartup', process.env.NODE_ENV === 'production');
    this._flags.set('dashboard.enabled', true);
    this._flags.set('provider.abstraction', true);
    this._flags.set('provider.googleSafeBrowsing', !!process.env.GOOGLE_SAFE_BROWSING_KEY);
    this._flags.set('provider.virusTotal', !!process.env.VIRUSTOTAL_API_KEY);
    this._flags.set('provider.komdigi', !!process.env.KOMDIGI_API_KEY);
    this._flags.set('provider.cekRekening', !!process.env.CEKREKENING_API_KEY);
    this._flags.set('provider.twilio', !!process.env.TWILIO_ACCOUNT_SID);
    this._flags.set('backgroundJobs.datasetImport', true);
    this._flags.set('backgroundJobs.providerSync', true);
    this._flags.set('backgroundJobs.reportProcessing', true);
    this._flags.set('backgroundJobs.cacheWarming', process.env.NODE_ENV === 'production');
    this._flags.set('backgroundJobs.cleanup', true);

    this._initialized = true;
  }

  /**
   * Check if a feature flag is enabled.
   * @param {string} flag - Flag name (e.g. "audit.enabled")
   * @returns {boolean}
   */
  isEnabled(flag) {
    if (!this._initialized) this.init();
    return this._flags.get(flag) === true;
  }

  /**
   * Enable a feature flag at runtime.
   * @param {string} flag
   * @param {boolean} value
   */
  set(flag, value) {
    this._flags.set(flag, value);
  }

  /**
   * Get all feature flags snapshot.
   * @returns {Object}
   */
  getAll() {
    if (!this._initialized) this.init();
    const result = {};
    for (const [key, value] of this._flags) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Get flag metadata (flag name + value).
   */
  getFlag(flag) {
    if (!this._initialized) this.init();
    return {
      flag,
      enabled: this._flags.get(flag) === true,
    };
  }
}

module.exports = new FeatureFlags();