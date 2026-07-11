// validation/ValidationReportGenerator.js
// Generates comprehensive validation reports in JSON, CSV, and Markdown formats.

const PredictionComparator = require('./PredictionComparator');
const CalibrationAnalyzer = require('./CalibrationAnalyzer');
const ThresholdOptimizer = require('./ThresholdOptimizer');

class ValidationReportGenerator {
  /**
   * Generate a complete validation report.
   * @param {Array} aligned - Aligned predictions from PredictionComparator
   * @param {Object} options - { threshold, title, description }
   * @returns {Object} Report object
   */
  static generate(aligned, options = {}) {
    const threshold = options.threshold || 50;
    const comparison = PredictionComparator.compare(aligned, { threshold });
    const calibration = CalibrationAnalyzer.analyze(aligned);
    const bestF1 = ThresholdOptimizer.maximize(aligned, 'f1');
    const sweep = ThresholdOptimizer.thresholdSweep(aligned, [20, 30, 40, 50, 60, 70, 80]);

    return {
      report: {
        title: options.title || 'SELIDIKI Intelligence Validation Report',
        description: options.description || 'Automated validation of fraud prediction accuracy',
        generated_at: new Date().toISOString(),
        total_samples: comparison.total,
        threshold_used: threshold,
      },
      classification_metrics: {
        accuracy: comparison.accuracy,
        precision: comparison.precision,
        recall: comparison.recall,
        specificity: comparison.specificity,
        f1_score: comparison.f1,
        auc_roc: comparison.auc,
        confusion_matrix: comparison.confusion_matrix,
      },
      calibration_metrics: {
        expected_calibration_error: calibration.calibration_error,
        brier_score: calibration.brier_score,
        bins: calibration.bins,
      },
      error_analysis: comparison.error_analysis,
      optimal_threshold: {
        best_for_f1: bestF1,
        threshold_sweep: sweep,
      },
      roc_curve: comparison.roc_curve,
      pr_curve: comparison.pr_curve,
      calibration_curve: calibration.calibration_curve,
    };
  }

  /**
   * Export report as CSV string.
   * @param {Array} aligned
   * @param {Object} options
   * @returns {string} CSV data
   */
  static toCSV(aligned, options = {}) {
    const report = ValidationReportGenerator.generate(aligned, options);
    const lines = ['metric,value'];
    const m = report.classification_metrics;
    lines.push(`accuracy,${m.accuracy}`);
    lines.push(`precision,${m.precision}`);
    lines.push(`recall,${m.recall}`);
    lines.push(`specificity,${m.specificity}`);
    lines.push(`f1,${m.f1_score}`);
    lines.push(`auc_roc,${m.auc_roc}`);
    lines.push(`calibration_error,${report.calibration_metrics.expected_calibration_error}`);
    lines.push(`brier_score,${report.calibration_metrics.brier_score}`);
    lines.push(`mean_absolute_error,${report.error_analysis.mean_absolute_error}`);
    lines.push(`p95_error,${report.error_analysis.p95_error}`);
    return lines.join('\n') + '\n';
  }

  /**
   * Export report as Markdown.
   * @param {Array} aligned
   * @param {Object} options
   * @returns {string} Markdown document
   */
  static toMarkdown(aligned, options = {}) {
    const report = ValidationReportGenerator.generate(aligned, options);
    const m = report.classification_metrics;
    let md = `# ${report.report.title}\n\n`;
    md += `**Generated:** ${report.report.generated_at}\n`;
    md += `**Total Samples:** ${report.report.total_samples}\n`;
    md += `**Threshold:** ${report.report.threshold_used}\n\n`;

    md += `## Classification Metrics\n\n`;
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| Accuracy | ${m.accuracy} |\n`;
    md += `| Precision | ${m.precision} |\n`;
    md += `| Recall | ${m.recall} |\n`;
    md += `| Specificity | ${m.specificity} |\n`;
    md += `| F1 Score | ${m.f1_score} |\n`;
    md += `| AUC-ROC | ${m.auc_roc} |\n\n`;

    const cm = m.confusion_matrix;
    md += `## Confusion Matrix\n\n`;
    md += `| | Predicted Positive | Predicted Negative |\n|---|---|---|\n`;
    md += `| Actual Positive | TP: ${cm.tp} | FN: ${cm.fn} |\n`;
    md += `| Actual Negative | FP: ${cm.fp} | TN: ${cm.tn} |\n\n`;

    md += `## Error Analysis\n\n`;
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| Mean Absolute Error | ${report.error_analysis.mean_absolute_error} |\n`;
    md += `| Median Error | ${report.error_analysis.median_error} |\n`;
    md += `| P95 Error | ${report.error_analysis.p95_error} |\n`;
    md += `| Max Error | ${report.error_analysis.max_error} |\n\n`;

    md += `## Calibration\n\n`;
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| ECE | ${report.calibration_metrics.expected_calibration_error} |\n`;
    md += `| Brier Score | ${report.calibration_metrics.brier_score} |\n\n`;

    md += `## Optimal Threshold\n\n`;
    md += `Best threshold for F1: **${report.optimal_threshold.best_for_f1.threshold}** (F1: ${report.optimal_threshold.best_for_f1.metricValue})\n\n`;

    md += `## Threshold Sensitivity\n\n`;
    md += `| Threshold | Accuracy | Precision | Recall | F1 |\n|-----------|----------|-----------|--------|-----|\n`;
    for (const row of report.optimal_threshold.threshold_sweep) {
      md += `| ${row.threshold} | ${row.accuracy} | ${row.precision} | ${row.recall} | ${row.f1} |\n`;
    }

    return md;
  }

  /**
   * Export aligned data as JSON for further analysis.
   * @param {Array} aligned
   * @returns {string} JSON string
   */
  static toJSON(aligned) {
    return JSON.stringify({ predictions: aligned, exported_at: new Date().toISOString() }, null, 2);
  }
}

module.exports = ValidationReportGenerator;