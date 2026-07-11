// velocity/AlertThresholdEngine.js
// Configurable threshold engine for velocity alerts. All thresholds are adjustable.

class AlertThresholdEngine {
  constructor(config = {}) {
    this.thresholds = {
      reportsPerHour: config.reportsPerHour || 10,
      reportsPerDay: config.reportsPerDay || 50,
      reportsPerWeek: config.reportsPerWeek || 200,
      uniqueReporters: config.uniqueReporters || 5,
      uniqueDevices: config.uniqueDevices || 3,
      provinceSpread: config.provinceSpread || 3, // min provinces to trigger geographic alert
      burstScoreMin: config.burstScoreMin || 40,
      velocityScoreMin: config.velocityScoreMin || 50,
    };
  }

  /**
   * Evaluate all thresholds against current metrics.
   * @param {Object} metrics - Current velocity metrics
   * @returns {Object} { alerts, isAlerting, totalAlertScore }
   */
  evaluate(metrics) {
    const alerts = [];

    // 1. Reports per hour threshold
    if (metrics.reportsPerHour > this.thresholds.reportsPerHour) {
      alerts.push({
        type: 'reports_per_hour',
        severity: 'high',
        message: `Reports per hour (${metrics.reportsPerHour}) exceeds threshold (${this.thresholds.reportsPerHour})`,
        current: metrics.reportsPerHour,
        threshold: this.thresholds.reportsPerHour,
      });
    }

    // 2. Reports per day threshold
    if (metrics.reportsPerDay > this.thresholds.reportsPerDay) {
      alerts.push({
        type: 'reports_per_day',
        severity: 'critical',
        message: `Reports per day (${metrics.reportsPerDay}) exceeds threshold (${this.thresholds.reportsPerDay})`,
        current: metrics.reportsPerDay,
        threshold: this.thresholds.reportsPerDay,
      });
    }

    // 3. Reports per week threshold
    if (metrics.reportsPerWeek > this.thresholds.reportsPerWeek) {
      alerts.push({
        type: 'reports_per_week',
        severity: 'critical',
        message: `Reports per week (${metrics.reportsPerWeek}) exceeds threshold (${this.thresholds.reportsPerWeek})`,
        current: metrics.reportsPerWeek,
        threshold: this.thresholds.reportsPerWeek,
      });
    }

    // 4. Unique reporters threshold
    if (metrics.uniqueReporters > this.thresholds.uniqueReporters) {
      alerts.push({
        type: 'unique_reporters',
        severity: 'medium',
        message: `Unique reporters (${metrics.uniqueReporters}) exceeds threshold (${this.thresholds.uniqueReporters})`,
        current: metrics.uniqueReporters,
        threshold: this.thresholds.uniqueReporters,
      });
    }

    // 5. Unique devices threshold
    if (metrics.uniqueDevices > this.thresholds.uniqueDevices) {
      alerts.push({
        type: 'unique_devices',
        severity: 'medium',
        message: `Unique devices (${metrics.uniqueDevices}) exceeds threshold (${this.thresholds.uniqueDevices})`,
        current: metrics.uniqueDevices,
        threshold: this.thresholds.uniqueDevices,
      });
    }

    // 6. Burst score threshold
    if (metrics.burstScore >= this.thresholds.burstScoreMin) {
      alerts.push({
        type: 'burst_detected',
        severity: metrics.burstScore >= 70 ? 'critical' : 'high',
        message: `Burst score (${metrics.burstScore}) exceeds minimum threshold (${this.thresholds.burstScoreMin})`,
        current: metrics.burstScore,
        threshold: this.thresholds.burstScoreMin,
      });
    }

    // 7. Velocity score threshold
    if (metrics.velocityScore >= this.thresholds.velocityScoreMin) {
      alerts.push({
        type: 'velocity_high',
        severity: metrics.velocityScore >= 75 ? 'critical' : 'high',
        message: `Velocity score (${metrics.velocityScore}) exceeds threshold (${this.thresholds.velocityScoreMin})`,
        current: metrics.velocityScore,
        threshold: this.thresholds.velocityScoreMin,
      });
    }

    const totalAlertScore = Math.min(100, alerts.reduce((sum, a) => {
      if (a.severity === 'critical') return sum + 30;
      if (a.severity === 'high') return sum + 20;
      return sum + 10;
    }, 0));

    return {
      alerts,
      is_alerting: alerts.length > 0,
      total_alerts: alerts.length,
      total_alert_score: totalAlertScore,
    };
  }

  /**
   * Update thresholds at runtime.
   * @param {Object} config
   */
  updateThresholds(config = {}) {
    Object.keys(config).forEach(key => {
      if (this.thresholds[key] !== undefined) {
        this.thresholds[key] = config[key];
      }
    });
  }

  /**
   * Get current thresholds.
   * @returns {Object}
   */
  getThresholds() {
    return { ...this.thresholds };
  }
}

module.exports = AlertThresholdEngine;