# 📊 Dual Write Audit Spec — Atomic Commit #8

**Date:** 2026-07-08

---

## Audit Log Format

Structured JSON emitted as `[DUAL_WRITE_AUDIT]` when `ENABLE_PARITY_LOGGING=true`:

```json
{
  "operation_id": "dw_...",
  "timestamp": "ISO8601",
  "repository": "PhoneRepository|BankAccountRepository|...",
  "operation": "upsert|insert|deleteByHash",
  "entity_type": "phone|account|report|scan|user",
  "entity_hash": "sha256...",
  "result": "DUAL_SUCCESS|PRIMARY_FAILED|SECONDARY_FAILED_RETRYABLE|SECONDARY_FAILED_NONRETRYABLE",
  "error": "error message or null",
  "latency_ms": 45
}
```

---

## Audit Results

| Result | Primary (FS) | Secondary (PG) | User Impact |
|---|---|---|---|
| `DUAL_SUCCESS` | ✅ Success | ✅ Success | Success returned |
| `PRIMARY_FAILED` | ❌ Failed | N/A | Error returned |
| `SECONDARY_FAILED_RETRYABLE` | ✅ Success | ❌ Timeout/Connection | Success returned; mismatch queued |
| `SECONDARY_FAILED_NONRETRYABLE` | ✅ Success | ❌ Constraint/Validation | Success returned; mismatch registered |

---

## Mismatch Registry

In-memory array accessible via `dualWriteManager.getMismatches()`:

```javascript
{
  id: "dw_...",
  repository: "PhoneRepository",
  operation: "upsert",
  entity_hash: "abc123",
  secondary_error: "Connection timeout",
  reason: "RETRYABLE",
  retryable: true,
  created_at: "2026-07-08T12:00:00Z"
}
```
