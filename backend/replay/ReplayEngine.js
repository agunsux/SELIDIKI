// replay/ReplayEngine.js
// Orchestrates replay of historical attacks through the intelligence pipeline.

const HistoricalAttackPlayer = require('./HistoricalAttackPlayer');
const ReplayScenarioRepository = require('./ReplayScenarioRepository');
const ScenarioLibrary = require('./ScenarioLibrary');
const DecisionComparator = require('./DecisionComparator');

class ReplayEngine {
  /**
   * Run a complete replay experiment.
   * @param {Object} config - { scenarios, countPerScenario, comparative }
   * @returns {Object} { experiment, results, comparison }
   */
  static async run(config = {}) {
    const scenarios = config.scenarios || ScenarioLibrary.getIds();
    const count = config.countPerScenario || 5;

    // Generate attacks
    const attacks = HistoricalAttackPlayer.generateBatch(scenarios, count);
    const groundTruth = HistoricalAttackPlayer.toGroundTruth(attacks);

    // Save scenario config
    const saved = await ReplayScenarioRepository.save({
      name: config.name || `Replay_${Date.now()}`,
      scenarioId: 'batch',
      entityCount: attacks.length,
      events: attacks,
    });

    // Compare with standard threshold
    const defaultComparison = DecisionComparator.compareAgainstDecisionHistory(groundTruth, { threshold: 50 });
    const comparison = DecisionComparator.compareAgainstRiskEngine(groundTruth, { threshold: 50 });

    // Threshold sweep for optimal
    const f1Optimal = DecisionComparator.findOptimalThreshold(groundTruth, 'f1');

    return {
      experiment_id: saved.id,
      experiment_name: saved.name,
      total_attacks: attacks.length,
      scenario_count: scenarios.length,
      scenarios_used: scenarios,
      results: {
        default_threshold: defaultComparison,
        risk_engine: comparison,
      },
      optimization: {
        best_f1_threshold: f1Optimal,
      },
      attacks_schema: 'entity_hash, scenario_id, actual_risk, events_count',
      ground_truth_ready: groundTruth.length,
    };
  }

  /**
   * Run counterfactual: what if threshold was different?
   * @param {Array} groundTruth
   * @param {Array} thresholds - e.g., [30, 40, 50, 60, 70]
   * @returns {Object}
   */
  static runCounterfactual(groundTruth, thresholds = [30, 40, 50, 60, 70]) {
    const results = {};
    for (const t of thresholds) {
      results[`threshold_${t}`] = DecisionComparator.compareAgainstDecisionHistory(groundTruth, { threshold: t });
    }
    return results;
  }

  static async listExperiments() {
    return ReplayScenarioRepository.list();
  }
}

module.exports = ReplayEngine;