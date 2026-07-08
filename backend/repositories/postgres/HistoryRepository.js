// repositories/postgres/HistoryRepository.js
const db = require('../../utils/db');

class HistoryRepository {
  static async insert({ userHash, inputType, riskScore, result }) {
    try {
      const query = `
        INSERT INTO scan_history (user_hash, input_type, input_hash, risk_score, status, category, result_json, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `;
      // Generate standard dummy input_hash since we only have user_hash, or hash the result
      const inputHash = require('crypto').createHash('sha256').update(JSON.stringify(result)).digest('hex');
      await db.query(query, [
        userHash || null,
        inputType,
        inputHash,
        riskScore || 0,
        result.status || 'WARNING',
        result.category || 'Unknown',
        JSON.stringify(result),
      ]);
    } catch (err) {
      console.warn('Postgres HistoryRepository.insert failed (non-critical):', err.message);
    }
  }

  static async findByUserHash(userHash, limit = 20, offset = 0) {
    try {
      const query = `
        SELECT * FROM scan_history
        WHERE user_hash = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const countQuery = 'SELECT COUNT(*) as total FROM scan_history WHERE user_hash = $1';

      const { rows } = await db.query(query, [userHash, limit, offset]);
      const countRes = await db.query(countQuery, [userHash]);
      const total = parseInt(countRes.rows[0].total) || 0;

      const data = rows.map((row) => ({
        id: row.id,
        userHash: row.user_hash,
        inputType: row.input_type,
        riskScore: row.risk_score,
        result: typeof row.result_json === 'string' ? JSON.parse(row.result_json) : (row.result_json || {}),
        createdAt: row.created_at?.toISOString?.() || row.created_at,
      }));

      return { data, total };
    } catch (err) {
      console.error('Postgres HistoryRepository.findByUserHash error:', err);
      return { data: [], total: 0 };
    }
  }

  static async search(criteria = {}) {
    try {
      const { userHash, inputType, riskScoreMin, limit = 20, offset = 0 } = criteria;
      let query = 'SELECT * FROM scan_history WHERE 1=1';
      const params = []; let p = 1;
      if (userHash) { query += ` AND user_hash = $${p++}`; params.push(userHash); }
      if (inputType) { query += ` AND input_type = $${p++}`; params.push(inputType); }
      if (riskScoreMin !== undefined) { query += ` AND risk_score >= $${p++}`; params.push(riskScoreMin); }
      query += ` ORDER BY created_at DESC LIMIT $${p++} OFFSET $${p++}`; params.push(limit, offset);
      const { rows } = await db.query(query, params);
      const countRes = await db.query('SELECT COUNT(*) as total FROM scan_history', []);
      const data = rows.map(row => ({
        id: row.id, userHash: row.user_hash, inputType: row.input_type,
        riskScore: row.risk_score,
        result: typeof row.result_json === 'string' ? JSON.parse(row.result_json) : (row.result_json || {}),
        createdAt: row.created_at?.toISOString?.() || row.created_at,
      }));
      return { data, total: parseInt(countRes.rows[0].total) || 0 };
    } catch (err) { console.error('Postgres HistoryRepository.search error:', err); throw err; }
  }

  static async ping() { await db.query('SELECT 1 FROM scan_history LIMIT 1'); }

}

module.exports = HistoryRepository;
