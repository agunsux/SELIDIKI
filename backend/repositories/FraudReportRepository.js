// repositories/FraudReportRepository.js

const db = require('../utils/db');
const FraudReport = require('../models/FraudReport');

/**
 * Repository for fraud_reports table.
 * Returns an array of FraudReport domain objects.
 */
class FraudReportRepository {
  static async findByEntityId(entityIdOrHash) {
    try {
      const query = `
        SELECT fr.*, u.trusted as trusted, u.id as reporter_id, fr.category as category
        FROM fraud_reports fr
        LEFT JOIN users u ON fr.reporter_hash = u.phone_hash
        WHERE fr.target_hash = $1 
           OR fr.target_hash = (
             SELECT phone_hash FROM phone_profiles WHERE id::text = $1 LIMIT 1
           )
           OR fr.target_hash = (
             SELECT account_hash FROM bank_account_profiles WHERE id::text = $1 LIMIT 1
           )
      `;
      const { rows } = await db.query(query, [entityIdOrHash]);
      return rows.map(row => {
        // Map reporter_user_id and fraud_entity_id for compatibility with the domain model
        return new FraudReport({
          ...row,
          reporter_user_id: row.reporter_id,
          fraud_entity_id: row.target_hash,
          false_positive: row.status === 'rejected',
          source: 'community'
        });
      });
    } catch (err) {
      console.error('FraudReportRepository.findByEntityId error:', err);
      throw err;
    }
  }

  // Simple ping for health check
  static async ping() {
    await db.query('SELECT 1');
  }
}

module.exports = FraudReportRepository;
