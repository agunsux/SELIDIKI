# 🗺️ PostgreSQL Mapping Verification — Atomic Commit #3

**Date:** 2026-07-08 | **Status:** ✅ ALL 9 REPOSITORIES VERIFIED

---

## Domain Model → PostgreSQL Table Mapping

| # | Domain Entity | PG Table | Primary Key | Unique Constraints |
|---|---|---|---|---|
| 1 | Phone Profile | `phone_profiles` | `id` (UUID) | `phone_hash` (UNIQUE) |
| 2 | Bank Account Profile | `bank_account_profiles` | `id` (UUID) | `(account_hash, bank_code)` (UNIQUE) |
| 3 | Fraud Report | `fraud_reports` | `id` (UUID) | `tracking_id` |
| 4 | Scan History | `scan_history` | `id` (UUID) | — |
| 5 | User | `users` | `id` (UUID) | `phone_hash` (UNIQUE), `firebase_uid` (UNIQUE) |
| 6 | Fraud Entity | `phone_profiles` + `bank_account_profiles` | Composite | — |
| 7 | Fraud Report (domain) | `fraud_reports` | `id` (UUID) | — |
| 8 | Lookup Log | `audit_log` | `id` (BIGSERIAL) | — |
| 9 | URL Profile | `url_profiles` | `id` (UUID) | `domain` (UNIQUE) |

## Field Mapping (Domain camelCase → PG snake_case)

| Domain Field | PG Column | Type | Nullable? | Default | Notes |
|---|---|---|---|---|---|
| `id` | `id` | UUID | No | `gen_random_uuid()` | |
| `phoneHash` | `phone_hash` | VARCHAR(64) | No | — | UNIQUE |
| `firebaseUid` | `firebase_uid` | VARCHAR(128) | Yes | — | UNIQUE |
| `riskScore` | `risk_score` | SMALLINT | No | 0 | CHECK 0-100 |
| `category` | `primary_category` | VARCHAR(50) | Yes | — | ⚠️ Name differs from Firestore `category` |
| `reportsCount` | `reports_count` | INT | No | 0 | |
| `verifiedReportsCount` | `verified_reports_count` | INT | No | 0 | PG-only field |
| `signals` | `signals` | JSONB | Yes | `'[]'` | |
| `lastActivity` | `last_activity` | TIMESTAMPTZ | Yes | — | |
| `firstReported` | `first_reported` | TIMESTAMPTZ | Yes | — | |
| `trend7d` | `trend_7d` | SMALLINT | Yes | 0 | |
| `isConfirmedFraud` | `is_confirmed_fraud` | BOOLEAN | Yes | FALSE | |
| `accountHash` | `account_hash` | VARCHAR(64) | No | — | |
| `bankCode` | `bank_code` | VARCHAR(20) | No | — | |
| `categories` | `categories` | TEXT[] | Yes | `ARRAY[]::TEXT[]` | |
| `isBlocked` | `is_blocked` | BOOLEAN | Yes | FALSE | |
| `trackingId` | `tracking_id` | VARCHAR(100) | Yes | — | |
| `targetType` | `target_type` | VARCHAR(50) | Yes | — | |
| `targetHash` | `target_hash` | VARCHAR(64) | Yes | — | |
| `description` | `description` | TEXT | Yes | — | |
| `evidenceUrl` | `evidence_url` | TEXT | Yes | — | |
| `reporterHash` | `reporter_hash` | VARCHAR(64) | Yes | — | |
| `confidence` | `confidence` | SMALLINT | Yes | — | |
| `verified` | `status` | VARCHAR(20) | Yes | `'pending'` | ⚠️ FS: boolean → PG: varchar |
| `userHash` | `user_hash` | VARCHAR(64) | Yes | — | |
| `inputType` | `input_type` | VARCHAR(30) | Yes | — | |
| `result` | `result_json` | JSONB | Yes | — | ⚠️ FS: `result_summary` object |
| `role` | `role` | — | — | — | ❌ **Missing in schema!** |
| `createdAt` | `created_at` | TIMESTAMPTZ | No | `NOW()` | |
| `lastActive` | `last_active` | TIMESTAMPTZ | No | `NOW()` | |
| `premiumUntil` | `premium_until` | TIMESTAMPTZ | Yes | — | |
| `reportCount` | `report_count` | INT | No | 0 | |
| `scanCount` | `scan_count` | INT | No | 0 | |
| `isBanned` | `is_banned` | BOOLEAN | No | FALSE | |
| `banReason` | `ban_reason` | TEXT | Yes | — | |
| `metadata` | `metadata` | JSONB | Yes | `'{}'` | |
| `domain` | `domain` | VARCHAR(255) | No | — | UNIQUE |
| `urlHash` | `url_hash` | VARCHAR(64) | Yes | — | |
| `isPhishing` | `is_phishing` | BOOLEAN | Yes | FALSE | |
| `isMalware` | `is_malware` | BOOLEAN | Yes | FALSE | |
| `registeredAt` | `registered_at` | DATE | Yes | — | |
| `country` | `country` | VARCHAR(5) | Yes | — | |
| `firstSeen` | `first_seen` | TIMESTAMPTZ | Yes | `NOW()` | |
| `lastChecked` | `last_checked` | TIMESTAMPTZ | Yes | `NOW()` | |
| `updatedAt` | `updated_at` | TIMESTAMPTZ | No | `NOW()` | PG-only field |

## Issues Found

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | `role` column missing from PG `users` table | 🔴 Critical | Known (F-008), fix in schema migration commit |
| 2 | `category` (FS) ↔ `primary_category` (PG) | 🟡 Medium | Handled in adapter |
| 3 | `verified` (bool FS) ↔ `status` (varchar PG) | 🟡 Medium | Handled in adapter |
| 4 | `result_summary` (FS) ↔ `result_json` (PG) | 🟡 Medium | Handled in adapter |

## Index Dependencies

| Index | Table | Columns | Used By |
|---|---|---|---|
| `idx_users_phone_hash` | `users` | `phone_hash` | UserRepository.findByHash |
| `idx_users_firebase_uid` | `users` | `firebase_uid` | UserRepository.findByFirebaseUid |
| `idx_phone_profiles_hash` | `phone_profiles` | `phone_hash` | PhoneRepository.findByHash |
| `idx_phone_profiles_risk` | `phone_profiles` | `risk_score DESC` | PhoneRepository.search |
| `idx_bank_profiles_hash` | `bank_account_profiles` | `(account_hash, bank_code)` | BankAccountRepository.findByHashAndBank |
| `idx_url_domain` | `url_profiles` | `domain` | UrlRepository.findByDomain |
| `idx_audit_action` | `audit_log` | `(action, created_at DESC)` | LookupLogRepository.search |
