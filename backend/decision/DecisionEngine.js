// decision/DecisionEngine.js
// Combines RuleEngine + risk score + velocity + trust score to produce modern decisions.

class DecisionEngine {
  static evaluate(signals) {
    const { riskScore = 0, confidence = 0, velocityScore = 0, trustScore = 50, ruleOutput = [], graphSummary = {} } = signals;
    const timestamp = new Date().toISOString();

    // Rule-based overrides
    const blockedByRule = ruleOutput.find(r => r.action === 'BLOCK' || r.action === 'B');
    if (blockedByRule) return DecisionEngine._build('BLOCK', riskScore, confidence, velocityScore, trustScore, ruleOutput, graphSummary, timestamp);
    const highRiskRule = ruleOutput.find(r => r.action === 'HIGH_RISK' || r.action === 'H');
    if (highRiskRule) return DecisionEngine._build('HIGH_RISK', riskScore, confidence, velocityScore, trustScore, ruleOutput, graphSummary, timestamp);

    // Score-based
    if (riskScore >= 80 && confidence >= 40) return DecisionEngine._build('BLOCK', riskScore, confidence, velocityScore, trustScore, ruleOutput, graphSummary, timestamp);
    if (riskScore >= 60 && velocityScore >= 55) return DecisionEngine._build('HIGH_RISK', riskScore, confidence, velocityScore, trustScore, ruleOutput, graphSummary, timestamp);
    if (riskScore >= 60 && confidence < 40) return DecisionEngine._build('MANUAL_REVIEW', riskScore, confidence, velocityScore, trustScore, ruleOutput, graphSummary, timestamp);
    if (riskScore >= 45 || velocityScore >= 50) return DecisionEngine._build('MEDIUM_RISK', riskScore, confidence, velocityScore, trustScore, ruleOutput, graphSummary, timestamp);
    if (riskScore >= 20 || ruleOutput.length > 0) return DecisionEngine._build('LOW_RISK', riskScore, confidence, velocityScore, trustScore, ruleOutput, graphSummary, timestamp);
    return DecisionEngine._build('SAFE', riskScore, confidence, velocityScore, trustScore, ruleOutput, graphSummary, timestamp);
  }

  static _build(decision, riskScore, confidence, velocityScore, trustScore, ruleOutput, graphSummary, timestamp) {
    const reasons = [];
    if (riskScore >= 60) reasons.push(`Risk score ${riskScore} exceeds threshold`);
    if (velocityScore >= 55) reasons.push(`Velocity ${velocityScore} indicates unusual activity`);
    if (confidence < 40) reasons.push(`Low confidence (${confidence}) requires manual review`);
    if (ruleOutput.length > 0) reasons.push(`${ruleOutput.length} rule(s) triggered`);
    if (trustScore >= 60) reasons.push(`High trust score (${trustScore})`);

    return {
      decision,
      score: Math.round(riskScore * 0.4 + velocityScore * 0.3 + (100 - trustScore) * 0.2 + (100 - confidence) * 0.1),
      confidence,
      reasons: reasons.length > 0 ? reasons : ['Standard evaluation - no risk indicators'],
      triggered_rules: ruleOutput.map(r => ({ rule: r.name, action: r.action, score: r.matchScore })),
      recommended_action: DecisionEngine._recommendation(decision),
      input_snapshot: { riskScore, confidence, velocityScore, trustScore, ruleCount: ruleOutput.length },
      timestamp,
    };
  }

  static _recommendation(decision) {
    const map = {
      SAFE: 'Tidak ada indikasi risiko. Proses dilanjutkan.',
      LOW_RISK: 'Risiko rendah. Pantau secara berkala.',
      MEDIUM_RISK: 'Risiko sedang. Verifikasi sebelum melanjutkan.',
      HIGH_RISK: 'Risiko tinggi. Investigasi segera diperlukan.',
      BLOCK: 'Transaksi diblokir. Hubungi tim keamanan.',
      MANUAL_REVIEW: 'Memerlukan review manual oleh moderator senior.',
    };
    return map[decision] || 'Evaluasi standar diterapkan.';
  }
}

module.exports = DecisionEngine;