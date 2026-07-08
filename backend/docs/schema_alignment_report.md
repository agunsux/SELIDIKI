# 📐 Schema Alignment Report — Atomic Commit #5

**Date:** 2026-07-08 | **Status:** ✅ ALL 4 DRIFTS RESOLVED

---

## Drift Resolution

| # | Issue | Type | Before | After | Compatibility | Classification | Status |
|---|---|---|---|---|---|---|---|
| 1 | `role` column missing | Schema | `users` table: no `role` column | `role VARCHAR(20) DEFAULT 'user'` added | 100% backward compatible | ✅ SAFE | ✅ PASS |
| 2 | `verified` (FS) ↔ `status` (PG) | Adapter | FS: boolean `verified`, PG: enum `status` | Adapter maps `verified=true` ↔ `status='verified'` | Handled in adapter layer | ✅ COMPATIBLE | ✅ PASS |
| 3 | `category` (FS) ↔ `primary_category` (PG) | Adapter | FS: `category`, PG: `primary_category` | PG adapter reads `primary_category`, returns `category` | Handled in adapter layer | ✅ COMPATIBLE | ✅ PASS |
| 4 | `result_summary` (FS) ↔ `result_json` (PG) | Adapter | FS: object `result_summary`, PG: JSONB `result_json` | PG adapter parses `result_json` → returns `result` | Handled in adapter layer | ✅ COMPATIBLE | ✅ PASS |

---

## Migration Classification

| Migration | Type | Classification | Rationale |
|---|---|---|---|
| `001_add_trusted_column.sql` | ALTER TABLE ADD COLUMN | ✅ SAFE | Additive; DEFAULT FALSE; no data loss |
| `002_bind_risk_trigger.sql` | CREATE TRIGGER | ✅ SAFE | New trigger; no data modification |
| `003_update_risk_triggers_and_roles.sql` | ALTER TABLE + CREATE FUNCTION | ✅ SAFE | ADD COLUMN IF NOT EXISTS; CREATE OR REPLACE |
| `004_add_role_index.sql` | CREATE INDEX | ✅ SAFE | New index; no data modification |
| `schema.sql` (updated) | DDL | ✅ SAFE | Canonical schema; includes all migrations |

**BREAKING migrations: 0**
**SAFE migrations: 4**
**COMPATIBLE adapter mappings: 3**

---

## Column Mapping (Adapter-Level)

| Domain Field | FS Collection | PG Table/Column | Adapter Mapping | Status |
|---|---|---|---|---|
| `role` | `users.role` | `users.role` | Direct | ✅ Aligned |
| `verified` | `fraud_reports.verified` (bool) | `fraud_reports.status` (enum) | `true` → `'verified'`, `false` → `'pending'` | ✅ COMPATIBLE |
| `category` | `phone_profiles.category` | `phone_profiles.primary_category` | Rename in adapter | ✅ COMPATIBLE |
| `result` | `scan_history.result_summary` (object) | `scan_history.result_json` (JSONB) | Parse JSONB → object | ✅ COMPATIBLE |
| `createdAt` | `*.created_at` (Timestamp) | `*.created_at` (TIMESTAMPTZ) | `toDate()?.toISOString()` / direct | ✅ Aligned |
| `updatedAt` | N/A (FS no updated_at) | `*.updated_at` (TIMESTAMPTZ) | PG-only | ✅ COMPATIBLE |
| `id` | FS auto-ID (string) | PG UUID (gen_random_uuid()) | String ↔ UUID string | ✅ COMPATIBLE |

---

## Backfill Strategy

| Column | Table | Default | Backfill | Null Policy | Rollback |
|---|---|---|---|---|---|
| `role` | `users` | `'user'` | `UPDATE users SET role = 'user' WHERE role IS NULL` | NOT NULL | Set to NULL (if nullable in future migration) |
| `trusted` | `users` | `FALSE` | No backfill needed (default handles it) | NOT NULL | Drop column (future only) |

---

## Verification

| Check | Status |
|---|---|
| All 4 drifts addressed | ✅ |
| Zero BREAKING migrations | ✅ |
| schema.sql is canonical source | ✅ |
| Migration 003 already has `role` column (idempotent) | ✅ |
| New migration 004 is additive (CREATE INDEX IF NOT EXISTS) | ✅ |
| Integration tests 7/7 PASS | ✅ |
| Firestore remains active provider | ✅ |
