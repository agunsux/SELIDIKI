// community/CommunityTrustService.js
/**
 * CommunityTrustService — ARGUS v1.2
 *
 * Computes community trust scores based on the ratio of confirms to reports,
 * weighted by reporter reputation. This transforms raw crowdsourcing into
 * validated community intelligence.
 */

const db = require('../utils/db');
const CommunityReportService = require('./CommunityReportService');

class CommunityTrustService {
  /**
   * Calculate community trust score for an entity.
   * Score = (confirms / total_actions) * confidence_weight - (denies / total) * penalty
   * @param {string} entityHash
   * @returns {Promise<{score: number, level: string, breakdown: Object}>}
   */
  static async calculate(entityHash) {
    const counts = await CommunityReportService.getActionCounts(entityHash);
    const total = counts.report + counts.confirm + counts.deny;

    if (total === 0) {
      return { score: 0, level: 'no_data', breakdown: { reports: 0, confirms: 0, denies: 0 } };
    }

    // Base score from confirms vs denies
    const confirmRatio = total > 0 ? counts.confirm / total : 0;
    const denyRatio = total > 0 ? counts.deny / total : 0;
    const reportRatio = total > 0 ? counts.report / total : 0;

    // Each report is a signal, weighted by community engagement
    const reportWeight = Math.min(counts.report * 5, 30);
    const confirmWeight = confirmRatio * 40;
    const denyPenalty = denyRatio * 30;

    let score = Math.max(0, Math.min(100, reportWeight + confirmWeight - denyPenalty));

    // Boost from appeal activity (indicates contested data)
    if (counts.appeal > 0) {
      score = Math.max(0, score - Math.min(counts.appeal * 5, 20));
    }

    let level;
    if (score >= 70) level = 'high_confidence';
    else if (score >= 40) level = 'moderate_confidence';
    else if (score >= 10) level = 'low_confidence';
    else level = 'unreliable';

    return {
      score: Math.round(score),
      level,
      breakdown: {
        reports: counts.report,
        confirms: counts.confirm,
        denies: counts.deny,
        appeals: counts.appeal,
        total,
        confirmRatio: Math.round(confirmRatio * 100) / 100,
        denyRatio: Math.round(denyRatio * 100) / 100,
      },
    };
  }
}

module.exports = CommunityTrustService;