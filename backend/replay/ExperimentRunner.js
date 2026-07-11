// replay/ExperimentRunner.js
// Orchestrates and sequences replay experiments with configurable parameters.

const ReplayEngine = require('./ReplayEngine');
const AttackSimulator = require('./AttackSimulator');
const DecisionComparator = require('./DecisionComparator');
const HistoricalAttackPlayer = require('./HistoricalAttackPlayer');
const ScenarioLibrary = require('./ScenarioLibrary');

class ExperimentRunner {
  /**
   * Run a full experiment: generate → simulate → compare → report.
   * @param {Object} config - { name, scenarios, countPerScenario, simulate }
   * @returns {Promise<Object>}
   */
  static async run(config = {}) {
    console.log(`[ExperimentRunner] Starting: ${config.name || 'Unnamed'}`);

    // Phase 1: Generate attacks
    const attacks = HistoricalAttackPlayer.generateBatch(
      config.scenarios || ScenarioLibrary.getIds(),
      config.countPerScenario || 3
    );
    console.log(`[ExperimentRunner] Generated ${attacks.length} attacks`);

    // Phase 2: Simulate through pipeline
    let simulation = null;
    if (config.simulate !== false) {
      simulation = await AttackSimulator.simulateBatch(attacks);
      console.log(`[ExperimentRunner] Simulation complete: ${JSON.stringify(simulation)}`);
    }

    // Phase 3: Run replay engine
    const replayResult = await ReplayEngine.run({
      name: config.name || `Experiment_${Date.now()}`,
      scenarios: config.scenarios,
      countPerScenario: config.countPerScenario || 3,
    });

    // Phase 4: Detection delay
    const delayStats = await DecisionComparator.computeDetectionDelay(attacks);

    // Phase 5: Counterfactual analysis
    const counterfactual = ReplayEngine.runCounterfactual(
      HistoricalAttackPlayer.toGroundTruth(attacks),
      config.counterfactualThresholds || [30, 40, 50, 60, 70]
    );

    return {
      experiment_name: config.name || 'Experiment',
      attacks_generated: attacks.length,
      scenarios: config.scenarios || ScenarioLibrary.getIds(),
      simulation,
      replay: replayResult,
      detection_delay: delayStats,
      counterfactual,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Run a minimal experiment (no simulation).
   * @param {Object} config
   * @returns {Promise<Object>}
   */
  static async runLight(config = {}) {
    return ExperimentRunner.run({ ...config, simulate: false });
  }

  /**
   * Run all scenarios for systematic evaluation.
   * @param {number} countPerScenario
   * @returns {Promise<Object>}
   */
  static async runFull(countPerScenario = 10) {
    return ExperimentRunner.run({
      name: 'Full_Scenario_Evaluation',
      scenarios: ScenarioLibrary.getIds(),
      countPerScenario,
      simulate: true,
    });
  }
}

module.exports = ExperimentRunner;