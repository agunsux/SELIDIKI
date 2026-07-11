// replay/ExperimentRegistry.js
// Stores and retrieves experiment results persistently.

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

class ExperimentRegistry {
  static async save(result) {
    const id = uuidv4();
    const q = `INSERT INTO replay_experiments (id, name, attacks, scenarios, metrics, report, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`;
    const v = [id, result.experiment_name || result.name || 'Experiment',
      result.attacks_generated || 0,
      JSON.stringify(result.scenarios || []),
      JSON.stringify(result.replay?.results || {}),
      JSON.stringify(result)];
    try { return (await db.query(q, v)).rows[0]; }
    catch (err) {
      if (err.code === '42P01') { await ExperimentRegistry._ensureTable(); return (await db.query(q, v)).rows[0]; }
      throw err;
    }
  }

  static async list(limit = 20) {
    const r = await db.query('SELECT id, name, attacks, created_at FROM replay_experiments ORDER BY created_at DESC LIMIT $1', [limit]);
    return r.rows;
  }

  static async get(id) {
    const r = await db.query('SELECT * FROM replay_experiments WHERE id = $1', [id]);
    return r.rows[0] || null;
  }

  static async _ensureTable() {
    await db.query(`CREATE TABLE IF NOT EXISTS replay_experiments (
      id UUID PRIMARY KEY, name VARCHAR(255), attacks INT DEFAULT 0,
      scenarios JSONB DEFAULT '[]', metrics JSONB DEFAULT '{}', report JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW());`);
  }
}

module.exports = ExperimentRegistry;