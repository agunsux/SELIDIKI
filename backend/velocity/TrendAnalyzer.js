// velocity/TrendAnalyzer.js
// Analyzes report trends over configurable time windows (hour, day, week).

class TrendAnalyzer {
  /**
   * Analyze trend direction based on current and previous period data.
   * @param {number} currentPeriod - Count in current period
   * @param {number} previousPeriod - Count in previous period
   * @returns {Object} { trend, changePercent, direction }
   */
  static analyze(currentPeriod, previousPeriod) {
    const changePercent = previousPeriod > 0
      ? Math.round(((currentPeriod - previousPeriod) / previousPeriod) * 100)
      : currentPeriod > 0 ? 100 : 0;

    let direction = 'stable';
    let trend = 'neutral';

    if (changePercent >= 50) {
      direction = 'rapidly_increasing';
      trend = 'escalating';
    } else if (changePercent >= 20) {
      direction = 'increasing';
      trend = 'rising';
    } else if (changePercent <= -50) {
      direction = 'rapidly_decreasing';
      trend = 'declining';
    } else if (changePercent <= -20) {
      direction = 'decreasing';
      trend = 'declining';
    }

    return {
      trend,
      change_percent: changePercent,
      direction,
      current_period: currentPeriod,
      previous_period: previousPeriod,
    };
  }

  /**
   * Analyze province distribution of reports.
   * @param {Array<Object>} provinceData - [{ province, count }]
   * @returns {Object}
   */
  static analyzeProvinceDistribution(provinceData) {
    const total = provinceData.reduce((sum, p) => sum + p.count, 0);
    const provinces = provinceData.map(p => ({
      province: p.province,
      count: p.count,
      percentage: total > 0 ? Math.round((p.count / total) * 100) : 0,
    }));

    // Identify concentration: if one province has >= 50% of reports
    const highest = provinces.reduce((max, p) => p.count > max.count ? p : max, { count: 0 });
    const isConcentrated = highest.percentage >= 50;

    return {
      total,
      provinces,
      concentration: {
        is_concentrated: isConcentrated,
        dominant_province: highest.province || null,
        dominant_percentage: highest.percentage || 0,
      },
    };
  }

  /**
   * Classify velocity severity based on trend and volume.
   * @param {string} trend - 'escalating' | 'rising' | 'neutral' | 'declining'
   * @param {number} volume - Total report count
   * @returns {string} 'critical' | 'high' | 'medium' | 'low'
   */
  static classifySeverity(trend, volume) {
    if (trend === 'escalating' && volume >= 20) return 'critical';
    if (trend === 'escalating' && volume >= 5) return 'high';
    if (trend === 'rising' && volume >= 10) return 'high';
    if (trend === 'rising' && volume >= 3) return 'medium';
    if (trend === 'neutral' && volume >= 15) return 'medium';
    return 'low';
  }
}

module.exports = TrendAnalyzer;