// backend/scripts/readiness/benchmark.js
const { performance } = require('perf_hooks');
const PhoneRepository = require('../../repositories/PhoneRepository');

async function run() {
  const start = performance.now();
  const initialMemory = process.memoryUsage().rss;

  const count = 50;
  const promises = [];

  for (let i = 0; i < count; i++) {
    promises.push(PhoneRepository.findByHash('bench_hash_' + i));
  }

  await Promise.all(promises);
  
  const duration = performance.now() - start;
  const peakMemory = process.memoryUsage().rss;

  return {
    name: 'High Concurrency Benchmark',
    success: duration < 500, // benchmark passes if 50 parallel requests resolve under 500ms
    timestamp: new Date().toISOString(),
    durationMs: duration,
    throughputReqSec: count / (duration / 1000),
    resourceMetrics: {
      initialMemoryMb: Math.round(initialMemory / 1024 / 1024),
      peakMemoryMb: Math.round(peakMemory / 1024 / 1024),
      memoryDeltaMb: Math.round((peakMemory - initialMemory) / 1024 / 1024)
    }
  };
}

module.exports = { run };
