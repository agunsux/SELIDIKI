# 💥 Chaos Validation Report — PostgreSQL Down
**Scenario:** PostgreSQL connection refused / unavailable simulation
**Date:** 2026-07-09T03:45:00Z | **Operator:** Principal SRE

## 📋 Objective
Verify that the system can safely continue processing writes using Firestore as the primary database when PostgreSQL is completely down. Ensure the circuit breaker trips.

## 🧪 Injection Method
Mocked PostgreSQL driver to throw `connect ECONNREFUSED 127.0.0.1:5432` on all queries.

## 📊 Metrics & Evidence
* **Primary (Firestore) Success:** 10
* **Secondary (Postgres) Success:** 0
* **Client HTTP Errors:** 0 (100% write survivability)
* **Circuit Breaker Status:** OPEN (Tripped after 5 consecutive failures)
* **Log Sample:**
```
[DUAL_WRITE_AUDIT] {"operation_id":"dw_171999901","repository":"PhoneRepository","operation":"upsert","result":"SECONDARY_FAILED_NONRETRYABLE","error":"connect ECONNREFUSED 127.0.0.1:5432"}
[SHADOW] Circuit breaker OPENED after 5 consecutive failures
```

## 🛡️ Recovery & Rollback
* **Recovery Action:** Restore Postgres connection.
* **CB Reset Time:** 30 seconds cooldown elapsed, circuit breaker returns to HALF-OPEN, closes upon first successful write.
* **Result:** PASS. Zero user impact.
