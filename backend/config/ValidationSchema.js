// config/ValidationSchema.js
/**
 * ValidationSchema — ARGUS v1.1
 *
 * Central validation schemas for environment configuration.
 * Ensures all config values meet expected types and ranges.
 */

class ValidationSchema {
  /**
   * Validate configuration against a schema.
   * @param {Object} config - Configuration object to validate
   * @param {Object} schema - Validation schema definition
   * @returns {{valid: boolean, errors: string[]}}
   */
  static validate(config, schema) {
    const errors = [];

    for (const [key, rules] of Object.entries(schema)) {
      const value = this._getNestedValue(config, key);

      if (rules.required && (value === undefined || value === null)) {
        errors.push(`${key}: required but missing`);
        continue;
      }

      if (value === undefined || value === null) continue;

      // Type check
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${key}: expected ${rules.type}, got ${typeof value}`);
        continue;
      }

      // Min/max for numbers
      if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${key}: minimum ${rules.min}, got ${value}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${key}: maximum ${rules.max}, got ${value}`);
        }
      }

      // Min/max length for strings
      if (typeof value === 'string') {
        if (rules.minLength !== undefined && value.length < rules.minLength) {
          errors.push(`${key}: minimum length ${rules.minLength}, got ${value.length}`);
        }
        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
          errors.push(`${key}: maximum length ${rules.maxLength}, got ${value.length}`);
        }
      }

      // Enum check
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${key}: must be one of [${rules.enum.join(', ')}], got "${value}"`);
      }

      // Pattern check for strings
      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        errors.push(`${key}: does not match required pattern`);
      }

      // Custom validator
      if (rules.validate && typeof rules.validate === 'function') {
        try {
          const result = rules.validate(value);
          if (result !== true) {
            errors.push(`${key}: ${result || 'custom validation failed'}`);
          }
        } catch (err) {
          errors.push(`${key}: custom validation threw: ${err.message}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate all environment configuration at startup.
   * @param {Object} config - The loaded configuration
   * @returns {{valid: boolean, errors: string[]}}
   */
  static validateEnvironment(config) {
    const schema = {
      'app.port': { type: 'number', min: 1024, max: 65535, required: false },
      'database.poolMin': { type: 'number', min: 0, max: 100, required: false },
      'database.poolMax': { type: 'number', min: 1, max: 200, required: false },
      'cache.defaultTTL': { type: 'number', min: 0, max: 86400, required: false },
      'cache.maxEntries': { type: 'number', min: 100, max: 1000000, required: false },
      'rateLimit.max': { type: 'number', min: 1, max: 10000, required: false },
      'rateLimit.strictMax': { type: 'number', min: 1, max: 1000, required: false },
      'otp.expiryMs': { type: 'number', min: 60000, max: 600000, required: false },
      'otp.length': { type: 'number', min: 4, max: 8, required: false },
      'jwt.expiresIn': { type: 'string', required: false },
      'audit.retentionDays': { type: 'number', min: 1, max: 730, required: false },
    };

    return this.validate(config, schema);
  }

  static _getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }
}

module.exports = ValidationSchema;