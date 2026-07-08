# 🔗 Repository Dependency Rules — SELIDIKI Architecture v1.0

**Version:** 1.0.0 | **Enforcement:** Mandatory  
**Review Reference:** Code review for Atomic Commits #1–#14

---

## Rule 1: Strict Layering

```
┌──────────────────────────┐
│   Controllers / Routes   │  ← HTTP layer only
├──────────────────────────┤
│   Services               │  ← Business logic only
├──────────────────────────┤
│   Repositories (unified) │  ← Persistence abstraction
├────────────┬─────────────┤
│  Firestore │ PostgreSQL  │  ← Infrastructure adapters
│  Adapters  │ Adapters    │
└────────────┴─────────────┘
```

**Allowed:** ✅ Controller → Service → Repository → Provider, ✅ Controller → Repository (simple CRUD)

**Forbidden:** ❌ Controller/Service → Provider, ❌ Repository → Controller/Service, ❌ Provider → Repository

---

## Rule 2: Repository Isolation

**Repositories MUST NOT call each other.** Cross-repo coordination belongs in Services.

```javascript
// ❌ FORBIDDEN — Cross-repo call
class ReportRepository {
  static async insert(data) {
    await PhoneRepository.upsert(data.targetHash, data);
  }
}
// ✅ CORRECT — Service coordinates
class ReportService {
  static async submit(data) {
    await ReportRepository.insert(data);
    await PhoneRepository.upsert(data.targetHash, data);
  }
}
```

---

## Rule 3: Domain / Persistence Model Separation

| Layer | Example | Depends On |
|---|---|---|
| Domain Model (`models/`) | `FraudEntity { id, entityType, riskScore }` | Nothing |
| Persistence Model (adapter) | `{ phone_hash, risk_score }` | DB schema |
| DTO (route validation) | `{ target_type, target }` | Nothing |
| API Response (route) | `{ risk_score, status }` | Nothing |

- ❌ Domain model MUST NOT import `firebase-admin` or `pg`
- ❌ Repository interface MUST NOT expose `DocumentSnapshot` or `PoolClient`
- ❌ DTO MUST NOT leak into repository parameters
- ✅ Adapter translates snake_case ↔ camelCase
- ✅ Route maps DTO ↔ domain model


---

## Rule 4: No Provider-Specific Types in Public Interface

```javascript
// ❌ FORBIDDEN
async findByHash(hash) { return Firestore.DocumentSnapshot; }
async insert(data, pgClient) { /* pg.PoolClient leaked */ }

// ✅ CORRECT
async findByHash(hash) { return { id, phoneHash, riskScore }; }
async insert(data) { return { id, trackingId }; }
```

---

## Rule 5: No Provider Logic Above Repository Layer

```javascript
// ❌ FORBIDDEN — Route checks provider
if (process.env.DATABASE_PROVIDER === 'FIRESTORE') { ... }

// ✅ CORRECT — Route calls unified repository
const result = await PhoneRepository.findByHash(hash);
```

All provider selection lives in `config/featureFlags.js` + unified repos ONLY.

---

## Rule 6: Contract Test Mandate

Every repo implementation MUST pass identical contract tests:

```
FirestorePhoneRepo ──┐
                     ├── phoneRepo.contract.test.js ── PASS ✅
PostgresPhoneRepo ───┘
```

Contract tests verify: method signatures, return types, null handling, error handling, idempotency.

---

## Rule 7: No Implementation-Specific Behavior

| Scenario | Both FS and PG MUST |
|---|---|
| Entity not found | Return `null` (never `undefined`) |
| Create duplicate | Upsert (not throw/duplicate) |
| Invalid input | Throw error |
| Null field | Return `null` |
| Timestamp | ISO 8601 string |
| Array fields | JS Array `[]` |

---

## Rule 8: Automated Violation Detection

CI checks (must pass for every commit):
1. `grep -r "getFirestore" --include='*.js' | grep -v '/firestore/'` → EMPTY
2. `grep -r "require.*utils/db" --include='*.js' | grep -v '/postgres/'` → EMPTY
3. `grep -r "process.env.DATABASE_PROVIDER" --include='*.js' | grep -v 'config/'` → EMPTY
4. Every root `repositories/XxxRepository.js` imports from `./firestore/` + `./postgres/`

---

## Enforcement

| Stage | Check | Violation Action |
|---|---|---|
| Pre-commit | ESLint + grep scan | Block commit |
| CI | Automated dependency scan | Fail build |
| PR Review | Manual architecture review | Request changes |
| Gate | Architecture Review Board | Block Sprint closure |

