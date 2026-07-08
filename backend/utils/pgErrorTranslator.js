// utils/pgErrorTranslator.js
/**
 * PostgreSQL Error Translation Layer — SELIDIKI Architecture v1.0
 *
 * Translates PostgreSQL error codes into domain-level errors.
 * Business logic MUST NEVER catch PostgreSQL-specific errors directly.
 *
 * Usage:
 *   try { await db.query(...); }
 *   catch (err) { throw translatePgError(err); }
 */

class DuplicateEntityError extends Error {
  constructor(message, entity) { super(message); this.name = 'DuplicateEntityError'; this.entity = entity; }
}
class ReferentialIntegrityError extends Error {
  constructor(message) { super(message); this.name = 'ReferentialIntegrityError'; }
}
class ValidationError extends Error {
  constructor(message) { super(message); this.name = 'ValidationError'; }
}
class RetryableTransactionError extends Error {
  constructor(message) { super(message); this.name = 'RetryableTransactionError'; }
}
class PersistenceUnavailableError extends Error {
  constructor(message) { super(message); this.name = 'PersistenceUnavailableError'; }
}

const ERROR_MAP = {
  '23505': { class: DuplicateEntityError, message: 'Duplicate entity detected' },       // unique_violation
  '23503': { class: ReferentialIntegrityError, message: 'Referential integrity violation' }, // foreign_key_violation
  '23502': { class: ValidationError, message: 'Required field is null' },                 // not_null_violation
  '40001': { class: RetryableTransactionError, message: 'Transaction serialization failure' }, // serialization_failure
  '40P01': { class: RetryableTransactionError, message: 'Deadlock detected' },            // deadlock_detected
  '57P01': { class: PersistenceUnavailableError, message: 'Database connection failure' }, // admin_shutdown
  '57P02': { class: PersistenceUnavailableError, message: 'Database connection failure' }, // crash_shutdown
  '57P03': { class: PersistenceUnavailableError, message: 'Database connection failure' }, // cannot_connect_now
  '08000': { class: PersistenceUnavailableError, message: 'Database connection failure' }, // connection_exception
  '08003': { class: PersistenceUnavailableError, message: 'Database connection failure' }, // connection_does_not_exist
  '08006': { class: PersistenceUnavailableError, message: 'Database connection failure' }, // connection_failure
  '53300': { class: PersistenceUnavailableError, message: 'Too many connections' },        // too_many_connections
  '53400': { class: PersistenceUnavailableError, message: 'Connection pool exhausted' },   // configuration_limit_exceeded
};

function translatePgError(err) {
  const code = err.code;
  if (!code || !ERROR_MAP[code]) {
    // Unknown PG error — wrap as generic persistence error
    const wrapped = new PersistenceUnavailableError(`Unexpected database error: ${err.message}`);
    wrapped.originalCode = code;
    wrapped.originalError = err;
    return wrapped;
  }
  const mapped = ERROR_MAP[code];
  const error = new mapped.class(`${mapped.message} [${code}]: ${err.message}`);
  error.originalCode = code;
  error.originalError = err;
  return error;
}

module.exports = {
  translatePgError,
  DuplicateEntityError,
  ReferentialIntegrityError,
  ValidationError,
  RetryableTransactionError,
  PersistenceUnavailableError,
};
