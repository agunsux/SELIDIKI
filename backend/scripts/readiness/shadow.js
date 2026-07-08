// backend/scripts/readiness/shadow.js
const { performance } = require('perf_hooks');
const shadowManager = require('../../utils/shadowManager');
const PhoneRepository = require('../../repositories/PhoneRepository');
const { flags } = require('../../config/featureFlags');

async function run() {
  const start = performance.now();

  // Save current configurations
  const originalShadow = flags.SHADOW_MODE;
  flags.SHADOW_MODE = true;

  // Reset shadow metrics to ensure reproducible counts
  shadowManager.resetMetrics();

  // Perform a test read to verify shadow triggering
  await PhoneRepository.findByHash('shadow_test_hash');

  const shadowMetrics = shadowManager.getMetrics();

  // Restore configurations
  flags.SHADOW_MODE = originalShadow;

  const duration = performance.now() - start;

  return {
    name: 'Shadow Mode Consistency Check',
    success: shadowMetrics.failureTotal === 0,
    timestamp: new Date().toISOString(),
    durationMs: duration,
    metrics: {
      attempts: shadowMetrics.attemptTotal,
      successes: shadowMetrics.successTotal,
      failures: shadowMetrics.failureTotal,
      skipped: shadowMetrics.skippedTotal,
      timeouts: shadowMetrics.timeoutTotal,
      drifts: shadowMetrics.driftTotal,
      avgLatencyMs: shadowMetrics.avgLatencyMs,
      consistencyRate: shadowMetrics.successTotal > 0 ? ((shadowMetrics.successTotal - shadowMetrics.driftTotal) / shadowMetrics.successTotal) * 100 : 100.0
    }
  };
}

module.exports = { run };
