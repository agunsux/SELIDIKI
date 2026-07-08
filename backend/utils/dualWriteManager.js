// utils/dualWriteManager.js
/**
 * Dual Write Manager — SELIDIKI Architecture v1.0
 * Strategy: Write-Primary-First, Best-Effort-Secondary.
 * Primary (Firestore) failure → request fails.
 * Secondary (PostgreSQL) failure → logged, mismatch registered, request succeeds.
 */
const { v4: uuidv4 } = require('uuid');
const { flags } = require('../config/featureFlags');

// ── Configuration ──────────────────────────────────────────
const DUAL_WRITE_TIMEOUT_MS = parseInt(process.env.DUAL_WRITE_TIMEOUT_MS || '2000', 10);

// ── Metrics ────────────────────────────────────────────────
const metrics = { primarySuccess: 0, primaryFailure: 0, secondarySuccess: 0, secondaryFailure: 0, dualSuccess: 0, mismatches: 0, retries: 0, totalLatencyMs: 0, operationCount: 0 };
const mismatches = [];

// ── Retry Classification ───────────────────────────────────
const RETRYABLE_CODES = ['08000','08003','08006','40001','40P01','57P01','57P02','57P03','53300','53400'];
function isRetryable(err) { return !!(err && err.code && RETRYABLE_CODES.includes(err.code)); }
function isNonRetryable(err) { return !isRetryable(err); }
function createOperationId() { return `dw_${Date.now()}_${uuidv4().slice(0,8)}`; }


// ── Core Dual Write Execution ──────────────────────────────
async function executeDualWrite(repository, operation, primaryWrite, secondaryWrite, entity = {}) {
  if (!flags.DUAL_WRITE) return primaryWrite();
  const opId = createOperationId();
  const startTime = Date.now();

  // Phase 1: Primary (Firestore) — must succeed
  let primaryResult;
  try {
    primaryResult = await primaryWrite();
    metrics.primarySuccess++;
  } catch (primaryErr) {
    metrics.primaryFailure++;
    logAudit(opId, repository, operation, entity, 'PRIMARY_FAILED', primaryErr.message, Date.now() - startTime);
    throw primaryErr;
  }

  // Phase 2: Secondary (PostgreSQL) — best-effort with 2s timeout
  try {
    await Promise.race([
      secondaryWrite(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Secondary write timeout')), DUAL_WRITE_TIMEOUT_MS)),
    ]);
    metrics.secondarySuccess++;
    metrics.dualSuccess++;
  } catch (secondaryErr) {
    metrics.secondaryFailure++;
    if (isRetryable(secondaryErr)) metrics.retries++;
    const cat = isRetryable(secondaryErr) ? 'SECONDARY_FAILED_RETRYABLE' : 'SECONDARY_FAILED_NONRETRYABLE';
    registerMismatch(opId, repository, operation, entity, secondaryErr.message, isRetryable(secondaryErr));
    logAudit(opId, repository, operation, entity, cat, secondaryErr.message, Date.now() - startTime);
  }

  const latency = Date.now() - startTime;
  metrics.totalLatencyMs += latency;
  metrics.operationCount++;
  return primaryResult;
}

function logAudit(opId, repo, op, entity, result, error, latencyMs) {
  if (!flags.PARITY_LOGGING) return;
  console.log(`[DUAL_WRITE_AUDIT] ${JSON.stringify({ operation_id: opId, timestamp: new Date().toISOString(), repository: repo, operation: op, entity_type: entity.type||null, entity_hash: entity.hash||null, result, error: error||null, latency_ms: latencyMs })}`);
}

function registerMismatch(opId, repo, op, entity, error, retryable) {
  const entry = { id: opId, repository: repo, operation: op, entity_hash: entity.hash||null, secondary_error: error, reason: retryable?'RETRYABLE':'NON_RETRYABLE', retryable, created_at: new Date().toISOString() };
  mismatches.push(entry);
  metrics.mismatches++;
}

module.exports = {
  executeDualWrite, createOperationId, isRetryable, isNonRetryable, RETRYABLE_CODES,
  getMetrics() {
    const n = metrics.operationCount || 1;
    return { ...metrics, dualSuccessRate: Math.round(metrics.dualSuccess/n*100), mismatchRate: Math.round(metrics.mismatches/n*100), avgLatencyMs: Math.round(metrics.totalLatencyMs/n) };
  },
  resetMetrics() { Object.keys(metrics).forEach(k => metrics[k]=0); },
  getMismatches(limit=50) { return mismatches.slice(-limit); },
  getMismatchCount() { return mismatches.length; },
  clearMismatches() { mismatches.length = 0; },
};

