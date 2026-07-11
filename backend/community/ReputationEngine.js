// community/ReputationEngine.js
/**
 * ReputationEngine — ARGUS v1.2
 *
 * Tracks and updates user reputation based on community actions.
 * Users gain reputation for accurate reports and lose it for false reports.
 */

const db = require('../utils/db');
const CommunityReportService = require('./CommunityReportService');

class ReputationEngine {
  /**
   * Calculate reputation for a community member.
   * @param {string} actorHash
   * @returns {Promise<{score: number, level: string, history: Object}>}
   */
  static async calculate(actorHash) {
    const actions = await db.query(
      'SELECT action, COUNT(*) as count FROM community_actions WHERE actor_hash = $1 GROUP BY action',
      [actorHash]
    );

    const counts = { report: 0, confirm: 0, deny: 0, appeal: 0 };
    for (const row of actions.rows) counts[row.action] = parseInt(row.count, 10);

    const total = counts.report + counts.confirm + counts.deny + counts.appeal;
    if (total === 0) return { score: 0, level: 'new', history: counts };

    // Scoring: confirms add value, reports show engagement, denies/appeals may be negative
    let score = 0;
    score += Math.min(counts.report * 2, 20);  // up to 20 for reports
    score += Math.min(counts.confirm * 5, 40); // up to 40 for confirms
    score -= Math.min(counts.deny * 3, 30);    // up to -30 for denies
    score = Math.max(0, Math.min(100, score));

    let level;
    if (score >= 80) level = 'trusted';
    else if (score >= 50) level = 'established';
    else if (score >= 20) level = 'active';
    else level = 'new';

    return { score, level, history: counts };
  }
}

module.exports = ReputationEngine;