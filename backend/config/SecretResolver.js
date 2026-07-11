// config/SecretResolver.js
/**
 * SecretResolver — ARGUS v1.1
 *
 * Resolves secrets from multiple sources with priority:
 * 1. Environment variables (runtime)
 * 2. .env file (development)
 * 3. Cloud secret manager (production)
 *
 * Never hardcode secrets in configuration files.
 */

const path = require('path');
const fs = require('fs');

class SecretResolver {
  constructor() {
    this._cache = new Map();
    this._secretManager = null;
  }

  /**
   * Resolve a secret by key.
   * Looks up in order: env var -> .env file -> cloud secret manager.
   * @param {string} key - Secret key (e.g. "DATABASE_URL")
   * @param {Object} [options]
   * @param {boolean} [options.required=false] - Throw if not found
   * @param {boolean} [options.noCache=false] - Bypass cache
   * @returns {string|null}
   */
  resolve(key, options = {}) {
    if (!options.noCache && this._cache.has(key)) {
      return this._cache.get(key);
    }

    let value = null;

    // 1. Environment variable
    value = process.env[key];
    if (value) {
      this._cache.set(key, value);
      return value;
    }

    // 2. .env file (development)
    value = this._readEnvFile(key);
    if (value) {
      this._cache.set(key, value);
      return value;
    }

    // 3. Cloud secret manager (production)
    if (process.env.NODE_ENV === 'production') {
      value = this._resolveFromCloud(key);
      if (value) {
        this._cache.set(key, value);
        return value;
      }
    }

    if (options.required) {
      throw new Error(`SecretResolver: Required secret "${key}" not found`);
    }

    return null;
  }

  /**
   * Resolve multiple secrets at once.
   * @param {string[]} keys
   * @returns {Object}
   */
  resolveMany(keys) {
    const result = {};
    for (const key of keys) {
      result[key] = this.resolve(key);
    }
    return result;
  }

  /**
   * Check if a secret is available.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.resolve(key) !== null;
  }

  /**
   * Clear the internal cache.
   */
  clearCache() {
    this._cache.clear();
  }

  // ── Private ──

  _readEnvFile(key) {
    const envPath = path.resolve(__dirname, '../.env');
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const eqIndex = trimmed.indexOf('=');
          const k = trimmed.substring(0, eqIndex).trim();
          if (k === key) {
            let v = trimmed.substring(eqIndex + 1).trim();
            // Remove surrounding quotes
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
              v = v.slice(1, -1);
            }
            return v;
          }
        }
      }
    } catch {
      // .env file not available
    }
    return null;
  }

  _resolveFromCloud(key) {
    // Placeholder for cloud secret manager integration
    // Supported providers: Google Secret Manager, AWS Secrets Manager, Azure Key Vault
    // Implementation will be added when cloud deployment is configured
    return null;
  }

  /**
   * Initialize cloud secret manager client.
   * @param {string} provider - 'google' | 'aws' | 'azure'
   */
  async initCloudProvider(provider) {
    switch (provider) {
      case 'google':
        try {
          const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
          this._secretManager = new SecretManagerServiceClient();
        } catch {
          console.warn('SecretResolver: @google-cloud/secret-manager not installed');
        }
        break;
      // AWS and Azure support can be added similarly
      default:
        console.warn(`SecretResolver: Unknown cloud provider "${provider}"`);
    }
  }
}

module.exports = new SecretResolver();