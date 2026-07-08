# 💥 Integration & Chaos Test Plan — Commit #12

**Date:** 2026-07-09 | **Status:** SPEC COMPLETE | **Execution:** Pre-cutover

---

## Chaos Scenarios

| # | Scenario | Expected Behavior | User Impact | Status |
|---|---|---|---|---|
| 1 | PostgreSQL DOWN (connection refused) | FS continues; PG failures logged; circuit breaker opens | Zero | ⏳ |
| 2 | PostgreSQL TIMEOUT (slow query >3s) | FS returns; PG shadow/dual times out; timeout counter incremented | Zero | ⏳ |
| 3 | PostgreSQL slow query (500ms-2s) | FS returns; PG completes within timeout; latency spike recorded | Minor (latency) | ⏳ |
| 4 | Connection pool exhausted | PG returns 53300; classified as retryable; circuit breaker opens | Zero | ⏳ |
| 5 | Firestore restart (simulated) | Primary fails → error returned to user (correct) | 500 error | ⏳ |
| 6 | Network partition (FS↔PG) | PG unreachable; dual write logs mismatch; shadow skips | Zero | ⏳ |
| 7 | Partial write (FS succeeds, PG mid-write failure) | FS committed; PG rolled back; mismatch registered | Zero | ⏳ |
| 8 | Disk full (PG write failure) | PG inserts fail; classified as non-retryable; mismatches logged | Zero | ⏳ |
| 9 | Retry storm (rapid PG failures) | Circuit breaker opens after 5 failures; all subsequent attempts skipped | Zero | ⏳ |
| 10 | Circuit breaker oscillation | CB opens → 30s cooldown → half-open → success → closed | Zero | ⏳ |

## Integration Test Scenarios

| # | Test | Method |
|---|---|---|
| 1 | Full user flow: OTP → verify → check phone → report → history | End-to-end API test |
| 2 | Dual Write: insert → verify FS → verify PG | DB comparison |
| 3 | Dual Read: read FS → read PG → compare | parity assertion |
| 4 | Shadow: enable SHADOW → verify async PG execution | log verification |
| 5 | Kill switch: enable → verify all traffic to FS | provider assertion |
| 6 | Provider switch: FIRESTORE → POSTGRES → FIRESTORE | rollback verification |
