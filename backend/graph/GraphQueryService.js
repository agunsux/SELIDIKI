// graph/GraphQueryService.js
// High-level query service for the fraud graph, combining repository and cluster logic.

const GraphRepository = require('./GraphRepository');
const EntityClusterService = require('./EntityClusterService');
const RelationshipResolver = require('./RelationshipResolver');
const GraphBuilder = require('./GraphBuilder');

class GraphQueryService {
  /**
   * Get a full graph summary for an entity.
   * @param {string} entityHash
   * @returns {Promise<Object>}
   */
  static async getEntityGraphSummary(entityHash) {
    const node = await GraphBuilder.getNode(entityHash);
    if (!node) {
      return { exists: false, entity: entityHash, relationships: {}, cluster: null };
    }

    const relationships = await RelationshipResolver.getPhoneRelationships(entityHash);
    const cluster = await EntityClusterService.findFraudCluster(entityHash, 2);

    return {
      exists: true,
      entity: entityHash,
      node_type: node.type,
      node_properties: node.properties,
      relationships,
      cluster: {
        size: cluster.size,
        node_types: cluster.node_types,
        risk_summary: cluster.risk_summary,
      },
    };
  }

  /**
   * Get a graph summary (minimal version for API).
   * @param {string} entityHash
   * @returns {Promise<Object>}
   */
  static async getGraphSummary(entityHash) {
    const node = await GraphBuilder.getNode(entityHash);
    if (!node) {
      return { node_count: 0, edge_count: 0, entity_count: 0, has_graph: false };
    }

    const edges = await GraphBuilder.getNodeEdges(entityHash);
    const uniqueEntities = new Set();
    for (const edge of edges) {
      uniqueEntities.add(edge.source_id);
      uniqueEntities.add(edge.target_id);
    }

    return {
      node_count: 1,
      edge_count: edges.length,
      entity_count: uniqueEntities.size,
      has_graph: edges.length > 0,
      relationship_types: [...new Set(edges.map(e => e.relationship))],
    };
  }

  /**
   * Search nodes by type and property value.
   * @param {string} type - Node type
   * @param {string} propertyKey - Property key to search
   * @param {string} propertyValue - Property value to match
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  static async searchNodes(type, propertyKey, propertyValue, limit = 20) {
    return GraphRepository.findNodesByType(type, { [propertyKey]: propertyValue }, limit);
  }

  /**
   * Get all nodes of a given type.
   * @param {string} type
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  static async getNodesByType(type, limit = 50) {
    return GraphRepository.findNodesByType(type, {}, limit);
  }

  /**
   * Get statistics about the graph.
   * @returns {Promise<Object>}
   */
  static async getGraphStatistics() {
    const types = ['phone', 'bank_account', 'domain', 'device', 'reporter', 'case'];
    const typeCounts = {};

    for (const type of types) {
      typeCounts[type] = await GraphRepository.countByType(type);
    }

    const totalNodes = Object.values(typeCounts).reduce((a, b) => a + b, 0);
    const phoneEdges = await GraphRepository.findEdgesByRelationship('PHONE_BANK', 1);
    const totalEdges = phoneEdges.length > 0 ? 'available' : 'no_data';

    return {
      total_nodes: totalNodes,
      nodes_by_type: typeCounts,
      total_edges: totalEdges,
    };
  }
}

module.exports = GraphQueryService;