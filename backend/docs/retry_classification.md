# 🔄 Retry Classification — Atomic Commit #8

**Date:** 2026-07-08

---

## Retryable Failures

| PG Error Code | Description | Retry? | Max Retries | Backoff |
|---|---|---|---|---|
| `08000` | Connection exception | ✅ | 3 | 1s, 2s, 4s |
| `08003` | Connection does not exist | ✅ | 3 | 1s, 2s, 4s |
| `08006` | Connection failure | ✅ | 3 | 1s, 2s, 4s |
| `40001` | Serialization failure | ✅ | 3 | 100ms, 200ms, 400ms |
| `40P01` | Deadlock detected | ✅ | 3 | 100ms, 200ms, 400ms |
| `57P01` | Admin shutdown | ✅ | 3 | 1s, 2s, 4s |
| `57P02` | Crash shutdown | ✅ | 3 | 1s, 2s, 4s |
| `57P03` | Cannot connect now | ✅ | 3 | 1s, 2s, 4s |
| `53300` | Too many connections | ✅ | 3 | 2s, 4s, 8s |
| `53400` | Configuration limit exceeded | ✅ | 3 | 2s, 4s, 8s |
| Secondary timeout | 2s exceeded | ✅ | 3 | 1s, 2s, 4s |

## Non-Retryable Failures

| Error Type | Description | Retry? | Action |
|---|---|---|---|
| `23505` | Unique violation | ❌ | Register mismatch; investigate |
| `23503` | Foreign key violation | ❌ | Register mismatch; investigate |
| `23502` | Not null violation | ❌ | Register mismatch; investigate |
| Validation error | Business rule | ❌ | Register mismatch; investigate |
| Constraint violation | CHECK constraint | ❌ | Register mismatch; investigate |

---

## Current Implementation

Retry is **not yet automated** in Sprint 2A. Mismatches are registered and categorized as retryable/non-retryable. Actual retry with backoff will be implemented in Sprint 2B observability phase.

| Classification | Behavior |
|---|---|
| Retryable | Logged as `SECONDARY_FAILED_RETRYABLE`; metrics counter incremented |
| Non-Retryable | Logged as `SECONDARY_FAILED_NONRETRYABLE`; mismatch registered |
