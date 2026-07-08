# 👻 Shadow Mode Report — Atomic Commit #9

**Date:** 2026-07-08 | **Status:** ✅ IMPLEMENTED

---

## Architecture

```
Client Request
      │
      ▼
Firestore (synchronous, primary)
      │
      ├── Result returned to user IMMEDIATELY
      │
      └── setImmediate (async, fire-and-forget)
            │
            ├── Circuit breaker check
            ├── Sampling check
            │
            ▼
         PostgreSQL (async shadow)
            │
            ├── SUCCESS → Drift detection → [SHADOW_TRAFFIC_LOG]
            ├── TIMEOUT → Trip circuit → [SHADOW_TRAFFIC_LOG]
            └── FAILED  → Trip circuit → [SHADOW_TRAFFIC_LOG]
```

## Safety Guarantees

| Guarantee | Implementation |
|---|---|
| Zero user latency impact | `setImmediate` — user gets FS result before PG starts |
| No unhandled rejections | Full `try/catch` in async callback |
| Circuit breaker | Opens after 5 consecutive failures; retries after 30s |
| Sampling | `SHADOW_SAMPLE_RATE=0.0-1.0`; skipped operations counted |
| Configurable timeout | `SHADOW_TIMEOUT_MS=3000` |

## Metrics

| Metric | Access |
|---|---|
| `attemptTotal` | `shadowManager.getMetrics().attemptTotal` |
| `successTotal` | `shadowManager.getMetrics().successTotal` |
| `failureTotal` | `shadowManager.getMetrics().failureTotal` |
| `skippedTotal` | `shadowManager.getMetrics().skippedTotal` |
| `timeoutTotal` | `shadowManager.getMetrics().timeoutTotal` |
| `driftTotal` | `shadowManager.getMetrics().driftTotal` |
| `successRate` | `shadowManager.getMetrics().successRate` |
| `driftRate` | `shadowManager.getMetrics().driftRate` |
| `avgLatencyMs` | `shadowManager.getMetrics().avgLatencyMs` |
| Circuit status | `shadowManager.isCircuitOpen()` |

## Drift Detection

Compares FS result vs PG result across fields:
`riskScore`, `reportsCount`, `category`, `isBlocked`, `isConfirmedFraud`,
`phoneHash`, `accountHash`, `trackingId`, `userHash`, `role`, `status`

Logged as `[SHADOW_TRAFFIC_LOG]` with `result: "DRIFT_DETECTED"` and per-field diffs.

## Feature Flag

`ENABLE_SHADOW_MODE=true` — shadow executes.  
`ENABLE_SHADOW_MODE=false` — shadow skipped entirely (no overhead).
