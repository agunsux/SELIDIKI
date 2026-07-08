// backend/scripts/readiness/replay.js
const { performance } = require('perf_hooks');
const PhoneRepository = require('../../repositories/PhoneRepository');
const { executeDualWrite } = require('../../utils/dualWriteManager');

async function run() {
  const start = performance.now();

  // Test idempotency of PhoneRepository upsert operations
  let firstError = null;
  let secondError = null;
  
  try {
    await PhoneRepository.upsert('replay_idempotency_hash', { riskScore: 12, category: 'marketplace_scam' });
  } catch (err) {
    firstError = err.message;
  }

  // Immediately replay the identical payload
  try {
    await PhoneRepository.upsert('replay_idempotency_hash', { riskScore: 12, category: 'marketplace_scam' });
  } catch (err) {
    secondError = err.message;
  }

  const duration = performance.now() - start;
  const success = firstError === null && secondError === null;

  return {
    name: 'Idempotency Replay Validation',
    success,
    timestamp: new Date().toISOString(),
    durationMs: duration,
    idempotent: success,
    replayErrors: {
      firstAttempt: firstError,
      secondAttempt: secondError
    }
  };
}

module.exports = { run };
