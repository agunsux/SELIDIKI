// repositories/postgres/BankAccountRepository.js
const db = require('../../utils/db');

class BankAccountRepository {
  static async findByHashAndBank(accountHash, bankCode) {
    try {
      const query = 'SELECT * FROM bank_account_profiles WHERE account_hash = $1 AND bank_code = $2';
      const { rows } = await db.query(query, [accountHash, bankCode.toUpperCase()]);
      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        id: row.id,
        accountHash: row.account_hash,
        bankCode: row.bank_code,
        riskScore: row.risk_score,
        reportsCount: row.reports_count,
        categories: row.categories || [],
        lastActivity: row.last_activity,
        firstReported: row.first_reported,
        isBlocked: row.is_blocked,
      };
    } catch (err) {
      console.error('Postgres BankAccountRepository.findByHashAndBank error:', err);
      throw err;
    }
  }

  static async upsert(accountHash, bankCode, accountData) {
    try {
      const query = `
        INSERT INTO bank_account_profiles (account_hash, bank_code, risk_score, reports_count, categories, last_activity, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (account_hash, bank_code) DO UPDATE SET
          risk_score = EXCLUDED.risk_score,
          reports_count = EXCLUDED.reports_count,
          categories = EXCLUDED.categories,
          last_activity = EXCLUDED.last_activity,
          updated_at = NOW()
      `;
      await db.query(query, [
        accountHash,
        bankCode.toUpperCase(),
        accountData.riskScore || 0,
        accountData.reportsCount || 0,
        accountData.categories || [],
        accountData.lastActivity || new Date(),
      ]);
    } catch (err) {
      console.error('Postgres BankAccountRepository.upsert error:', err);
      throw err;
    }
  }

  static async search(criteria = {}) {
    try {
      const { bankCode, riskScoreMin, limit = 20, offset = 0 } = criteria;
      let query = 'SELECT * FROM bank_account_profiles WHERE 1=1';
      const params = []; let p = 1;
      if (bankCode) { query += ` AND bank_code = $${p++}`; params.push(bankCode.toUpperCase()); }
      if (riskScoreMin !== undefined) { query += ` AND risk_score >= $${p++}`; params.push(riskScoreMin); }
      query += ` ORDER BY risk_score DESC LIMIT $${p++} OFFSET $${p++}`; params.push(limit, offset);
      const { rows } = await db.query(query, params);
      const countRes = await db.query('SELECT COUNT(*) as total FROM bank_account_profiles', []);
      const data = rows.map(row => ({
        id: row.id, accountHash: row.account_hash, bankCode: row.bank_code,
        riskScore: row.risk_score, reportsCount: row.reports_count,
        categories: row.categories || [], lastActivity: row.last_activity,
        firstReported: row.first_reported, isBlocked: row.is_blocked,
      }));
      return { data, total: parseInt(countRes.rows[0].total) || 0 };
    } catch (err) { console.error('Postgres BankAccountRepository.search error:', err); throw err; }
  }

  static async ping() { await db.query('SELECT 1 FROM bank_account_profiles LIMIT 1'); }

}

module.exports = BankAccountRepository;
