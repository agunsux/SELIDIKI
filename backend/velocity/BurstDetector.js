// velocity/BurstDetector.js
// Detects bursts in report activity using configurable time windows and thresholds.

class BurstDetector {
  constructor(config = {}) {
    this.windowMinutes = config.windowMinutes || 60;
    this.threshold = config.threshold || 5; // reports in window to trigger burst
    this.minBurstScore = config.minBurstScore || 30;
  }

  /**
   * Detect if current report activity constitutes a burst.
   * @param {number} reportsInWindow - Number of reports in the configured window
   * @param {number} baselineRate - Expected baseline rate for comparison
   * @returns {Object} { isBurst, burstScore, severity, factor }
   */
  detect(reportsInWindow, baselineRate = 1) {
    const factor = baselineRate > 0 ? reportsInWindow / baselineRate : reportsInWindow;
    const isBurst = reportsInWindow >= this.threshold && factor >= 2;

    // Burst score: 0-100 based on how much activity exceeds threshold
    const excessFactor = Math.max(0, reportsInWindow - this.threshold) / this.threshold;
    const burstScore = Math.min(100, Math.round(this.minBurstScore + excessFactor * 50));

    // Severity classification
    let severity = 'low';
    if (burstScore >= 80) severity = 'critical';
    else if (burstScore >= 55) severity = 'high';
    else if (burstScore >= 30) severity = 'medium';

    return {
      is_burst: isBurst,
      burst_score: burstScore,
      severity,
      factor: Math.round(factor * 100) / 100,
      reports_in_window: reportsInWindow,
      threshold: this.threshold,
      window_minutes: this.windowMinutes,
    };
  }

  /**
   * Configure burst detector with new thresholds.
   * @param {Object} config
   */
  configure(config = {}) {
    if (config.windowMinutes !== undefined) this.windowMinutes = config.windowMinutes;
    if (config.threshold !== undefined) this.threshold = config.threshold;
    if (config.minBurstScore !== undefined) this.minBurstScore = config.minBurstScore;
  }
}

module.exports = BurstDetector;