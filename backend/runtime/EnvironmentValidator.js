// runtime/EnvironmentValidator.js
/**
 * EnvironmentValidator — ARGUS v1.1
 *
 * Validates all required environment variables at startup.
 * Returns detailed status for every dependency.
 */

const { DependencyChecker, STATUS } = require('./DependencyChecker');

// Required environment variables for each domain
const REQUIRED_ENV = {
  database: {
    DATABASE_URL: { optional: false, description: 'PostgreSQL connection string' },
    REDIS_URL: { optional: true, description: 'Redis connection string' },
  },
  auth: {
    JWT_SECRET: { optional: false, description: 'JWT signing secret' },
    SUPABASE_JWT_SECRET: { optional: true, description: 'Supabase JWT secret' },
  },
  firebase: {
    FIREBASE_PROJECT_ID: { optional: true, description: 'Firebase project ID' },
    GOOGLE_APPLICATION_CREDENTIALS: { optional: true, description: 'Firebase admin SDK path' },
  },
  smtp: {
    SMTP_HOST: { optional: true, description: 'SMTP server host' },
    SMTP_PORT: { optional: true, description: 'SMTP server port' },
    SMTP_USER: { optional: true, description: 'SMTP username' },
    SMTP_PASS: { optional: true, description: 'SMTP password' },
  },
  storage: {
    STORAGE_BUCKET: { optional: true, description: 'Cloud storage bucket name' },
  },
  provider: {
    GEMINI_API_KEY: { optional: true, description: 'Google Gemini API key' },
  },
  app: {
    NODE_ENV: { optional: false, description: 'Application environment' },
    PORT: { optional: true, description: 'HTTP port' },
  },
};

class EnvironmentValidator {
  /**
   * Validate all required environment variables.
   * @returns {Object} Validation result with per-domain status
   */
  static validate() {
    const results = {};

    for (const [domain, vars] of Object.entries(REQUIRED_ENV)) {
      const checks = [];
      let domainStatus = STATUS.AVAILABLE;

      for (const [envVar, config] of Object.entries(vars)) {
        const check = DependencyChecker.checkEnv(envVar, envVar);
        check.optional = config.optional;
        check.description = config.description;
        checks.push(check);

        if (!config.optional && check.status === STATUS.UNAVAILABLE) {
          domainStatus = STATUS.UNAVAILABLE;
        } else if (config.optional && check.status === STATUS.UNAVAILABLE) {
          // Optional missing → DEGRADED, not UNAVAILABLE
          if (domainStatus === STATUS.AVAILABLE) {
            domainStatus = STATUS.DEGRADED;
          }
        }
      }

      results[domain] = {
        status: domainStatus,
        checks,
      };
    }

    return results;
  }

  /**
   * Quick check if the environment is minimally viable.
   * @returns {boolean}
   */
  static isViable() {
    const validation = this.validate();
    // Must have database and auth available at minimum
    return (
      validation.database.status !== STATUS.UNAVAILABLE &&
      validation.auth.status !== STATUS.UNAVAILABLE &&
      validation.app.status !== STATUS.UNAVAILABLE
    );
  }

  /**
   * Get list of missing required variables.
   * @returns {string[]}
   */
  static getMissingRequired() {
    const validation = this.validate();
    const missing = [];
    for (const [, domain] of Object.entries(validation)) {
      for (const check of domain.checks) {
        if (!check.optional && check.status === STATUS.UNAVAILABLE) {
          missing.push(check.envVar);
        }
      }
    }
    return missing;
  }
}

module.exports = EnvironmentValidator;