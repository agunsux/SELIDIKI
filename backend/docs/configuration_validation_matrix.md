# ✅ Configuration Validation Matrix — Atomic Commit #7

**Date:** 2026-07-08

---

## Validation Rules

| # | Check | Valid Example | Invalid Example | Error Message | Startup? |
|---|---|---|---|---|---|
| 1 | DUAL_WRITE requires POSTGRES | `POSTGRES=true, DUAL_WRITE=true` | `POSTGRES=false, DUAL_WRITE=true` | `ENABLE_DUAL_WRITE=true requires ENABLE_POSTGRES=true` | ❌ FAIL |
| 2 | DUAL_READ requires DUAL_WRITE | `DUAL_WRITE=true, DUAL_READ=true` | `DUAL_WRITE=false, DUAL_READ=true` | `ENABLE_DUAL_READ=true requires ENABLE_DUAL_WRITE=true` | ❌ FAIL |
| 3 | SHADOW requires POSTGRES | `POSTGRES=true, SHADOW=true` | `POSTGRES=false, SHADOW=true` | `ENABLE_SHADOW_MODE=true requires ENABLE_POSTGRES=true` | ❌ FAIL |
| 4 | At least one provider | `FIRESTORE=true \|\| POSTGRES=true` | `FIRESTORE=false, POSTGRES=false` | `At least one provider must be enabled` | ❌ FAIL |
| 5 | Kill switch overrides all | `DATABASE_SWITCHING=false` | Any flags with POSTGRES/DUAL/SHADOW true | Override silently (safe) | ✅ OK |
| 6 | Unknown DATABASE_PROVIDER | `DATABASE_PROVIDER=FIRESTORE` | `DATABASE_PROVIDER=INVALID` | Ignored (defaults to FIRESTORE) | ⚠️ WARN |

---

## Startup Behavior Matrix

| Scenario | Flags | Validation | Server Starts? | Active Provider |
|---|---|---|---|---|
| Default (no env vars) | All defaults | ✅ PASS | ✅ Yes | FIRESTORE |
| Kill switch engaged | `DATABASE_SWITCHING=false, POSTGRES=true` | ✅ PASS (PG forced false) | ✅ Yes | FIRESTORE |
| Valid PG | `DATABASE_SWITCHING=true, POSTGRES=true` | ✅ PASS | ✅ Yes | DUAL (FS+PG) |
| Valid DUAL_WRITE | `DATABASE_SWITCHING=true, POSTGRES=true, DUAL_WRITE=true` | ✅ PASS | ✅ Yes | DUAL_WRITE |
| Invalid: DUAL_WRITE w/o PG | `DATABASE_SWITCHING=true, POSTGRES=false, DUAL_WRITE=true` | ❌ FAIL | ❌ No | N/A |
| Invalid: DUAL_READ w/o DUAL_WRITE | `DATABASE_SWITCHING=true, DUAL_READ=true, DUAL_WRITE=false` | ❌ FAIL | ❌ No | N/A |
| Invalid: no provider | `DATABASE_SWITCHING=true, FIRESTORE=false, POSTGRES=false` | ❌ FAIL | ❌ No | N/A |
| Legacy: DATABASE_PROVIDER=POSTGRES | `DATABASE_PROVIDER=POSTGRES` | ✅ PASS (mapped) | ✅ Yes | DUAL (FS+PG) |

---

## Error Message Format

All validation errors follow:
```
FATAL: Feature flag validation failed. Server cannot start.
⛔ Feature flag validation FAILED:
  - ENABLE_DUAL_WRITE=true requires ENABLE_POSTGRES=true
  - ENABLE_DUAL_READ=true requires ENABLE_DUAL_WRITE=true
```
