// config/repositoryRegistry.js
/**
 * Repository Registry — SELIDIKI Architecture v1.0
 *
 * Central registry for all repository implementations.
 * Lifetime: Singleton (process lifetime).
 * 
 * Currently registers Firestore implementations only.
 * PostgreSQL implementations are registered but NOT active.
 * Switching will be enabled in Commit #6 (Runtime Provider).
 */

// ── Firestore Adapters ────────────────────────────────────
const FirestorePhoneRepository      = require('../repositories/firestore/PhoneRepository');
const FirestoreBankAccountRepository = require('../repositories/firestore/BankAccountRepository');
const FirestoreReportRepository     = require('../repositories/firestore/ReportRepository');
const FirestoreHistoryRepository    = require('../repositories/firestore/HistoryRepository');
const FirestoreUserRepository       = require('../repositories/firestore/UserRepository');
const FirestoreFraudEntityRepository = require('../repositories/firestore/FraudEntityRepository');
const FirestoreFraudReportRepository = require('../repositories/firestore/FraudReportRepository');
const FirestoreLookupLogRepository  = require('../repositories/firestore/LookupLogRepository');
const FirestoreUrlRepository        = require('../repositories/firestore/UrlRepository');

// ── PostgreSQL Adapters (registered, NOT active) ──────────
const PostgresPhoneRepository       = require('../repositories/postgres/PhoneRepository');
const PostgresBankAccountRepository = require('../repositories/postgres/BankAccountRepository');
const PostgresReportRepository      = require('../repositories/postgres/ReportRepository');
const PostgresHistoryRepository     = require('../repositories/postgres/HistoryRepository');
const PostgresUserRepository        = require('../repositories/postgres/UserRepository');
const PostgresFraudEntityRepository = require('../repositories/FraudEntityRepository');
const PostgresFraudReportRepository = require('../repositories/FraudReportRepository');
const PostgresLookupLogRepository   = require('../repositories/lookupLogRepository');
const PostgresUrlRepository         = require('../repositories/postgres/UrlRepository');

/**
 * @typedef {Object} RepositoryEntry
 * @property {string} name - Repository name
 * @property {Object} firestore - Firestore implementation
 * @property {Object} postgres - PostgreSQL implementation
 * @property {string} active - Currently active provider ('firestore')
 */

/** @type {Map<string, RepositoryEntry>} */
const registry = new Map();

// ── Register all 9 repositories ────────────────────────────
registry.set('phone', {
  name: 'PhoneRepository',
  firestore: FirestorePhoneRepository,
  postgres: PostgresPhoneRepository,
  active: 'firestore',
});
registry.set('bankAccount', {
  name: 'BankAccountRepository',
  firestore: FirestoreBankAccountRepository,
  postgres: PostgresBankAccountRepository,
  active: 'firestore',
});
registry.set('report', {
  name: 'ReportRepository',
  firestore: FirestoreReportRepository,
  postgres: PostgresReportRepository,
  active: 'firestore',
});
registry.set('history', {
  name: 'HistoryRepository',
  firestore: FirestoreHistoryRepository,
  postgres: PostgresHistoryRepository,
  active: 'firestore',
});
registry.set('user', {
  name: 'UserRepository',
  firestore: FirestoreUserRepository,
  postgres: PostgresUserRepository,
  active: 'firestore',
});
registry.set('fraudEntity', {
  name: 'FraudEntityRepository',
  firestore: FirestoreFraudEntityRepository,
  postgres: PostgresFraudEntityRepository,
  active: 'firestore',
});
registry.set('fraudReport', {
  name: 'FraudReportRepository',
  firestore: FirestoreFraudReportRepository,
  postgres: PostgresFraudReportRepository,
  active: 'firestore',
});
registry.set('lookupLog', {
  name: 'LookupLogRepository',
  firestore: FirestoreLookupLogRepository,
  postgres: PostgresLookupLogRepository,
  active: 'firestore',
});
registry.set('url', {
  name: 'UrlRepository',
  firestore: FirestoreUrlRepository,
  postgres: PostgresUrlRepository,
  active: 'firestore',
});

// ── Registry API ──────────────────────────────────────────
module.exports = {
  /** Get the active implementation for a repository */
  resolve(name) {
    const entry = registry.get(name);
    if (!entry) throw new Error(`Repository '${name}' not found in registry`);
    return entry[entry.active];
  },

  /** Get an entry by name */
  get(name) {
    return registry.get(name) || null;
  },

  /** Check if a repository is registered */
  has(name) {
    return registry.has(name);
  },

  /** List all registered repository names */
  list() {
    return Array.from(registry.keys());
  },

  /** Get all entries (for diagnostic/reporting) */
  entries() {
    return Array.from(registry.entries()).map(([key, val]) => ({
      key,
      name: val.name,
      active: val.active,
      hasFirestore: !!val.firestore,
      hasPostgres: !!val.postgres,
    }));
  },

  /** For Commit #4: always returns Firestore. Provider switching in Commit #6 */
  getActiveProvider() {
    return 'firestore';
  },

  /** Expose registry for DI validation */
  _registry: registry,
};
