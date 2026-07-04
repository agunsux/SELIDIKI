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
}

module.exports = BankAccountRepository;
