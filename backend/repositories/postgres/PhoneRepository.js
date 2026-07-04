// repositories/postgres/PhoneRepository.js
const db = require('../../utils/db');

class PhoneRepository {
  static async findByHash(phoneHash) {
    try {
      const query = 'SELECT * FROM phone_profiles WHERE phone_hash = $1';
      const { rows } = await db.query(query, [phoneHash]);
      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        id: row.id,
        phoneHash: row.phone_hash,
        riskScore: row.risk_score,
        category: row.primary_category, // maps primary_category to category
        reportsCount: row.reports_count,
        verifiedReportsCount: row.verified_reports_count,
        lastActivity: row.last_activity,
        firstReported: row.first_reported,
        signals: typeof row.signals === 'string' ? JSON.parse(row.signals) : (row.signals || []),
        trend7d: row.trend_7d,
        isConfirmedFraud: row.is_confirmed_fraud,
      };
    } catch (err) {
      console.error('Postgres PhoneRepository.findByHash error:', err);
      throw err;
    }
  }

  static async upsert(phoneHash, phoneData) {
    try {
      const query = `
        INSERT INTO phone_profiles (phone_hash, risk_score, primary_category, reports_count, last_activity, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (phone_hash) DO UPDATE SET
          risk_score = EXCLUDED.risk_score,
          primary_category = EXCLUDED.primary_category,
          reports_count = EXCLUDED.reports_count,
          last_activity = EXCLUDED.last_activity,
          updated_at = NOW()
      `;
      await db.query(query, [
        phoneHash,
        phoneData.riskScore || 0,
        phoneData.category || null,
        phoneData.reportsCount || 0,
        phoneData.lastActivity || new Date(),
      ]);
    } catch (err) {
      console.error('Postgres PhoneRepository.upsert error:', err);
      throw err;
    }
  }
}

module.exports = PhoneRepository;
