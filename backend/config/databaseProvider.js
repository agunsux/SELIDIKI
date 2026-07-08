// config/databaseProvider.js
/**
 * Database Provider Router — SELIDIKI Architecture v1.0
 *
 * Delegates to config/featureFlags.js for all provider decisions.
 * Backward compatible with DATABASE_PROVIDER env var.
 *
 * DEPRECATED: New code should use config/featureFlags.js directly.
 * This module retained for backward compatibility with unified repos.
 */

const { flags } = require('./featureFlags');

module.exports = {
  PROVIDER: flags.FIRESTORE ? (flags.POSTGRES ? 'DUAL' : 'FIRESTORE') : 'POSTGRES',
  isFirestore: () => flags.FIRESTORE,
  isPostgres:  () => flags.POSTGRES,
  isDualRead:  () => flags.DUAL_READ,
  isDualWrite: () => flags.DUAL_WRITE,
  isShadow:    () => flags.SHADOW_MODE,
};

