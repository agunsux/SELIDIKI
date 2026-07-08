# 🔒 Service Isolation Report — Atomic Commit #4

**Date:** 2026-07-08 | **Target:** 0 direct persistence access

---

## Isolation Matrix

| # | Service | File | Direct FS? | Direct PG? | Uses Repo? | Status |
|---|---|---|---|---|---|---|
| 1 | AI Engine | `services/aiEngine.js` | ❌ | ❌ | N/A (calls Gemini API) | ✅ PASS |
| 2 | Risk Engine | `services/riskEngine.js` | ❌ | ❌ | N/A (pure calculation) | ✅ PASS |
| 3 | Entity Resolver | `services/entityResolver.js` | ❌ | ❌ | N/A (normalizer factory) | ✅ PASS |
| 4 | Storage Service | `services/storageService.js` | ❌ | ❌ | N/A (file upload to Supabase) | ✅ PASS |
| 5 | Reputation Service | `services/reputationService.js` | ❌ | ⚠️ YES | ⚠️ Direct PG repos | ⚠️ KNOWN GAP |
| 6 | Fraud Graph | `services/fraudGraph.js` | 🔴 YES | ❌ | ❌ | 🔴 LEGACY (unused) |
| 7 | History Service | `services/historyService.js` | 🔴 YES | ❌ | ❌ | 🔴 LEGACY (unused) |

---

## Active Services — Detailed Analysis

### ✅ AI Engine (`services/aiEngine.js`)
- **Dependencies:** `@google/generative-ai`
- **DB Access:** None — stateless AI analysis
- **Verdict:** ✅ Fully isolated

### ✅ Risk Engine (`services/riskEngine.js`)
- **Dependencies:** `config/reputationConfig`
- **DB Access:** None — pure scoring function
- **Verdict:** ✅ Fully isolated

### ✅ Entity Resolver (`services/entityResolver.js`)
- **Dependencies:** Normalizer modules
- **DB Access:** None — factory pattern
- **Verdict:** ✅ Fully isolated

### ✅ Storage Service (`services/storageService.js`)
- **Dependencies:** Supabase/cloud storage
- **DB Access:** None — file I/O only
- **Verdict:** ✅ Fully isolated

### ⚠️ Reputation Service (`services/reputationService.js`)
- **Imports:**
  - `FraudEntityRepository` from `../repositories/FraudEntityRepository` (direct PG via `utils/db`)
  - `FraudReportRepository` from `../repositories/FraudReportRepository` (direct PG via `utils/db`)
  - `LookupLogRepository` from `../repositories/lookupLogRepository` (direct PG via `utils/db`)
- **Issue:** These 3 imports are NOT through the unified abstraction. They use `utils/db` (raw PG pool).
- **Resolution Plan:** ADR-008 — create unified wrappers for these 3 repos
- **Verdict:** ⚠️ KNOWN GAP — will be resolved when ADR-008 is implemented

---

## Legacy Services — Marked for Removal

### 🔴 Fraud Graph (`services/fraudGraph.js`)
- **Direct FS Calls:** `getFirestore()`, `db.collection('phone_profiles')`, `db.collection('account_profiles')`, `db.collection('fraud_reports')`, `db.collection('scan_history')`
- **Active Imports:** 0 (confirmed unused)
- **Removal:** Commit #7

### 🔴 History Service (`services/historyService.js`)
- **Direct FS Calls:** `getFirestore()`, `db.collection('scan_history').add()`
- **Active Imports:** 0 (confirmed unused)
- **Removal:** Commit #7

---

## Summary

| Category | Count | Services |
|---|---|---|
| ✅ Fully Isolated | 4 | AI Engine, Risk Engine, Entity Resolver, Storage Service |
| ⚠️ Known Gap | 1 | Reputation Service (ADR-008 pending) |
| 🔴 Legacy (to remove) | 2 | Fraud Graph, History Service |
| **Target: 0 direct DB** | **5 of 7 clean** | **71%** |

> **Note:** The 2 legacy services have 0 active imports — they cannot be invoked by any runtime path. The reputation service gap is documented and scheduled for ADR-008 resolution. After ADR-008 + legacy removal: 100% isolation.
