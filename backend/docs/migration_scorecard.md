# 📊 Migration Scorecard — Sprint 2A → 2B

**Version:** 1.0.0 | **Owner:** Engineering Lead  
**Purpose:** Single reference for PostgreSQL cutover decision

---

## Operational KPIs

| KPI | Target | Actual | Status |
|---|---|---|---|
| Overall Match Rate | ≥99.99% | — | ⬜ Pending observation |
| Critical Drift | = 0 | — | ⬜ |
| High-Severity Match | ≥99.99% | — | ⬜ |
| Dual Write Success Rate | ≥99.9% | — | ⬜ |
| PG Write p95 Latency | <80ms | — | ⬜ |
| PG Write p99 Latency | <150ms | — | ⬜ |
| PG Read p95 Latency | <50ms | — | ⬜ |
| PG Read p99 Latency | <100ms | — | ⬜ |
| Shadow Success Rate | >99.9% | — | ⬜ |
| PG Timeout Rate | <1% | — | ⬜ |
| Circuit Breaker Open Time | <0.5% | — | ⬜ |
| Retry Backlog | = 0 | — | ⬜ |

## Validation Gates

| Gate | Target | Status |
|---|---|---|
| Chaos Tests (10 scenarios) | ALL PASS | ⬜ |
| Performance Benchmarks (8 ops) | ALL PASS | ⬜ |
| Rollback Drill (≤30s recovery) | PASS × 3 | ⬜ |
| 14-Day Observation | All KPIs green | ⬜ |
| Security Audit | PASS | ⬜ |
| Executive Sign-off (ADR-007) | Approved | ⬜ |

## Per-Repository Health

| Repository | Match % | Drifts | Latency | Ready? |
|---|---|---|---|---|
| PhoneRepository | — | — | — | ⬜ |
| BankAccountRepository | — | — | — | ⬜ |
| ReportRepository | — | — | — | ⬜ |
| HistoryRepository | — | — | — | ⬜ |
| UserRepository | — | — | — | ⬜ |
| FraudEntityRepository | — | — | — | ⬜ |
| FraudReportRepository | — | — | — | ⬜ |
| LookupLogRepository | — | — | — | ⬜ |
| UrlRepository | — | — | — | ⬜ |

---

**Cutover Decision:** DEFERRED to Sprint 2B  
**Requirement:** ALL gates GREEN for ≥14 consecutive days
