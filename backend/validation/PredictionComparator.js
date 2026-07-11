// validation/PredictionComparator.js
// Compares predicted risk scores against ground truth actual outcomes.

const ConfusionMatrix = require('./ConfusionMatrix');

class PredictionComparator {
  /**
   * Align predictions with ground truth by entity hash.
   * @param {Array} predictions - [{ entityHash, predictedRisk, predictedDecision }]
   * @param {Array} groundTruth - [{ entity_hash, actual_risk }]
   * @returns {Array} [{ predictedRisk, actualRisk, predictedDecision, delta }]
   */
  static align(predictions, groundTruth) {
    const gtMap = {};
    for (const gt of groundTruth) gtMap[gt.entity_hash] = gt.actual_risk;

    const aligned = [];
    for (const pred of predictions) {
      const entityHash = pred.entityHash || pred.entity_hash;
      const actualRisk = gtMap[entityHash];
      if (actualRisk !== undefined) {
        const predictedRisk = parseFloat(pred.predictedRisk !== undefined ? pred.predictedRisk : pred.predicted_risk);
        aligned.push({
          predictedRisk: isNaN(predictedRisk) ? 0 : predictedRisk,
          actualRisk: parseFloat(actualRisk) || 0,
          predictedDecision: pred.predictedDecision || pred.predicted_decision || 'UNKNOWN',
          delta: Math.abs(predictedRisk - (parseFloat(actualRisk) || 0)),
          entityHash,
        });
      }
    }
    return aligned;
  }

  /**
   * Compute full comparison metrics.
   * @param {Array} aligned - Result from align()
   * @param {Object} options - { threshold }
   * @returns {Object} Metrics including confusion matrix, AUC, error stats
   */
  static compare(aligned, options = {}) {
    const threshold = options.threshold || 50;

    if (aligned.length === 0) {
      return { total: 0, error: 'No aligned predictions found' };
    }

    // Confusion matrix
    const cm = ConfusionMatrix.compute(aligned, threshold);
    const roc = ConfusionMatrix.computeROCCurve(aligned);
    const auc = ConfusionMatrix.computeAUC(aligned);
    const pr = ConfusionMatrix.computePRCurve(aligned);

    // Error analysis
    const deltas = aligned.map(a => a.delta);
    const meanAbsError = deltas.reduce((s, d) => s + d, 0) / deltas.length;
    const maxError = Math.max(...deltas);
    const deltasSorted = [...deltas].sort((a, b) => a - b);
    const p50 = deltasSorted[Math.floor(deltasSorted.length * 0.5)];
    const p95 = deltasSorted[Math.floor(deltasSorted.length * 0.95)];

    return {
      total: aligned.length,
      threshold,
      confusion_matrix: { tp: cm.tp, fp: cm.fp, tn: cm.tn, fn: cm.fn },
      accuracy: cm.accuracy,
      precision: cm.precision,
      recall: cm.recall,
      specificity: cm.specificity,
      f1: cm.f1,
      auc,
      roc_curve: roc,
      pr_curve: pr,
      error_analysis: {
        mean_absolute_error: Math.round(meanAbsError * 100) / 100,
        max_error: Math.round(maxError * 100) / 100,
        median_error: Math.round(p50 * 100) / 100,
        p95_error: Math.round(p95 * 100) / 100,
      },
    };
  }
}

module.exports = PredictionComparator;