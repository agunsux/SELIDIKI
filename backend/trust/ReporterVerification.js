// trust/ReporterVerification.js
/**
 * ReporterVerification — ARGUS v1.3
 *
 * Verifies reporters based on history, phone verification, and report accuracy.
 * Supports tiers: unverified, phone_verified, trusted, verified_investigator.
 */

const db = require('../utils/db');

const REPORTER_TIERS = ['unverified', 'phone_verified', 'trusted', 'verified_investigator'];

class ReporterVerification {
  static async getTier(reporterHash) {
    const result = await db.query(
      `SELECT reporter_hash, SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified_evidence,
              COUNT(*) as total_reports,
              COUNT(DISTINCT category) as category_count
       FROM fraud_events fe
       LEFT JOIN evidence_items ev ON ev.report_id = fe.report_id
       WHERE fe.reporter_hash = $1 AND fe.event_type = 'report'
       GROUP BY fe.reporter_hash`,
      [reporterHash]
    );
    if (result.rows.length === 0) return { tier: 'unverified', score: 0 };

    const r = result.rows[0];
    const verRate = parseInt(r.total_reports) > 0
      ? parseInt(r.verified_evidence) / parseInt(r.total_reports) : 0;
    const cats = parseInt(r.category_count);

    let tier = 'unverified';
    if (cats >= 3 && verRate >= 0.8 && parseInt(r.total_reports) >= 20) tier = 'verified_investigator';
    else if (cats >= 2 && verRate >= 0.6 && parseInt(r.total_reports) >= 10) tier = 'trusted';
    else if (parseInt(r.total_reports) >= 1) tier = 'phone_verified';

    return { tier, score: Math.round(verRate * 100), totalReports: parseInt(r.total_reports) };
  }
}

module.exports = ReporterVerification;