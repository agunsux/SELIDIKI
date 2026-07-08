// backend/scripts/readiness/health.js
const request = require('supertest');
const { performance } = require('perf_hooks');

async function run(app) {
  const start = performance.now();
  const res = await request(app).get('/health');
  const duration = performance.now() - start;

  const body = res.body;
  const isHealthy = res.status === 200 && (body.status === 'healthy' || body.status === 'degraded');
  const hasChecks = body.checks && 
                    body.checks.postgres && 
                    body.checks.firestore && 
                    body.checks.shadow && 
                    body.checks.migration && 
                    body.checks.repository;

  const success = isHealthy && hasChecks;

  return {
    name: 'Health Endpoint Check',
    success,
    durationMs: duration,
    httpStatus: res.status,
    payload: body,
    timestamp: new Date().toISOString()
  };
}

module.exports = { run };
