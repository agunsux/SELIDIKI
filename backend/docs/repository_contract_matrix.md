# 📋 Repository Contract Matrix — Sprint 2A

**Version:** 1.0.0 | **Generated:** 2026-07-08

---

## Complete Contract Coverage

| Repository | Read | Create | Update | Delete | Search | Bulk | Transaction | Pagination | Sorting | Filtering | Contract Test | FS Adapter | PG Adapter |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **PhoneRepository** | ✅ findByHash | ✅ upsert | ✅ upsert | ❌ | ✅ search | ❌ | ❌ | ✅ | ✅ | ✅ riskScore, category | ⏳ Pending | ✅ | ✅ |
| **BankAccountRepository** | ✅ findByHashAndBank | ✅ upsert | ✅ upsert | ❌ | ✅ search | ❌ | ❌ | ✅ | ❌ | ✅ bankCode | ⏳ Pending | ✅ | ✅ |
| **ReportRepository** | ✅ findTrending, findByTrackingId | ✅ insert | ❌ | ❌ | ✅ search | ❌ | ✅ (PG only) | ✅ limit | ✅ ORDER BY | ✅ category, status | ⏳ Pending | ✅ | ✅ |
| **HistoryRepository** | ✅ findByUserHash | ✅ insert | ❌ | ❌ | ✅ search | ❌ | ❌ | ✅ limit+offset | ✅ ORDER BY | ✅ inputType, dateRange | ⏳ Pending | ✅ | ✅ |
| **UserRepository** | ✅ findByHash, findByFirebaseUid | ✅ insert | ❌ | ✅ deleteByHash | ✅ search | ❌ | ❌ | ❌ | ❌ | ✅ role, isBanned | ⏳ Pending | ✅ | ✅ |
| **FraudEntityRepository** | ✅ findByHash, findById | ❌ | ❌ | ❌ | ✅ search | ❌ | ❌ | ❌ | ❌ | ✅ entityType | ⏳ Pending | ❌ | ✅ |
| **FraudReportRepository** | ✅ findByEntityId, findByTrackingId | ❌ | ❌ | ❌ | ✅ search | ❌ | ❌ | ❌ | ❌ | ✅ targetHash, category, status | ⏳ Pending | ❌ | ✅ |
| **LookupLogRepository** | ✅ search | ✅ insert | ❌ | ❌ | ✅ search | ❌ | ❌ | ❌ | ❌ | ✅ entityType, dateRange | ⏳ Pending | ❌ | ✅ |
| **UrlRepository** | ✅ findByDomain | ✅ upsert | ✅ upsert | ❌ | ✅ search | ❌ | ❌ | ❌ | ❌ | ✅ isPhishing, isMalware | ⏳ Pending | ❌ | ✅ |

## Summary

| Metric | Target | Current |
|---|---|---|
| Read | 9/9 | ✅ 100% |
| Create | 7/9 | ✅ 78% |
| Update | 4/9 | ✅ 44% |
| Delete | 1/9 | ⚠️ 11% |
| Search | 9/9 | ✅ 100% |
| Bulk | 0/9 | ❌ 0% |
| Transaction | 1/9 | ⚠️ 11% |
| Pagination | 4/9 | ⚠️ 44% |
| Sorting | 2/9 | ⚠️ 22% |
| Filtering | 5/9 | ⚠️ 56% |
| Contract Tests | 0/9 | ❌ 0% |
| FS Adapter | 5/9 | ⚠️ 56% |
| PG Adapter | 9/9 | ✅ 100% |

## Contract Test Status

| Repository | Contract File | FS Tests | PG Tests | Status |
|---|---|---|---|---|
| PhoneRepository | `test/contracts/phoneRepository.contract.test.js` | 0 | 0 | ⏳ Not started |
| BankAccountRepository | `test/contracts/bankAccountRepository.contract.test.js` | 0 | 0 | ⏳ Not started |
| ReportRepository | `test/contracts/reportRepository.contract.test.js` | 0 | 0 | ⏳ Not started |
| HistoryRepository | `test/contracts/historyRepository.contract.test.js` | 0 | 0 | ⏳ Not started |
| UserRepository | `test/contracts/userRepository.contract.test.js` | 0 | 0 | ⏳ Not started |
| FraudEntityRepository | `test/contracts/fraudEntityRepository.contract.test.js` | 0 | 0 | ⏳ Not started |
| FraudReportRepository | `test/contracts/fraudReportRepository.contract.test.js` | 0 | 0 | ⏳ Not started |
| LookupLogRepository | `test/contracts/lookupLogRepository.contract.test.js` | 0 | 0 | ⏳ Not started |
| UrlRepository | `test/contracts/urlRepository.contract.test.js` | 0 | 0 | ⏳ Not started |

> Contract tests will be implemented in Atomic Commit #2 (Firestore Adapter Normalization) and Commit #4 (PostgreSQL Adapter).
