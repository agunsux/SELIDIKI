# 🏛️ Architecture Review Meeting — Sprint 2A Gate

**Date:** 2026-07-08 | **Review Board:** Principal Engineer  
**ADRs Under Review:** ADR-008, ADR-009, ADR-010

---

## ADR-008: Internal Repository Firestore Adapters

### Checklist Evaluation

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | No service knows Firestore | ⚠️ FAIL | `fraudGraph.js` & `historyService.js` still have `getFirestore()`. ADR-008 does not address removal. |
| 2 | No service knows PostgreSQL | ✅ PASS | After ADR-008, `reputationService.js` uses unified repos |
| 3 | No conditional provider in business logic | ✅ PASS | Provider selection stays in repository layer |
| 4 | All providers in Infrastructure Layer | ✅ PASS | `databaseProvider.js` + feature flags in `config/` |
| 5 | Dependency Injection remains simple | ⚠️ FAIL | Static methods only; no DI pattern documented |

### Decision: **APPROVED WITH CHANGES** (3 conditions)

**Required Revisions:**
1. Add "Legacy Service Cleanup" section — commit to removing/refactoring `fraudGraph.js` and `historyService.js` so `grep -r 'getFirestore' --include='*.js' | grep -v repositories/firestore/` returns zero
2. Add "Dependency Injection Strategy" section — explicitly state static method pattern is accepted for 9-repo scale
3. Add "Verification Checklist" — zero direct Firestore calls outside adapters

---

## ADR-009: Granular Feature Flag System

### Dual Write Strategy Checklist

| # | Question | Status |
|---|---|---|
| 1 | Synchronous? | ⚠️ Not explicitly documented |
| 2 | Asynchronous? | ❌ Not documented |
| 3 | Outbox Pattern? | ❌ Not mentioned |
| 4 | Event Queue? | ❌ Not mentioned |
| 5 | Transactional? | ❌ Not mentioned |

### Decision: **APPROVED WITH CHANGES** (4 conditions)

**Required Revisions:**
1. Add "Dual Write Strategy" section — explicitly document: **"Write-Primary-First, Best-Effort-Secondary"** (FS→success→PG try/catch, PG failure logged as `[MIGRATION_PARITY_DIFF]`). No cross-DB transaction (accepted per ADR-004)
2. Add "Rejected Patterns" section — explicitly rule out Outbox, Event Queue, 2PC with rationale
3. Add "Flag Validation Rules" — invalid combos: DUAL_WRITE without FIRESTORE+POSTGRES both true; DUAL_READ without DUAL_WRITE. Throw on startup
4. Add "Flag State Machine" — FIRESTORE→DUAL_WRITE→DUAL_READ→POSTGRES (SHADOW parallel at any stage)


---

## ADR-010: Shadow Mode Implementation

### Runtime Provider Checklist

| # | Question | Status |
|---|---|---|
| 1 | How is provider selected? | ⚠️ PARTIAL — env var + admin endpoint, no Runtime Registry |
| 2 | Environment variable? | ✅ `ENABLE_SHADOW_MODE` |
| 3 | Configuration service? | ❌ Not documented |
| 4 | Feature Flag? | ✅ |
| 5 | Runtime registry? | ❌ Not documented |
| 6 | How does provider change at runtime? | ⚠️ Admin endpoint not fully specified |
| 7 | How is rollback done? | ✅ Set flag to false |
| 8 | How do tests select provider? | ❌ Not documented |

### Decision: **APPROVED WITH CHANGES** (4 conditions)

1. Add "Runtime Provider Registry" — `ProviderRegistry` class: `register(name, adapter)`, `setActive(name)`, `getActive()`. Enables test mock injection
2. Add "Admin Endpoint Specification" — `POST /api/v1/admin/feature-flags`, auth `requireRole(['admin'])`, body validation, atomic update, audit log, response: `{success, previous, current}`
3. Add "Test Provider Selection" — `beforeAll` sets flags; mocks via registry; contract tests iterate `[firestoreAdapter, postgresAdapter]`; no live DB
4. Add "Shadow Sampling Strategy" — `SHADOW_SAMPLE_RATE` (0.0-1.0) for high-traffic; `Math.random() < rate` per operation

---

## Final Decisions

| ADR | Decision | Conditions | Status |
|---|---|---|---|
| ADR-008 | APPROVED WITH CHANGES | 3 (legacy cleanup, DI strategy, verification) | ⚠️ Revise |
| ADR-009 | APPROVED WITH CHANGES | 4 (write strategy, rejected patterns, validation, state machine) | ⚠️ Revise |
| ADR-010 | APPROVED WITH CHANGES | 4 (provider registry, admin spec, test strategy, sampling) | ⚠️ Revise |

**No ADR REJECTED. No ADR DEFERRED.** All conditionally approved.

**Gate Status:** ⛔ NOT PASSED — ADR revisions required.  
**Next Gate:** Migration Risk Register + Migration Exit Criteria before commit #1.

