// backend/scripts/readiness/latency.js
const { performance } = require('perf_hooks');
const PhoneRepository = require('../../repositories/PhoneRepository');

async function run() {
  const readLatencies = [];
  const writeLatencies = [];
  const perfRuns = 50;

  // 1. Measure Reads
  const readStart = performance.now();
  for (let i = 0; i < perfRuns; i++) {
    const s = performance.now();
    await PhoneRepository.findByHash('perf_hash_' + i);
    readLatencies.push(performance.now() - s);
  }
  const readTotalTime = performance.now() - readStart;

  // 2. Measure Writes
  const writeStart = performance.now();
  for (let i = 0; i < perfRuns; i++) {
    const s = performance.now();
    await PhoneRepository.upsert('perf_hash_' + i, { riskScore: 12, category: 'marketplace_scam' });
    writeLatencies.push(performance.now() - s);
  }
  const writeTotalTime = performance.now() - writeStart;

  const calculateStats = (latencies, totalTime, count) => {
    latencies.sort((a, b) => a - b);
    const avg = latencies.reduce((a, b) => a + b, 0) / count;
    return {
      p50: latencies[Math.floor(count * 0.5)],
      p90: latencies[Math.floor(count * 0.9)],
      p95: latencies[Math.floor(count * 0.95)],
      p99: latencies[Math.floor(count * 0.99)],
      max: Math.max(...latencies),
      avg,
      throughput: (count / (totalTime / 1000))
    };
  };

  const readStats = calculateStats(readLatencies, readTotalTime, perfRuns);
  const writeStats = calculateStats(writeLatencies, writeTotalTime, perfRuns);

  return {
    name: 'Latency Benchmarks',
    success: readStats.p95 < 50 && writeStats.p95 < 80,
    timestamp: new Date().toISOString(),
    runs: perfRuns,
    reads: readStats,
    writes: writeStats
  };
}

module.exports = { run };
