// trust/EvidenceScoringService.js
// Scores and weights evidence items based on type, quality, and verification status.

const db = require('../utils/db');

const EVIDENCE_WEIGHTS = {
  image: 30,
  screenshot: 25,
  pdf: 20,
  link: 15,
  text: 10,
};

const VERIFICATION_MULTIPLIERS = {
  verified: 1.0,
  pending: 0.5,
  rejected: 0,
  needs_review: 0.3,
};

class EvidenceScoringService {
  /**
   * Calculate total evidence score for a report.
   * @param {string} reportId
   * @returns {Promise<Object>} { totalScore, items, breakdown }
   */
  static async scoreEvidence(reportId) {
    const evidenceItems = await db.query(
      'SELECT * FROM evidence_items WHERE report_id = $1',
      [reportId]
    );
    const items = evidenceItems.rows;
    if (items.length === 0) {
      return { totalScore: 0, items: [], breakdown: [] };
    }

    let totalScore = 0;
    const breakdown = [];

    for (const item of items) {
      const baseWeight = EVIDENCE_WEIGHTS[item.evidence_type] || 10;
      const verMultiplier = VERIFICATION_MULTIPLIERS[item.verification_status] || 0.5;
      const score = Math.round(baseWeight * verMultiplier);

      breakdown.push({
        evidence_id: item.id,
        evidence_type: item.evidence_type,
        verification_status: item.verification_status,
        base_weight: baseWeight,
        multiplier: verMultiplier,
        score,
      });

      totalScore += score;
    }

    return {
      totalScore: Math.min(100, totalScore),
      items: items.length,
      breakdown,
    };
  }

  /**
   * Calculate time decay multiplier based on evidence age.
   * @param {string} createdAt - ISO timestamp
   * @returns {number} 0-1 multiplier
   */
  static calculateTimeDecay(createdAt) {
    const daysSince = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 7) return 1.0;
    if (daysSince <= 30) return 0.8;
    if (daysSince <= 90) return 0.5;
    return 0.2;
  }

  /**
   * Get evidence quality classification.
   * @param {number} score
   * @returns {string}
   */
  static classifyQuality(score) {
    if (score >= 80) return 'strong';
    if (score >= 50) return 'moderate';
    if (score >= 20) return 'weak';
    return 'insufficient';
  }

  /**
   * Calculate weighted evidence score with time decay.
   * @param {string} reportId
   * @returns {Promise<Object>}
   */
  static async scoreWithTimeDecay(reportId) {
    const result = await EvidenceScoringService.scoreEvidence(reportId);
    const decayMultiplier = await EvidenceScoringService._getReportDecay(reportId);
    const adjustedScore = Math.round(result.totalScore * decayMultiplier);

    return {
      ...result,
      raw_score: result.totalScore,
      decay_multiplier: decayMultiplier,
      adjusted_score: adjustedScore,
      quality: EvidenceScoringService.classifyQuality(adjustedScore),
    };
  }

  static async _getReportDecay(reportId) {
    const result = await db.query(
      'SELECT MIN(created_at) AS min_created FROM evidence_items WHERE report_id = $1',
      [reportId]
    );
    if (!result.rows[0]?.min_created) return 1.0;
    return EvidenceScoringService.calculateTimeDecay(result.rows[0].min_created);
  }
}

module.exports = EvidenceScoringService;