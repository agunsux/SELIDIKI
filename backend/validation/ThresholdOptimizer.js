// validation/ThresholdOptimizer.js
// Finds optimal risk thresholds to maximize F1, precision, or recall.

const ConfusionMatrix = require('./ConfusionMatrix');

class ThresholdOptimizer {
  /**
   * Find threshold that maximizes a given metric.
   * @param {Array} aligned - [{ predictedRisk, actualRisk }]
   * @param {string} metric - 'f1' | 'precision' | 'recall' | 'accuracy' | 'youden'
   * @returns {Object} { threshold, metricValue }
   */
  static maximize(aligned, metric = 'f1') {
    let best = { threshold: 50, metricValue: 0 };

    for (let t = 5; t <= 95; t += 1) {
      const cm = ConfusionMatrix.compute(aligned, t);
      let value;
      switch (metric) {
        case 'f1': value = cm.f1; break;
        case 'precision': value = cm.precision; break;
        case 'recall': value = cm.recall; break;
        case 'accuracy': value = cm.accuracy; break;
        case 'youden': value = cm.recall + cm.specificity - 1; break;
        default: value = cm.f1;
      }
      if (value > best.metricValue) {
        best = { threshold: t, metricValue: Math.round(value * 10000) / 10000 };
      }
    }

    return best;
  }

  /**
   * Compute metrics for a range of thresholds for sensitivity analysis.
   * @param {Array} aligned
   * @param {Array} thresholds - e.g., [30, 40, 50, 60, 70]
   * @returns {Array} [{ threshold, accuracy, precision, recall, f1, specificity }]
   */
  static thresholdSweep(aligned, thresholds = [30, 40, 50, 60, 70]) {
    return thresholds.map(t => {
      const cm = ConfusionMatrix.compute(aligned, t);
      return {
        threshold: t,
        accuracy: cm.accuracy,
        precision: cm.precision,
        recall: cm.recall,
        f1: cm.f1,
        specificity: cm.specificity,
      };
    });
  }

  /**
   * Find threshold that achieves a target precision level.
   * @param {Array} aligned
   * @param {number} targetPrecision - e.g., 0.90
   * @returns {Object} { threshold, actualPrecision, recall }
   */
  static findThresholdForPrecision(aligned, targetPrecision = 0.9) {
    for (let t = 95; t >= 5; t -= 1) {
      const cm = ConfusionMatrix.compute(aligned, t);
      if (cm.precision >= targetPrecision) {
        return { threshold: t, actualPrecision: cm.precision, recall: cm.recall, f1: cm.f1 };
      }
    }
    const cm = ConfusionMatrix.compute(aligned, 50);
    return { threshold: 50, actualPrecision: cm.precision, recall: cm.recall, f1: cm.f1 };
  }
}

module.exports = ThresholdOptimizer;