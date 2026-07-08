# 🔄 Dual Read Report — Atomic Commit #10

**Date:** 2026-07-09 | **Status:** ✅ IMPLEMENTED

---

## Architecture

```
Client Request
      │
      ▼
Firestore Read (synchronous, primary)
      │
      ├── Result returned to user IMMEDIATELY
      │
      └── PostgreSQL Read (synchronous, comparison)
            │
            ├── MATCH → [DUAL_READ_PARITY] logged
            ├── DRIFT → Severity-classified diffs logged
            └── PG_FAILED → Error logged; FS result still returned
```

**Firestore is ALWAYS the response source.** PostgreSQL is comparison only.

## Strategy

`Read-Firestore-First, Compare-PostgreSQL, Return-Firestore`

- Phase 1: Firestore read — must succeed (propagates error to caller)
- Phase 2: PostgreSQL read — comparison only (failure does not block)
- Return: Always Firestore result

## Metrics

| Metric | Access |
|---|---|
| `totalComparisons` | `dualReadManager.getMetrics().totalComparisons` |
| `totalMatches` | `dualReadManager.getMetrics().totalMatches` |
| `totalDrifts` | `dualReadManager.getMetrics().totalDrifts` |
| `matchRate` | `dualReadManager.getMetrics().matchRate` (XX.XX%) |
| `driftRate` | `dualReadManager.getMetrics().driftRate` (XX.XX%) |
| Per-severity: `driftCritical`, `driftHigh`, `driftMedium`, `driftLow` | |
| Per-repo: `perRepo[repo] = { comparisons, matches, drifts, critical, high, medium, low }` | |

## Covered Read Operations

| Repository | Method | Dual Read? |
|---|---|---|
| PhoneRepository | `findByHash` | ✅ |
| BankAccountRepository | `findByHashAndBank` | ✅ |
| ReportRepository | `findTrending` | ✅ |
| HistoryRepository | `findByUserHash` | ✅ |
| UserRepository | `findByFirebaseUid`, `findByHash` | ✅ |

## Feature Flag

`ENABLE_DUAL_READ=true` — dual read active.  
`ENABLE_DUAL_READ=false` — single read (Firestore only).
