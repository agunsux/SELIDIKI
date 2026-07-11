// validation/GroundTruthRepository.js
// Stores and queries verified ground truth records for model validation.

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

class GroundTruthRepository {
  static async load(records) {
    await GroundTruthRepository._ensureTable();
    let count = 0;
    for (const r of records) {
      await db.query(`INSERT INTO ground_truth (id, entity_hash, entity_type, actual_risk, actual_category, source, verified_by, verified_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (entity_hash) DO UPDATE SET
        actual_risk = EXCLUDED.actual_risk, actual_category = EXCLUDED.actual_category, verified_at = EXCLUDED.verified_at`,
        [uuidv4(), r.entityHash, r.entityType || 'phone', r.actualRisk, r.actualCategory || null, r.source || 'manual', r.verifiedBy || 'system', r.verifiedAt || new Date().toISOString()]);
      count++;
    }
    return { loaded: count };
  }

  static async getByEntity(entityHash) {
    const r = await db.query('SELECT * FROM ground_truth WHERE entity_hash = $1', [entityHash]);
    return r.rows[0] || null;
  }

  static async getAll(limit = 10000) {
    const r = await db.query('SELECT * FROM ground_truth ORDER BY verified_at DESC LIMIT $1', [limit]);
    return r.rows;
  }

  static async count() {
    const r = await db.query('SELECT COUNT(*) FROM ground_truth');
    return parseInt(r.rows[0].count, 10);
  }

  static async _ensureTable() {
    await db.query(`CREATE TABLE IF NOT EXISTS ground_truth (
      id UUID PRIMARY KEY, entity_hash VARCHAR(255) UNIQUE NOT NULL, entity_type VARCHAR(32) DEFAULT 'phone',
      actual_risk NUMERIC(5,2) NOT NULL, actual_category VARCHAR(64), source VARCHAR(64),
      verified_by VARCHAR(128), verified_at TIMESTAMPTZ DEFAULT NOW());
      CREATE INDEX IF NOT EXISTS idx_ground_truth_entity ON ground_truth(entity_hash);`);
  }
}

module.exports = GroundTruthRepository;