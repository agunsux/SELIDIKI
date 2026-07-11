// observability/PrometheusExporter.js
// Exports metrics in Prometheus text format.

const MetricsCollector = require('./MetricsCollector');
const HealthService = require('./HealthService');

class PrometheusExporter {
  static async export(collector) {
    const snapshot = collector.snapshot();
    const lines = [
      '# HELP selidiki_lookups_total Total lookups processed',
      '# TYPE selidiki_lookups_total counter',
      `selidiki_lookups_total ${snapshot.lookups_total}`,
      '',
      '# HELP selidiki_decisions_total Total decisions made',
      '# TYPE selidiki_decisions_total counter',
      `selidiki_decisions_total ${snapshot.decisions_total}`,
      '',
      '# HELP selidiki_reports_total Total fraud reports',
      '# TYPE selidiki_reports_total counter',
      `selidiki_reports_total ${snapshot.reports_total}`,
      '',
      '# HELP selidiki_errors_total Total errors',
      '# TYPE selidiki_errors_total counter',
      `selidiki_errors_total ${snapshot.errors_total}`,
      '',
      '# HELP selidiki_rules_evaluated Total rule evaluations',
      '# TYPE selidiki_rules_evaluated counter',
      `selidiki_rules_evaluated ${snapshot.rules_evaluated}`,
      '',
      '# HELP selidiki_lookup_latency Lookup latency percentiles',
      '# TYPE selidiki_lookup_latency gauge',
      `selidiki_lookup_latency{quantile="0.5"} ${snapshot.lookup_latency.p50}`,
      `selidiki_lookup_latency{quantile="0.95"} ${snapshot.lookup_latency.p95}`,
      `selidiki_lookup_latency{quantile="0.99"} ${snapshot.lookup_latency.p99}`,
      '',
      '# HELP selidiki_decision_latency Decision latency percentiles',
      '# TYPE selidiki_decision_latency gauge',
      `selidiki_decision_latency{quantile="0.5"} ${snapshot.decision_latency.p50}`,
      `selidiki_decision_latency{quantile="0.95"} ${snapshot.decision_latency.p95}`,
      `selidiki_decision_latency{quantile="0.99"} ${snapshot.decision_latency.p99}`,
      '',
      '# HELP selidiki_graph_latency Graph query latency',
      '# TYPE selidiki_graph_latency gauge',
      `selidiki_graph_latency{quantile="0.5"} ${snapshot.graph_latency.p50}`,
      `selidiki_graph_latency{quantile="0.95"} ${snapshot.graph_latency.p95}`,
      `selidiki_graph_latency{quantile="0.99"} ${snapshot.graph_latency.p99}`,
      '',
      '# HELP selidiki_entities_total Total graph entities',
      '# TYPE selidiki_entities_total gauge',
      `selidiki_entities_total ${snapshot.entities_total || 0}`,
      '',
      '# HELP selidiki_queue_pending Pending moderation queue',
      '# TYPE selidiki_queue_pending gauge',
      `selidiki_queue_pending ${snapshot.queue_pending || 0}`,
    ];
    return lines.join('\n') + '\n';
  }
}

module.exports = PrometheusExporter;