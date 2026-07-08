# Firestore Migration Inventory

This document maps every Firestore usage identified across the backend codebase, categorizing dependencies and outlining PostgreSQL equivalents for a zero-downtime transition.

---

## Migration Matrix

| File Path | Methods | Collection(s) | Purpose | Classification | Runtime Dependency | Replacement Repository | Migration Status |
|---|---|---|---|---|---|---|---|
| `backend/repositories/firestore/PhoneRepository.js` | `findByHash`, `upsert` | `phone_profiles` | Resolves phone risk profiles, scores, and fraud markers. | **Critical** | `repositories/PhoneRepository.js` | `repositories/postgres/PhoneRepository.js` | Parity code written; pending validation. |
| `backend/repositories/firestore/BankAccountRepository.js` | `findByHashAndBank`, `upsert` | `account_profiles` | Resolves bank account risk profiles and category tags. | **Critical** | `repositories/BankAccountRepository.js` | `repositories/postgres/BankAccountRepository.js` | Parity code written; pending validation. |
| `backend/repositories/firestore/ReportRepository.js` | `insert`, `findTrending` | `fraud_reports`, `phone_profiles`, `account_profiles` | Records new community fraud reports and updates risk metrics using batch commits. | **Critical** | `repositories/ReportRepository.js` | `repositories/postgres/ReportRepository.js` | Parity code written; pending validation. |
| `backend/repositories/firestore/HistoryRepository.js` | `insert`, `findByUserHash` | `scan_history` | Writes scans to history; retrieves user history records. | **Critical** | `repositories/HistoryRepository.js` | `repositories/postgres/HistoryRepository.js` | Parity code written; pending validation. |
| `backend/services/historyService.js` | `saveToHistory` | `scan_history` | Legacy direct scan writer. | **Unused** | None (active routes use `HistoryRepository.js`). | `repositories/HistoryRepository.js` | Inactive; will be refactored to use the unified abstraction. |
| `backend/services/fraudGraph.js` | `getPhoneProfile`, `getAccountProfile`, `createFraudReport`, `getTrendingReports`, `saveToHistory` | `phone_profiles`, `account_profiles`, `fraud_reports`, `scan_history` | Legacy database read/write stubs. | **Unused** | None (active routes use repository models). | Unified Repositories | Inactive; will be retained as legacy stub to prevent compilation errors. |

---

## Dependency Classification Legend
* **Critical:** Core database access directly serving active user traffic. Interruption causes immediate downtime or functionality failure.
* **Medium:** Analytical or secondary operational data. Interruption causes metadata gaps but core checking remains online.
* **Low:** Auxiliary tooling, diagnostic routes, or logs.
* **Unused:** Legacy or dead code directories with zero active imports.
