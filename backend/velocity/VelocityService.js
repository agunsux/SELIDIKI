// velocity/VelocityService.js
// Orchestrates real-time fraud velocity detection, combining burst detection,
// trend analysis, and threshold evaluation into a single service.

const db = require('../utils/db');
const BurstDetector = require('./BurstDetector');
const TrendAnalyzer = require('./TrendAnalyzer');
const AlertThresholdEngine = require('./AlertThresholdEngine');

class VelocityService {
  constructor(config = {}) {
    this.burstDetector = new BurstDetector(config.burst || {});
    this.thresholdEngine = new AlertThresholdEngine(config.thresholds || {});
  }

  /**
   * Calculate full velocity profile for an entity.
   * @param {string} entityHash
   * @returns {Promise<Object>} { velocity_score, trend, severity, is_active_attack, recommendation, metrics }
   */
  async calculateVelocity(entityHash) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // 1. Get time-based report counts
    const [hourResult, dayResult, weekResult, prevWeekResult] = await Promise.all([
      db.query('SELECT COUNT(*) AS cnt FROM fraud_events WHERE hash = $1 AND event_type = $2 AND timestamp >= $3',
        [entityHash, 'report', oneHourAgo]),
      db.query('SELECT COUNT(*) AS cnt FROM fraud_events WHERE hash = $1 AND event_type = $2 AND timestamp >= $3',
        [entityHash, 'report', oneDayAgo]),
      db.query('SELECT COUNT(*) AS cnt FROM fraud_events WHERE hash = $1 AND event_type = $2 AND timestamp >= $3',
        [entityHash, 'report', oneWeekAgo]),
      db.query('SELECT COUNT(*) AS cnt FROM fraud_events WHERE hash = $1 AND event_type = $2 AND timestamp >= $3 AND timestamp < $4',
        [entityHash, 'report', twoWeeksAgo, oneWeekAgo]),
    ]);

    const reportsPerHour = parseInt(hourResult.rows[0].cnt, 10);
    const reportsPerDay = parseInt(dayResult.rows[0].cnt, 10);
    const reportsPerWeek = parseInt(weekResult.rows[0].cnt, 10);
    const prevWeekReports = parseInt(prevWeekResult.rows[0].cnt, 10);

    // 2. Unique reporters & devices
    const [reporterResult, deviceResult] = await Promise.all([
      db.query('SELECT COUNT(DISTINCT reporter_hash) AS cnt FROM fraud_events WHERE hash = $1 AND event_type = $2 AND reporter_hash IS NOT NULL',
        [entityHash, 'report']),
      db.query(`SELECT COUNT(DISTINCT n.id) AS cnt
       FROM graph_nodes n
       JOIN graph_edges e ON (e.source_id = n.id OR e.target_id = n.id)
       WHERE (e.source_id = $1 OR e.target_id = $1) AND n.type = 'device'`,
        [entityHash]),
    ]);

    const uniqueReporters = parseInt(reporterResult.rows[0].cnt, 10);
    const uniqueDevices = parseInt(deviceResult.rows[0].cnt, 10);

    // 3. Burst detection
    const burstResult = this.burstDetector.detect(reportsPerHour);

    // 4. Trend analysis
    const trendResult = TrendAnalyzer.analyze(reportsPerWeek, prevWeekReports || 1);

    // 5. Velocity score (0-100)
    const velocityScore = Math.min(100, Math.round(
      Math.min(30, reportsPerHour * 5) +
      Math.min(25, (reportsPerDay / 2)) +
      Math.min(20, uniqueReporters * 4) +
      Math.min(15, uniqueDevices * 5) +
      (burstResult.is_burst ? 10 : 0)
    ));

    // 6. Severity
    const severity = TrendAnalyzer.classifySeverity(trendResult.trend, reportsPerDay);

    // 7. Active attack detection
    const isActiveAttack = burstResult.is_burst &&
      (trendResult.trend === 'escalating' || trendResult.trend === 'rising') &&
      reportsPerHour >= 3;

    // 8. Threshold evaluation
    const metrics = {
      reportsPerHour,
      reportsPerDay,
      reportsPerWeek,
      uniqueReporters,
      uniqueDevices,
      burstScore: burstResult.burst_score,
      velocityScore,
    };
    const alertsResult = this.thresholdEngine.evaluate(metrics);

    // 9. Recommendation
    const recommendation = VelocityService._generateRecommendation(
      velocityScore, severity, isActiveAttack, alertsResult
    );

    return {
      velocity_score: velocityScore,
      trend: trendResult.trend,
      severity,
      is_active_attack: isActiveAttack,
      recommendation,
      metrics: {
        reports_per_hour: reportsPerHour,
        reports_per_day: reportsPerDay,
        reports_per_week: reportsPerWeek,
        unique_reporters: uniqueReporters,
        unique_devices: uniqueDevices,
      },
      burst: burstResult,
      trend_analysis: trendResult,
      alerts: alertsResult,
    };
  }

  /**
   * Configure velocity service thresholds at runtime.
   * @param {Object} config
   */
  configure(config = {}) {
    if (config.burst) this.burstDetector.configure(config.burst);
    if (config.thresholds) this.thresholdEngine.updateThresholds(config.thresholds);
  }

  /**
   * Generate human-readable recommendation based on velocity data.
   */
  static _generateRecommendation(score, severity, isActiveAttack, alerts) {
    if (isActiveAttack) {
      return 'Laporan mencurigakan terdeteksi dengan pola lonjakan aktif. Segera verifikasi dan ambil tindakan pencegahan.';
    }
    if (severity === 'critical' || score >= 80) {
      return 'Aktivitas sangat tinggi. Rekomendasi: tingkatkan monitoring, verifikasi semua laporan baru segera.';
    }
    if (severity === 'high' || score >= 50) {
      return 'Aktivitas meningkat. Rekomendasi: pantau perkembangan, verifikasi laporan secara berkala.';
    }
    if (alerts.total_alerts > 0) {
      return 'Beberapa ambang batas terlewati. Review laporan dan evaluasi kebutuhan tindakan.';
    }
    return 'Aktivitas dalam batas normal. Pantau secara rutin.';
  }
}

module.exports = VelocityService;