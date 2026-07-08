// backend/scripts/readiness/providerSwitch.js
const { performance } = require('perf_hooks');
const { flags } = require('../../config/featureFlags');
const PhoneRepository = require('../../repositories/PhoneRepository');
const dbConfig = require('../../config/databaseProvider');

async function run() {
  const start = performance.now();
  global.appMetrics.provider_switch_total++;

  // Save initial configuration
  const originalPostgres = flags.POSTGRES;
  const originalFirestore = flags.FIRESTORE;

  // 1. Switch to PostgreSQL Only
  flags.POSTGRES = true;
  flags.FIRESTORE = false;
  const pgOnlyOk = dbConfig.isPostgres() && !dbConfig.isFirestore();

  // 2. Switch to Firestore Only
  flags.POSTGRES = false;
  flags.FIRESTORE = true;
  const fsOnlyOk = dbConfig.isFirestore() && !dbConfig.isPostgres();

  // Restore configuration
  flags.POSTGRES = originalPostgres;
  flags.FIRESTORE = originalFirestore;

  const duration = performance.now() - start;

  return {
    name: 'Provider Switching',
    success: pgOnlyOk && fsOnlyOk,
    timestamp: new Date().toISOString(),
    durationMs: duration,
    pgOnlyVerified: pgOnlyOk,
    fsOnlyVerified: fsOnlyOk,
    errors: 0
  };
}

module.exports = { run };
