// incident/IncidentCluster.js
/**
 * IncidentCluster — ARGUS v1.2
 *
 * Groups related entities into incident clusters based on shared attributes
 * (same bank, same reporter, same timeframe, graph proximity).
 */

const db = require('../utils/db');

class IncidentCluster {
  /**
   * Find related entities that form an incident cluster.
   * @param {string} entityHash
   * @param {number} [maxHops=2]
   * @returns {Promise<{entities: Object[], relationships: Object[], risk: Object}>}
   */
  static async findCluster(entityHash, maxHops = 2) {
    let entities = new Map();
    let relationships = new Map();
    const visited = new Set();
    let queue = [{ hash: entityHash, depth: 0 }];

    // BFS through graph edges
    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current.hash) || current.depth > maxHops) continue;
      visited.add(current.hash);

      try {
        // Find graph neighbors
        const neighbors = await db.query(`
          SELECT DISTINCT
            CASE WHEN n.id::text = e.source_id THEN e.target_id::text ELSE e.source_id::text END as related_hash,
            e.relationship_type, e.weight
          FROM graph_edges e
          JOIN graph_nodes n ON n.id = e.source_id OR n.id = e.target_id
          WHERE (e.source_id::text = $1 OR e.target_id::text = $1) AND n.id::text != $1
        `, [current.hash]);

        for (const row of neighbors.rows) {
          const relKey = [current.hash, row.related_hash].sort().join('::');
          if (!relationships.has(relKey)) {
            relationships.set(relKey, {
              source: current.hash,
              target: row.related_hash,
              type: row.relationship_type,
              weight: parseFloat(row.weight) || 1,
            });
          }

          if (!visited.has(row.related_hash)) {
            queue.push({ hash: row.related_hash, depth: current.depth + 1 });
          }
        }
      } catch {}

      // Get entity info
      try {
        const info = await db.query(
          'SELECT risk_score, reports_count, category FROM graph_nodes WHERE id::text = $1', [current.hash]
        );
        if (info.rows.length > 0) {
          entities.set(current.hash, {
            hash: current.hash,
            riskScore: info.rows[0].risk_score,
            reportsCount: info.rows[0].reports_count,
            category: info.rows[0].category,
          });
        }
      } catch {
        entities.set(current.hash, { hash: current.hash, riskScore: 0, reportsCount: 0 });
      }
    }

    const entityList = Array.from(entities.values());
    const avgRisk = entityList.reduce((s, e) => s + (e.riskScore || 0), 0) / Math.max(entityList.length, 1);

    return {
      size: entityList.length,
      entities: entityList,
      relationships: Array.from(relationships.values()),
      risk: {
        averageRisk: Math.round(avgRisk),
        maxRisk: Math.max(...entityList.map(e => e.riskScore || 0)),
        entityCount: entityList.length,
      },
    };
  }
}

module.exports = IncidentCluster;