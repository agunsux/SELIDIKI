# 🧹 Legacy Cleanup Progress — Atomic Commit #6

**Date:** 2026-07-08 | **Reference:** `docs/legacy_firestore_inventory.md`

---

## Cleanup Tracker

| # | Legacy File | Replacement | Has Active Imports? | Status | Target Commit |
|---|---|---|---|---|---|
| 1 | `services/fraudGraph.js` | `PhoneRepository`, `BankAccountRepository`, `ReportRepository` (via resolver) | ❌ 0 active imports | ⏳ PENDING | Commit #7 (after feature flags) |
| 2 | `services/historyService.js` | `HistoryRepository` (via resolver) | ❌ 0 active imports | ⏳ PENDING | Commit #7 |
| 3 | `db/knex.js` | N/A (SQLite dead code) | ❌ 0 active imports | ⏳ PENDING | Commit #14 (final cleanup) |
| 4 | `repositories/interfaces/phoneRepositoryInterface.js` | Superseded by `interfaces/IPhoneRepository.js` | ❌ 0 active imports | ⏳ PENDING | Commit #14 |

---

## Post-Wiring Status

All 6 active consumers (4 routes, 1 middleware, 1 service) now use `repositoryResolver`. No legacy file is imported by any active runtime path.

```
Active consumers:         6
Using resolver:          6 (100%)
Using legacy files:      0 (0%)
Legacy files remaining:  4 (all dormant)
```

---

## Removal Plan

| Commit | Files Removed | Risk |
|---|---|---|
| Commit #7 (Feature Flags) | `fraudGraph.js`, `historyService.js` | 🟡 Medium — remove only after FS+PG contract tests confirmed |
| Commit #14 (Final Cleanup) | `db/knex.js`, `phoneRepositoryInterface.js` | 🟢 Low — confirmed dead code |

---

## Pre-Removal Verification

Before removing any legacy file:
```bash
grep -r "fraudGraph\|historyService" --include='*.js' | grep -v node_modules | grep -v docs/
```
Must return **EMPTY**.
