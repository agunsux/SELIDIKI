// repositories/lookupLogRepository.js
const db = require('../utils/db');

/**
 * Repository for logging reputation lookup events.
 * No business logic, purely persistence.
 */
class LookupLogRepository {
  static async insert({ queryId, entityType, hash, cacheHit, riskScore }) {
    const query = `
      INSERT INTO audit_log (action, target_id, target_type, metadata)
      VALUES ($1, $2, $3, $4)
    `;
    const metadata = {
      queryId,
      cacheHit,
      riskScore
    };
    return db.query(query, ['REPUTATION_CHECK', hash, entityType, JSON.stringify(metadata)]);
  }

  static async search(criteria = {}) {
    try {
      const { entityType, hash, limit = 20, offset = 0 } = criteria;
      let query = "SELECT * FROM audit_log WHERE action = 'REPUTATION_CHECK'";
      const params = []; let p = 1;
      if (entityType) { query += ` AND target_type = $${p++}`; params.push(entityType); }
      if (hash) { query += ` AND target_id = $${p++}`; params.push(hash); }
      query += ` ORDER BY created_at DESC LIMIT $${p++} OFFSET $${p++}`; params.push(limit, offset);
      const { rows } = await db.query(query, params);
      const countRes = await db.query("SELECT COUNT(*) as total FROM audit_log WHERE action = 'REPUTATION_CHECK'", []);
      const data = rows.map(row => ({
        id: row.id, queryId: row.metadata?.queryId, entityType: row.target_type,
        hash: row.target_id, cacheHit: row.metadata?.cacheHit, riskScore: row.metadata?.riskScore,
        createdAt: row.created_at,
      }));
      return { data, total: parseInt(countRes.rows[0].total) || 0 };
    } catch (err) { console.error('LookupLogRepository.search error:', err); throw err; }
  }

  static async ping() { await db.query('SELECT 1'); }

}

module.exports = LookupLogRepository;
