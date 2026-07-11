// replay/DecisionComparator.js
// Compares replay attack results against system decisions and risk engine outputs.

const db = require('../utils/db');
const PredictionComparator = require('../validation/PredictionComparator');
const CalibrationAnalyzer = require('../validation/CalibrationAnalyzer');
const ConfusionMatrix = require('../validation/ConfusionMatrix');
const ThresholdOptimizer = require('../validation/ThresholdOptimizer');

class DecisionComparator {
  /**
   * Compare ground truth against decision_history predictions.
   * @param {Array} groundTruth - From HistoricalAttackPlayer.toGroundTruth()
   * @param {Object} options - { threshold }
   * @returns {Object} Comparison metrics
   */
  static async compareAgainstDecisionHistory(groundTruth, options = {}) {
    const predictions = await db.query(
      `SELECT entity_hash, score AS predicted_risk, decision AS predicted_decision
       FROM decision_history WHERE entity_hash = ANY($1)`,
      [groundTruth.map(g => g.entityHash)]
    );
    const aligned = PredictionComparator.align(predictions.rows, groundTruth);
    return PredictionComparator.compare(aligned, options);
  }

  /**
   * Compare ground truth against fraud_events risk scores.
   * @param {Array} groundTruth
   * @param {Object} options
   * @returns {Object}
   */
  static async compareAgainstRiskEngine(groundTruth, options = {}) {
    const risks = await db.query(
      `SELECT hash AS entity_hash, risk_score AS predicted_risk
       FROM fraud_events WHERE hash = ANY($1)`,
      [groundTruth.map(g => g.entityHash)]
    );
    const aligned = PredictionComparator.align(risks.rows, groundTruth);
    return PredictionComparator.compare(aligned, options);
  }

  /**
   * Find optimal threshold using replay ground truth.
   * @param {Array} groundTruth
   * @param {string} metric
   * @returns {Object}
   */
  static async findOptimalThreshold(groundTruth, metric = 'f1') {
    const predictions = await db.query(
      `SELECT entity_hash, score AS predicted_risk
       FROM decision_history WHERE entity_hash = ANY($1)`,
      [groundTruth.map(g => g.entityHash)]
    );
    const aligned = PredictionComparator.align(predictions.rows, groundTruth);
    return ThresholdOptimizer.maximize(aligned, metric);
  }

  /**
   * Compute detection delay: how long after first event was risk flagged?
   * @param {Array} attacks - From HistoricalAttackPlayer
   * @returns {Object} Delay statistics
   */
  static async computeDetectionDelay(attacks) {
    const delays = [];
    for (const attack of attacks.slice(0, 50)) {
      const firstEvent = new Date(attack.events[0]?.timestamp);
      const decisions = await db.query(
        `SELECT MIN(timestamp) AS first_decision FROM decision_history
         WHERE entity_hash = $1 AND decision IN ('HIGH_RISK','BLOCK','MANUAL_REVIEW')`,
        [attack.entity_hash]
      );
      if (decisions.rows[0]?.first_decision) {
        const delayMs = new Date(decisions.rows[0].first_decision).getTime() - firstEvent.getTime();
        delays.push(Math.max(0, delayMs / 3600000)); // hours
      }
    }
    return {
      total_detected: delays.length,
      avg_detection_hours: delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length * 100) / 100 : 0,
      max_detection_hours: delays.length > 0 ? Math.round(Math.max(...delays) * 100) / 100 : 0,
      min_detection_hours: delays.length > 0 ? Math.round(Math.min(...delays) * 100) / 100 : 0,
    };
  }
}

module.exports = DecisionComparator;