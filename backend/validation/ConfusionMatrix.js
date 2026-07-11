// validation/ConfusionMatrix.js
// Computes complete classification metrics from predicted vs actual outcomes.
// Threshold: risk >= threshold => POSITIVE (fraud), risk < threshold => NEGATIVE (safe)

class ConfusionMatrix {
  /**
   * Compute confusion matrix and derived metrics.
   * @param {Array} predictions - [{ predictedRisk, actualRisk }]
   * @param {number} threshold - Risk threshold for positive classification (default: 50)
   * @returns {Object} { tp, fp, tn, fn, accuracy, precision, recall, specificity, f1, rocPoints }
   */
  static compute(predictions, threshold = 50) {
    let tp = 0, fp = 0, tn = 0, fn = 0;

    for (const p of predictions) {
      const predictedPositive = p.predictedRisk >= threshold;
      const actualPositive = p.actualRisk >= threshold;

      if (predictedPositive && actualPositive) tp++;
      else if (predictedPositive && !actualPositive) fp++;
      else if (!predictedPositive && !actualPositive) tn++;
      else fn++;
    }

    const total = tp + fp + tn + fn;
    const accuracy = total > 0 ? (tp + tn) / total : 0;
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const specificity = (tn + fp) > 0 ? tn / (tn + fp) : 0;
    const f1 = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
    const sensitivity = recall;

    return {
      tp, fp, tn, fn,
      total,
      accuracy: Math.round(accuracy * 10000) / 10000,
      precision: Math.round(precision * 10000) / 10000,
      recall: Math.round(recall * 10000) / 10000,
      specificity: Math.round(specificity * 10000) / 10000,
      sensitivity: Math.round(sensitivity * 10000) / 10000,
      f1: Math.round(f1 * 10000) / 10000,
      threshold,
    };
  }

  /**
   * Compute ROC curve points by evaluating thresholds from 0 to 100.
   * @param {Array} predictions
   * @returns {Array} [{ threshold, tpr, fpr }]
   */
  static computeROCCurve(predictions) {
    const points = [];
    for (let t = 0; t <= 100; t += 5) {
      const m = ConfusionMatrix.compute(predictions, t);
      const tpr = m.recall; // True Positive Rate = Recall
      const fpr = 1 - m.specificity; // False Positive Rate
      points.push({ threshold: t, tpr: Math.round(tpr * 10000) / 10000, fpr: Math.round(fpr * 10000) / 10000 });
    }
    return points;
  }

  /**
   * Compute Area Under ROC Curve using trapezoidal rule.
   * @param {Array} predictions
   * @returns {number} AUC score (0-1)
   */
  static computeAUC(predictions) {
    const curve = ConfusionMatrix.computeROCCurve(predictions);
    // Sort by FPR ascending for proper trapezoidal integration
    const sorted = [...curve].sort((a, b) => a.fpr - b.fpr);
    let auc = 0;
    for (let i = 1; i < sorted.length; i++) {
      const dx = sorted[i].fpr - sorted[i - 1].fpr;
      const dy = (sorted[i].tpr + sorted[i - 1].tpr) / 2;
      auc += dx * dy;
    }
    return Math.round(auc * 10000) / 10000;
  }

  /**
   * Compute Precision-Recall curve points.
   * @param {Array} predictions
   * @returns {Array} [{ threshold, precision, recall }]
   */
  static computePRCurve(predictions) {
    const points = [];
    for (let t = 0; t <= 100; t += 5) {
      const m = ConfusionMatrix.compute(predictions, t);
      points.push({ threshold: t, precision: m.precision, recall: m.recall });
    }
    return points;
  }
}

module.exports = ConfusionMatrix;