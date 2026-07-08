# 📝 Write Operation Identity — Atomic Commit #8

**Date:** 2026-07-08

---

## Operation Identity Schema

Every dual write operation carries:

| Field | Type | Example | Description |
|---|---|---|---|
| `operation_id` | String | `dw_1751289600000_a1b2c3d4` | Unique ID per write operation |
| `correlation_id` | String | (from upstream request) | Links write to originating HTTP request |
| `timestamp` | ISO 8601 | `2026-07-08T12:00:00.000Z` | When the operation started |
| `repository` | String | `PhoneRepository` | Which repository executed the write |
| `operation` | String | `upsert` | Method name |
| `entity_type` | String | `phone` | Entity category |
| `entity_hash` | String | `abc123...` | SHA-256 hash of entity |
| `primary_provider` | String | `FIRESTORE` | Source of truth provider |
| `secondary_provider` | String | `POSTGRES` | Target provider |
| `result` | Enum | `DUAL_SUCCESS`, `PRIMARY_FAILED`, `SECONDARY_FAILED_RETRYABLE`, `SECONDARY_FAILED_NONRETRYABLE` | Outcome |
| `error` | String\|null | Error message or null | Failure reason |
| `latency_ms` | Number | `45` | Total operation time |

---

## Example Audit Entry

```json
{
  "operation_id": "dw_1751289600000_a1b2c3d4",
  "correlation_id": "req_x7y8z9",
  "timestamp": "2026-07-08T12:00:00.000Z",
  "repository": "PhoneRepository",
  "operation": "upsert",
  "entity_type": "phone",
  "entity_hash": "abc123def456",
  "primary_provider": "FIRESTORE",
  "secondary_provider": "POSTGRES",
  "result": "DUAL_SUCCESS",
  "error": null,
  "latency_ms": 45
}
```

---

## Implementation

```javascript
// utils/dualWriteManager.js
function createOperationId() {
  return `dw_${Date.now()}_${uuidv4().slice(0, 8)}`;
}
```

Log format: `[DUAL_WRITE_AUDIT] {json}`
