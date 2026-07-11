// trust/CommunityConfidenceService.js
// Calculates community confidence scores based on report diversity, volume, and recency.

const db = require('../utils/db');

class CommunityConfidenceService {
  /**
   * Calculate community confidence for an entity.
   * @param {string} entityHash
   * @returns {Promise<Object>} { confidence, explanation, breakdown }
   */
  static async calculateConfidence(entityHash) {
    const breakdown = {};

    // 1. Report volume factor (0-40 points)
    const volumeResult = await db.query(
      'SELECT COUNT(*) AS cnt FROM fraud_events WHERE hash = $1 AND event_type = $2',
      [entityHash, 'report']
    );
    const reportCount = parseInt(volumeResult.rows[0].cnt, 10);
    const volumeScore = Math.min(40, reportCount * 8);
    breakdown.volume = { score: volumeScore, weight: 40, reason: `${reportCount} reports found` };

    // 2. Unique reporters factor (0-25 points)
    const reporterResult = await db.query(
      'SELECT COUNT(DISTINCT reporter_hash) AS cnt FROM fraud_events WHERE hash = $1 AND reporter_hash IS NOT NULL',
      [entityHash]
    );
    const uniqueReporters = parseInt(reporterResult.rows[0].cnt, 10);
    const reporterScore = Math.min(25, uniqueReporters * 12);
    breakdown.unique_reporters = { score: reporterScore, weight: 25, reason: `${uniqueReporters} unique reporters` };

    // 3. Evidence diversity factor (0-20 points)
    const evidenceResult = await db.query(
      `SELECT COUNT(DISTINCT fe.category) AS cat_cnt,
              COUNT(ev.id) AS ev_cnt
       FROM fraud_events fe
       LEFT JOIN evidence_items ev ON ev.report_id = fe.report_id
       WHERE fe.hash = $1`,
      [entityHash]
    );
    const categoryCount = parseInt(evidenceResult.rows[0].cat_cnt, 10);
    const evidenceCount = parseInt(evidenceResult.rows[0].ev_cnt, 10);
    const diversityScore = Math.min(20, (categoryCount * 5) + (evidenceCount * 2));
    breakdown.diversity = { score: diversityScore, weight: 20, reason: `${categoryCount} categories, ${evidenceCount} evidence items` };

    // 4. Recency factor (0-15 points)
    const recencyResult = await db.query(
      `SELECT MAX(timestamp) AS last_event
       FROM fraud_events WHERE hash = $1`,
      [entityHash]
    );
    const lastEvent = recencyResult.rows[0]?.last_event;
    let recencyScore = 0;
    if (lastEvent) {
      const daysSince = (Date.now() - new Date(lastEvent).getTime()) / (1000 * 60 * 60 * 24);
      recencyScore = Math.max(0, Math.min(15, 15 - Math.floor(daysSince)));
    }
    breakdown.recency = { score: recencyScore, weight: 15, reason: lastEvent ? `${Math.round(daysSince)} days since last event` : 'no events' };

    const totalConfidence = Math.min(100, Math.round(
      volumeScore + reporterScore + diversityScore + recencyScore
    ));

    const explanation = Object.values(breakdown).map(b => b.reason);

    return {
      confidence: totalConfidence,
      explanation,
      breakdown,
    };
  }

  /**
   * Get geographic diversity for an entity (province distribution from reports).
   * @param {string} entityHash
   * @returns {Promise<Object>}
   */
  static async getGeographicDiversity(entityHash) {
    const result = await db.query(
      `SELECT properties->>'province' AS province, COUNT(*) AS count
       FROM graph_nodes n
       JOIN graph_edges e ON (e.source_id = n.id OR e.target_id = n.id)
       WHERE (e.source_id = $1 OR e.target_id = $1) AND n.type = 'reporter'
         AND n.properties->>'province' IS NOT NULL
       GROUP BY n.properties->>'province'`,
      [entityHash]
    );
    return result.rows.map(r => ({ province: r.province, count: parseInt(r.count, 10) }));
  }
}

module.exports = CommunityConfidenceService;