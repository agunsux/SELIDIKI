// repositories/FraudEntityRepository.js

const db = require('../utils/db'); // assume existing pg pool wrapper
const FraudEntity = require('../models/FraudEntity');

/**
 * Repository for fraud_entities table.
 * No business logic – only persistence.
 */
class FraudEntityRepository {
  static async findByHash(hash) {
    try {
      // 1. Query phone_profiles
      const phoneQuery = 'SELECT id, phone_hash AS value_hash, risk_score, updated_at FROM phone_profiles WHERE phone_hash = $1';
      const { rows: phoneRows } = await db.query(phoneQuery, [hash]);
      if (phoneRows.length > 0) {
        const row = phoneRows[0];
        return new FraudEntity({
          id: row.id,
          entity_type: 'phone',
          normalized_value: '',
          value_hash: row.value_hash,
          risk_score: row.risk_score,
          created_at: row.updated_at,
          updated_at: row.updated_at,
        });
      }

      // 2. Query bank_account_profiles
      const bankQuery = 'SELECT id, account_hash AS value_hash, bank_code, risk_score, updated_at FROM bank_account_profiles WHERE account_hash = $1';
      const { rows: bankRows } = await db.query(bankQuery, [hash]);
      if (bankRows.length > 0) {
        const row = bankRows[0];
        return new FraudEntity({
          id: row.id,
          entity_type: 'account',
          normalized_value: row.bank_code,
          value_hash: row.value_hash,
          risk_score: row.risk_score,
          created_at: row.updated_at,
          updated_at: row.updated_at,
        });
      }

      return null;
    } catch (err) {
      console.error('FraudEntityRepository.findByHash error:', err);
      throw err;
    }
  }

  // Simple ping for health check
  static async ping() {
    await db.query('SELECT 1');
  }

  static async findById(id) {
    try {
      const query = 'SELECT id, phone_hash AS value_hash, risk_score, updated_at FROM phone_profiles WHERE id::text = $1';
      const { rows } = await db.query(query, [id]);
      if (rows.length > 0) {
        const row = rows[0];
        return new FraudEntity({ id: row.id, entity_type: 'phone', normalized_value: '', value_hash: row.value_hash, risk_score: row.risk_score, created_at: row.updated_at, updated_at: row.updated_at });
      }
      return null;
    } catch (err) { console.error('FraudEntityRepository.findById error:', err); throw err; }
  }

  static async search(criteria = {}) {
    try {
      const { riskScoreMin, limit = 20, offset = 0 } = criteria;
      let query = 'SELECT id, phone_hash AS value_hash, risk_score, updated_at FROM phone_profiles WHERE 1=1';
      const params = []; let p = 1;
      if (riskScoreMin !== undefined) { query += ` AND risk_score >= $${p++}`; params.push(riskScoreMin); }
      query += ` ORDER BY risk_score DESC LIMIT $${p++} OFFSET $${p++}`; params.push(limit, offset);
      const { rows } = await db.query(query, params);
      const countRes = await db.query('SELECT COUNT(*) as total FROM phone_profiles', []);
      const data = rows.map(row => new FraudEntity({ id: row.id, entity_type: 'phone', normalized_value: '', value_hash: row.value_hash, risk_score: row.risk_score, created_at: row.updated_at, updated_at: row.updated_at }));
      return { data, total: parseInt(countRes.rows[0].total) || 0 };
    } catch (err) { console.error('FraudEntityRepository.search error:', err); throw err; }
  }

}

module.exports = FraudEntityRepository;
