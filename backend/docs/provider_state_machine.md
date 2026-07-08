# 🔄 Provider State Machine — Atomic Commit #7

**Date:** 2026-07-08 | **Version:** Sprint 2A

---

## State Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    FIRESTORE (default)                   │
│  FS=true, PG=false, DW=false, DR=false, SH=false        │
│  All reads/writes → Firestore                           │
│  PostgreSQL: registered but dormant                     │
└────────────────────┬────────────────────────────────────┘
                     │ enable PG
                     │ (ENABLE_POSTGRES=true)
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    POSTGRES (manual only)                │
│  FS=true, PG=true, DW=false, DR=false, SH=false         │
│  Reads/writes → resolvable to either (FS default)       │
│  Both adapters loaded, FS active                        │
└────────────────────┬────────────────────────────────────┘
                     │ enable Dual Write
                     │ (ENABLE_DUAL_WRITE=true)
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    DUAL WRITE                            │
│  FS=true, PG=true, DW=true, DR=false, SH=false          │
│  Writes → FS (primary) + PG (best-effort)               │
│  Reads → FS only                                        │
│  Shadow can run in parallel at any stage after PG        │
└────────────────────┬────────────────────────────────────┘
                     │ enable Dual Read
                     │ (ENABLE_DUAL_READ=true)
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    DUAL READ                             │
│  FS=true, PG=true, DW=true, DR=true, SH=false           │
│  Writes → FS + PG (dual)                                │
│  Reads → FS + PG (compare, return FS)                   │
│  Parity diffs logged                                    │
└────────────────────┬────────────────────────────────────┘
                     │ observation period (14 days, 0% drift)
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 POSTGRES PRIMARY (Sprint 3)              │
│  FS=false, PG=true                                      │
│  Firestore decommissioned (ADR-007 criteria met)        │
└─────────────────────────────────────────────────────────┘

SHADOW MODE (parallel, any stage after PG enabled):
┌─────────────────────────────────────────────────────────┐
│  ENABLE_SHADOW_MODE=true                                │
│  FS=sync, PG=async (fire-and-forget)                    │
│  FS result returned to user                             │
│  PG result → metrics only                               │
│  Separate PG connection pool (25% of primary)           │
└─────────────────────────────────────────────────────────┘
```

---

## State Transition Rules

| From | To | Preconditions | Exit Conditions | Rollback |
|---|---|---|---|---|
| FIRESTORE | POSTGRES | `ENABLE_POSTGRES=true` | PG adapter loaded; FS still primary | Set `ENABLE_POSTGRES=false` |
| POSTGRES | DUAL_WRITE | `ENABLE_DUAL_WRITE=true`, `ENABLE_POSTGRES=true` | Both adapters functional; FS is primary writer | Set `ENABLE_DUAL_WRITE=false` |
| DUAL_WRITE | DUAL_READ | `ENABLE_DUAL_READ=true`, `ENABLE_DUAL_WRITE=true` | Parity logging active; comparison working | Set `ENABLE_DUAL_READ=false` |
| Any | SHADOW | `ENABLE_SHADOW_MODE=true`, `ENABLE_POSTGRES=true` | Shadow PG pool healthy; event loop not saturated | Set `ENABLE_SHADOW_MODE=false` |
| Any | FIRESTORE | Kill switch: `ENABLE_DATABASE_SWITCHING=false` | All traffic → FS immediately | Arm switch: `true` |

---

## Kill Switch Behavior

```
ENABLE_DATABASE_SWITCHING=false:
  → FIRESTORE=true (forced)
  → POSTGRES=false (forced)
  → DUAL_WRITE=false (forced)
  → DUAL_READ=false (forced)
  → SHADOW_MODE=false (forced)
  → No env var can override this
```

---

## Current Sprint 2A State

```
Active State: FIRESTORE
FS: true    PG: false    DW: false    DR: false    SH: false
Kill Switch: ENABLE_DATABASE_SWITCHING=false (ENGAGED)
```
