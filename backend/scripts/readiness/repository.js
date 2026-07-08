// backend/scripts/readiness/repository.js
const { performance } = require('perf_hooks');
const PhoneRepository = require('../../repositories/PhoneRepository');
const BankAccountRepository = require('../../repositories/BankAccountRepository');
const ReportRepository = require('../../repositories/ReportRepository');
const HistoryRepository = require('../../repositories/HistoryRepository');

async function run() {
  const start = performance.now();
  const repoChecks = [];

  const checkRepo = async (name, operation) => {
    const s = performance.now();
    let success = true;
    let error = null;
    try {
      await operation();
    } catch (err) {
      success = false;
      error = err.message;
      global.appMetrics.repository_errors_total++;
    }
    repoChecks.push({
      repository: name,
      success,
      durationMs: performance.now() - s,
      error
    });
  };

  // Exercise Repository Contracts (Read/Write)
  await checkRepo('PhoneRepository', async () => {
    await PhoneRepository.upsert('test_repo_hash', { riskScore: 5 });
    await PhoneRepository.findByHash('test_repo_hash');
  });

  await checkRepo('BankAccountRepository', async () => {
    await BankAccountRepository.upsert('test_bank_hash', 'BCA', { riskScore: 0 });
    await BankAccountRepository.findByHashAndBank('test_bank_hash', 'BCA');
  });

  await checkRepo('ReportRepository', async () => {
    await ReportRepository.insert({ target_type: 'phone', target: '081234567890', category: 'marketplace_scam', description: 'test' });
    await ReportRepository.findTrending({});
  });

  await checkRepo('HistoryRepository', async () => {
    await HistoryRepository.insert({ userHash: 'test_repo_hash', queryHash: 'abc', queryType: 'phone', resultStatus: 'SAFE' });
    await HistoryRepository.findByUserHash('test_repo_hash');
  });

  const duration = performance.now() - start;
  const allSuccessful = repoChecks.every(c => c.success);

  return {
    name: 'Repository Parity Checks',
    success: allSuccessful,
    timestamp: new Date().toISOString(),
    durationMs: duration,
    repositoriesTested: repoChecks.length,
    results: repoChecks
  };
}

module.exports = { run };
