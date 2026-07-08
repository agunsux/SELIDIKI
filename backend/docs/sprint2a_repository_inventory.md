# Sprint 2A — Repository Inventory

Generated: 2026-07-08 | Version: 1.0.0

## Complete Repository Catalog

| Repository | Unified Abstraction | Firestore Adapter | Postgres Adapter | Interface | Status |
|---|---|---|---|---|---|
| **UserRepository** | `repositories/UserRepository.js` | `repositories/firestore/UserRepository.js` | `repositories/postgres/UserRepository.js` | `findByHash`, `findByFirebaseUid`, `insert`, `deleteByHash` | ✅ COMPLETE |
| **PhoneRepository** | `repositories/PhoneRepository.js` | `repositories/firestore/PhoneRepository.js` | `repositories/postgres/PhoneRepository.js` | `findByHash`, `upsert` | ✅ COMPLETE |
| **BankAccountRepository** | `repositories/BankAccountRepository.js` | `repositories/firestore/BankAccountRepository.js` | `repositories/postgres/BankAccountRepository.js` | `findByHashAndBank`, `upsert` | ✅ COMPLETE |
| **ReportRepository** | `repositories/ReportRepository.js` | `repositories/firestore/ReportRepository.js` | `repositories/postgres/ReportRepository.js` | `insert`, `findTrending` | ✅ COMPLETE |
| **HistoryRepository** | `repositories/HistoryRepository.js` | `repositories/firestore/HistoryRepository.js` | `repositories/postgres/HistoryRepository.js` | `insert`, `findByUserHash` | ✅ COMPLETE |
| **FraudEntityRepository** | N/A (single impl) | N/A | `repositories/FraudEntityRepository.js` | `findByHash`, `ping` | ⚠️ Postgres-only |
| **FraudReportRepository** | N/A (single impl) | N/A | `repositories/FraudReportRepository.js` | `findByEntityId`, `ping` | ⚠️ Postgres-only |
| **LookupLogRepository** | N/A (single impl) | N/A | `repositories/lookupLogRepository.js` | `insert` | ⚠️ Postgres-only |
| **UrlRepository** | N/A (single impl) | N/A | `repositories/postgres/UrlRepository.js` | `findByDomain`, `upsert` | ⚠️ Postgres-only |

## Repository Coverage Score

- **5 of 5 user-facing repositories** have full abstraction (Firestore + Postgres + Dual).
- **4 internal repositories** (FraudEntity, FraudReport, LookupLog, Url) are Postgres-only but do not serve high-priority user paths directly.
- **Overall Coverage: 100% for critical paths, 56% for all repositories.**

## Consumer Audit: Who uses which repository

| Consumer (File) | Repository Imported | Abstraction? |
|---|---|---|
| `routes/check.js` | `PhoneRepository`, `BankAccountRepository` | ✅ Unified |
| `routes/report.js` | `ReportRepository` | ✅ Unified |
| `routes/scan.js` | `HistoryRepository` | ✅ Unified |
| `routes/user.js` | `HistoryRepository`, `UserRepository` | ✅ Unified |
| `middleware/auth.js` | `UserRepository` | ✅ Unified (was Postgres-only) |
| `controllers/reputationController.js` | `ReputationService` | ✅ Service layer |
| `services/reputationService.js` | `FraudEntityRepository`, `FraudReportRepository`, `LookupLogRepository` | ⚠️ Postgres-only |

## Files with NO repository dependency (safe)

- `services/aiEngine.js` — Stateless, calls Gemini API only.
- `services/riskEngine.js` — Stateless, pure calculation.
- `services/entityResolver.js` — Stateless, normalizer selection.
- `services/storageService.js` — File storage (Supabase/R2), not database.
- `builders/ResponseBuilder.js` — Response formatting only.
- `middleware/responseFormatter.js` — Response envelope only.
- `middleware/validation.js` — Input validation only.
- `normalizers/*.js` — Input normalization only.
- `utils/crypto.js`, `utils/logger.js`, `utils/cacheProvider.js` — Infrastructure utilities.

## Legacy Code with Direct DB Access

| File | Issue | Action Taken |
|---|---|---|
| `services/fraudGraph.js` | Direct `getFirestore()` calls | Marked UNUSED in migration inventory; no active imports. Preserved for backward compat. |
| `services/historyService.js` | Direct `getFirestore()` calls | Marked UNUSED in migration inventory; no active imports. Preserved for backward compat. |

## Verification

- ✅ All 5 unified repositories use `config/databaseProvider.js` (not raw `process.env`).
- ✅ All consumers import from unified `repositories/` path.
- ✅ No controller, route, or middleware imports from `repositories/firestore/` or `repositories/postgres/`.
- ✅ Firestore adapters exist for all 5 unified repositories.
