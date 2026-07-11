// observability/AlertManager.js
// Configurable threshold-based alerting.

class AlertManager {
  constructor() {
    this.alertPolicies = {
      latency: { warning: { p95: 500 }, critical: { p95: 1000 }, emergency: { p95: 2000 } },
      errorRate: { warning: 0.01, critical: 0.05, emergency: 0.10 },
      queueDepth: { warning: 50, critical: 100, emergency: 200 },
      memory: { warning: 0.7, critical: 0.85, emergency: 0.95 },
      cpu: { warning: 0.6, critical: 0.8, emergency: 0.9 },
    };
  }

  evaluate(metrics) {
    const alerts = [];
    if (metrics.lookup_latency?.p95 > this.alertPolicies.latency.emergency.p95) alerts.push({ type: 'latency', severity: 'emergency', message: `P95 latency ${metrics.lookup_latency.p95}ms exceeds emergency threshold` });
    else if (metrics.lookup_latency?.p95 > this.alertPolicies.latency.critical.p95) alerts.push({ type: 'latency', severity: 'critical', message: `P95 latency ${metrics.lookup_latency.p95}ms exceeds critical threshold` });
    else if (metrics.lookup_latency?.p95 > this.alertPolicies.latency.warning.p95) alerts.push({ type: 'latency', severity: 'warning', message: `P95 latency ${metrics.lookup_latency.p95}ms exceeds warning threshold` });

    const errRate = metrics.errors_total > 0 && metrics.lookups_total > 0 ? metrics.errors_total / metrics.lookups_total : 0;
    if (errRate > this.alertPolicies.errorRate.emergency) alerts.push({ type: 'errorRate', severity: 'emergency', message: `Error rate ${(errRate*100).toFixed(1)}% exceeds emergency threshold` });
    else if (errRate > this.alertPolicies.errorRate.critical) alerts.push({ type: 'errorRate', severity: 'critical', message: `Error rate ${(errRate*100).toFixed(1)}% exceeds critical threshold` });
    else if (errRate > this.alertPolicies.errorRate.warning) alerts.push({ type: 'errorRate', severity: 'warning', message: `Error rate ${(errRate*100).toFixed(1)}% exceeds warning threshold` });

    const queueDepth = metrics.queue_pending || 0;
    if (queueDepth > this.alertPolicies.queueDepth.emergency) alerts.push({ type: 'queue', severity: 'emergency', message: `Queue depth ${queueDepth} exceeds emergency threshold` });
    else if (queueDepth > this.alertPolicies.queueDepth.critical) alerts.push({ type: 'queue', severity: 'critical', message: `Queue depth ${queueDepth} exceeds critical threshold` });
    else if (queueDepth > this.alertPolicies.queueDepth.warning) alerts.push({ type: 'queue', severity: 'warning', message: `Queue depth ${queueDepth} exceeds warning threshold` });

    return alerts;
  }

  updatePolicy(type, thresholds) {
    if (this.alertPolicies[type]) this.alertPolicies[type] = { ...this.alertPolicies[type], ...thresholds };
  }
}

module.exports = AlertManager;