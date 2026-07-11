// search/RelationshipExplorer.js
/**
 * RelationshipExplorer — ARGUS v1.4
 *
 * Explores entity relationships across types: phone↔bank, email↔domain,
 * merchant↔QRIS, telegram↔phone, wallet↔merchant, etc.
 */

const db = require('../utils/db');

class RelationshipExplorer {
  static async explore(entityHash, maxDepth = 2) {
    const graph = { nodes: new Map(), edges: new Map() };
    const visited = new Set();
    let queue = [{ hash: entityHash, depth: 0, relationship: 'self' }];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current.hash) || current.depth > maxDepth) continue;
      visited.add(current.hash);

      graph.nodes.set(current.hash, {
        hash: current.hash,
        depth: current.depth,
        relationship: current.relationship,
      });

      try {
        const neighbors = await db.query(`
          SELECT DISTINCT
            CASE WHEN source_id::text = $1 THEN target_id::text ELSE source_id::text END as related_hash,
            relationship_type as rel_type, weight
          FROM graph_edges
          WHERE (source_id::text = $1 OR target_id::text = $1) AND created_at > NOW() - INTERVAL '1 year'
          LIMIT 20
        `, [current.hash]);

        for (const row of neighbors.rows) {
          const edgeKey = [current.hash, row.related_hash].sort().join('::');
          if (!graph.edges.has(edgeKey)) {
            graph.edges.set(edgeKey, {
              source: current.hash,
              target: row.related_hash,
              type: row.rel_type || 'unknown',
              weight: parseFloat(row.weight || 1),
            });
          }
          if (!visited.has(row.related_hash) && current.depth + 1 <= maxDepth) {
            queue.push({ hash: row.related_hash, depth: current.depth + 1, relationship: row.rel_type });
          }
        }
      } catch {}
    }

    return {
      center: entityHash,
      nodeCount: graph.nodes.size,
      edgeCount: graph.edges.size,
      nodes: Array.from(graph.nodes.values()),
      edges: Array.from(graph.edges.values()),
      maxDepth: Math.max(...Array.from(graph.nodes.values()).map(n => n.depth)),
    };
  }

  static async getRelationshipScore(entityHash) {
    try {
      const r = await db.query(`
        SELECT COUNT(*) as edge_count,
               AVG(weight) as avg_weight,
               COUNT(DISTINCT relationship_type) as type_count
        FROM graph_edges WHERE source_id::text = $1 OR target_id::text = $1
      `, [entityHash]);
      const row = r.rows[0];
      const edgeCount = parseInt(row?.edge_count || 0);
      return {
        score: Math.min(100, edgeCount * 5),
        edgeCount,
        typeCount: parseInt(row?.type_count || 0),
        avgWeight: parseFloat(row?.avg_weight || 0),
        level: edgeCount > 10 ? 'highly_connected' : edgeCount > 3 ? 'connected' : edgeCount > 0 ? 'minimal' : 'isolated',
      };
    } catch { return { score: 0, edgeCount: 0, level: 'unknown' }; }
  }

  static async findClusters(entityHash, minClusterSize = 3) {
    const explored = await this.explore(entityHash, 2);
    if (explored.nodeCount < minClusterSize) return null;

    return {
      size: explored.nodeCount,
      members: explored.nodes.map(n => n.hash),
      connections: explored.edges.length,
      density: explored.nodeCount > 1
        ? (explored.edges.length / (explored.nodeCount * (explored.nodeCount - 1) / 2)).toFixed(2)
        : 0,
    };
  }
}

module.exports = RelationshipExplorer;