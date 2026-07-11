// observability/MetricsCollector.js
// Collects and exposes application metrics for Prometheus.

const db = require('../utils/db');

class MetricsCollector {
  constructor() {
    this.metrics = {
      lookups_total: 0,
      decisions_total: 0,
      reports_total: 0,
      rules_evaluated: 0,
      errors_total: 0,
      latency_buckets: { p50: 0, p95: 0, p99: 0 },
      lookup_latency_ms: [],
      decision_latency_ms: [],
      graph_latency_ms: [],
      timeline_latency_ms: [],
    };
  }

  increment(metric, value = 1) {
    if (this.metrics[metric] !== undefined) this.metrics[metric] += value;
  }

  recordLatency(type, ms) {
    const key = `${type}_latency_ms`;
    if (this.metrics[key]) {
      this.metrics[key].push(ms);
      if (this.metrics[key].length > 1000) this.metrics[key].shift();
    }
  }

  getLatencyPercentiles(key) {
    const arr = this.metrics[key] || [];
    if (arr.length === 0) return { p50: 0, p95: 0, p99: 0 };
    const sorted = [...arr].sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
    };
  }

  snapshot() {
    return {
      ...this.metrics,
      lookup_latency: this.getLatencyPercentiles('lookup_latency_ms'),
      decision_latency: this.getLatencyPercentiles('decision_latency_ms'),
      graph_latency: this.getLatencyPercentiles('graph_latency_ms'),
      timeline_latency: this.getLatencyPercentiles('timeline_latency_ms'),
    };
  }

  async collectSystemMetrics() {
    try {
      const [entities, reports, decisions, queue] = await Promise.all([
        db.query('SELECT COUNT(*) AS cnt FROM graph_nodes'),
        db.query("SELECT COUNT(*) AS cnt FROM fraud_events WHERE event_type='report'"),
        db.query('SELECT COUNT(*) AS cnt FROM decision_history'),
        db.query("SELECT COUNT(*) AS cnt FROM moderation_queue WHERE status='pending'"),
      ]);
      this.metrics.entities_total = parseInt(entities.rows[0]?.cnt || 0);
      this.metrics.reports_total = parseInt(reports.rows[0]?.cnt || 0);
      this.metrics.decisions_total = parseInt(decisions.rows[0]?.cnt || 0);
      this.metrics.queue_pending = parseInt(queue.rows[0]?.cnt || 0);
    } catch (e) { /* DB not available */ }
  }
}

module.exports = MetricsCollector;