// explain/RuleExplainer.js
// Explains which rules were triggered and why.

const db = require('../utils/db');

class RuleExplainer {
  static async explain(entityHash) {
    const decisions = await db.query(
      `SELECT triggered_rules FROM decision_history WHERE entity_hash = $1
       AND triggered_rules IS NOT NULL AND triggered_rules != '[]'::jsonb
       ORDER BY timestamp DESC LIMIT 5`,
      [entityHash]
    );
    const triggered = [];
    for (const row of decisions.rows) {
      const rules = typeof row.triggered_rules === 'string' ? JSON.parse(row.triggered_rules) : row.triggered_rules;
      if (Array.isArray(rules)) triggered.push(...rules);
    }
    const unique = triggered.filter((r, i, a) => a.findIndex(x => x.rule === r.rule) === i);
    return {
      count: unique.length,
      rules: unique.map(r => ({
        name: r.rule || r.name,
        action: r.action,
        match_score: r.score || r.matchScore,
        explanation: r.action === 'BLOCK' ? 'Aturan pemblokiran otomatis terpicu' :
                      r.action === 'HIGH_RISK' ? 'Aturan risiko tinggi terpenuhi' :
                      'Aturan keamanan terpicu',
      })),
    };
  }
}
module.exports = RuleExplainer;