# 💥 Dual Write Failure Matrix — Atomic Commit #8

**Date:** 2026-07-08

---

| # | Scenario | Primary (FS) | Secondary (PG) | User Result | Audit Log | Mismatch | Retry? |
|---|---|---|---|---|---|---|---|
| 1 | Both succeed | ✅ | ✅ | Success | `DUAL_SUCCESS` | No | N/A |
| 2 | Primary fails | ❌ | N/A | Error thrown | `PRIMARY_FAILED` | No | N/A |
| 3 | PG down (connection refused) | ✅ | ❌ ECONNREFUSED | Success | `SECONDARY_FAILED_RETRYABLE` | Yes | ✅ |
| 4 | PG timeout (>2s) | ✅ | ❌ Timeout | Success | `SECONDARY_FAILED_RETRYABLE` | Yes | ✅ |
| 5 | Constraint violation (duplicate) | ✅ | ❌ 23505 | Success | `SECONDARY_FAILED_NONRETRYABLE` | Yes | ❌ |
| 6 | FK violation | ✅ | ❌ 23503 | Success | `SECONDARY_FAILED_NONRETRYABLE` | Yes | ❌ |
| 7 | Network interruption (mid-write) | ✅ | ❌ Connection lost | Success | `SECONDARY_FAILED_RETRYABLE` | Yes | ✅ |
| 8 | PG pool exhausted | ✅ | ❌ 53300 | Success | `SECONDARY_FAILED_RETRYABLE` | Yes | ✅ |
| 9 | Partial commit (PG rolled back) | ✅ | ❌ (rolled back) | Success | `SECONDARY_FAILED_NONRETRYABLE` | Yes | ❌ |
| 10 | Firestore down | ❌ | N/A | Error thrown | `PRIMARY_FAILED` | No | N/A |

---

## Key Rules

1. **Primary failure ALWAYS fails the request** — user sees error
2. **Secondary failure NEVER fails the request** — user sees success
3. **Retryable failures** — counter incremented; retry logic deferred to Sprint 2B
4. **Non-retryable failures** — mismatch registered for investigation
5. **No cross-database transaction** — accepted per ADR-004

## Idempotency

| Scenario | Result |
|---|---|
| Retry same request (duplicate trackingId) | FS: merge (upsert); PG: ON CONFLICT → 1 row each |
| Retry with no unique key (HistoryRepo) | ⚠️ May create duplicate (known gap F-013) |
