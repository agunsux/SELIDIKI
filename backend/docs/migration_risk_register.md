# 📋 Migration Risk Register — Sprint 2A

**Date:** 2026-07-08 | **Owner:** Engineering Lead  
**Review Cadence:** Daily during migration, weekly post-migration

---

## Active Risks

| # | Risk | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R-01 | Repository mismatch — FS and PG return different data for same query | Medium | High | `dbComparer.js` in DUAL_READ mode; parity logging; contract tests for every repository | Backend Lead | 🟡 MONITORING |
| R-02 | Data parity failure — FS has records PG doesn't (or vice versa) | Medium | High | Dual Write ensures both DBs receive writes; backfill script for historical data; consistency dashboard | Data Engineer | 🟡 MONITORING |
| R-03 | Firestore latency spike during dual write | Low | Medium | FS is primary; PG write is non-blocking try/catch; FS latency unaffected by PG | Backend Lead | 🟢 LOW |
| R-04 | PostgreSQL migration failure — schema apply fails in production | Low | Critical | Migrations are additive only; no DROP/TRUNCATE; tested in staging first; rollback to FIRESTORE | DevOps | 🟡 MONITORING |
| R-05 | Rollback timeout — reverting to Firestore takes >5 minutes | Low | High | Env var change + restart; dual write keeps FS current; <1 min target | DevOps | 🟢 LOW |
| R-06 | Connection pool exhaustion — PG pool saturated by dual writes | Medium | High | Separate shadow pool (25% of primary); connection timeout 5s; PG write is best-effort (failure doesn't block) | Backend Lead | 🟡 MONITORING |
| R-07 | Schema drift — production PG schema differs from migration files | Medium | Critical | Schema drift detection tool; no silent modifications; migration files are source of truth | Data Engineer | 🔴 ACTIVE (F-008: missing `role` column) |
| R-08 | Transaction deadlock — concurrent PG writes conflict | Low | Medium | PG ReportRepo uses explicit BEGIN/COMMIT/ROLLBACK; other repos use single-statement atomic ops | Backend Lead | 🟢 LOW |
| R-09 | Duplicate writes — idempotency failure causes duplicate reports/scans | Medium | High | ON CONFLICT for PhoneRepo/BankRepo; ReportRepo uses UUID trackingId; HistoryRepo and LookupLogRepo currently NOT idempotent (known gap) | Backend Lead | 🔴 ACTIVE (F-013: HistoryRepo, LookupLogRepo) |
| R-10 | Read inconsistency — DUAL_READ shows different results mid-write | Low | Medium | DUAL_READ returns FS result; PG comparison is informational only; no user impact | Backend Lead | 🟢 LOW |
| R-11 | Feature flag failure — flag system causes incorrect routing | Low | Critical | Flag validation at startup; backward compatible with DATABASE_PROVIDER; admin endpoint audit logged; invalid combos rejected | Backend Lead | 🟡 MONITORING |
| R-12 | Partial migration — some endpoints on FS, some on PG | Medium | High | All 15 endpoints use unified repos after ADR-008; provider applies uniformly; no per-endpoint routing | Backend Lead | 🔴 ACTIVE (F-002: 4 repos PG-only) |
| R-13 | Shadow mode event loop saturation | Low | Medium | Event loop lag check (>50ms skip); separate PG pool; setImmediate scheduling; sampling rate for high traffic | Backend Lead | 🟢 LOW |
| R-14 | Legacy code reactivation — fraudGraph.js or historyService.js accidentally imported | Low | Critical | Remove or fully refactor before Sprint 2A completion; grep verification in CI | Backend Lead | 🔴 ACTIVE (F-001) |
| R-15 | Performance regression >5% after PG cutover | Medium | High | Baseline captured (baseline_report.md); performance benchmark before/after; DUAL_READ comparison; shadow latency monitoring | Backend Lead | 🟡 MONITORING |
| R-16 | Security regression — PG exposes data FS rules protected | Low | Critical | Security audit required; least-privilege PG roles; row-level security if needed; credential rotation | Security Lead | 🔴 NOT STARTED |

---

## Risk Summary

| Severity | Count | Action |
|---|---|---|
| 🔴 ACTIVE (Mitigation Incomplete) | 4 | F-001, F-002, F-008, F-013 |
| 🟡 MONITORING (Mitigation Active) | 7 | R-01, R-02, R-04, R-06, R-11, R-12, R-15 |
| 🟢 LOW (Accepted) | 5 | R-03, R-05, R-08, R-10, R-13 |

---

## Review Log

| Date | Reviewer | Changes |
|---|---|---|
| 2026-07-08 | Principal Engineer | Initial risk register created during Phase 0 Audit |
