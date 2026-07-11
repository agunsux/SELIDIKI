// decision/DecisionRepository.js
// Persists all decisions immutably for audit and replay.

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

class DecisionRepository {
  static async save(decision) {
    const record = {
      id: uuidv4(),
      entity_hash: decision.entityHash || null,
      decision: decision.decision,
      score: decision.score || 0,
      confidence: decision.confidence || 0,
      reasons: decision.reasons || [],
      triggered_rules: decision.triggeredRules || [],
      recommended_action: decision.recommendedAction || '',
      input_snapshot: decision.inputSnapshot || {},
      timestamp: new Date().toISOString(),
    };

    const query = `
      INSERT INTO decision_history (id, entity_hash, decision, score, confidence,
        reasons, triggered_rules, recommended_action, input_snapshot, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    const values = [
      record.id, record.entity_hash, record.decision, record.score,
      record.confidence, JSON.stringify(record.reasons),
      JSON.stringify(record.triggered_rules), record.recommended_action,
      JSON.stringify(record.input_snapshot), record.timestamp,
    ];

    try {
      await db.query(query, values);
    } catch (err) {
      if (err.code === '42P01' || err.message.includes('does not exist')) {
        await DecisionRepository._ensureTable();
        await db.query(query, values);
      } else throw err;
    }
    return record;
  }

  static async findByEntity(entityHash, limit = 50) {
    const q = 'SELECT * FROM decision_history WHERE entity_hash = $1 ORDER BY timestamp DESC LIMIT $2';
    const r = await db.query(q, [entityHash, limit]);
    return r.rows;
  }

  static async getStats() {
    const q = `SELECT decision, COUNT(*) AS count FROM decision_history GROUP BY decision`;
    const r = await db.query(q);
    const stats = { total: 0 };
    for (const row of r.rows) { stats[row.decision] = parseInt(row.count, 10); stats.total += parseInt(row.count, 10); }
    return stats;
  }

  static async _ensureTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS decision_history (
        id UUID PRIMARY KEY,
        entity_hash VARCHAR(255),
        decision VARCHAR(32) NOT NULL,
        score NUMERIC(5,2) DEFAULT 0,
        confidence NUMERIC(5,2) DEFAULT 0,
        reasons JSONB DEFAULT '[]',
        triggered_rules JSONB DEFAULT '[]',
        recommended_action TEXT,
        input_snapshot JSONB DEFAULT '{}',
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_decision_entity ON decision_history(entity_hash);
      CREATE INDEX IF NOT EXISTS idx_decision_type ON decision_history(decision);
      CREATE INDEX IF NOT EXISTS idx_decision_ts ON decision_history(timestamp);
    `);
  }
}

module.exports = DecisionRepository;