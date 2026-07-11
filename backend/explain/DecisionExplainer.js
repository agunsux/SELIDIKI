// explain/DecisionExplainer.js
// Explains decisions with reasoning.

const db = require('../utils/db');

class DecisionExplainer {
  static async explain(entityHash) {
    const rows = await db.query(
      `SELECT decision, score, confidence, reasons, recommended_action, timestamp
       FROM decision_history WHERE entity_hash = $1 ORDER BY timestamp DESC LIMIT 1`,
      [entityHash]
    );
    if (rows.rows.length === 0) return { has_decisions: false };
    const d = rows.rows[0];
    return {
      has_decisions: true,
      decision: d.decision,
      score: parseFloat(d.score),
      confidence: parseFloat(d.confidence),
      reasons: d.reasons || [],
      recommended_action: d.recommended_action,
      timestamp: d.timestamp,
      explanation_text: `Keputusan ${d.decision} dengan skor ${d.score} dan confidence ${d.confidence}. ${(d.reasons || []).join(' ')}`,
    };
  }
}
module.exports = DecisionExplainer;