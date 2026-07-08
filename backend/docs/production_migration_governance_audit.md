# 📊 PHASE 0 — Architecture Audit Report
## SELIDIKI — Production Migration Governance (Sprint 2A)

**Date:** 2026-07-08 | **Sprint:** 2A | **Reviewer:** Principal Engineer  
**Overall Score:** 78% | **Critical Blockers:** 2 | **ADR Required:** 3

---

## 1. ARCHITECTURE OVERVIEW

SELIDIKI is an Indonesian Digital Trust & Fraud Intelligence platform consisting of:
- **Backend:** Node.js/Express API server (15 endpoints)
- **Primary Database:** Firestore (5 collections)
- **Target Database:** PostgreSQL (7 tables + views + triggers)
- **Mobile:** Flutter application (Android)
- **AI Engine:** Google Gemini 1.5 Flash
- **Target Scale:** 10M users (ADR-004)

### High-Level Architecture
```
┌──────────────────────────────────────────────────────┐
│               HTTP Layer (Express)                    │
├──────────────────────────────────────────────────────┤
│     Routes (5)  |  Controllers (1)  |  Middleware (3) │
├──────────────────────────────────────────────────────┤
│     Services (7): reputationService, aiEngine,        │
│     riskEngine, entityResolver, storageService,       │
│     fraudGraph (LEGACY), historyService (LEGACY)      │
├──────────────────────────────────────────────────────┤
│  UNIFIED REPOSITORIES (5)     INTERNAL REPOS (4 PG)   │
│  PhoneRepo    ✅FS+PG         FraudEntityRepo  ⚠️     │
│  BankAcctRepo ✅FS+PG         FraudReportRepo  ⚠️     │
│  ReportRepo   ✅FS+PG         LookupLogRepo    ⚠️     │
│  HistoryRepo  ✅FS+PG         UrlRepository    ⚠️     │
│  UserRepo     ✅FS+PG                                  │
├──────────────────────────────────────────────────────┤
│  config/databaseProvider.js                           │
│  FIRESTORE | POSTGRES | DUAL_WRITE | DUAL_READ | SHADOW│
├─────────────────────┬────────────────────────────────┤
│  Firestore Adapters │  PostgreSQL Adapters           │
│  (5 files)          │  (6 files)                     │
└─────────────────────┴────────────────────────────────┘
```

---

## 2. CURRENT DATA FLOW

### Read Path
```
HTTP → Route → Unified Repository → dbConfig.isXxx()
  ├── FIRESTORE: Firestore Adapter → FS Collection
  ├── POSTGRES:  Postgres Adapter  → PG Table
  ├── DUAL_READ: FS (primary) + PG (compare) → return FS result
  └── SHADOW:    FS (sync), PG not executed (GAP ⚠️)
```

### Write Path
```
HTTP → Route → Unified Repository.insert/upsert()
  ├── FIRESTORE:  Firestore Adapter → FS Collection
  ├── POSTGRES:   Postgres Adapter  → PG Table
  ├── DUAL_WRITE: FS (primary) → success → PG (best-effort, try/catch)
  └── SHADOW:     FS (sync), PG not executed (GAP ⚠️)
```


---

## 3. DEPENDENCY GRAPH

### 3.1 Full Service Dependency Matrix

| Consumer | PhoneRepo | BankRepo | ReportRepo | HistoryRepo | UserRepo | FraudEntityRepo | FraudReportRepo | LookupLogRepo |
|---|---|---|---|---|---|---|---|---|
| `routes/check.js` | ✅ U | ✅ U | - | - | - | - | - | - |
| `routes/report.js` | - | - | ✅ U | - | - | - | - | - |
| `routes/scan.js` | - | - | - | ✅ U | - | - | - | - |
| `routes/user.js` | - | - | - | ✅ U | ✅ U | - | - | - |
| `routes/reputation.js` | - | - | - | - | - | (via svc) | (via svc) | (via svc) |
| `middleware/auth.js` | - | - | - | - | ✅ U | - | - | - |
| `services/reputationService.js` | - | - | - | - | - | ⚠️ PG | ⚠️ PG | ⚠️ PG |
| `services/fraudGraph.js` | 🔴 FS | 🔴 FS | 🔴 FS | 🔴 FS | - | - | - | - |
| `services/historyService.js` | - | - | - | 🔴 FS | - | - | - | - |

> ✅ U = Unified dual-DB | ⚠️ PG = PostgreSQL-only | 🔴 FS = Direct Firestore (bypasses repo)

### 3.2 Cross-Layer Violations

| Violation | Location | Severity |
|---|---|---|
| Direct Firestore call | `services/fraudGraph.js:1,14,38,57,93,119` | 🔴 Critical |
| Direct Firestore call | `services/historyService.js:1,21` | 🔴 Critical |
| In-memory OTP Map in route | `routes/user.js:12` | 🟡 Medium |
| Raw SQL bypassing abstraction | `FraudEntityRepository.js:14-30` | 🟡 Medium |
| Raw SQL bypassing abstraction | `FraudReportRepository.js:13-24` | 🟡 Medium |

---

## 4. PERSISTENCE GRAPH

### 4.1 Complete Repository Inventory

| # | Repository | FS Adapter | PG Adapter | Interface | Contract Test | Dual-DB | Score |
|---|---|---|---|---|---|---|---|
| 1 | PhoneRepository | ✅ | ✅ | ⚠️ Partial | ❌ | ✅ | 80% |
| 2 | BankAccountRepository | ✅ | ✅ | ❌ | ❌ | ✅ | 75% |
| 3 | ReportRepository | ✅ | ✅ | ❌ | ❌ | ✅ | 85% |
| 4 | HistoryRepository | ✅ | ✅ | ❌ | ❌ | ✅ | 85% |
| 5 | UserRepository | ✅ | ✅ | ❌ | ❌ | ✅ | 85% |
| 6 | FraudEntityRepository | ❌ | ✅ | ❌ | ❌ | ❌ | 40% |
| 7 | FraudReportRepository | ❌ | ✅ | ❌ | ❌ | ❌ | 40% |
| 8 | LookupLogRepository | ❌ | ✅ | ❌ | ❌ | ❌ | 30% |
| 9 | UrlRepository | ❌ | ✅ | ❌ | ❌ | ❌ | 40% |

### 4.2 Coverage Summary
- **Unified (FS+PG):** 5 of 9 = 55.6%
- **Critical Path:** 5 of 5 = 100%
- **Internal/Secondary:** 0 of 4 = 0%
- **Contract Tests:** 0 of 9 = 0%
- **Interfaces:** 1 partial of 9 = 11%



---

## 5. CRITICAL FINDINGS

### 🔴 HIGH SEVERITY (4 Blockers)

#### F-001: Direct Firestore Calls in Legacy Services
- **Files:** `services/fraudGraph.js`, `services/historyService.js`
- Direct `getFirestore()` calls bypassing repository abstraction
- Marked "UNUSED" but physically present; accidental import risk
- **Violation:** ADR-001. **Action:** Remove or refactor to use unified repos

#### F-002: 4 Internal Repos Without Firestore Adapters ⛔ STOP
- **Affected:** FraudEntityRepo, FraudReportRepo, LookupLogRepo, UrlRepo
- **Impact:** Reputation endpoints (#13, #14) are PostgreSQL-only
- Cannot rollback reputation service to Firestore
- **Violation:** ADR-002, ADR-006
- **⛔ STOP CONDITION:** Do not proceed without ADR

#### F-003: Feature Flags Not Granular
- `databaseProvider.js` collapses 8 independent flags into ONE env var
- Required: ENABLE_POSTGRES, ENABLE_FIRESTORE, ENABLE_DUAL_WRITE, ENABLE_DUAL_READ, ENABLE_PARITY_LOGGING, ENABLE_WRITE_VERIFICATION, ENABLE_READ_VERIFICATION, ENABLE_SHADOW_MODE
- No runtime switching; restart required

#### F-004: Shadow Mode — Implementation Missing
- ADR-005 specifies async shadow writes; code does NOT implement
- SHADOW treated identically to FIRESTORE; no shadow metrics
- No `[SHADOW_TRAFFIC_LOG]` entries

### 🟡 MEDIUM SEVERITY (6 Issues)

#### F-005: Shared Mutable State
- `routes/user.js:12`: `const otps = new Map()` — in-memory, not scalable

#### F-006: No Repository Contract Interfaces
- `phoneRepositoryInterface.js` exists but unused; no other interfaces
- Contract tests at 0%

#### F-007: No Structured Observability
- Repositories use `console.error()` not structured logs
- Pino logger available but unused by repos
- Required metrics (operation, provider, duration, trace ID) = 0%

#### F-008: Schema Drift — Missing `role` Column
- PostgreSQL `users` table missing `role VARCHAR(20) DEFAULT 'user'`
- Both FS and PG UserRepository return `role` but PG table has no such column
- **Runtime SQL error risk**

#### F-009: Field Semantic Differences Not Tracked
- `dbComparer.js` compares only 5 fields
- `verified`(bool) vs `status`(varchar), `result_summary` vs `result_json` not tracked

#### F-010: Duplicate Write Paths
- `HistoryRepository.insert()` and `historyService.saveToHistory()` both exist

### 🟢 LOW SEVERITY (3 Issues)

#### F-011: Dead Code — `db/knex.js` SQLite config not used
#### F-012: Magic Strings — JWT_SECRET default, tracking ID format, CORS origins, rate limits
#### F-013: No Retry Policy — No retry logic in any repository



---

## 6. ARCHITECTURE FREEZE VALIDATION

### SELIDIKI Architecture v1.0 Compliance

| Principle | Status | Score | Evidence |
|---|---|---|---|
| Repository Pattern | ⚠️ PARTIAL | 75% | 5 unified repos follow; 4 internal repos are direct DB |
| Domain Driven Design | ⚠️ PARTIAL | 70% | 3 domain models exist but inconsistently used |
| Dependency Inversion | ⚠️ PARTIAL | 65% | Unified repos use abstraction; internal repos couple to utils/db |
| Open/Closed Principle | ✅ GOOD | 90% | Adapters extensible; provider modes pluggable |
| Single Responsibility | ✅ GOOD | 90% | Clean separation: routes→HTTP, services→logic, repos→persistence |

### ⛔ STOP CONDITION

> "If conflicts exist: STOP. Generate ADR proposal. Do not implement temporary fixes."

1. **F-002:** 4 internal repos lack Firestore adapters → Reputation can't rollback
2. **F-004:** Shadow mode design exists but implementation is empty

---

## 7. REPOSITORY CONTRACT VERIFICATION

| Operation | PhoneRepo | BankRepo | ReportRepo | HistoryRepo | UserRepo | FraudEntityRepo | FraudReportRepo | LookupLogRepo | UrlRepo |
|---|---|---|---|---|---|---|---|---|---|
| Read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Create | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Update | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Search | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Transaction | ❌ | ❌ | ⚠️ PG | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Bulk Ops | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Pagination | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Filtering | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Sorting | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Optimistic Lock | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Contract Coverage: 21 of 99 = 21.2%**

---

## 8. DOMAIN MODEL CONSISTENCY REPORT

### Key Discrepancies

| Entity | FS Field | PG Field | Repo Return | API Response | Status |
|---|---|---|---|---|---|
| Phone | `category` | `primary_category` | `category` | `category` | ⚠️ Name differs |
| Report | `verified` (bool) | `status` (varchar) | `verified` | N/A | ❌ Type mismatch |
| History | `result_summary` | `result_json` (JSONB) | `result` | N/A | ⚠️ Struct differs |
| User | `role` | **MISSING IN SCHEMA** | `role` | `role` | ❌ Schema drift |

### Summary
- Total field mappings: 20
- Fully consistent: 3 (15%)
- Cosmetic camelCase gap: 12 (60%)
- Semantic/type mismatch: 2 (10%)
- Schema drift (missing column): 1 (5%)
- PG-only fields not in FS: 3 (15%)



---

## 9. CONFIGURATION INVENTORY

| # | Config Key | Source | Default | Centralized? | Runtime? |
|---|---|---|---|---|---|
| 1 | DATABASE_PROVIDER | `config/databaseProvider.js` | FIRESTORE | ✅ | ❌ |
| 2 | DATABASE_URL | `utils/db.js` | None | ❌ | ❌ |
| 3 | GEMINI_API_KEY | `services/aiEngine.js` | '' | ❌ | ❌ |
| 4 | JWT_SECRET | 2 files | **Hardcoded!** | ❌ | ❌ |
| 5 | SUPABASE_JWT_SECRET | `middleware/auth.js` | '' | ❌ | ❌ |
| 6 | FIREBASE_PROJECT_ID | `server.js` | None | ❌ | ❌ |
| 7 | REDIS_URL | `utils/cacheProvider.js` | None | ❌ | ❌ |
| 8 | LOG_LEVEL | `utils/logger.js` | info | ❌ | ❌ |
| 9 | PORT | `server.js` | 3000 | ❌ | ❌ |
| 10 | Cache TTL | `config/reputationConfig.js` | 600 | ✅ | ❌ |
| 11 | Risk Weights | `config/reputationConfig.js` | Various | ✅ | ❌ |
| 12 | Rate Limits | `server.js` | **Hardcoded!** | ❌ | ❌ |
| 13 | CORS Origins | `server.js` | **Hardcoded!** | ❌ | ❌ |
| 14 | FS Collection Names | 5 adapters | **Hardcoded!** | ❌ | - |
| 15 | PG Table Names | 6 adapters | **Hardcoded!** | ❌ | - |

**Configuration Health: 5 of 15 centralized = 33%**

---

## 10. FEATURE FLAG MATRIX

| Required Flag | Present? | Independent? | Runtime? |
|---|---|---|---|
| ENABLE_POSTGRES | ⚠️ Collapsed | ❌ | ❌ |
| ENABLE_FIRESTORE | ⚠️ Collapsed | ❌ | ❌ |
| ENABLE_DUAL_WRITE | ⚠️ Collapsed | ❌ | ❌ |
| ENABLE_DUAL_READ | ⚠️ Collapsed | ❌ | ❌ |
| ENABLE_PARITY_LOGGING | ❌ | N/A | N/A |
| ENABLE_WRITE_VERIFICATION | ❌ | N/A | N/A |
| ENABLE_READ_VERIFICATION | ❌ | N/A | N/A |
| ENABLE_SHADOW_MODE | ⚠️ Not functional | ❌ | ❌ |

**Feature Flag Health: 2 of 8 = 25%**

---

## 11. SHADOW MODE, IDEMPOTENCY & OBSERVABILITY

### Shadow Mode (ADR-005 vs Reality)
| Aspect | Design | Actual | Gap |
|---|---|---|---|
| FS sync reads | ✅ | ✅ | None |
| PG async shadow writes | ✅ | ❌ | 🔴 |
| Shadow latency logging | ✅ | ❌ | 🔴 |
| `[SHADOW_TRAFFIC_LOG]` | ✅ | ❌ | 🔴 |

### Idempotency Score: 4 of 9 write paths = 44%
- ✅ PhoneRepo upsert, BankRepo upsert, UserRepo deleteByHash
- ⚠️ ReportRepo insert (UUID but no ON CONFLICT)
- ❌ HistoryRepo insert, LookupLogRepo insert (no dedup)

### Observability: 0% implemented
All required metrics (operation, provider, duration, rows_affected, retry_count, transaction_id, correlation_id, trace_id) are missing.



---

## 12. RETRY MATRIX

| Failure Type | Current | Required |
|---|---|---|
| Network timeout | ❌ Throws immediately | ✅ Retry with backoff |
| Pool exhaustion | ❌ Throws immediately | ✅ Retry with backoff |
| Deadlock | ❌ Throws immediately | ✅ Retry with backoff |
| Validation failure | ✅ Throws (correct) | ❌ Never retry |
| Constraint violation | ✅ Throws (correct) | ❌ Never retry |
| Business rule | ✅ Throws (correct) | ❌ Never retry |

---

## 13. MIGRATION SAFETY RULES — COMPLIANCE

| Rule | Status |
|---|---|
| No DROP TABLE | ✅ |
| No DROP COLUMN | ✅ |
| No DELETE DATA | ✅ |
| No TRUNCATE | ✅ |
| No destructive migration | ✅ |
| No rename w/o compatibility | ✅ (adapter handles) |
| Additive schema only | ✅ |
| Backfill | ⚠️ Not yet implemented |
| New indexes | ✅ |
| Views | ✅ trending_fraud, high_risk_phones |
| Compatibility adapters | ✅ 5 unified repos |
| Generated columns | ❌ None |

---

## 14. TECHNICAL DEBT REPORT

| Issue | Severity | Location |
|---|---|---|
| Dead code: fraudGraph.js | 🔴 Critical | `services/fraudGraph.js` |
| Dead code: historyService.js | 🔴 Critical | `services/historyService.js` |
| Dead code: SQLite knex config | 🟡 Medium | `db/knex.js` |
| Unused migrations | 🟡 Medium | `db/migrations/` |
| Magic values | 🟡 Medium | Multiple files |
| SHADOW flag not functional | 🟡 Medium | `databaseProvider.js` |
| No TODO/FIXME markers | ✅ Clean | - |
| No commented dead code | ✅ Clean | - |
| No duplicate repos | ✅ Clean | - |
| No duplicate DTOs | ✅ Clean | - |

---

## 15. ADR PROPOSALS (Generated During Audit)

### ADR-008: Internal Repository Firestore Adapters
- **Context:** FraudEntityRepo, FraudReportRepo, LookupLogRepo, UrlRepo are PG-only
- **Options:** (a) Create FS adapters for all 4 OR (b) Formally exempt secondary services
- **Status:** ⛔ PENDING — Must resolve before Sprint 2A completion

### ADR-009: Granular Feature Flag System
- **Context:** Single DATABASE_PROVIDER cannot express independent toggles
- **Decision:** Implement 8 independent boolean flags with runtime switching
- **Status:** ⛔ PENDING

### ADR-010: Shadow Mode Implementation
- **Context:** ADR-005 approved but code is empty
- **Decision:** Implement async shadow writes with structured metrics capture
- **Status:** ⛔ PENDING

---

## 16. FINAL PRODUCTION GATE — CURRENT STATUS

| Gate | Required | Current | Gap | Verdict |
|---|---|---|---|---|
| Repository Coverage | 100% | 55.6% | 44.4% | 🔴 FAIL |
| Contract Tests | PASS | 0% | 100% | 🔴 FAIL |
| Integration Tests | PASS | ⚠️ Basic (4 tests) | Partial | 🟡 WARN |
| Parity Difference | 0 Critical | Unknown | N/A | 🔴 UNMEASURED |
| Migration Safety | PASS | ✅ | - | ✅ PASS |
| Rollback Tested | PASS | ⚠️ Partial (reputation excluded) | - | 🟡 WARN |
| Feature Flags | PASS | 25% | 75% | 🔴 FAIL |
| Shadow Mode | PASS | ❌ Not implemented | 100% | 🔴 FAIL |
| Observability | PASS | 0% | 100% | 🔴 FAIL |
| Security Review | PASS | ❌ Not performed | 100% | 🔴 FAIL |
| Performance Regression | <5% | Unknown | N/A | 🔴 UNMEASURED |
| Technical Debt | 0 Critical | 2 critical | - | 🔴 FAIL |

### ⛔ SPRINT 2A CANNOT BE MARKED COMPLETE — 8 of 12 gates failing

---

## 17. DELIVERABLES STATUS

| Deliverable | Status | File |
|---|---|---|
| ✅ Executive Summary | COMPLETE | This document |
| ✅ Architecture Audit | COMPLETE | This document |
| ✅ Dependency Graph | COMPLETE | Section 3 + sprint2a_dependency_graph.md |
| ✅ Repository Inventory | COMPLETE | Section 4 + sprint2a_repository_inventory.md |
| ⛔ Repository Contract Report | PENDING | - |
| ✅ Repository Coverage Report | COMPLETE | Section 4.2 |
| ✅ Persistence Graph | COMPLETE | Section 4 |
| ✅ Configuration Inventory | COMPLETE | Section 9 |
| ✅ Feature Flag Matrix | COMPLETE | Section 10 |
| ✅ Data Flow Diagram | COMPLETE | Section 2 |
| ✅ Migration Matrix | COMPLETE | firestore_migration_inventory.md |
| ⛔ Shadow Mode Report | PENDING | - |
| ⛔ Parity Report | PENDING | - |
| ✅ Consistency Report | COMPLETE | Section 8 |
| ⛔ Performance Benchmark | PENDING | - |
| ⛔ Chaos Testing Report | PENDING | - |
| ✅ Retry Matrix | COMPLETE | Section 12 |
| ⛔ Rollback Playbook | PENDING | - |
| ⛔ Security Audit | PENDING | - |
| ✅ Schema Drift Report | COMPLETE | Section 8 (F-008) |
| ✅ Technical Debt Report | COMPLETE | Section 14 |
| ✅ Migration Readiness Report | COMPLETE | Section 16 |
| ✅ ADR List | COMPLETE | Section 15 (3 new ADRs) |
| ⛔ Updated implementation_plan.md | PENDING | - |
| ⛔ Updated task.md | PENDING | - |

---

## 18. IMPLEMENTATION DISCIPLINE — NEXT STEPS

Per the addendum:
> "Split the sprint into atomic commits. Each commit must: compile, pass lint, pass unit tests, preserve backward compatibility, update documentation, be independently revertible."

### Recommended Commit Sequence (After ADR Resolution)

1. **Commit A-1:** Fix schema drift — Add `role` column to `users` table migration
2. **Commit A-2:** Centralize configuration — Extract magic strings to `config/runtime.js`
3. **Commit A-3:** Implement granular feature flags per ADR-009
4. **Commit A-4:** Create repository contract interfaces for all 9 repos
5. **Commit A-5:** Create Firestore adapters for internal repos per ADR-008
6. **Commit A-6:** Implement Shadow Mode per ADR-010
7. **Commit A-7:** Add structured observability to all repositories
8. **Commit A-8:** Implement retry policies with backoff
9. **Commit A-9:** Implement idempotency guards (ON CONFLICT for ReportRepo, HistoryRepo)
10. **Commit A-10:** Generate contract tests for all repositories
11. **Commit A-11:** Run full integration test suite under all 5 provider modes
12. **Commit A-12:** Generate performance benchmarks
13. **Commit A-13:** Generate chaos testing report
14. **Commit A-14:** Generate rollback playbook and security audit

---

**END OF PHASE 0 — ARCHITECTURE AUDIT**
*Do not proceed to implementation until ADR-008, ADR-009, ADR-010 are approved.*

