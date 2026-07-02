// services/riskEngine.js

const config = require('../config/reputationConfig');

/**
 * Stateless rule‑based risk calculation.
 * @param {Object} params
 * @param {Object|null} params.entityRecord - row from fraud_entities (may be null)
 * @param {Array} params.reports - array of rows from fraud_reports
 * @returns {Object} riskResult containing riskScore, confidence, label, explanations, etc.
 */
class RiskEngine {
  static calculate({ entityRecord, reports }) {
    // Base score from entity (if exists) else default 0
    const baseScore = entityRecord ? entityRecord.risk_score || 0 : 0;
    const reportCount = reports.length;
    const uniqueReporters = new Set(reports.map(r => r.reporter_id)).size;
    // Trusted reporters count (assuming reporter table has "trusted" flag)
    const trustedReporters = reports.filter(r => r.trusted).length; // reporter.trusted should be joined

    // Recency: reports within RECENT_REPORT_WINDOW_DAYS
    const recentWindowMs = config.RECENT_REPORT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const recentReports = reports.filter(r => now - new Date(r.created_at).getTime() <= recentWindowMs).length;

    // False report penalty (assuming reports have a boolean "false_positive")
    const falsePositives = reports.filter(r => r.false_positive).length;

    // Weight calculations (using config.RISK_WEIGHTS)
    const w = config.RISK_WEIGHTS;
    let riskScore =
      baseScore * w.BASE_SCORE +
      reportCount * w.REPORT_COUNT +
      uniqueReporters * w.UNIQUE_REPORTERS +
      recentReports * w.RECENT_REPORTS +
      trustedReporters * w.TRUSTED_REPORTER_BONUS +
      falsePositives * w.FALSE_REPORT_PENALTY;

    // Clamp to 0‑100
    riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

    // Confidence calculation (simplified weighted sum)
    const cw = config.CONFIDENCE_WEIGHTS;
    let confidence =
      reportCount * cw.REPORT_COUNT +
      uniqueReporters * cw.UNIQUE_REPORTERS +
      trustedReporters * cw.TRUSTED_REPORTERS -
      falsePositives * Math.abs(cw.CONFLICT_RATIO);
    confidence = Math.max(0, Math.min(100, Math.round(confidence)));

    // Determine label via mapping
    const labelObj = config.LABEL_MAPPING.find(m => riskScore <= m.max) || { label: 'UNKNOWN' };
    const label = labelObj.label;

    // Build explanation array (simple textual explanations)
    const explanations = [];
    const explanationCodes = [];
    if (reportCount) {
      explanations.push(`${reportCount} reports`);
      explanationCodes.push({ code: 'REPORT_COUNT', weight: w.REPORT_COUNT });
    }
    if (recentReports) {
      explanations.push(`${recentReports} recent reports`);
      explanationCodes.push({ code: 'RECENT_REPORTS', weight: w.RECENT_REPORTS });
    }
    if (trustedReporters) {
      explanations.push(`${trustedReporters} trusted reporter(s)`);
      explanationCodes.push({ code: 'TRUSTED_REPORTERS', weight: w.TRUSTED_REPORTER_BONUS });
    }
    if (falsePositives) {
      explanations.push(`${falsePositives} false positive report(s)`);
      explanationCodes.push({ code: 'FALSE_POSITIVE', weight: w.FALSE_REPORT_PENALTY });
    }

    return {
      riskScore,
      confidence,
      label,
      explanation: explanations,
      explanationCodes,
    };
  }
}

module.exports = RiskEngine;
