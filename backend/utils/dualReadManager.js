// utils/dualReadManager.js
/**
 * Dual Read Manager — SELIDIKI Architecture v1.0
 *
 * Synchronous Firestore + PostgreSQL read comparison.
 * Firestore result returned to user. PostgreSQL result compared for parity.
 * Never blocks user response on PG failure.
 *
 * Strategy: Read-Firestore-First, Compare-PostgreSQL, Return-Firestore
 */
const { flags } = require('../config/featureFlags');

// ── Severity Classification (shared with shadowManager) ─────
const SEVERITY = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' };
const FIELD_SEVERITY = {
  _existence: SEVERITY.CRITICAL,
  riskScore: SEVERITY.HIGH, phoneHash: SEVERITY.HIGH, accountHash: SEVERITY.HIGH,
  isConfirmedFraud: SEVERITY.HIGH, isBlocked: SEVERITY.HIGH, role: SEVERITY.HIGH,
  status: SEVERITY.HIGH, trackingId: SEVERITY.HIGH, firebaseUid: SEVERITY.HIGH,
  reportsCount: SEVERITY.MEDIUM, category: SEVERITY.MEDIUM, userHash: SEVERITY.MEDIUM,
  reportCount: SEVERITY.MEDIUM, scanCount: SEVERITY.MEDIUM, confidence: SEVERITY.MEDIUM,
  lastActivity: SEVERITY.LOW, firstReported: SEVERITY.LOW, createdAt: SEVERITY.LOW,
  lastActive: SEVERITY.LOW, premiumUntil: SEVERITY.LOW, updatedAt: SEVERITY.LOW,
  trend7d: SEVERITY.LOW, verifiedReportsCount: SEVERITY.LOW,
};

// ── Per-Repo Metrics ───────────────────────────────────────
const metrics = {
  totalComparisons: 0, totalMatches: 0, totalDrifts: 0,
  driftCritical: 0, driftHigh: 0, driftMedium: 0, driftLow: 0,
  pgFailures: 0, totalLatencyMs: 0,
  perRepo: {},
};

function trackRepo(repo) {
  if (!metrics.perRepo[repo]) metrics.perRepo[repo] = { comparisons: 0, matches: 0, drifts: 0, critical: 0, high: 0, medium: 0, low: 0, failures: 0 };
}

function detectDrift(fsResult, pgResult) {
  if (!fsResult && !pgResult) return [];
  if (!fsResult || !pgResult) return [{ field: '_existence', severity: SEVERITY.CRITICAL, firestore: !!fsResult, postgres: !!pgResult }];
  const drifts = [];
  const allKeys = new Set([...Object.keys(fsResult), ...Object.keys(pgResult)]);
  allKeys.forEach(field => {
    const fsVal = fsResult[field];
    const pgVal = pgResult[field];
    if (fsVal === pgVal) return;
    if (!fsVal && !pgVal) return;
    drifts.push({ field, severity: FIELD_SEVERITY[field] || SEVERITY.MEDIUM, firestore: fsVal, postgres: pgVal });
  });
  return drifts;
}

// ── Core Dual Read Execution ───────────────────────────────
async function executeDualRead(repository, operation, fsRead, pgRead, entity = {}) {
  if (!flags.DUAL_READ) return fsRead();

  const fsReadStart = Date.now();
  trackRepo(repository);
  metrics.totalComparisons++;
  metrics.perRepo[repository].comparisons++;

  // Phase 1: Firestore read (primary — must succeed)
  let fsResult;
  try {
    fsResult = await fsRead();
  } catch (err) {
    throw err;
  }
  const fsReadTs = Date.now();

  // Phase 2: PostgreSQL read (secondary — comparison only)
  try {
    const pgReadStart = Date.now();
    const pgResult = await pgRead();
    const pgReadTs = Date.now();

    const comparisonWindowMs = pgReadTs - fsReadStart;
    const drifts = detectDrift(fsResult, pgResult);
    const latency = pgReadTs - fsReadStart;
    metrics.totalLatencyMs += latency;

    if (drifts.length > 0) {
      metrics.totalDrifts++;
      metrics.perRepo[repository].drifts++;
      drifts.forEach(d => {
        if (d.severity === 'CRITICAL') { metrics.driftCritical++; metrics.perRepo[repository].critical++; }
        else if (d.severity === 'HIGH') { metrics.driftHigh++; metrics.perRepo[repository].high++; }
        else if (d.severity === 'MEDIUM') { metrics.driftMedium++; metrics.perRepo[repository].medium++; }
        else { metrics.driftLow++; metrics.perRepo[repository].low++; }
      });
      logParity(repository, operation, entity, 'DRIFT', latency, {
        drifts,
        firestore_read_ts: new Date(fsReadTs).toISOString(),
        postgres_read_ts: new Date(pgReadTs).toISOString(),
        comparison_window_ms: comparisonWindowMs,
      });
    } else {
      metrics.totalMatches++;
      metrics.perRepo[repository].matches++;
      logParity(repository, operation, entity, 'MATCH', latency, {
        firestore_read_ts: new Date(fsReadTs).toISOString(),
        postgres_read_ts: new Date(pgReadTs).toISOString(),
        comparison_window_ms: comparisonWindowMs,
      });
    }
  } catch (pgErr) {
    metrics.pgFailures++;
    metrics.perRepo[repository].failures++;
    logParity(repository, operation, entity, 'PG_FAILED', Date.now() - fsReadStart, { error: pgErr.message });
  }

  return fsResult;
}

function logParity(repo, op, entity, result, latencyMs, extra = {}) {
  if (!flags.PARITY_LOGGING) return;
  console.log(`[DUAL_READ_PARITY] ${JSON.stringify({
    repository: repo, operation: op,
    entity_type: entity.type || null, entity_hash: entity.hash || null,
    result, latency_ms: latencyMs, ...extra,
  })}`);
}

module.exports = {
  executeDualRead,
  detectDrift,
  // SLO-gated match rates
  getSLO() {
    const n = metrics.totalComparisons || 1;
    return {
      overall_match_pct:     Math.round(metrics.totalMatches / n * 10000) / 100,
      critical_match_pct:    metrics.driftCritical === 0 ? 100 : Math.round((1 - metrics.driftCritical / n) * 10000) / 100,
      high_match_pct:        Math.round((1 - (metrics.driftCritical + metrics.driftHigh) / n) * 10000) / 100,
      operational_match_pct: Math.round((1 - (metrics.driftCritical + metrics.driftHigh + metrics.driftMedium) / n) * 10000) / 100,
    };
  },
  resetMetrics() {
    Object.keys(metrics).forEach(k => { if (typeof metrics[k] === 'number') metrics[k] = 0; else if (typeof metrics[k] === 'object') metrics[k] = {}; });
  },
};
