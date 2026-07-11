// replay/AttackSimulator.js
// Simulates attacks by generating lookup + report events through the actual pipeline.

const db = require('../utils/db');
const FraudDataCollector = require('../data/FraudDataCollector');
const LookupEventCollector = require('../data/LookupEventCollector');
const GraphBuilder = require('../graph/GraphBuilder');
const RelationshipResolver = require('../graph/RelationshipResolver');
const TimelineBuilder = require('../timeline/TimelineBuilder');

class AttackSimulator {
  /**
   * Simulate a single attack by creating realistic events in the system.
   * @param {Object} attack - From HistoricalAttackPlayer.generateAttack()
   * @returns {Promise<Object>} { lookups, reports, graph_nodes }
   */
  static async simulate(attack) {
    const results = { lookups: 0, reports: 0, graphNodes: 0, timelineEvents: 0 };

    // Create lookups (pre-attack discovery)
    const lookupEvents = attack.events.filter(e => e.type === 'first_lookup' || e.type.includes('lookup'));
    for (const ev of lookupEvents) {
      try {
        await LookupEventCollector.recordLookup({
          lookupId: `replay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          entityType: 'phone',
          normalizedEntity: attack.entity_hash,
          hash: attack.entity_hash,
          riskScore: Math.floor(Math.random() * 30),
          confidence: 50,
          matchedProfiles: [],
          responseTime: Math.floor(Math.random() * 200 + 50),
          provider: 'replay',
          appVersion: '1.0.0-replay',
        });
        results.lookups++;
      } catch (e) { /* table may not exist */ }
    }

    // Create reports
    const reportEvents = attack.events.filter(e => e.type.includes('report'));
    for (const ev of reportEvents) {
      try {
        await FraudDataCollector.collectReportEvent({
          reportId: `replay_rpt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          entityType: 'phone',
          normalizedEntity: attack.entity_hash,
          hash: attack.entity_hash,
          riskScore: attack.actual_risk,
          confidence: 70 + Math.floor(Math.random() * 20),
          category: attack.scenario_id,
          reporterHash: `replay_reporter_${Math.random().toString(36).slice(2, 8)}`,
          evidenceUrl: null,
          description: `Replay: ${attack.scenario_name}`,
        });
        results.reports++;
      } catch (e) { /* table may not exist */ }
    }

    // Create graph nodes
    try {
      await GraphBuilder.addNode({
        id: attack.entity_hash,
        type: 'phone',
        properties: { hash: attack.entity_hash, risk_score: attack.actual_risk, category: attack.scenario_id },
      });
      results.graphNodes++;
    } catch (e) { /* table may not exist */ }

    // Create timeline events
    for (const ev of attack.events) {
      try {
        await TimelineBuilder.append({
          entityType: 'phone',
          entityHash: attack.entity_hash,
          eventType: 'REPORT',
          sourceId: `replay_${Date.now()}`,
          metadata: { scenario: attack.scenario_id, replay_type: ev.type },
          riskScore: attack.actual_risk,
          confidence: 80,
        });
        results.timelineEvents++;
      } catch (e) { /* table may not exist */ }
    }

    return results;
  }

  /**
   * Simulate a batch of attacks.
   * @param {Array} attacks
   * @returns {Promise<Object>} Aggregate results
   */
  static async simulateBatch(attacks) {
    const totals = { lookups: 0, reports: 0, graphNodes: 0, timelineEvents: 0 };
    for (const attack of attacks) {
      const r = await AttackSimulator.simulate(attack);
      totals.lookups += r.lookups;
      totals.reports += r.reports;
      totals.graphNodes += r.graphNodes;
      totals.timelineEvents += r.timelineEvents;
    }
    return totals;
  }
}

module.exports = AttackSimulator;