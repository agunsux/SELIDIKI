// config/ConfigLoader.js
/**
 * ConfigLoader — ARGUS v1.1
 *
 * Central configuration loader that supports multiple environment profiles.
 * Never hardcode configuration. Always resolve through this loader.
 *
 * Supports:
 * - development
 * - staging
 * - production
 */

const path = require('path');
const fs = require('fs');

const ENV_PROFILES = ['development', 'staging', 'production'];

class ConfigLoader {
  constructor() {
    this._profile = null;
    this._config = null;
    this._loaded = false;
  }

  /**
   * Initialize the config loader. Call once at startup.
   * @param {string} [profile] - Environment profile (development|staging|production)
   * @returns {Object} Loaded configuration
   */
  load(profile) {
    if (this._loaded) return this._config;

    this._profile = profile || process.env.NODE_ENV || 'development';

    if (!ENV_PROFILES.includes(this._profile)) {
      console.warn(`ConfigLoader: Unknown profile "${this._profile}", falling back to development`);
      this._profile = 'development';
    }

    const baseConfig = this._loadFile('default');
    const profileConfig = this._loadFile(this._profile);

    // Deep merge: profile overrides base
    this._config = this._deepMerge(baseConfig, profileConfig);

    // Apply runtime overrides from environment variables
    this._applyEnvOverrides();

    this._loaded = true;

    console.log(`ConfigLoader: Loaded "${this._profile}" profile`);
    return this._config;
  }

  /**
   * Get a config value by dot-notation path.
   * @param {string} keyPath - e.g. "database.host"
   * @param {*} [defaultValue] - Fallback if not found
   * @returns {*}
   */
  get(keyPath, defaultValue) {
    if (!this._loaded) this.load();
    const keys = keyPath.split('.');
    let current = this._config;
    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[key];
    }
    return current !== undefined ? current : defaultValue;
  }

  /**
   * Get the active profile name.
   */
  getProfile() {
    return this._profile;
  }

  /**
   * Get full configuration snapshot.
   */
  getAll() {
    if (!this._loaded) this.load();
    return { ...this._config };
  }

  /**
   * Reload configuration from disk.
   */
  reload() {
    this._loaded = false;
    return this.load(this._profile);
  }

  // ── Private ──

  _loadFile(name) {
    const filePath = path.resolve(__dirname, `../config/profiles/${name}.json`);
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch (err) {
      console.warn(`ConfigLoader: Could not load ${filePath}: ${err.message}`);
    }
    return {};
  }

  _deepMerge(base, override) {
    const result = { ...base };
    for (const key of Object.keys(override)) {
      if (
        result[key] &&
        typeof result[key] === 'object' &&
        !Array.isArray(result[key]) &&
        typeof override[key] === 'object' &&
        !Array.isArray(override[key])
      ) {
        result[key] = this._deepMerge(result[key], override[key]);
      } else {
        result[key] = override[key];
      }
    }
    return result;
  }

  _applyEnvOverrides() {
    // Allow env vars to override config values using CONFIG__ prefix convention
    // e.g. CONFIG__database__host=myhost overrides config.database.host
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('CONFIG__')) {
        const configPath = key.replace('CONFIG__', '').split('__');
        let current = this._config;
        for (let i = 0; i < configPath.length - 1; i++) {
          if (!current[configPath[i]]) current[configPath[i]] = {};
          current = current[configPath[i]];
        }
        const lastKey = configPath[configPath.length - 1];
        // Try to parse as JSON for non-string types
        try {
          current[lastKey] = JSON.parse(value);
        } catch {
          current[lastKey] = value;
        }
      }
    }
  }
}

// Singleton
const configLoader = new ConfigLoader();

module.exports = configLoader;