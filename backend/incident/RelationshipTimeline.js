// incident/RelationshipTimeline.js
/**
 * RelationshipTimeline — ARGUS v1.2
 *
 * Tracks how entities become connected over time through shared reports,
 * same phone numbers, bank accounts, URLs, or reporter activity.
 */

const db = require('../utils/db');

class RelationshipTimeline {
  /**
   * Get relationship history for an entity: when and how it connected to others.
   */
  static async getHistory(entityHash, limit = 20) {
    const result = await db.query(`
      SELECT e.created_at as timestamp, e.relationship_type, e.weight,
             CASE WHEN e.source_id::text = $1 THEN e.target_id::text ELSE e.source_id::text END as connected_entity,
             n.type as connected_type, n.risk_score as connected_risk
      FROM graph_edges e
      LEFT JOIN graph_nodes n ON n.id::text = CASE WHEN e.source_id::text = $1 THEN e.target_id::text ELSE e.source_id::text END
      WHERE e.source_id::text = $1 OR e.target_id::text = $1
      ORDER BY e.created_at DESC
      LIMIT $2
    `, [entityHash, limit]);

    return result.rows.map(r => ({
      timestamp: r.timestamp,
      relationshipType: r.relationship_type,
      weight: parseFloat(r.weight) || 1,
      connectedEntity: r.connected_entity,
      connectedType: r.connected_type,
      connectedRisk: r.connected_risk,
    }));
  }
}

module.exports = RelationshipTimeline;