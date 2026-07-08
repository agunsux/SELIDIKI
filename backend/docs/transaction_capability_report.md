# 🔐 Transaction Capability Report — Atomic Commit #3

**Date:** 2026-07-08

---

## Transaction Model Comparison

| Aspect | Firestore | PostgreSQL |
|---|---|---|
| Transaction Type | Batch write (atomic, all-or-nothing) | ACID transactions (BEGIN/COMMIT/ROLLBACK) |
| Isolation Level | Serialized (single-document group) | READ COMMITTED (default) |
| Cross-Collection | ✅ Batch across multiple collections | ✅ Multi-table in single transaction |
| Rollback | Batch fails entirely or succeeds entirely | Explicit ROLLBACK on error |
| Max Operations | 500 per batch | Unlimited per transaction |
| Retry | Manual | Automatic for serialization failures (40001) |

## Repository Transaction Requirements

| # | Repository | Needs Transaction? | Isolation Level | Atomic Boundary | Notes |
|---|---|---|---|---|---|
| 1 | PhoneRepository | ❌ No | N/A | Single-row upsert | `ON CONFLICT DO UPDATE` is atomic |
| 2 | BankAccountRepository | ❌ No | N/A | Single-row upsert | `ON CONFLICT DO UPDATE` is atomic |
| 3 | ReportRepository | ✅ Yes | READ COMMITTED | Report insert + profile update | FS uses batch; PG uses explicit BEGIN/COMMIT |
| 4 | HistoryRepository | ❌ No | N/A | Single-row insert | |
| 5 | UserRepository | ❌ No | N/A | Single-row insert/delete | |
| 6 | FraudEntityRepository | ❌ No | N/A | Read-only | Finds across phone_profiles + bank_account_profiles |
| 7 | FraudReportRepository | ❌ No | N/A | Read-only | |
| 8 | LookupLogRepository | ❌ No | N/A | Single-row insert | |
| 9 | UrlRepository | ❌ No | N/A | Single-row upsert | `ON CONFLICT (domain) DO UPDATE` |

## ReportRepository Transaction Detail

This is the only repository with cross-table transactional requirements:

```
Firestore:
  batch.set(fraud_reports.doc)       ─┐
  batch.set(phone_profiles.doc)       ├── batch.commit() (all or nothing)
  batch.set(account_profiles.doc)    ─┘

PostgreSQL:
  BEGIN                              ─┐
  INSERT/UPDATE phone_profiles        │
  INSERT fraud_reports                ├── COMMIT (or ROLLBACK on error)
  (or INSERT/UPDATE bank_account)     │
  COMMIT                             ─┘
```

## Retry Policy

| Error | Code | Retry? | Max Retries | Backoff |
|---|---|---|---|---|
| Serialization failure | 40001 | ✅ Yes | 3 | 100ms, 200ms, 400ms |
| Deadlock detected | 40P01 | ✅ Yes | 3 | 100ms, 200ms, 400ms |
| Connection failure | 08000, 08003, 08006 | ✅ Yes | 3 | 1s, 2s, 4s |
| Unique violation | 23505 | ❌ No | N/A | N/A |
| Foreign key violation | 23503 | ❌ No | N/A | N/A |
| Not null violation | 23502 | ❌ No | N/A | N/A |

## Known Limitations vs Firestore

| Limitation | Impact | Mitigation |
|---|---|---|
| PG has no `FieldValue.increment()` | Counter updates must be explicit `SET count = count + 1` | Already implemented in ReportRepository PG |
| PG `ON CONFLICT` requires unique constraint | Must have unique index on conflict target | All 3 upsert repos have UNIQUE constraints |
| PG `status` (varchar) vs FS `verified` (bool) | Different filter semantics | Adapter maps `verified=true` → `status='verified'` |
| No Firestore batch-equivalent for PG | Must use explicit transaction for cross-table atomicity | ReportRepository PG uses BEGIN/COMMIT |
