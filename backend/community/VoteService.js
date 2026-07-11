// community/VoteService.js
/**
 * VoteService — ARGUS v1.2
 *
 * Allows community members to vote on the accuracy of reports.
 * Each vote updates the report's community confidence score.
 */

const db = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

class VoteService {
  static async cast(params) {
    const { reportId, voterHash, vote, reason } = params;
    if (!['up', 'down'].includes(vote)) throw new Error('Vote must be "up" or "down"');

    const id = uuidv4();
    const query = `
      INSERT INTO community_votes (id, report_id, voter_hash, vote, reason, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (report_id, voter_hash) DO UPDATE SET vote = $4, reason = $5, updated_at = NOW()
      RETURNING *
    `;
    try {
      const result = await db.query(query, [id, reportId, voterHash, vote, reason || '', new Date().toISOString()]);
      return result.rows[0];
    } catch (err) {
      if (err.code === '42P01') {
        await this._ensureTable();
        const result = await db.query(query, [id, reportId, voterHash, vote, reason || '', new Date().toISOString()]);
        return result.rows[0];
      }
      throw err;
    }
  }

  static async getScore(reportId) {
    try {
      const result = await db.query(
        `SELECT COUNT(*) FILTER (WHERE vote='up') as ups,
                COUNT(*) FILTER (WHERE vote='down') as downs
         FROM community_votes WHERE report_id = $1`, [reportId]
      );
      const row = result.rows[0];
      return { ups: parseInt(row.ups), downs: parseInt(row.downs), score: parseInt(row.ups) - parseInt(row.downs) };
    } catch { return { ups: 0, downs: 0, score: 0 }; }
  }

  static async _ensureTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS community_votes (
        id UUID PRIMARY KEY, report_id VARCHAR(64) NOT NULL,
        voter_hash VARCHAR(128) NOT NULL, vote VARCHAR(4) NOT NULL,
        reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ,
        UNIQUE(report_id, voter_hash)
      );
      CREATE INDEX IF NOT EXISTS idx_votes_report ON community_votes(report_id);
    `);
  }
}

module.exports = VoteService;