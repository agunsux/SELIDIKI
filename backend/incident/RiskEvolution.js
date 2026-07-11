// incident/RiskEvolution.js
/**
 * RiskEvolution — ARGUS v1.2
 *
 * Tracks how risk scores change over time for an entity.
 * Shows when risk increased/decreased and what caused the change.
 */

const db = require('../utils/db');

class RiskEvolution {
  /**
   * Get risk score history for an entity.
   */
  static async getHistory(entityHash, limit = 30) {
    const events = [];

    // From timeline events
    try {
      const timeline = await db.query(
        `SELECT timestamp, risk_score, event_type, metadata
         FROM timeline_events WHERE entity_hash = $1 AND risk_score IS NOT NULL
         ORDER BY timestamp DESC LIMIT $2`, [entityHash, limit]
      );
      for (const r of timeline.rows) {
        events.push({
          timestamp: r.timestamp,
          riskScore: parseFloat(r.risk_score),
          eventType: r.event_type,
          reason: r.metadata?.category || r.event_type,
        });
      }
    } catch {}

    // From community actions
    try {
      const community = await db.query(
        `SELECT created_at as timestamp, action, reason
         FROM community_actions WHERE entity_hash = $1
         ORDER BY created_at DESC LIMIT $2`, [entityHash, limit]
      );
      for (const r of community.rows) {
        // Community actions don't have direct risk scores, but affect reputation
        events.push({
          timestamp: r.timestamp,
          riskScore: null,
          eventType: `community_${r.action}`,
          reason: r.reason || `Community ${r.action}`,
        });
      }
    } catch {}

    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const riskValues = events.filter(e => e.riskScore !== null).map(e => e.riskScore);
    const trend = riskValues.length > 1
      ? (riskValues[0] > riskValues[riskValues.length - 1] ? 'increasing' : 'decreasing')
      : 'stable';

    return {
      events: events.slice(0, limit),
      trend,
      currentRisk: riskValues[0] || 0,
      previousRisk: riskValues[1] || 0,
      change: riskValues.length > 1 ? riskValues[0] - riskValues[1] : 0,
      dataPoints: riskValues.length,
    };
  }
}

module.exports = RiskEvolution;