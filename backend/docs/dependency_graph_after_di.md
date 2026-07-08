# 🔗 Dependency Graph After DI — Atomic Commit #4

**Date:** 2026-07-08

---

## Before DI (Commit #3)

```
routes/check.js ──→ PhoneRepository (unified) ──→ FirestorePhoneRepository
                    BankAccountRepo (unified) ──→ FirestoreBankAccountRepo
                              │                        PostgresPhoneRepo (dormant)
                              │                        PostgresBankAccountRepo (dormant)
                              ├── databaseProvider.js (reads DATABASE_PROVIDER env var)
                              └── if-else routing per method

routes/report.js ──→ ReportRepository (unified) ──→ same pattern
routes/scan.js ────→ HistoryRepository (unified) ──→ same pattern
routes/user.js ────→ UserRepository (unified) ────→ same pattern
middleware/auth.js ─→ UserRepository (unified) ────→ same pattern

services/reputationService.js ──→ FraudEntityRepository (direct PG) ⚠️
                                   FraudReportRepository (direct PG) ⚠️
                                   LookupLogRepository (direct PG)    ⚠️
```

---

## After DI (Commit #4)

```
┌──────────────────────────────────────────────────────────┐
│              config/repositoryResolver.js                 │
│  phoneRepo, bankAccountRepo, reportRepo, historyRepo,    │
│  userRepo, fraudEntityRepo, fraudReportRepo,             │
│  lookupLogRepo, urlRepo                                  │
│  ── All resolve via registry.resolve()                   │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│            config/repositoryRegistry.js                   │
│  9 entries: { firestore: Class, postgres: Class,         │
│               active: 'firestore' }                      │
│  resolve(name) → entry[entry.active]                     │
│  getActiveProvider() → 'firestore'                       │
└──────────────┬───────────────────────────────────────────┘
               │
    ┌──────────┼──────────┬──────────┬──────────┐
    ▼          ▼          ▼          ▼          ▼
  Firestore  Firestore  Firestore  Firestore  Firestore
  PhoneRepo  BankRepo   ReportRepo HistoryRepo UserRepo ...
  (9 adapters, all loaded at startup)
```

**PostgreSQL adapters are registered but NOT active.** They are loaded at startup for validation but never invoked.

---

## Cycle Detection

```
repositoryResolver ──→ repositoryRegistry ──→ firestore/*.js ──→ firebase-admin/firestore
                                                           (external dep, no cycle)

repositoryResolver ──→ repositoryRegistry ──→ postgres/*.js ──→ utils/db ──→ pg
                                                         (external dep, no cycle)

No circular dependencies detected.
```

---

## Layer Validation

| Layer | Allowed Imports | Forbidden Imports |
|---|---|---|
| `config/repositoryRegistry.js` | `repositories/firestore/*`, `repositories/postgres/*`, `repositories/*.js` | Routes, services, controllers, middleware |
| `config/repositoryResolver.js` | `config/repositoryRegistry.js` | Adapters directly, routes, services |
| Routes (`routes/*.js`) | Unified repos OR resolver | `repositories/firestore/*`, `repositories/postgres/*`, `utils/db` |
| Services (`services/*.js`) | Unified repos OR resolver | `repositories/firestore/*`, `repositories/postgres/*`, `utils/db` |
| Middleware (`middleware/*.js`) | Unified repos OR resolver | Adapters directly |

---

## Forbidden Dependencies (Verified)

| Check | Result |
|---|---|
| resolver → routes | ❌ No (resolver doesn't import routes) |
| resolver → services | ❌ No |
| registry → routes | ❌ No |
| registry → services | ❌ No |
| firestore adapter → postgres adapter | ❌ No |
| postgres adapter → firestore adapter | ❌ No |
| Circular: resolver → registry → resolver | ❌ No |
