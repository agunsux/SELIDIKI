// search/SearchPipeline.js
/**
 * SearchPipeline — ARGUS v1.4
 *
 * One pipeline for all entity types.
 * EntityDetector → Normalizer → Provider Registry → Evidence Engine → Decision Engine → Explainability → Response
 */

const EntityDetector = require('./EntityDetector');
const DecisionEngine = require('../decision/DecisionEngine');
const ActionResolver = require('../decision/ActionResolver');
const ExplanationEngine = require('../explain/ExplanationEngine');
const EntityResolutionService = require('../entity/EntityResolutionService');
const { hashInput, hashPhone, hashAccount } = require('../utils/crypto');
const db = require('../utils/db');

class SearchPipeline {
  /**
   * Execute a full search pipeline for any entity query.
   * @param {string} query - Raw user query
   * @param {Object} [options]
   * @returns {Promise<Object>} Unified response
   */
  static async execute(query, options = {}) {
    const startTime = Date.now();

    // 1. Detect entity type
    const detected = EntityDetector.detect(query);
    const { type } = detected;

    // 2. Resolve & normalize
    const resolved = EntityResolutionService.resolve(type, query);

    // 3. Generate hash
    const entityHash = SearchPipeline._hash(type, query, resolved.normalized || query);

    // 4. Gather signals from all sources
    const signals = await SearchPipeline._gatherSignals(entityHash, type, query, resolved);

    // 5. Run Decision Engine
    const decision = DecisionEngine.evaluate(signals);
    const action = ActionResolver.resolve(decision.decision);

    // 6. Run Explainability
    const explanation = await ExplanationEngine.explain(entityHash, signals);

    // 7. Gather related entities
    const related = await SearchPipeline._gatherRelated(entityHash);

    // 8. Build response
    const elapsed = Date.now() - startTime;

    return {
      query,
      entity_type: type,
      entity_hash: entityHash,
      normalized: resolved.normalized || query,
      normalized_details: resolved,
      detection: detected,
      decision: {
        ...decision,
        recommended_action: action,
      },
      explanation,
      related_entities: related,
      performance: {
        total_ms: elapsed,
        from_cache: false,
      },
      timestamp: new Date().toISOString(),
    };
  }

  static async _gatherSignals(entityHash, type, query, resolved) {
    let riskScore = 0;
    let confidence = 0;
    let velocityScore = 0;
    let trustScore = 50;
    const ruleOutput = [];

    // Evidence from fraud_events
    try {
      const reports = await db.query(
        'SELECT COUNT(*) as cnt, AVG(risk_score) as avg_risk, AVG(confidence) as avg_conf FROM fraud_events WHERE hash = $1',
        [entityHash]
      );
      const r = reports.rows[0];
      riskScore = parseFloat(r?.avg_risk || 0);
      confidence = parseFloat(r?.avg_conf || 50);
    } catch {}

    // Velocity from lookup_events
    try {
      const vel = await db.query(
        "SELECT COUNT(*) as cnt FROM lookup_events WHERE hash = $1 AND timestamp > NOW() - INTERVAL '1 hour'",
        [entityHash]
      );
      const cnt = parseInt(vel.rows[0]?.cnt || 0);
      velocityScore = Math.min(100, cnt * 10);
    } catch {}

    // Trust from community actions
    try {
      const comm = await db.query(
        `SELECT COUNT(*) FILTER (WHERE action='confirm') as c,
                COUNT(*) FILTER (WHERE action='deny') as d
         FROM community_actions WHERE entity_hash = $1`, [entityHash]
      );
      const row = comm.rows[0];
      const total = parseInt(row?.c || 0) + parseInt(row?.d || 0);
      if (total > 0) trustScore = (parseInt(row?.c || 0) / total) * 100;
    } catch {}

    return { riskScore, confidence, velocityScore, trustScore, ruleOutput, graphSummary: {} };
  }

  static async _gatherRelated(entityHash) {
    try {
      const edges = await db.query(`
        SELECT DISTINCT CASE WHEN source_id::text = $1 THEN target_id::text ELSE source_id::text END as related,
               relationship_type as type, weight
        FROM graph_edges WHERE source_id::text = $1 OR target_id::text = $1 LIMIT 10
      `, [entityHash]);
      return edges.rows.map(r => ({ hash: r.related, type: r.type, weight: parseFloat(r.weight || 1) }));
    } catch { return []; }
  }

  static _hash(type, query, normalized) {
    if (type === 'phone') return hashPhone(query);
    if (type === 'bank_account') {
      const parts = normalized.match(/^([A-Z]+)(\d+)$/);
      return hashAccount(parts?.[2] || query, parts?.[1] || 'UNKNOWN');
    }
    return hashInput(normalized || query);
  }
}

module.exports = SearchPipeline;