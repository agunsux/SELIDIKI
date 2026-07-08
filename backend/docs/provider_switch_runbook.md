# 📖 Provider Switch Runbook — Sprint 2A

**Version:** 1.0.0 | **Owner:** DevOps Lead | **On-Call:** Backend Team

---

## Pre-Switch Checklist

Before any provider change in production:

- [ ] Notify #eng-alerts Slack channel
- [ ] Verify current provider: `GET /health` → check runtime snapshot
- [ ] Verify no active incidents
- [ ] Verify backup/recovery is operational
- [ ] Verify monitoring dashboards are green
- [ ] Have rollback command ready (copy-paste)
- [ ] Designated on-call engineer on standby

---

## Switch Procedures

### Enable PostgreSQL (from FIRESTORE → DUAL)

```bash
# Set in Cloud Run / Vercel environment:
ENABLE_DATABASE_SWITCHING=true
ENABLE_POSTGRES=true

# Deploy / restart
# Verify:
curl https://api.selidiki.id/health
# Expected: "Provider: DUAL"
```

### Enable Dual Write

```bash
ENABLE_DUAL_WRITE=true
# (ENABLE_POSTGRES must already be true)
```

### Enable Shadow Mode

```bash
ENABLE_SHADOW_MODE=true
# Runs parallel to any mode; no user impact
```

### Enable Dual Read

```bash
ENABLE_DUAL_READ=true
# (ENABLE_DUAL_WRITE must already be true)
```

---

## First 30 Minutes — Monitoring

| Metric | Dashboard | Alert Threshold |
|---|---|---|
| API latency (p50, p95, p99) | Grafana / Cloud Monitoring | >5% increase from baseline |
| Error rate (5xx) | Grafana / Cloud Monitoring | >0.1% |
| Firestore latency | GCP Console | >10ms p95 |
| PostgreSQL latency | GCP Console / Supabase | >20ms p95 |
| Parity diffs (`[MIGRATION_PARITY_DIFF]`) | Logs | >0 diffs/minute |
| Memory usage | Cloud Monitoring | >80% of limit |
| Connection pool (PG) | Supabase dashboard | >80% utilized |

---

## Rollback Triggers

Initiate IMMEDIATE rollback if ANY of:

| Condition | Action |
|---|---|
| API error rate exceeds 0.5% for 2+ minutes | Rollback |
| p95 latency increases >20% from baseline | Rollback |
| Any data corruption or parity diff detected | Rollback |
| Connection pool exhausted | Rollback |
| On-call engineer unavailable to investigate within 5 minutes | Rollback |

---

## Rollback Procedure

```bash
# EMERGENCY ROLLBACK — Kill Switch:
ENABLE_DATABASE_SWITCHING=false

# All traffic returns to Firestore immediately.
# Zero data loss (FS has been primary throughout).
# Estimated time to rollback: <30 seconds (env var update + restart)
```

### Post-Rollback

- [ ] Verify: `GET /health` → Provider: FIRESTORE
- [ ] Verify: No 5xx errors for 5 minutes
- [ ] Notify #eng-alerts: "Rollback complete. Provider: FIRESTORE. Investigating."
- [ ] Review parity diffs log for root cause
- [ ] Create incident report

---

## Contacts

| Role | Name | Contact |
|---|---|---|
| Backend Lead | TBD | Slack: @backend-lead |
| DevOps Lead | TBD | Slack: @devops-lead |
| On-Call (Primary) | TBD | PagerDuty |
| On-Call (Secondary) | TBD | PagerDuty |
