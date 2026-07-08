# 📦 Legacy Firestore Inventory — Sprint 2A

**Date:** 2026-07-08 | **Status:** DOCUMENTED — Not yet removed  
**ADR Reference:** ADR-008 (Legacy Service Cleanup)

---

## Inventory

| # | File | Direct FS Call? | Still Imported? | Replaced By | Target Removal | Risk If Removed Now |
|---|---|---|---|---|---|---|
| 1 | `services/fraudGraph.js` | ✅ 4 calls (`getFirestore()`, `db.collection()`) | ❌ No active imports | `PhoneRepository`, `BankAccountRepository`, `ReportRepository` (unified) | Commit #7 (Post-contract-tests) | 🔴 HIGH — If any dynamic `require()` exists, breaks runtime |
| 2 | `services/historyService.js` | ✅ 1 call (`getFirestore()`, `db.collection('scan_history')`) | ❌ No active imports | `HistoryRepository` (unified) | Commit #7 (Post-contract-tests) | 🟡 MEDIUM — Scan history may have dual-write risk |
| 3 | `db/knex.js` | ❌ No (SQLite config, dead code) | ❌ No active imports | N/A (SQLite was dev-only) | Commit #14 (Cleanup) | 🟢 LOW — Not imported anywhere |

---

## Detailed Analysis

### 1. `services/fraudGraph.js`
- **Functions:** `getPhoneProfile()`, `getAccountProfile()`, `createFraudReport()`, `getTrendingReports()`
- **Current Status:** Module exports are never imported by any route, controller, or service
- **Risk:** `createFraudReport()` performs `batch.commit()` on Firestore — if inadvertently called, could create duplicate reports
- **Replaced By:**
  - `getPhoneProfile` → `PhoneRepository.findByHash()`
  - `getAccountProfile` → `BankAccountRepository.findByHashAndBank()`
  - `createFraudReport` → `ReportRepository.insert()`
  - `getTrendingReports` → `ReportRepository.findTrending()`
- **Removal Plan:** Delete in Commit #7 (after all contract tests pass for both FS and PG adapters)

### 2. `services/historyService.js`
- **Functions:** `saveToHistory()`
- **Current Status:** Module exports are never imported
- **Risk:** If accidentally called alongside `HistoryRepository.insert()`, creates duplicate scan history entries
- **Replaced By:** `HistoryRepository.insert()` (unified, supports FS+PG)
- **Removal Plan:** Delete in Commit #7

### 3. `db/knex.js`
- **Purpose:** SQLite development configuration
- **Current Status:** Dead code — not imported by any production path
- **Risk:** None — zero imports
- **Removal Plan:** Delete in Commit #14 (final cleanup)

---

## Verification Script

After removal (Commit #7), run:
```bash
grep -r "fraudGraph\|historyService" backend/ --include='*.js' | grep -v node_modules | grep -v docs/
```
Must return **EMPTY**.

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Accidental import of legacy file | Low | Critical | `grep` scan in CI; no `require('./fraudGraph')` or `require('./historyService')` in any file |
| Dual-write to FS from legacy + new adapter | Low | High | Legacy files never imported; `HistoryRepository` is sole write path |
| Breaking change if legacy removed prematurely | Low | High | Delay removal until Commit #7 (after FS+PG contract tests pass) |
