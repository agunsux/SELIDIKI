// validation/CalibrationAnalyzer.js
// Analyzes calibration of predicted probabilities against actual outcomes.
// A well-calibrated model: when predicting 80% risk, ~80% are actually fraud.

class CalibrationAnalyzer {
  /**
   * Compute calibration by binning predictions into deciles.
   * @param {Array} aligned - [{ predictedRisk, actualRisk }]
   * @param {number} bins - Number of bins (default: 10)
   * @returns {Object} { bins, calibrationError, brierScore, calibrationCurve }
   */
  static analyze(aligned, bins = 10) {
    if (aligned.length === 0) return { error: 'No data', bins: [], calibrationError: 0, brierScore: 0 };

    const binResults = [];
    const binSize = 100 / bins;

    for (let i = 0; i < bins; i++) {
      const lower = i * binSize;
      const upper = (i + 1) * binSize;
      const inBin = aligned.filter(a => a.predictedRisk >= lower && a.predictedRisk < upper);
      if (inBin.length === 0) continue;

      const avgPredicted = inBin.reduce((s, a) => s + a.predictedRisk, 0) / inBin.length;
      const actualPositives = inBin.filter(a => a.actualRisk >= 50).length;
      const fractionPositive = actualPositives / inBin.length;

      binResults.push({
        bin: `${Math.round(lower)}-${Math.round(upper)}`,
        count: inBin.length,
        avg_predicted: Math.round(avgPredicted * 100) / 100,
        fraction_positive: Math.round(fractionPositive * 10000) / 10000,
        calibration_gap: Math.round((avgPredicted / 100 - fractionPositive) * 10000) / 10000,
      });
    }

    // Expected Calibration Error (ECE)
    const total = binResults.reduce((s, b) => s + b.count, 0);
    const calibrationError = total > 0
      ? binResults.reduce((s, b) => s + (b.count / total) * Math.abs(b.calibration_gap), 0)
      : 0;

    // Brier Score: Mean Squared Error of probability predictions
    const brierScore = aligned.reduce((s, a) => {
      const p = a.predictedRisk / 100;
      const o = a.actualRisk >= 50 ? 1 : 0;
      return s + (p - o) * (p - o);
    }, 0) / aligned.length;

    return {
      total_samples: aligned.length,
      bins: binResults,
      calibration_error: Math.round(calibrationError * 10000) / 10000,
      brier_score: Math.round(brierScore * 10000) / 10000,
      calibration_curve: binResults.map(b => ({
        mean_predicted: b.avg_predicted,
        fraction_positive: b.fraction_positive * 100,
      })),
    };
  }
}

module.exports = CalibrationAnalyzer;