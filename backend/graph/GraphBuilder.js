// graph/GraphBuilder.js
// Builds and manages the fraud graph nodes and relationships.
// Nodes: Phone, BankAccount, Domain, Device, Reporter, Case
// Relationships: PHONE->BANK, PHONE->DOMAIN, PHONE->REPORTER, PHONE->DEVICE, BANK->CASE, DOMAIN->CASE

const db = require('../utils/db');

class GraphBuilder {
  /**
   * Add a node to the graph (idempotent).
   * @param {Object} params
   * @param {string} params.id - Node unique ID
   * @param {string} params.type - Node type: 'phone'|'bank_account'|'domain'|'device'|'reporter'|'case'
   * @param {Object} params.properties - Node properties
   * @returns {Promise<Object>} The node record
   */
  static async addNode(params) {
    const query = `
      INSERT INTO graph_nodes (id, type, properties, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (id) DO UPDATE SET
        properties = EXCLUDED.properties,
        updated_at = NOW()
      RETURNING *
    `;
    const result = await db.query(query, [
      params.id, params.type, JSON.stringify(params.properties || {}),
    ]);
    return result.rows[0];
  }

  /**
   * Add or update an edge (relationship) between two nodes.
   * @param {Object} params
   * @param {string} params.sourceId - Source node ID
   * @param {string} params.targetId - Target node ID
   * @param {string} params.relationship - Relationship type
   * @param {Object} params.properties - Edge properties
   * @returns {Promise<Object>} The edge record
   */
  static async addEdge(params) {
    const query = `
      INSERT INTO graph_edges (source_id, target_id, relationship, properties, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (source_id, target_id, relationship) DO UPDATE SET
        properties = EXCLUDED.properties,
        updated_at = NOW()
      RETURNING *
    `;
    const result = await db.query(query, [
      params.sourceId, params.targetId, params.relationship,
      JSON.stringify(params.properties || {}),
    ]);
    return result.rows[0];
  }

  /**
   * Get a node by its ID.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  static async getNode(id) {
    const query = 'SELECT * FROM graph_nodes WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get all edges for a node (outgoing + incoming).
   * @param {string} nodeId
   * @returns {Promise<Array>}
   */
  static async getNodeEdges(nodeId) {
    const query = `
      SELECT * FROM graph_edges
      WHERE source_id = $1 OR target_id = $1
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [nodeId]);
    return result.rows;
  }

  /**
   * Delete a node and its edges.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  static async deleteNode(id) {
    await db.query('DELETE FROM graph_edges WHERE source_id = $1 OR target_id = $1', [id]);
    await db.query('DELETE FROM graph_nodes WHERE id = $1', [id]);
    return true;
  }

  static async _ensureTables() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS graph_nodes (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(32) NOT NULL,
        properties JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes(type);

      CREATE TABLE IF NOT EXISTS graph_edges (
        source_id VARCHAR(255) NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
        target_id VARCHAR(255) NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
        relationship VARCHAR(64) NOT NULL,
        properties JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ,
        PRIMARY KEY (source_id, target_id, relationship)
      );
      CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_id);
      CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_id);
      CREATE INDEX IF NOT EXISTS idx_graph_edges_relationship ON graph_edges(relationship);
    `);
  }
}

module.exports = GraphBuilder;