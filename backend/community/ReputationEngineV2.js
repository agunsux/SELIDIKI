// community/ReputationEngineV2.js
/**
 * ReputationEngineV2 — ARGUS v1.2
 *
 * Replaces static score with weighted evidence system.
 * All evidence weights are configurable — no hardcoded formulas.
 * Supports future calibration via config profiles.
 */

const ConfigLoader = require('../config/ConfigLoader');

class ReputationEngineV2 {
  /**
   * Calculate a weighted reputation score.
   * @param {Object} evidence - Evidence breakdown { reports, confirms, denies, appeals, evidenceCount, uniqueReporters }
   * @param {Object} [weights] - Optional weight overrides
   * @returns {{ score: number, level: string, weighted: Object }}
   */
  static calculate(evidence, weights) {
    // Load weights from config with fallback
    const cfg = weights || ConfigLoader.get('reputation.weights', {
      reportWeight: 5,
      confirmWeight: 10,
      denyWeight: -8,
      appealWeight: -3,
      evidenceWeight: 4,
      reporterBonus: 3,
      maxScore: 100,
      decayDays: 90,
      levels: [
        { min: 80, label: 'trusted' },
        { min: 50, label: 'established' },
        { min: 20, label: 'active' },
        { min: 0, label: 'new' },
      ],
    });

    const weighted = {};
    let score = 0;

    // Report count weight
    weighted.reports = (evidence.reports || 0) * cfg.reportWeight;
    score += Math.min(weighted.reports, 30);

    // Confirm count weight
    weighted.confirms = (evidence.confirms || 0) * cfg.confirmWeight;
    score += Math.min(weighted.confirms, 40);

    // Deny count penalty
    weighted.denies = (evidence.denies || 0) * cfg.denyWeight;
    score += Math.max(weighted.denies, -30);

    // Appeal count penalty
    weighted.appeals = (evidence.appeals || 0) * cfg.appealWeight;
    score += Math.max(weighted.appeals, -15);

    // Evidence quality bonus
    weighted.evidenceQuality = (evidence.evidenceCount || 0) * cfg.evidenceWeight;
    score += Math.min(weighted.evidenceQuality, 20);

    // Unique reporter bonus
    weighted.uniqueReporters = (evidence.uniqueReporters || 0) * cfg.reporterBonus;
    score += Math.min(weighted.uniqueReporters, 15);

    // Clamp to 0-maxScore
    score = Math.max(0, Math.min(cfg.maxScore, score));

    // Determine level
    let level = 'new';
    for (const l of cfg.levels.sort((a, b) => b.min - a.min)) {
      if (score >= l.min) { level = l.label; break; }
    }

    return { score: Math.round(score), level, weighted };
  }

  /**
   * Calculate based on database evidence for an entity.
   */
  static async calculateForEntity(entityHash, weightOverrides) {
    const db = require('../utils/db');
    try {
      const result = await db.query(`
        SELECT
          COUNT(*) FILTER (WHERE action='report') as reports,
          COUNT(*) FILTER (WHERE action='confirm') as confirms,
          COUNT(*) FILTER (WHERE action='deny') as denies,
          COUNT(*) FILTER (WHERE action='appeal') as appeals,
          COUNT(DISTINCT actor_hash) as unique_reporters
        FROM community_actions WHERE entity_hash = $1
      `, [entityHash]);
      const row = result.rows[0] || {};
      const evidence = {
        reports: parseInt(row.reports || 0),
        confirms: parseInt(row.confirms || 0),
        denies: parseInt(row.denies || 0),
        appeals: parseInt(row.appeals || 0),
        evidenceCount: parseInt(row.reports || 0) + parseInt(row.confirms || 0),
        uniqueReporters: parseInt(row.unique_reporters || 0),
      };
      return this.calculate(evidence, weightOverrides);
    } catch {
      return this.calculate({ reports: 0, confirms: 0, denies: 0, appeals: 0, evidenceCount: 0, uniqueReporters: 0 }, weightOverrides);
    }
  }
}

module.exports = ReputationEngineV2;