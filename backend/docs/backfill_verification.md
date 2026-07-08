# 🔙 Backfill Verification — Atomic Commit #5

**Date:** 2026-07-08 | **Status:** ✅ VERIFIED

---

## Columns Requiring Backfill

| # | Table | Column | Default Value | Backfill SQL | Null Policy | Rollback |
|---|---|---|---|---|---|---|
| 1 | `users` | `role` | `'user'` | `UPDATE users SET role = 'user' WHERE role IS NULL` | NOT NULL after migration 003 | Safe — reverts all users to default role |
| 2 | `users` | `trusted` | `FALSE` | No backfill needed | NOT NULL DEFAULT FALSE | Drop column (SAFE, no FK dependency) |

---

## Backfill Script

```sql
-- scripts/backfill_005_role.sql
-- SAFE — Sets default role for any existing users without one.
-- Idempotent — can be run multiple times safely.

BEGIN;

UPDATE users SET role = 'user' WHERE role IS NULL;

-- Verify no NULL roles remain
DO $$
DECLARE
    null_count INT;
BEGIN
    SELECT COUNT(*) INTO null_count FROM users WHERE role IS NULL;
    IF null_count > 0 THEN
        RAISE WARNING 'Backfill incomplete: % users still have NULL role', null_count;
    END IF;
END;
$$;

COMMIT;

-- Verification query:
-- SELECT COUNT(*) AS users_without_role FROM users WHERE role IS NULL;
-- Expected: 0
```

---

## Backfill Safety Checks

| Check | Status |
|---|---|
| Idempotent (safe to re-run) | ✅ UPDATE with WHERE clause |
| Transactional | ✅ Wrapped in BEGIN/COMMIT |
| Verification query included | ✅ DO block checks for NULLs |
| Rollback path | ✅ Set to default `'user'` |
| No data loss | ✅ Only sets NULL → default |
| No foreign key violations | ✅ `role` has no FK constraints |
| No unique constraint violations | ✅ `role` is not unique |

---

## Null Policy Verification

| Column | Table | Is NULL allowed? | Adapter handles NULL? | Status |
|---|---|---|---|---|
| `role` | `users` | ❌ NOT NULL | ✅ `row.role \|\| 'user'` | SAFE |
| `trusted` | `users` | ❌ NOT NULL | N/A (used by FraudReportRepo) | SAFE |
| `primary_category` | `phone_profiles` | ✅ NULL allowed | ✅ `row.primary_category` → `category` (nullable) | SAFE |
| `status` | `fraud_reports` | ❌ NOT NULL DEFAULT 'pending' | ✅ Adapter maps to `verified` boolean | SAFE |
| `result_json` | `scan_history` | ✅ NULL allowed | ✅ `JSON.parse` with fallback `{}` | SAFE |

---

## Rollback Strategy

| Migration | Rollback SQL | Safe? |
|---|---|---|
| 004 (role index) | `DROP INDEX IF EXISTS idx_users_role` | ✅ No data loss |
| 003 (role column) | Not recommended (column in use by app) | ⚠️ Would break PG UserRepository |
| 001 (trusted column) | Not recommended | ⚠️ Would break FraudReportRepo |

> Rollback strategy: If `role` column causes issues, set all users to `'user'` rather than dropping the column.
