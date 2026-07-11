// graph/RelationshipResolver.js
// Resolves and materializes relationships between graph nodes from source data.

const GraphBuilder = require('./GraphBuilder');
const GraphRepository = require('./GraphRepository');

class RelationshipResolver {
  /**
   * Resolve relationships from a fraud event to create graph edges.
   * @param {Object} event - Fraud event from fraud_events table
   * @returns {Promise<Array>} Created edges
   */
  static async resolveFromEvent(event) {
    const edges = [];
    const phoneNodeId = event.hash;

    // Ensure phone node exists
    await GraphBuilder.addNode({
      id: phoneNodeId,
      type: 'phone',
      properties: {
        hash: event.hash,
        entity_type: event.entity_type,
        risk_score: parseFloat(event.risk_score) || 0,
        category: event.category || null,
      },
    });

    // If reporter exists, create PHONE -> REPORTER edge
    if (event.reporter_hash) {
      const reporterNodeId = `reporter:${event.reporter_hash}`;
      await GraphBuilder.addNode({
        id: reporterNodeId,
        type: 'reporter',
        properties: { hash: event.reporter_hash },
      });
      const reporterEdge = await GraphBuilder.addEdge({
        sourceId: phoneNodeId,
        targetId: reporterNodeId,
        relationship: 'PHONE_REPORTER',
        properties: { report_id: event.report_id, timestamp: event.timestamp },
      });
      edges.push(reporterEdge);
    }

    // If case/category exists, create PHONE -> CASE edge
    if (event.report_id) {
      const caseNodeId = `case:${event.report_id}`;
      await GraphBuilder.addNode({
        id: caseNodeId,
        type: 'case',
        properties: {
          report_id: event.report_id,
          category: event.category || 'unknown',
          risk_score: parseFloat(event.risk_score) || 0,
        },
      });
      const caseEdge = await GraphBuilder.addEdge({
        sourceId: phoneNodeId,
        targetId: caseNodeId,
        relationship: 'PHONE_CASE',
        properties: { timestamp: event.timestamp },
      });
      edges.push(caseEdge);
    }

    return edges;
  }

  /**
   * Create a PHONE -> BANK relationship.
   * @param {string} phoneHash
   * @param {string} accountHash
   * @param {string} bankCode
   * @param {Object} properties
   * @returns {Promise<Object>}
   */
  static async linkPhoneToBank(phoneHash, accountHash, bankCode, properties = {}) {
    const bankNodeId = `bank:${accountHash}`;

    await GraphBuilder.addNode({
      id: bankNodeId,
      type: 'bank_account',
      properties: { hash: accountHash, bank_code: bankCode, ...properties },
    });

    return GraphBuilder.addEdge({
      sourceId: phoneHash,
      targetId: bankNodeId,
      relationship: 'PHONE_BANK',
      properties,
    });
  }

  /**
   * Create a PHONE -> DOMAIN relationship.
   * @param {string} phoneHash
   * @param {string} domain
   * @param {Object} properties
   * @returns {Promise<Object>}
   */
  static async linkPhoneToDomain(phoneHash, domain, properties = {}) {
    const domainNodeId = `domain:${domain}`;

    await GraphBuilder.addNode({
      id: domainNodeId,
      type: 'domain',
      properties: { domain, ...properties },
    });

    return GraphBuilder.addEdge({
      sourceId: phoneHash,
      targetId: domainNodeId,
      relationship: 'PHONE_DOMAIN',
      properties,
    });
  }

  /**
   * Create a PHONE -> DEVICE relationship.
   * @param {string} phoneHash
   * @param {string} deviceId
   * @param {Object} properties
   * @returns {Promise<Object>}
   */
  static async linkPhoneToDevice(phoneHash, deviceId, properties = {}) {
    const deviceNodeId = `device:${deviceId}`;

    await GraphBuilder.addNode({
      id: deviceNodeId,
      type: 'device',
      properties: { device_id: deviceId, ...properties },
    });

    return GraphBuilder.addEdge({
      sourceId: phoneHash,
      targetId: deviceNodeId,
      relationship: 'PHONE_DEVICE',
      properties,
    });
  }

  /**
   * Create a BANK -> CASE relationship.
   * @param {string} accountHash
   * @param {string} caseId
   * @param {Object} properties
   * @returns {Promise<Object>}
   */
  static async linkBankToCase(accountHash, caseId, properties = {}) {
    const bankNodeId = `bank:${accountHash}`;
    const caseNodeId = `case:${caseId}`;

    return GraphBuilder.addEdge({
      sourceId: bankNodeId,
      targetId: caseNodeId,
      relationship: 'BANK_CASE',
      properties,
    });
  }

  /**
   * Create a DOMAIN -> CASE relationship.
   * @param {string} domain
   * @param {string} caseId
   * @param {Object} properties
   * @returns {Promise<Object>}
   */
  static async linkDomainToCase(domain, caseId, properties = {}) {
    const domainNodeId = `domain:${domain}`;
    const caseNodeId = `case:${caseId}`;

    return GraphBuilder.addEdge({
      sourceId: domainNodeId,
      targetId: caseNodeId,
      relationship: 'DOMAIN_CASE',
      properties,
    });
  }

  /**
   * Get all relationships for a phone entity.
   * @param {string} phoneHash
   * @returns {Promise<Object>}
   */
  static async getPhoneRelationships(phoneHash) {
    const edges = await GraphBuilder.getNodeEdges(phoneHash);
    const relationships = {
      banks: [],
      domains: [],
      devices: [],
      reporters: [],
      cases: [],
    };

    for (const edge of edges) {
      const targetId = edge.source_id === phoneHash ? edge.target_id : edge.source_id;
      const targetNode = await GraphBuilder.getNode(targetId);
      if (!targetNode) continue;

      const entry = { node_id: targetId, type: targetNode.type, properties: targetNode.properties };

      if (edge.relationship === 'PHONE_BANK') relationships.banks.push(entry);
      else if (edge.relationship === 'PHONE_DOMAIN') relationships.domains.push(entry);
      else if (edge.relationship === 'PHONE_DEVICE') relationships.devices.push(entry);
      else if (edge.relationship === 'PHONE_REPORTER') relationships.reporters.push(entry);
      else if (edge.relationship === 'PHONE_CASE') relationships.cases.push(entry);
    }

    return relationships;
  }
}

module.exports = RelationshipResolver;