# 🔁 Idempotency Verification — Atomic Commit #8

**Date:** 2026-07-08

---

## Idempotent Operations (Dual Write)

| Repository | Operation | FS Mechanism | PG Mechanism | Result on Retry |
|---|---|---|---|---|
| PhoneRepository | `upsert` | `set({merge:true})` by doc ID | `ON CONFLICT (phone_hash) DO UPDATE` | ✅ 1 row each |
| BankAccountRepository | `upsert` | `set({merge:true})` by doc ID | `ON CONFLICT (account_hash, bank_code) DO UPDATE` | ✅ 1 row each |
| ReportRepository | `insert` | `set()` by trackingId (doc ID) | No ON CONFLICT on tracking_id | ⚠️ Could create duplicate if retried with different trackingId |
| HistoryRepository | `insert` | `add()` (auto-generated ID) | No unique constraint | ❌ Duplicates possible on retry |
| UserRepository | `insert` | `set()` by auto doc ID | No ON CONFLICT on phone_hash | ⚠️ Could create duplicate user |
| UserRepository | `deleteByHash` | Delete by query (find then delete) | `DELETE WHERE phone_hash = $1` | ✅ Idempotent (delete is naturally idempotent) |

---

## Idempotency Status

| Status | Repos | Action |
|---|---|---|
| ✅ Fully Idempotent | PhoneRepo, BankRepo, UserRepo.delete | No action needed |
| ⚠️ Partial (trackingId helps) | ReportRepo | Add ON CONFLICT on tracking_id in future migration |
| ❌ Not Idempotent | HistoryRepo, UserRepo.insert | Known gap (F-013); add unique constraints in schema alignment follow-up |

---

## Verification

```
POST /api/v1/report { trackingId: "SLD-xxx" }
  → FS: fraud_reports/SLD-xxx created (1 doc)
  → PG: INSERT tracking_id='SLD-xxx' (1 row)

Retry same POST:
  → FS: fraud_reports/SLD-xxx overwritten (merge) → still 1 doc ✅
  → PG: May throw 23505 if ON CONFLICT added, or create duplicate ❌
```
