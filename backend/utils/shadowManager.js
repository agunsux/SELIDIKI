// utils/shadowManager.js
/**
 * Shadow Mode Manager — SELIDIKI Architecture v1.0
 *
 * Executes PostgreSQL operations asynchronously as shadows of Firestore operations.
 * Firestore result returned to user immediately. PG result captured for metrics only.
 *
 * Safety guarantees:
 * - Zero user latency impact (async fire-and-forget)
 * - No unhandled promise rejections (full try/catch isolation)
 * - Circuit breaker (stops trying if PG is down)
 * - Configurable sampling rate
 * - Drift detection (compares FS result vs PG result)
 * - Operation ID preserved end-to-end
 */
const { flags } = require('../config/featureFlags');

// ── Circuit Breaker ────────────────────────────────────────
const CIRCUIT_CHECK_INTERVAL_MS = 30000;
let circuitOpen = false;
let circuitOpenedAt = null;
let consecutiveFailures = 0;
const CIRCUIT_THRESHOLD = 5;
let lastCircuitCheck = 0;

function isCircuitOpen() {
  if (!circuitOpen) return false;
  if (Date.now() - lastCircuitCheck > CIRCUIT_CHECK_INTERVAL_MS) {
    // Try again after 30s
    circuitOpen = false;
    consecutiveFailures = 0;
    lastCircuitCheck = Date.now();
    return false;
  }
  return true;
}

function tripCircuit() {
  consecutiveFailures++;
  if (consecutiveFailures >= CIRCUIT_THRESHOLD && !circuitOpen) {
    circuitOpen = true;
    circuitOpenedAt = Date.now();
    lastCircuitCheck = Date.now();
    console.warn(`[SHADOW] Circuit breaker OPENED after ${consecutiveFailures} consecutive failures`);
  }
}

function resetCircuit() {
  if (circuitOpen || consecutiveFailures > 0) {
    circuitOpen = false;
    consecutiveFailures = 0;
    console.log('[SHADOW] Circuit breaker RESET');
  }
}

// ── Sampling ───────────────────────────────────────────────
const SAMPLE_RATE = parseFloat(process.env.SHADOW_SAMPLE_RATE || '1.0');
const SHADOW_TIMEOUT_MS = parseInt(process.env.SHADOW_TIMEOUT_MS || '3000', 10);

function shouldSample() {
  return Math.random() < SAMPLE_RATE;
}

// ── Metrics ────────────────────────────────────────────────
const metrics = {
  attemptTotal: 0,
  successTotal: 0,
  failureTotal: 0,
  skippedTotal: 0,
  timeoutTotal: 0,
  driftTotal: 0,
  totalLatencyMs: 0,
  operationCount: 0,
  // Per-severity drift counts
  driftCritical: 0, driftHigh: 0, driftMedium: 0, driftLow: 0,
  // Per-repository tracking
  perRepo: {},
};

// ── Drift Detection with Severity Classification ──────────
const SEVERITY = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' };

const FIELD_SEVERITY = {
  // CRITICAL: Record existence
  _existence: SEVERITY.CRITICAL,
  // HIGH: Core identity and risk fields
  phoneHash: SEVERITY.HIGH, accountHash: SEVERITY.HIGH, riskScore: SEVERITY.HIGH,
  isConfirmedFraud: SEVERITY.HIGH, isBlocked: SEVERITY.HIGH, role: SEVERITY.HIGH,
  status: SEVERITY.HIGH, trackingId: SEVERITY.HIGH,
  // MEDIUM: Counts and categories
  reportsCount: SEVERITY.MEDIUM, category: SEVERITY.MEDIUM, userHash: SEVERITY.MEDIUM,
  // LOW: Timestamps and metadata
  lastActivity: SEVERITY.LOW, firstReported: SEVERITY.LOW, createdAt: SEVERITY.LOW,
};

function detectDrift(fsResult, pgResult) {
  if (!fsResult && !pgResult) return [];
  if (!fsResult || !pgResult) return [{
    field: '_existence', severity: SEVERITY.CRITICAL,
    firestore: !!fsResult, postgres: !!pgResult,
  }];

  const drifts = [];
  const fields = Object.keys(FIELD_SEVERITY);

  fields.forEach(field => {
    const fsVal = fsResult[field];
    const pgVal = pgResult[field];
    if (fsVal === pgVal) return;
    if (!fsVal && !pgVal) return; // both null/undefined/empty

    drifts.push({
      field,
      severity: FIELD_SEVERITY[field] || SEVERITY.MEDIUM,
      firestore: fsVal,
      postgres: pgVal,
    });
  });

  return drifts;
}

// ── Core Shadow Execution ──────────────────────────────────
function executeShadow(repository, operation, fsResult, pgOperation, entity = {}) {
  if (!flags.SHADOW_MODE) return;
  if (!shouldSample()) { metrics.skippedTotal++; return; }
  if (isCircuitOpen()) { metrics.skippedTotal++; return; }

  metrics.attemptTotal++;

  // Fire-and-forget: async PG execution with full error isolation
  setImmediate(async () => {
    const shadowStart = Date.now();
    try {
      // Timeout guard
      const pgResult = await Promise.race([
        pgOperation(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SHADOW_TIMEOUT')), SHADOW_TIMEOUT_MS)),
      ]);

      const latency = Date.now() - shadowStart;
      metrics.successTotal++;
      resetCircuit();

      // Drift detection with severity tracking and snapshot metadata
      const drifts = detectDrift(fsResult, pgResult);
      if (drifts.length > 0) {
        metrics.driftTotal++;
        // Per-severity counts
        drifts.forEach(d => {
          if (d.severity === 'CRITICAL') metrics.driftCritical++;
          else if (d.severity === 'HIGH') metrics.driftHigh++;
          else if (d.severity === 'MEDIUM') metrics.driftMedium++;
          else metrics.driftLow++;
        });
        // Per-repo tracking
        if (!metrics.perRepo[repository]) metrics.perRepo[repository] = { total: 0, drifts: 0, critical: 0, high: 0, medium: 0, low: 0 };
        metrics.perRepo[repository].total++;
        metrics.perRepo[repository].drifts++;
        if (drifts.some(d => d.severity === 'CRITICAL')) metrics.perRepo[repository].critical++;
        if (drifts.some(d => d.severity === 'HIGH')) metrics.perRepo[repository].high++;
        if (drifts.some(d => d.severity === 'MEDIUM')) metrics.perRepo[repository].medium++;
        if (drifts.some(d => d.severity === 'LOW')) metrics.perRepo[repository].low++;
        logShadow(repository, operation, entity, 'DRIFT_DETECTED', latency, {
          drifts,
          snapshot_delta_ms: latency,
        });
      } else {
        if (!metrics.perRepo[repository]) metrics.perRepo[repository] = { total: 0, drifts: 0, critical: 0, high: 0, medium: 0, low: 0 };
        metrics.perRepo[repository].total++;
        logShadow(repository, operation, entity, 'SUCCESS', latency);
      }
    } catch (err) {
      const latency = Date.now() - shadowStart;
      if (err.message === 'SHADOW_TIMEOUT') {
        metrics.timeoutTotal++;
        metrics.failureTotal++;
        tripCircuit();
        logShadow(repository, operation, entity, 'TIMEOUT', latency, { error: 'Shadow operation exceeded timeout' });
      } else {
        metrics.failureTotal++;
        tripCircuit();
        logShadow(repository, operation, entity, 'FAILED', latency, { error: err.message });
      }
    }

    metrics.totalLatencyMs += Date.now() - shadowStart;
    metrics.operationCount++;
  });
}

function logShadow(repository, operation, entity, result, latencyMs, extra = {}) {
  if (!flags.PARITY_LOGGING) return;
  console.log(`[SHADOW_TRAFFIC_LOG] ${JSON.stringify({
    repository, operation,
    entity_type: entity.type || null,
    entity_hash: entity.hash || null,
    result, latency_ms: latencyMs,
    sample_rate: SAMPLE_RATE,
    circuit_open: circuitOpen,
    ...extra,
  })}`);
}

// ── Public API ─────────────────────────────────────────────
module.exports = {
  executeShadow,
  isCircuitOpen,
  resetCircuit,

  getMetrics() {
    const n = metrics.operationCount || 1;
    return {
      ...metrics,
      successRate: Math.round(metrics.successTotal / Math.max(metrics.attemptTotal, 1) * 100),
      driftRate: Math.round(metrics.driftTotal / Math.max(metrics.successTotal, 1) * 100),
      avgLatencyMs: Math.round(metrics.totalLatencyMs / n),
    };
  },
  resetMetrics() { Object.keys(metrics).forEach(k => metrics[k] = 0); },

  getSampleRate() { return SAMPLE_RATE; },
  getTimeoutMs() { return SHADOW_TIMEOUT_MS; },
};
