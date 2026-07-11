// case/CaseTimeline.js
/**
 * CaseTimeline — ARGUS v1.3
 *
 * Immutable event log for all case activity.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

class CaseTimeline {
  static async append(params) {
    const { caseId, action, userId, metadata } = params;
    const id = uuidv4();
    await db.query(
      `INSERT INTO case_timeline (id, case_id, action, user_id, metadata, created_at) VALUES ($1,$2,$3,$4,$5,NOW())`,
      [id, caseId, action, userId, JSON.stringify(metadata || {})]
    );
    return id;
  }

  static async getByCase(caseId) {
    const result = await db.query(
      'SELECT * FROM case_timeline WHERE case_id = $1 ORDER BY created_at ASC', [caseId]
    );
    return result.rows;
  }

  static async _ensureTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS case_timeline (
        id UUID PRIMARY KEY, case_id UUID NOT NULL REFERENCES cases(id),
        action VARCHAR(64) NOT NULL, user_id VARCHAR(128),
        metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_case_timeline_case ON case_timeline(case_id);
    `);
  }
}

module.exports = CaseTimeline;