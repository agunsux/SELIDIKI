// trust/TrustScoreCalculator.js
// Combines community confidence, reporter reputation, and evidence scoring into
// a single explainable trust score for any entity.

const CommunityConfidenceService = require('./CommunityConfidenceService');
const ReporterReputationService = require('./ReporterReputationService');
const EvidenceScoringService = require('./EvidenceScoringService');
const db = require('../utils/db');

class TrustScoreCalculator {
  /**
   * Calculate the full trust score for an entity.
   * @param {string} entityHash
   * @returns {Promise<Object>} { trust_score, confidence, reputation, evidence_score, trust_level, explanation, confidence_reason }
   */
  static async calculateTrust(entityHash) {
    // 1. Community confidence (0-40 weight)
    const communityConfidence = await CommunityConfidenceService.calculateConfidence(entityHash);
    const confidenceWeighted = Math.round(communityConfidence.confidence * 0.4);

    // 2. Reporter reputation (0-30 weight) - use top reporter if multiple
    const reporterResult = await db.query(
      'SELECT DISTINCT reporter_hash FROM fraud_events WHERE hash = $1 AND reporter_hash IS NOT NULL LIMIT 1',
      [entityHash]
    );
    let reputationWeighted = 0;
    let reputationDetail = { reputation: 0, trust_level: 'unavailable' };
    if (reporterResult.rows.length > 0) {
      reputationDetail = await ReporterReputationService.calculateReputation(reporterResult.rows[0].reporter_hash);
      reputationWeighted = Math.round(reputationDetail.reputation * 0.3);
    }

    // 3. Evidence score (0-30 weight)
    const reportResult = await db.query(
      'SELECT report_id FROM fraud_events WHERE hash = $1 AND event_type = $2 LIMIT 1',
      [entityHash, 'report']
    );
    let evidenceWeighted = 0;
    let evidenceDetail = { totalScore: 0, quality: 'none' };
    if (reportResult.rows.length > 0) {
      evidenceDetail = await EvidenceScoringService.scoreWithTimeDecay(reportResult.rows[0].report_id);
      evidenceWeighted = Math.round((evidenceDetail.adjusted_score || 0) * 0.3);
    }

    // 4. Total trust score
    const trustScore = Math.min(100, confidenceWeighted + reputationWeighted + evidenceWeighted);

    // 5. Determine trust level
    let trustLevel;
    if (trustScore >= 80) trustLevel = 'high';
    else if (trustScore >= 55) trustLevel = 'moderate';
    else if (trustScore >= 30) trustLevel = 'low';
    else trustLevel = 'insufficient_data';

    // 6. Build explanation
    const explanation = [
      ...communityConfidence.explanation,
      ...(reputationDetail.explanation || ['No reporter data']),
      `Evidence score: ${evidenceDetail.totalScore} (${evidenceDetail.quality})`,
    ];

    const confidenceReason = [
      `Community confidence contributed ${confidenceWeighted}/40 points`,
      `Reporter reputation contributed ${reputationWeighted}/30 points`,
      `Evidence quality contributed ${evidenceWeighted}/30 points`,
    ];

    return {
      trust_score: trustScore,
      confidence: communityConfidence.confidence,
      reputation: reputationDetail.reputation,
      evidence_score: evidenceDetail.totalScore,
      trust_level: trustLevel,
      explanation,
      confidence_reason: confidenceReason,
      breakdown: {
        community_confidence: { score: confidenceWeighted, max: 40, detail: communityConfidence },
        reporter_reputation: { score: reputationWeighted, max: 30, detail: reputationDetail },
        evidence_quality: { score: evidenceWeighted, max: 30, detail: evidenceDetail },
      },
    };
  }
}

module.exports = TrustScoreCalculator;