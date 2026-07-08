# ⏱️ Dual Write Latency Budget — Atomic Commit #8

**Date:** 2026-07-08 | **SLA Target:** <5% primary latency increase

---

## Budget Allocation

| Component | Budget | Notes |
|---|---|---|
| Primary write (Firestore) | Baseline | Existing latency; no change |
| Secondary write (PostgreSQL) | ≤ 2 seconds | Hard timeout via `Promise.race` |
| Audit logging | Asynchronous | Non-blocking; runs in same tick |
| Mismatch registration | In-memory | O(1) array push |
| Total overhead target | ≤ 5% of primary latency | Excluding PG write (parallel) |

---

## Timeout Strategy

```javascript
await Promise.race([
  secondaryWrite(),                                    // PG write
  new Promise((_, reject) =>                           // Timeout guard
    setTimeout(() => reject(new Error('Secondary write timeout')), 2000)
  ),
]);
```

- PG write has 2 seconds to complete
- If PG exceeds 2s → timeout error → logged as retryable failure
- Primary result is already returned to user
- No blocking of user response

---

## Expected Latency

| Scenario | Primary (FS) | Secondary (PG) | Total | User Impact |
|---|---|---|---|---|
| Both succeed | 3-5ms | 5-20ms | 5-20ms | None |
| PG slow but within timeout | 3-5ms | 500-1900ms | 500-1900ms | Minor |
| PG timeout | 3-5ms | 2000ms | 5ms | None (FS returned first) |
| PG down | 3-5ms | <100ms (connection refused) | 5ms | None |
