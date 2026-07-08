// backend/scripts/readiness/rollback.js
const { performance } = require('perf_hooks');
const { flags } = require('../../config/featureFlags');
const PhoneRepository = require('../../repositories/PhoneRepository');
const dualWriteManager = require('../../utils/dualWriteManager');

async function run() {
  const start = performance.now();
  global.appMetrics.rollback_total++;

  // 1. Initial State
  const initialSwitching = flags.DATABASE_SWITCHING;
  
  // 2. Trigger Rollback (Kill Switch Engaged)
  flags.DATABASE_SWITCHING = false;
  const switchDone = performance.now();
  
  // 3. Verify PostgreSQL is Bypassed
  dualWriteManager.resetMetrics();
  await PhoneRepository.upsert('rollback_drill_test', { riskScore: 10 });
  const dwMetrics = dualWriteManager.getMetrics();
  
  const pgBypassed = dwMetrics.operationCount === 0;

  // 4. Restore original flags
  flags.DATABASE_SWITCHING = initialSwitching;
  const end = performance.now();

  return {
    name: 'Rollback Certification',
    success: pgBypassed,
    timestamp: new Date().toISOString(),
    rollbackDurationMs: switchDone - start,
    verificationDurationMs: end - switchDone,
    totalDrillDurationMs: end - start,
    postRollbackPgOperations: dwMetrics.operationCount,
    recoverySuccess: pgBypassed
  };
}

module.exports = { run };
