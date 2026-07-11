// config/EnvironmentProfiles.js
/**
 * EnvironmentProfiles — ARGUS v1.1
 *
 * Resolves the active environment profile and provides profile-aware helpers.
 * Bridges the gap between NODE_ENV and ConfigLoader profiles.
 */

const configLoader = require('./ConfigLoader');

const VALID_PROFILES = ['development', 'staging', 'production'];

class EnvironmentProfiles {
  /**
   * Get the active profile name.
   * @returns {string}
   */
  static getProfile() {
    return configLoader.getProfile();
  }

  /**
   * Check if the current profile matches.
   * @param {string} profile
   * @returns {boolean}
   */
  static is(profile) {
    return configLoader.getProfile() === profile;
  }

  /**
   * Check if running in development.
   * @returns {boolean}
   */
  static isDevelopment() {
    return this.is('development');
  }

  /**
   * Check if running in staging.
   * @returns {boolean}
   */
  static isStaging() {
    return this.is('staging');
  }

  /**
   * Check if running in production.
   * @returns {boolean}
   */
  static isProduction() {
    return this.is('production');
  }

  /**
   * Check if debug mode is enabled for the current profile.
   * @returns {boolean}
   */
  static isDebug() {
    return configLoader.get('app.debug', false);
  }

  /**
   * Get a config value scoped to the current profile.
   * @param {string} keyPath - Dot-notation path
   * @param {*} defaultValue
   * @returns {*}
   */
  static get(keyPath, defaultValue) {
    return configLoader.get(keyPath, defaultValue);
  }

  /**
   * Resolve a profile-specific value.
   * Usage: EnvironmentProfiles.resolve({ development: 'dev-key', production: 'prod-key' })
   * @param {Object} mapping - Profile-to-value mapping
   * @returns {*}
   */
  static resolve(mapping) {
    const profile = this.getProfile();
    return mapping[profile] !== undefined ? mapping[profile] : mapping.default;
  }

  /**
   * List all available profiles.
   * @returns {string[]}
   */
  static list() {
    return [...VALID_PROFILES];
  }

  /**
   * Validate that a profile name is recognized.
   * @param {string} profile
   * @returns {boolean}
   */
  static isValid(profile) {
    return VALID_PROFILES.includes(profile);
  }
}

module.exports = EnvironmentProfiles;