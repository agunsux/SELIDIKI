// moderation/EvidenceReviewService.js
// Service for reviewing evidence items in the moderation pipeline.

const db = require('../utils/db');
const EvidenceCollector = require('../data/EvidenceCollector');
const EvidenceScoringService = require('../trust/EvidenceScoringService');

class EvidenceReviewService {
  /**
   * Review an evidence item and update its status.
   * @param {string} evidenceId
   * @param {string} decision - 'verified' | 'rejected' | 'needs_review'
   * @param {string} reviewerId
   * @param {string} notes - Review notes
   * @returns {Promise<Object>}
   */
  static async reviewEvidence(evidenceId, decision, reviewerId, notes = '') {
    const result = await EvidenceCollector.updateVerificationStatus(evidenceId, decision, reviewerId);

    // Store review audit trail
    await db.query(
      `INSERT INTO evidence_reviews (evidence_id, reviewer_id, decision, notes, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [evidenceId, reviewerId, decision, notes]
    );

    return result;
  }

  /**
   * Get all reviews for a specific evidence item.
   * @param {string} evidenceId
   * @returns {Promise<Array>}
   */
  static async getReviewHistory(evidenceId) {
    const query = `
      SELECT * FROM evidence_reviews
      WHERE evidence_id = $1
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [evidenceId]);
    return result.rows;
  }

  /**
   * Get pending evidence items needing review.
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  static async getPendingReviews(limit = 20) {
    const query = `
      SELECT ev.*, fe.category, fe.risk_score
      FROM evidence_items ev
      LEFT JOIN fraud_events fe ON fe.report_id = ev.report_id
      WHERE ev.verification_status IN ('pending', 'needs_review')
      ORDER BY ev.created_at ASC
      LIMIT $1
    `;
    const result = await db.query(query, [limit]);
    return result.rows;
  }

  /**
   * Generate evidence review summary for a moderator dashboard.
   * @returns {Promise<Object>}
   */
  static async getReviewSummary() {
    const [pending, verified, rejected, total] = await Promise.all([
      EvidenceCollector.countByStatus('pending'),
      EvidenceCollector.countByStatus('verified'),
      EvidenceCollector.countByStatus('rejected'),
      db.query('SELECT COUNT(*) AS cnt FROM evidence_items'),
    ]);

    return {
      total: parseInt(total.rows[0].cnt, 10),
      pending,
      verified,
      rejected,
      needs_review: await EvidenceCollector.countByStatus('needs_review'),
    };
  }

  /**
   * Get evidence with scoring for a report.
   * @param {string} reportId
   * @returns {Promise<Object>}
   */
  static async getEvidenceWithScore(reportId) {
    const evidence = await EvidenceCollector.getEvidenceByReport(reportId);
    const scoring = await EvidenceScoringService.scoreWithTimeDecay(reportId);

    return {
      evidence_items: evidence,
      scoring,
    };
  }

  static async _ensureTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS evidence_reviews (
        id SERIAL PRIMARY KEY,
        evidence_id UUID NOT NULL REFERENCES evidence_items(id) ON DELETE CASCADE,
        reviewer_id VARCHAR(128) NOT NULL,
        decision VARCHAR(32) NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_evidence_reviews_evidence ON evidence_reviews(evidence_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_reviews_reviewer ON evidence_reviews(reviewer_id);
    `);
  }
}

module.exports = EvidenceReviewService;