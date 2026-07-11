// graph/GraphRepository.js
// Repository layer for graph persistence, providing query methods
// over graph_nodes and graph_edges tables without business logic.

const db = require('../utils/db');

class GraphRepository {
  /**
   * Find nodes by type and properties filter.
   * @param {string} type - Node type
   * @param {Object} propertyFilter - Key-value pairs to match in properties JSONB
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  static async findNodesByType(type, propertyFilter = {}, limit = 100) {
    let query = 'SELECT * FROM graph_nodes WHERE type = $1';
    const values = [type];
    let paramIndex = 2;

    for (const [key, value] of Object.entries(propertyFilter)) {
      query += ` AND properties->>$paramIndex = $${paramIndex + 1}`;
      values.push(key, String(value));
      paramIndex += 2;
    }

    query += ` LIMIT $${paramIndex}`;
    values.push(limit);
    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Find edges by relationship type.
   * @param {string} relationship - Relationship type
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  static async findEdgesByRelationship(relationship, limit = 100) {
    const query = `
      SELECT * FROM graph_edges WHERE relationship = $1
      ORDER BY created_at DESC LIMIT $2
    `;
    const result = await db.query(query, [relationship, limit]);
    return result.rows;
  }

  /**
   * Get all edges connected to a set of node IDs.
   * @param {Array<string>} nodeIds
   * @returns {Promise<Array>}
   */
  static async getEdgesForNodes(nodeIds) {
    if (nodeIds.length === 0) return [];
    const placeholders = nodeIds.map((_, i) => `$${i + 1}`).join(',');
    const query = `
      SELECT * FROM graph_edges
      WHERE source_id IN (${placeholders}) OR target_id IN (${placeholders})
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [...nodeIds, ...nodeIds]);
    return result.rows;
  }

  /**
   * Get nodes connected to a given node by relationship type.
   * @param {string} nodeId
   * @param {string} relationship
   * @returns {Promise<Array>}
   */
  static async getConnectedNodes(nodeId, relationship) {
    const query = `
      SELECT n.*, e.relationship, e.properties AS edge_properties
      FROM graph_nodes n
      JOIN graph_edges e ON (e.source_id = n.id OR e.target_id = n.id)
      WHERE (e.source_id = $1 OR e.target_id = $1)
        AND e.relationship = $2
        AND n.id != $1
    `;
    const result = await db.query(query, [nodeId, relationship]);
    return result.rows;
  }

  /**
   * Count nodes by type.
   * @param {string} type
   * @returns {Promise<number>}
   */
  static async countByType(type) {
    const query = 'SELECT COUNT(*) FROM graph_nodes WHERE type = $1';
    const result = await db.query(query, [type]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Batch insert nodes.
   * @param {Array<Object>} nodes - Array of { id, type, properties }
   * @returns {Promise<Array>}
   */
  static async batchInsertNodes(nodes) {
    if (nodes.length === 0) return [];
    const values = [];
    const placeholders = nodes.map((node, i) => {
      const offset = i * 3;
      values.push(node.id, node.type, JSON.stringify(node.properties || {}));
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, NOW())`;
    });

    const query = `
      INSERT INTO graph_nodes (id, type, properties, created_at)
      VALUES ${placeholders.join(',')}
      ON CONFLICT (id) DO NOTHING
      RETURNING *
    `;
    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Batch insert edges.
   * @param {Array<Object>} edges - Array of { sourceId, targetId, relationship, properties }
   * @returns {Promise<Array>}
   */
  static async batchInsertEdges(edges) {
    if (edges.length === 0) return [];
    const values = [];
    const placeholders = edges.map((edge, i) => {
      const offset = i * 4;
      values.push(edge.sourceId, edge.targetId, edge.relationship, JSON.stringify(edge.properties || {}));
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, NOW())`;
    });

    const query = `
      INSERT INTO graph_edges (source_id, target_id, relationship, properties, created_at)
      VALUES ${placeholders.join(',')}
      ON CONFLICT (source_id, target_id, relationship) DO NOTHING
      RETURNING *
    `;
    const result = await db.query(query, values);
    return result.rows;
  }
}

module.exports = GraphRepository;