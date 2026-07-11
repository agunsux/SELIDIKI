// decision/DecisionAuditService.js
// Full audit trail for decisions.

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

class DecisionAuditService {
  static async log(entry) {
    const record = {
      id: uuidv4(),
      entity_hash: entry.entityHash || null,
      decision: entry.decision,
      score: entry.score || 0,
      confidence: entry.confidence || 0,
      inputs: entry.inputs || {},
      outputs: entry.outputs || {},
      decision_source: entry.source || 'engine',
      actor: entry.actor || 'system',
      timestamp: new Date().toISOString(),
    };
    const q = `INSERT INTO decision_audit_log (id, entity_hash, decision, score, confidence, inputs, outputs, decision_source, actor, timestamp)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`;
    const v = [record.id, record.entity_hash, record.decision, record.score, record.confidence,
      JSON.stringify(record.inputs), JSON.stringify(record.outputs), record.decision_source, record.actor, record.timestamp];
    try { await db.query(q, v); }
    catch (err) {
      if (err.code === '42P01' || err.message.includes('does not exist')) { await DecisionAuditService._ensureTable(); await db.query(q, v); }
      else throw err;
    }
    return record;
  }

  static async query(filters = {}) {
    let q = 'SELECT * FROM decision_audit_log WHERE 1=1';
    const v = []; let p = 1;
    if (filters.entityHash) { q += ` AND entity_hash=$${p++}`; v.push(filters.entityHash); }
    if (filters.decision) { q += ` AND decision=$${p++}`; v.push(filters.decision); }
    if (filters.startDate) { q += ` AND timestamp>=$${p++}`; v.push(filters.startDate); }
    if (filters.endDate) { q += ` AND timestamp<=$${p++}`; v.push(filters.endDate); }
    q += ' ORDER BY timestamp DESC';
    if (filters.limit) { q += ` LIMIT $${p++}`; v.push(filters.limit); }
    const r = await db.query(q, v); return r.rows;
  }

  static async export(filters = {}) {
    const rows = await DecisionAuditService.query(filters);
    return { count: rows.length, data: rows, exported_at: new Date().toISOString() };
  }

  static async _ensureTable() {
    await db.query(`CREATE TABLE IF NOT EXISTS decision_audit_log (
      id UUID PRIMARY KEY, entity_hash VARCHAR(255), decision VARCHAR(32), score NUMERIC(5,2), confidence NUMERIC(5,2),
      inputs JSONB DEFAULT '{}', outputs JSONB DEFAULT '{}', decision_source VARCHAR(64), actor VARCHAR(128),
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW());
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON decision_audit_log(entity_hash);
      CREATE INDEX IF NOT EXISTS idx_audit_decision ON decision_audit_log(decision);`);
  }
}

module.exports = DecisionAuditService;