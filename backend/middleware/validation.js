// middleware/validation.js

const config = require('../config/reputationConfig');

const SUPPORTED_ENTITY_TYPES = ['PHONE', 'BANK_ACCOUNT', 'EWALLET', 'URL'];

/**
 * Express validation middleware for reputation lookup requests.
 * Throws an error that will be caught by the global error handler.
 */
module.exports = (req, res, next) => {
  const { entityType, value } = req.body;
  if (!entityType || typeof entityType !== 'string') {
    const err = new Error('Missing or invalid entityType');
    err.code = 'INVALID_ENTITY';
    err.status = 400;
    return next(err);
  }
  if (!SUPPORTED_ENTITY_TYPES.includes(entityType)) {
    const err = new Error(`Unsupported entity type: ${entityType}`);
    err.code = 'UNSUPPORTED_ENTITY';
    err.status = 400;
    return next(err);
  }
  if (!value || typeof value !== 'string' || value.length === 0) {
    const err = new Error('Missing or invalid value');
    err.code = 'INVALID_VALUE';
    err.status = 400;
    return next(err);
  }
  // optional max length check (e.g., 256 chars)
  if (value.length > 256) {
    const err = new Error('Value exceeds maximum allowed length');
    err.code = 'VALUE_TOO_LONG';
    err.status = 400;
    return next(err);
  }
  // sanitize: trim whitespace
  req.body.value = value.trim();
  next();
};
