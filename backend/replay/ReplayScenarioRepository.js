// replay/ReplayScenarioRepository.js
// Persists replay scenario configurations and results.

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

class ReplayScenarioRepository {
  static async save(scenario) {
    const id = uuidv4();
    const q = `INSERT INTO replay_scenarios (id, name, scenario_id, entity_count, events, config, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`;
    const v = [id, scenario.name, scenario.scenarioId, scenario.entityCount || 1,
      JSON.stringify(scenario.events || []), JSON.stringify(scenario.config || {})];
    try { return (await db.query(q, v)).rows[0]; }
    catch (err) {
      if (err.code === '42P01') { await ReplayScenarioRepository._ensureTable(); return (await db.query(q, v)).rows[0]; }
      throw err;
    }
  }

  static async list() {
    const r = await db.query('SELECT * FROM replay_scenarios ORDER BY created_at DESC');
    return r.rows;
  }

  static async _ensureTable() {
    await db.query(`CREATE TABLE IF NOT EXISTS replay_scenarios (
      id UUID PRIMARY KEY, name VARCHAR(255), scenario_id VARCHAR(128),
      entity_count INT DEFAULT 1, events JSONB DEFAULT '[]', config JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW());`);
  }
}

module.exports = ReplayScenarioRepository;