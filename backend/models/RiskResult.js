// models/RiskResult.js

/**
 * Domain model representing the output of the RiskEngine.
 * Contains deterministic scores and human‑readable label.
 */
class RiskResult {
  constructor({ riskScore, confidence, label, explanation, explanationCodes }) {
    this.riskScore = riskScore;
    this.confidence = confidence;
    this.label = label;
    this.explanation = explanation; // array of strings
    this.explanationCodes = explanationCodes; // array of {code, weight}
  }
}

module.exports = RiskResult;
