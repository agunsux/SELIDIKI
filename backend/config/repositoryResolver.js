// config/repositoryResolver.js
/**
 * Repository Resolver — SELIDIKI Architecture v1.0
 *
 * Single entry point for all repository access.
 * All routes, services, and middleware MUST use this resolver.
 *
 * Currently resolves to Firestore only (Commit #6).
 * Provider switching will be added in Commit #7 (Runtime Provider).
 */

// ── Unified Repositories (preserve existing routing + dual-read/write scaffolding) ──
const PhoneRepository      = require('../repositories/PhoneRepository');
const BankAccountRepository = require('../repositories/BankAccountRepository');
const ReportRepository     = require('../repositories/ReportRepository');
const HistoryRepository    = require('../repositories/HistoryRepository');
const UserRepository       = require('../repositories/UserRepository');

// ── Internal Repositories (direct adapters, unified wrappers pending ADR-008) ──
const FirestoreFraudEntityRepository = require('../repositories/firestore/FraudEntityRepository');
const FirestoreFraudReportRepository = require('../repositories/firestore/FraudReportRepository');
const FirestoreLookupLogRepository  = require('../repositories/firestore/LookupLogRepository');
const FirestoreUrlRepository        = require('../repositories/firestore/UrlRepository');

module.exports = {
  // Unified repos (with routing layer preserved)
  phoneRepo:      PhoneRepository,
  bankAccountRepo: BankAccountRepository,
  reportRepo:     ReportRepository,
  historyRepo:    HistoryRepository,
  userRepo:       UserRepository,

  // Internal repos (direct Firestore adapters until ADR-008)
  fraudEntityRepo: FirestoreFraudEntityRepository,
  fraudReportRepo: FirestoreFraudReportRepository,
  lookupLogRepo:  FirestoreLookupLogRepository,
  urlRepo:        FirestoreUrlRepository,
};

