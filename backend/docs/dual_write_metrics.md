# 📈 Dual Write Metrics — Atomic Commit #8

**Date:** 2026-07-08

---

## Operational Metrics

| Metric | Source | Description |
|---|---|---|
| `primarySuccess` | `dualWriteManager.getMetrics()` | FS writes that succeeded |
| `primaryFailure` | `dualWriteManager.getMetrics()` | FS writes that failed |
| `secondarySuccess` | `dualWriteManager.getMetrics()` | PG writes that succeeded |
| `secondaryFailure` | `dualWriteManager.getMetrics()` | PG writes that failed |
| `dualSuccess` | `dualWriteManager.getMetrics()` | Both FS+PG succeeded |
| `mismatches` | `dualWriteManager.getMetrics()` | Accumulated mismatch count |
| `retries` | `dualWriteManager.getMetrics()` | Retryable failures |
| `dualSuccessRate` | Derived: `dualSuccess / operations * 100` | % of perfectly dual-written ops |
| `mismatchRate` | Derived: `mismatches / operations * 100` | % of ops with PG failure |
| `avgLatencyMs` | Derived: `totalLatencyMs / operations` | Average dual write latency |
| `operationCount` | `dualWriteManager.getMetrics()` | Total dual write operations |

---

## Access

```javascript
const { getMetrics, getMismatchCount } = require('../utils/dualWriteManager');
const m = getMetrics();
// { primarySuccess: 150, primaryFailure: 0, secondarySuccess: 147,
//   secondaryFailure: 3, dualSuccess: 147, mismatches: 3, retries: 2,
//   dualSuccessRate: 98, mismatchRate: 2, avgLatencyMs: 12, operationCount: 150 }
```

---

## Mismatch Registry Access

```javascript
const { getMismatches, getMismatchCount } = require('../utils/dualWriteManager');
const recent = getMismatches(10);
// [{ id, repository, operation, entity_hash, secondary_error, reason, retryable, created_at }, ...]
```

---

## Future: Data Parity Dashboard (Commit #9)

Dashboard will aggregate across all instances:
- Total writes across all repos
- Successful dual writes %
- Failed secondary writes
- Pending mismatches (retryable)
- Retry queue depth
- Parity percentage (dualSuccess / operations)
- Per-repository error rate
