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
}

module.exports = HistoryRepository;
