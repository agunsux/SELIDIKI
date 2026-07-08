# 📋 Mismatch Registry — Atomic Commit #8

**Date:** 2026-07-08

---

## Schema

```
dual_write_mismatches (in-memory array)
├── id: String (operation_id)
├── repository: String
├── operation: String
├── entity_hash: String | null
├── secondary_error: String
├── reason: 'RETRYABLE' | 'NON_RETRYABLE'
├── retryable: Boolean
└── created_at: ISO 8601 String
```

---

## Access

```javascript
const { getMismatches, getMismatchCount, clearMismatches } = require('../utils/dualWriteManager');

// Get last 50 mismatches
const recent = getMismatches(50);

// Get total count
const count = getMismatchCount();

// Clear (after investigation)
clearMismatches();
```

---

## Example Entry

```json
{
  "id": "dw_1751289600000_a1b2c3d4",
  "repository": "PhoneRepository",
  "operation": "upsert",
  "entity_hash": "abc123def456",
  "secondary_error": "Connection refused",
  "reason": "RETRYABLE",
  "retryable": true,
  "created_at": "2026-07-08T12:00:00.000Z"
}
```

---

## Retention

- In-memory only for Sprint 2A
- Cleared on process restart
- Future: persist to `audit_log` table in Sprint 2B
