# 🚪 Migration Exit Criteria — Sprint 2A

**Date:** 2026-07-08 | **Version:** 1.0.0  
**Rule:** Sprint 2A SHALL NOT be marked COMPLETE until ALL criteria below are PASS.

---

## Mandatory Exit Gates

| # | Criterion | Current Status | Required | Owner | Evidence |
|---|---|---|---|---|---|
| G-01 | Repository Coverage | 🔴 55.6% | 100% | Backend Lead | All 9 repos have FS+PG adapters |
| G-02 | Endpoint Parity | 🟡 83% | 100% | Backend Lead | All 15 endpoints support dual-DB |
| G-03 | Repository Contract Tests | 🔴 0% | 100% PASS | QA Lead | Contract test suite passes for all 9 repos under FS and PG |
| G-04 | Integration Tests | 🟡 4 tests | All PASS | QA Lead | Full suite passes under all 5 provider modes |
| G-05 | Performance Regression | 🔴 Unknown | <5% | Backend Lead | Baseline vs PG comparison report |
| G-06 | Shadow Mode | 🔴 0% | PASS | Backend Lead | Shadow metrics capturing; no user latency impact |
| G-07 | Rollback Tested | 🟡 Partial | PASS | DevOps | FIRESTORE rollback <1 min; all 15 endpoints verified |
| G-08 | Security Audit | 🔴 Not started | PASS | Security Lead | SQL injection, FS rules, least privilege, secrets |
| G-09 | Chaos Testing | 🔴 Not started | PASS | QA Lead | Timeout, deadlock, disconnect, constraint violation tests |
| G-10 | No Critical Technical Debt | 🔴 2 critical | 0 Critical | Backend Lead | fraudGraph.js and historyService.js resolved |
| G-11 | No Open Critical ADR | 🔴 3 open | 0 Open | Architect | ADR-008, ADR-009, ADR-010 approved |
| G-12 | Feature Flag System | 🔴 25% | PASS | Backend Lead | 8 independent flags; runtime switching; validation |
| G-13 | Observability | 🔴 0% | PASS | Backend Lead | Structured logs for all repo operations |
| G-14 | Migration Safety | ✅ PASS | PASS | DevOps | No DROP/DELETE/TRUNCATE; additive only |
| G-15 | Data Consistency | 🔴 Unknown | 0 Critical Diff | Data Engineer | Record count, checksum, timestamp parity |
| G-16 | Idempotency | 🟡 44% | 100% (write paths) | Backend Lead | No duplicate reports/scans/history on retry |

---

## Gate Status Summary

| Status | Count | Gates |
|---|---|---|
| ✅ PASS | 1 | G-14 (Migration Safety) |
| 🟡 WARN | 3 | G-02, G-04, G-07 |
| 🔴 FAIL | 12 | G-01, G-03, G-05, G-06, G-08, G-09, G-10, G-11, G-12, G-13, G-15, G-16 |

### ⛔ Sprint 2A: NOT READY (1 of 16 gates passing)

---

## Exit Checklist (To Be Signed Off)

| Item | Sign-off Authority | Signed? |
|---|---|---|
| All 16 gates PASS | Engineering Lead | ⬜ |
| ADR-008/009/010 revisions approved | Architect | ⬜ |
| Performance benchmark <5% regression | Backend Lead | ⬜ |
| 14-day observation period completed | DevOps | ⬜ |
| Rollback playbook tested | DevOps | ⬜ |
| Security audit completed | Security Lead | ⬜ |
| Firestore decommission NOT executed (by design) | Architect | ⬜ |
| Documentation updated | Tech Writer | ⬜ |

---

## Post-Exit (Sprint 2B Prerequisites)

1. 14-day observation period with DUAL_WRITE in staging
2. Parity report from production-like traffic
3. Firestore decommission criteria met (ADR-007)
4. Executive sign-off for PG cutover

---

**DO NOT CLOSE SPRINT 2A UNTIL ALL 16 GATES ARE GREEN.**
