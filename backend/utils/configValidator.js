// utils/configValidator.js

const config = require('../config/reputationConfig');

/**
 * Validate critical configuration values at startup.
 * Throws an error if any required config is missing or malformed.
 */
function validateConfig() {
  const requiredNumbers = [
    'RECENT_REPORT_WINDOW_DAYS',
    'CACHE_TTL_SECONDS',
  ];
  requiredNumbers.forEach(key => {
    const val = config[key];
    if (typeof val !== 'number' || val <= 0) {
      throw new Error(`Configuration validation failed: ${key} must be a positive number`);
    }
  });
  if (!config.ENGINE_VERSION) {
    throw new Error('Configuration validation failed: ENGINE_VERSION is required');
  }
  if (!config.API_VERSION) {
    throw new Error('Configuration validation failed: API_VERSION is required');
  }
  // REDIS_URL is optional – no validation here
}

module.exports = { validateConfig };
