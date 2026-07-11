// graph/EntityClusterService.js
// Service for discovering and analyzing fraud clusters in the graph.

const GraphRepository = require('./GraphRepository');
const GraphBuilder = require('./GraphBuilder');

class EntityClusterService {
  /**
   * Find all entities connected to a given node within N hops.
   * Uses BFS-style traversal of graph edges.
   * @param {string} startNodeId
   * @param {number} maxHops - Maximum traversal depth
   * @returns {Promise<Object>} { nodes, edges, depth }
   */
  static async findConnectedEntities(startNodeId, maxHops = 3) {
    const visited = new Set();
    const clusterEdges = new Map();
    let queue = [{ nodeId: startNodeId, depth: 0 }];
    visited.add(startNodeId);

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift();
      if (depth >= maxHops) continue;

      const edges = await GraphBuilder.getNodeEdges(nodeId);
      for (const edge of edges) {
        const edgeKey = `${edge.source_id}-${edge.target_id}-${edge.relationship}`;
        clusterEdges.set(edgeKey, edge);

        const neighborId = edge.source_id === nodeId ? edge.target_id : edge.source_id;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({ nodeId: neighborId, depth: depth + 1 });
        }
      }
    }

    // Fetch node details
    const nodeIds = Array.from(visited);
    const nodes = [];
    for (const id of nodeIds) {
      const node = await GraphBuilder.getNode(id);
      if (node) nodes.push(node);
    }

    return {
      nodes,
      edges: Array.from(clusterEdges.values()),
      size: nodes.length,
      depth: maxHops,
    };
  }

  /**
   * Find the shortest path between two nodes using BFS.
   * @param {string} startNodeId
   * @param {string} endNodeId
   * @returns {Promise<Object|null>} { path, length } or null if unreachable
   */
  static async findShortestPath(startNodeId, endNodeId) {
    if (startNodeId === endNodeId) {
      return { path: [startNodeId], length: 0 };
    }

    const visited = new Set([startNodeId]);
    const queue = [{ nodeId: startNodeId, path: [startNodeId] }];

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift();

      const edges = await GraphBuilder.getNodeEdges(nodeId);
      for (const edge of edges) {
        const neighborId = edge.source_id === nodeId ? edge.target_id : edge.source_id;

        if (neighborId === endNodeId) {
          return { path: [...path, neighborId], length: path.length };
        }

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({ nodeId: neighborId, path: [...path, neighborId] });
        }
      }
    }

    return null;
  }

  /**
   * Find fraud cluster around a given entity by type.
   * @param {string} entityHash - Phone hash to start from
   * @param {number} maxHops
   * @returns {Promise<Object>} Cluster summary with risk assessment
   */
  static async findFraudCluster(entityHash, maxHops = 3) {
    const cluster = await EntityClusterService.findConnectedEntities(entityHash, maxHops);

    // Categorize nodes by type
    const byType = {};
    for (const node of cluster.nodes) {
      if (!byType[node.type]) byType[node.type] = [];
      byType[node.type].push(node);
    }

    // Calculate cluster risk
    const riskScores = cluster.nodes
      .map(n => {
        const props = typeof n.properties === 'string' ? JSON.parse(n.properties) : n.properties;
        return parseFloat(props?.risk_score) || 0;
      })
      .filter(s => s > 0);

    const avgRisk = riskScores.length > 0
      ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length
      : 0;

    return {
      center_entity: entityHash,
      size: cluster.size,
      depth: cluster.depth,
      node_types: Object.keys(byType).map(t => ({ type: t, count: byType[t].length })),
      nodes: cluster.nodes,
      edges: cluster.edges,
      risk_summary: {
        average_risk: Math.round(avgRisk * 100) / 100,
        max_risk: Math.max(...riskScores, 0),
        high_risk_count: riskScores.filter(s => s >= 70).length,
      },
    };
  }

  /**
   * Calculate aggregate risk score for a cluster.
   * @param {Array} nodes - Cluster nodes
   * @param {Array} edges - Cluster edges
   * @returns {Object} { clusterRisk, density, explanation }
   */
  static calculateClusterRisk(nodes, edges) {
    if (nodes.length === 0) {
      return { clusterRisk: 0, density: 0, explanation: ['No nodes in cluster'] };
    }

    const nodeRisks = nodes.map(n => {
      const props = typeof n.properties === 'string' ? JSON.parse(n.properties) : n.properties;
      return parseFloat(props?.risk_score) || 0;
    });

    const avgRisk = nodeRisks.reduce((a, b) => a + b, 0) / nodes.length;
    const maxRisk = Math.max(...nodeRisks, 0);

    // Density: ratio of actual edges to max possible edges
    const maxPossibleEdges = (nodes.length * (nodes.length - 1)) / 2;
    const density = maxPossibleEdges > 0 ? edges.length / maxPossibleEdges : 0;

    // Final cluster risk: weighted combination
    const clusterRisk = Math.min(100, Math.round(
      avgRisk * 0.5 + maxRisk * 0.3 + density * 20
    ));

    const explanation = [
      `Average node risk: ${Math.round(avgRisk)}`,
      `Maximum node risk: ${Math.round(maxRisk)}`,
      `Cluster density: ${(density * 100).toFixed(1)}%`,
      `Node count: ${nodes.length}`,
      `Edge count: ${edges.length}`,
    ];

    return { clusterRisk, density, explanation };
  }
}

module.exports = EntityClusterService;