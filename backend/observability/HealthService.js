// observability/HealthService.js
const db = require('../utils/db');
class HealthService {
  static async check() {
    const checks = {};
    try { await db.query('SELECT 1'); checks.database = 'healthy'; } catch (e) { checks.database = 'unhealthy'; }
    try { const m = require('./MetricsCollector'); const s = new m(); s.collectSystemMetrics(); checks.metrics = 'ok'; } catch (e) { checks.metrics = 'unavailable'; }
    checks.timestamp = new Date().toISOString();
    const allOk = Object.values(checks).every(v => v === 'healthy' || v === 'ok');
    return { status: allOk ? 'healthy' : 'degraded', checks };
  }
  static async liveness() { return { status: 'alive', timestamp: new Date().toISOString() }; }
  static async readiness() { const h = await HealthService.check(); return { status: h.status === 'healthy' ? 'ready' : 'not_ready', checks: h.checks }; }
}
module.exports = HealthService;