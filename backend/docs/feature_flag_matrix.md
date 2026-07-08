# 🚩 Feature Flag Matrix — Atomic Commit #7

**Date:** 2026-07-08 | **Sprint:** 2A

---

## Flag Inventory

| # | Flag | Type | Default | Production Safe | Dev | Description |
|---|---|---|---|---|---|---|
| 1 | `ENABLE_DATABASE_SWITCHING` | Kill Switch | `false` | `false` | `false` | Global emergency brake. When false, ALL traffic → Firestore regardless of other flags. |
| 2 | `DATABASE_PROVIDER` | Provider (legacy) | `FIRESTORE` | `FIRESTORE` | `FIRESTORE` | Backward-compatible provider selector. Maps to granular flags. |
| 3 | `ENABLE_FIRESTORE` | Provider | `true` | `true` | `true` | Whether Firestore adapter is available. Must be true in Sprint 2A. |
| 4 | `ENABLE_POSTGRES` | Provider | `false` | `false` | `false` | Whether PostgreSQL adapter is available. Enabled in Commit #7+ |
| 5 | `ENABLE_DUAL_WRITE` | Mode | `false` | `false` | `false` | Write to both FS (primary) + PG (best-effort). Requires ENABLE_POSTGRES=true. |
| 6 | `ENABLE_DUAL_READ` | Mode | `false` | `false` | `false` | Read from both FS + PG, compare, return FS. Requires ENABLE_DUAL_WRITE=true. |
| 7 | `ENABLE_SHADOW_MODE` | Mode | `false` | `false` | `false` | Async PG shadow execution. Requires ENABLE_POSTGRES=true. |
| 8 | `ENABLE_PARITY_LOGGING` | Observability | `false` | `true` (staging) | `true` | Log [MIGRATION_PARITY_DIFF] when FS and PG results differ. |
| 9 | `ENABLE_WRITE_VERIFY` | Observability | `false` | `false` | `true` | Verify PG write succeeded before returning (adds latency). |
| 10 | `ENABLE_READ_VERIFY` | Observability | `false` | `false` | `true` | Verify PG read matches FS read before returning (adds latency). |

---

## Valid Combinations (Sprint 2A)

| Combination | Valid? | Flags |
|---|---|---|
| Firestore Only | ✅ | `DATABASE_SWITCHING=false` (kill switch default) |
| Firestore Only | ✅ | `DATABASE_SWITCHING=true, FIRESTORE=true, POSTGRES=false` |
| PostgreSQL Only | ✅ | `DATABASE_SWITCHING=true, FIRESTORE=false, POSTGRES=true` |
| Dual Write | ✅ | `DATABASE_SWITCHING=true, FIRESTORE=true, POSTGRES=true, DUAL_WRITE=true` |
| Dual Read | ✅ | `DATABASE_SWITCHING=true, FIRESTORE=true, POSTGRES=true, DUAL_WRITE=true, DUAL_READ=true` |
| Shadow (parallel) | ✅ | `DATABASE_SWITCHING=true, POSTGRES=true, SHADOW_MODE=true` |

## Invalid Combinations (Rejected at Startup)

| Combination | Error |
|---|---|
| `DUAL_WRITE=true, POSTGRES=false` | `ENABLE_DUAL_WRITE=true requires ENABLE_POSTGRES=true` |
| `DUAL_READ=true, DUAL_WRITE=false` | `ENABLE_DUAL_READ=true requires ENABLE_DUAL_WRITE=true` |
| `SHADOW_MODE=true, POSTGRES=false` | `ENABLE_SHADOW_MODE=true requires ENABLE_POSTGRES=true` |
| `FIRESTORE=false, POSTGRES=false` | `At least one provider must be enabled` |
