# Sprint 2A — Repository Dependency Graph

## Data Flow Diagram (Read Path)

```
                           ┌─────────────────────────┐
                           │    HTTP Request          │
                           └───────────┬─────────────┘
                                       │
                           ┌───────────▼─────────────┐
                           │   Routes / Controllers   │
                           │   (check.js, report.js,  │
                           │    scan.js, user.js,     │
                           │    reputation.js)        │
                           └───────────┬─────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
         ┌──────────▼──────┐  ┌───────▼───────┐  ┌───────▼──────┐
         │  Unified Repo   │  │ Unified Repo  │  │ Unified Repo │
         │  Phone/Bank/    │  │ HistoryRepo   │  │ UserRepo     │
         │  ReportRepo     │  │               │  │              │
         └──────────┬──────┘  └───────┬───────┘  └───────┬──────┘
                    │                 │                   │
         ┌──────────▼──────┐  ┌───────▼───────┐  ┌───────▼──────┐
         │ databaseProvider│  │databaseProvider│  │databaseProvider│
         │  .isFirestore() │  │ .isPostgres()  │  │ .isDualRead() │
         └──────────┬──────┘  └───────┬───────┘  └───────┬──────┘
                    │                 │                   │
     ┌──────────────┼──────┐   ┌──────┼──────┐    ┌──────┼──────┐
     │              │      │   │      │      │    │      │      │
     ▼              ▼      ▼   ▼      ▼      ▼    ▼      ▼      ▼
 Firestore    Postgres   Shadow  Firestore  Postgres  Firestore  Postgres
 Adapter      Adapter           Adapter    Adapter   +compare  +compare
```

## Write Path (Dual Write)

```
  Route
    │
    ▼
  Unified Repository (e.g., ReportRepository.insert)
    │
    ├──▶ databaseProvider.isDualWrite()?
    │       │
    │       ├── YES:
    │       │    ├──▶ Firestore Adapter (write)
    │       │    │       │
    │       │    │       ▼
    │       │    │    Firestore Collection
    │       │    │
    │       │    ├──▶ Postgres Adapter (write, try/catch)
    │       │    │       │
    │       │    │       ▼
    │       │    │    PostgreSQL Table
    │       │    │
    │       │    └──▶ On Postgres failure: log warning, return FS result
    │       │
    │       └── NO:
    │            └──▶ Single adapter based on provider
```

## Provider Decision Tree

```
DATABASE_PROVIDER env var
    │
    ├── FIRESTORE
    │     └──▶ All reads/writes → Firestore Adapters
    │
    ├── POSTGRES
    │     └──▶ All reads/writes → Postgres Adapters
    │
    ├── DUAL_WRITE
    │     ├──▶ Reads → Firestore Adapters
    │     └──▶ Writes → Firestore + Postgres (best-effort)
    │
    ├── DUAL_READ
    │     ├──▶ Reads → Firestore + Postgres (compare, return FS)
    │     └──▶ Writes → Firestore + Postgres (dual write)
    │
    └── SHADOW
          ├──▶ Reads → Firestore (sync)
          └──▶ Writes → Firestore (sync) + Postgres (async, fire-and-forget)
```

## Database Provider Configuration

```javascript
// config/databaseProvider.js
PROVIDER: 'FIRESTORE' | 'POSTGRES' | 'DUAL_READ' | 'DUAL_WRITE' | 'SHADOW'
isFirestore() → true for FIRESTORE
isPostgres()  → true for POSTGRES
isDualRead()  → true for DUAL_READ
isDualWrite() → true for DUAL_WRITE
isShadow()    → true for SHADOW
```

## Key Principles

1. **Routes never access databases directly.** Only repositories talk to persistence.
2. **Services never execute SQL or Firestore queries.** They call repositories.
3. **Repositories are the only persistence abstraction.** All DB routing happens here.
4. **Provider is configurable at runtime.** Change `DATABASE_PROVIDER` env var and restart.
5. **Firestore is never removed during Sprint 2A.** It remains the fallback.
