// replay/HistoricalAttackPlayer.js
// Generates realistic attack event sequences from scenario definitions.

const ScenarioLibrary = require('./ScenarioLibrary');

class HistoricalAttackPlayer {
  /**
   * Generate a realistic attack sequence from a scenario.
   * @param {string} scenarioId - Key from ScenarioLibrary
   * @param {Object} options - { entityHash, startDate, speedFactor }
   * @returns {Array} Timeline of events suitable for feeding into the engine
   */
  static generateAttack(scenarioId, options = {}) {
    const scenario = ScenarioLibrary.get(scenarioId);
    if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);

    const baseTime = options.startDate ? new Date(options.startDate).getTime() : Date.now();
    const speed = options.speedFactor || 1;
    const entityHash = options.entityHash || `replay_${scenarioId}_${Date.now()}`;

    const riskScore = scenario.typical_risk_range[0] +
      Math.floor(Math.random() * (scenario.typical_risk_range[1] - scenario.typical_risk_range[0]));

    return {
      entity_hash: entityHash,
      scenario_id: scenarioId,
      scenario_name: scenario.name,
      actual_risk: riskScore,
      actual_category: scenarioId,
      events: scenario.events.map(ev => ({
        type: ev.type,
        timestamp: new Date(baseTime + ev.days_before * 86400000 * speed).toISOString(),
        entity_hash: entityHash,
      })),
    };
  }

  /**
   * Generate multiple attacks for batch testing.
   * @param {Array} scenarioIds
   * @param {number} countPerScenario
   * @returns {Array}
   */
  static generateBatch(scenarioIds = null, countPerScenario = 5) {
    const ids = scenarioIds || ScenarioLibrary.getIds();
    const results = [];
    for (const id of ids) {
      for (let i = 0; i < countPerScenario; i++) {
        results.push(HistoricalAttackPlayer.generateAttack(id, {
          entityHash: `replay_${id}_${i}_${Date.now()}`,
          speedFactor: 1,
        }));
      }
    }
    return results;
  }

  /**
   * Get ground truth records from generated attacks.
   * @param {Array} attacks - Output from generateAttack/generateBatch
   * @returns {Array} Ground truth records for Validation Framework
   */
  static toGroundTruth(attacks) {
    return attacks.map(a => ({
      entityHash: a.entity_hash,
      entityType: 'phone',
      actualRisk: a.actual_risk,
      actualCategory: a.scenario_id,
      source: 'historical_replay',
      verifiedBy: 'replay_engine',
    }));
  }
}

module.exports = HistoricalAttackPlayer;