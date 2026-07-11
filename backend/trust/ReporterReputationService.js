// trust/ReporterReputationService.js
// Tracks and calculates reporter reputation based on report accuracy and history.

const db = require('../utils/db');

class ReporterReputationService {
  /**
   * Calculate reputation score for a reporter.
   * @param {string} reporterHash
   * @returns {Promise<Object>} { reputation, breakdown, trust_level }
   */
  static async calculateReputation(reporterHash) {
    const breakdown = {};

    // 1. Total verified reports (0-30 points)
    const verifiedResult = await db.query(
      `SELECT COUNT(*) AS cnt FROM fraud_events
       WHERE reporter_hash = $1 AND event_type = 'report'`,
      [reporterHash]
    );
    const totalReports = parseInt(verifiedResult.rows[0].cnt, 10);
    const verifiedScore = Math.min(30, totalReports * 3);
    breakdown.verified_reports = { score: verifiedScore, weight: 30, reason: `${totalReports} total reports submitted` };

    // 2. Evidence attachment rate (0-20 points)
    const evidenceResult = await db.query(
      `SELECT COUNT(DISTINCT ev.id) AS cnt
       FROM fraud_events fe
       JOIN evidence_items ev ON ev.report_id = fe.report_id
       WHERE fe.reporter_hash = $1`,
      [reporterHash]
    );
    const evidenceCount = parseInt(evidenceResult.rows[0].cnt, 10);
    const evidenceRate = totalReports > 0 ? evidenceCount / totalReports : 0;
    const evidenceScore = Math.min(20, Math.round(evidenceRate * 20));
    breakdown.evidence_rate = { score: evidenceScore, weight: 20, reason: `${evidenceCount} evidence items across ${totalReports} reports` };

    // 3. Report diversity (0-20 points)
    const diversityResult = await db.query(
      `SELECT COUNT(DISTINCT category) AS cnt
       FROM fraud_events
       WHERE reporter_hash = $1 AND event_type = 'report' AND category IS NOT NULL`,
      [reporterHash]
    );
    const categoryCount = parseInt(diversityResult.rows[0].cnt, 10);
    const diversityScore = Math.min(20, categoryCount * 4);
    breakdown.diversity = { score: diversityScore, weight: 20, reason: `${categoryCount} different fraud categories reported` };

    // 4. Historical accuracy (0-30 points) - based on verified evidence
    const accuracyResult = await db.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN ev.verification_status = 'verified' THEN 1 ELSE 0 END) AS verified
       FROM fraud_events fe
       JOIN evidence_items ev ON ev.report_id = fe.report_id
       WHERE fe.reporter_hash = $1`,
      [reporterHash]
    );
    const accuracyRow = accuracyResult.rows[0];
    const totalEvidence = parseInt(accuracyRow.total, 10);
    const verifiedEvidence = parseInt(accuracyRow.verified, 10);
    const accuracyRate = totalEvidence > 0 ? verifiedEvidence / totalEvidence : 0;
    const accuracyScore = Math.min(30, Math.round(accuracyRate * 30));
    breakdown.historical_accuracy = { score: accuracyScore, weight: 30, reason: `${verifiedEvidence}/${totalEvidence} evidence verified` };

    const totalReputation = Math.min(100, Math.round(
      verifiedScore + evidenceScore + diversityScore + accuracyScore
    ));

    let trustLevel;
    if (totalReputation >= 80) trustLevel = 'highly_trusted';
    else if (totalReputation >= 50) trustLevel = 'trusted';
    else if (totalReputation >= 20) trustLevel = 'moderate';
    else trustLevel = 'new';

    return {
      reputation: totalReputation,
      trust_level: trustLevel,
      breakdown,
      explanation: Object.values(breakdown).map(b => b.reason),
    };
  }

  /**
   * Get all reports submitted by a reporter.
   * @param {string} reporterHash
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  static async getReporterHistory(reporterHash, limit = 50) {
    const query = `
      SELECT * FROM fraud_events
      WHERE reporter_hash = $1 AND event_type = 'report'
      ORDER BY timestamp DESC LIMIT $2
    `;
    const result = await db.query(query, [reporterHash, limit]);
    return result.rows;
  }

  /**
   * Record a false report penalty for a reporter.
   * @param {string} reporterHash
   * @returns {Promise<void>}
   */
  static async recordFalseReport(reporterHash) {
    // Append a penalty marker event
    await db.query(
      `INSERT INTO fraud_events (id, event_type, reporter_hash, category, risk_score, confidence, timestamp)
       VALUES (gen_random_uuid(), 'false_report', $1, 'penalty', 0, 0, NOW())`,
      [reporterHash]
    );
  }
}

module.exports = ReporterReputationService;